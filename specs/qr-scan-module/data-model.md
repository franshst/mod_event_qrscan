# Data Model: QR Scan Module (`mod_event_qrscan`)

No server-side tables. All entities are client-side / transient.

## Entities

### User (volunteer)

- Fields: none (login is enforced externally by Joomla ACL + EB endpoint, never checked by module code).
- Rules: must be logged in to reach the scanner and the check-in endpoint.

### Camera

- Fields: `deviceId: string`, `label: string`
- Rules: back camera selected by default (`facingMode exact environment` →
  label match → first device; persisted in `localStorage`); "Switch camera"
  cycles via `stop()` + `start()`; human-readable "no camera" message if none.

### QrCode (scanned)

- Fields: `decodedText: string` (`decodedResult` from the callback is received but ignored)
- Validation: `decodedText` alphanumeric only, length 1..32 by default
  (configurable max); reject otherwise with friendly message, no network call.

### TicketCode

- Fields: `value: string` (derived from `QrCode.decodedText` after validation)
- Rules: URL-encoded via `encodeURIComponent` before send.

### CheckinRequest

- Fields: `checkinUrl: string (from EB getConfig, server-side)`, `value: string`, `t: int (Date.now())`
- Rules: missing/empty `checkinUrl` is an error (no fallback, no request);
  `t` cache-buster only.

### CheckinResponse

- Fields: `success: bool`, `message: string`
- Rules: `message` rendered text-escaped into modal body (XSS guard).

### ResultModal (Bootstrap 5, single instance `qrscanModal`)

Note: `ResultModal` is the same entity as the `Pop-up` defined in spec.md — a single Bootstrap 5 modal instance.

- Fields: `state: idle | success | warning | error`, `bodyText: string`
- Rules: one modal only; Close via `data-bs-dismiss`; `error` state for
  network/no-camera/invalid-QR/missing-config.
- Audio rule: `success` → EB success sound; any other outcome
  (`warning`/`error`, incl. validation and network failures) → EB fail sound
  (both hardcoded server-side to EB shipped files
  `media/com_eventbooking/audios/success.mp3` + `fail.mp3`, not from EB `getConfig()`).

### ProcessingLock (FR8 mechanism, see research R9)

- Fields: `isProcessing: bool (default false)`
- Rules: `onScanSuccess` returns immediately while `isProcessing===true`;
  otherwise sets it `true`, pauses the decoder
  (`if (getState()===SCANNING) pause(true)`, guarded try/catch), and clears it
  + resumes (`if (getState()===PAUSED) resume()`) when the result modal is
  dismissed. Flag-only fallback applies if `pause()` throws.

### ScanDedup

- Fields: `entries: map<string, int>` (`sessionStorage`), `ttlMs: int = checkInInterval (2000)`
- Rules: per ticket value only — skip send if `now - entries[value] < ttlMs`; else update timestamp and send. A different ticket code always sends immediately, even within the TTL.
  Covers only accidental immediate re-scan after modal dismiss; in-processing
  duplicates are already blocked by `ProcessingLock`. Group tickets: the same QR
  code must be scannable repeatedly (once per attendant), so the TTL stays short
   (2 s default) — intentional rescan after dismiss must send.

## Relationships

- `User` uses `Camera` to capture `QrCode` → `TicketCode` → `CheckinRequest` →
  `CheckinResponse` → `ResultModal`. `ProcessingLock` + `ScanDedup` guard `CheckinRequest` creation.

## State transitions

```text
idle → scanning → processing → modal → scanning
                 ↘ (validation/dedup fail) → scanning (with modal for user-visible errors)
```

- No scanning while `processing` (spec FR8).
