import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, spacing, typography } from '@/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, spacing[6]), paddingBottom: Math.max(insets.bottom, spacing[6]) }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      <View style={styles.brandRow}>
        <View style={styles.brandMark} accessibilityElementsHidden>
          <Text style={styles.brandGlyph}>✦</Text>
        </View>
        <Text style={styles.brandName}>EventSpark</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MEET IN THE MOMENT</Text>
        <Text style={styles.title}>Real events.{`\n`}Real chemistry.</Text>
        <Text style={styles.subtitle}>
          Discover people at the same event and let a mutual spark make the introduction.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={() => router.push('/signup')}
          accessibilityRole="button"
          accessibilityLabel="Create an EventSpark account"
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          accessibilityLabel="Log in to your EventSpark account"
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: colors.background, paddingHorizontal: layout.screenGutter },
  ambientGlowTop: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -110, right: -100, backgroundColor: colors.primarySoft, opacity: 0.72 },
  ambientGlowBottom: { position: 'absolute', width: 300, height: 300, borderRadius: 150, bottom: -190, left: -130, backgroundColor: colors.secondarySoft, opacity: 0.62 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  brandMark: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primary },
  brandGlyph: { color: colors.textPrimary, fontSize: 22, lineHeight: 26, fontWeight: '700' },
  brandName: { color: colors.textPrimary, ...typography.cardTitle },
  hero: { flex: 1, justifyContent: 'center', paddingBottom: spacing[8] },
  eyebrow: { marginBottom: spacing[4], color: colors.primary, ...typography.label, letterSpacing: 1.8 },
  title: { color: colors.textPrimary, fontSize: 44, lineHeight: 50, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { maxWidth: 480, marginTop: spacing[5], color: colors.textSecondary, ...typography.body },
  actions: { gap: spacing[3] },
  primaryButton: { minHeight: layout.buttonHeight, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: spacing[5] },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.textPrimary, ...typography.button },
  secondaryButton: { minHeight: layout.buttonHeight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: spacing[5] },
  secondaryButtonPressed: { backgroundColor: colors.surfacePressed },
  secondaryButtonText: { color: colors.textPrimary, ...typography.bodyEmphasized },
});
