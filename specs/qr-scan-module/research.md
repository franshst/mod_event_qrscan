# Research: QR Scan Module (`mod_event_qrscan`)

Format: Decision / Rationale / Alternatives.

## R1. Joomla 5 module manifest + Helper conventions

- Decision: Site module `mod_event_qrscan`, `mod_event_qrscan.php` entry with
  `defined('_JEXEC') or die`, `ModuleHelper::getLayoutPath('mod_event_qrscan', ...)`,
  namespaced `Helper/EventQrscanHelper.php`, manifest `mod_event_qrscan.xml`.
  Structure mirrors `mod_eventsummary.php` from Event-summary sample.
- Rationale: Standard Joomla 5 convention; support-friendly install; sample proven.
- Alternatives: Component/plugin — rejected (module is correct granularity for
  placeable scanner widget).

## R2. PHP 8.1 + Joomla JS (`Joomla.request` / `getOptions`)

- Decision: Require PHP >= 8.1; use `Joomla.request` GET + `Joomla.getOptions`
  fed by module's own `addScriptOptions`.
- Rationale: Joomla 5 baseline; avoids custom fetch wrapper; params survive
  template overrides.
- Alternatives: Raw `fetch()` — rejected (loses Joomla token/CSRF handling consistency).

## R3. `@taluks/html5-qrcode` versioning / loading

- Decision: Vendor pinned `@taluks/html5-qrcode` **2.3.9** (actively maintained fork; original `mebjas/html5-qrcode` is no longer maintained) as `js/html5-qrcode.min.js`, using the low-level `Html5Qrcode` class API (per R9/R10 — not the `Html5QrcodeScanner` widget). Direct file inclusion — NOT npm: the `.js` file is placed in the Joomla media directory alongside the module (no node_modules or package.json needed). No CDN, no Web Asset Manager entry: a local file avoids event-door network flakiness and keeps the ZIP self-contained.
- Rationale: Only scanner lib needed; 2.3.9 provides `getCameras()` / `start(facingMode|deviceId)` / `stop()` / `pause()` / `resume()` / `getState()` used by R9/R10; vendoring matches the Event-summary `js/` pattern and the `build.py` minify/ZIP flow; the fork uses `zxing-wasm` decoder.
- Alternatives: CDN load / other scanner lib / Web Asset Manager CDN — rejected (offline risk, re-validation cost).

## R4. Modal: Bootstrap 5 instead of tingle

- Decision: `Bootstrap::renderModal(id=qrscanModal)` in `tmpl/default.php` +
  `bootstrap.Modal.show()` in JS. Drop `tingle.modal` CSS/JS.
- Rationale: Single popup only; zero extra dependency; a11y/RTL/theme free;
  user-confirmed 2026-09-11.
- Alternatives: tingle (extra weight), native `<dialog>` (custom styling burden) — rejected.
- Mapping: `setContent(html)` → `.modal-body innerHTML` (text-escaped, see R8),
  `open()` → `.show()`, footer btn → `data-bs-dismiss="modal"`.

## R5. Update-server XML schema

- Decision: `event_qrscan_update.xml` with
  `<updates><update><version><infourl><downloads><downloadurl><sha256>`,
  `{VERSION}` substituted by `build.py`, `sha256` of ZIP written back.
- Rationale: Joomla Update System contract; same as Event-summary.
- Alternatives: Manual XML edit per release — rejected (error-prone).

## R6. `build.py` flow

- Decision: Port Event-summary `build.py`: minify → stamp version → zip →
  substitute update XML → checksum. Add fail-fast lint/ZIP/version gates.
  Also verify vendored `js/html5-qrcode.min.js` from `@taluks/html5-qrcode` 2.3.9
  exists, has version string `2.3.9`, and contains no CDN refs.
- Rationale: Proven script; automation of lint + completeness + hashes.
- Alternatives: Legacy `release.py` (7z/`input()` pause) — rejected (not CI-friendly).

## R7. Endpoint + sound config: api key from EB config, URL constructed, sounds pending

- Decision: `mod_event_qrscan.php` bootstraps Events Booking and reads
  `EventbookingHelper::getConfig()`. CONFIRMED from the live `jml_eb_configs`
  dump (2026-09-11, `txt.out`): `checkin_api_key` EXISTS (length 10, matching
  the `BA123kassa` sample). No check-in URL and no sound keys exist in config —
  so the module constructs the URL itself via
  `Route::_('index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=' . $key)`
  and injects the full URL as `checkinUrl` (same shape the reference JS already
  consumes). If `checkin_api_key` is empty/absent → error condition, friendly
  message, no scanner. Sound URLs RESOLVED (see Alternatives).
