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
| `layout` | no | `default` | `tmpl/` layout. |

JS option keys: `checkinUrl`, `checkInInterval`, `ticketMaxLength`,
`successAudioUrl`, `failAudioUrl`, `textSuccessClass`, `textWarningClass`
(Check-in URL constructed server-side from EB `getConfig()`; sound URLs are EB shipped files referenced in place.)
