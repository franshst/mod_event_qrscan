# Contract: Update XML

File: `event_qrscan_update.xml` (built from `update/event_qrscan_update.xml` template).

- Template placeholder: `{VERSION}` → release semver.
- Required nodes: `<updates><update>` with `<name>`, `<version>`,
  `<infourl>`, `<downloads><downloadurl>` (points to `mod_event_qrscan.zip`),
  `<sha256>` (hex of ZIP, written by `build.py`).
- Version consistency: update `<version>` == manifest `<version>` == CLI arg.
- MD5: informational only (printed); not part of Joomla update contract.