- Rationale: single source of truth stays EB-side; no duplicated secrets.
  The reference JS's `checkinUrl`/`successAudioUrl`/`failAudioUrl` options were
  evidently set by EB's own check-in view at runtime (not global config) —
  our module replicates the URL part and reuses the same JS option names.
- Alternatives considered:
  - Module-owned URL/api-key params — rejected (duplication; key lives in EB).
  - Bundled/copied beep files — rejected. EB ships
    `media/com_eventbooking/audios/success.mp3` + `fail.mp3`; REFERENCE them in
    place instead of copying into our ZIP: EB is a paid extension, so
    redistributing its media raises license questions, and referencing tracks EB
    updates automatically. No new dependency (module already hard-requires EB).
    Guard `Audio` playback errors (renamed file in some EB version → silent,
    result still shown).
- Open verification: CLOSED. Remaining: none (key names for api key confirmed).

## R8. `site-checkin-default.js` gaps

- Decision: Escape `json.message` before `innerHTML` (XSS); replace
  `alert(error)` with friendly Bootstrap modal text; enforce alphanumeric +
  length check (default max 32) before send; `onScanFailure` stays no-op.
- Rationale: Spec Notes + constitution require human-readable, safe feedback.
- Alternatives: Keep as-is — rejected (XSS + `alert` violate usability).

## R9. Scanner engine: @taluks/html5-qrcode (not raw BarcodeDetector) + pause during processing

- Decision: Keep `@taluks/html5-qrcode` as the scanner engine; do NOT switch to the
  native `BarcodeDetector` API directly. Disable scanning during processing with
  a software `isProcessing` flag + `pause(true)` / `resume()` guarded by
  `getState()`, with flag-only fallback.
