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
4. Scan sample QR → Bootstrap modal, correct style + EB success sound.
    See `contracts/checkin-api.md`, `data-model.md`.
5. Negatives: no camera; camera in use; offline; invalid QR (non-alphanumeric/overlong); bad key; EB component disabled; unknown — expected messages: no camera → "No camera available."; camera in use → "Camera is in use by another application."; offline → "No network, check-in service unavailable"; invalid QR → "This seems not to be a ticket QR code"; bad key → check-in module's own message; EB absent → "Error while communicating with check-in service, error code is %s"; unknown → "An error occurred". Each gives clear text, no `alert()`, EB fail sound where applicable.
    FR8 lock: present a second QR while the result modal is still open → no second request may appear in devtools Network (single request only).
6. Dedup: rescan same code < 2 s → suppressed; after → sent
   (devtools Network shows fresh `&t=`).
7. Update: `python build.py 1.0.1` → point updater at new XML → updater finds it.

Record: date, Joomla/PHP/browser, pass/fail per step, notes.

## C. Dutch translation validation (merged from `001-dutch`, FR-12…FR-16 / SC-7…SC-10)

Prereqs: Dutch (nl-NL) language pack installed on the test site.

### C1. Automated i18n gates

```bash
php -l mod_event_qrscan.php && php -l Helper/EventQrscanHelper.php
node --check js/site-checkin-default.js
python build.py <semver>   # must exit 0; ZIP contains language/nl-NL/
```

Key-parity probe (en-GB ↔ nl-NL same key set, `%s` preserved):

```bash
python3 -c "
import re
def keys(p):
    d = {}
    for line in open(p, encoding='utf-8'):
        m = re.match(r'([A-Z0-9_]+)=\"(.*)\"$', line.strip())
        if m: d[m.group(1)] = m.group(2)
    return d
en = keys('language/en-GB/en-GB.mod_event_qrscan.ini')
nl = keys('language/nl-NL/nl-NL.mod_event_qrscan.ini')
assert set(en) == set(nl), ('key mismatch', set(en) ^ set(nl))
assert all(v.count('%s') == nl[k].count('%s') for k, v in en.items())
print('parity OK:', len(en), 'keys')
"
```

Hardcoded-literal probe: searching `tmpl/default.php`, `mod_event_qrscan.php`, and `js/site-checkin-default.js` for user-visible English literals outside language-key references and code fallbacks must return nothing unexpected (SC-8).

### C2. Dutch UI pass (SC-7, SC-10)

1. Set site language to Nederlands, load the scanner page.
2. Expect Dutch: aim instruction ("Houd de ticketcode binnen het vierkant"), Start, "Wissel van camera".
3. Start, scan a ticket: expect "Scanresultaat" title, Dutch message, "Sluiten" button.
4. Trigger negatives (no camera / offline / invalid QR): expect the Dutch error texts from the spec table.

### C3. Fallback probe (SC-9)

1. Temporarily delete one key from the installed nl-NL ini (restore afterwards).
2. Trigger that message: expect the English text, never a raw key or blank.

### C4. English regression pass

1. Switch site language back to English: expect all original English strings, byte-identical behavior to before (scan, modal position, sounds, dedup).
