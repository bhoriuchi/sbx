/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */

var vm           = require('vm');
var util         = require('util');
var dotprune     = require('dotprune');
var EventEmitter = require('events').EventEmitter;
var emitter      = new EventEmitter();
var evt_log      = 'SBX_VM_CONSOLE_LOG';

// an object containing standard functions/modules
var standards = require('./standard')(emitter, evt_log);

// store the stdout
var stdout = [];

// handle sbx event logs
emitter.on(evt_log, function(args) {
	var log = '';
	Array.prototype.slice.call(args).forEach(function(arg) {
		if (typeof(arg) === 'object') {
			arg = util.inspect(arg);
		}
		log = !log ? String(arg) : log + ' ' + String(arg);
	});
	stdout.push(log);
	console.log.apply(null, args);
});

// function to remove modules from the context
function clean(context, msg) {
	var i, keys;
	// remove the standard modules used
	keys = Object.keys(standards);
	for (i = 0; i < keys.length; i++) {
		delete context[keys[i]];
	}
	
	// delete the required modules
	for(i = 0; i < msg.modules.length; i++) {
		delete context[msg.modules[i]];
	}
	
	// delete require
	if (context.require) {
		delete context.require;
	}
	
	// return the context with circular references replaced
	return dotprune.circular(context);
}


// create an event handler for message
process.once('message', function(msg) {
	
	// create a context
	var context        = {};
	context._exception = null;
	context._result    = null;
	
	var i, keys, key;
	
	// set up the vm options
	var options = {};
	
	// add the timeout options
	if (msg.timeout) {
		options.timeout = msg.timeout;
	}
	
	// add standard objects
	keys = Object.keys(standards);
	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		context[key] = standards[key];
	}
	
	// loop through variables and add them to the context
	keys = Object.keys(msg.variables);
	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		context[key] = msg.variables[key];
	}

	// if lockdown is false, allow require
	if (msg.lockdown === false) {
		context.require = require;
	}
	
	// wrap the source code in a try catch
	var source = ' ' +
		'try { ' +
		'_result = (function () { ' + msg.source + ' })();' +
		'} ' +
		'catch (err) { ' +
		'_exception = {scope:\'vm\',lineNumber: err.lineNumber, message: err.message, stack: err.stack};' +
		'} ';
	
	// execute the script
	try {
		var script = vm.createScript(source);
		script.runInNewContext(context, options);
	}
	catch(err) {
		context._exception = {
			scope: 'child_process',
			lineNumber: err.lineNumber,
			message: err.message,
			stack: err.stack
		};
	}

	// check for a promise result and resolve it before returning the context
	if (context._result && typeof(context._result.then) === 'function') {
		context._result.then(function(result) {
			context._stdout = stdout;
			process.send(clean(context, msg));
			process.exit(0);
		})
		.caught(function(err) {
			context._stdout = stdout;
			context._exception = {
				scope: 'vm',
				lineNumber: err.lineNumber,
				message: err.message,
				stack: err.stack
			};
			process.send(clean(context, msg));
			process.exit(0);			
		});
	}
	else {
				
		// send the context
		context._stdout = stdout;
		process.send(clean(context, msg));
		process.exit(0);
	}
});