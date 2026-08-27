import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EventSpark</Text>

      <Text style={styles.subtitle}>
        Make the first move, without making the first move.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/signup')}
      >
        <Text style={styles.buttonText}>
          Get Started
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => router.push('/login')}
      >
        <Text style={styles.loginText}>
          Already have an account? Log In
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },

  subtitle: {
    color: '#A0A0AA',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },

  button: {
    marginTop: 32,
    backgroundColor: '#FF3B81',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  loginButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  
  loginText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
});