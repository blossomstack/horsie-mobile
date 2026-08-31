#!/usr/bin/env bash
# Build, sign, and upload Horsie to TestFlight in one go.
#
# Signing is cloud-managed: Xcode mints the certificate and provisioning
# profile through the App Store Connect API, so nothing has to be checked in
# or installed by hand. Supply an API key in the environment — from whatever
# secret manager you use — and run `scripts/testflight.sh`:
#
#   ASC_KEY_ID              App Store Connect API key ID
#   ASC_ISSUER_ID           that key's issuer ID
#   ASC_PRIVATE_KEY         the .p8 private key, full PEM contents
#   ASC_TEAM_ID             Apple Developer team ID (10 characters)
#   BUILD_KEYCHAIN_PASSWORD password for the build keychain described below
#
# The key is written only inside a mktemp dir and removed on exit.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

missing=()
for v in ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY ASC_TEAM_ID BUILD_KEYCHAIN_PASSWORD; do
  [[ -n "${!v:-}" ]] || missing+=("$v")
done
if ((${#missing[@]})); then
  echo "missing from the environment: ${missing[*]}" >&2
  echo "see the comment at the top of $0" >&2
  exit 1
fi

KEYDIR="$(mktemp -d)"
KEYFILE="$KEYDIR/AuthKey_${ASC_KEY_ID}.p8"
printf '%s\n' "$ASC_PRIVATE_KEY" >"$KEYFILE"
chmod 600 "$KEYFILE"

# Xcode's automatic signing writes new certificates into the default keychain.
# In a non-interactive shell the login keychain is locked ("User interaction
# is not allowed"), so build inside a dedicated keychain we can unlock. It is
# PERSISTENT: a throwaway keychain would strand a freshly minted signing
# cert's private key on every run, and Xcode then refuses to create another
# one. The default keychain setup is restored on exit, whatever happens.
#
# The search list is narrowed to just this keychain for the same reason. Open
# the project in Xcode.app even once and it mints its own "Apple Development:
# <your name>" identity into the login keychain; both end up in the
# provisioning profile, automatic signing prefers Xcode's, and codesign then
# dies on the locked keychain with a bare `errSecInternalComponent` that names
# neither the keychain nor the certificate.
KEYCHAIN="$HOME/Library/Keychains/asc-build.keychain-db"
ORIG_DEFAULT="$(security default-keychain | xargs)"
ORIG_LIST="$(security list-keychains -d user | xargs)"
cleanup() {
  security default-keychain -s "$ORIG_DEFAULT" 2>/dev/null || true
  # shellcheck disable=SC2086
  security list-keychains -d user -s $ORIG_LIST 2>/dev/null || true
  security lock-keychain "$KEYCHAIN" 2>/dev/null || true
  rm -rf "$KEYDIR"
}
trap cleanup EXIT
if [[ ! -f "$KEYCHAIN" ]]; then
  security create-keychain -p "$BUILD_KEYCHAIN_PASSWORD" "$KEYCHAIN"
fi
security unlock-keychain -p "$BUILD_KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security list-keychains -d user -s "$KEYCHAIN"
security default-keychain -s "$KEYCHAIN"

AUTH_ARGS=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$KEYFILE"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
)

BUILD="$REPO_ROOT/ios/build"
ARCHIVE="$BUILD/Horsie.xcarchive"
rm -rf "$ARCHIVE"

# A release build bundles the JS through Metro from node_modules, and the Pods
# project is generated from them too — so both have to match the lockfiles
# before the archive, not merely be present.
cd "$REPO_ROOT"
npm ci
(cd ios && pod install)

xcodebuild archive \
  -workspace ios/Horsie.xcworkspace -scheme Horsie \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  "${AUTH_ARGS[@]}" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$ASC_TEAM_ID"

cat >"$BUILD/exportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>$ASC_TEAM_ID</string>
  <key>manageAppVersionAndBuildNumber</key><true/>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$BUILD/exportOptions.plist" \
  -exportPath "$BUILD/export" \
  "${AUTH_ARGS[@]}"

echo
echo "Uploaded. Apple processes the build for a few minutes;"
echo "watch App Store Connect → TestFlight."
