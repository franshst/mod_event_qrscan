<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0 (MINOR: two new principles, one expanded)
- Modified: II. Support-Friendly Installation (Joomla range "5" → "5 and known future versions")
- Added: III. PHP API Currency, IV. JavaScript API Currency
- Removed: none
- TODOs: none
-->
# mod_event_qrscan Constitution

## Core Principles

### I. User-Friendly Interface
MUST: sensible defaults (back camera, 2s dedup), human-readable errors, no `alert()`, XSS-escaped output. Single Bootstrap 5 modal only.

### II. Support-Friendly Installation
MUST: standard Joomla ZIP + Update XML, semver `X.Y.Z`, `build.py` gates green (lint, XML, ZIP completeness, hashes). MUST support Joomla 5 and known future versions — no single-major pinning in code or updater targetplatform. EB-sourced endpoint/key/sounds — no per-module duplication. Manual Joomla install + scan checklist per release.

### III. PHP API Currency
MUST: no deprecated or removed Joomla CMS PHP constructs (e.g. `J*` class aliases such as `JFactory`/`JText`, removed `Factory::` static getters, `Document::addScript`/`addStyleSheet`). Use the namespaced, supported equivalents (`Joomla\CMS\Factory`, `Joomla\CMS\Language\Text`, `$app->getDocument()`, WebAssetManager). Rationale: forward-compatibility shims are off by default on fresh installs, so deprecated calls are latent fatals.

### IV. JavaScript API Currency
MUST: no deprecated Joomla JavaScript constructs. Use only supported core APIs (e.g. `Joomla.getOptions`/`Joomla.request`) and Bootstrap modal via Joomla core assets. Rationale: same forward-compatibility guarantee as Principle III for the browser side.

## Governance
Constitution supersedes spec/plan/tasks. Amendments require explicit update here, not reinterpretation in plan/tasks.

**Version**: 1.1.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-10-14
