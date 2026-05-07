/**
 * Verdana Health Design System Constants
 * Derived from DESIGN.md
 */

export const Brand = {
  primary: '#0F172A',      // Primary Navy: Primary actions, strong headers
  secondary: '#64748B',    // Secondary Slate: Secondary text, borders
  accent: '#059669',       // Tertiary Sage: Links, CTAs, highlights
  success: '#22C55E',      // Confirmed, healthy range
  warning: '#EAB308',      // Pending results, caution
  error: '#EF4444',        // Critical, out of range
  info: '#0EA5E9',         // Informational, new feature
};

export const Surfaces = {
  background: '#F8FAFC',   // Page background
  default: '#FFFFFF',      // Card backgrounds
  border: '#E2E8F0',       // Default borders
  borderHover: '#0F172A',  // Hover borders
};

export const Typography = {
  fonts: {
    display: 'PlusJakartaSans_700Bold',
    h1: 'PlusJakartaSans_700Bold',
    h2: 'PlusJakartaSans_600SemiBold',
    h3: 'PlusJakartaSans_600SemiBold',
    h4: 'PlusJakartaSans_500Medium',
    bodyLg: 'DMSans_400Regular',
    body: 'DMSans_400Regular',
    bodySm: 'DMSans_400Regular',
    caption: 'DMSans_500Medium',
    code: 'FiraCode_400Regular',
  },
  sizes: {
    display: { fontSize: 40, lineHeight: 46 }, // 1.15 line height approx
    h1: { fontSize: 32, lineHeight: 38.4 },
    h2: { fontSize: 24, lineHeight: 30 },
    h3: { fontSize: 20, lineHeight: 26 },
    h4: { fontSize: 16, lineHeight: 21.6 },
    bodyLg: { fontSize: 18, lineHeight: 28.8 },
    body: { fontSize: 16, lineHeight: 25.6 },
    bodySm: { fontSize: 14, lineHeight: 21 },
    caption: { fontSize: 12, lineHeight: 16.8 },
    code: { fontSize: 14, lineHeight: 22.4 },
  },
  colors: {
    primary: '#0F172A',
    secondary: '#64748B',
    accent: '#059669',
  }
};

export const Spacing = {
  xs: 4,     // Inline icon gaps
  sm: 8,     // Tight component padding
  md: 16,    // Default padding
  lg: 24,    // Card padding
  xl: 32,    // Section gaps
  xxl: 48,   // Layout sections
  xxxl: 64,  // Page-level spacing
};

export const Radius = {
  sm: 4,     // Badges, small tags
  DEFAULT: 8, // Buttons, cards, inputs
  md: 12,    // Modals, dropdown panels
  lg: 16,    // Large containers, hero sections
  full: 9999, // Avatars, status indicators
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 8,
  },
};
