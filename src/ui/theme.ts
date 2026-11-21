import { Platform, StyleSheet } from 'react-native';

export const colors = {
  ink: '#1A1814',
  paper: '#F3EEE6',
  paperDeep: '#E7E0D4',
  surface: '#FFFCF8',
  accent: '#E25B2A',
  accentDark: '#B8431C',
  accentSoft: '#FDE7DC',
  good: '#1F7A4D',
  goodSoft: '#E5F4EC',
  warn: '#8A5A00',
  warnSoft: '#FFF1D6',
  bad: '#9C3B32',
  badSoft: '#FBE6E3',
  muted: '#6F675E',
  line: '#E4DCD0',
  sidebar: '#1A1814',
  sidebarText: '#F6F1E8',
  sidebarMuted: '#B7AFA3',
  cardio: '#1D6A86',
  cardioSoft: '#E4F2F6',
};

export const font = {
  display: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Fraunces, Georgia, serif',
  }) as string,
  body: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    default: 'Outfit, "Avenir Next", "Segoe UI", sans-serif',
  }) as string,
};

export const shadow = Platform.select({
  web: { boxShadow: '0 10px 30px rgba(26, 24, 20, 0.05)' },
  default: {
    shadowColor: '#1A1814',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
}) as object;

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
});
