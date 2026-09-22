# Contract: Language Files (`mod_event_qrscan`)

## File layout

```text
language/
├── en-GB/
│   ├── index.html
│   ├── en-GB.mod_event_qrscan.ini
│   └── en-GB.mod_event_qrscan.sys.ini
└── nl-NL/
    ├── index.html
    ├── nl-NL.mod_event_qrscan.ini
    └── nl-NL.mod_event_qrscan.sys.ini
```

## Rules

1. **Key parity**: nl-NL site ini MUST define exactly the 20 keys listed in `data-model.md` — no missing keys, no extras. Verified by comparing parsed key sets (quotes/escapes per Joomla ini format).
2. **Tag convention**: Joomla canonical tags (`en-GB`, `nl-NL`) for directory and file names.
3. **Placeholders**: any `%s` in an en-GB value MUST appear identically in the nl-NL value (count and form).
4. **Encoding**: UTF-8, Joomla ini quoting (`KEY="value"`, `""`-escaped quotes if ever needed).
5. **Installation**: no manifest change — `<folder>language</folder>` installs all subfolders; `build.py` zips `language/` wholesale.
6. **JS consumption**: JS-displayed messages travel via `addScriptOptions` (PHP `JText::_()` resolution) under their module key names; `Joomla.getOptions(key, englishFallback)` at read time. English literals in JS are fallbacks only, never the displayed source when keys resolve.
7. **Fallback**: a key absent from nl-NL resolves to en-GB via Joomla core; raw keys or blanks MUST never display (SC-9 probe).
