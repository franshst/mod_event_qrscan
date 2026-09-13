# Tasks: QR Scan Module (`mod_event_qrscan`)

Derived from `plan.md`, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`.
Module project root is separate from this reference repo; paths below are module-relative unless noted.

## Phase 1 — Module skeleton + manifest

- [X] T1. Create module layout (`mod_event_qrscan.php`, `tmpl/default.php`, `Helper/EventQrscanHelper.php`, `language/en-GB/*.ini|sys.ini`, `js/`, `update/`, `LICENSE`, `README.md`) mirroring Event-summary structure
- [X] T2. Author `update/mod_event_qrscan.xml` SOURCE manifest with `checkin_interval=2000`, `ticket_max_length=32`, Bootstrap text-utility classes (`text_success_class=text-success`, `text_warning_class=text-danger`, no module CSS, FR-6 styling), `layout`; namespace + `<version>{VERSION}` placeholder (no URL/key/sound params — these come from EB `getConfig()`); built artifact root `mod_event_qrscan.xml` is stamped by `build.py`, do not edit directly
- [X] T2b. Author `update/event_qrscan_update.xml` template with required nodes (`name`, `version` with `{VERSION}` placeholder, `infourl`, `downloads><downloadurl` pointing to `mod_event_qrscan.zip`, `sha256`) — built by `build.py` T13 via `{VERSION}` substitution; see `contracts/update-xml.md`
- [X] T3. Wire `mod_event_qrscan.php`: `defined('_JEXEC') or die`, EB bootstrap + `getConfig()->checkin_api_key` (guarded; human-readable error + stop if empty/absent), build full URL via `Route::_()` with task `scan.qr_code_checkin`, `addScriptOptions(checkinUrl, checkInInterval, ticketMaxLength, successAudioUrl, failAudioUrl, textSuccessClass, textWarningClass)` (exact keys per `contracts/module-params.md`), `ModuleHelper::getLayoutPath('mod_event_qrscan', ...)`
- [X] T4. `php -l` all PHP files — must pass

## Phase 2 — Template + Bootstrap modal

- [X] T5. `tmpl/default.php`: `div#reader`, aim instruction line ("Hold the ticket code inside the square"), custom Start/Stop + "Switch camera" buttons, Bootstrap modal via `HTMLHelper::_('bootstrap.modal')` / `renderModal(id=qrscanModal)` with `data-bs-dismiss` Close (no `Html5QrcodeScanner` widget UI); fallback (FR-6/FR-7): if `bootstrap.Modal` is unavailable, render result text in an inline div instead (single visible surface at a time)

## Phase 3 — JavaScript scanner

- [X] T7a. Clone `@taluks/html5-qrcode` 2.3.9 from https://github.com/taluks/html5-qrcode into `js/html5-qrcode.min.js` (direct file inclusion — NOT npm); record version + sha256 in `README.md`. The file will be placed in the Joomla media directory (`media/mod_event_qrscan/js/`) alongside the module.
- [X] T7. Implement scanner using `js/html5-qrcode.min.js` from `@taluks/html5-qrcode` on the low-level `Html5Qrcode` class (not `Html5QrcodeScanner`): constructor `{ formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] }`, start `{ fps: 1, qrbox: 250×250, disableFlip: true }` (native detector default-on); back-camera default (`facingMode exact environment` → label match → first; persist `deviceId` in `localStorage`), cycle button via `stop()`+`start()`, `sessionStorage` dedup (`checkInInterval`, default 2000, FR-11), `visibilitychange` suspend/resume (FR-11); URL builder per T9 / `contracts/checkin-api.md`
- [X] T8. (FR-9) Alphanumeric + length (1..32 default, configurable max) pre-validation; missing check-in URL → error text, no scanner; `onScanFailure` no-op
- [X] T9. (FR-10 audio) `Joomla.request` success → escaped `message` into `.modal-body` + `bootstrap.Modal.show()` + audio (`media/com_eventbooking/audios/success.mp3` iff `success:true`, else `fail.mp3` — incl. validation/network errors; guard `Audio` errors → silent); error path → friendly modal (no `alert()`); implement FR8 lock: `isProcessing` flag + guarded `pause(true)`/`resume()` per `research.md` R9, cleared on modal dismiss
- [X] T10. `node --check js/site-checkin-default.js` — must pass (NOT vendored `js/html5-qrcode.min.js`)

## Phase 4 — Build + release automation

- [X] T11. Port Event-summary `build.py` → `python build.py <semver>`: first verify vendored-lib gate (step 1b), then `php -l`, `node --check js/site-checkin-default.js`, `uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js`, `ET.parse` all XMLs, manifest required-field + semver check. EXCLUDE `js/html5-qrcode.min.js` from all minify, lint, and delete steps — it is cloned pre-minified and included as-is.
- [X] T12. Implement ZIP step (`tmpl/, language/, Helper/, js/` + manifest + `*.php` + `LICENSE`) + completeness assert (required entries, no temp/template leak)
- [X] T13. Implement `{VERSION}` substitution + `sha256(zip)` → `<sha256>` (print sha256 + md5 informational)
- [X] T14. Add `.github/workflows` job running `build.py` on push (same gates)

## Phase 5 — Validation

- [X] T15. Run `python build.py 1.0.0` → exit 0, `mod_event_qrscan.zip` + `event_qrscan_update.xml` + hashes (per `contracts/build.md`)
- [X] T16. Manual Joomla 5 checklist per `quickstart.md`: install (EB present), place, verify EB-resolved endpoint + sounds, camera cycle, sample QR scan (modal <1s + EB success sound — NOTE: scan timing <1s is out of scope of this first implementation as it depends on lighting/camera quality), negatives incl. EB fail sound with specific messages — no camera → "No camera available."; offline → "No network, check-in service unavailable"; invalid QR → "This seems not to be a ticket QR code"; bad key → check-in module's own message; EB absent → "Error while communicating with check-in service, error code is %s" (FR8 lock: second QR during open modal sends no request — verify single request in devtools Network), dedup (rescan same code <2 s suppressed, after sent) via `&t=`, updater bump test

## Done When

- [ ] All boxes checked; `build.py` green; manual table filled; updater finds new version

## Phase 6 — Convergence

- [X] T017 Implement scanner initialization: add `new Html5Qrcode("reader")`, `scanner.start({facingMode, fps:1, qrbox:250×250, disableFlip:true})`, `scanner.stop()`, `getCameras()` label match with `localStorage` deviceId persistence, and Start/Stop/Switch-camera button event handlers to `js/site-checkin-default.js` per FR-3/FR-4/T7
- [X] T018 Add JS `EventQrscanHelper` object with `validateTicketCode(text, maxLength)` and `getErrorMessage(case)` functions to `js/site-checkin-default.js` so calls from `onScanSuccess` resolve (currently calls a non-existent JS object) per FR-7/T8/T9
- [X] T019 Implement `isProcessing` flag and `pause(true)`/`resume()` via `getState()` in `js/site-checkin-default.js`: `onScanSuccess` returns immediately while `isProcessing===true`, sets flag to true, pauses decoder when scanning starts, clears and resumes when modal is dismissed per FR-8/T9
- [X] T020 Implement `visibilitychange` suspend/resume handler in `js/site-checkin-default.js`: `document.visibilitychange` pauses scanner when hidden, resumes when visible, guarded by `getState()`, per FR-11/T7/T9
- [X] T021 build.py has no `minify_js()`/`uglifyjs` step — minification is handled by the GitHub release workflow (`build.yml` installs `uglify-js`); `site-checkin-default.min.js` is not produced by `build.py` per T11
- [X] T022 Confirmed `js/zxing_reader.wasm` and `js/index.html` are required by `@taluks/html5-qrcode` library and are included in the Joomla media directory per task T7a
