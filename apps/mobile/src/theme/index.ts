// ── FoodStorii Design System ─────────────────────────────────────────────────
// COLOR ROLES
//   bg           → primary app background (warm beige)
//   white        → cards and elevated surfaces
//   brand.orange → primary CTA buttons
//   brand.yellow → badges, highlights
//   brand.blue   → empty states, informational
//   green.*      → icons, success states, small accents ONLY
//   text.*       → typography hierarchy

export const colors = {
  // === BRAND PALETTE ===
  brand: {
    orange: '#f9a620',    // Primary CTA
    yellow: '#ffd449',    // Badges, highlights
    blue: '#a8d5e2',      // Empty states, info
    green: '#548c2f',     // Icon accent, success
    darkGreen: '#104911', // Deep green accent
  },

  // === SURFACE ===
  bg: '#FFFFFF',          // Primary background
  white: '#FFFFFF',

  // === TYPOGRAPHY ===
  text: {
    primary: '#0F0F0F',
    secondary: '#6B6B6B',
    tertiary: '#A0A0A0',
    inverse: '#FFFFFF',
  },

  // === GREEN (accent use only — icons, success, small highlights) ===
  green: {
    50: '#f2f9ed',
    100: '#d9f0c8',
    200: '#b3e090',
    300: '#86c962',
    400: '#6aaf40',
    500: '#548c2f',
    600: '#548c2f',
    700: '#104911',
    800: '#0c3610',
  },

  // === NEUTRALS ===
  gray: {
    50: '#F8F8F8',
    100: '#EEEBE4',
    200: '#E0DDD6',
    300: '#C8C5BE',
    400: '#A0A0A0',
    500: '#6B6B6B',
    600: '#4A4A4A',
    700: '#2E2E2E',
    800: '#1A1A1A',
    900: '#0F0F0F',
  },

  // === STATUS ===
  amber: {
    50: '#fff8f0',
    100: '#ffe8c0',
    500: '#f9a620',
    600: '#e09010',
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
// Floating pill offset — add to screen scroll contentContainerStyle.paddingBottom

export const TAB_BAR_BOTTOM_PADDING = 120;
