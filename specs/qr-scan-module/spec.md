# Feature Specification: QR Scan Module

## Short Name: qr-scan-module

## Purpose

This feature provides a web-based QR scan module for event volunteers to check tickets at the entrance. Users select the module from the event organizer's website and interact with a simple interface to scan QR codes.

## User Scenarios & Testing

### Primary User Flow

1. **User selects QR scan module** from the event organizer's website
2. **Blank screen with camera area** appears, ready to scan
3. **User clicks camera button** to cycle through available cameras (default: "Back camera")
4. **User clicks start/stop button** to begin scanning
5. **Camera image displays** in the designated area
6. **QR code is recognized** and ticket code is sent to check-in module
7. **Response pop-up appears** with scan result
8. **User reads pop-up and clicks OK** to dismiss
9. **Ready to scan next QR code**

### Edge Cases

- **No camera available**: User should be informed of the issue
- **Camera in use**: User should be informed the camera is in use by another application
- **Network error**: Clear indication of connection problem
- **Invalid QR code**: Display error message
- **Pop-up display failure**: Clear error message
- **Missing translation key**: English (en-GB) fallback text is shown, never a raw key or blank (per FR-16)
- **`%s` placeholders** (e.g. the EB-absent error code): preserved verbatim in every translation, substituted at display time
- **Third language** (e.g. French): English module text is shown via fallback; adding that language is a future feature
- **EB-backend messages**: texts returned by the Events Booking check-in backend pass through untranslated (out of scope)

## Glossary (canonical terms)

- **EB** = Events Booking (`com_eventbooking`). **Check-in Module** = EB `scan.qr_code_checkin` endpoint: accepts ticket codes from this module, forwards to the Reservation Module, and returns the result; this module displays the returned message. **Reservation Module** = EB backend that validates the ticket and performs the check-in, returning either success or an error message to the Check-in Module.
- JS option keys (canonical): `checkinUrl`, `checkInInterval`, `ticketMaxLength`, `successAudioUrl`, `failAudioUrl`, `textSuccessClass`, `textWarningClass`, plus the 7 i18n message keys (`MOD_EVENT_QRSCAN_ERROR_NO_CAMERA`, `_CAMERA_BUSY`, `_OFFLINE`, `_INVALID_QR`, `_BAD_KEY`, `_EB_ABSENT`, `_UNKNOWN`) — full list authoritative in `contracts/module-params.md`.

## Functional Requirements (stable IDs for coverage mapping)

1. **FR-1 User Interface**: Volunteer can Start → scan → dismiss result using only the on-screen instruction and button labels (no external guidance); aim instruction (“Hold the ticket code inside the square”), Start/Stop + Switch-camera buttons visible.
2. **FR-2 Camera Selection**: Ability to switch between available cameras with default back camera (`facingMode exact environment` → label match → first; chosen `deviceId` persisted in `localStorage` and reused next session, overriding the back-camera default).
3. **FR-3 Start/Stop Control**: Custom Start/Stop button starts/stops `Html5Qrcode` decoder (no `Html5QrcodeScanner` widget UI).
4. **FR-4 QR Recognition**: QR-only decode via the `Html5Qrcode` constructor option `{ formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] }` (constructor only — never a `start()` option); decode attempts at administrator-configurable `fps` (new `scan_fps` module param, manifest integer field min 1 max 10, default 2, allowed range 1–10; out-of-range values fall back to default 2; spec default changed 1→2 per 2026-09-20 clarification to match current code), `qrbox` 250×250, `disableFlip: true` (start config).
5. **FR-5 Ticket Code Transmission**: Send `GET {checkinUrl}&value={encodeURIComponent(ticket)}&t={Date.now()}` to Check-in Module; secure transmission delegated to site HTTPS + logged-in user (no extra module crypto).
6. **FR-6 Response Display**: Single Bootstrap 5 modal (`qrscanModal`) shows text-escaped `message`; Close via `data-bs-dismiss`. If `bootstrap.Modal` is unavailable, render the message as inline text instead (FR-7 error path; modal and inline fallback are never shown simultaneously). Body styling uses module params `text_success_class` (default `text-success`) and `text_warning_class` (default `text-danger`); no external CSS file (JS-set inline styles and embedded `<style>` in the template are allowed).
7. **FR-7 User Feedback**: All failures show human-readable modal/inline text (no `alert()`). Acceptance criteria: each negative case (no camera, camera in use, offline, invalid QR, bad key, EB absent, unknown) yields modal/inline text with the correct EB sound where applicable.
8. **FR-8 Non-Scanning During Processing**: No check-in request while `isProcessing===true` (software flag + guarded `pause(true)`/`resume()`); verified by single request in devtools Network.
9. **FR-9 Ticket Code Pre-validation**: Before any network call, reject `decodedText` that is empty, non-alphanumeric, or longer than `ticket_max_length` (default 32); show human-readable modal/inline error and send no request. Undecodable frames (`onScanFailure`) stay silent no-ops.
10. **FR-10 Audio Feedback**: On each resolved result, play EB `success.mp3` iff `success:true`, else `fail.mp3` — including client-validation and network failures. Guard `Audio` playback errors with silent fallback; result display (FR-6/FR-7) always takes precedence. No audio assets are bundled in the ZIP (EB-sourced, see R7).
11. **FR-11 Rescan Dedup + Background Suspend**: After modal dismiss, suppress resend of the same ticket code while `now - sessionStorage[value] < checkInInterval` (default 2000 ms); a different code always sends immediately. On `document.visibilitychange`, pause when hidden and resume when visible (guarded by `getState()`, same pattern as FR-8).
12. **FR-12 Language-system sourcing**: Every user-visible string MUST resolve through Joomla's language system — either built-in Joomla text or a module language key — with zero hardcoded display literals in the module code.
13. **FR-13 Dutch translation**: The module MUST ship a complete Dutch (nl-NL) translation covering the same key set as en-GB: aim instruction, Start, Stop, Switch camera, Scan Result title, Close, all seven user-facing error messages (no camera, camera busy/in use, offline, invalid QR, bad key, EB absent with `%s`, unknown), the check-in-config notice, and backend labels (description, check-in interval, ticket max length, text classes — `layout` param removed per 2026-09-20 clarification, single `tmpl/default.php` only).
14. **FR-14 JS message resolution**: JavaScript-driven messages MUST resolve through the language system via `addScriptOptions` (PHP `JText::_()` resolution) + `Joomla.getOptions(key, englishFallback)`, so the Dutch translations apply to pop-ups shown from JavaScript. English literals in JS are fallbacks only.
15. **FR-15 Language installation**: The installation package MUST install the nl-NL language files (site ini and sys ini) via the existing `<folder>language</folder>` manifest entry (no manifest change); `build.py` zips `language/` wholesale.
16. **FR-16 English fallback**: When a key has no translation in the active site language, the module MUST show the English (en-GB) text (standard Joomla fallback), never a raw key or blank string.

