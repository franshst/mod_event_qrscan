'use strict';

(function (document, Joomla) {
	const checkinUrl = Joomla.getOptions('checkinUrl');
	const checkInInterval = Joomla.getOptions('checkInInterval', 2000);
	const ticketMaxLength = Joomla.getOptions('ticketMaxLength', 32);
	const successAudioUrl = Joomla.getOptions('successAudioUrl');
	const failAudioUrl = Joomla.getOptions('failAudioUrl');
	const textSuccessClass = Joomla.getOptions('textSuccessClass');
	const textWarningClass = Joomla.getOptions('textWarningClass');
	const storage = window.sessionStorage;

	/* TEMPORARY-DEBUG: console diagnostics for the "No camera available" issue. Set to false to silence. */
	var QRSCAN_DEBUG = false;
	function qrscanLog() {
		if (!QRSCAN_DEBUG) return;
		try {
			var args = Array.prototype.slice.call(arguments);
			args.unshift('[qrscan]');
			window.console.log.apply(window.console, args);
		} catch (e) { /* ignore */ }
	}

	let scanner = null;
	let isProcessing = false;
	let currentCameraIndex = 0;
	let cameras = [];
	let lastCameraQueryError = null;
	let modalInstance = null;

	const startLabel = Joomla.getOptions('MOD_EVENT_QRSCAN_START', 'Start');
	const stopLabel = Joomla.getOptions('MOD_EVENT_QRSCAN_STOP', 'Stop');

	function setStartButtonLabel(label) {
		var btn = document.getElementById('start-stop-btn');
		if (btn) {
			btn.textContent = label;
		}
	}

	function showModal(message, type) {
		qrscanLog('showModal', 'type=' + type);
		const modalBody = document.querySelector('.modal-body');
		if (!modalBody) return;
		modalBody.textContent = message;
		modalBody.className = 'modal-body ' + (type === 'success' ? textSuccessClass : textWarningClass);
		const modalElement = document.getElementById('qrscanModal');
		if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
			if (!modalInstance) {
				modalInstance = new bootstrap.Modal(modalElement);
			}
			modalInstance.show();
		} else {
			const reader = document.getElementById('reader');
			if (reader) {
				const fallback = document.createElement('div');
				fallback.className = type === 'success' ? textSuccessClass : textWarningClass;
				fallback.textContent = message;
				reader.parentNode.replaceChild(fallback, reader);
				isProcessing = false;
			}
		}
	}

	function playSound(success) {
		const audioUrl = success ? successAudioUrl : failAudioUrl;
		if (!audioUrl) return;
		try {
			const audio = new Audio(audioUrl);
			audio.play().catch(function () {});
		} catch (e) {
			/* silent fallback */
		}
	}

	var EventQrscanHelper = {
		validateTicketCode: function (text, maxLength) {
			if (!text) return false;
			if (!/^[a-zA-Z0-9]+$/.test(text)) return false;
			if (text.length > maxLength) return false;
			return true;
		},
		getErrorMessage: function (caseName) {
			var messages = {
				no_camera: 'No camera available.',
				camera_busy: 'Camera is in use by another application.',
				offline: 'No network, check-in service unavailable',
				invalid_qr: 'This seems not to be a ticket QR code',
				bad_key: 'Invalid ticket code',
				eb_absent: 'Error while communicating with check-in service, error code is %s',
				unknown: 'An error occurred'
			};
			return messages[caseName] || messages.unknown;
		}
	};

	function getCameraDeviceId(camera) {
		var id = camera.id || camera.deviceId;
		return id;
	}

	function getCameraLabel(camera) {
		var label = camera.label || '';
		if (label.indexOf('environment') !== -1) return 'environment';
		var match = label.match(/\(([^)]+)\)/);
		return match ? match[1] : label;
	}

	function parseEmbeddedErrorName(error) {
		var match = /error\s*=\s*(\w+Error)/i.exec(String((error && error.message) || error || ''));
		return match ? match[1] : '';
	}

	function domErrorName(error) {
		if (error && error.name) return error.name;
		return parseEmbeddedErrorName(error);
	}

	function isPermissionError(error) {
		var text = domErrorName(error) + ' ' + String((error && error.message) || error || '');
		return /notallowederror|securityerror|denied|permission|secure/i.test(text);
	}

	function isCameraBusyError(error) {
		var text = domErrorName(error) + ' ' + String((error && error.message) || error || '');
		return /notreadableerror|aborterror|trackstarterror|in use|could not start video source/i.test(text);
	}

	function startScanner(deviceId) {
		if (!scanner) return;
		setStartButtonLabel(stopLabel);
		var lastStartError = null;
		var sawCameraBusy = false;
		if (cameras.length === 0) {
			qrscanLog('startScanner', 'no enumerated cameras, re-enumerating');
			try {
				loadCameraPreferences().then(function () {
					qrscanLog('startScanner', 're-enumeration done', 'found=' + cameras.length);
					buildAndStart();
				}).catch(function () {
					buildAndStart();
				});
			} catch (e) {
				buildAndStart();
			}
			return;
		}
		buildAndStart();
		function buildAndStart() {
		var candidates = [];
		function addDeviceCandidate(id) {
			if (!id) return;
			var duplicate = candidates.some(function (c) { return c.deviceId && c.deviceId.exact === id; });
			if (!duplicate) {
				candidates.push({ deviceId: { exact: id } });
			}
		}
		addDeviceCandidate(deviceId);
		if (cameras.length > 0 && currentCameraIndex < cameras.length) {
			addDeviceCandidate(getCameraDeviceId(cameras[currentCameraIndex]));
		}
		if (cameras.length > 0) {
			addDeviceCandidate(getCameraDeviceId(cameras[0]));
		}
		candidates.push({ facingMode: { exact: 'environment' } });
		var efficiencyConfig = { fps: 1, qrbox: { width: 250, height: 250 }, disableFlip: true };
		qrscanLog('startScanner', 'candidates=' + JSON.stringify(candidates), 'cameras=' + cameras.length, 'index=' + currentCameraIndex);
		function showNoCamera() {
			var busy = sawCameraBusy || isCameraBusyError(lastStartError) || isCameraBusyError(lastCameraQueryError);
			qrscanLog('startScanner', 'all candidates exhausted', 'busy=' + busy);
			setStartButtonLabel(startLabel);
			try {
				Html5Qrcode.getCameras().then(function (recount) {
					qrscanLog('startScanner', 'post-failure recount', 'found=' + recount.length, 'labels=' + JSON.stringify(recount.map(function (c) { return c.label || ''; })));
				}).catch(function () {
					qrscanLog('startScanner', 'post-failure recount failed');
				});
			} catch (e) { /* ignore */ }
			if (busy) {
				showModal(EventQrscanHelper.getErrorMessage('camera_busy'), 'warning');
			} else {
				showModal(EventQrscanHelper.getErrorMessage('no_camera'), 'warning');
			}
			playSound(false);
		}
		function tryCandidate(index) {
			if (index >= candidates.length) {
				showNoCamera();
				return;
			}
			scanner.start(candidates[index], efficiencyConfig, onScanSuccess, onScanFailure).then(function () {
				qrscanLog('startScanner', 'attempt ok', 'config=' + JSON.stringify(candidates[index]));
			}).catch(function (error) {
				lastStartError = error;
				if (isCameraBusyError(error)) {
					sawCameraBusy = true;
				}
				var errName = error ? error.name : String(error);
				var errMsg = error ? error.message : String(error);
				var errStr;
				try { errStr = String(error); } catch (e) { errStr = '?'; }
				var errJson;
				try { errJson = JSON.stringify(error); } catch (e) { errJson = 'unstringifiable'; }
				qrscanLog('startScanner', 'attempt failed', 'config=' + JSON.stringify(candidates[index]), 'name=' + errName, 'message=' + errMsg, 'string=' + errStr, 'json=' + errJson);
				if (isPermissionError(error)) {
					showNoCamera();
					return;
				}
				tryCandidate(index + 1);
			});
		}
		tryCandidate(0);
		}
	}

	function stopScanner() {
		qrscanLog('stopScanner', 'called');
		setStartButtonLabel(startLabel);
		if (!scanner) return;
		try {
			scanner.stop().catch(function () {});
		} catch (e) {
			/* ignore */
		}
	}

	function getCurrentDeviceId() {
		if (cameras.length > 0 && currentCameraIndex < cameras.length) {
			return getCameraDeviceId(cameras[currentCameraIndex]);
		}
		return null;
	}

	function lockScanner() {
		if (!scanner) return;
		try {
			var result = scanner.stop();
			if (result && typeof result.catch === 'function') {
				result.catch(function () {});
			}
		} catch (e) {
			/* ignore — isProcessing flag remains the request guard */
		}
		enforceVideoStop();
	}

	function enforceVideoStop() {
		try {
			var videos = document.querySelectorAll('#reader video');
			for (var i = 0; i < videos.length; i++) {
				var v = videos[i];
				try { v.pause(); } catch (e) {}
				try {
					var stream = v.srcObject;
					if (stream && typeof stream.getTracks === 'function') {
						stream.getTracks().forEach(function (t) {
							try { t.stop(); } catch (e) {}
						});
					}
				} catch (e) {}
			}
		} catch (e) { /* ignore */ }
	}

	function unlockScanner() {
		if (!scanner || document.hidden) return;
		try {
			startScanner(getCurrentDeviceId());
		} catch (e) {
			/* ignore */
		}
	}

	function cycleCamera() {
		if (cameras.length === 0) {
			showModal(EventQrscanHelper.getErrorMessage('no_camera'), 'warning');
			playSound(false);
			return;
		}
		currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
		var camera = cameras[currentCameraIndex];
		var deviceId = getCameraDeviceId(camera);
		try {
			localStorage.setItem('qrscan_camera_id', deviceId);
		} catch (e) {
			/* ignore */
		}
		stopScanner();
		setTimeout(function () { startScanner(deviceId); }, 100);
	}

	function loadCameraPreferences() {
		var savedDeviceId = null;
		try {
			savedDeviceId = localStorage.getItem('qrscan_camera_id');
		} catch (e) {
			/* ignore */
		}
		return Html5Qrcode.getCameras().then(function (foundCameras) {
			cameras = foundCameras;
			lastCameraQueryError = null;
			qrscanLog('loadCameraPreferences', 'found=' + cameras.length, 'labels=' + JSON.stringify(cameras.map(function (c) { return c.label || ''; })));
			if (savedDeviceId) {
				var matched = cameras.find(function (c) { return getCameraDeviceId(c) === savedDeviceId; });
				if (matched) {
					currentCameraIndex = cameras.indexOf(matched);
					return getCameraDeviceId(cameras[currentCameraIndex]);
				}
			} else {
				var envMatch = cameras.find(function (c) { return getCameraLabel(c) === 'environment'; });
				if (envMatch) {
					currentCameraIndex = cameras.indexOf(envMatch);
					return getCameraDeviceId(cameras[currentCameraIndex]);
				}
		}
		if (cameras.length > 0) {
			currentCameraIndex = 0;
			return getCameraDeviceId(cameras[0]);
		}
		return null;
		}).catch(function (err) {
			qrscanLog('loadCameraPreferences', 'failed', 'reason=' + String((err && err.message) || err || ''));
			lastCameraQueryError = err;
			cameras = [];
			return null;
		});
	}

	function onScanSuccess(decodedText, decodedResult) {
		if (isProcessing) return;
		qrscanLog('onScanSuccess', 'len=' + (decodedText || '').length);
		if (!EventQrscanHelper.validateTicketCode(decodedText, ticketMaxLength)) {
			isProcessing = true;
			lockScanner();
			showModal(EventQrscanHelper.getErrorMessage('invalid_qr'), 'warning');
			playSound(false);
			return;
		}

		var now = Date.now();
		var stored = storage.getItem(decodedText);
		if (stored !== null && now - parseInt(stored) < checkInInterval) {
			return;
		}
		storage.setItem(decodedText, now);

		isProcessing = true;
		lockScanner();

		var url = checkinUrl + '&value=' + encodeURIComponent(decodedText) + '&t=' + Date.now();
		Joomla.request({
			url: url,
			method: 'GET',
			onSuccess: function (response) {
				try {
					var data = JSON.parse(response);
					if (data.success) {
						showModal(data.message, 'success');
						playSound(true);
					} else {
						showModal(data.message, 'warning');
						playSound(false);
					}
				} catch (e) {
					showModal(EventQrscanHelper.getErrorMessage('invalid_qr'), 'warning');
					playSound(false);
				}
			},
			onError: function () {
				showModal(EventQrscanHelper.getErrorMessage('offline'), 'warning');
				playSound(false);
			}
		});
	}

	function onScanFailure(errorMessage, error) {
		/* silent no-op */
	}

	function handleVisibilityChange() {
		if (document.hidden) {
			try {
				if (scanner && typeof scanner.getState === 'function' && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
					scanner.pause(true);
				}
			} catch (e) {
				/* ignore */
			}
		} else {
			if (isProcessing) return;
			try {
				if (scanner && typeof scanner.getState === 'function' && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
					scanner.resume();
				}
			} catch (e) {
				/* ignore */
			}
		}
	}

	document.addEventListener('DOMContentLoaded', function () {
		scanner = new Html5Qrcode('reader', { verbose: true }); /* TEMPORARY-DEBUG: lib internals to console */
		qrscanLog('init', 'checkinUrl=' + (!!checkinUrl), 'bootstrap.Modal=' + (!!(typeof bootstrap !== 'undefined' && bootstrap && bootstrap.Modal)), 'Html5QrcodeScannerState=' + (typeof Html5QrcodeScannerState !== 'undefined'));

		document.getElementById('start-stop-btn').addEventListener('click', function () {
			if (!scanner) return;
			try {
				if (typeof scanner.getState === 'function') {
					var state = scanner.getState();
					qrscanLog('start-stop click', 'state=' + state, 'cameras=' + cameras.length, 'index=' + currentCameraIndex);
					if (state === Html5QrcodeScannerState.SCANNING) {
						stopScanner();
					} else {
						var deviceId = null;
						if (cameras.length > 0 && currentCameraIndex < cameras.length) {
							deviceId = getCameraDeviceId(cameras[currentCameraIndex]);
						}
						startScanner(deviceId);
					}
				}
			} catch (e) {
				/* ignore */
			}
		});

		document.getElementById('switch-camera-btn').addEventListener('click', cycleCamera);

		document.addEventListener('visibilitychange', handleVisibilityChange);

		var modalElement = document.getElementById('qrscanModal');
		if (modalElement) {
			modalElement.addEventListener('hidden.bs.modal', function () {
				qrscanLog('modal hidden', 'isProcessing=' + isProcessing);
				if (!isProcessing) return;
				isProcessing = false;
				qrscanLog('modal hidden', 'restarting scanner');
				unlockScanner();
			});
		}

		if (!checkinUrl) {
			showModal(EventQrscanHelper.getErrorMessage('eb_absent'), 'warning');
			return;
		}

		loadCameraPreferences().catch(function () {
			// Camera preferences loaded, scanner waits for Start button
		});
		setStartButtonLabel(startLabel);
	});
})(document, Joomla);
