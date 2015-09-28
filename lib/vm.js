/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * @version 0.1.0
 * 
 */

var vm   = require('vm');
var util = require('util');


// an object containing standard functions/modules
var standard = require('./standard');


// create an event handler for message
process.once('message', function(msg) {
	
	// create a context
	var context        = {};
	var standards      = [];
	context._modules   = {};
	context._exception = null;
	
	// set up the vm options
	var options = {};
	
	// add the timeout options
	if (msg.timeout) {
		options.timeout = msg.timeout;
	}
	
	// loop through the modules and require them
	for (var i = 0; i < msg.modules.length; i++) {
		var mod = msg.modules[i];
		
		if (Object.keys(standard).indexOf(mod) !== -1) {
			context[mod]          = standard[mod];
			standards.push(mod);
		}
		else {
			// try to require the modules
			try {
				context._modules[mod] = require(mod);
			}
			catch (err) {
				console.log(err);
			}
		}
	}
	
	// loop through variables and add them to the context
	var keys = Object.keys(msg.variables);
	for (var j = 0; j < keys.length; j++) {
		var key = keys[j];
		context[key] = msg.variables[key];
	}
	
	// wrap the source code in a try catch
	var source = ' ' +
		'try { ' +
		msg.source + ' ' +
		'} ' +
		'catch (err) { ' +
		'    _exception = err.toString(); ' +
		'} ';
	
	// execute the script
	try {
		var script = vm.createScript(msg.source);
		script.runInNewContext(context, options);
	}
	catch(err) {
		context._exception = err.toString();
	}
	
	// remove the modules from the reply
	delete context._modules;
	
	// remove the standard modules used
	for (var k = 0; k < standards.length; k++) {
		delete context[standards[k]];
	}
	
	// send the context
	process.send(context);
	process.exit(0);
});