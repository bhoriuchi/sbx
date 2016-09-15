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

let makeLog = function (stdout, type, args) {
  console[type].apply(null, args)
  stdout.push({
    type,
    time: new Date(),
    stdout: util.inspect(args)
  })
}

let captureConsole = function (stdout) {
  return {
    assert () {
      console.assert.apply(null, [...arguments])
    },
    dir () {
      console.dir.apply(null, [...arguments])
    },
    error () {
      return makeLog(stdout, 'error', [...arguments])
    },
    info () {
      return makeLog(stdout, 'info', [...arguments])
    },
    log () {
      return makeLog(stdout, 'log', [...arguments])
    },
    time (label) {
      console.time(label)
    },
    timeEnd (label) {
      console.timeEnd(label)
    },
    trace () {
      return makeLog(stdout, 'trace', [...arguments])
    },
    warn () {
      return makeLog(stdout, 'warn', [...arguments])
    },
  }
}

let standards = {
  captureConsole,
  process,
  exports,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  sbx: {}
}

// function to remove modules from the context
function clean (context, msg) {
	msg.modules = msg.modules || []

  _.forEach(standards, (standard, key) => {
	  delete context[key]
  })

  _.forEach(msg.modules, (module, key) => {
    delete context[key]
  })

  // remove the console from the context
  delete context.console

	if (context.require) delete context.require
	return _.circular(context)
}

function handleError (err, scope, msg, context) {
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
function handleSuccess(msg, context) {
	process.send(clean(context, msg))
	process.exit(0)
}

// create an event handler for message
process.once('message', (msg) => {
  let options = { displayErrors: false, timeout: msg.timeout }
  let context = Object.assign({}, standards, msg.context, { _exception: null, _result: null, _stdout: [] })
	if (msg.lockdown === false) context.require = require

	try {
    let source = msg.source.replace(/\s*['"]use\s+strict['"](;)?\s*/g, '') // remove 'use strict'
		let script = vm.createScript(source)
		script.runInNewContext(context, options)

    if (!_.isPromise(context._result)) return handleSuccess(msg, context)

    return context._result.then((result) => {
      if (!_.isPromise(result)) return handleSuccess(msg, context)
      return result.then((innerResult) => handleSuccess(msg, context))
    }).catch((err) => handleError(err, 'vm', msg, context))
	}
	catch(err) {
		handleError(err, 'child_process', msg, context)
	}
})