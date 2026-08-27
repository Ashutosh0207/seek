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


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  async function handleLogin() {
    if (!email.trim()) {
      Alert.alert(
        'Missing email',
        'Please enter your email.'
      );
      return;
    }

    if (!password) {
      Alert.alert(
        'Missing password',
        'Please enter your password.'
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          'No user was returned after login.'
        );
      }

      console.log(
        'Logged in user:',
        data.user.id
      );

      router.replace('/home');

    } catch (error: any) {
      console.error(
        'Login error:',
        error
      );

      Alert.alert(
        'Login failed',
        error.message ??
          'Please check your email and password.'
      );

    } finally {
      setLoading(false);
    }
  }


  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        Welcome back
      </Text>

      <Text style={styles.subtitle}>
        Log in to EventSpark
      </Text>


      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666666"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />


      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />


      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#FFFFFF"
          />
        ) : (
          <Text style={styles.buttonText}>
            Log In
          </Text>
        )}
      </TouchableOpacity>


      <TouchableOpacity
        style={styles.signupLink}
        onPress={() =>
          router.push('/signup')
        }
      >
        <Text style={styles.signupText}>
          Dont have an account? Sign up
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
    justifyContent: 'center',
  },


  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },


  subtitle: {
    color: '#888888',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 30,
  },


  input: {
    backgroundColor: '#18181F',
    color: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#25252E',
    marginBottom: 14,
  },


  button: {
    backgroundColor: '#FF3B81',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 8,
  },


  buttonDisabled: {
    opacity: 0.6,
  },


  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },


  signupLink: {
    alignItems: 'center',
    marginTop: 24,
  },


  signupText: {
    color: '#999999',
    fontSize: 14,
  },

});