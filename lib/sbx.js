/**
 * Run untrusted code in a VM as a child process
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * @version 1.0.0
 * 
 */



var cp        = require('child_process');
var requireRx = /var\s+(\w+)\s*=\s*require\([\'\"](.*)[\'\"]\);?/g;


/**
 * Parses the source code for require statements in order to add the modules to the context at runtime
 * 
 * @param {String} source - Untrusted code to parse.
 * @returns {Object} hash of modules to require.
 * 
 */
function getModules(source) {
	
	// create a new modules array to return
	var modules = [];
	
	// create a new regular expression
	var rx = new RegExp(requireRx);
	
	// get the first match
	var match = rx.exec(source);
	
	// get each match
	while(match) {
		
		// look for a match that has both the variable and module name
		if (match.length && match.length >= 3) {
			modules.push({
				name: match[1],
				module: match[2]
			});
		}
		
		// look for the next match
		match = rx.exec(source);
	}
	
	// return the modules list
	return modules;
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
function vm() {
	
	var source, variables, modules, timeout, callback, lockdown;
	
	// set defaults
	modules  = [];
	lockdown = true;
	
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
		
		// if it is an object, it is a hash of variables
		else if (typeof(arguments[i]) === 'object') {
			variables = arguments[i];
		}
		
		// if it is a boolean, it is the lockdown switch
		else if (typeof(arguments[i]) === 'boolean') {
			lockdown = arguments[i];
		}
	}
	
	// if no source was given, return
	if (!source) {
		return null;
	}
	
	// set the context to default if it doesn't exist
	if (!lockdown) {
		modules = getModules(source);
	}
	
	// remove any require statements
	source = source.replace(requireRx, '');

	// set default variables
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
	var p = cp.fork(child, message);

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
	type:     'sbx',
	version:  '1.0.0',
	vm:       vm,
	standard: require('./standard')
};


