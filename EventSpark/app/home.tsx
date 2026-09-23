import { useState } from 'react';

import { router, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors, layout, radii, spacing, typography } from '@/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(
        'Logout failed',
        'Could not reach Supabase. Please check your internet connection and try again.'
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, spacing[8]) },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} accessibilityElementsHidden>
            <Text style={styles.brandGlyph}>✦</Text>
          </View>
          <Text style={styles.brandName}>EventSpark</Text>
        </View>
        <Text style={styles.tagline}>Your social room starts at the venue.</Text>
      </View>

      <View style={styles.eventCard}>
        <View style={styles.cardAccent} />
        <Text style={styles.eyebrow}>READY FOR TONIGHT?</Text>
        <Text style={styles.cardTitle}>Find your event</Text>
        <Text style={styles.cardText}>
          Scan the QR code at the venue to join its Social Room and discover other attendees.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push('/join-event')}
          accessibilityRole="button"
          accessibilityLabel="Scan event QR code"
          accessibilityHint="Opens the camera scanner"
        >
          <Text style={styles.primaryButtonText}>Scan event QR</Text>
        </Pressable>
      </View>

      <View style={styles.privacyCard}>
        <View style={styles.privacyBadge}>
          <Text style={styles.privacyBadgeText} accessibilityElementsHidden>✓</Text>
        </View>
        <View style={styles.privacyCopy}>
          <Text style={styles.infoTitle}>Visible only when you join</Text>
          <Text style={styles.infoText}>
            Your profile appears only inside a Social Room you explicitly join. Your exact location and distance stay private.
          </Text>
        </View>
      </View>

      <View style={styles.accountSection}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <Pressable
          style={({ pressed }) => [styles.accountAction, pressed && styles.accountActionPressed]}
          onPress={() => router.push('/edit-profile')}
          accessibilityRole="button"
        >
          <View>
            <Text style={styles.accountActionTitle}>Edit profile</Text>
            <Text style={styles.accountActionText}>Update your details and profile photo</Text>
          </View>
          <Text style={styles.chevron} accessibilityElementsHidden>›</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={() => void handleLogout()}
        disabled={loggingOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
      >
        {loggingOut ? (
          <View style={styles.logoutLoading}>
            <ActivityIndicator color={colors.textMuted} />
            <Text style={styles.logoutText}>Logging out…</Text>
          </View>
        ) : (
          <Text style={styles.logoutText}>Log out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: layout.screenGutter, paddingTop: spacing[10], gap: spacing[6] },
  header: { gap: spacing[3], paddingBottom: spacing[2] },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  brandMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primary },
  brandGlyph: { color: colors.textPrimary, fontSize: 20, lineHeight: 24, fontWeight: '700' },
  brandName: { color: colors.textPrimary, ...typography.sectionTitle },
  tagline: { color: colors.textSecondary, ...typography.body },
  eventCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.lg, backgroundColor: colors.surfaceElevated, padding: layout.cardPadding, borderCurve: 'continuous' },
  cardAccent: { position: 'absolute', width: 150, height: 150, borderRadius: 75, top: -90, right: -55, backgroundColor: colors.primarySoft },
  eyebrow: { color: colors.primary, ...typography.label, letterSpacing: 1.5 },
  cardTitle: { paddingTop: spacing[3], color: colors.textPrimary, ...typography.screenTitle, letterSpacing: -0.5 },
  cardText: { paddingTop: spacing[3], color: colors.textSecondary, ...typography.body },
  primaryButton: { minHeight: layout.buttonHeight, alignItems: 'center', justifyContent: 'center', marginTop: spacing[6], borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: spacing[5] },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.textPrimary, ...typography.button },
  privacyCard: { flexDirection: 'row', gap: spacing[4], borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing[4], borderCurve: 'continuous' },
  privacyBadge: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.secondarySoft },
  privacyBadgeText: { color: colors.secondary, fontSize: 18, fontWeight: '700' },
  privacyCopy: { flex: 1, gap: spacing[1] },
  infoTitle: { color: colors.textPrimary, ...typography.bodyEmphasized },
  infoText: { color: colors.textMuted, ...typography.supporting },
  accountSection: { gap: spacing[2] },
  sectionLabel: { color: colors.textMuted, ...typography.caption, letterSpacing: 1.2 },
  accountAction: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderCurve: 'continuous' },
  accountActionPressed: { backgroundColor: colors.surfacePressed },
  accountActionTitle: { color: colors.textPrimary, ...typography.bodyEmphasized },
  accountActionText: { paddingTop: spacing[1], color: colors.textMuted, ...typography.supporting },
  chevron: { color: colors.textMuted, fontSize: 28, lineHeight: 30 },
  logoutButton: { minHeight: layout.minimumTouchTarget, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  logoutButtonPressed: { opacity: 0.65 },
  logoutLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  logoutText: { color: colors.textMuted, ...typography.label },
});
