# Tasks: QR Scan Module (`mod_event_qrscan`)

Derived from `plan.md`, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`.
Module project root is separate from this reference repo; paths below are module-relative unless noted.

## Phase 1 — Module skeleton + manifest

- [X] T1. Create module layout (`mod_event_qrscan.php`, `tmpl/default.php`, `Helper/EventQrscanHelper.php`, `language/en-GB/*.ini|sys.ini`, `js/`, `update/`, `LICENSE`, `README.md`) mirroring Event-summary structure
- [X] T2. Author `update/mod_event_qrscan.xml` SOURCE manifest with `checkin_interval=2000`, `ticket_max_length=32`, Bootstrap text-utility classes (`text_success_class=text-success`, `text_warning_class=text-danger`, no module CSS, FR-6 styling), `layout`; namespace + `<version>{VERSION}` placeholder (no URL/key/sound params — these come from EB `getConfig()`); built artifact root `mod_event_qrscan.xml` is stamped by `build.py`, do not edit directly
- [X] T2b. Author `update/event_qrscan_update.xml` template with required nodes (`name`, `version` with `{VERSION}` placeholder, `infourl`, `downloads><downloadurl` pointing to `mod_event_qrscan.zip`, `sha256`) — built by `build.py` T13 via `{VERSION}` substitution; see `contracts/update-xml.md`
- [X] T3. Wire `mod_event_qrscan.php`: `defined('_JEXEC') or die`, EB bootstrap + `getConfig()->checkin_api_key` (guarded; human-readable error + stop if empty/absent), build full URL via `Route::_()` with task `scan.qr_code_checkin`, `addScriptOptions(checkinUrl, checkInInterval, ticketMaxLength, successAudioUrl, failAudioUrl, textSuccessClass, textWarningClass)` (runtime keys; full list incl. 7 i18n message keys per `contracts/module-params.md`, extended by T034), `ModuleHelper::getLayoutPath('mod_event_qrscan', ...)`
- [X] T4. `php -l` all PHP files — must pass

## Phase 2 — Template + Bootstrap modal

- [X] T5. `tmpl/default.php`: `div#reader`, aim instruction line ("Hold the ticket code inside the square"), custom Start/Stop + "Switch camera" buttons, Bootstrap modal via `HTMLHelper::_('bootstrap.modal')` / `renderModal(id=qrscanModal)` with `data-bs-dismiss` Close (no `Html5QrcodeScanner` widget UI); fallback (FR-6/FR-7): if `bootstrap.Modal` is unavailable, render result text in an inline div instead (single visible surface at a time)

## Phase 3 — JavaScript scanner

- [X] T7a. Clone `@taluks/html5-qrcode` 2.3.9 from https://github.com/taluks/html5-qrcode into `js/html5-qrcode.min.js` (direct file inclusion — NOT npm); record version + sha256 in `README.md`. The file will be placed in the Joomla media directory (`media/mod_event_qrscan/js/`) alongside the module.
- [X] T7. Implement scanner using `js/html5-qrcode.min.js` from `@taluks/html5-qrcode` on the low-level `Html5Qrcode` class (not `Html5QrcodeScanner`): constructor `{ formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] }`, start `{ fps: 1, qrbox: 250×250, disableFlip: true }` (native detector default-on); back-camera default (`facingMode exact environment` → label match → first; persist `deviceId` in `localStorage`), cycle button via `stop()`+`start()`, `sessionStorage` dedup (`checkInInterval`, default 2000, FR-11), `visibilitychange` suspend/resume (FR-11); URL builder per T9 / `contracts/checkin-api.md`
- [X] T8. (FR-9) Alphanumeric + length (1..32 default, configurable max) pre-validation; missing check-in URL → error text, no scanner; `onScanFailure` no-op
- [X] T9. (FR-10 audio) `Joomla.request` success → escaped `message` into `.modal-body` + `bootstrap.Modal.show()` + audio (`media/com_eventbooking/audios/success.mp3` iff `success:true`, else `fail.mp3` — incl. validation/network errors; guard `Audio` errors → silent); error path → friendly modal (no `alert()`); implement FR8 lock: `isProcessing` flag + guarded `pause(true)`/`resume()` per `research.md` R9, cleared on modal dismiss
- [X] T10. `node --check js/site-checkin-default.js` — must pass (NOT vendored `js/html5-qrcode.min.js`) — SUBSUMED by T11 (run inside `build.py`); kept as fast local pre-check only

## Phase 4 — Build + release automation

- [X] T11. Port Event-summary `build.py` → `python build.py <semver>`: first verify vendored-lib gate (step 1b), then `php -l`, `node --check js/site-checkin-default.js`, `uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js`, `ET.parse` all XMLs, manifest required-field + semver check. EXCLUDE `js/html5-qrcode.min.js` from all minify, lint, and delete steps — it is cloned pre-minified and included as-is.
- [X] T12. Implement ZIP step (`tmpl/, language/, Helper/, js/` + manifest + `*.php` + `LICENSE`) + completeness assert (required entries, no temp/template leak)
- [X] T13. Implement `{VERSION}` substitution + `sha256(zip)` → `<sha256>` (print sha256 + md5 informational)
- [X] T14. Add `.github/workflows` job running `build.py` on push (same gates)

## Phase 5 — Validation

- [X] T15. Run `python build.py 1.0.0` → exit 0, `mod_event_qrscan.zip` + `event_qrscan_update.xml` + hashes (per `contracts/build.md`)
- [X] T16. Manual Joomla 5 checklist per `quickstart.md`: install (EB present), place, verify EB-resolved endpoint + sounds, camera cycle, sample QR scan (modal + EB success sound), negatives incl. EB fail sound with specific messages — no camera → "No camera available."; camera in use → "Camera is in use by another application."; offline → "No network, check-in service unavailable"; invalid QR → "This seems not to be a ticket QR code"; bad key → check-in module's own message; EB absent → "Error while communicating with check-in service, error code is %s"; unknown → "An error occurred" (FR8 lock: second QR during open modal sends no request — verify single request in devtools Network), dedup (rescan same code <2 s suppressed, after sent) via `&t=`, updater bump test

## Done When

- [ ] All boxes checked (T021 retracted, not required); `build.py` green; manual table filled; updater finds new version

NOTE: there is no T6 — the ID was never assigned (Phase 2 jumps T5 → T7a); IDs are stable and will not be renumbered.

## Phase 6 — Convergence

- [X] T017 Implement scanner initialization: add `new Html5Qrcode("reader")`, `scanner.start({facingMode, fps:1, qrbox:250×250, disableFlip:true})`, `scanner.stop()`, `getCameras()` label match with `localStorage` deviceId persistence, and Start/Stop/Switch-camera button event handlers to `js/site-checkin-default.js` per FR-3/FR-4/T7 — NOTE: argument shape superseded by T026 (camera config + efficiency config are separate `start()` args); constructor `formatsToSupport` per T040
- [X] T018 Add JS `EventQrscanHelper` object with `validateTicketCode(text, maxLength)` and `getErrorMessage(case)` functions to `js/site-checkin-default.js` so calls from `onScanSuccess` resolve (currently calls a non-existent JS object) per FR-7/T8/T9
- [X] T019 Implement `isProcessing` flag and `pause(true)`/`resume()` via `getState()` in `js/site-checkin-default.js`: `onScanSuccess` returns immediately while `isProcessing===true`, sets flag to true, pauses decoder when scanning starts, clears and resumes when modal is dismissed per FR-8/T9
- [X] T020 Implement `visibilitychange` suspend/resume handler in `js/site-checkin-default.js`: `document.visibilitychange` pauses scanner when hidden, resumes when visible, guarded by `getState()`, per FR-11/T7/T9
- [ ] T021 RETRACTED — SUPERSEDED by T11/T036: ~~build.py has no `minify_js()`/`uglifyjs` step — minification is handled by the GitHub release workflow (`build.yml` installs `uglify-js`); `site-checkin-default.min.js` is not produced by `build.py` per T11~~ — retracted; `uglifyjs` runs inside `build.py` per T11 / `contracts/build.md` step 1.
- [X] T022 Confirmed `js/zxing_reader.wasm` and `js/index.html` are required by `@taluks/html5-qrcode` library and are included in the Joomla media directory per task T7a

## Phase 7: Convergence

- [X] T023 Fix 404 for html5-qrcode.min.js: resolve path mismatch where `mod_event_qrscan.php` references `media/mod_event_qrscan/js/...` but manifest installs JS to `modules/mod_event_qrscan/js/` per plan §3.4 / spec FR-3 (contradicts)
- [X] T024 Guard EB bootstrap in `mod_event_qrscan.php`: wrap `require_once` for EB bootstrap with `file_exists` check and try/catch so absent EB shows graceful error per plan §3.2 / spec FR-7 / SC-5 (contradicts)
- [X] T025 Add FR-4 efficiency config to scanner `start()`: include `fps: 1, qrbox: { width: 250, height: 250 }, disableFlip: true` in `startScanner()` start options in `js/site-checkin-default.js` per spec FR-4 / plan §3.1 / T017 (missing)

## Phase 8: Convergence

- [X] T026 Fix `scanner.start()` argument order in `js/site-checkin-default.js:83-93` — pass camera config (1 key: `deviceId` or `facingMode`) as 1st arg and efficiency config (`fps`,`qrbox`,`disableFlip`) as 2nd arg instead of swapped positions; this fixes the `cameraIdOrConfig object should have exactly 1 key, found 4 keys` error that prevents all Start/Stop/Switch-camera buttons from working per FR-3/FR-4/T017 (missing, CRITICAL)
- [X] T027 Remove `formatsToSupport` from `scanner.start()` efficiency config at `js/site-checkin-default.js:85` — `@taluks/html5-qrcode` 2.3.9 `Html5Qrcode` constructor accepts only `verbose`/`experimentalFeatures`, not `formatsToSupport`; QR-only scanning is handled by ZXing (vendored); ensure efficiency config contains only `fps`,`qrbox`,`disableFlip` per plan §3.1 / FR-4 / T017 (partial, HIGH)

## Phase 9 — Dutch translation support (merged from `001-dutch-translation-support`, FR-12…FR-16 / SC-7…SC-10 / R13…R17)

> C1 decision: `uglifyjs` minification runs inside `build.py` (per T11 / `contracts/build.md` step 1). No standalone uglify task is kept — JS verification is covered by the `build.py` run in T037. T021 ("build.py has no minify step") is hereby SUPERSEDED.
> Future improvement (noted, not implemented): user testing/deployment method (manual `build.py` run + hand-installed ZIP + manual Dutch/English/fallback passes) is still unsatisfactory — consider automated install/smoke checks.

### Setup (key inventory)

- [X] T028 [P] Audit PHP/tmpl language keys vs en-GB ini: grep all `JText::_`/`Joomla.getOptions` keys in `mod_event_qrscan.php` and `tmpl/default.php` and confirm each exists in `language/en-GB/en-GB.mod_event_qrscan.ini` (per FR-12)
- [X] T029 [P] Audit JS hardcoded strings: list the 7 `getErrorMessage` cases in `js/site-checkin-default.js` (`no_camera`, `camera_busy`, `offline`, `invalid_qr`, `bad_key`, `eb_absent`, `unknown`; union per C4 — `camera_busy` = "camera in use" message) and confirm each has a matching en-GB key for the script-options wiring

### Foundational

- [X] T030 Create `language/nl-NL/index.html` directory guard (empty file, same convention as `language/en-GB/index.html`)

### Dutch volunteer interface (FR-13/SC-7)

- [X] T031 [P] Author `language/nl-NL/nl-NL.mod_event_qrscan.ini` with the 20 Dutch strings from the spec acceptance table (same key set as en-GB, `%s` preserved in `MOD_EVENT_QRSCAN_ERROR_EB_ABSENT`)
- [X] T032 [P] Author `language/nl-NL/nl-NL.mod_event_qrscan.sys.ini` with the Dutch `MOD_EVENT_QRSCAN_XML_DESCRIPTION`
- [X] T033 Run key-parity probe from `quickstart.md` §C1 (en-GB ↔ nl-NL identical key sets, `%s` counts match) — depends on T031, T032

### Language-system sourcing (FR-12/FR-14/FR-16, SC-8/SC-9)

- [X] T034 [P] Add `addScriptOptions` calls in `mod_event_qrscan.php` resolving the 7 JS message keys via `JText::_` (same pattern as existing `MOD_EVENT_QRSCAN_START`/`STOP` options, per R13 and `contracts/language-files.md` rule 6; extends the T3 key list per C2)
- [X] T035 [P] Rewrite `EventQrscanHelper.getErrorMessage` in `js/site-checkin-default.js` to read each message via `Joomla.getOptions(key, englishFallback)`, keeping current English literals only as fallbacks (SC-5 texts are fallbacks per C3)
- [X] T036 Verify JS via `build.py` gates (`node --check` + `uglifyjs` minify run inside `build.py` per T11) — no standalone `uglifyjs` task (C1 decision) — depends on T035

### Polish & validation

- [X] T037 [P] Run `python build.py <semver>` (exit 0) and confirm the ZIP contains `language/nl-NL/` files per `contracts/language-files.md` rule 5 (extends T12/ZIP gate)
- [X] T038 [P] Run hardcoded-literal probe per `quickstart.md` §C1 across `tmpl/default.php`, `mod_event_qrscan.php`, `js/site-checkin-default.js` (only language-key references and JS English fallbacks may remain; SC-8)
- [X] T039 Hand the built deployment package to the user for manual validation (Dutch pass SC-7, fallback probe SC-9, English regression per `quickstart.md` §§C2–C4) with the Android-Chrome cache-clear reminder — depends on T037, T038

## Phase 10 — Scanner constructor efficiency (I4 follow-up)

- [X] T040 Add `formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]` to the `Html5Qrcode` constructor in `js/site-checkin-default.js` (currently `new Html5Qrcode('reader', { verbose: true })` only) per FR-4/R11; keep the existing `verbose` flag, never pass `formatsToSupport` to `start()` (see T027); verify QR-only decode on the manual scan pass and keep `build.py` gates green

## Phase 11 — Layout param removal (spec Session 2026-09-20)

- [X] T041 Remove `layout` field block from SOURCE manifest `update/mod_event_qrscan.xml` (delete `<field name="layout" ...>` + `<option value="default">`; keep `checkin_interval`, `ticket_max_length`, text classes)
- [X] T042 Hardcode default layout in `mod_event_qrscan.php` (delete `$layout = $params->get('layout', 'default');`, change to `require ModuleHelper::getLayoutPath('mod_event_qrscan', 'default');`)
- [X] T043 [P] Delete `MOD_EVENT_QRSCAN_LAYOUT` key from `language/en-GB/en-GB.mod_event_qrscan.ini`
- [X] T044 [P] Delete `MOD_EVENT_QRSCAN_LAYOUT` key from `language/nl-NL/nl-NL.mod_event_qrscan.ini`
- [X] T045 [P] Update docs for layout removal: delete `layout` row in `specs/qr-scan-module/contracts/module-params.md`, drop `layout` mentions in `specs/qr-scan-module/plan.md` (§3.3 getLayoutPath + §2 params list), drop `_LAYOUT` from 20-key list in `specs/qr-scan-module/data-model.md` (20→19), delete Layout row in `README.md`
- [X] T046 Run validation for layout removal: `php -l mod_event_qrscan.php`, `ET.parse update/mod_event_qrscan.xml`, key-parity probe en-GB↔nl-NL (19 keys), `python build.py <semver>` exit 0, manual install check (no Layout field in module params, module renders `tmpl/default.php`) — depends on T041–T045

## Phase 12 — Configurable scan FPS (spec Session 2026-09-20, FR-4)

> Sequence with Phase 11: T047 touches the same manifest/ini/README files as T041/T043–T045 — run Phase 12 after Phase 11, or merge conflicting edits.

- [X] T047 Add `scan_fps` number field to SOURCE manifest `update/mod_event_qrscan.xml` (`type="number"`, `label="MOD_EVENT_QRSCAN_SCAN_FPS"`, `default="2"`, `min="1"`, `max="10"`; `integer` was specified in error, corrected per T054) — after T041
- [X] T048 Read/clamp/inject scan FPS in `mod_event_qrscan.php` (`(int) $params->get('scan_fps', 2)`, clamp 1–10 fallback 2, `$doc->addScriptOptions('scanFps', $scanFps)`) — after T042
- [X] T049 Use configured FPS in `js/site-checkin-default.js` (`const scanFps = Joomla.getOptions('scanFps', 2)` with 1–10 clamp fallback 2; `efficiencyConfig` uses `fps: scanFps` instead of hardcoded 2; keep `qrbox`/`disableFlip`)
- [X] T050 [P] Add `MOD_EVENT_QRSCAN_SCAN_FPS="Scan FPS"` to `language/en-GB/en-GB.mod_event_qrscan.ini` — after T043
- [X] T051 [P] Add `MOD_EVENT_QRSCAN_SCAN_FPS="Scan-FPS"` to `language/nl-NL/nl-NL.mod_event_qrscan.ini` (confirm Dutch wording) — after T044
- [X] T052 [P] Update docs for scan FPS: add `scan_fps` row + `scanFps` JS key in `specs/qr-scan-module/contracts/module-params.md`, update efficiency config in `specs/qr-scan-module/plan.md` (§3.1/§3.3), validation rule in `specs/qr-scan-module/data-model.md`, params table + `fps: 1` fix in `README.md` — after T045
- [X] T053 Run validation for scan FPS: `php -l mod_event_qrscan.php`, `node --check js/site-checkin-default.js`, `ET.parse update/mod_event_qrscan.xml`, key-parity probe en-GB↔nl-NL, `python build.py <semver>` exit 0, manual check (admin sets fps 5 → scans; invalid value → fallback 2) — depends on T047–T052

## Phase 13: Convergence (2026-09-21 user triage)

> User decisions: F1 record `number` as correct type (spec `integer` was in error); F2/F3/U2 marked as separate sort-out issues; F4/F5 do as recommended; F6 remove `bad_key`; U1 keep debug scaffolding until F2 is resolved (no task); U4 documented retroactively as completed; U5 `reference/` is unreferenced (grep `reference/` repo-wide: no hits).

- [X] T054 Correct `scan_fps` field-type docs from `integer` to `number` in `spec.md` (Session 2026-09-20 clarification), `plan.md`, `contracts/module-params.md`, and T047 wording; code (`type="number"` in `update/mod_event_qrscan.xml`) stays as-is per FR-4 (partial)
- [X] T055 Sort out ProcessingLock mechanism as separate issue: reconcile `stop()`+`enforceVideoStop()`+restart in `lockScanner()`/`unlockScanner()` with the specified guarded `pause(true)`/`resume()` via `getState()`; keep `QRSCAN_DEBUG`/`qrscanLog`/`verbose:true` scaffolding until this is resolved per FR-8 / R9 / data-model `ProcessingLock` (contradicts)
- [X] T056 Sort out PHP `Helper/EventQrscanHelper.php`: decide whether a helper class is needed at all (currently uncalled, global class vs manifest `<namespace>EventQRScan</namespace>`); either namespace/wire it or delete it, and complete or drop its partial `getErrorMessage()` map (missing `camera_busy`) per plan §3.3–§3.4 (partial)
- [X] T057 Make FR-6 inline fallback non-destructive in `js/site-checkin-default.js` (sibling/hide-show div instead of `replaceChild` destroying `#reader`) so the scanner can restart and the single-visible-surface rule holds per FR-6 (partial)
- [X] T058 Map unparseable EB JSON response to the `unknown` error case instead of `invalid_qr` in `onSuccess` catch path in `js/site-checkin-default.js` per SC-5 (partial)
- [X] T059 Remove the unused `bad_key` message path from JS `getErrorMessage`, `addScriptOptions` wiring in `mod_event_qrscan.php`, en-GB/nl-NL ini keys, and spec/contract docs (SC-5 union, FR-13 table, `contracts/module-params.md`, `data-model.md` key inventory); invalid ticket codes are reported via check-in JSON `message` per SC-5 (unrequested)
- [X] T060 Sort out camera-detection fallback chain in `js/site-checkin-default.js` (multi-candidate retry, re-enumeration on empty list, post-failure recount, `isPermissionError` short-circuit): verify with field evidence whether the no-enumerated-cameras case really occurs and drop superfluous branches per plan §3.1 / R10 (unrequested)
- [X] T061 Document pop-up visibility requirement in `spec.md` (FR-6): result modal top must not render higher than the first HTML element (currently the video element), i.e. fully visible without scrolling per FR-6 (missing)
- [X] T062 Document `deploy.sh` release tooling (already implemented: semver-bump arg default patch, latest-tag lookup via gh, notes from `git log`, `gh release create`) — retroactive record, no code change; admitted to scope to avoid untracked-tooling remarks per plan §3 / SC build-gate (unrequested)
- [X] T063 Remove unreferenced `reference/` dev copy (repo-wide grep for `reference/` returns no hits; user-supplied working example, not part of build/ZIP) per plan §3.4 file structure (unrequested)
