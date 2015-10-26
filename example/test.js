/**
 * Example code for sbx
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * @version 0.1.0
 * 
 */

var sbx = require('../lib/sbx');


var source = 'var _ = require(\'lodash\');var x = 20; console.log(\'Printing value of x from the child process, x =\', x);x = _.uniq([1,2,3,3,2,2,4]);';
source     = 'var fn = function() {var rx = new RegExp(/.*/); var y = "hi".match(rx); return {rx: rx, y: y};}; var f = fn();';
source     = 'console.log("exit");process.exit();';
source     = 'var x = 10';


// set up the arguments
var timeout   = 500;
var variables = { hello: 'Hello World!' };
var callback  = function(reply) {
	
	console.log('Access the context object, x = ', reply.x);
	console.log('Reply object = ', reply);
};

// call the vm function and pass the arguments
sbx.vm(source, variables, timeout, false).then(function(reply) {
	console.log(reply);
});