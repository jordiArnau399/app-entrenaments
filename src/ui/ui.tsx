import { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors, font, shadow } from './theme';

export function Mark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width="32" height="32" rx="9" fill={light ? '#F6F1E8' : colors.accent} />
      <SvgText
        x="16"
        y="22.5"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill={light ? colors.ink : colors.surface}
        fontFamily={font.display}
      >
        R
      </SvgText>
    </Svg>
  );
}

export function ExerciseGlyph({ type, size = 44 }: { type: 'strength' | 'cardio'; size?: number }) {
  const strength = type === 'strength';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width="48" height="48" rx="14" fill={strength ? colors.accentSoft : colors.cardioSoft} />
      {strength ? (
        <>
          <Path d="M7 24h34" stroke={colors.accent} strokeWidth="2.4" strokeLinecap="round" />
          <Rect x="9" y="18" width="3.5" height="12" rx="1" fill={colors.accent} />
          <Rect x="14" y="15.5" width="3" height="17" rx="1" fill={colors.accent} />
          <Rect x="31" y="15.5" width="3" height="17" rx="1" fill={colors.accent} />
          <Rect x="35.5" y="18" width="3.5" height="12" rx="1" fill={colors.accent} />
        </>
      ) : (
        <>
          <Circle cx="24" cy="24" r="10" stroke={colors.cardio} strokeWidth="2.3" fill="none" />
          <Path d="M24 24 L24 17" stroke={colors.cardio} strokeWidth="2.3" strokeLinecap="round" />
          <Path d="M24 24 L29 26.5" stroke={colors.cardio} strokeWidth="2.3" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

type TextVariant = 'display' | 'title' | 'section' | 'body' | 'small' | 'label';

export function T({
  children,
  variant = 'body',
  color,
  style,
}: {
  children: ReactNode;
  variant?: TextVariant;
  color?: string;
  style?: TextStyle;
}) {
  return <Text style={[styles[variant], color ? { color } : null, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.primary,
        tone === 'secondary' && styles.secondary,
        tone === 'ghost' && styles.ghost,
        tone === 'danger' && styles.danger,
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.88 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === 'primary' || tone === 'danger' ? { color: colors.surface } : { color: colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboard = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboard?: 'default' | 'email-address' | 'numeric' | 'decimal-pad';
}) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboard}
        style={[styles.input, multiline && { minHeight: 88, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent' | 'cardio' }) {
  const palette = {
    neutral: { bg: colors.paperDeep, fg: colors.ink },
    good: { bg: colors.goodSoft, fg: colors.good },
    warn: { bg: colors.warnSoft, fg: colors.warn },
    bad: { bg: colors.badSoft, fg: colors.bad },
    accent: { bg: colors.accentSoft, fg: colors.accentDark },
    cardio: { bg: colors.cardioSoft, fg: colors.cardio },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 500,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const nudge = (direction: number) => {
    const next = Math.round((value + direction * step) * 10) / 10;
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <View style={{ gap: 6, minWidth: 120 }}>
      <T variant="label">{label}</T>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Baixa ${label}`} onPress={() => nudge(-1)} style={styles.stepButton}>
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>
          {shown}
          {suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Puja ${label}`} onPress={() => nudge(1)} style={styles.stepButton}>
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.toggleRow}>
      <T>{label}</T>
      <View style={[styles.track, value && { backgroundColor: colors.accent }]}>
        <View style={[styles.knob, value && { marginLeft: 22 }]} />
      </View>
    </Pressable>
  );
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.notice}>
      <T color={colors.bad}>{message}</T>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T color={colors.muted}>{children}</T>
    </View>
  );
}

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

const styles = StyleSheet.create({
  display: { fontFamily: font.display, fontSize: 42, lineHeight: 48, color: colors.ink, fontWeight: '600' },
  title: { fontFamily: font.display, fontSize: 32, lineHeight: 38, color: colors.ink, fontWeight: '600' },
  section: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: colors.ink, fontWeight: '600' },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: {
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, ...shadow },
  button: { minHeight: 48, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.bad },
  buttonText: { fontFamily: font.body, fontSize: 16, fontWeight: '600' },
  input: {
    fontFamily: font.body,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...webInput,
  },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: font.body, fontSize: 13, fontWeight: '600' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepGlyph: { fontFamily: font.body, fontSize: 22, color: colors.ink },
  stepValue: { flex: 1, textAlign: 'center', fontFamily: font.body, fontSize: 16, fontWeight: '600', color: colors.ink },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  track: { width: 48, height: 28, borderRadius: 999, backgroundColor: colors.paperDeep, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  notice: { backgroundColor: colors.badSoft, borderRadius: 12, padding: 12 },
  empty: { paddingVertical: 28, alignItems: 'center' },
});
