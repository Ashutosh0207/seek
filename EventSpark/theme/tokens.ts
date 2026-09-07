export const colors = {
  background: '#0D0B12',
  surface: '#17131F',
  surfaceElevated: '#211A2B',
  surfacePressed: '#2A2136',
  borderSubtle: '#2C2437',
  borderStrong: '#443650',
  textPrimary: '#FAF8FC',
  textSecondary: '#C6BECE',
  textMuted: '#91889A',
  textDisabled: '#69616F',
  primary: '#FF4D7D',
  primaryPressed: '#E93D6C',
  primarySoft: '#3A1726',
  secondary: '#9B7BFF',
  secondarySoft: '#251E45',
  success: '#43D19E',
  warning: '#F4B860',
  danger: '#FF6B75',
  overlay: 'rgba(7, 4, 10, 0.52)',
  scrimStrong: 'rgba(7, 4, 10, 0.78)',
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
  },
  bodyEmphasized: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  supporting: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
} as const;

export const layout = {
  screenGutter: spacing[5],
  compactCardPadding: spacing[4],
  cardPadding: spacing[5],
  sectionGap: spacing[8],
  minimumTouchTarget: 44,
  compactButtonHeight: 44,
  buttonHeight: 52,
} as const;

export const motion = {
  press: 120,
  stateTransition: 200,
  cardEntrance: 240,
  matchCelebration: 600,
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  layout,
  motion,
} as const;

export type Theme = typeof theme;
export type ThemeColor = keyof typeof colors;
export type ThemeSpacing = keyof typeof spacing;
export type TypographyRole = keyof typeof typography;