- Rationale:
  - Native `BarcodeDetector` is not Baseline: Firefox desktop unsupported,
    Safari/Safari-iOS disabled by default (caniuse/MDN 2026). Requirement is
    Chrome + Firefox + Safari on mobile — native-only fails Firefox and Safari.
    The `@taluks/html5-qrcode` fork bundles a JS fallback decoder (ZXing/wasm)
    and uses native detection only where available, so all three browsers work.
  - `Html5Qrcode` exposes `pause(shouldPauseVideo?)` / `resume()` /
    `getState()` (`SCANNING==2`, `PAUSED==3`) plus `stop()` teardown.
    `pause(true)` freezes the viewfinder; `pause()` without arg keeps video but
    stops decoding. Both throw when called in the wrong state, so every call
    must be guarded by `getState()`.
  - `pause()/resume()` has flaky reports (upstream #736), so the reliable core
    is a software flag: set `isProcessing=true` at the top of `onScanSuccess`
    (and ignore further callbacks while true), clear it when the result modal
    is dismissed. Camera keeps streaming but no duplicate check-in requests
    occur — FR8 satisfied functionally even if `pause()` throws.
- Alternatives considered:
  - Raw `BarcodeDetector` + `getUserMedia` loop — rejected (fails Firefox/Safari requirement).
  - `stop()`/`clear()` + full restart per scan — rejected as default (tears down
    the camera stream; slower resume, repeated permission UX). Keep as fallback
    if `pause()` proves unreliable on a device.
  - Camera-off only — rejected as sole mechanism (same restart cost).
- Implementation rule: on scan success → if `isProcessing` return; set
  `isProcessing=true`; `try { if (getState()===SCANNING) pause(true); } catch {}` ;
  send request; on modal dismiss → `isProcessing=false`; `try { if (getState()===PAUSED) resume(); } catch {}`.

## R10. Camera selection UX: low-level `Html5Qrcode` with custom buttons (not `Html5QrcodeScanner` UI)

- Decision: Build the scanner UI on the low-level `Html5Qrcode` class
  (`new Html5Qrcode("reader")` + `getCameras()` / `start()` / `stop()`), with two
  custom buttons: Start/Stop and "Switch camera" (cycle). Do NOT use the
  `Html5QrcodeScanner` end-to-end widget.
- Rationale:
  - `Html5QrcodeScanner` always renders a camera dropdown and offers no back-camera
    default (upstream: "possible in Html5Qrcode, but not in Html5QrcodeScanner yet").
    The dropdown confuses non-technical volunteers — matches reported experience.
  - `Html5Qrcode.start({ facingMode: { exact: "environment" } }, ...)` selects the
    back camera by default with zero user choice. Fallback chain: exact environment
    → `getCameras()` label match (back/rear/environment, case-insensitive) →
    first device. Persist the chosen `deviceId` in `localStorage` and reuse it next
    visit (equivalent of the Scanner widget's `rememberLastUsedCamera`).
  - Cycling: "Switch camera" button calls `await stop()` then `start()` with the
    next enumerated `deviceId` (wrap-around). One tap, no dropdown, no oral instructions.
  - `pause()`/`resume()`/`getState()` exist on `Html5Qrcode` too, so the R9 FR8
    lock mechanism is unchanged.
- Alternatives considered:
  - `Html5QrcodeScanner` + `rememberLastUsedCamera` — rejected as sole fix (helps
    returning users only; first-time users still face the dropdown, and no back default).
  - Raw `getUserMedia` + `BarcodeDetector` — already rejected in R9.

## R11. Scan efficiency: QR-only, no mirror, low fps (+ dedup interval cut to 2 s)

- Decision: `new Html5Qrcode("reader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] })`;
  start `{ fps: 1, qrbox: { width: 250, height: 250 }, disableFlip: true }`;
  leave native detector default-on (the `@taluks/html5-qrcode` fork uses
  `zxing-wasm` decoder with native detection where available).
  Dedup default cut from 15 s to 2 s (`checkin_interval=2000`).
- Rationale:
  - `formatsToSupport: [QR_CODE]` (constructor — not start config)
  skips all other barcode formats → fewer decode attempts per frame → less CPU/battery.
  - `disableFlip: true`: skips the mirrored-feed retry. Back-camera feeds are not mirrored.
  - The `@taluks/html5-qrcode` fork uses `zxing-wasm` as decoder (vs original `zxing-js`),
    hardware-accelerated where supported. Native `BarcodeDetector` is
    not Baseline: Firefox desktop unsupported, Safari/Safari-iOS disabled by default.
    `@taluks/html5-qrcode` uses its own fallback decoder, so all three browsers work.
  - `fps: 1` (as in the sample) + bounded `qrbox` minimize pixels decoded per second.
  - Interval cut: the 15 s existed only because scanning continued during the
    popup (double check-in → "ticket already used"). With the R9 FR8 lock that
    cannot happen; the dedup window now only covers accidental immediate
    re-scan of the same ticket after modal dismiss → 2 s default (still
    configurable via `checkin_interval`).
- Alternatives considered:
- Inverted-frame ("negatives") disable: the 2.3.9 source retries the inverted
   frame on failure "if not explicitly disabled" — TO-VERIFY during
   implementation whether a public flag exists in the vendored file; if none,
   accept the retry cost (it runs only after normal decode fails).
  - Higher `fps` for snappier UX — rejected (battery cost; 1 fps sufficed in sample).

## R12. Further scan-cost reductions (verified API only)

- Decision:
  1. `qrbox` doubles as decoder bound (official docs: "non shaded region would be
     used for QR code scanning") — keep the 250×250 target square, or a
     `QrDimensionFunction` capping at ~70% of the smaller viewfinder dimension
     so small phones never decode oversized areas. The square also guides
     aiming; add a one-line instruction ("Hold the ticket code inside the
     square") — faster first-decode means less total scanning per visitor.
  2. Do NOT use `videoConstraints` for a lower resolution: it is @beta
     ("not well supported yet") and overrides `cameraIdOrConfig`, which would
     break the R10 deviceId camera-cycling. Revisit only if field tests show
     CPU trouble on low-end devices.
  3. Suspend on hidden tab: `document.visibilitychange` → `pause()` when hidden,
     `resume()` when visible (guarded by `getState()`, same pattern as R9).
  4. No torch/flash support (drains battery; low-level API has no such UI anyway).
  5. Leave `aspectRatio` unset (whole viewfinder; wrong values break the feed).
- Rationale: every item is confirmed in 2.3.9 source/official API docs; nothing
   experimental except the explicitly rejected `videoConstraints`.
