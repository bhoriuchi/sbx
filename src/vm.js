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
import * as _ from './liteutils'

const EVENT_LOG = 'sbx.log'

let stdout = []
let emitter = new events.EventEmitter()
let log = () => emitter.emit(EVENT_LOG, [ ...arguments ])

let standards = {
  sbx: { log },
  console,
  process,
  exports,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval
}

// handle sbx event logs
emitter.on(EVENT_LOG, (args) => {
	let log = ''
	_.forEach(args, (arg) => {
		arg = _.isObject(arg) || _.isArray(arg) ? util.inspect(arg) : arg
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
	context._exception = {
		scope,
		lineNumber: err.lineNumber,
		message: err.message,
		stack: err.stack,
		stdout
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
  let options = { displayErrors: false, timeout: msg.timeout }
  let context = Object.assign({}, standards, msg.context, { _exception: null, _result: null })
	if (msg.lockdown === false) context.require = require

	try {
    let source = msg.source.replace(/\s*['"]use\s+strict['"](;)?\s*/g, '') // remove 'use strict'
		let script = vm.createScript(source)
		script.runInNewContext(context, options)

    if (!_.isPromise(context._result)) return handleSuccess(msg, context, stdout)

    return context._result.then((result) => {
      if (!_.isPromise(result)) return handleSuccess(msg, context, stdout)
      return result.then((innerResult) => handleSuccess(msg, context, stdout))
    }).catch((err) => handleError(err, 'vm', msg, context, stdout))
	}
	catch(err) {
		handleError(err, 'child_process', msg, context, stdout)
	}
})