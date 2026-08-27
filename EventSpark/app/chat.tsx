import {
    View,
    Text,
    StyleSheet,
  } from 'react-native';
  
  import {
    useLocalSearchParams,
  } from 'expo-router';
  
  
  export default function ChatScreen() {
  
    const {
      matchId,
      firstName,
    } =
      useLocalSearchParams<{
        matchId: string;
        firstName: string;
      }>();
  
  
    return (
  
      <View
        style={styles.container}
      >
  
        <Text
          style={styles.title}
        >
          Chat with {firstName}
        </Text>
  
  
        <Text
          style={styles.text}
        >
          Match ID:
        </Text>
  
  
        <Text
          style={styles.matchId}
        >
          {matchId}
        </Text>
  
  
        <Text
          style={styles.text}
        >
          Chat comes next.
        </Text>
  
      </View>
  
    );
  
  }
  
  
  const styles =
    StyleSheet.create({
  
      container: {
        flex: 1,
  
        backgroundColor:
          '#0B0B0F',
  
        alignItems:
          'center',
  
        justifyContent:
          'center',
  
        padding: 24,
      },
  
  
      title: {
        color:
          '#FFFFFF',
  
        fontSize: 26,
  
        fontWeight:
          '700',
      },
  
  
      text: {
        color:
          '#888888',
  
        marginTop: 16,
      },
  
  
      matchId: {
        color:
          '#FF3B81',
  
        marginTop: 6,
  
        textAlign:
          'center',
      },
  
    });