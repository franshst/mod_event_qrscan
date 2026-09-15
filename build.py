#!/usr/bin/env python3
"""Build script for mod_event_qrscan."""

import sys
import os
import re
import shutil
import hashlib
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).parent
REPO = "franshst/mod_event_qrscan"


def fail(msg):
    print(f"BUILD FAILED: {msg}", file=sys.stderr)
    sys.exit(1)


def validate_args():
    if len(sys.argv) != 2:
        fail("Usage: python build.py <semver>")
    version = sys.argv[1]
    if not re.match(r'^\d+\.\d+\.\d+$', version):
        fail(f"Version must be semver X.Y.Z, got: {version}")
    return version


def step1_vendored_lib_gate(version):
    js_file = ROOT / 'js' / 'html5-qrcode.min.js'
    if not js_file.exists():
        fail(f"Vendored-lib gate: {js_file} does not exist")
    content = js_file.read_text(errors='ignore')
    if '2.3.9' not in content[:1000]:
        fail(f"Vendored-lib gate: version 2.3.9 not found in {js_file}")
    if 'cdn' in content.lower() and 'https://' in content.lower():
        if 'https://cdn' in content.lower():
            fail(f"Vendored-lib gate: CDN reference found in {js_file}")
    print(f"  Vendored-lib gate: PASS ({js_file.name} v2.3.9)")


def step2_lint(version):
    import subprocess

    print("  Lint: php -l...")
    for php_file in ['mod_event_qrscan.php', 'Helper/EventQrscanHelper.php']:
        result = subprocess.run(['php', '-l', str(ROOT / php_file)],
                                capture_output=True, text=True)
        if result.returncode != 0:
            fail(f"php -l {php_file}: {result.stderr.strip()}")
        print(f"    {php_file}: OK")

    print("  Lint: node --check...")
    js_files = ['js/site-checkin-default.js']
    for js_file in js_files:
        result = subprocess.run(['node', '--check', str(ROOT / js_file)],
                                capture_output=True, text=True)
        if result.returncode != 0:
            fail(f"node --check {js_file}: {result.stderr.strip()}")
        print(f"    {js_file}: OK")

    print("  Lint: ET.parse XMLs...")
    for xml_file in ['update/mod_event_qrscan.xml', 'update/event_qrscan_update.xml']:
        tree = ET.parse(str(ROOT / xml_file))
        tree.getroot()
        print(f"    {xml_file}: OK")

    print("  Lint: manifest required fields...")
    manifest = ET.parse(str(ROOT / 'update' / 'mod_event_qrscan.xml'))
    root = manifest.getroot()
    required = ['name', 'version', 'namespace']
    for field in required:
        elem = root.find(field)
        if elem is None or not elem.text:
            fail(f"Manifest missing required field: {field}")
    print("  Manifest required fields: OK")

    print("  Lint: semver check...")
    version = root.find('version').text
    if version != '{VERSION}' and not re.match(r'^\d+\.\d+\.\d+$', version):
        fail(f"Manifest version not valid semver: {version}")
    print("  Semver check: OK")


def step2b_minify_js(version):
    import subprocess

    print("  Minify: deleting stale *.min.js (excluding html5-qrcode.min.js)...")
    for f in ROOT.glob('js/*.min.js'):
        if f.name != 'html5-qrcode.min.js':
            f.unlink()
            print(f"    Removed stale: {f.name}")

    print("  Minify: uglifyjs js/site-checkin-default.js -o js/site-checkin-default.min.js...")
    result = subprocess.run(['uglifyjs', 'js/site-checkin-default.js', '-o', 'js/site-checkin-default.min.js'],
                            capture_output=True, text=True, cwd=str(ROOT))
    if result.returncode != 0:
        if 'uglifyjs' in result.stderr.lower() or result.returncode == 127:
            fail("Minify: uglifyjs not found. Install with: npm install -g uglify-js")
        fail(f"Minify: uglifyjs failed: {result.stderr.strip()}")
    print("    site-checkin-default.min.js: OK")


