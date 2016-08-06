/**
 * Standard objects/modules
 *
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 *
 */
export default function (emitter, evt_log) {
	let log = function () {
		emitter.emit(evt_log, arguments)
	}
	let _log = log

	return {
		sbx: { log },
		_log,
		console,
		process,
		exports,
		setTimeout
	}
}