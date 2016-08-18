/**
 * Run untrusted code in a VM as a child process
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
import childProcess from 'child_process'
import util from 'util'
import * as _ from './liteutils'

const VERSION = '2.0.0'
const TYPE = 'sbx'

// Custom error based off of - https://gist.github.com/justmoon/15511f92e5216fa2624b
let SbxError = function (context) {
  Error.captureStackTrace(this, this.constructor)
  let msg = context && context._exception && context._exception.message ? context._exception.message : 'Unknown Error'
  this.name = this.constructor.name
  this.message = msg
  this.context = context
}

let PromiseTimeoutError = function () {
  Error.captureStackTrace(this, this.constructor)
  this.name = this.constructor.name
  this.message = 'Promise timed out'
}

util.inherits(SbxError, Error)
util.inherits(PromiseTimeoutError, Error)

/**
 * Parses the source code for require statements in order to remove 
 * modules in the context reply
 * 
 * @param {String} source - Untrusted code to parse.
 * @returns {Object} hash of modules to require.
 * 
 */
function getModules (source) {
	let modules = []
	let rx = /(\w+)\s*=\s*require\([\'\"]([A-Za-z0-9-_.\/!@]+)[\'\"]\);?/g
	let match = rx.exec(source)

	while (match) {
		if (match.length && match.length >= 3 && modules.indexOf(match[1]) !== -1) modules.push(match[1])
		match = rx.exec(source)
	}
	return modules
}

/**
 * Creates a child process that runs a VM with the options passed. Message events are used to communicate between parent and child process
 * 
 * @param {String} source - Untrusted code to run.
 * @param {Object} [options] - Options hash.
 * @param {Object} [options.context] - Context object
 * @param {Number} [options.timeout] - A timeout in milliseconds for the VM to run the source.
 * @param {Boolean} [options.lockdown=true] - Do not allow require statements
 * @param {Function} [options.transform] - Function to transform source code (e.g. ES6 to ES5 via babel)
 * @param {Function} [callback] - A function to call on completion that is passed the context as its argument.
 * 
 */
export function vm (source, options, callback) {
  if (_.isFunction(options)) {
    callback = options
    options = {}
  }
  options = _.isHash(options) ? options : {}
  callback = _.isFunction(callback) ? callback : () => false

  let run = new Promise((resolve, reject) => {
    try {
      // transform the source if it exists
      if (!_.isString(source)) throw new Error('Source is a required argument and must be a string')

      let timeout = _.isNumber(options.timeout) && options.timeout > 0 ? options.timeout : undefined
      let timeoutStr = timeout ?
        `    if (typeof _result.timeout === 'function') _result = _result.timeout(${timeout});` : ''

      let sourceWrap = `
try {
  _result = (function() { ${source} })();
  if (_result && typeof _result.then === 'function') {
    ${timeoutStr}
    _result = _result.then(function (_promiseResult) {
      _result = _promiseResult;
    }).catch(function (err) {
      err = err instanceof Error ? err : new Error(err)
      _exception = {
        scope: 'vm',
        lineNumber: err.lineNumber,
        message: err.message,
        stack: err.stack
      };
    });
  } 
} catch (err) {
  err = err instanceof Error ? err : new Error(err)
  _exception = {
    scope: 'vm',
    lineNumber: err.lineNumber,
    message: err.message,
    stack: err.stack
  };
};
`
      source = _.isFunction(options.transform) ? options.transform(sourceWrap, options) : sourceWrap
      if (!_.isString(source)) throw new Error('The transformed source is not a string')

      // examine remaining options
      let lockdown = _.isBoolean(options.lockdown) ? options.lockdown : true
      let context = _.isHash(options.context) ? options.context : {}

      // create a promise timeout
      let promiseTimeout = timeout ? setInterval(() => new PromiseTimeoutError(), timeout) : null

      // create success and fail functions
      let onSuccess = function (reply) {
        if (promiseTimeout) clearTimeout(promiseTimeout)
        callback(null, reply)
        resolve(reply)
      }
      let onFail = function (error) {
        if (promiseTimeout) clearTimeout(promiseTimeout)
        callback(error)
        reject(error)
      }

      // get modules
      let modules = getModules(source)

      // get the path to the child module
      let child = __dirname + '/vm.js'

      // create a message and send it
      let message = { source, lockdown, context, modules, timeout }
      let p = childProcess.fork(child, message)

      // listen for a message from the child process
      p.once('message', (reply) => reply._exception ? onFail(new SbxError(reply)) : onSuccess(reply))
      p.on('error', (error) => onFail(error))
      p.on('timeout', () => onFail(new PromiseTimeoutError()))
      p.send(message)

    } catch (error) {
      return onFail(error)
    }
  })

  // return the promise
	return run
}

export default { TYPE, VERSION, vm }


