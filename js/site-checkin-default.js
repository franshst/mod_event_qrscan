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

	let scanner = null;
	let isProcessing = false;
	let currentCameraIndex = 0;
	let cameras = [];

	function showModal(message, type) {
		const modalBody = document.querySelector('.modal-body');
		if (!modalBody) return;
		modalBody.textContent = message;
		modalBody.className = 'modal-body ' + (type === 'success' ? textSuccessClass : textWarningClass);
		const modalElement = document.getElementById('qrscanModal');
		if (modalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
			const modal = new bootstrap.Modal(modalElement);
			modal.show();
		} else {
			const reader = document.getElementById('reader');
			if (reader) {
				const fallback = document.createElement('div');
				fallback.className = type === 'success' ? textSuccessClass : textWarningClass;
				fallback.textContent = message;
				reader.parentNode.replaceChild(fallback, reader);
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
		var label = camera.label || '';
		var match = label.match(/\(([^)]+)\)/);
		return match ? match[1] : id;
	}

	function getCameraLabel(camera) {
		var label = camera.label || '';
		if (label.indexOf('environment') !== -1) return 'environment';
		var match = label.match(/\(([^)]+)\)/);
		return match ? match[1] : label;
	}

	function startScanner(deviceId) {
		if (!scanner) return;
		var cameraConfig = {};
		if (deviceId) {
			cameraConfig = { deviceId: { exact: deviceId } };
		} else if (currentCameraIndex === 0) {
			cameraConfig = { facingMode: { exact: 'environment' } };
		}
		var efficiencyConfig = { fps: 1, qrbox: { width: 250, height: 250 }, disableFlip: true };
		scanner.start(cameraConfig, efficiencyConfig, onScanSuccess, onScanFailure);
	}

	function stopScanner() {
		if (!scanner) return;
		try {
			scanner.stop().catch(function () {});
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
			return null;
		}).catch(function () {
			cameras = [];
			return null;
		});
	}

	function onScanSuccess(decodedText, decodedResult) {
		if (isProcessing) return;
		if (!EventQrscanHelper.validateTicketCode(decodedText, ticketMaxLength)) {
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
		if (scanner) {
			try {
				if (typeof scanner.getState === 'function' && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
					scanner.pause(true);
				}
			} catch (e) {
				/* flag-only fallback */
			}
		}

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
				isProcessing = false;
				if (scanner) {
					try {
						if (typeof scanner.getState === 'function' && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
							scanner.resume();
						}
					} catch (e) {
						/* ignore */
					}
				}
			},
			onError: function () {
				showModal(EventQrscanHelper.getErrorMessage('offline'), 'warning');
				playSound(false);
				isProcessing = false;
				if (scanner) {
					try {
						if (typeof scanner.getState === 'function' && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
							scanner.resume();
						}
					} catch (e) {
						/* ignore */
					}
				}
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
		scanner = new Html5Qrcode('reader');

		document.getElementById('start-stop-btn').addEventListener('click', function () {
			if (!scanner) return;
			try {
				if (typeof scanner.getState === 'function') {
					var state = scanner.getState();
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

		if (!checkinUrl) {
			showModal(EventQrscanHelper.getErrorMessage('eb_absent'), 'warning');
			return;
		}

		loadCameraPreferences().then(function (deviceId) {
			startScanner(deviceId);
		}).catch(function () {
			startScanner(null);
		});
	});
})(document, Joomla);
