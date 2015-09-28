/**
 * Example code for sbx
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * @version 0.1.0
 * 
 */

var sbx = require('../lib/sbx');


var source    = 'var x = 20; console.log(\'Printing value of x from the child process, x =\', x);';
//var source = 'while(true){}';


// set up the arguments
var timeout   = 500;
var variables = { hello: 'Hello World!' };
var modules   = ['console', 'setTimeout'];
var callback  = function(reply) {
	
	console.log('Access the context object, x = ', reply.x);
	console.log('Reply object = ', reply);
};

// call the vm function and pass the arguments
sbx.vm(source, modules, callback, variables, timeout, true);

// set a timeout for testing
setTimeout(function() {
	console.log('done waiting, exiting');
}, 3000);