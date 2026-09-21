# Contract: Build (`build.py`)

## Invocation

```sh
python build.py 1.0.0
```

Arg must match semver `X.Y.Z`, else fail.

## Steps (fail-fast, non-zero exit on error)

1. Lint: `php -l` (entry), `node --check js/site-checkin-default.js` (NOT vendored `js/html5-qrcode.min.js`), `uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js`, `ET.parse` all XMLs, manifest required-field check.
    Vendored-lib gate (step 1b) runs BEFORE minify step; vendored `js/html5-qrcode.min.js` is never touched by `delete stale *.min.js` or `uglifyjs`.
    NOTE (C1, merged from `001-dutch`): the `uglifyjs` minify step runs inside `build.py` (reaffirmed). `tasks.md` T021 ("no minify step, workflow-only") is superseded; no standalone uglify task is kept — verification is via the `build.py` run.
1b. Vendored-lib gate: `js/html5-qrcode.min.js` exists, version string `2.3.9`, no CDN refs, from `@taluks/html5-qrcode`.
2. Stamp manifest `<version>`: source `update/mod_event_qrscan.xml` → built root `mod_event_qrscan.xml`.
3. `shutil.make_archive("mod_event_qrscan", "zip", tmp)` from
    `tmpl/, language/, js/` (incl. vendored `js/html5-qrcode.min.js` + `language/nl-NL/` per `contracts/language-files.md` rule 5) + `LICENSE` + manifest + `*.php`.
4. ZIP completeness assert (required entries present incl. `js/html5-qrcode.min.js` + `language/nl-NL/` files, no temp/template leak).
5. Substitute `{VERSION}` → `event_qrscan_update.xml`.
6. `sha256(zip)` → `<sha256>`; print `sha256` (+ md5 informational).

## Outputs

- `mod_event_qrscan.zip`
- `event_qrscan_update.xml`

Exit 0 + printed paths/hashes = pass. Suitable for `.github/workflows` on push.
