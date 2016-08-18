'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var vm = _interopDefault(require('vm'));
var util = _interopDefault(require('util'));
var events = _interopDefault(require('events'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

function isFunction(obj) {
  return typeof obj === 'function';
}

function isArray(obj) {
  return Array.isArray(obj);
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
  var value = arguments.length <= 1 || arguments[1] === undefined ? '[Circular]' : arguments[1];

  var circularEx = function circularEx(_obj) {
    var key = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    var seen = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

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

var _arguments = arguments;
/**
 * Run untrusted code in a VM and send the results as a message to the parent
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
var EVENT_LOG = 'sbx.log';

var stdout = [];
var emitter = new events.EventEmitter();
var log = function log() {
	return emitter.emit(EVENT_LOG, [].concat(Array.prototype.slice.call(_arguments)));
};

var standards = {
	sbx: { log: log },
	console: console,
	process: process,
	exports: exports,
	setTimeout: setTimeout,
	clearTimeout: clearTimeout,
	setInterval: setInterval,
	clearInterval: clearInterval
};

// handle sbx event logs
emitter.on(EVENT_LOG, function (args) {
	var log = '';
	forEach(args, function (arg) {
		arg = isObject(arg) || isArray(arg) ? util.inspect(arg) : arg;
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
	context._exception = {
		scope: scope,
		lineNumber: err.lineNumber,
		message: err.message,
		stack: err.stack,
		stdout: stdout
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
	var options = { displayErrors: false, timeout: msg.timeout };
	var context = Object.assign({}, standards, msg.context, { _exception: null, _result: null });
	if (msg.lockdown === false) context.require = require;

	try {
		var script = vm.createScript(msg.source.replace(/'use strict';\n/, ''));
		script.runInNewContext(context, options);

		if (!isPromise(context._result)) return handleSuccess(msg, context, stdout);

		return context._result.then(function (result) {
			if (!isPromise(result)) return handleSuccess(msg, context, stdout);
			return result.then(function (innerResult) {
				return handleSuccess(msg, context, stdout);
			});
		}).catch(function (err) {
			return handleError(err, 'vm', msg, context, stdout);
		});
	} catch (err) {
		handleError(err, 'child_process', msg, context, stdout);
	}
});