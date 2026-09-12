'use strict';

(function (document, Joomla) {
	document.addEventListener('DOMContentLoaded', () => {
		const checkinUrl = Joomla.getOptions('checkinUrl');
		const checkInInterval = Joomla.getOptions('checkInInterval', 2000);
		const ticketMaxLength = Joomla.getOptions('ticketMaxLength', 32);
		const successAudioUrl = Joomla.getOptions('successAudioUrl');
		const failAudioUrl = Joomla.getOptions('failAudioUrl');
		const textSuccessClass = Joomla.getOptions('textSuccessClass');
		const textWarningClass = Joomla.getOptions('textWarningClass');
		const storage = window.sessionStorage;

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

		function onScanSuccess(decodedText, decodedResult) {
			if (!EventQrscanHelper.validateTicketCode(decodedText, ticketMaxLength)) {
				showModal(EventQrscanHelper.getErrorMessage('invalid_qr'), 'warning');
				playSound(false);
				return;
			}

			const now = Date.now();
			const stored = storage.getItem(decodedText);
			if (stored !== null && now - parseInt(stored) < checkInInterval) {
				return;
			}
			storage.setItem(decodedText, now);

			const url = checkinUrl + '&value=' + encodeURIComponent(decodedText) + '&t=' + Date.now();
			Joomla.request({
				url: url,
				method: 'GET',
				onSuccess: function (response) {
					try {
						const data = JSON.parse(response);
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

		if (!checkinUrl) {
			showModal(EventQrscanHelper.getErrorMessage('eb_absent'), 'warning');
			return;
		}
	});
})(document, Joomla);
