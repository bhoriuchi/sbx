/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */

var vm   = require('vm');
var util = require('util');


// an object containing standard functions/modules
var standards = require('./standard');


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
		delete context[msg.modules[i].name];
	}
	return util.inspect(context);
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
	
	// loop through the modules and require them
	for (i = 0; i < msg.modules.length; i++) {
		var mod = msg.modules[i];
		
		// try to require the modules
		try {
			context[mod.name] = require(mod.module);
		}
		catch (err) {
			console.log(err);
		}
	}
	
	// loop through variables and add them to the context
	keys = Object.keys(msg.variables);
	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		context[key] = msg.variables[key];
	}

	// wrap the source code in a try catch
	var source = ' ' +
		'try { ' +
		'_result = (function () { ' + msg.source + ' })();' +
		'} ' +
		'catch (err) { ' +
		'_exception = err.toString(); ' +
		'} ';
	
	// execute the script
	try {
		var script = vm.createScript(source);
		script.runInNewContext(context, options);
	}
	catch(err) {
		context._exception = err.toString();
	}

	// check for a promise result and resolve it before returning the context
	if (context._result && typeof(context._result.then) === 'function') {
		context._result.then(function(result) {
			process.send(clean(context, msg));
			process.exit(0);
		});
	}
	else {
				
		// send the context
		process.send(clean(context, msg));
		process.exit(0);
	}
});