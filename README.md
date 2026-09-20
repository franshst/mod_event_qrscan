# mod_event_qrscan

## What the module does

`mod_event_qrscan` is a Joomla 5 site module that enables event volunteers to scan ticket QR codes at entrance checkpoints. The volunteer selects the module from the event organizer's website, points their phone camera at a ticket, and the module reads the QR code, validates it, and sends the ticket code to the Events Booking check-in service. A result popup then appears showing whether the check-in succeeded or failed, along with an audible cue (success or failure sound played from Events Booking's media files).

The module is built on the `@taluks/html5-qrcode` library (v2.3.9) for cross-browser QR scanning and integrates with the Events Booking (`com_eventbooking`) component via its `scan.qr_code_checkin` endpoint.

## User guide

### How it works

1. **Select the module** from the event organizer's website. A blank screen with a camera preview area appears.
2. **Hold the ticket inside the square** — the on-screen instruction tells you to position the QR code within the scanning frame.
3. **Start scanning** — tap the **Start** button to begin scanning. The camera activates and the module listens for QR codes.
4. **Stop scanning** — tap the **Stop** button (the button label toggles between Start and Stop) to pause the scanner.
5. **Switch camera** — if multiple cameras are available (e.g., front and rear on a phone), tap **Switch camera** to cycle through them. The previously selected camera is remembered via `localStorage`.
6. **View result** — after scanning a valid QR code, a Bootstrap 5 modal appears showing the check-in result. **Close** the modal to return to scanning.

### Buttons

| Button | Action |
|---|---|
| **Start / Stop** | Toggles the QR scanner on and off. Starts the `Html5Qrcode` decoder with configurable `fps` (default 2, range 1–10), `qrbox: 250×250`, `formatsToSupport: [QR_CODE]`. |
| **Switch camera** | Cycles through available cameras. Default is the rear (`environment`) camera. The chosen `deviceId` is persisted in `localStorage` and reused on subsequent sessions. |
| **Close** | Dismisses the result modal. Resumes scanning and enforces dedup: the same ticket code cannot be re-scanned within the check-in interval (default 2000 ms). |

### Error messages

- **No camera available** — the device has no camera
- **No network, check-in service unavailable** — the device is offline
- **This seems not to be a ticket QR code** — the scanned content is not alphanumeric or exceeds the max length
- **Error while communicating with check-in service, error code is %s** — Events Booking is not installed or the API key is missing

All error messages are displayed in the modal or inline fallback — never via `alert()`.

## Administrator guide

### Installation

1. Install **Events Booking** (`com_eventbooking`) on your Joomla 5 site. The module depends on it — without it, the module displays an error message and no scanner is available.
2. Upload the `mod_event_qrscan.zip` via **Extensions → Install → Upload Package** in the Joomla administrator panel.
3. Place the module: go to **Extensions → Modules**, find `mod_event_qrscan`, and assign it to a menu position on the desired page.

### Module parameters

| Parameter | Default | Description |
|---|---|---|
| **Check-in Interval** | `2000` | Minimum time in milliseconds between successive check-in requests for the same ticket code. Prevents duplicate submissions. Default is 2000 ms (2 seconds). |
| **Ticket Max Length** | `32` | Maximum allowed length of the ticket code (alphanumeric only). QR codes exceeding this length are rejected client-side before any network request is made. |
| **Success Text Class** | `text-success` | Bootstrap 5 text utility class applied to the modal body when the check-in succeeds. Common values: `text-success` (green), `text-primary` (blue). |
| **Warning Text Class** | `text-danger` | Bootstrap 5 text utility class applied to the modal body when the check-in fails or an error occurs. Common values: `text-danger` (red), `text-warning` (yellow). |
| **Scan FPS** | `2` | Scan attempts per second. Integer 1–10; out-of-range values fall back to 2. |

### Endpoints and sounds

The module constructs the check-in URL automatically using the Events Booking API key (`checkin_api_key` from `com_eventbooking` configuration):

```
index.php?option=com_eventbooking&task=scan.qr_code_checkin&api_key=...
```

Audio feedback uses Events Booking's shipped sound files (`media/com_eventbooking/audios/success.mp3` and `fail.mp3`). These are **not** bundled in the module — they are served by the Events Booking component.

### Update system

The Joomla Update System is configured via `event_qrscan_update.xml`. When a new version is released, the update XML (with the correct version number, download URL, and SHA256 checksum) enables automatic updates through Joomla's extension manager.

## Maintainer guide

### Prerequisites

- Python 3.x
- Node.js (for `node --check` lint)
- PHP 8.1+ (for `php -l` lint)
- `uglify-js` (`npm install -g uglify-js`)
- The vendored library `js/html5-qrcode.min.js` must already exist in the repo (cloned from `@taluks/html5-qrcode` v2.3.9)

1. **Verify prerequisites** — ensure all lint gates pass:
   ```bash
   php -l mod_event_qrscan.php
   php -l Helper/EventQrscanHelper.php
   node --check js/site-checkin-default.js
   ```

2. **Build the release** — run `build.py` with the new semver version:
   ```bash
   python build.py 1.0.4
   ```
   This performs: vendored-lib gate check, lint (`php -l`, `node --check`), XML parsing, manifest stamping, ZIP creation (excluding `js/html5-qrcode.min.js` from minification), completeness assertion, update XML generation with `{VERSION}` substitution, and SHA256 checksum computation.

3. **Create a GitHub release** — upload the artifacts using the `gh` CLI:
   ```bash
   gh release create 1.0.4 \
     mod_event_qrscan_1.0.4.zip \
     event_qrscan_update.xml \
     --title "Release 1.0.4" \
     --notes "Bug fixes and improvements."
   ```

4. **Verify** — confirm the release page shows both `mod_event_qrscan_1.0.4.zip` and `event_qrscan_update.xml`, and that the SHA256 checksum in the update XML matches the uploaded ZIP.

### CI

A GitHub Actions workflow (`.github/workflows/build.yml`) runs `python build.py 1.0.0` on every push to `main`. To customize the version, edit the workflow file or run the build locally and push the artifacts.
