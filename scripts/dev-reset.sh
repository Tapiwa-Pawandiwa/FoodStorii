#!/usr/bin/env bash
# dev-reset.sh — FoodStorii development state reset
#
# Usage:
#   ./scripts/dev-reset.sh new-user        # Full reset — slides → sign up → onboarding wizard
#   ./scripts/dev-reset.sh existing-user   # Session only — sign in → straight to Home
#
# This script wipes app data at the OS level (simulator/emulator).
# Use the in-app dev panel (Profile tab → DEV TOOLS) for faster selective resets.
#
# Requires:
#   iOS simulator  — Xcode CLI tools (xcrun)
#   Android emu    — ADB in PATH (Android Studio SDK platform-tools)

set -e

BUNDLE_ID="com.foodstorii.app"
MODE="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ -z "$MODE" ]]; then
  echo ""
  echo "Usage: ./scripts/dev-reset.sh <mode>"
  echo ""
  echo "  new-user        Full reset. Wipes all app data — you will see"
  echo "                  slides → sign up → Tina intro → wizard → WhatsApp link."
  echo ""
  echo "  existing-user   Session reset only. Keeps onboarding complete —"
  echo "                  you will see sign in → Home (no wizard)."
  echo ""
  echo "Tip: the in-app DEV TOOLS panel (Profile tab) is faster for"
  echo "     selective resets without quitting the app."
  echo ""
  exit 1
fi

if [[ "$MODE" != "new-user" && "$MODE" != "existing-user" ]]; then
  echo -e "${RED}Unknown mode: $MODE${NC}"
  echo "Run without arguments to see usage."
  exit 1
fi

# ── Detect platform ──────────────────────────────────────────────────────────

detect_platform() {
  if xcrun simctl list devices 2>/dev/null | grep -q "(Booted)"; then
    echo "ios"
  elif adb devices 2>/dev/null | grep -q "emulator"; then
    echo "android"
  else
    echo "none"
  fi
}

PLATFORM=$(detect_platform)

if [[ "$PLATFORM" == "none" ]]; then
  echo -e "${YELLOW}No booted iOS simulator or Android emulator detected.${NC}"
  echo "Start a simulator/emulator first, then re-run."
  exit 1
fi

echo -e "${GREEN}Platform:${NC} $PLATFORM"
echo -e "${GREEN}Mode:${NC}     $MODE"
echo ""

# ── iOS reset ────────────────────────────────────────────────────────────────

reset_ios_full() {
  echo "Terminating app..."
  xcrun simctl terminate booted "$BUNDLE_ID" 2>/dev/null || true

  echo "Uninstalling app (wipes all data)..."
  xcrun simctl uninstall booted "$BUNDLE_ID" 2>/dev/null || true

  echo -e "${GREEN}✓ iOS full reset complete.${NC}"
  echo "Run 'npx expo start' and press 'i' to reinstall on the simulator."
}

reset_ios_session_only() {
  # We can't selectively clear AsyncStorage from outside the app on iOS.
  # The cleanest approach is to use the in-app dev panel.
  # As a fallback: uninstall+reinstall still works but loses all data.
  echo -e "${YELLOW}Note: iOS does not allow selective key deletion from the terminal.${NC}"
  echo ""
  echo "Recommended: open the app → Profile tab → DEV TOOLS → 'Reset → Existing user'"
  echo "This clears only the session without touching onboarding flags."
  echo ""
  echo "Alternatively, this script can do a full uninstall (loses all data)."
  read -p "Full uninstall instead? [y/N] " confirm
  if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    reset_ios_full
    echo ""
    echo -e "${YELLOW}After reinstalling, complete onboarding once, then use the in-app${NC}"
    echo -e "${YELLOW}'Existing user' reset to test that flow without repeating setup.${NC}"
  else
    echo "No changes made."
  fi
}

# ── Android reset ────────────────────────────────────────────────────────────

reset_android_full() {
  echo "Clearing all app data..."
  adb shell pm clear "$BUNDLE_ID"
  echo -e "${GREEN}✓ Android full reset complete.${NC}"
  echo "Run 'npx expo start' and press 'a' to relaunch."
}

reset_android_session_only() {
  # AsyncStorage on Android is stored in a SQLite file we can target directly.
  # Supabase session keys: sb-<project>-auth-token (stored in AsyncStorage)
  # FoodStorii keys: fs_access_token (SecureStore), fs_onboarding_complete, etc.
  #
  # Clearing just the Supabase session + fs_access_token without touching
  # fs_onboarding_complete simulates "existing user signed out".

  echo "Forcing stop..."
  adb shell am force-stop "$BUNDLE_ID"

  echo "Clearing Supabase session from AsyncStorage..."
  # AsyncStorage DB path on Android
  DB_PATH="/data/data/${BUNDLE_ID}/databases/RKStorage"
  # Delete all keys that start with sb- (Supabase session) or fs_access_token
  adb shell "run-as $BUNDLE_ID sqlite3 $DB_PATH \
    \"DELETE FROM catalystLocalStorage WHERE key LIKE 'sb-%' OR key = 'fs_access_token';\"" 2>/dev/null || {
    echo -e "${YELLOW}Could not directly clear AsyncStorage (may need root or different path).${NC}"
    echo "Falling back to full clear instead."
    reset_android_full
    return
  }

  echo -e "${GREEN}✓ Android session reset complete.${NC}"
  echo "Relaunch the app — you will see sign-in with onboarding already complete."
}

# ── Run ──────────────────────────────────────────────────────────────────────

if [[ "$PLATFORM" == "ios" ]]; then
  if [[ "$MODE" == "new-user" ]]; then
    reset_ios_full
  else
    reset_ios_session_only
  fi
else
  if [[ "$MODE" == "new-user" ]]; then
    reset_android_full
  else
    reset_android_session_only
  fi
fi
