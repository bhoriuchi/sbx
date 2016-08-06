'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var vm = _interopDefault(require('vm'));
var util = _interopDefault(require('util'));
var events = _interopDefault(require('events'));

/**
 * Standard objects/modules
 *
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 *
 */
function standard (emitter, evt_log) {
	var log = function log() {
		emitter.emit(evt_log, arguments);
	};
	var _log = log;

	return {
		sbx: { log: log },
		_log: _log,
		console: console,
		process: process,
		exports: exports,
		setTimeout: setTimeout
	};
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

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

// function to determine if the object is a promise
function isPromise(obj) {
  return obj && isFunction(obj.then);
}

function contains(list, value) {
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = list[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var item = _step2.value;

      if (item === value) return true;
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return false;
}

function circular(obj) {
  var circularEx = function circularEx(obj) {
    var value = arguments.length <= 1 || arguments[1] === undefined ? '[Circular]' : arguments[1];
    var key = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
    var seen = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

    seen.push(obj);
    if (isObject(obj)) {
      forEach(obj, function (o, i) {
        if (contains(seen, o)) obj[i] = isFunction(value) ? value(obj, key, seen.slice(0)) : value;else circularEx(o, value, i, seen.slice(0));
      });
    }
    return obj;
  };

  if (!obj) throw new Error('circular requires an object to examine');
  return circularEx(obj);
}

var emitter = new events.EventEmitter();
var evt_log = 'sbx.log';

var standards = standard(emitter, evt_log);
var stdout = [];

// handle sbx event logs
emitter.on(evt_log, function (args) {
	var log = '';
	Array.prototype.slice.call(args).forEach(function (arg) {
		if ((typeof arg === 'undefined' ? 'undefined' : _typeof(arg)) === 'object') arg = util.inspect(arg);
		log = !log ? String(arg) : log + '  ' + String(arg);
	});
	stdout.push(log);
	console.log.apply(null, args);
});

// function to remove modules from the context
function clean(context, msg) {
	msg.modules = msg.modules || [];

	forEach(standards, function (standard, key) {
		delete context[key];
	});

	forEach(msg.modules, function (module, key) {
		delete context[key];
	});

	if (context.require) delete context.require;
	return circular(context);
}

function handleError(err, scope, msg, context, stdout) {
	context._stdout = stdout;
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
function handleSuccess(msg, context, stdout) {
	context._stdout = stdout;
	process.send(clean(context, msg));
	process.exit(0);
}

// create an event handler for message
process.once('message', function (msg) {
	var context = {
		_exception: null,
		_result: null
	};

	var i = null;
	var keys = null;
	var key = null;

	var options = { displayErrors: false };

	if (msg.timeout) options.timeout = msg.timeout;

	keys = Object.keys(standards);

	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		context[key] = standards[key];
	}

	// loop through variables and add them to the context
	keys = Object.keys(msg.variables);
	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		context[key] = msg.variables[key];
	}

	// if lockdown is false, allow require
	if (msg.lockdown === false) context.require = require;

	// wrap the source code in a try catch
	var timeoutStr = options.timeout ? '    if (typeof _result.timeout === \'function\') _result = _result.timeout(' + options.timeout + ');' : '';

	var source = '\ntry {\n  _result = (function() { ' + msg.source + ' })();\n  if (_result && typeof _result.then === \'function\') {\n    ' + timeoutStr + '\n    _result = _result.then(function (_promiseResult) {\n      return _promiseResult;\n    }).catch(function (err) {\n      _exception = {\n        scope: \'vm\',\n        lineNumber: err.lineNumber,\n        message: err.message,\n        stack: err.stack\n      };\n    });\n  } \n} catch (err) {\n  _exception = {\n    scope: \'vm\',\n    lineNumber: err.lineNumber,\n    message: err.message,\n    stack: err.stack\n  };\n};\n';

	try {
		var script = vm.createScript(source);
		script.runInNewContext(context, options);

		if (!isPromise(context._result)) return handleSuccess(msg, context, stdout);

		return context._result.then(function (result) {
			if (!isPromise(result)) return handleSuccess(msg, context, stdout);
			return result.then(function (innerResult) {
				handleSuccess(msg, context, stdout);
			});
		}).catch(function (err) {
			handleError(err, 'vm', msg, context, stdout);
		});
	} catch (err) {
		handleError(err, 'child_process', msg, context, stdout);
	}
});