## Success Criteria

1. **SC-1 User Experience [informational]**: 95% of users can successfully scan and receive a response (post-launch survey, not a build gate).
2. **SC-2 Accuracy [informational]**: 99% of QR codes are recognized correctly (post-launch, not a build gate).
3. **SC-3 Response Time [informational]**: Response pop-up appears after QR recognition (monitored via T16 manual scan; timing depends on lighting conditions and camera quality and is not a build gate).
4. **SC-4 User Satisfaction [informational]**: 80% of users report the interface is easy to use (post-launch survey, not a build gate).
5. **SC-5 Error Handling [build-gate]**: Every error case displays a specific human-readable message and the correct EB sound where applicable: no camera → "No camera available."; camera in use → "Camera is in use by another application."; offline → "No network, check-in service unavailable"; invalid QR → "This seems not to be a ticket QR code"; bad key → not detected by this module (check-in module returns its own message); EB absent → "Error while communicating with check-in service, error code is %s" (where `%s` is the HTTP status code). These English texts are the **fallback** values (see FR-14/FR-16); the displayed text always resolves via language keys. Union of JS cases: `no_camera, camera_busy, offline, invalid_qr, bad_key, eb_absent, unknown`. Verified by T16 negatives.
6. **SC-6 Reliability [out-of-scope]**: Out of scope — uptime is dictated by the availability of the underlying (out-of-scope) software/hardware.
7. **SC-7 Dutch UI [build-gate]**: With the site language set to Dutch, 100% of module display strings (buttons, instruction, pop-up title/body/close, all error messages) render in Dutch.
8. **SC-8 No hardcoded literals [build-gate]**: Zero hardcoded user-visible text literals remain in the module code (verified by review/search; JS English literals are `getOptions` fallbacks only).
9. **SC-9 Fallback [build-gate]**: With one Dutch key deliberately removed, the English text is displayed for that message (no raw keys or blanks).
10. **SC-10 Dutch install [build-gate]**: The module installs from the standard installation package on a Dutch-language Joomla site with all Dutch strings working and no language warnings.

## Key Entities

- **User**: Volunteer scanning tickets
- **Camera**: Device capturing QR code images
- **Check-in Module**: EB endpoint receiving ticket codes from this module and returning the check-in result for display
- **Reservation Module**: EB backend validating tickets and performing the check-in
- **QR Code**: Data encoded on tickets
- **Ticket Code**: Unique identifier for each ticket
- **Pop-up** (= Bootstrap 5 `qrscanModal`): User interface displaying scan results
- **ProcessingLock / ScanDedup**: FR-8/FR-11 guards defined authoritatively in `data-model.md` (no scanning while processing; rescan dedup window)
- **Language String**: A named key (e.g. `MOD_EVENT_QRSCAN_START`) with an English source text and a Dutch translated text; `%s` placeholders preserved across languages
- **Language File**: Per-language ini pair (`nl-NL.mod_event_qrscan.ini` for site strings, `nl-NL.mod_event_qrscan.sys.ini` for installation labels), mirroring the en-GB key set (20 keys)

