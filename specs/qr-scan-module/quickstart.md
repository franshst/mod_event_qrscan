# Quickstart / Validation: `mod_event_qrscan`

## A. Automatable (run every build)

```sh
python build.py 1.0.0
# expect: exit 0, mod_event_qrscan.zip + event_qrscan_update.xml + sha256 (+md5) printed
```

Verifies: lint, XML well-formed, manifest fields, ZIP completeness,
version consistency, hashes. See `contracts/build.md`.

## B. Manual (local Joomla 5, one pass per release)

Prereqs: local Joomla 5 (PHP >= 8.1) with com_eventbooking installed,
browser with camera permission, printed/sample QR (e.g. `Z8GiIIIKzOKwbvO6`).

1. Install `mod_event_qrscan.zip` via Extension Manager; enable; place module.
2. Verify EB-resolved endpoint + sounds (no module config needed for these).
   See `contracts/module-params.md`.
3. Open frontend → allow camera → cycle cameras (default Back) → Start.
4. Scan sample QR → Bootstrap modal <1s, correct style + EB success sound — NOTE: scan timing <1s is out of scope of this first implementation as it depends on lighting/camera quality.
    See `contracts/checkin-api.md`, `data-model.md`.
5. Negatives: no camera; offline; invalid QR (non-alphanumeric/overlong); bad key; EB component disabled — expected messages: no camera → "No camera available."; offline → "No network, check-in service unavailable"; invalid QR → "This seems not to be a ticket QR code"; bad key → check-in module's own message; EB absent → "Error while communicating with check-in service, error code is %s". Each gives clear text, no `alert()`, EB fail sound where applicable.
    FR8 lock: present a second QR while the result modal is still open → no second request may appear in devtools Network (single request only).
6. Dedup: rescan same code < 2 s → suppressed; after → sent
   (devtools Network shows fresh `&t=`).
7. Update: `python build.py 1.0.1` → point updater at new XML → updater finds it.

Record: date, Joomla/PHP/browser, pass/fail per step, notes.
