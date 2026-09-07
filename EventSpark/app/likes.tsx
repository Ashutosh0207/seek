import { useCallback, useEffect, useState } from 'react';

import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
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

type ReceivedLike = {
  like_id: string;
  user_id: string;
  first_name: string;
  age: number;
  gender: string;
  interested_in: string;
  about_me: string | null;
  photo_path: string | null;
  created_at: string;
};

type LikeWithPhoto = ReceivedLike & {
  photo_url: string | null;
};

const MAX_CONTENT_WIDTH = 680;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function keyExtractor(item: LikeWithPhoto) {
  return item.like_id;
}

export default function LikesScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [likes, setLikes] = useState<LikeWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [likingUserId, setLikingUserId] = useState<string | null>(null);

  const contentWidth = Math.min(
    Math.max(width - layout.screenGutter * 2, 0),
    MAX_CONTENT_WIDTH
  );

  const loadLikes = useCallback(
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

        const { data, error } = await supabase.rpc('get_received_likes', {
          p_event_id: eventId,
        });

        if (error) {
          throw error;
        }

        const rawLikes: ReceivedLike[] = data ?? [];
        const photoPaths = rawLikes.flatMap((like) =>
          like.photo_path ? [like.photo_path] : []
        );

        if (photoPaths.length === 0) {
          setLikes(rawLikes.map((like) => ({ ...like, photo_url: null })));
          return;
        }

        const { data: signedUrls, error: signedUrlsError } =
          await supabase.storage
            .from('profile-photos')
            .createSignedUrls(photoPaths, 300);

        if (signedUrlsError) {
          console.error('Likes photo error:', signedUrlsError);
          setLikes(rawLikes.map((like) => ({ ...like, photo_url: null })));
          return;
        }

        const photoUrlMap = new Map<string, string>();
        signedUrls?.forEach((file) => {
          if (file.path && file.signedUrl) {
            photoUrlMap.set(file.path, file.signedUrl);
          }
        });

        setLikes(
          rawLikes.map((like) => ({
            ...like,
            photo_url: like.photo_path
              ? (photoUrlMap.get(like.photo_path) ?? null)
              : null,
          }))
        );
      } catch (error: unknown) {
        console.error('Load likes error:', error);
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
      void loadLikes();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [loadLikes]);

  const likeBack = useCallback(
    async (targetUserId: string) => {
      if (!eventId) {
        return;
      }

      try {
        setLikingUserId(targetUserId);

        const { data, error } = await supabase.rpc('send_like', {
          p_event_id: eventId,
          p_target_user_id: targetUserId,
        });

        if (error) {
          throw error;
        }

        if (data?.match_created) {
          Alert.alert("It's a Match! 🎉", 'You both want to connect.');
          setLikes((currentLikes) =>
            currentLikes.filter((like) => like.user_id !== targetUserId)
          );
        } else {
          Alert.alert('Interest sent ❤️', 'Your interest has been sent.');
        }
      } catch (error: unknown) {
        console.error('Like back error:', error);
        Alert.alert('Could not send like', getErrorMessage(error));
      } finally {
        setLikingUserId(null);
      }
    },
    [eventId]
  );

  const renderLike = useCallback(
    ({ item }: { item: LikeWithPhoto }) => {
      const isLiking = likingUserId === item.user_id;
      const initial = item.first_name.trim().charAt(0).toUpperCase() || '?';

      return (
        <View style={[styles.card, { width: contentWidth }]}>
          <View style={styles.personRow}>
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

            <View style={styles.personDetails}>
              <View style={styles.identityRow}>
                <Text selectable style={styles.name} numberOfLines={1}>
                  {item.first_name}
                </Text>
                <Text selectable style={styles.age}>
                  {item.age}
                </Text>
              </View>
              <Text style={styles.interestText}>Interested in you</Text>
              <Text selectable style={styles.about} numberOfLines={2}>
                {item.about_me?.trim() || 'Start a conversation and learn more.'}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.likeBackButton,
              pressed && styles.likeBackButtonPressed,
              isLiking && styles.buttonDisabled,
            ]}
            onPress={() => void likeBack(item.user_id)}
            disabled={likingUserId !== null}
            accessibilityRole="button"
            accessibilityLabel={`Like ${item.first_name} back`}
            accessibilityHint="Sends your interest and may create a match"
            accessibilityState={{ disabled: likingUserId !== null, busy: isLiking }}
          >
            {isLiking ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.likeBackButtonText}>Like back</Text>
            )}
          </Pressable>
        </View>
      );
    },
    [contentWidth, likeBack, likingUserId]
  );

  if (loading) {
    return (
      <StateScreen
        insets={insets}
        title="Checking your likes"
        message="Finding people who are interested in you…"
        loading
      />
    );
  }

  if (loadError) {
    return (
      <StateScreen
        insets={insets}
        title="Couldn’t load Likes"
        message={loadError}
        onRetry={() => void loadLikes()}
        assertive
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={likes}
        keyExtractor={keyExtractor}
        renderItem={renderLike}
        ListHeaderComponent={
          <View style={[styles.header, { width: contentWidth }]}>
            <Text style={styles.eyebrow}>CONNECTIONS</Text>
            <Text style={styles.title}>Likes</Text>
            <Text style={styles.subtitle}>People who want to connect with you.</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { width: contentWidth }]}>
            <View style={styles.stateIcon}>
              <Text style={styles.emptyIconText}>♡</Text>
            </View>
            <Text style={styles.stateTitle}>No new likes</Text>
            <Text style={styles.stateText}>
              New people who like you will appear here.
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
        onRefresh={() => void loadLikes(true)}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
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
            pressed && styles.likeBackButtonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try loading Likes again"
        >
          <Text style={styles.likeBackButtonText}>Try again</Text>
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
    gap: spacing[4],
    padding: layout.compactCardPadding,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  personRow: { flexDirection: 'row', gap: spacing[4] },
  photo: { width: 96, height: 112, borderRadius: radii.md },
  photoPlaceholder: {
    width: 96,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.secondarySoft,
  },
  initial: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  personDetails: { flex: 1, minWidth: 0, gap: spacing[1] },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  name: { ...typography.cardTitle, flexShrink: 1, color: colors.textPrimary },
  age: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  interestText: { ...typography.label, color: colors.primary },
  about: { ...typography.supporting, color: colors.textMuted },
  likeBackButton: {
    minHeight: layout.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  likeBackButtonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { opacity: 0.72 },
  likeBackButtonText: { ...typography.button, color: colors.textPrimary },
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
  emptyIconText: { fontSize: 32, lineHeight: 38, color: colors.primary },
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
});
