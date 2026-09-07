import { useCallback, useEffect, useState } from 'react';

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors, layout, radii, spacing, typography } from '@/theme';

type MatchProfile = {
  match_id: string;
  user_id: string;
  first_name: string;
  age: number;
  gender: string;
  interested_in: string;
  about_me: string | null;
  photo_path: string | null;
  matched_at: string;
};

type MatchWithPhoto = MatchProfile & {
  photo_url: string | null;
};

const MAX_CONTENT_WIDTH = 680;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function keyExtractor(item: MatchWithPhoto) {
  return item.match_id;
}

export default function MatchesScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [matches, setMatches] = useState<MatchWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const contentWidth = Math.min(
    Math.max(width - layout.screenGutter * 2, 0),
    MAX_CONTENT_WIDTH
  );

  const loadMatches = useCallback(
    async (isRefresh = false) => {
      if (!eventId) {
        setLoadError('No event was provided. Return to Discovery and try again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setLoadError(null);

        const { data, error } = await supabase.rpc('get_matches', {
          p_event_id: eventId,
        });

        if (error) {
          throw error;
        }

        const rawMatches: MatchProfile[] = data ?? [];
        const photoPaths = rawMatches.flatMap((match) =>
          match.photo_path ? [match.photo_path] : []
        );

        if (photoPaths.length === 0) {
          setMatches(
            rawMatches.map((match) => ({ ...match, photo_url: null }))
          );
          return;
        }

        const { data: signedUrls, error: signedUrlsError } =
          await supabase.storage
            .from('profile-photos')
            .createSignedUrls(photoPaths, 300);

        if (signedUrlsError) {
          console.error('Match photo error:', signedUrlsError);
          setMatches(
            rawMatches.map((match) => ({ ...match, photo_url: null }))
          );
          return;
        }

        const photoUrlMap = new Map<string, string>();
        signedUrls?.forEach((file) => {
          if (file.path && file.signedUrl) {
            photoUrlMap.set(file.path, file.signedUrl);
          }
        });

        setMatches(
          rawMatches.map((match) => ({
            ...match,
            photo_url: match.photo_path
              ? (photoUrlMap.get(match.photo_path) ?? null)
              : null,
          }))
        );
      } catch (error: unknown) {
        console.error('Load matches error:', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void loadMatches();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [loadMatches]);

  const openChat = useCallback(
    (matchId: string, userId: string, firstName: string) => {
      router.push({
        pathname: '/chat',
        params: { matchId, userId, firstName },
      });
    },
    []
  );

  const renderMatch = useCallback(
    ({ item }: { item: MatchWithPhoto }) => {
      const initial = item.first_name.trim().charAt(0).toUpperCase() || '?';

      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { width: contentWidth },
            pressed && styles.cardPressed,
          ]}
          onPress={() =>
            openChat(item.match_id, item.user_id, item.first_name)
          }
          accessibilityRole="button"
          accessibilityLabel={`Open chat with ${item.first_name}, age ${item.age}`}
          accessibilityHint="Opens your conversation"
        >
          {item.photo_url ? (
            <Image
              source={item.photo_url}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory"
              transition={180}
              recyclingKey={item.user_id}
              accessible
              accessibilityLabel={`Profile photo of ${item.first_name}`}
            />
          ) : (
            <View
              style={styles.photoPlaceholder}
              accessibilityLabel={`No profile photo for ${item.first_name}`}
            >
              <Text style={styles.initial}>{initial}</Text>
            </View>
          )}

          <View style={styles.content}>
            <View style={styles.identityRow}>
              <Text selectable style={styles.name} numberOfLines={1}>
                {item.first_name}
              </Text>
              <Text selectable style={styles.age}>
                {item.age}
              </Text>
            </View>
            <Text style={styles.matchedText}>You matched — say hello</Text>
            <Text selectable style={styles.about} numberOfLines={1}>
              {item.about_me?.trim() || 'Start your conversation.'}
            </Text>
          </View>

          <View style={styles.openIndicator} accessibilityElementsHidden>
            <Text style={styles.openIndicatorText}>›</Text>
          </View>
        </Pressable>
      );
    },
    [contentWidth, openChat]
  );

  if (loading) {
    return (
      <StateScreen
        insets={insets}
        title="Loading your matches"
        message="Getting your conversations ready…"
        loading
      />
    );
  }

  if (loadError) {
    return (
      <StateScreen
        insets={insets}
        title="Couldn’t load Matches"
        message={loadError}
        onRetry={() => void loadMatches()}
        assertive
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={keyExtractor}
        renderItem={renderMatch}
        ListHeaderComponent={
          <View style={[styles.header, { width: contentWidth }]}>
            <Text style={styles.eyebrow}>CONNECTIONS</Text>
            <Text style={styles.title}>Matches</Text>
            <Text style={styles.subtitle}>People you both chose to connect with.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { width: contentWidth }]}>
            <View style={styles.stateIcon}>
              <Text style={styles.emptyIconText}>✦</Text>
            </View>
            <Text style={styles.stateTitle}>No matches yet</Text>
            <Text style={styles.stateText}>
              When you both like each other, your connection will appear here.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => void loadMatches(true)}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews
      />
    </View>
  );
}

type StateScreenProps = {
  insets: { top: number; bottom: number };
  title: string;
  message: string;
  loading?: boolean;
  assertive?: boolean;
  onRetry?: () => void;
};

function StateScreen({
  insets,
  title,
  message,
  loading = false,
  assertive = false,
  onRetry,
}: StateScreenProps) {
  return (
    <View
      style={[
        styles.stateScreen,
        { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6] },
      ]}
      accessibilityLiveRegion={assertive ? 'assertive' : 'polite'}
    >
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Text style={styles.errorIconText}>!</Text>
        )}
      </View>
      <Text selectable style={styles.stateTitle}>{title}</Text>
      <Text selectable style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try loading Matches again"
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingHorizontal: layout.screenGutter,
  },
  header: { gap: spacing[1], paddingBottom: spacing[6] },
  eyebrow: {
    ...typography.label,
    color: colors.secondary,
    letterSpacing: 1.4,
  },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.supporting, color: colors.textSecondary },
  separator: { height: spacing[3] },
  card: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: layout.compactCardPadding,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfacePressed,
  },
  photo: { width: 72, height: 72, borderRadius: radii.pill },
  photoPlaceholder: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.secondarySoft,
  },
  initial: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  content: { flex: 1, minWidth: 0, gap: spacing[1] },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  name: { ...typography.cardTitle, flexShrink: 1, color: colors.textPrimary },
  age: {
    ...typography.supporting,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  matchedText: { ...typography.label, color: colors.primary },
  about: { ...typography.supporting, color: colors.textMuted },
  openIndicator: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openIndicatorText: {
    fontSize: 30,
    lineHeight: 34,
    color: colors.textMuted,
  },
  empty: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[10],
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.background,
  },
  stateIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  emptyIconText: { fontSize: 28, lineHeight: 34, color: colors.primary },
  errorIconText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.danger,
  },
  stateTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.supporting,
    maxWidth: 360,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 160,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginTop: spacing[2],
  },
  retryButtonPressed: { backgroundColor: colors.primaryPressed },
  retryButtonText: { ...typography.button, color: colors.textPrimary },
});