### Dutch translations (acceptance data for FR-13)

| Key suffix | Dutch (nl-NL) |
|---|---|
| AIM_INSTRUCTION | Houd de ticketcode binnen het vierkant |
| START | Start |
| STOP | Stop |
| SWITCH_CAMERA | Wissel van camera |
| RESULT | Scanresultaat |
| CLOSE | Sluiten |
| ERROR_NO_CAMERA | Geen camera beschikbaar. |
| ERROR_CAMERA_BUSY | Camera is in gebruik door een andere applicatie. |
| ERROR_OFFLINE | Geen netwerk, check-in service niet beschikbaar |
| ERROR_INVALID_QR | Dit lijkt geen ticket-QR-code te zijn |
| ERROR_BAD_KEY | Ongeldige ticketcode |
| ERROR_EB_ABSENT | Fout bij communicatie met check-in service, foutcode is %s |
| ERROR_UNKNOWN | Er is een fout opgetreden |
| ERROR_CHECKIN_CONFIG | Events Booking is vereist voor deze module |
| XML_DESCRIPTION | QR-scanmodule voor ticketcontrole bij evenementen |
| CHECKIN_INTERVAL | Check-in-interval |
| TICKET_MAX_LENGTH | Maximale ticketlengte |
| TEXT_SUCCESS_CLASS | Tekstklasse voor succesmelding |
| TEXT_WARNING_CLASS | Tekstklasse voor waarschuwingsmelding |
| ~~LAYOUT~~ | ~~Lay-out~~ — key retired with `layout` param removal (2026-09-20) |

## Assumptions

1. Internet connection is available at the event entrance
2. QR codes are properly formatted and readable
3. Camera devices are properly calibrated and functional
4. Check-in module is accessible and operational
5. Network latency is within acceptable limits
6. User has basic computer literacy
7. Standard Joomla language fallback applies: missing nl-NL keys fall back to en-GB text without extra module code; Joomla language tag `nl-NL` is used for file names
8. Dutch translations above are accepted as-is; native-speaker review is out of scope

## Clarifications

### Session 2026-09-20

- Q: What should happen to the layout parameter that currently has no alternative layout? → A: Remove entirely — the `layout` module param (manifest list with only `default`, `ModuleHelper::getLayoutPath()` call, `contracts/module-params.md` row, and `MOD_EVENT_QRSCAN_LAYOUT` label) has no function since only `tmpl/default.php` exists; remove it from manifest/PHP/contracts/language keys and hardcode the default layout.
- Q: What default value and allowed range should the new administrator-configurable scan-speed setting use? → A: C — Default 2 (spec default changed from 1 to 2 to match current code, no conflicting requirements), range 1–10, out-of-range values fall back to default.
- Q: What type of administrator input should the new scan-speed setting use in the module settings form? → A: B — Integer field with min 1, max 10, default 2.
- Q: Which part of the version number should the release script automatically increase? → A: C — Bump part comes from a script argument, defaulting to patch (release tooling, `deploy.sh`).
- Q: How should the release script find the latest deployed version on GitHub? → A: A — Latest published release tag via gh (release tooling, `deploy.sh`).
- Q: What exactly should go into the release text built from the commits since the previous version? → A: A — One bullet per commit subject line since the previous tag (release tooling, `deploy.sh`).

### Session 2026-09-13

- Q: How is JS minification handled? → A: Minification is done by `build.py` using `uglify-js` (`uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js`). `build.yml` also installs `uglify-js` for CI consistency.

### Session 2026-09-16

- Q: What should the camera-in-use message say? → A: B — "Camera is in use by another application." (inform only, no retry guidance)

### Session 2026-09-18

- Q: What does FR-6 'no module CSS' mean? → A: No external CSS file; JS-set inline styles are allowed.
- Q: Does the rule also forbid an embedded `<style>` block in the template? → A: B — No, embedded `<style>` in `tmpl/default.php` is allowed; only separate `.css` files are banned.

## Notes

- Mobile phone camera (default: Back camera)
- Handle technical errors only, apart from simple check on QR code contents (Alphanumeric only, limited length). Functional validation is done by the Reservation Module, which returns either a successful check-in or an error message to the Check-in Module; this module displays that message.
- No additional security measures needed in this module: secure transmission is provided by the site's HTTPS, and calls to the Check-in Module require a logged-in user.
