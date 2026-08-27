import { useEffect, useState } from 'react';

import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    FlatList,
} from 'react-native';

import {
    router,
    useLocalSearchParams,
} from 'expo-router';

import { Image } from 'expo-image';

import { supabase } from '../lib/supabase';


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


export default function DiscoverScreen() {

    const { eventId } =
        useLocalSearchParams<{
            eventId: string;
        }>();


    const [profiles, setProfiles] =
        useState<ProfileWithUrl[]>([]);

    const [loading, setLoading] =
        useState(true);


    /*
     * Load people who can be discovered
     * in the current event.
     */
    useEffect(() => {

        async function loadDiscoveryProfiles() {

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
                 * Get eligible profiles from Supabase.
                 */
                const {
                    data,
                    error,
                } = await supabase.rpc(
                    'get_discovery_profiles',
                    {
                        p_event_id: eventId,
                    }
                );


                console.log(
                    'CURRENT EVENT:',
                    eventId
                );

                console.log(
                    'DISCOVERY DATA:',
                    data
                );

                console.log(
                    'DISCOVERY ERROR:',
                    error
                );


                if (error) {
                    throw error;
                }


                const rawProfiles:
                    DiscoveryProfile[] =
                    data ?? [];


                /*
                 * Nobody to display.
                 */
                if (rawProfiles.length === 0) {

                    setProfiles([]);

                    return;
                }


                /*
                 * STEP 2:
                 * Collect only valid photo paths.
                 *
                 * Someone without a photo can still
                 * appear in Discovery.
                 */
                const photoPaths =
                    rawProfiles
                        .filter(
                            (profile) =>
                                profile.photo_path !== null
                        )
                        .map(
                            (profile) =>
                                profile.photo_path!
                        );


                /*
                 * Nobody has uploaded a photo.
                 */
                if (photoPaths.length === 0) {

                    const profilesWithoutPhotos =
                        rawProfiles.map(
                            (profile) => ({
                                ...profile,
                                photo_url: null,
                            })
                        );


                    setProfiles(
                        profilesWithoutPhotos
                    );

                    return;
                }


                /*
                 * STEP 3:
                 * Generate signed URLs in ONE request.
                 *
                 * 300 seconds = 5 minutes.
                 */
                const {
                    data: signedUrls,
                    error: signedUrlsError,
                } = await supabase.storage
                    .from('profile-photos')
                    .createSignedUrls(
                        photoPaths,
                        300
                    );


                /*
                 * If photo loading fails,
                 * don't break Discovery.
                 *
                 * Show the profiles without photos.
                 */
                if (signedUrlsError) {

                    console.error(
                        'Signed URL error:',
                        signedUrlsError
                    );


                    const fallbackProfiles =
                        rawProfiles.map(
                            (profile) => ({
                                ...profile,
                                photo_url: null,
                            })
                        );


                    setProfiles(
                        fallbackProfiles
                    );

                    return;
                }


                /*
                 * STEP 4:
                 * Create a lookup:
                 *
                 * photo_path → signed URL
                 */
                const photoUrlMap =
                    new Map<string, string>();


                signedUrls?.forEach(
                    (signedFile) => {

                        if (
                            signedFile.path &&
                            signedFile.signedUrl
                        ) {

                            photoUrlMap.set(
                                signedFile.path,
                                signedFile.signedUrl
                            );

                        }

                    }
                );


                /*
                 * STEP 5:
                 * Attach the correct temporary URL
                 * to each profile.
                 */
                const profilesWithUrls =
                    rawProfiles.map(
                        (profile) => {

                            let photoUrl:
                                string | null = null;


                            if (profile.photo_path) {

                                photoUrl =
                                    photoUrlMap.get(
                                        profile.photo_path
                                    ) ?? null;

                            }


                            return {
                                ...profile,
                                photo_url: photoUrl,
                            };

                        }
                    );


                setProfiles(
                    profilesWithUrls
                );


            } catch (error: any) {

                console.error(
                    'Discovery error:',
                    error
                );


                Alert.alert(
                    'Could not load people',
                    error.message ??
                    'Something went wrong.'
                );


            } finally {

                setLoading(false);

            }

        }


        loadDiscoveryProfiles();


    }, [eventId]);


    /*
     * Send a Like to another user.
     */
    async function handleLike(
        targetUserId: string
    ) {

        if (!eventId) {

            Alert.alert(
                'Missing event',
                'Could not determine the current event.'
            );

            return;
        }


        try {

            const {
                data,
                error,
            } = await supabase.rpc(
                'send_like',
                {
                    p_event_id: eventId,
                    p_target_user_id:
                        targetUserId,
                }
            );


            if (error) {
                throw error;
            }


            console.log(
                'Like result:',
                data
            );


            /*
             * send_like() tells us whether
             * this Like created a match.
             */
            if (data?.match_created) {

                Alert.alert(
                    "It's a match! 🎉",
                    'You both liked each other.'
                );

            } else {

                Alert.alert(
                    'Interest sent ❤️',
                    'They can now see that you are interested.'
                );

            }


            /*
             * Remove the person from the
             * current Discovery list.
             */
            setProfiles(
                (currentProfiles) =>
                    currentProfiles.filter(
                        (profile) =>
                            profile.user_id !==
                            targetUserId
                    )
            );


        } catch (error: any) {

            console.error(
                'Like error:',
                error
            );


            Alert.alert(
                'Could not send like',
                error.message ??
                'Something went wrong.'
            );

        }

    }


    /*
     * Render one Discovery profile.
     */
    function renderProfile({
        item,
    }: {
        item: ProfileWithUrl;
    }) {

        return (

            <View style={styles.card}>

                {item.photo_url ? (

                    <Image
                        source={item.photo_url}
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
                                styles.photoPlaceholderText
                            }
                        >
                            No Photo
                        </Text>

                    </View>

                )}


                <View
                    style={styles.cardContent}
                >

                    <Text style={styles.name}>

                        {item.first_name},
                        {' '}
                        {item.age}

                    </Text>


                    {item.about_me ? (

                        <Text style={styles.about}>
                            {item.about_me}
                        </Text>

                    ) : null}


                    <TouchableOpacity
                        style={styles.likeButton}
                        onPress={() =>
                            handleLike(
                                item.user_id
                            )
                        }
                    >

                        <Text
                            style={
                                styles.likeButtonText
                            }
                        >
                            ❤️ Like
                        </Text>

                    </TouchableOpacity>

                </View>

            </View>

        );

    }


    /*
     * Loading screen.
     */
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
                    Loading people...
                </Text>

            </View>

        );

    }


    return (

        <View style={styles.container}>


            {/* HEADER */}

            <View style={styles.headerRow}>


                {/* LEFT SIDE */}

                <View>

                    <Text style={styles.title}>
                        Discover
                    </Text>

                    <Text style={styles.subtitle}>
                        People in this Social Room
                    </Text>

                </View>


                {/* RIGHT SIDE - LIKES BUTTON */}

                <View style={styles.headerActions}>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() =>
                            router.push({
                                pathname: '/likes',
                                params: {
                                    eventId,
                                },
                            })
                        }
                    >
                        <Text
                            style={
                                styles.headerButtonText
                            }
                        >
                            ❤️ Likes
                        </Text>
                    </TouchableOpacity>


                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() =>
                            router.push({
                                pathname: '/matches',
                                params: {
                                    eventId,
                                },
                            })
                        }
                    >
                        <Text
                            style={
                                styles.headerButtonText
                            }
                        >
                            Matches
                        </Text>
                    </TouchableOpacity>

                </View>


            </View>


            {/* DISCOVERY CONTENT */}

            {profiles.length === 0 ? (

                <View
                    style={
                        styles.emptyContainer
                    }
                >

                    <Text
                        style={styles.emptyTitle}
                    >
                        No one here yet
                    </Text>

                    <Text
                        style={styles.emptyText}
                    >
                        More people may join soon.
                    </Text>

                </View>

            ) : (

                <FlatList
                    data={profiles}

                    keyExtractor={
                        (item) =>
                            item.user_id
                    }

                    renderItem={
                        renderProfile
                    }

                    showsVerticalScrollIndicator={
                        false
                    }

                    contentContainerStyle={
                        styles.listContent
                    }

                    initialNumToRender={4}

                    maxToRenderPerBatch={4}

                    windowSize={5}

                    removeClippedSubviews={
                        true
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
            alignItems: 'center',
            justifyContent:
                'center',
        },


        loadingText: {
            color: '#999999',
            marginTop: 12,
        },


        /*
         * Header is now a row.
         *
         * Discover is on the left.
         * Likes is on the right.
         */
        headerRow: {
            flexDirection: 'row',
            justifyContent:
                'space-between',
            alignItems: 'center',
            marginBottom: 20,
        },


        title: {
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: '700',
        },


        subtitle: {
            color: '#888888',
            marginTop: 6,
        },


        /*
         * NEW LIKES BUTTON
         */
        likesHeaderButton: {
            backgroundColor:
                '#18181F',

            borderWidth: 1,

            borderColor:
                '#2A2A33',

            paddingVertical: 10,

            paddingHorizontal: 16,

            borderRadius: 22,
        },


        likesHeaderText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
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
            height: 420,
            backgroundColor:
                '#222222',
        },


        photoPlaceholder: {
            width: '100%',
            height: 420,

            backgroundColor:
                '#222222',

            alignItems: 'center',

            justifyContent:
                'center',
        },


        photoPlaceholderText: {
            color: '#777777',
        },


        cardContent: {
            padding: 20,
        },


        name: {
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '700',
        },


        about: {
            color: '#AAAAAA',
            fontSize: 15,
            lineHeight: 21,
            marginTop: 10,
        },


        likeButton: {
            backgroundColor:
                '#FF3B81',

            borderRadius: 28,

            paddingVertical: 14,

            alignItems: 'center',

            marginTop: 20,
        },


        likeButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '700',
        },


        emptyContainer: {
            flex: 1,

            alignItems: 'center',

            justifyContent:
                'center',

            paddingBottom: 80,
        },


        emptyTitle: {
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: '700',
        },


        emptyText: {
            color: '#888888',
            marginTop: 8,
        },

        headerActions: {
            flexDirection: 'row',
            gap: 8,
          },
          
          headerButton: {
            backgroundColor:
              '#18181F',
          
            borderWidth: 1,
          
            borderColor:
              '#2A2A33',
          
            paddingVertical: 9,
          
            paddingHorizontal: 12,
          
            borderRadius: 20,
          },
          
          headerButtonText: {
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: '600',
          },

    });