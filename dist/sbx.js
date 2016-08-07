'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Promise$1 = _interopDefault(require('bluebird'));
var childProcess = _interopDefault(require('child_process'));

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

var VERSION = '2.0.0';
var TYPE = 'sbx';

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
  var modules = [],
      lockdown = true,
      variables = {},
      source = null,
      timeout = null,
      callback = null;

  forEach(Array.prototype.slice.call(arguments), function (arg) {
    if (isBoolean(arg)) lockdown = arg;else if (isNumber(arg)) timeout = Number(arg);else if (isString(arg)) source = arg;else if (isFunction(arg)) callback = arg;else if (isHash(arg)) variables = arg;
  });

  if (!source) throw new Error('Source is a required argument');

  // get the path to the child module 
  var child = __dirname + '/vm.js';

  // create a message and send it
  var message = { source: source, modules: modules, lockdown: lockdown, variables: variables, timeout: timeout };
  var p = childProcess.fork(child, message);

  // listen for a message from the child process
  var request = new Promise$1(function (resolve, reject) {
    p.once('message', function (reply) {
      if (callback) callback(reply);
      resolve(reply);
    });

    p.on('error', function (err) {
      return reject(err);
    });
    p.on('timeout', function () {
      return reject(new Promise$1.TimeoutError());
    });
  });

  if (timeout) request.timeout(timeout);

  p.send(message);
  return request;
}

var sbx = { TYPE: TYPE, VERSION: VERSION, vm: vm };

exports.vm = vm;
exports['default'] = sbx;