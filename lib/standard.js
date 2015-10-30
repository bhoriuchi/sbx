/**
 * Standard objects/modules
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */



module.exports = function (emitter, evt_log) {
	
	return {
		sbx: {
			log: function() {
				emitter.emit(evt_log, arguments);
			}
		},
		console: console,
		process: process,
		exports: exports,
		setTimeout: setTimeout
	};
};