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
  
  import {
    useCallback,
    useEffect,
    useState,
  } from 'react';
  
  import {
    useRouter,
  } from 'expo-router';
  
  import * as ImagePicker from 'expo-image-picker';
  
  import {
    Image,
  } from 'expo-image';
  
  import {
    supabase,
  } from '../lib/supabase';
  
  
  type Profile = {
    user_id: string;
    first_name: string;
    gender: string;
    interested_in: string | null;
    about_me: string | null;
    photo_path: string | null;
  };
  
  
  const GENDER_OPTIONS = [
    'Male',
    'Female',
    'Other',
  ];
  
  
  const INTEREST_OPTIONS = [
    'Male',
    'Female',
    'Everyone',
  ];
  
  
  export default function EditProfileScreen() {
    const router = useRouter();
  
  
    const [loading, setLoading] =
      useState(true);
  
    const [saving, setSaving] =
      useState(false);
  
    const [photoUploading, setPhotoUploading] =
      useState(false);
  
    const [photoDeleting, setPhotoDeleting] =
      useState(false);
  
  
    const [firstName, setFirstName] =
      useState('');
  
    const [gender, setGender] =
      useState('');
  
    const [interestedIn, setInterestedIn] =
      useState('');
  
    const [aboutMe, setAboutMe] =
      useState('');
  
  
    const [photoPath, setPhotoPath] =
      useState<string | null>(null);
  
    const [photoUrl, setPhotoUrl] =
      useState<string | null>(null);
  
  
    /*
     * Creates a temporary signed URL
     * for a private profile photo.
     *
     * useCallback makes this function stable
     * between renders.
     */
    const loadSignedPhotoUrl =
      useCallback(
        async (
          path: string
        ) => {
          try {
            const {
              data,
              error,
            } = await supabase.storage
              .from(
                'profile-photos'
              )
              .createSignedUrl(
                path,
                300
              );
  
  
            if (error) {
              throw error;
            }
  
  
            setPhotoUrl(
              data.signedUrl
            );
  
          } catch (error) {
  
            console.error(
              'SIGNED URL ERROR:',
              error
            );
  
            setPhotoUrl(null);
          }
        },
        []
      );
  
  
    /*
     * Loads the current user's profile.
     *
     * Because this function uses
     * loadSignedPhotoUrl,
     * that function must appear
     * in the dependency array.
     */
    const loadProfile =
      useCallback(
        async () => {
          try {
            setLoading(true);
  
  
            const {
              data: {
                user,
              },
              error: userError,
            } =
              await supabase.auth.getUser();
  
  
            if (userError) {
              throw userError;
            }
  
  
            if (!user) {
              throw new Error(
                'You must be logged in.'
              );
            }
  
  
            const {
              data,
              error,
            } = await supabase
              .from('profiles')
              .select(`
                user_id,
                first_name,
                gender,
                interested_in,
                about_me,
                photo_path
              `)
              .eq(
                'user_id',
                user.id
              )
              .single();
  
  
            if (error) {
              throw error;
            }
  
  
            const profile =
              data as Profile;
  
  
            setFirstName(
              profile.first_name ?? ''
            );
  
            setGender(
              profile.gender ?? ''
            );
  
            setInterestedIn(
              profile.interested_in ?? ''
            );
  
            setAboutMe(
              profile.about_me ?? ''
            );
  
            setPhotoPath(
              profile.photo_path
            );
  
  
            if (
              profile.photo_path
            ) {
              await loadSignedPhotoUrl(
                profile.photo_path
              );
            } else {
              setPhotoUrl(null);
            }
  
          } catch (error) {
  
            console.error(
              'LOAD PROFILE ERROR:',
              error
            );
  
  
            Alert.alert(
              'Error',
              'Could not load your profile.'
            );
  
          } finally {
  
            setLoading(false);
          }
        },
        [
          loadSignedPhotoUrl,
        ]
      );
  
  
    /*
     * Run once when the screen opens.
     *
     * Technically the effect runs whenever
     * loadProfile changes, but useCallback
     * keeps loadProfile stable unless one of
     * its dependencies changes.
     */
    useEffect(() => {
      loadProfile();
    }, [loadProfile]);
  
  
    async function chooseAndUploadPhoto() {
      try {
        const permissionResult =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();
  
  
        if (
          !permissionResult.granted
        ) {
          Alert.alert(
            'Permission required',
            'EventSpark needs access to your photos so you can choose a profile picture.'
          );
  
          return;
        }
  
  
        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: [
                'images',
              ],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
  
  
        if (result.canceled) {
          return;
        }
  
  
        const asset =
          result.assets[0];
  
  
        if (!asset) {
          return;
        }
  
  
        await uploadPhoto(
          asset.uri,
          asset.mimeType ??
            'image/jpeg'
        );
  
      } catch (error) {
  
        console.error(
          'PHOTO PICKER ERROR:',
          error
        );
  
  
        Alert.alert(
          'Error',
          'Could not select the photo.'
        );
      }
    }
  
  
    async function uploadPhoto(
      uri: string,
      mimeType: string
    ) {
      try {
        setPhotoUploading(
          true
        );
  
  
        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();
  
  
        if (userError) {
          throw userError;
        }
  
  
        if (!user) {
          throw new Error(
            'You must be logged in.'
          );
        }
  
  
        /*
         * The image picker gives us
         * a local URI.
         *
         * We need the actual binary
         * contents of that file.
         */
        const response =
          await fetch(uri);
  
  
        const arrayBuffer =
          await response.arrayBuffer();
  
  
        /*
         * Decide the extension
         * based on MIME type.
         */
        let extension =
          'jpg';
  
  
        if (
          mimeType ===
          'image/png'
        ) {
          extension =
            'png';
        }
  
  
        if (
          mimeType ===
          'image/webp'
        ) {
          extension =
            'webp';
        }
  
  
        /*
         * New filename every time.
         *
         * This helps avoid showing
         * an old cached image.
         */
        const newPhotoPath =
          `${user.id}/profile-${Date.now()}.${extension}`;
  
  
        /*
         * Remember the existing
         * photo before replacing it.
         */
        const oldPhotoPath =
          photoPath;
  
  
        /*
         * Upload the new file first.
         */
        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              'profile-photos'
            )
            .upload(
              newPhotoPath,
              arrayBuffer,
              {
                contentType:
                  mimeType,
  
                upsert: false,
              }
            );
  
  
        if (uploadError) {
          throw uploadError;
        }
  
  
        /*
         * Now point the profile
         * at the new Storage file.
         */
        const {
          error:
            profileError,
        } =
          await supabase
            .from('profiles')
            .update({
              photo_path:
                newPhotoPath,
            })
            .eq(
              'user_id',
              user.id
            );
  
  
        if (
          profileError
        ) {
          /*
           * Upload succeeded,
           * DB update failed.
           *
           * Remove the new file so
           * it doesn't become orphaned.
           */
          await supabase.storage
            .from(
              'profile-photos'
            )
            .remove([
              newPhotoPath,
            ]);
  
  
          throw profileError;
        }
  
  
        /*
         * Update React state.
         */
        setPhotoPath(
          newPhotoPath
        );
  
  
        await loadSignedPhotoUrl(
          newPhotoPath
        );
  
  
        /*
         * Only after the new image is
         * safely stored and referenced
         * do we delete the old image.
         */
        if (
          oldPhotoPath &&
          oldPhotoPath !==
            newPhotoPath
        ) {
          const {
            error:
              deleteOldError,
          } =
            await supabase.storage
              .from(
                'profile-photos'
              )
              .remove([
                oldPhotoPath,
              ]);
  
  
          if (
            deleteOldError
          ) {
            console.warn(
              'OLD PHOTO DELETE ERROR:',
              deleteOldError
            );
          }
        }
  
  
        Alert.alert(
          'Photo updated',
          'Your profile photo has been updated.'
        );
  
      } catch (error) {
  
        console.error(
          'UPLOAD PHOTO ERROR:',
          error
        );
  
  
        Alert.alert(
          'Upload failed',
          'Could not update your profile photo.'
        );
  
      } finally {
  
        setPhotoUploading(
          false
        );
      }
    }
  
  
    function confirmDeletePhoto() {
      if (!photoPath) {
        return;
      }
  
  
      Alert.alert(
        'Delete photo?',
        'Your profile photo will be removed.',
        [
          {
            text:
              'Cancel',
  
            style:
              'cancel',
          },
  
          {
            text:
              'Delete',
  
            style:
              'destructive',
  
            onPress: () => {
              deletePhoto();
            },
          },
        ]
      );
    }
  
  
    async function deletePhoto() {
      try {
        if (!photoPath) {
          return;
        }
  
  
        setPhotoDeleting(
          true
        );
  
  
        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();
  
  
        if (userError) {
          throw userError;
        }
  
  
        if (!user) {
          throw new Error(
            'You must be logged in.'
          );
        }
  
  
        const pathToDelete =
          photoPath;
  
  
        /*
         * First remove the database
         * reference to the photo.
         */
        const {
          error:
            profileError,
        } =
          await supabase
            .from('profiles')
            .update({
              photo_path:
                null,
            })
            .eq(
              'user_id',
              user.id
            );
  
  
        if (
          profileError
        ) {
          throw profileError;
        }
  
  
        /*
         * Update the UI immediately.
         */
        setPhotoPath(
          null
        );
  
        setPhotoUrl(
          null
        );
  
  
        /*
         * Then remove the actual
         * Storage object.
         */
        const {
          error:
            storageError,
        } =
          await supabase.storage
            .from(
              'profile-photos'
            )
            .remove([
              pathToDelete,
            ]);
  
  
        if (
          storageError
        ) {
          console.warn(
            'PHOTO STORAGE DELETE ERROR:',
            storageError
          );
        }
  
  
        Alert.alert(
          'Photo deleted',
          'Your profile photo has been removed.'
        );
  
      } catch (error) {
  
        console.error(
          'DELETE PHOTO ERROR:',
          error
        );
  
  
        Alert.alert(
          'Delete failed',
          'Could not delete your profile photo.'
        );
  
      } finally {
  
        setPhotoDeleting(
          false
        );
      }
    }
  
  
    async function saveProfile() {
      try {
        const trimmedFirstName =
          firstName.trim();
  
        const trimmedAboutMe =
          aboutMe.trim();
  
  
        if (
          !trimmedFirstName
        ) {
          Alert.alert(
            'Missing name',
            'First name is required.'
          );
  
          return;
        }
  
  
        if (!gender) {
          Alert.alert(
            'Missing gender',
            'Please select your gender.'
          );
  
          return;
        }
  
  
        if (
          !interestedIn
        ) {
          Alert.alert(
            'Missing preference',
            'Please select who you are interested in.'
          );
  
          return;
        }
  
  
        setSaving(true);
  
  
        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();
  
  
        if (userError) {
          throw userError;
        }
  
  
        if (!user) {
          throw new Error(
            'You must be logged in.'
          );
        }
  
  
        const {
          data,
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              first_name:
                trimmedFirstName,
  
              gender,
  
              interested_in:
                interestedIn,
  
              about_me:
                trimmedAboutMe ||
                null,
            })
            .eq(
              'user_id',
              user.id
            )
            .select();
  
  
        if (error) {
          throw error;
        }
  
  
        console.log(
          'UPDATED PROFILE:',
          data
        );
  
  
        Alert.alert(
          'Profile updated',
          'Your changes have been saved.',
          [
            {
              text:
                'OK',
  
              onPress: () => {
                router.back();
              },
            },
          ]
        );
  
      } catch (error) {
  
        console.error(
          'UPDATE PROFILE ERROR:',
          error
        );
  
  
        Alert.alert(
          'Error',
          'Could not update your profile.'
        );
  
      } finally {
  
        setSaving(false);
      }
    }
  
  
    if (loading) {
      return (
        <View
          style={
            styles.center
          }
        >
          <ActivityIndicator
            size="large"
          />
  
          <Text
            style={
              styles.loadingText
            }
          >
            Loading profile...
          </Text>
        </View>
      );
    }
  
  
    const photoBusy =
      photoUploading ||
      photoDeleting;
  
  
    return (
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
      >
  
        <Text
          style={
            styles.title
          }
        >
          Edit Profile
        </Text>
  
  
        <Text
          style={
            styles.subtitle
          }
        >
          Update the information people
          see on your EventSpark profile.
        </Text>
  
  
        {/* PROFILE PHOTO */}
  
        <View
          style={
            styles.photoSection
          }
        >
  
          <Text
            style={
              styles.label
            }
          >
            Profile photo
          </Text>
  
  
          {photoUrl ? (
  
            <Image
              source={{
                uri:
                  photoUrl,
              }}
              style={
                styles.profilePhoto
              }
              contentFit="cover"
              cachePolicy="memory-disk"
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
  
  
          <TouchableOpacity
            style={[
              styles.photoButton,
  
              photoBusy &&
                styles.disabledButton,
            ]}
            disabled={
              photoBusy
            }
            onPress={
              chooseAndUploadPhoto
            }
          >
  
            {photoUploading ? (
  
              <ActivityIndicator
                color="#FFFFFF"
              />
  
            ) : (
  
              <Text
                style={
                  styles.photoButtonText
                }
              >
                {photoPath
                  ? 'Replace Photo'
                  : 'Add Photo'}
              </Text>
  
            )}
  
          </TouchableOpacity>
  
  
          {photoPath && (
  
            <TouchableOpacity
              style={[
                styles.deletePhotoButton,
  
                photoBusy &&
                  styles.disabledButton,
              ]}
              disabled={
                photoBusy
              }
              onPress={
                confirmDeletePhoto
              }
            >
  
              {photoDeleting ? (
  
                <ActivityIndicator />
  
              ) : (
  
                <Text
                  style={
                    styles.deletePhotoText
                  }
                >
                  Delete Photo
                </Text>
  
              )}
  
            </TouchableOpacity>
  
          )}
  
        </View>
  
  
        {/* FIRST NAME */}
  
        <View
          style={
            styles.field
          }
        >
  
          <Text
            style={
              styles.label
            }
          >
            First name
          </Text>
  
          <TextInput
            style={
              styles.input
            }
            value={
              firstName
            }
            onChangeText={
              setFirstName
            }
            placeholder="First name"
            placeholderTextColor="#666666"
            autoCapitalize="words"
            maxLength={50}
          />
  
        </View>
  
  
        {/* GENDER */}
  
        <View
          style={
            styles.field
          }
        >
  
          <Text
            style={
              styles.label
            }
          >
            Gender
          </Text>
  
  
          <View
            style={
              styles.optionsContainer
            }
          >
  
            {GENDER_OPTIONS.map(
              option => {
                const isSelected =
                  gender ===
                  option;
  
  
                return (
                  <TouchableOpacity
                    key={
                      option
                    }
                    style={[
                      styles.optionButton,
  
                      isSelected &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setGender(
                        option
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
  
                        isSelected &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
  
          </View>
  
        </View>
  
  
        {/* INTERESTED IN */}
  
        <View
          style={
            styles.field
          }
        >
  
          <Text
            style={
              styles.label
            }
          >
            Interested in
          </Text>
  
  
          <View
            style={
              styles.optionsContainer
            }
          >
  
            {INTEREST_OPTIONS.map(
              option => {
                const isSelected =
                  interestedIn ===
                  option;
  
  
                return (
                  <TouchableOpacity
                    key={
                      option
                    }
                    style={[
                      styles.optionButton,
  
                      isSelected &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setInterestedIn(
                        option
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
  
                        isSelected &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
  
          </View>
  
        </View>
  
  
        {/* ABOUT ME */}
  
        <View
          style={
            styles.field
          }
        >
  
          <Text
            style={
              styles.label
            }
          >
            About me
          </Text>
  
          <TextInput
            style={[
              styles.input,
              styles.aboutInput,
            ]}
            value={
              aboutMe
            }
            onChangeText={
              setAboutMe
            }
            placeholder="Tell people a little about yourself"
            placeholderTextColor="#666666"
            multiline
            maxLength={500}
          />
  
          <Text
            style={
              styles.characterCount
            }
          >
            {aboutMe.length}/500
          </Text>
  
        </View>
  
  
        {/* SAVE */}
  
        <TouchableOpacity
          style={[
            styles.saveButton,
  
            saving &&
              styles.disabledButton,
          ]}
          onPress={
            saveProfile
          }
          disabled={
            saving ||
            photoBusy
          }
        >
  
          {saving ? (
  
            <ActivityIndicator
              color="#FFFFFF"
            />
  
          ) : (
  
            <Text
              style={
                styles.saveButtonText
              }
            >
              Save Changes
            </Text>
  
          )}
  
        </TouchableOpacity>
  
  
        {/* CANCEL */}
  
        <TouchableOpacity
          style={
            styles.cancelButton
          }
          onPress={() =>
            router.back()
          }
          disabled={
            saving ||
            photoBusy
          }
        >
  
          <Text
            style={
              styles.cancelButtonText
            }
          >
            Cancel
          </Text>
  
        </TouchableOpacity>
  
      </ScrollView>
    );
  }
  
  
  const styles =
    StyleSheet.create({
  
      container: {
        flexGrow: 1,
        backgroundColor:
          '#0B0B0F',
        padding: 24,
        paddingBottom: 50,
      },
  
  
      center: {
        flex: 1,
        backgroundColor:
          '#0B0B0F',
        justifyContent:
          'center',
        alignItems:
          'center',
        padding: 24,
      },
  
  
      loadingText: {
        color:
          '#999999',
        marginTop: 12,
        fontSize: 15,
      },
  
  
      title: {
        color:
          '#FFFFFF',
        fontSize: 28,
        fontWeight:
          '700',
        marginBottom: 6,
      },
  
  
      subtitle: {
        color:
          '#888888',
        fontSize: 15,
        lineHeight: 21,
        marginBottom: 28,
      },
  
  
      photoSection: {
        alignItems:
          'center',
        marginBottom: 30,
      },
  
  
      profilePhoto: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginTop: 8,
        marginBottom: 16,
      },
  
  
      photoPlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
  
        backgroundColor:
          '#18181F',
  
        borderWidth: 1,
  
        borderColor:
          '#30303A',
  
        justifyContent:
          'center',
  
        alignItems:
          'center',
  
        marginTop: 8,
        marginBottom: 16,
      },
  
  
      photoPlaceholderText: {
        color:
          '#777777',
        fontSize: 15,
      },
  
  
      photoButton: {
        backgroundColor:
          '#FF3B81',
  
        borderRadius: 24,
  
        paddingHorizontal: 28,
        paddingVertical: 12,
  
        minWidth: 160,
  
        alignItems:
          'center',
      },
  
  
      photoButtonText: {
        color:
          '#FFFFFF',
  
        fontSize: 15,
  
        fontWeight:
          '700',
      },
  
  
      deletePhotoButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 20,
      },
  
  
      deletePhotoText: {
        color:
          '#FF6B6B',
  
        fontSize: 14,
  
        fontWeight:
          '600',
      },
  
  
      field: {
        marginBottom: 24,
      },
  
  
      label: {
        color:
          '#FFFFFF',
  
        fontSize: 14,
  
        fontWeight:
          '600',
  
        marginBottom: 10,
      },
  
  
      input: {
        color:
          '#FFFFFF',
  
        backgroundColor:
          '#18181F',
  
        borderWidth: 1,
  
        borderColor:
          '#25252E',
  
        borderRadius: 12,
  
        paddingHorizontal: 14,
  
        paddingVertical: 12,
  
        fontSize: 16,
      },
  
  
      optionsContainer: {
        flexDirection:
          'row',
  
        flexWrap:
          'wrap',
  
        gap: 10,
      },
  
  
      optionButton: {
        backgroundColor:
          '#18181F',
  
        borderWidth: 1,
  
        borderColor:
          '#30303A',
  
        borderRadius: 22,
  
        paddingHorizontal: 20,
  
        paddingVertical: 11,
      },
  
  
      optionButtonSelected: {
        backgroundColor:
          '#FF3B81',
  
        borderColor:
          '#FF3B81',
      },
  
  
      optionText: {
        color:
          '#AAAAAA',
  
        fontSize: 15,
  
        fontWeight:
          '500',
      },
  
  
      optionTextSelected: {
        color:
          '#FFFFFF',
  
        fontWeight:
          '700',
      },
  
  
      aboutInput: {
        minHeight: 120,
  
        textAlignVertical:
          'top',
      },
  
  
      characterCount: {
        color:
          '#777777',
  
        marginTop: 6,
  
        textAlign:
          'right',
  
        fontSize: 12,
      },
  
  
      saveButton: {
        marginTop: 10,
  
        backgroundColor:
          '#FF3B81',
  
        borderRadius: 28,
  
        paddingVertical: 15,
  
        alignItems:
          'center',
  
        justifyContent:
          'center',
  
        minHeight: 52,
      },
  
  
      disabledButton: {
        opacity: 0.5,
      },
  
  
      saveButtonText: {
        color:
          '#FFFFFF',
  
        fontSize: 16,
  
        fontWeight:
          '700',
      },
  
  
      cancelButton: {
        marginTop: 12,
  
        paddingVertical: 14,
  
        alignItems:
          'center',
      },
  
  
      cancelButtonText: {
        color:
          '#888888',
  
        fontSize: 16,
  
        fontWeight:
          '500',
      },
  
    });