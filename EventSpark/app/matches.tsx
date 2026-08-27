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
    router,
    useLocalSearchParams,
  } from 'expo-router';
  
  import { Image } from 'expo-image';
  
  import { supabase } from '../lib/supabase';
  
  
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
  
  
  type MatchWithPhoto =
    MatchProfile & {
      photo_url: string | null;
    };
  
  
  export default function MatchesScreen() {
  
    const { eventId } =
      useLocalSearchParams<{
        eventId: string;
      }>();
  
  
    const [matches, setMatches] =
      useState<MatchWithPhoto[]>([]);
  
  
    const [loading, setLoading] =
      useState(true);
  
  
    useEffect(() => {
  
      async function loadMatches() {
  
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
           * STEP 1
           *
           * Get matches from PostgreSQL.
           */
          const {
            data,
            error,
          } = await supabase.rpc(
            'get_matches',
            {
              p_event_id: eventId,
            }
          );
  
  
          console.log(
            'MATCHES DATA:',
            data
          );
  
          console.log(
            'MATCHES ERROR:',
            error
          );
  
  
          if (error) {
            throw error;
          }
  
  
          const rawMatches:
            MatchProfile[] =
            data ?? [];
  
  
          if (
            rawMatches.length === 0
          ) {
  
            setMatches([]);
  
            return;
          }
  
  
          /*
           * STEP 2
           *
           * Collect all available
           * photo paths.
           */
          const photoPaths =
            rawMatches
              .filter(
                (match) =>
                  match.photo_path !== null
              )
              .map(
                (match) =>
                  match.photo_path!
              );
  
  
          /*
           * If nobody has photos,
           * just show profiles without images.
           */
          if (
            photoPaths.length === 0
          ) {
  
            setMatches(
              rawMatches.map(
                (match) => ({
                  ...match,
                  photo_url: null,
                })
              )
            );
  
            return;
          }
  
  
          /*
           * STEP 3
           *
           * Generate temporary URLs
           * in one Storage request.
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
  
  
          if (
            signedUrlsError
          ) {
  
            console.error(
              'Match photo error:',
              signedUrlsError
            );
  
  
            setMatches(
              rawMatches.map(
                (match) => ({
                  ...match,
                  photo_url: null,
                })
              )
            );
  
            return;
          }
  
  
          /*
           * STEP 4
           *
           * Create:
           *
           * photo path -> signed URL
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
           * STEP 5
           *
           * Attach signed URL
           * to each matched profile.
           */
          const matchesWithPhotos =
            rawMatches.map(
              (match) => ({
  
                ...match,
  
                photo_url:
                  match.photo_path
                    ? photoUrlMap.get(
                        match.photo_path
                      ) ?? null
                    : null,
  
              })
            );
  
  
          setMatches(
            matchesWithPhotos
          );
  
  
        } catch (
          error: any
        ) {
  
          console.error(
            'Load matches error:',
            error
          );
  
  
          Alert.alert(
            'Could not load matches',
            error.message ??
              'Something went wrong.'
          );
  
  
        } finally {
  
          setLoading(false);
  
        }
  
      }
  
  
      loadMatches();
  
  
    }, [eventId]);
  
  
  
    /*
     * This will eventually open
     * the chat screen.
     */
    function openChat(
      matchId: string,
      userId: string,
      firstName: string
    ) {
  
      router.push({
        pathname: '/chat',
  
        params: {
          matchId,
          userId,
          firstName,
        },
      });
  
    }
  
  
  
    function renderMatch({
      item,
    }: {
      item: MatchWithPhoto;
    }) {
  
      return (
  
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            openChat(
              item.match_id,
              item.user_id,
              item.first_name
            )
          }
        >
  
          {item.photo_url ? (
  
            <Image
              source={
                item.photo_url
              }
              style={
                styles.photo
              }
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
  
            <Text
              style={styles.name}
            >
  
              {item.first_name},
              {' '}
              {item.age}
  
            </Text>
  
  
            <Text
              style={
                styles.matchedText
              }
            >
              It is a match ❤️
            </Text>
  
  
            {item.about_me ? (
  
              <Text
                style={styles.about}
              >
                {item.about_me}
              </Text>
  
            ) : null}
  
  
            <View
              style={
                styles.chatButton
              }
            >
  
              <Text
                style={
                  styles.chatButtonText
                }
              >
                Start Chat
              </Text>
  
            </View>
  
          </View>
  
        </TouchableOpacity>
  
      );
  
    }
  
  
  
    if (loading) {
  
      return (
  
        <View
          style={styles.center}
        >
  
          <ActivityIndicator
            color="#FF3B81"
            size="large"
          />
  
          <Text
            style={
              styles.loadingText
            }
          >
            Loading matches...
          </Text>
  
        </View>
  
      );
  
    }
  
  
  
    return (
  
      <View
        style={styles.container}
      >
  
        <Text
          style={styles.title}
        >
          Matches
        </Text>
  
  
        <Text
          style={styles.subtitle}
        >
          People you both chose
          to connect with
        </Text>
  
  
        {matches.length === 0 ? (
  
          <View
            style={styles.empty}
          >
  
            <Text
              style={
                styles.emptyTitle
              }
            >
              No matches yet
            </Text>
  
            <Text
              style={
                styles.emptyText
              }
            >
              When you both like
              each other, they will
              appear here.
            </Text>
  
          </View>
  
        ) : (
  
          <FlatList
            data={matches}
  
            keyExtractor={
              (item) =>
                item.match_id
            }
  
            renderItem={
              renderMatch
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
  
        alignItems:
          'center',
  
        justifyContent:
          'center',
      },
  
  
      loadingText: {
        color:
          '#999999',
  
        marginTop: 12,
      },
  
  
      title: {
        color:
          '#FFFFFF',
  
        fontSize: 32,
  
        fontWeight:
          '700',
      },
  
  
      subtitle: {
        color:
          '#888888',
  
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
  
        height: 350,
      },
  
  
      photoPlaceholder: {
        width: '100%',
  
        height: 350,
  
        backgroundColor:
          '#222222',
  
        alignItems:
          'center',
  
        justifyContent:
          'center',
      },
  
  
      placeholderText: {
        color:
          '#777777',
      },
  
  
      content: {
        padding: 20,
      },
  
  
      name: {
        color:
          '#FFFFFF',
  
        fontSize: 24,
  
        fontWeight:
          '700',
      },
  
  
      matchedText: {
        color:
          '#FF7AAA',
  
        fontWeight:
          '600',
  
        marginTop: 8,
      },
  
  
      about: {
        color:
          '#AAAAAA',
  
        fontSize: 15,
  
        lineHeight: 21,
  
        marginTop: 10,
      },
  
  
      chatButton: {
        backgroundColor:
          '#FF3B81',
  
        borderRadius: 28,
  
        paddingVertical: 14,
  
        alignItems:
          'center',
  
        marginTop: 18,
      },
  
  
      chatButtonText: {
        color:
          '#FFFFFF',
  
        fontSize: 16,
  
        fontWeight:
          '700',
      },
  
  
      empty: {
        flex: 1,
  
        alignItems:
          'center',
  
        justifyContent:
          'center',
  
        paddingBottom: 70,
      },
  
  
      emptyTitle: {
        color:
          '#FFFFFF',
  
        fontSize: 22,
  
        fontWeight:
          '700',
      },
  
  
      emptyText: {
        color:
          '#888888',
  
        marginTop: 8,
  
        textAlign:
          'center',
  
        lineHeight: 20,
      },
  
    });