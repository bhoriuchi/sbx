'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var vm = _interopDefault(require('vm'));
var util = _interopDefault(require('util'));
var events = require('events');

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

function isFunction(obj) {
  return typeof obj === 'function';
}

function isObject(obj) {
  return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null;
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

function isPromise(obj) {
  return isObject(obj) && isFunction(obj.then) && isFunction(obj.catch);
}

function contains(list, obj) {
  return list.reduce(function (prev, cur) {
    return cur === obj && prev;
  }, false);
}

function circular(obj) {
  var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '[Circular]';

  var circularEx = function circularEx(_obj) {
    var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var seen = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

    seen.push(_obj);
    if (isObject(_obj)) {
      forEach(_obj, function (o, i) {
        if (contains(seen, o)) _obj[i] = isFunction(value) ? value(_obj, key, seen.slice(0)) : value;else circularEx(o, i, seen.slice(0));
      });
    }
    return _obj;
  };

  if (!obj) throw new Error('circular requires an object to examine');
  return circularEx(obj, value);
}

/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
var makeLog = function makeLog(stdout, type, args) {
  console[type].apply(null, args);
  stdout.push({
    type: type,
    time: new Date(),
    stdout: util.inspect(args)
  });
};

var captureConsole = function captureConsole(stdout) {
  return {
    assert: function assert() {
      console.assert.apply(null, [].concat(Array.prototype.slice.call(arguments)));
    },
    dir: function dir() {
      console.dir.apply(null, [].concat(Array.prototype.slice.call(arguments)));
    },
    error: function error() {
      return makeLog(stdout, 'error', [].concat(Array.prototype.slice.call(arguments)));
    },
    info: function info() {
      return makeLog(stdout, 'info', [].concat(Array.prototype.slice.call(arguments)));
    },
    log: function log() {
      return makeLog(stdout, 'log', [].concat(Array.prototype.slice.call(arguments)));
    },
    time: function time(label) {
      console.time(label);
    },
    timeEnd: function timeEnd(label) {
      console.timeEnd(label);
    },
    trace: function trace() {
      return makeLog(stdout, 'trace', [].concat(Array.prototype.slice.call(arguments)));
    },
    warn: function warn() {
      return makeLog(stdout, 'warn', [].concat(Array.prototype.slice.call(arguments)));
    }
  };
};

var standards = {
  captureConsole: captureConsole,
  process: process,
  exports: exports,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  sbx: {}
};

// function to remove modules from the context
function clean(context, msg) {
  msg.modules = msg.modules || [];

  forEach(standards, function (standard, key) {
    delete context[key];
  });

  forEach(msg.modules, function (module, key) {
    delete context[key];
  });

  // remove the console from the context
  delete context.console;

  if (context.require) delete context.require;
  return circular(context);
}

function handleError(err, scope, msg, context) {
  context._exception = {
    scope: scope,
    lineNumber: err.lineNumber,
    message: err.message,
    stack: err.stack
  };
  process.send(clean(context, msg));
  process.exit(1);
}

// function to handle success
function handleSuccess(msg, context) {
  process.send(clean(context, msg));
  process.exit(0);
}

// create an event handler for message
process.once('message', function (msg) {
  var options = { displayErrors: false, timeout: msg.timeout };
  var context = Object.assign({}, standards, msg.context, { _exception: null, _result: null, _stdout: [] });
  if (msg.lockdown === false) context.require = require;

  try {
    var source = msg.source.replace(/\s*['"]use\s+strict['"](;)?\s*/g, ''); // remove 'use strict'
    var script = vm.createScript(source);
    script.runInNewContext(context, options);

    if (!isPromise(context._result)) return handleSuccess(msg, context);

    return context._result.then(function (result) {
      if (!isPromise(result)) return handleSuccess(msg, context);
      return result.then(function (innerResult) {
        return handleSuccess(msg, context);
      });
    }).catch(function (err) {
      return handleError(err, 'vm', msg, context);
    });
  } catch (err) {
    handleError(err, 'child_process', msg, context);
  }
});