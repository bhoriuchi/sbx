/**
 * Run untrusted code in a VM as a child process
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * @version 0.1.0
 * 
 */


var cp = require('child_process');


/**
 * Creates a child process that runs a VM with the options passed. Message events are used to communicate between parent and child process
 * 
 * @param {String} source - Untrusted code to run.
 * @param {Object} [variables] - Variables to add to the VM context.
 * @param {String[]} [modules] - A list of module names for the VM to require that can be accessed by the source using _modules.<module name>.
 * @param {Number} [timeout] - A timeout in milliseconds for the VM to run the source.
 * @param {Function} [callback] - A function to call on completion that is passed the context as its argument.
 * 
 */
function vm() {
	
	var source, variables, modules, timeout, callback, inspect;
	inspect = false;
	
	// look at each argument
	for (var i = 0; i < arguments.length; i++) {
		
		// if a number, it is the timeout
		if (typeof(arguments[i]) === 'number') {
			timeout   = arguments[i];
		}

		// if it is a string, it is the source code to run
		else if (typeof(arguments[i]) === 'string') {
			source    = arguments[i];
		}
		
		// if it is a function, then it is the callback
		else if (typeof(arguments[i]) === 'function') {
			callback  = arguments[i];
		}
		
		// if it is an array, it is a module to require
		else if (Array.isArray(arguments[i])) {
			modules   = arguments[i];
		}
		
		// if it is an object, it is a hash of variables
		else if (typeof(arguments[i]) === 'object') {
			variables = arguments[i];
		}
	}
	
	// if no source was given, return
	if (!source) {
		return null;
	}
	
	// set the context to default if it doesn't exist
	modules   = modules   || [];
	variables = variables || {};
	
	// get the path to the child module 
	var child = __dirname + '/vm.js';
	
	// create a message
	var message = {
		source:    source,
		modules:   modules,
		variables: variables,
		timeout:   timeout
	};
	
	// create the process fork
	var p = cp.fork(__dirname + '/vm.js', message);

	// listen for a message from the child process
	p.once('message', function(reply) {
		if (callback) {
			callback(reply);
		}
	});
	
	// send a message to the child process
	p.send(message);
}


// return an object with functions
module.exports = {
	type:    'sbx',
	version: '0.1.0',
	vm:      vm
};


