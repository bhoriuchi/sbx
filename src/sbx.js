/**
 * Run untrusted code in a VM as a child process
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
import Promise from 'bluebird'
import childProcess from 'child_process'
import * as _ from './litedash'

const VERSION = '2.0.0'
const TYPE = 'sbx'

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
		if (match.length && match.length >= 3) {
			if (modules.indexOf(match[1]) !== -1) modules.push(match[1]);
		}
		match = rx.exec(source)
	}
	return modules
}


/**
 * Creates a child process that runs a VM with the options passed. Message events are used to communicate between parent and child process
 * 
 * @param {String} source - Untrusted code to run.
 * @param {Object} [variables] - Variables to add to the VM context.
 * @param {Number} [timeout] - A timeout in milliseconds for the VM to run the source.
 * @param {Boolean} [lockdown=true] - Do not allow require statements
 * @param {Function} [callback] - A function to call on completion that is passed the context as its argument.
 * 
 */
export function vm () {
	let modules = [], lockdown = true, variables = {}, source = null, timeout = null, callback = null

  _.forEach(Array.prototype.slice.call(arguments), (arg) => {
    if (_.isBoolean(arg)) lockdown = arg
    else if (_.isNumber(arg)) timeout = Number(arg)
    else if (_.isString(arg)) source = arg
    else if (_.isFunction(arg)) callback = arg
    else if (_.isHash(arg)) variables = arg
  })

	if (!source) throw new Error('Source is a required argument')
	
	// get the path to the child module 
	let child = __dirname + '/vm.js'
	
	// create a message and send it
	let message = { source, modules, lockdown, variables, timeout }
	let p = childProcess.fork(child, message)

	// listen for a message from the child process
	let request = new Promise((resolve, reject) => {
		p.once('message', (reply) => {
      if (callback) callback(reply)
			resolve(reply)
		})
		
		p.on('error', (err) => reject(err))
		p.on('timeout', () => reject(new Promise.TimeoutError()))
	})

	if (timeout) request.timeout(timeout)

  p.send(message)
	return request
}

export default { TYPE, VERSION, vm }


