import { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { router } from 'expo-router';

import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  async function createAccount() {
    // Basic validation
    if (!firstName.trim()) {
      Alert.alert('Missing information', 'Please enter your first name.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Missing information', 'Please enter your email.');
      return;
    }

    if (!password) {
      Alert.alert('Missing information', 'Please enter your password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password too short',
        'Password must be at least 6 characters.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
          },
        },
      });

      if (error) {
        Alert.alert('Sign up failed', error.message);
        return;
      }

      if (!data.user) {
        Alert.alert(
          'Something went wrong',
          'The account could not be created.'
        );
        return;
      }

      console.log('Created Supabase user:', data.user.id);

      Alert.alert(
        'Account created',
        'Your EventSpark account has been created.'
      );

      router.replace('/profile-setup');
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Unexpected error',
        'Something went wrong while creating your account.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        placeholder="First name"
        placeholderTextColor="#777"
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor="#777"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#777"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        onPress={createAccount}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Create Account
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
    padding: 24,
    justifyContent: 'center',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 30,
  },

  input: {
    backgroundColor: '#18181F',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
  },

  button: {
    backgroundColor: '#FF3B81',
    padding: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});