def step3_stamp_manifest(version):
    src = ROOT / 'update' / 'mod_event_qrscan.xml'
    tree = ET.parse(src)
    root = tree.getroot()
    version_elem = root.find('version')
    version_elem.text = version
    infourl = root.find('infourl')
    if infourl is not None:
        infourl.text = f'https://github.com/franshst/mod_event_qrscan'
    tree.write(str(ROOT / 'mod_event_qrscan.xml'), encoding='utf-8', xml_declaration=True)
    print(f"  Stamp manifest: {version}")


def step4_create_zip(version):
    tmp_dir = ROOT / 'build_tmp'
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()

    folders = ['tmpl', 'language', 'Helper', 'js']
    files = ['mod_event_qrscan.php', 'mod_event_qrscan.xml', 'LICENSE', 'index.html']

    for folder in folders:
        src = ROOT / folder
        dst = tmp_dir / folder
        shutil.copytree(src, dst)

    for f in files:
        shutil.copy2(ROOT / f, tmp_dir / f)

    zip_path = ROOT / f'mod_event_qrscan_{version}.zip'
    shutil.make_archive(str(ROOT / f'mod_event_qrscan_{version}'), 'zip', tmp_dir)
    shutil.move(str(ROOT / f'mod_event_qrscan_{version}.zip'), zip_path)

    shutil.rmtree(tmp_dir)
    print(f"  ZIP: {zip_path.name}")
    return zip_path


def step5_completeness_assert(zip_path):
    import zipfile
    required = ['mod_event_qrscan.php', 'tmpl/default.php',
                'Helper/EventQrscanHelper.php', 'js/site-checkin-default.js',
                'js/site-checkin-default.min.js', 'js/html5-qrcode.min.js']
    with zipfile.ZipFile(zip_path, 'r') as zf:
        names = zf.namelist()
        for req in required:
            if req not in names:
                fail(f"ZIP completeness: missing {req}")
    print("  ZIP completeness: OK")


def step6_update_xml(version):
    src = ROOT / 'update' / 'event_qrscan_update.xml'
    tree = ET.parse(src)
    root = tree.getroot()
    download_url = f'https://github.com/{REPO}/releases/download/{version}/mod_event_qrscan_{version}.zip'
    for update in root.findall('update'):
        v = update.find('version')
        if v is not None:
            v.text = version
        d = update.find('.//downloadurl')
        if d is not None:
            d.text = f'mod_event_qrscan_{version}.zip'
            d.set('https', download_url)
    tree.write(str(ROOT / 'event_qrscan_update.xml'), encoding='utf-8', xml_declaration=True)
    print(f"  Update XML: {version} -> {download_url}")


def step7_checksums(zip_path, version):
    with open(zip_path, 'rb') as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    md5 = hashlib.md5(open(zip_path, 'rb').read()).hexdigest()
    print(f"  sha256: {sha256}")
    print(f"  md5 (informational): {md5}")

    update_xml = ET.parse(str(ROOT / 'event_qrscan_update.xml'))
    root = update_xml.getroot()
    sha_elem = root.find('update/sha256')
    if sha_elem is not None:
        sha_elem.text = sha256
    download_url = f'https://github.com/{REPO}/releases/download/{version}/mod_event_qrscan_{version}.zip'
    d = root.find('update/downloadurl')
    if d is not None:
        d.set('https', download_url)
    update_xml.write(str(ROOT / 'event_qrscan_update.xml'), encoding='utf-8', xml_declaration=True)
    print("  Checksums updated in update XML")


def main():
    version = validate_args()

    print(f"\n=== Building mod_event_qrscan {version} ===\n")

    print("Step 1b: Vendored-lib gate...")
    step1_vendored_lib_gate(version)

    print("\nStep 1: Lint...")
    step2_lint(version)

    print("\nStep 2: Minify JS...")
    step2b_minify_js(version)

    print("\nStep 3: Stamp manifest...")
    step3_stamp_manifest(version)

    print("\nStep 4: Create ZIP...")
    zip_path = step4_create_zip(version)

    print("\nStep 5: ZIP completeness assert...")
    step5_completeness_assert(zip_path)

    print("\nStep 6: Update XML...")
    step6_update_xml(version)

    print("\nStep 7: Checksums...")
    step7_checksums(zip_path, version)

    print(f"\n=== BUILD SUCCESS: {zip_path} ===\n")
    print(f"  Outputs: {zip_path.name}, event_qrscan_update.xml")


if __name__ == '__main__':
    main()
