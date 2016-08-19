'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var childProcess = _interopDefault(require('child_process'));
var util = _interopDefault(require('util'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

function isFunction(obj) {
  return typeof obj === 'function';
}

function isString(obj) {
  return typeof obj === 'string';
}

function isArray(obj) {
  return Array.isArray(obj);
}

function isDate(obj) {
  return obj instanceof Date;
}

function isObject(obj) {
  return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null;
}

function isBoolean(obj) {
  return typeof obj === 'boolean';
}

function isNumber(obj) {
  return !isNaN(obj);
}

function isHash(obj) {
  return isObject(obj) && !isArray(obj) && !isDate(obj) && obj !== null;
}

/**
 * Run untrusted code in a VM as a child process
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
var VERSION = '2.0.0';
var TYPE = 'sbx';

// Custom error based off of - https://gist.github.com/justmoon/15511f92e5216fa2624b
var SbxError = function SbxError(context) {
  Error.captureStackTrace(this, this.constructor);
  var msg = context && context._exception && context._exception.message ? context._exception.message : 'Unknown Error';
  this.name = this.constructor.name;
  this.message = msg;
  this.context = context;
};

var PromiseTimeoutError = function PromiseTimeoutError() {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = 'Promise timed out';
};

util.inherits(SbxError, Error);
util.inherits(PromiseTimeoutError, Error);

/**
 * Parses the source code for require statements in order to remove 
 * modules in the context reply
 * 
 * @param {String} source - Untrusted code to parse.
 * @returns {Object} hash of modules to require.
 * 
 */
function getModules(source) {
  var modules = [];
  var rx = /(\w+)\s*=\s*require\([\'\"]([A-Za-z0-9-_.\/!@]+)[\'\"]\);?/g;
  var match = rx.exec(source);

  while (match) {
    if (match.length && match.length >= 3 && modules.indexOf(match[1]) !== -1) modules.push(match[1]);
    match = rx.exec(source);
  }
  return modules;
}

/**
 * Creates a child process that runs a VM with the options passed. Message events are used to communicate between parent and child process
 * 
 * @param {String} source - Untrusted code to run.
 * @param {Object} [options] - Options hash.
 * @param {Object} [options.context] - Context object
 * @param {Number} [options.timeout] - A timeout in milliseconds for the VM to run the source.
 * @param {Boolean} [options.lockdown=true] - Do not allow require statements
 * @param {Function} [options.transform] - Function to transform source code (e.g. ES6 to ES5 via babel)
 * @param {Function} [callback] - A function to call on completion that is passed the context as its argument.
 * 
 */
function vm(source, options, callback) {
  if (isFunction(options)) {
    callback = options;
    options = {};
  }
  options = isHash(options) ? options : {};
  callback = isFunction(callback) ? callback : function () {
    return false;
  };

  var run = new Promise(function (resolve, reject) {
    try {
      (function () {
        // transform the source if it exists
        if (!isString(source)) throw new Error('Source is a required argument and must be a string');

        var timeout = isNumber(options.timeout) && options.timeout > 0 ? options.timeout : undefined;
        var timeoutStr = timeout ? '    if (typeof _result.timeout === \'function\') _result = _result.timeout(' + timeout + ');' : '';

        var sourceWrap = '\ntry {\n  _result = (function() { ' + source + ' })();\n  if (_result && typeof _result.then === \'function\') {\n    ' + timeoutStr + '\n    _result = _result.then(function (_promiseResult) {\n      _result = _promiseResult;\n    }).catch(function (err) {\n      err = err instanceof Error ? err : new Error(err)\n      _exception = {\n        scope: \'vm\',\n        lineNumber: err.lineNumber,\n        message: err.message,\n        stack: err.stack\n      };\n    });\n  } \n} catch (err) {\n  err = err instanceof Error ? err : new Error(err)\n  _exception = {\n    scope: \'vm\',\n    lineNumber: err.lineNumber,\n    message: err.message,\n    stack: err.stack\n  };\n};\n';
        source = isFunction(options.transform) ? options.transform(sourceWrap, options) : sourceWrap;
        if (!isString(source)) throw new Error('The transformed source is not a string');

        // examine remaining options
        var lockdown = isBoolean(options.lockdown) ? options.lockdown : true;
        var context = isHash(options.context) ? options.context : {};

        // create a promise timeout
        var promiseTimeout = timeout ? setInterval(function () {
          return new PromiseTimeoutError();
        }, timeout) : null;

        // create success and fail functions
        var onSuccess = function onSuccess(reply) {
          if (promiseTimeout) clearTimeout(promiseTimeout);
          callback(null, reply);
          return resolve(reply);
        };

        var onFail = function onFail(error) {
          if (promiseTimeout) clearTimeout(promiseTimeout);
          callback(error);
          return reject(error);
        };

        // get modules
        var modules = getModules(source);

        // get the path to the child module
        var child = __dirname + '/vm.js';

        // create a message and send it
        var message = { source: source, lockdown: lockdown, context: context, modules: modules, timeout: timeout };
        var p = childProcess.fork(child, message);

        // listen for a message from the child process
        p.once('message', function (reply) {
          return reply._exception ? onFail(new SbxError(reply)) : onSuccess(reply);
        });
        p.on('error', function (error) {
          return onFail(error);
        });
        p.on('timeout', function () {
          return onFail(new PromiseTimeoutError());
        });
        p.send(message);
      })();
    } catch (error) {
      return onFail(error);
    }
  });

  // return the promise
  return run;
}

var sbx = { TYPE: TYPE, VERSION: VERSION, vm: vm };

exports.vm = vm;
exports['default'] = sbx;