#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_KEYSTORE="${1:-$PROJECT_ROOT/@wtarit__ubc-newcomers.jks}"
DEBUG_KEYSTORE="$PROJECT_ROOT/android/app/debug.keystore"
TEMP_KEYSTORE="$PROJECT_ROOT/android/app/debug.keystore.tmp"
BACKUP_KEYSTORE="$PROJECT_ROOT/android/app/debug.keystore.backup"

if [[ ! -f "$SOURCE_KEYSTORE" ]]; then
  echo "Keystore not found: $SOURCE_KEYSTORE" >&2
  exit 1
fi

if [[ ! -d "$PROJECT_ROOT/android/app" ]]; then
  echo "Run npx expo prebuild or npx expo run:android once before using this script." >&2
  exit 1
fi

read -rsp "Expo keystore password: " EXPO_KEYSTORE_PASSWORD
echo
read -rp "Expo key alias: " EXPO_KEY_ALIAS
read -rsp "Expo key password [press Enter to reuse keystore password]: " EXPO_KEY_PASSWORD
echo

if [[ -z "$EXPO_KEY_PASSWORD" ]]; then
  EXPO_KEY_PASSWORD="$EXPO_KEYSTORE_PASSWORD"
fi

rm -f "$TEMP_KEYSTORE"

keytool -importkeystore \
  -srckeystore "$SOURCE_KEYSTORE" \
  -srcstorepass "$EXPO_KEYSTORE_PASSWORD" \
  -srcalias "$EXPO_KEY_ALIAS" \
  -srckeypass "$EXPO_KEY_PASSWORD" \
  -destkeystore "$TEMP_KEYSTORE" \
  -deststoretype JKS \
  -deststorepass android \
  -destalias androiddebugkey \
  -destkeypass android \
  -noprompt

if [[ -f "$DEBUG_KEYSTORE" ]]; then
  cp "$DEBUG_KEYSTORE" "$BACKUP_KEYSTORE"
fi

mv "$TEMP_KEYSTORE" "$DEBUG_KEYSTORE"

echo "Updated $DEBUG_KEYSTORE"
if [[ -f "$BACKUP_KEYSTORE" ]]; then
  echo "Previous debug keystore backed up at $BACKUP_KEYSTORE"
fi
