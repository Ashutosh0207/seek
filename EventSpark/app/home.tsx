import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';

import { router } from 'expo-router';

import { supabase } from '../lib/supabase';

export default function HomeScreen() {

    async function handleLogout() {
        try {
            const { error } = await supabase.auth.signOut({
                scope: 'local',
            });

            if (error) {
                throw error;
            }

            router.replace('/');

        } catch (error: any) {
            console.error('Logout error:', error);

            Alert.alert(
                'Logout failed',
                'Could not reach Supabase. Please check your internet connection and try again.'
            );
        }
    }

    return (
        <View style={styles.container}>

            {/* Header */}

            <View style={styles.header}>
                <Text style={styles.logo}>
                    EventSpark
                </Text>

                <Text style={styles.tagline}>
                    Meet people at the event attending.
                </Text>
            </View>


            {/* Main Card */}

            <View style={styles.card}>

                <Text style={styles.cardTitle}>
                    Where are you tonight?
                </Text>

                <Text style={styles.cardText}>
                    Scan the QR code displayed at the
                    event to join its Social Room.
                </Text>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() =>
                        router.push('/join-event')
                    }
                >
                    <Text
                        style={styles.primaryButtonText}
                    >
                        Scan Event QR
                    </Text>
                </TouchableOpacity>

            </View>


            {/* Privacy information */}

            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>
                    Your privacy matters
                </Text>

                <Text style={styles.infoText}>
                    You only become visible when you
                    explicitly join an event Social Room.
                </Text>

                <Text style={styles.infoText}>
                    EventSpark never shows your exact
                    location or distance to other users.
                </Text>
            </View>

            {/* Edit Profile */}

            <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => {
                    router.push('/edit-profile');
                }}
            >
                <Text style={styles.editProfileText}>
                    Edit Profile
                </Text>
            </TouchableOpacity>


            {/* Logout */}

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
                <Text style={styles.logoutText}>
                    Log Out
                </Text>
            </TouchableOpacity>

        </View>
    );
}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#0B0B0F',
        paddingHorizontal: 24,
        paddingTop: 70,
    },


    header: {
        marginBottom: 40,
    },


    logo: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: '700',
    },


    tagline: {
        color: '#888888',
        fontSize: 15,
        marginTop: 8,
        lineHeight: 22,
    },


    card: {
        backgroundColor: '#18181F',
        borderRadius: 24,
        padding: 24,

        borderWidth: 1,
        borderColor: '#25252E',
    },


    cardTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
    },


    cardText: {
        color: '#999999',
        fontSize: 15,
        lineHeight: 22,
        marginTop: 10,
    },


    primaryButton: {
        backgroundColor: '#FF3B81',

        paddingVertical: 16,

        borderRadius: 28,

        alignItems: 'center',

        marginTop: 26,
    },


    primaryButtonText: {
        color: '#FFFFFF',

        fontSize: 16,

        fontWeight: '700',
    },


    infoBox: {
        marginTop: 28,

        padding: 20,

        backgroundColor: '#111117',

        borderRadius: 18,
    },


    infoTitle: {
        color: '#FFFFFF',

        fontSize: 16,

        fontWeight: '600',

        marginBottom: 10,
    },


    infoText: {
        color: '#777777',

        fontSize: 13,

        lineHeight: 20,

        marginBottom: 6,
    },


    logoutButton: {
        alignItems: 'center',

        marginTop: 'auto',

        marginBottom: 40,
    },


    logoutText: {
        color: '#777777',

        fontSize: 14,
    },

    editProfileButton: {
        marginTop: 20,
      
        paddingVertical: 15,
      
        borderRadius: 28,
      
        alignItems: 'center',
      
        borderWidth: 1,
      
        borderColor: '#FF3B81',
      },
      
      editProfileText: {
        color: '#FF3B81',
      
        fontSize: 16,
      
        fontWeight: '600',
      },

});