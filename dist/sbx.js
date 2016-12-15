'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var childProcess = _interopDefault(require('child_process'));
var util = _interopDefault(require('util'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
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

function forEach(obj, fn) {
  try {
    if (Array.isArray(obj)) {
      var idx = 0;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = obj[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var val = _step.value;

          if (fn(val, idx) === false) break;
          idx++;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    } else {
      for (var key in obj) {
        if (fn(obj[key], key) === false) break;
      }
    }
  } catch (err) {
    return;
  }
}

function union() {
  var args = [].concat(Array.prototype.slice.call(arguments));
  if (!args.length) return [];

  try {
    var u = args.reduce(function (prev, cur) {
      if (!isArray(prev) || !isArray(cur)) return [];
      return prev.concat(cur);
    }, []);

    return [].concat(toConsumableArray(new Set(u)));
  } catch (err) {
    return [];
  }
}

/**
 * Run untrusted code in a VM as a child process
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
var VERSION = '2.1.0';
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
  var rx = /\s?(let|var)?\s*(.*)\s+=\s+require\(\s*['"].*['"]\s*\).*/gm;
  // let rx = /(\w+)\s*=\s*require\([\'\"]([A-Za-z0-9-_.\/!@]+)[\'\"]\).*?/g
  var match = rx.exec(source);

  while (match) {
    if (match.length && match.length > 2 && modules.indexOf(match[2]) !== -1) modules.push(match[2]);
    match = rx.exec(source);
  }
  return modules;
}

function getImports(source) {
  var modules = [],
      imports = [];

  var rx = /^import\s+(.*)\s+from.*['"]$/gm;
  var match = rx.exec(source);

  while (match) {
    if (match.length && match.length > 1) {
      imports.push(match[0]);
      forEach(match[1].replace(/^{(.*)}$/, '$1').split(','), function (v) {
        var varName = v.trim().replace(/.*as\s+(.*)/, '$1');
        if (varName.length) modules.push(varName);
      });
    }
    match = rx.exec(source);
  }

  return {
    imports: imports.join('\n'),
    source: source.replace(rx, ''),
    modules: modules
  };
}

/**
 * Creates a child process that runs a VM with the options passed. Message events are used to communicate between parent and child process
 * 
 * @param {String} source - Untrusted code to run.
 * @param {Object} [options] - Options hash.
 * @param {Object} [options.context] - Context object
 * @param {Number} [options.timeout] - A timeout in milliseconds for the VM to run the source.
 * @param {Boolean} [options.lockdown=true] - Do not allow require statements
 * @param {Boolean} [options.parseImports=false] - Parse es6+ import statements
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

    var timeout = isNumber(options.timeout) && options.timeout > 0 ? options.timeout : undefined;

    // create a promise timeout
    var promiseTimeout = timeout ? setInterval(function () {
      return new PromiseTimeoutError();
    }, timeout) : null;

    var onFail = function onFail(error) {
      if (promiseTimeout) clearTimeout(promiseTimeout);
      callback(error);
      return reject(error);
    };

    // create success and fail functions
    var onSuccess = function onSuccess(reply) {
      if (promiseTimeout) clearTimeout(promiseTimeout);
      callback(null, reply);
      return resolve(reply);
    };

    try {
      // transform the source if it exists
      if (!isString(source)) throw new Error('Source is a required argument and must be a string');

      var importStr = '';
      var timeoutStr = timeout ? '    if (typeof _result.timeout === \'function\') _result = _result.timeout(' + timeout + ');' : '';

      // get modules
      var modules = getModules(source);

      // parse import statements
      if (options.parseImports) {
        var i = getImports(source);
        importStr = options.lockdown ? '' : i.imports;
        source = i.source;
        modules = union(modules, i.modules);
      }

      var sourceWrap = '\n' + importStr + '\ntry {\n  var console = captureConsole(_stdout);\n  sbx.log = console.log;\n  _result = (function() { ' + source + ' })();\n  if (_result && typeof _result.then === \'function\') {\n    ' + timeoutStr + '\n    _result = _result.then(function (_promiseResult) {\n      _result = _promiseResult;\n    }).catch(function (err) {\n      err = err instanceof Error ? err : new Error(err)\n      _exception = {\n        scope: \'vm\',\n        lineNumber: err.lineNumber,\n        message: err.message,\n        stack: err.stack\n      };\n    });\n  } \n} catch (err) {\n  err = err instanceof Error ? err : new Error(err)\n  _exception = {\n    scope: \'vm\',\n    lineNumber: err.lineNumber,\n    message: err.message,\n    stack: err.stack\n  };\n};\n';
      source = isFunction(options.transform) ? options.transform(sourceWrap, options) : sourceWrap;
      if (!isString(source)) throw new Error('The transformed source is not a string');

      // examine remaining options
      var lockdown = isBoolean(options.lockdown) ? options.lockdown : true;
      var context = isHash(options.context) ? options.context : {};

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