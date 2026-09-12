'use strict';

(function (document, Joomla) {
	document.addEventListener('DOMContentLoaded', () => {
		const modal = new tingle.modal({
			footer: true,
			stickyFooter: false,
			closeMethods: ['escape'],
			closeLabel: "Close"
		});

		modal.addFooterBtn('Close', `${Joomla.getOptions('btnClass', 'tingle-btn')} ${Joomla.getOptions('btnPrimaryClass', 'tingle-btn--primary')}`, function () {
			modal.close();
		});

		const html5QrcodeScanner = new Html5QrcodeScanner("reader", {fps: 1}, /* verbose= */false);

		const storage = window.sessionStorage;

		const checkInInterval = Joomla.getOptions('checkInInterval', 15000);

		html5QrcodeScanner.render(onScanSuccess, onScanFailure);

		function onScanSuccess(decodedText, decodedResult) {
			// If the same QRCODE was scanned in less than 30 seconds, do not check it again
			if (storage.getItem(decodedText) !== null) {
				const currentTime = Date.now();

				if (currentTime - storage.getItem(decodedText) < checkInInterval) {
					return;
				}
			}

			storage.setItem(decodedText, Date.now());

			Joomla.request({
				url: `${Joomla.getOptions('checkinUrl')}&value=${decodedText}&t=${Date.now()}`,
				method: 'GET',
				perform: true,
				onSuccess: (response) => {
					const json = JSON.parse(response);
					let audioUrl = '';

					if (json.success) {
						modal.setContent(`<div class="${Joomla.getOptions('textSuccessClass')}">${json.message}</div>`);
						audioUrl = Joomla.getOptions('successAudioUrl');
					} else {
						modal.setContent(`<div class="${Joomla.getOptions('textWarningClass')}">${json.message}</div>`);
						audioUrl = Joomla.getOptions('failAudioUrl');
					}

					modal.open();

					// Play sound file
					if (audioUrl) {
						const audio = new Audio(audioUrl);
						audio.play();
					}
				},
				onError: (error) => {
					alert(error);
				}
			});
		}

		function onScanFailure(error) {
		}
	});
})(document, Joomla);
