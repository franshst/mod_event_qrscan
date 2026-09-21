# Implementation Plan: QR Scan Module (`mod_event_qrscan`)

## 1. Goal

Provide a Joomla 5 site module for event volunteers to scan ticket QR codes,
send the ticket code to the Events Booking check-in endpoint, and show a single
result popup. This plan documents the Technical Stack and the design artifacts.

## 2. User Decisions Incorporated

- Module name: `mod_event_qrscan`.
- Modal: Joomla 5 built-in Bootstrap 5 (`renderModal` + `bootstrap.Modal`). `tingle.modal` DROPPED.
- `&t=Date.now()` is a GET cache-buster only, no server semantics.
- `Joomla.getOptions('checkinUrl')` from Events Booking scope is NOT reliable on
  its own; the module bootstraps EB server-side and reads
  `getConfig()->checkin_api_key`, constructing the full URL itself (see R7).
   No URL/key/sound module params — five genuine module params only
   (`checkin_interval`, `ticket_max_length`, `scan_fps` (default 2, range 1–10),
   two Bootstrap 5 text-utility classes
   (`text_success_class` default `text-success`, `text_warning_class` default
   `text-danger`, no module CSS); single `tmpl/default.php` layout, no `layout` param).
- Testing: manual Joomla install + sample QR scan; automate everything else
  (lint, ZIP completeness, hashes).

## 3. Technical Context

- Type: Joomla 5 Site Module `mod_event_qrscan`, layout modeled on
  https://github.com/franshst/Event-summary (`mod_eventsummary.php`, `tmpl/`,
  `Helper/`, `language/`, `js/`, `update/`, `build.py`).
- Languages: PHP >= 8.1 (Joomla 5 minimum), JavaScript ES6 `'use strict'`,
  Python 3.x (build tooling only).
- Release: `mod_event_qrscan.zip` (installable) + `event_qrscan_update.xml`
  (Joomla Update System). ZIP created by `python build.py <semver>`.

### 3.1 Frontend

- `@taluks/html5-qrcode` 2.3.9, low-level `Html5Qrcode` class (`new Html5Qrcode("reader")` +
  `getCameras()` / `start()` / `stop()`) with custom Start/Stop + "Switch camera"
  buttons in `tmpl/default.php`. The `Html5QrcodeScanner` end-to-end widget is
  NOT used (no back-camera default, always a dropdown — see `research.md` R10).
  It is the scanner engine (not the raw native `BarcodeDetector`, which fails
  the Chrome + Firefox + Safari-mobile requirement — see `research.md` R9).
  Source: `@taluks/html5-qrcode` fork (GitHub: `taluks/html5-qrcode`), version 2.3.9.
- Efficiency config (see R11): constructor
  `{ formatsToSupport: [QR_CODE] }`; start `{ fps: scan_fps (default 2, range
  1–10), qrbox: 250×250, disableFlip: true }`; native detector left at default-on.
- Camera default: `{ facingMode: { exact: "environment" } }` (back camera, zero
  user choice); fallback: `getCameras()` label match → first device; persist
  chosen `deviceId` in `localStorage`. Cycling via `stop()` + `start()` next
  device (wrap-around).
- Modal: Bootstrap 5 via Joomla core (`HTMLHelper::_('bootstrap.modal')` /
  `Bootstrap::renderModal` in `tmpl/default.php`, `new bootstrap.Modal(...)` /
   `.show()` in JS). Fallback: if `bootstrap.Modal` is unavailable, render result
   text in an inline div instead (FR-7 error path; single visible surface at a time).
- Joomla Core JS: `Joomla.request`, `Joomla.getOptions`.
- Dedup: `sessionStorage[decodedText] = timestamp`; skip rescan if
  `now - stored < checkInInterval` (default 2000 ms — the old 15 s only
  compensated for scanning-during-popup, impossible now per FR8 lock).
