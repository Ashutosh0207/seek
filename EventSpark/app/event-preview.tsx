import { useCallback, useEffect, useState } from 'react';

import { router, Stack, useLocalSearchParams } from 'expo-router';
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

type EventData = {
  id: string;
  name: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  status: string;
};

function formatEventDate(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const day = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(start);
  const startTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  const endTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(end);

  return `${day} · ${startTime}–${endTime}`;
}

export default function EventPreviewScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      Alert.alert('Invalid QR', 'No event ID was found.');
      router.back();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, name, venue_name, start_at, end_at, status')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Load event error:', error);
      Alert.alert('Event not found', 'This QR code does not point to a valid event.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void loadEvent();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [loadEvent]);

  async function joinEvent() {
    if (!eventId) return;

    try {
      setJoining(true);
      const { error } = await supabase.rpc('join_event', {
        p_event_id: eventId,
      });

      if (error) throw error;
      router.replace({ pathname: '/discover', params: { eventId } });
    } catch (error: unknown) {
      console.error('Join event error:', error);
      const message = error instanceof Error ? error.message : undefined;
      Alert.alert('Could not join event', message ?? 'Something went wrong.');
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerState}>
        <Stack.Screen options={{ title: 'Event details', headerShadowVisible: false, headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }} />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading event details…</Text>
      </View>
    );
  }

  if (!event) return null;

  const eventDate = formatEventDate(event.start_at, event.end_at);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing[8]) }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: 'Event details', headerShadowVisible: false, headerTintColor: colors.textPrimary, headerStyle: { backgroundColor: colors.background } }} />

      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.eyebrow}>YOU’RE AT</Text>
        <Text style={styles.title} selectable>{event.name}</Text>
        <Text style={styles.venue} selectable>{event.venue_name}</Text>
        {eventDate && <Text style={styles.date} selectable>{eventDate}</Text>}
      </View>

      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>SOCIAL ROOM</Text>
          <Text style={styles.statusHelp}>Event access status</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusValue}>{event.status}</Text>
        </View>
      </View>

      <View style={styles.visibilityCard}>
        <Text style={styles.sectionTitle}>Before you join</Text>
        <Text style={styles.description}>
          Joining makes your EventSpark profile visible to eligible participants in this event’s Social Room.
        </Text>
        <View style={styles.privacyRow}>
          <Text style={styles.checkmark} accessibilityElementsHidden>✓</Text>
          <Text style={styles.privacyText}>Your exact location, phone number, and email are never shown.</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, joining && styles.buttonDisabled, pressed && !joining && styles.primaryButtonPressed]}
        onPress={() => void joinEvent()}
        disabled={joining}
        accessibilityRole="button"
        accessibilityLabel={`Join ${event.name} Social Room`}
        accessibilityState={{ disabled: joining, busy: joining }}
      >
        {joining ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator color={colors.textPrimary} />
            <Text style={styles.primaryButtonText}>Joining room…</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Join Social Room</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: layout.screenGutter, paddingTop: spacing[6], gap: spacing[5] },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], backgroundColor: colors.background, padding: layout.screenGutter },
  loadingText: { color: colors.textSecondary, ...typography.supporting },
  heroCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.lg, backgroundColor: colors.surfaceElevated, padding: layout.cardPadding, borderCurve: 'continuous' },
  heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -120, right: -60, backgroundColor: colors.primarySoft },
  eyebrow: { color: colors.primary, ...typography.label, letterSpacing: 1.6 },
  title: { paddingTop: spacing[3], color: colors.textPrimary, ...typography.screenTitle, letterSpacing: -0.5 },
  venue: { paddingTop: spacing[2], color: colors.textSecondary, ...typography.bodyEmphasized },
  date: { paddingTop: spacing[4], color: colors.textMuted, ...typography.supporting },
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing[4], borderCurve: 'continuous' },
  statusLabel: { color: colors.textPrimary, ...typography.label, letterSpacing: 0.8 },
  statusHelp: { paddingTop: spacing[1], color: colors.textMuted, ...typography.caption },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderRadius: radii.pill, backgroundColor: colors.secondarySoft, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  statusDot: { width: 7, height: 7, borderRadius: radii.pill, backgroundColor: colors.success },
  statusValue: { color: colors.textPrimary, textTransform: 'capitalize', ...typography.label },
  visibilityCard: { gap: spacing[3], borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing[5], borderCurve: 'continuous' },
  sectionTitle: { color: colors.textPrimary, ...typography.cardTitle },
  description: { color: colors.textSecondary, ...typography.body },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], paddingTop: spacing[1] },
  checkmark: { width: 22, height: 22, color: colors.success, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  privacyText: { flex: 1, color: colors.textMuted, ...typography.supporting },
  primaryButton: { minHeight: layout.buttonHeight, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primary, paddingHorizontal: spacing[5] },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.68 },
  loadingContent: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  primaryButtonText: { color: colors.textPrimary, ...typography.button },
});
