# sbx
---
Run untrusted code as a VM in a child process

`sbx` allows you to run untrusted code in a more secure manner than simply using `eval()` or `function()`. To accomplish this, a child process is forked and untrusted code is run in `vm` with its own context. Inside the `vm` the untrusted code is wrapped in a try/catch inside an anonymous function in order to capture exceptions and output. Upon completion the context is returned to the user via callback or promise

##### Notes:
* Code is run inside an anonymous function and should be written as such
* Reserved variables `_result`, `_exception`, and `_stdout` are added to the context and should not be set by untrusted code
* `'use strict'` statements are removed from untrusted code as they cause exceptions for passed context variables

---

* [WIKI](https://github.com/bhoriuchi/sbx/wiki)
* [Change Log](https://github.com/bhoriuchi/sbx/wiki/Change-Log)
* [v1.x.x Documentation](https://github.com/bhoriuchi/sbx/wiki/v1.x.x)

---

## Documentation
---
### API

#### `sbx.vm`( `code`, [`options`], [`callback`] )

* `code` [`{String}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) - string of untrusted Javascript to run.
* [`options`] [`{Object}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) - Options hash
  * [`context`] [`{Object}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) - Hash of key/value pairs that will be passed to the vm and are available to the untrusted code. *previously `variables`*
  * [`lockdown=true`] [`{Boolean}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) - If false, require statements will be allowed in order to use external modules
  * [`timeout`] [`{Number}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) - Time in milliseconds before the VM times out
  * [`transform`] [`{Function}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) - A function with the signature `transform (code, options)` that should return a string of transformed code. This can be used to transform `ES6` code using `babel` *see example*
  * [`parseImports=false`] [`{Boolean}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) - Parse ES6+ import statements. Should be used with an ES6 source transform function and `lockdown=false`
* [`callback`] [`{Function}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) - Error first callback with signature `callback(error, context)`

##### Returns

[`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) That resolves to an `SBXContext`


### Types

#### `SBXContext`
* `_result` [`{any}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects) - The return result of the executed code
* `_exception` [`{Object}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) - A hash containing the error message, stack trace, and scope of where the exception was caught (the `child_process` or the `vm`)
* `_stdout` [`{Array}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) - An array of stringified values from any calls made by `sbx.log()` inside the `vm`
* [`context variables`] [`{any}`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects) - Updated context variables


### Capturing stdout

All arguments to console methods `log`, `error`, `info`, `trace`, and `warn` are automatically added as items in the `_stdout` context variable

You may also use the `sbx.log` method which is an alias for `console.log`

## Example

```js
var sbx = require('sbx')

var code = 'x++; console.log(\'I like the number\', x);'

var options = {
  context: { x: 7 },
  timeout: 100
}

var callback = function(error, context) {
  if (error) return console.error(error)
  console.log('The value of x = ', context.x)
}

sbx.vm(code, options, callback)

// > I like the number 8
// > The value of x = 8
```

## Example with external module and promise result

```js
var sbx = require('sbx')

var code      = 'var _ = require("lodash"); x = _.uniq(x); return x;'

var options = {
  context: { x: [1,1,2,2,3,4,5,6,6] },
  lockdown: false
}

sbx.vm(code, options).then(function (context) {
  console.log('The value of x = ', context.x, false)
  console.log(context._result)
}).catch(function (error) {
  console.error(error)
})

// > The value of x = [1, 2, 3, 4, 5, 6]
// > [1, 2, 3, 4, 5, 6]
```

## Example with es2015 transform via babel + logging

```js
var babel = require('babel-core')
var sbx = require('sbx')

var code = 'let fn = (msg) => msg\nsbx.log(message)\nreturn fn(message)'

var options = {
  context: { message: 'test' },
  transform: function (code, opts) {
    return babel.transform(code, {
      presets: ['es2015', 'stage-2'],
      plugins: ['transform-runtime']
    }).code
  }
}

sbx.vm(code, options).then(function(context) {
  console.log('Result = ', context._result)
  console.log(context._stdout)
})

// > Result = test
// > ['test']
```
