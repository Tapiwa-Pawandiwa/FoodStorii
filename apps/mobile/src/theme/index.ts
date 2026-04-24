// ── FoodStorii Design System — Section 20 ─────────────────────────────────────
// COLOR ROLES
//   bg           → #F7F0F0 warm cream background
//   white        → cards and elevated surfaces
//   brand.green  → #48A111 vivid green — CTAs, active states, Tina button — always
//   brand.dark   → #25671E dark green — brand headers, dark surfaces, secondary buttons
//   brand.amber  → #FFAA00 expiry, urgency
//   text.*       → typography hierarchy

export const colors = {
  // === BRAND PALETTE ===
  brand: {
    green: '#48A111',    // Primary CTA, Tina button, active states — vivid green
    dark: '#25671E',     // Headers, dark buttons, secondary borders — dark green
    amber: '#FFAA00',    // Expiry, urgency
    amberTint: '#FFF4D6', // Expiry card backgrounds
    // Legacy aliases kept for backward compat
    orange: '#48A111',   // maps to primary green
    yellow: '#FFAA00',   // maps to amber
    blue: '#48A111',     // maps to primary green
    darkGreen: '#25671E',
  },

  // === SURFACE ===
  bg: '#F7F0F0',          // Primary background — warm cream
  white: '#FFFFFF',
  cream: '#F7F0F0',       // Same as bg, named alias

  // === TYPOGRAPHY ===
  text: {
    primary: '#1A1A18',   // Near black
    secondary: '#5A5A52', // Warm grey
    tertiary: '#C4BEB8',  // Faint warm grey
    inverse: '#F7F0F0',   // On dark green surfaces
  },

  // === GREEN SCALE ===
  green: {
    50: '#F0F8EC',        // Tinted background (selected chips, success backgrounds)
    100: '#D4EDCA',
    200: '#A8DB95',
    300: '#7CC860',
    400: '#5CB83A',
    500: '#48A111',       // = brand.green
    600: '#25671E',       // = brand.dark
    700: '#1A4A15',
    800: '#102E0D',
  },

  // === NEUTRALS / BORDERS ===
  gray: {
    50: '#F7F0F0',        // = bg
    100: '#EAE4E4',       // Borders, dividers
    200: '#D4CECE',
    300: '#C4BEB8',       // = text.tertiary
    400: '#5A5A52',       // = text.secondary
    500: '#3A3A32',
    600: '#2A2A22',
    700: '#1A1A18',       // = text.primary
    800: '#0F0F0E',
  },

  // === STATUS ===
  amber: {
    50: '#FFF4D6',        // = brand.amberTint
    100: '#FFE5A0',
    500: '#FFAA00',       // = brand.amber
    600: '#E09000',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
};

// ── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

// ── Radius ───────────────────────────────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

// ── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 6,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
};

// ── Tab bar ──────────────────────────────────────────────────────────────────
// Floating pill: 64px bar + 16px bottom margin + 14px Tina elevation + safe area
// Add to screen scroll contentContainerStyle.paddingBottom

export const TAB_BAR_BOTTOM_PADDING = 110;
