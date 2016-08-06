/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
import vm from 'vm'
import util from 'util'
import events from 'events'
import standard from './standard'
import * as _ from './litedash'

let emitter = new events.EventEmitter()
const evt_log = 'sbx.log'

let standards = standard(emitter, evt_log)
let stdout = []

// handle sbx event logs
emitter.on(evt_log, (args) => {
	let log = ''
	Array.prototype.slice.call(args).forEach((arg) => {
		if (typeof(arg) === 'object') arg = util.inspect(arg)
		log = !log ? String(arg) : `${log}  ${String(arg)}`
	})
	stdout.push(log)
	console.log.apply(null, args)
})

// function to remove modules from the context
function clean (context, msg) {
	msg.modules = msg.modules || []

  _.forEach(standards, (standard, key) => {
	  delete context[key]
  })

  _.forEach(msg.modules, (module, key) => {
    delete context[key]
  })

	if (context.require) delete context.require
	return _.circular(context)
}

function handleError (err, scope, msg, context, stdout) {
	context._stdout = stdout
	context._exception = {
		scope,
		lineNumber: err.lineNumber,
		message: err.message,
		stack: err.stack
	}
	process.send(clean(context, msg))
	process.exit(1)
}

// function to handle success
function handleSuccess(msg, context, stdout) {
	context._stdout = stdout
	process.send(clean(context, msg))
	process.exit(0)
}

// create an event handler for message
process.once('message', (msg) => {
	let context = {
    _exception: null,
    _result: null
  }

	let [i, keys, key] = [null, null, null]
	let options = { displayErrors: false }

	if (msg.timeout) options.timeout = msg.timeout;

	keys = Object.keys(standards)

	for (i = 0; i < keys.length; i++) {
		key = keys[i]
		context[key] = standards[key]
	}
	
	// loop through variables and add them to the context
	keys = Object.keys(msg.variables)
	for (i = 0; i < keys.length; i++) {
		key = keys[i]
		context[key] = msg.variables[key]
	}

	// if lockdown is false, allow require
	if (msg.lockdown === false) context.require = require
	
	// wrap the source code in a try catch
  let timeoutStr = options.timeout ?
    `    if (typeof _result.timeout === 'function') _result = _result.timeout(${options.timeout});` : ''

  let source = `
try {
  _result = (function() { ${msg.source} })();
  if (_result && typeof _result.then === 'function') {
    ${timeoutStr}
    _result = _result.then(function (_promiseResult) {
      return _promiseResult;
    }).catch(function (err) {
      _exception = {
        scope: 'vm',
        lineNumber: err.lineNumber,
        message: err.message,
        stack: err.stack
      };
    });
  } 
} catch (err) {
  _exception = {
    scope: 'vm',
    lineNumber: err.lineNumber,
    message: err.message,
    stack: err.stack
  };
};
`

	try {
		let script = vm.createScript(source)
		script.runInNewContext(context, options)

    if (!_.isPromise(context._result)) return handleSuccess(msg, context, stdout)

    return context._result.then((result) => {
      if (!_.isPromise(result)) return handleSuccess(msg, context, stdout)
      return result.then((innerResult) => {
        handleSuccess(msg, context, stdout)
      })
    }).catch(function(err) {
      handleError(err, 'vm', msg, context, stdout)
    })
	}
	catch(err) {
		handleError(err, 'child_process', msg, context, stdout)
	}
})