import {
    useEffect,
    useState,
  } from 'react';
  
  import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
  } from 'react-native';
  
  import {
    useLocalSearchParams,
  } from 'expo-router';
  
  import { Image } from 'expo-image';
  
  import { supabase } from '../lib/supabase';
  
  
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
  
  
  type LikeWithPhoto =
    ReceivedLike & {
      photo_url: string | null;
    };
  
  
  export default function LikesScreen() {
  
    const { eventId } =
      useLocalSearchParams<{
        eventId: string;
      }>();
  
  
    const [likes, setLikes] =
      useState<LikeWithPhoto[]>([]);
  
  
    const [loading, setLoading] =
      useState(true);
  
  
    const [likingUserId, setLikingUserId] =
      useState<string | null>(null);
  
  
    useEffect(() => {
  
      async function loadLikes() {
  
        if (!eventId) {
  
          Alert.alert(
            'Missing event',
            'No event was provided.'
          );
  
          setLoading(false);
  
          return;
        }
  
  
        try {
  
          setLoading(true);
  
  
          /*
           * STEP 1:
           * Ask PostgreSQL for incoming likes.
           */
          const {
            data,
            error,
          } = await supabase.rpc(
            'get_received_likes',
            {
              p_event_id: eventId,
            }
          );
  
  
          console.log(
            'RECEIVED LIKES:',
            data
          );
  
          console.log(
            'RECEIVED LIKES ERROR:',
            error
          );
  
  
          if (error) {
            throw error;
          }
  
  
          const rawLikes:
            ReceivedLike[] =
            data ?? [];
  
  
          if (rawLikes.length === 0) {
  
            setLikes([]);
  
            return;
          }
  
  
          /*
           * STEP 2:
           * Collect photo paths.
           */
          const photoPaths =
            rawLikes
              .filter(
                (like) =>
                  like.photo_path !== null
              )
              .map(
                (like) =>
                  like.photo_path!
              );
  
  
          /*
           * Nobody has photos.
           */
          if (photoPaths.length === 0) {
  
            setLikes(
              rawLikes.map(
                (like) => ({
                  ...like,
                  photo_url: null,
                })
              )
            );
  
            return;
          }
  
  
          /*
           * STEP 3:
           * Generate temporary photo URLs
           * in a single request.
           */
          const {
            data: signedUrls,
            error: signedUrlsError,
          } =
            await supabase.storage
              .from(
                'profile-photos'
              )
              .createSignedUrls(
                photoPaths,
                300
              );
  
  
          if (signedUrlsError) {
  
            console.error(
              'Likes photo error:',
              signedUrlsError
            );
  
  
            setLikes(
              rawLikes.map(
                (like) => ({
                  ...like,
                  photo_url: null,
                })
              )
            );
  
            return;
          }
  
  
          /*
           * STEP 4:
           * Create path -> URL lookup.
           */
          const photoUrlMap =
            new Map<
              string,
              string
            >();
  
  
          signedUrls?.forEach(
            (file) => {
  
              if (
                file.path &&
                file.signedUrl
              ) {
  
                photoUrlMap.set(
                  file.path,
                  file.signedUrl
                );
  
              }
  
            }
          );
  
  
          /*
           * STEP 5:
           * Attach URLs to likes.
           */
          const likesWithPhotos =
            rawLikes.map(
              (like) => ({
  
                ...like,
  
                photo_url:
                  like.photo_path
                    ? photoUrlMap.get(
                        like.photo_path
                      ) ?? null
                    : null,
  
              })
            );
  
  
          setLikes(
            likesWithPhotos
          );
  
  
        } catch (error: any) {
  
          console.error(
            'Load likes error:',
            error
          );
  
  
          Alert.alert(
            'Could not load likes',
            error.message ??
              'Something went wrong.'
          );
  
  
        } finally {
  
          setLoading(false);
  
        }
  
      }
  
  
      loadLikes();
  
  
    }, [eventId]);
  
  
  
    async function likeBack(
      targetUserId: string
    ) {
  
      if (!eventId) {
        return;
      }
  
  
      try {
  
        setLikingUserId(
          targetUserId
        );
  
  
        /*
         * Same send_like function used
         * on Discovery.
         */
        const {
          data,
          error,
        } = await supabase.rpc(
          'send_like',
          {
            p_event_id:
              eventId,
  
            p_target_user_id:
              targetUserId,
          }
        );
  
  
        if (error) {
          throw error;
        }
  
  
        console.log(
          'LIKE BACK RESULT:',
          data
        );
  
  
        if (
          data?.match_created
        ) {
  
          Alert.alert(
            "It's a Match! 🎉",
            'You both want to connect.'
          );
  
  
          /*
           * Remove this pending Like.
           *
           * They now belong in Matches.
           */
          setLikes(
            (currentLikes) =>
              currentLikes.filter(
                (like) =>
                  like.user_id !==
                  targetUserId
              )
          );
  
        } else {
  
          Alert.alert(
            'Interest sent ❤️',
            'Your interest has been sent.'
          );
  
        }
  
  
      } catch (error: any) {
  
        console.error(
          'Like back error:',
          error
        );
  
  
        Alert.alert(
          'Could not send like',
          error.message ??
            'Something went wrong.'
        );
  
  
      } finally {
  
        setLikingUserId(null);
  
      }
  
    }
  
  
  
    function renderLike({
      item,
    }: {
      item: LikeWithPhoto;
    }) {
  
      const isLiking =
        likingUserId ===
        item.user_id;
  
  
      return (
  
        <View style={styles.card}>
  
  
          {item.photo_url ? (
  
            <Image
              source={
                item.photo_url
              }
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
  
          ) : (
  
            <View
              style={
                styles.photoPlaceholder
              }
            >
  
              <Text
                style={
                  styles.placeholderText
                }
              >
                No Photo
              </Text>
  
            </View>
  
          )}
  
  
          <View
            style={styles.content}
          >
  
            <Text style={styles.name}>
              {item.first_name},
              {' '}
              {item.age}
            </Text>
  
  
            {item.about_me ? (
  
              <Text
                style={styles.about}
              >
                {item.about_me}
              </Text>
  
            ) : null}
  
  
            <Text
              style={
                styles.interestText
              }
            >
              Interested in you ❤️
            </Text>
  
  
            <TouchableOpacity
              style={[
                styles.interestedButton,
  
                isLiking &&
                  styles.buttonDisabled,
              ]}
              onPress={() =>
                likeBack(
                  item.user_id
                )
              }
              disabled={isLiking}
            >
  
              {isLiking ? (
  
                <ActivityIndicator
                  color="#FFFFFF"
                />
  
              ) : (
  
                <Text
                  style={
                    styles.interestedButtonText
                  }
                >
                  ❤️ I am Interested
                </Text>
  
              )}
  
            </TouchableOpacity>
  
          </View>
  
        </View>
  
      );
  
    }
  
  
  
    if (loading) {
  
      return (
  
        <View style={styles.center}>
  
          <ActivityIndicator
            color="#FF3B81"
            size="large"
          />
  
          <Text
            style={styles.loadingText}
          >
            Loading likes...
          </Text>
  
        </View>
  
      );
  
    }
  
  
  
    return (
  
      <View style={styles.container}>
  
        <Text style={styles.title}>
          Likes
        </Text>
  
        <Text style={styles.subtitle}>
          People who are interested in you
        </Text>
  
  
        {likes.length === 0 ? (
  
          <View style={styles.empty}>
  
            <Text
              style={styles.emptyTitle}
            >
              No new likes
            </Text>
  
            <Text
              style={styles.emptyText}
            >
              New people who like you
              will appear here.
            </Text>
  
          </View>
  
        ) : (
  
          <FlatList
            data={likes}
  
            keyExtractor={
              (item) =>
                item.like_id
            }
  
            renderItem={
              renderLike
            }
  
            showsVerticalScrollIndicator={
              false
            }
  
            contentContainerStyle={
              styles.listContent
            }
          />
  
        )}
  
      </View>
  
    );
  
  }
  
  
  
  const styles =
    StyleSheet.create({
  
      container: {
        flex: 1,
        backgroundColor:
          '#0B0B0F',
        paddingHorizontal: 20,
        paddingTop: 60,
      },
  
  
      center: {
        flex: 1,
        backgroundColor:
          '#0B0B0F',
        justifyContent:
          'center',
        alignItems: 'center',
      },
  
  
      loadingText: {
        color: '#999999',
        marginTop: 12,
      },
  
  
      title: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
      },
  
  
      subtitle: {
        color: '#888888',
        marginTop: 6,
        marginBottom: 20,
      },
  
  
      listContent: {
        paddingBottom: 40,
      },
  
  
      card: {
        backgroundColor:
          '#18181F',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor:
          '#25252E',
      },
  
  
      photo: {
        width: '100%',
        height: 380,
      },
  
  
      photoPlaceholder: {
        height: 380,
        backgroundColor:
          '#222222',
        justifyContent:
          'center',
        alignItems: 'center',
      },
  
  
      placeholderText: {
        color: '#777777',
      },
  
  
      content: {
        padding: 20,
      },
  
  
      name: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
      },
  
  
      about: {
        color: '#AAAAAA',
        marginTop: 8,
        fontSize: 15,
        lineHeight: 21,
      },
  
  
      interestText: {
        color: '#FF7AAA',
        marginTop: 14,
        fontWeight: '600',
      },
  
  
      interestedButton: {
        backgroundColor:
          '#FF3B81',
        borderRadius: 28,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 18,
      },
  
  
      interestedButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
      },
  
  
      buttonDisabled: {
        opacity: 0.6,
      },
  
  
      empty: {
        flex: 1,
        justifyContent:
          'center',
        alignItems: 'center',
        paddingBottom: 70,
      },
  
  
      emptyTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
      },
  
  
      emptyText: {
        color: '#888888',
        marginTop: 8,
        textAlign: 'center',
      },
  
    });