import {
    useEffect,
    useState,
  } from 'react';
  
  import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
  } from 'react-native';
  
  import {
    useLocalSearchParams,
  } from 'expo-router';
  
  import { supabase } from '../lib/supabase';
  
  
  type ChatMessage = {
    id: string;
    match_id: string;
    sender_id: string;
    message_text: string;
    created_at: string;
    read_at: string | null;
    deleted_at: string | null;
  };
  
  
  export default function ChatScreen() {
  
    const {
      matchId,
      firstName,
    } =
      useLocalSearchParams<{
        matchId: string;
        firstName: string;
      }>();
  
  
    const [messages, setMessages] =
      useState<ChatMessage[]>([]);
  
    const [currentUserId, setCurrentUserId] =
      useState<string | null>(null);
  
    const [messageText, setMessageText] =
      useState('');
  
    const [loading, setLoading] =
      useState(true);
  
    const [sending, setSending] =
      useState(false);
  
  
    useEffect(() => {
  
      async function initializeChat() {
  
        if (!matchId) {
  
          Alert.alert(
            'Missing match',
            'No match was provided.'
          );
  
          setLoading(false);
  
          return;
        }
  
  
        try {
  
          setLoading(true);
  
  
          // Get the logged-in user.
          const {
            data: userData,
            error: userError,
          } =
            await supabase.auth.getUser();
  
  
          if (userError) {
            throw userError;
          }
  
  
          if (!userData.user) {
            throw new Error(
              'No authenticated user found.'
            );
          }
  
  
          setCurrentUserId(
            userData.user.id
          );
  
  
          // Load existing messages.
          const {
            data,
            error,
          } =
            await supabase.rpc(
              'get_messages',
              {
                p_match_id: matchId,
              }
            );
  
  
          console.log(
            'MESSAGES DATA:',
            data
          );
  
          console.log(
            'MESSAGES ERROR:',
            error
          );
  
  
          if (error) {
            throw error;
          }
  
  
          setMessages(
            data ?? []
          );
  
  
        } catch (
          error: any
        ) {
  
          console.error(
            'Initialize chat error:',
            error
          );
  
  
          Alert.alert(
            'Could not load chat',
            error.message ??
              'Something went wrong.'
          );
  
  
        } finally {
  
          setLoading(false);
  
        }
  
      }
  
  
      initializeChat();
  
    }, [matchId]);

    useEffect(() => {
        if (!matchId) {
          return;
        }
      
        const channel = supabase
          .channel(`chat:${matchId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `match_id=eq.${matchId}`,
            },
            (payload) => {

                console.log('REALTIME CALLBACK FIRED');
                console.log('FULL PAYLOAD:', payload);
                console.log('PAYLOAD.NEW:', payload.new);

              const newMessage =
                payload.new as ChatMessage;
      
              console.log(
                'REALTIME MESSAGE:',
                newMessage
              );
      
              setMessages(
                currentMessages => {
                  const alreadyExists =
                    currentMessages.some(
                      message =>
                        message.id ===
                        newMessage.id
                    );
      
                  if (alreadyExists) {
                    return currentMessages;
                  }
      
                  return [
                    ...currentMessages,
                    newMessage,
                  ];
                }
              );
            }
          )
          .subscribe(status => {
            console.log(
              'REALTIME STATUS:',
              status
            );
          });
      
        return () => {
          supabase.removeChannel(channel);
        };
      }, [matchId]);
  
  
  
    async function sendMessage() {
  
      const trimmedMessage =
        messageText.trim();
  
  
      if (
        !trimmedMessage ||
        !matchId ||
        sending
      ) {
        return;
      }
  
  
      try {
  
        setSending(true);
  
  
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'send_message',
            {
              p_match_id: matchId,
              p_message_text: trimmedMessage,
            }
          );
  
  
        console.log(
          'SEND MESSAGE DATA:',
          data
        );
  
        console.log(
          'SEND MESSAGE ERROR:',
          error
        );
  
  
        if (error) {
          throw error;
        }
  
  
        const newMessage =
          data?.[0];
  
  
        if (!newMessage) {
          return;
        }
  
  
        setMessages(
          currentMessages => [
            ...currentMessages,
            newMessage,
          ]
        );
  
  
        setMessageText('');
  
  
      } catch (
        error: any
      ) {
  
        console.error(
          'Send message error:',
          error
        );
  
  
        Alert.alert(
          'Could not send message',
          error.message ??
            'Something went wrong.'
        );
  
  
      } finally {
  
        setSending(false);
  
      }
  
    }
  
  
  
    function renderMessage({
      item,
    }: {
      item: ChatMessage;
    }) {
  
      const isMine =
        item.sender_id ===
        currentUserId;
  
  
      return (
  
        <View
          style={[
            styles.messageRow,
  
            isMine
              ? styles.myMessageRow
              : styles.otherMessageRow,
          ]}
        >
  
          <View
            style={[
              styles.messageBubble,
  
              isMine
                ? styles.myMessageBubble
                : styles.otherMessageBubble,
            ]}
          >
  
            <Text
              style={styles.messageText}
            >
              {item.message_text}
            </Text>
  
          </View>
  
        </View>
  
      );
  
    }
  
  
  
    if (loading) {
  
      return (
  
        <View
          style={styles.center}
        >
  
          <ActivityIndicator
            size="large"
            color="#FF3B81"
          />
  
          <Text
            style={styles.loadingText}
          >
            Loading chat...
          </Text>
  
        </View>
  
      );
  
    }
  
  
  
    return (
  
      <KeyboardAvoidingView
        style={styles.container}
  
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
  
        <View
          style={styles.header}
        >
  
          <Text
            style={styles.headerTitle}
          >
            {firstName ?? 'Chat'}
          </Text>
  
        </View>
  
  
        <FlatList
          data={messages}
  
          keyExtractor={
            item => item.id
          }
  
          renderItem={
            renderMessage
          }
  
          contentContainerStyle={
            styles.messageList
          }
  
          ListEmptyComponent={
  
            <View
              style={styles.empty}
            >
  
              <Text
                style={styles.emptyTitle}
              >
                Start the conversation
              </Text>
  
              <Text
                style={styles.emptyText}
              >
                You matched — say hello 👋
              </Text>
  
            </View>
  
          }
        />
  
  
        <View
          style={styles.inputContainer}
        >
  
          <TextInput
            style={styles.input}
  
            value={messageText}
  
            onChangeText={
              setMessageText
            }
  
            placeholder="Type a message..."
  
            placeholderTextColor="#777777"
  
            multiline
  
            maxLength={2000}
          />
  
  
          <TouchableOpacity
            style={[
              styles.sendButton,
  
              (
                !messageText.trim() ||
                sending
              ) &&
                styles.sendButtonDisabled,
            ]}
  
            disabled={
              !messageText.trim() ||
              sending
            }
  
            onPress={
              sendMessage
            }
          >
  
            <Text
              style={styles.sendButtonText}
            >
  
              {sending
                ? '...'
                : 'Send'}
  
            </Text>
  
          </TouchableOpacity>
  
        </View>
  
      </KeyboardAvoidingView>
  
    );
  
  }
  
  
  
  const styles =
    StyleSheet.create({
  
      container: {
        flex: 1,
        backgroundColor: '#0B0B0F',
      },
  
  
      center: {
        flex: 1,
        backgroundColor: '#0B0B0F',
        alignItems: 'center',
        justifyContent: 'center',
      },
  
  
      loadingText: {
        color: '#888888',
        marginTop: 12,
      },
  
  
      header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
  
        borderBottomWidth: 1,
        borderBottomColor: '#202027',
      },
  
  
      headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
      },
  
  
      messageList: {
        flexGrow: 1,
        padding: 16,
      },
  
  
      messageRow: {
        width: '100%',
        marginBottom: 10,
      },
  
  
      myMessageRow: {
        alignItems: 'flex-end',
      },
  
  
      otherMessageRow: {
        alignItems: 'flex-start',
      },
  
  
      messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
      },
  
  
      myMessageBubble: {
        backgroundColor: '#FF3B81',
      },
  
  
      otherMessageBubble: {
        backgroundColor: '#25252D',
      },
  
  
      messageText: {
        color: '#FFFFFF',
        fontSize: 16,
        lineHeight: 21,
      },
  
  
      empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
  
  
      emptyTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
      },
  
  
      emptyText: {
        color: '#888888',
        marginTop: 6,
      },
  
  
      inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
  
        paddingHorizontal: 12,
        paddingVertical: 10,
  
        borderTopWidth: 1,
        borderTopColor: '#202027',
  
        backgroundColor: '#111116',
      },
  
  
      input: {
        flex: 1,
  
        color: '#FFFFFF',
        backgroundColor: '#202027',
  
        borderRadius: 22,
  
        paddingHorizontal: 16,
        paddingVertical: 11,
  
        maxHeight: 120,
  
        fontSize: 16,
      },
  
  
      sendButton: {
        backgroundColor: '#FF3B81',
  
        marginLeft: 8,
  
        paddingHorizontal: 16,
        paddingVertical: 12,
  
        borderRadius: 22,
      },
  
  
      sendButtonDisabled: {
        opacity: 0.4,
      },
  
  
      sendButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
      },
  
    });