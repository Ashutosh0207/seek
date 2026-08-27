import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { router } from 'expo-router';

import { supabase } from '../lib/supabase';

export default function AddPhotoScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [mimeType, setMimeType] =
    useState<string>('image/jpeg');

  const [fileExtension, setFileExtension] =
    useState<string>('jpg');

  const [loading, setLoading] = useState(false);

  async function chooseFromGallery() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'EventSpark needs access to your photos so you can select a profile picture.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const image = result.assets[0];

      setImageUri(image.uri);

      if (image.mimeType) {
        setMimeType(image.mimeType);
      }

      const extension =
        image.fileName?.split('.').pop()?.toLowerCase()
        ?? image.mimeType?.split('/').pop()
        ?? 'jpg';

      setFileExtension(extension);
    } catch (error) {
      console.error('Image picker error:', error);

      Alert.alert(
        'Error',
        'Could not open your photo gallery.'
      );
    }
  }

  async function takePhoto() {
    try {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Camera permission required',
          'EventSpark needs camera access so you can take a profile photo.'
        );

        return;
      }

      const result =
        await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const image = result.assets[0];

      setImageUri(image.uri);

      if (image.mimeType) {
        setMimeType(image.mimeType);
      }

      const extension =
        image.fileName?.split('.').pop()?.toLowerCase()
        ?? image.mimeType?.split('/').pop()
        ?? 'jpg';

      setFileExtension(extension);
    } catch (error) {
      console.error('Camera error:', error);

      Alert.alert(
        'Error',
        'Could not open the camera.'
      );
    }
  }

  async function uploadPhoto() {
    if (!imageUri) {
      Alert.alert(
        'Photo required',
        'Please choose or take a profile photo.'
      );

      return;
    }

    try {
      setLoading(true);

      /*
       * Get currently authenticated user.
       */
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

      /*
       * Convert the local phone image into binary data
       * that Supabase Storage can upload.
       */
      const response = await fetch(imageUri);

      const arrayBuffer =
        await response.arrayBuffer();

      /*
       * Every user gets their own folder.
       *
       * Example:
       *
       * profile-photos/
       *   573c...userUUID/
       *       profile.jpg
       */
      const filePath =
        `${user.id}/profile.${fileExtension}`;

      /*
       * Upload into our PRIVATE Supabase bucket.
       */
      const {
        error: uploadError,
      } = await supabase.storage
        .from('profile-photos')
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType: mimeType,
            upsert: true,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      /*
       * Store only the STORAGE PATH in PostgreSQL.
       *
       * We do NOT store a permanent public URL.
       */
      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          photo_path: filePath,
        })
        .eq(
          'user_id',
          user.id
        );

      if (profileError) {
        throw profileError;
      }

      Alert.alert(
        'Profile complete',
        'Your profile photo has been saved.'
      );

      router.replace('/home');
    } catch (error: any) {
      console.error(
        'Photo upload error:',
        error
      );

      Alert.alert(
        'Upload failed',
        error.message ??
          'Something went wrong while uploading your photo.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Add your photo
      </Text>

      <Text style={styles.subtitle}>
        Your photo helps people at the event
        recognize you.
      </Text>

      <View style={styles.photoContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.photo}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              Your Photo
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={takePhoto}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>
          Take Photo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={chooseFromGallery}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>
          Choose From Gallery
        </Text>
      </TouchableOpacity>

      {imageUri && (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            loading && styles.disabledButton,
          ]}
          onPress={uploadPhoto}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.primaryButtonText}>
              Continue
            </Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.privacyText}>
        Your photo is only available through
        EventSpark and will be shown according to
        your event participation settings.
      </Text>
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

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },

  subtitle: {
    color: '#999999',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 30,
  },

  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  photoPlaceholder: {
    width: 220,
    height: 280,
    backgroundColor: '#18181F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A33',
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoPlaceholderText: {
    color: '#666666',
    fontSize: 16,
  },

  photo: {
    width: 220,
    height: 280,
    borderRadius: 24,
  },

  secondaryButton: {
    backgroundColor: '#18181F',
    borderWidth: 1,
    borderColor: '#2A2A33',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#FF3B81',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },

  privacyText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
});