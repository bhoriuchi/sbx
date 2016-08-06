/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
import vm from 'vm'
import util from 'util'
import dotprune from 'dotprune'
import events from 'events'
import standard from './standard'

let emitter = new events.EventEmitter()
const evt_log = 'SBX_VM_CONSOLE_LOG'

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

// function to determine if the object is a promise
function isPromise (obj) {
	return obj && typeof(obj.then) === 'function' && typeof(obj.catch) === 'function'
}

// function to remove modules from the context
function clean (context, msg) {
	msg.modules = msg.modules || []
	
	let [i, keys] = [null, null]
	// remove the standard modules used
	keys = Object.keys(standards)
	for (i = 0; i < keys.length; i++) {
		delete context[keys[i]]
	}
	
	// delete the required modules
	for(i = 0; i < msg.modules.length; i++) {
		delete context[msg.modules[i]]
	}
	
	// delete require
	if (context.require) {
		delete context.require
	}
	
	// return the context with circular references replaced
	return dotprune.circular(context)
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
	let source = ' ' +
		'try { ' +
		'  _result = (function () { ' + msg.source + ' })(); ' +
		'  if (_result && typeof(_result.then) === \'function\' && typeof(_result.catch) === \'function\') { ' +
		(options.timeout ? ('    if (typeof(_result.timeout) === \'function\') { _result = _result.timeout(' + options.timeout + ');} ') : '') +
		'    _result = _result.then(function(_promiseResult) { ' +
		'      return _promiseResult; ' +
		'    })' +
		'    .catch(function(err) { ' +
		'      _exception = {scope:\'vm\',lineNumber: err.lineNumber, message: err.message, stack: err.stack}; ' +
		'    }); ' +
		'  } ' +
		'} ' +
		'catch (err) { ' +
		'  _exception = {scope:\'vm\',lineNumber: err.lineNumber, message: err.message, stack: err.stack}; ' +
		'}'
	
	// try to execute the script
	try {
		let script = vm.createScript(source)
		script.runInNewContext(context, options)
		
		// check for a promise result and resolve it before returning the context
		if (isPromise(context._result)) {
			context._result.then((result) => {
				
				if (isPromise(result)) {
					return result.then((innerResult) => {
						handleSuccess(msg, context, stdout)
					})
				}
				handleSuccess(msg, context, stdout)
			}).catch(function(err) {
				handleError(err, 'vm', msg, context, stdout)
			})
		}
		else {
			handleSuccess(msg, context, stdout)
		}
	}
	catch(err) {
		handleError(err, 'child_process', msg, context, stdout)
	}
})