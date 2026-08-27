import {
    useCallback,
    useEffect,
    useState,
  } from 'react';
  
  import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
  } from 'react-native';
  
  import {
    router,
    useLocalSearchParams,
  } from 'expo-router';
  
  import { supabase } from '../lib/supabase';
  
  
  type EventData = {
    id: string;
    name: string;
    venue_name: string;
    start_at: string;
    end_at: string;
    status: string;
  };
  
  
  export default function EventPreviewScreen() {
  
    const { eventId } =
      useLocalSearchParams<{
        eventId: string;
      }>();
  
  
    const [event, setEvent] =
      useState<EventData | null>(null);
  
  
    const [loading, setLoading] =
      useState(true);
  
  
    const [joining, setJoining] =
      useState(false);
  
  
  
    const loadEvent = useCallback(
      async () => {
  
        if (!eventId) {
          Alert.alert(
            'Invalid QR',
            'No event ID was found.'
          );
  
          router.back();
          return;
        }
  
  
        try {
  
          setLoading(true);
  
  
          const {
            data,
            error,
          } = await supabase
            .from('events')
            .select(
              `
              id,
              name,
              venue_name,
              start_at,
              end_at,
              status
              `
            )
            .eq(
              'id',
              eventId
            )
            .single();
  
  
          if (error) {
            throw error;
          }
  
  
          setEvent(data);
  
        } catch (error: any) {
  
          console.error(
            'Load event error:',
            error
          );
  
  
          Alert.alert(
            'Event not found',
            'This QR code does not point to a valid event.'
          );
  
  
          router.back();
  
        } finally {
  
          setLoading(false);
  
        }
  
      },
      [eventId]
    );
  
  
  
    useEffect(() => {
  
      loadEvent();
  
    }, [loadEvent]);
  
  
  
    async function joinEvent() {
  
      if (!eventId) {
        return;
      }
  
  
      try {
  
        setJoining(true);
  
  
        const {
          data,
          error,
        } = await supabase.rpc(
          'join_event',
          {
            p_event_id: eventId,
          }
        );
  
  
        if (error) {
          throw error;
        }
  
  
        console.log(
          'Join event result:',
          data
        );
  
  
        router.replace({
          pathname: '/discover',
          params: {
            eventId,
          },
        });
  
      } catch (error: any) {
  
        console.error(
          'Join event error:',
          error
        );
  
  
        Alert.alert(
          'Could not join event',
          error.message ??
            'Something went wrong.'
        );
  
      } finally {
  
        setJoining(false);
  
      }
  
    }
  
  
  
    if (loading) {
  
      return (
        <View style={styles.center}>
          <ActivityIndicator
            color="#FF3B81"
            size="large"
          />
  
          <Text style={styles.loadingText}>
            Loading event...
          </Text>
        </View>
      );
  
    }
  
  
  
    if (!event) {
  
      return null;
  
    }
  
  
  
    return (
      <View style={styles.container}>
  
        <Text style={styles.label}>
          EVENT
        </Text>
  
  
        <Text style={styles.title}>
          {event.name}
        </Text>
  
  
        <Text style={styles.venue}>
          {event.venue_name}
        </Text>
  
  
        <View style={styles.statusBox}>
  
          <Text style={styles.statusLabel}>
            Social Room
          </Text>
  
          <Text style={styles.statusValue}>
            {event.status}
          </Text>
  
        </View>
  
  
        <Text style={styles.description}>
          By joining this Social Room, your
          EventSpark profile becomes visible
          to other participating users in
          this event.
        </Text>
  
  
        <Text style={styles.privacyText}>
          Your exact location, phone number
          and email are never shown.
        </Text>
  
  
        <TouchableOpacity
          style={[
            styles.button,
            joining &&
              styles.buttonDisabled,
          ]}
          onPress={joinEvent}
          disabled={joining}
        >
  
          {joining ? (
  
            <ActivityIndicator
              color="#FFFFFF"
            />
  
          ) : (
  
            <Text
              style={styles.buttonText}
            >
              Join Social Room
            </Text>
  
          )}
  
        </TouchableOpacity>
  
      </View>
    );
  }
  
  
  
  const styles = StyleSheet.create({
  
    container: {
      flex: 1,
      backgroundColor: '#0B0B0F',
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
  
  
    center: {
      flex: 1,
      backgroundColor: '#0B0B0F',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
  
    loadingText: {
      color: '#999999',
      marginTop: 12,
    },
  
  
    label: {
      color: '#FF3B81',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
    },
  
  
    title: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '700',
      marginTop: 8,
    },
  
  
    venue: {
      color: '#AAAAAA',
      fontSize: 18,
      marginTop: 8,
    },
  
  
    statusBox: {
      backgroundColor: '#18181F',
      borderRadius: 16,
      padding: 16,
      marginTop: 28,
    },
  
  
    statusLabel: {
      color: '#888888',
      fontSize: 13,
    },
  
  
    statusValue: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
      marginTop: 4,
      textTransform: 'capitalize',
    },
  
  
    description: {
      color: '#AAAAAA',
      fontSize: 15,
      lineHeight: 22,
      marginTop: 24,
    },
  
  
    privacyText: {
      color: '#666666',
      fontSize: 13,
      lineHeight: 20,
      marginTop: 12,
    },
  
  
    button: {
      backgroundColor: '#FF3B81',
      borderRadius: 28,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 32,
    },
  
  
    buttonDisabled: {
      opacity: 0.6,
    },
  
  
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 16,
    },
  
  });