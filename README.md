# ☢ sbx ☢
---

`sbx` is one of many sandbox implementations to choose from. It, like many other modules allows you to run untrusted code in a node `vm` as a child process. 

To summarize the inner workings of `sbx`, a call to `sbx.vm()` is made passing the untrusted code to run along with optional context options and callback. The code is parsed for require statements and if lockdown is false, require is allowed. A process is forked and a `once` event listener is started on both the parent and child. The child process then builds a context using the options provided and the untrusted code is wrapped in a try/catch to capture any exceptions for debugging. The try/catch is placed inside of a function in order to capture any return output. The untrusted code is then run using the context it built with an optional timeout. Upon completion, all required modules are removed from the context and it is sent back to the parent as a message. If a callback was specified, the message is passed as the only argument to the callback. The vm() method returns a promise that resolves to the context after the code has been run. The end.

* See the [WIKI](https://github.com/bhoriuchi/sbx/wiki) for full documentation
* And the [Change Log](https://github.com/bhoriuchi/sbx/wiki/Change-Log) for what's new

---
<br>

## Documentation
---
### API

#### `sbx.vm`( `code`, [`variables`], [`timeout`], [`callback`], [`lockdown`] )

* `code` [`String`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) - string of Javascript to run.
* [`variables`] [`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) - A hash of variables ( `{name : value}` )
* [`timeout`] [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) - Time in miliseconds before the VM times out
* [`callback`] [`Function`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) - A function to call passing the final context of the VM
* [`lockdown=true`] [`Boolean`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) - If false, require statements will be allowed in order to use external modules


### Special Functions
In order to capture data from the `vm` code execution the following function(s) can be added to untrusted code

* `sbx.log`( `object`, [, `object`] ) - Adds a log string to `_stdout`


### Output
`sbx` resolves or passes as an argument to the specified callback a reply object. The reply object contains the following properties

* `_result` [`*`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects) - The return result of the executed code
* `_exception` [`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) - A hash containing the error message, stack trace, and scope of where the exception was caught (the `child_process` or the `vm`)
* `_stdout` [`Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) - An array of stringified values from any calls made by `sbx.log()` inside the `vm`
* [`context variables`] [`*`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects) - Any variables passed to the VM. Any variables created inside the VM that need to be accessed should be returned and accessed via `_result` since `vm` code is executed inside a function

---
<br>
## Example
---
```js
// require sbx
var sbx       = require('sbx');

// set options
var code      = 'x++; console.log(\'I like the number\', x);'
var variables = { x: 7 };
var timeout   = 100;
var callback  = function(context) {
  console.log('The value of x = ', context.x);
};

// call the vm method passing the code and options in any order
sbx.vm(code, variables, timeout, callback);

// > I like the number 8
// > The value of x = 8

```

<br>
## Example with external module
---
```js
// require sbx
var sbx       = require('sbx');

// set options
var code      = 'var _ = require("lodash"); x = _.uniq(x); return x;'
var variables = { x: [1,1,2,2,3,4,5,6,6] };
var timeout   = 100;
var callback  = function(context) {
  console.log('The value of x = ', context.x, false);
  console.log(context._result);
};

// call the vm method passing the code and options in any order
sbx.vm(code, variables, timeout, callback, false);

// > The value of x = [1, 2, 3, 4, 5, 6]
// > [1, 2, 3, 4, 5, 6]

```


<br>
## Example with external module using `promise`
---
```js
// require sbx
var sbx       = require('sbx');

// set options
var code      = 'var _ = require("lodash"); x = _.uniq(x); sbx.log("done")';
var variables = { x: [1,1,2,2,3,4,5,6,6] };
var timeout   = 100;

// call the vm method passing the code and options in any order
sbx.vm(code, variables, timeout, false).then(function(context) {
    console.log('The value of x = ', context.x, false);
    console.log(context._stdout[0]);
});

// > The value of x = [1, 2, 3, 4, 5, 6]
// > done

```


---
<br>
## Tools
---
Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.
