#!/usr/bin/env bash
# Vendor horsie's fluorite schemas into schemas/ at the pinned ref.
#
# The .fl files are the source of truth for every type on the wire, and they
# live in blossomstack/horsie. Copying them in — rather than a submodule —
# keeps the version to one greppable line and keeps codegen offline-capable.
# `npm run check:schemas` re-runs this and fails on a diff, so a stale pin is
# loud rather than silent.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ref="$(tr -d '[:space:]' < "$repo_root/schemas/HORSIE_REF")"
src="crates/models/fluorite"

[ -n "$ref" ] || { echo "schemas/HORSIE_REF is empty" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Sparse + blobless + depth 1: fetching a bare SHA works on GitHub, and only
# the one directory is ever materialised.
git -C "$tmp" init -q
git -C "$tmp" remote add origin https://github.com/blossomstack/horsie.git
git -C "$tmp" sparse-checkout init --cone
git -C "$tmp" sparse-checkout set "$src"
git -C "$tmp" fetch -q --depth 1 --filter=blob:none origin "$ref"
git -C "$tmp" checkout -q FETCH_HEAD

count=$(ls -1 "$tmp/$src"/*.fl 2>/dev/null | wc -l | tr -d ' ')
[ "$count" -gt 0 ] || { echo "no .fl files at $ref:$src" >&2; exit 1; }

rm -f "$repo_root"/schemas/*.fl
cp "$tmp/$src"/*.fl "$repo_root/schemas/"
echo "synced $count schema(s) from horsie@${ref:0:8}"
