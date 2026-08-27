import { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import { router } from 'expo-router';

import { supabase } from '../lib/supabase';

type OptionButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function OptionButton({
  label,
  selected,
  onPress,
}: OptionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionText,
          selected && styles.optionTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileSetupScreen() {
  const [firstName, setFirstName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [aboutMe, setAboutMe] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error);
      return;
    }

    if (!user) {
      Alert.alert(
        'Not logged in',
        'Please create an account or log in again.'
      );

      router.replace('/signup');
      return;
    }

    const savedFirstName =
      user.user_metadata?.first_name ?? '';

    setFirstName(savedFirstName);
  }

  async function saveProfile() {
    if (!firstName.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your first name.'
      );
      return;
    }

    if (!dateOfBirth.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your date of birth.'
      );
      return;
    }

    if (!gender) {
      Alert.alert(
        'Missing information',
        'Please select your gender.'
      );
      return;
    }

    if (!interestedIn) {
      Alert.alert(
        'Missing information',
        'Please select who you are interested in.'
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert(
          'Session expired',
          'Please log in again.'
        );

        router.replace('/signup');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: firstName.trim(),
          date_of_birth: dateOfBirth.trim(),
          gender,
          interested_in: interestedIn,
          about_me: aboutMe.trim() || null,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Profile created',
        'Your profile information has been saved.'
      );

      router.replace('/add-photo');
    } catch (error: any) {
      console.error('Profile error:', error);

      Alert.alert(
        'Profile creation failed',
        error.message ?? 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Create your profile
      </Text>

      <Text style={styles.subtitle}>
        This profile will be visible when you join an
        EventSpark Social Room.
      </Text>

      <Text style={styles.label}>
        First name
      </Text>

      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Alex"
        placeholderTextColor="#666666"
      />

      <Text style={styles.label}>
        Date of birth
      </Text>

      <TextInput
        style={styles.input}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="2000-12-25"
        placeholderTextColor="#666666"
        autoCapitalize="none"
      />

      <Text style={styles.helper}>
        Use format YYYY-MM-DD
      </Text>

      <Text style={styles.label}>
        Gender
      </Text>

      <View style={styles.optionsContainer}>
        <OptionButton
          label="Man"
          selected={gender === 'man'}
          onPress={() => setGender('man')}
        />

        <OptionButton
          label="Woman"
          selected={gender === 'woman'}
          onPress={() => setGender('woman')}
        />

        <OptionButton
          label="Non-binary"
          selected={gender === 'non_binary'}
          onPress={() => setGender('non_binary')}
        />
      </View>

      <Text style={styles.label}>
        Interested in
      </Text>

      <View style={styles.optionsContainer}>
        <OptionButton
          label="Men"
          selected={interestedIn === 'men'}
          onPress={() => setInterestedIn('men')}
        />

        <OptionButton
          label="Women"
          selected={interestedIn === 'women'}
          onPress={() => setInterestedIn('women')}
        />

        <OptionButton
          label="Everyone"
          selected={interestedIn === 'everyone'}
          onPress={() => setInterestedIn('everyone')}
        />
      </View>

      <Text style={styles.label}>
        About me
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.aboutInput,
        ]}
        value={aboutMe}
        onChangeText={setAboutMe}
        placeholder="Optional"
        placeholderTextColor="#666666"
        multiline
        maxLength={500}
      />

      <Text style={styles.characterCount}>
        {aboutMe.length}/500
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        onPress={saveProfile}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0B0B0F',
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },

  subtitle: {
    color: '#999999',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 30,
    lineHeight: 22,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
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
  },

  helper: {
    color: '#666666',
    fontSize: 12,
    marginTop: 6,
  },

  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },

  optionButton: {
    backgroundColor: '#18181F',
    borderWidth: 1,
    borderColor: '#2A2A33',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
  },

  optionButtonSelected: {
    backgroundColor: '#FF3B81',
    borderColor: '#FF3B81',
  },

  optionText: {
    color: '#AAAAAA',
    fontSize: 15,
    fontWeight: '500',
  },

  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  aboutInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  characterCount: {
    color: '#666666',
    textAlign: 'right',
    fontSize: 12,
    marginTop: 6,
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
    fontSize: 16,
    fontWeight: '700',
  },
});