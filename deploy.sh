#! /bin/sh
# Automated release: bump latest GitHub release tag, build, publish.
# Usage: ./deploy.sh [major|minor|patch]   (default: patch)
set -eu

part="${1:-patch}"
case "$part" in
  major|minor|patch) ;;
  *) echo "Usage: $0 [major|minor|patch]" >&2; exit 1 ;;
esac

latest="$(gh release list --limit 1 --json tagName --jq '.[0].tagName')"
published="$(gh release list --limit 1 --json publishedAt --jq '.[0].publishedAt')"
if [ -z "$latest" ] || [ "$latest" = "null" ]; then
  latest="0.0.0"
fi
if [ "$published" = "null" ]; then
  published=""
fi

major="${latest%%.*}"
rest="${latest#*.}"
minor="${rest%%.*}"
patch="${rest#*.}"

case "$part" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
esac
new="$major.$minor.$patch"

echo "Previous release: $latest -> new version: $new"

python3 build.py "$new"

notes=""
if git fetch origin tag "$latest" 2>/dev/null && git rev-parse --verify "$latest" >/dev/null 2>&1; then
  if [ -n "$published" ]; then
    notes="$(git log --since="$published" "$latest"..HEAD --format='- %s')"
  else
    notes="$(git log "$latest"..HEAD --format='- %s')"
  fi
fi
if [ -z "$notes" ]; then
  notes="Bug fixes and improvements."
fi

gh release create "$new" \
    "mod_event_qrscan_$new.zip" \
    event_qrscan_update.xml \
    --title "Release $new" \
    --notes "$notes"
