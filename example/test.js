/**
 * Example code for sbx
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * @version 0.1.0
 * 
 */
var sbx = require('../dist/sbx');


var source = 'var _ = require(\'lodash\');var x = 20; console.log(\'Printing value of x from the child process, x =\', x);x = _.uniq([1,2,3,3,2,2,4]);';
source     = 'var fn = function() {var rx = new RegExp(/.*/); var y = "hi".match(rx); return {rx: rx, y: y};}; var f = fn();';
source     = 'console.log("exit");';
source     = 'var x = 10; sbx.log(\'arg1\', \'arg2\', {obj: 1});sbx.log(\'arg3\'); var hi = 2; return this;';
source     = 'x = { a: "a" }; x.cir = x; return this;';

// set up the arguments
var timeout   = 500;
var variables = { hello: 'Hello World!', x: null };
var callback  = function(reply) {
	
	console.log('Access the context object, x = ', reply.x);
	console.log('Reply object = ', reply);
};

// call the vm function and pass the arguments
sbx.vm(source, variables, timeout, false).then(function(reply) {
	console.log(reply);
	console.log('stdout');
	
	/*
	for (var i = 0; i < reply._stdout.length; i++) {
		console.log('from _stdout:', reply._stdout[i]);
	}*/
});