- FR8 mechanism: software `isProcessing` flag (ignore callbacks while true) +
  guarded `pause(true)` / `resume()` via `getState()`; flag-only fallback if
  `pause()` throws (see `research.md` R9).

### 3.2 Check-in URL + sounds (EB-sourced, URL constructed by module)

- `mod_event_qrscan.php` bootstraps Events Booking
  (`require_once JPATH_ADMINISTRATOR . '/components/com_eventbooking/libraries/rad/bootstrap.php'`,
  guarded: file/class/method existence + try/catch) and reads
  `EventbookingHelper::getConfig()->checkin_api_key` (CONFIRMED to exist —
  live dump showed length 10, matching the sample key).
- No check-in URL in EB config → the module builds it:
  `Route::_('index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=' . $key)`
  and injects the full URL as `checkinUrl` (shape the reference JS consumes).
- Empty/missing api key (or missing EB) = error condition: human-readable
  message, no scanner.
- Sound URLs: reference EB's shipped files
  `media/com_eventbooking/audios/success.mp3` + `fail.mp3` in place (NOT copied
  into our ZIP — paid-extension media, license + drift reasons, see R7).
  Guard `Audio` errors → silent fallback, result still shown.
- JS builds per scan:
  `${checkinUrl}&value=${encodeURIComponent(ticket)}&t=${Date.now()}`
  (`&t` = cache-buster only).
- Sample:
  `...&task=scan.qr_code_checkin&api_key=BA123kassa&value=Z8GiIIIKzOKwbvO6&t=1789149638905`
- Resolved values are injected via `$doc->addScriptOptions()`.
- HTTPS is provided by the site (required); login is required for every request,
  so the module itself adds no additional security measures.

### 3.3 Backend (PHP)

- Entry `mod_event_qrscan.php`: `defined('_JEXEC') or die`, EB bootstrap +
  `getConfig()` (guarded; error message + stop if check-in URL unavailable),
  read `$params->get('checkin_interval', 2000)`,
  `->get('ticket_max_length', 32)`, `->get('scan_fps', 2)` (clamped 1–10,
  fallback 2), `addScriptOptions` +
  `ModuleHelper::getLayoutPath('mod_event_qrscan', 'default')`.
   Requires com_eventbooking installed (friendly message otherwise).
- `Helper/` removed per T056 (was optional, zero callers; all params read inline in the entry).
  No new DB tables. Auth: logged-in user.
- Validation: alphanumeric + limited length client-side; functional errors as
  JSON `{success, message}` from check-in module.

### 3.4 File structure

```text
mod_event_qrscan.php
mod_event_qrscan.xml            # BUILT artifact: stamped from update/mod_event_qrscan.xml by build.py (do not edit directly)
tmpl/default.php                # div#reader + Start/Stop + Switch-camera + renderModal(qrscanModal)
language/en-GB/mod_event_qrscan.ini
language/en-GB/mod_event_qrscan.sys.ini
language/nl-NL/nl-NL.mod_event_qrscan.ini
language/nl-NL/nl-NL.mod_event_qrscan.sys.ini
language/nl-NL/index.html
js/site-checkin-default.js
js/site-checkin-default.min.js  # via uglifyjs
js/html5-qrcode.min.js          # vendored @taluks/html5-qrcode 2.3.9, cloned directly into Joomla media dir; pinned (no CDN); version+sha256 recorded in README
js/zxing_reader.wasm            # required by vendored @taluks/html5-qrcode decoder (media dir per T7a/T022; covered by ZIP js/ gate)
js/index.html                   # directory-listing guard for vendored decoder dir (media dir per T022)
update/mod_event_qrscan.xml     # SOURCE install manifest (with <version>{VERSION} placeholder)
update/event_qrscan_update.xml  # template with {VERSION}
build.py                        # python build.py <version>
.github/workflows/build.yml  # CI: runs `python build.py <semver>` on push (same fail-fast gates)
LICENSE, README.md
```

