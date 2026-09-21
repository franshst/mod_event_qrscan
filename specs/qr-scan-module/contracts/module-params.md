# Contract: Module Params (`mod_event_qrscan`)

Declared in `mod_event_qrscan.xml`, read via `$params->get(...)`,
injected via `$doc->addScriptOptions()`.

Check-in URL, api key, and sound URLs are EB-sourced (see `research.md` R7) —
there are no module params for them. The api key comes from EB
`getConfig()->checkin_api_key` (confirmed present); the module constructs the
full URL via `Route::_()`. A missing api key is an error condition.

| Param | Required | Default | Notes |
|---|---|---|---|
| `checkin_interval` | no | `2000` | Dedup TTL ms (`sessionStorage`). 2 s suffices now that the FR8 lock prevents scan-during-processing (old 15 s only masked double check-ins). Keep short: group tickets require rescan of the same QR (once per attendant) shortly after dismiss. |
| `ticket_max_length` | no | `32` | Max ticket code chars (alphanumeric pre-validation). |
| `text_success_class` | no | `text-success` | Bootstrap 5 text utility class for success body (no module CSS). |
| `text_warning_class` | no | `text-danger` | Bootstrap 5 text utility class for warning/error body (no module CSS). |
| `scan_fps` | no | `2` | Scan attempts per second (`fps` in `start()` efficiency config). Number 1–10; out-of-range falls back to 2. |

JS option keys: `checkinUrl`, `checkInInterval`, `ticketMaxLength`,
`successAudioUrl`, `failAudioUrl`, `textSuccessClass`, `textWarningClass`,
`scanFps`
(Check-in URL constructed server-side from EB `getConfig()`; sound URLs are EB shipped files referenced in place.)
Plus the 6 i18n message keys wired via `addScriptOptions` (FR-14/R13, English values are `Joomla.getOptions` fallbacks only):
`MOD_EVENT_QRSCAN_ERROR_NO_CAMERA`, `MOD_EVENT_QRSCAN_ERROR_CAMERA_BUSY`,
`MOD_EVENT_QRSCAN_ERROR_OFFLINE`, `MOD_EVENT_QRSCAN_ERROR_INVALID_QR`,
`MOD_EVENT_QRSCAN_ERROR_EB_ABSENT`,
`MOD_EVENT_QRSCAN_ERROR_UNKNOWN` (one per JS `getErrorMessage` case).
`MOD_EVENT_QRSCAN_ERROR_CHECKIN_CONFIG` is resolved PHP-side via `JText::_()` directly (missing-EB error, no scanner), not via script options.
