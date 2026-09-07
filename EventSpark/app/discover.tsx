import { useCallback, useEffect, useState } from 'react';

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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

type DiscoveryProfile = {
  user_id: string;
  first_name: string;
  age: number;
  gender: string;
  interested_in: string;
  about_me: string | null;
  photo_path: string | null;
};

type ProfileWithUrl = DiscoveryProfile & {
  photo_url: string | null;
};

const MAX_CONTENT_WIDTH = 620;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function keyExtractor(item: ProfileWithUrl) {
  return item.user_id;
}

export default function DiscoverScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [profiles, setProfiles] = useState<ProfileWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [likingUserId, setLikingUserId] = useState<string | null>(null);

  const contentWidth = Math.min(
    Math.max(width - layout.screenGutter * 2, 0),
    MAX_CONTENT_WIDTH
  );

  const loadDiscoveryProfiles = useCallback(
    async (isRefresh = false) => {
      if (!eventId) {
        setLoadError('No event was provided. Return to the event and try again.');
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

        const { data, error } = await supabase.rpc(
          'get_discovery_profiles',
          { p_event_id: eventId }
        );

        if (error) {
          throw error;
        }

        const rawProfiles: DiscoveryProfile[] = data ?? [];
        const photoPaths = rawProfiles.flatMap((profile) =>
          profile.photo_path ? [profile.photo_path] : []
        );

        if (photoPaths.length === 0) {
          setProfiles(
            rawProfiles.map((profile) => ({ ...profile, photo_url: null }))
          );
          return;
        }

        const { data: signedUrls, error: signedUrlsError } =
          await supabase.storage
            .from('profile-photos')
            .createSignedUrls(photoPaths, 300);

        if (signedUrlsError) {
          console.error('Signed URL error:', signedUrlsError);
          setProfiles(
            rawProfiles.map((profile) => ({ ...profile, photo_url: null }))
          );
          return;
        }

        const photoUrlMap = new Map<string, string>();
        signedUrls?.forEach((signedFile) => {
          if (signedFile.path && signedFile.signedUrl) {
            photoUrlMap.set(signedFile.path, signedFile.signedUrl);
          }
        });

        setProfiles(
          rawProfiles.map((profile) => ({
            ...profile,
            photo_url: profile.photo_path
              ? (photoUrlMap.get(profile.photo_path) ?? null)
              : null,
          }))
        );
      } catch (error: unknown) {
        console.error('Discovery error:', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    void loadDiscoveryProfiles();
  }, [loadDiscoveryProfiles]);

  const handleLike = useCallback(
    async (targetUserId: string) => {
      if (!eventId) {
        Alert.alert('Missing event', 'Could not determine the current event.');
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
          Alert.alert("It's a match! 🎉", 'You both liked each other.');
        } else {
          Alert.alert(
            'Interest sent ❤️',
            'They can now see that you are interested.'
          );
        }

        setProfiles((currentProfiles) =>
          currentProfiles.filter(
            (profile) => profile.user_id !== targetUserId
          )
        );
      } catch (error: unknown) {
        console.error('Like error:', error);
        Alert.alert('Could not send like', getErrorMessage(error));
      } finally {
        setLikingUserId(null);
      }
    },
    [eventId]
  );

  const openLikes = useCallback(() => {
    router.push({ pathname: '/likes', params: { eventId } });
  }, [eventId]);

  const openMatches = useCallback(() => {
    router.push({ pathname: '/matches', params: { eventId } });
  }, [eventId]);

  const renderProfile = useCallback(
    ({ item }: { item: ProfileWithUrl }) => {
      const isLiking = likingUserId === item.user_id;
      const firstInitial = item.first_name.trim().charAt(0).toUpperCase() || '?';

      return (
        <View
          style={[styles.card, { width: contentWidth }]}
          accessibilityLabel={`${item.first_name}, age ${item.age}`}
        >
          <View style={styles.photoFrame}>
            {item.photo_url ? (
              <Image
                source={item.photo_url}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="memory"
                transition={200}
                recyclingKey={item.user_id}
                accessible
                accessibilityLabel={`Profile photo of ${item.first_name}`}
              />
            ) : (
              <View
                style={styles.photoPlaceholder}
                accessibilityLabel={`No profile photo for ${item.first_name}`}
              >
                <View style={styles.initialCircle}>
                  <Text style={styles.initialText}>{firstInitial}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.identityRow}>
              <Text selectable style={styles.name} numberOfLines={2}>
                {item.first_name}
              </Text>
              <Text selectable style={styles.age}>
                {item.age}
              </Text>
            </View>

            <View style={styles.aboutSection}>
              <Text style={styles.aboutLabel}>ABOUT ME</Text>
              <Text selectable style={styles.about}>
                {item.about_me?.trim() || 'Say hello and discover their story.'}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.likeButton,
                pressed && styles.likeButtonPressed,
                isLiking && styles.likeButtonDisabled,
              ]}
              onPress={() => void handleLike(item.user_id)}
              disabled={likingUserId !== null}
              accessibilityRole="button"
              accessibilityLabel={`Like ${item.first_name}`}
              accessibilityHint="Sends your interest to this person"
              accessibilityState={{ disabled: likingUserId !== null, busy: isLiking }}
            >
              {isLiking ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.likeButtonText}>Like {item.first_name}</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [contentWidth, handleLike, likingUserId]
  );

  const listHeader = (
    <View style={[styles.header, { width: contentWidth }]}>
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>SOCIAL ROOM</Text>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>People at this event, picked for you.</Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          onPress={openLikes}
          accessibilityRole="button"
          accessibilityLabel="Open Likes"
        >
          <Text style={styles.headerButtonText}>Likes</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.headerButtonPressed,
          ]}
          onPress={openMatches}
          accessibilityRole="button"
          accessibilityLabel="Open Matches"
        >
          <Text style={styles.headerButtonText}>Matches</Text>
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.stateScreen,
          { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6] },
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.stateIcon}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={styles.stateTitle}>Finding your people</Text>
        <Text style={styles.stateText}>Loading this Social Room…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View
        style={[
          styles.stateScreen,
          { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6] },
        ]}
        accessibilityLiveRegion="assertive"
      >
        <View style={styles.stateIcon}>
          <Text style={styles.stateIconText}>!</Text>
        </View>
        <Text selectable style={styles.stateTitle}>Couldn’t load Discovery</Text>
        <Text selectable style={styles.stateText}>{loadError}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.likeButtonPressed,
          ]}
          onPress={() => void loadDiscoveryProfiles()}
          accessibilityRole="button"
          accessibilityLabel="Try loading Discovery again"
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={profiles}
        keyExtractor={keyExtractor}
        renderItem={renderProfile}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { width: contentWidth }]}>
            <View style={styles.stateIcon}>
              <Text style={styles.emptyIconText}>✦</Text>
            </View>
            <Text style={styles.stateTitle}>You’re all caught up</Text>
            <Text style={styles.stateText}>
              New people will appear here as they join this Social Room.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: spacing[4],
            paddingBottom: insets.bottom + spacing[8],
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => void loadDiscoveryProfiles(true)}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: layout.screenGutter,
  },
  header: {
    gap: spacing[5],
    paddingBottom: spacing[6],
  },
  headingBlock: {
    gap: spacing[1],
  },
  eyebrow: {
    ...typography.label,
    color: colors.secondary,
    letterSpacing: 1.4,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.supporting,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  headerButton: {
    minHeight: layout.compactButtonHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  headerButtonPressed: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.borderStrong,
  },
  headerButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  cardSeparator: {
    height: spacing[6],
  },
  card: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.24)',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondarySoft,
  },
  initialCircle: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
  },
  initialText: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cardContent: {
    gap: spacing[5],
    padding: layout.cardPadding,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  age: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '400',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  aboutSection: {
    gap: spacing[2],
    padding: spacing[4],
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceElevated,
  },
  aboutLabel: {
    ...typography.caption,
    color: colors.secondary,
    letterSpacing: 1.1,
  },
  about: {
    ...typography.body,
    color: colors.textSecondary,
  },
  likeButton: {
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  likeButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  likeButtonDisabled: {
    opacity: 0.72,
  },
  likeButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[10],
  },
  stateIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  stateIconText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.danger,
  },
  emptyIconText: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.primary,
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
    minHeight: layout.buttonHeight,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginTop: spacing[2],
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
});