Manifest convention: source = `update/mod_event_qrscan.xml`, built = root `mod_event_qrscan.xml`; update template = `update/event_qrscan_update.xml` → built root `event_qrscan_update.xml`. See `contracts/build.md`.
FR8 lock + dedup authoritative definition: `data-model.md` (`ProcessingLock`, `ScanDedup`); this plan summarizes only.
i18n additions (merged from `001-dutch`, FR-12…FR-16): `language/nl-NL/nl-NL.mod_event_qrscan.ini` (20 keys) + `nl-NL.mod_event_qrscan.sys.ini` + `index.html`; JS messages via `addScriptOptions`/`Joomla.getOptions` (R13); no manifest change (`<folder>language</folder>` covers nl-NL); en-GB fallback for missing keys.

### 3.5 Build (`build.py <semver>`, port of Event-summary `build.py`)
1. `minify_js()`: delete stale `*.min.js` EXCLUDING `js/html5-qrcode.min.js`, `uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js`. The vendored `js/html5-qrcode.min.js` is never touched — it is cloned pre-minified and included as-is.
2. Lint gate (fail-fast, non-zero exit): `php -l`, `node --check`,
   `ET.parse` all XMLs, manifest required fields
   (`name`, `version == arg`, `namespace`, `checkin_interval`,
   `ticket_max_length`).
3. `copy_and_update_mod_xml()`: copy manifest source, stamp `<version>`.
4. `create_zip()`: temp dir + copy `tmpl/, language/, js/` +
   `LICENSE` + manifest + `*.php` → `shutil.make_archive`.
5. ZIP completeness gate: assert required entries present, no temp dirs,
   no template leakage.
6. `prepare_update_xml()`: `{VERSION}` substitution.
7. `update_checksum()`: `sha256` of ZIP → `<update><sha256>` (authoritative for
   Joomla updater). MD5 computed/printed informational only.
8. Version consistency: CLI arg (semver `X.Y.Z`) == manifest `<version>` ==
   update XML version.
9. CI (`build.yml`): run `python build.py <semver>` on push with identical
   gates; red build blocks release.

## 4. Constitution Check

Source: `.specify/memory/constitution.md`.

- User-Friendly Interface (sensible defaults, readable errors): PASS.
- Support-Friendly Installation (standard ZIP + update XML, semver): PASS.
  EB-sourced endpoint/key/sounds (no per-module duplication) improve
  supportability — one place to configure.
- Gate: PASS, no violations.

## 5. Phase 0: Research → `research.md`

See `research.md` (Decision / Rationale / Alternatives per item).

## 6. Phase 1: Design → `data-model.md`, `contracts/`, `quickstart.md`

- `data-model.md`: entities, validation, state transitions.
- `contracts/checkin-api.md`, `module-params.md`, `update-xml.md`, `build.md`, `language-files.md`.
- `quickstart.md`: automatable gates + manual Joomla/scan checklist.

## 7. Post-design Constitution Re-check

PASS — manual standard-install testing satisfies support-friendly requirement;
automated gates add no volunteer burden.

## 8. Out of Scope

EB backend changes, auth system, native apps, multi-modals, analytics,
availability/uptime of the underlying platform.
EB-backend check-in messages stay untranslated (R17).
Dutch translations accepted as-is; native-speaker review out of scope.

## 9. Dutch translation support (merged from `001-dutch-translation-support`)

Every user-visible string resolves through Joomla's language system (built-in text or module ini keys); complete nl-NL translation ships with the module (20 keys, `%s` preserved). Approach: keep the existing `JText`/`addScriptOptions` pattern — pass the hardcoded JavaScript messages as script options from `mod_event_qrscan.php`, add `language/nl-NL/` ini + sys.ini mirroring en-GB, rely on Joomla's automatic en-GB fallback. No manifest change, no new dependencies.
Minification reaffirmed (C1): `uglifyjs` runs inside `build.py`; `tasks.md` T021 is superseded.
Future improvement (noted): manual `build.py` + hand-installed ZIP + manual language passes as user-testing method is unsatisfactory — consider automated install/smoke checks.
