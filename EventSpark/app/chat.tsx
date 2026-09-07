import { useCallback, useEffect, useRef, useState } from 'react';

import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { colors, layout, radii, spacing, typography } from '@/theme';

type ChatMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  message_text: string;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

const MAX_CHAT_WIDTH = 760;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function keyExtractor(item: ChatMessage) {
  return item.id;
}

function appendUniqueMessage(
  currentMessages: ChatMessage[],
  newMessage: ChatMessage
) {
  if (currentMessages.some((message) => message.id === newMessage.id)) {
    return currentMessages;
  }

  return [...currentMessages, newMessage];
}

function formatMessageTime(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDayLabel(timestamp: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export default function ChatScreen() {
  const { matchId, firstName } = useLocalSearchParams<{
    matchId: string;
    firstName: string;
  }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');

  const bubbleMaxWidth = Math.min(width * 0.78, 520);

  const initializeChat = useCallback(async () => {
    if (!matchId) {
      setLoadError('No match was provided. Return to Matches and try again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!userData.user) {
        throw new Error('No authenticated user found.');
      }

      const { data, error } = await supabase.rpc('get_messages', {
        p_match_id: matchId,
      });

      if (error) {
        throw error;
      }

      setCurrentUserId(userData.user.id);
      setMessages(data ?? []);
    } catch (error: unknown) {
      console.error('Initialize chat error:', error);
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void initializeChat();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [initializeChat]);

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
          const newMessage = payload.new as ChatMessage;
          setMessages((currentMessages) =>
            appendUniqueMessage(currentMessages, newMessage)
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setConnectionState('disconnected');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || !matchId || sending) {
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.rpc('send_message', {
        p_match_id: matchId,
        p_message_text: trimmedMessage,
      });

      if (error) {
        throw error;
      }

      const newMessage = data?.[0] as ChatMessage | undefined;

      if (!newMessage) {
        return;
      }

      setMessages((currentMessages) =>
        appendUniqueMessage(currentMessages, newMessage)
      );
      setMessageText('');
      scrollToLatest();
    } catch (error: unknown) {
      console.error('Send message error:', error);
      Alert.alert('Could not send message', getErrorMessage(error));
    } finally {
      setSending(false);
    }
  }, [matchId, messageText, scrollToLatest, sending]);

  const renderMessage = useCallback(
    ({ item, index }: ListRenderItemInfo<ChatMessage>) => {
      const isMine = item.sender_id === currentUserId;
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const showDayLabel =
        !previousMessage ||
        new Date(previousMessage.created_at).toDateString() !==
          new Date(item.created_at).toDateString();
      const isGrouped =
        previousMessage?.sender_id === item.sender_id && !showDayLabel;
      const timestamp = formatMessageTime(item.created_at);

      return (
        <>
          {showDayLabel ? (
            <View style={styles.dayRow}>
              <Text style={styles.dayLabel}>{formatDayLabel(item.created_at)}</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.messageRow,
              isMine ? styles.myMessageRow : styles.otherMessageRow,
              isGrouped ? styles.groupedMessageRow : styles.firstMessageRow,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                { maxWidth: bubbleMaxWidth },
                isMine ? styles.myMessageBubble : styles.otherMessageBubble,
              ]}
              accessibilityLabel={`${isMine ? 'You' : firstName ?? 'Match'} said: ${item.message_text}${timestamp ? ` at ${timestamp}` : ''}`}
            >
              <Text selectable style={styles.messageText}>
                {item.message_text}
              </Text>
              {timestamp ? (
                <Text style={[styles.timestamp, isMine && styles.myTimestamp]}>
                  {timestamp}
                </Text>
              ) : null}
            </View>
          </View>
        </>
      );
    },
    [bubbleMaxWidth, currentUserId, firstName, messages]
  );

  const screenTitle = firstName?.trim() || 'Chat';
  const canSend = messageText.trim().length > 0 && !sending;

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      {loading ? (
        <StateScreen
          bottomInset={insets.bottom}
          title="Loading conversation"
          message="Getting your messages ready…"
          loading
        />
      ) : loadError ? (
        <StateScreen
          bottomInset={insets.bottom}
          title="Couldn’t load this chat"
          message={loadError}
          onRetry={() => void initializeChat()}
          assertive
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        >
          {connectionState === 'disconnected' ? (
            <View style={styles.connectionBanner} accessibilityLiveRegion="polite">
              <Text style={styles.connectionText}>
                Live updates are reconnecting. You can still send messages.
              </Text>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            style={styles.messageList}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderMessage}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.messageListContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>✦</Text>
                </View>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptyText}>
                  You matched — say hello to {screenTitle}.
                </Text>
              </View>
            }
            onContentSizeChange={() => scrollToLatest(false)}
            onLayout={() => scrollToLatest(false)}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={11}
          />

          <View
            style={[
              styles.composerSurface,
              { paddingBottom: Math.max(insets.bottom, spacing[3]) },
            ]}
          >
            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={setMessageText}
                placeholder={`Message ${screenTitle}`}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={2000}
                textAlignVertical="center"
                accessibilityLabel={`Message ${screenTitle}`}
                accessibilityHint="Enter a message of up to 2000 characters"
                returnKeyType="default"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && canSend && styles.sendButtonPressed,
                  !canSend && styles.sendButtonDisabled,
                ]}
                disabled={!canSend}
                onPress={() => void sendMessage()}
                accessibilityRole="button"
                accessibilityLabel={sending ? 'Sending message' : 'Send message'}
                accessibilityState={{ disabled: !canSend, busy: sending }}
              >
                {sending ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

type StateScreenProps = {
  bottomInset: number;
  title: string;
  message: string;
  loading?: boolean;
  assertive?: boolean;
  onRetry?: () => void;
};

function StateScreen({
  bottomInset,
  title,
  message,
  loading = false,
  assertive = false,
  onRetry,
}: StateScreenProps) {
  return (
    <View
      style={[styles.stateScreen, { paddingBottom: bottomInset + spacing[6] }]}
      accessibilityLiveRegion={assertive ? 'assertive' : 'polite'}
    >
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Text style={styles.errorIconText}>!</Text>
        )}
      </View>
      <Text selectable style={styles.stateTitle}>{title}</Text>
      <Text selectable style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.sendButtonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try loading the conversation again"
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  connectionBanner: {
    alignItems: 'center',
    paddingHorizontal: layout.screenGutter,
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.secondarySoft,
  },
  connectionText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  messageList: {
    width: '100%',
    maxWidth: MAX_CHAT_WIDTH,
    alignSelf: 'center',
  },
  messageListContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[5],
  },
  dayRow: { alignItems: 'center', paddingVertical: spacing[4] },
  dayLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  messageRow: { width: '100%' },
  firstMessageRow: { paddingTop: spacing[2] },
  groupedMessageRow: { paddingTop: spacing[1] },
  myMessageRow: { alignItems: 'flex-end' },
  otherMessageRow: { alignItems: 'flex-start' },
  messageBubble: {
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  myMessageBubble: {
    borderBottomRightRadius: spacing[1],
    backgroundColor: colors.primary,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: spacing[1],
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceElevated,
  },
  messageText: { ...typography.body, color: colors.textPrimary },
  timestamp: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  myTimestamp: { color: 'rgba(250, 248, 252, 0.76)' },
  empty: {
    flex: 1,
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: layout.screenGutter,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  emptyIconText: { fontSize: 28, lineHeight: 34, color: colors.primary },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.supporting,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  composerSurface: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
  },
  composer: {
    width: '100%',
    maxWidth: MAX_CHAT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: layout.compactButtonHeight,
    maxHeight: 120,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  sendButton: {
    minWidth: 72,
    height: layout.compactButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  sendButtonPressed: { backgroundColor: colors.primaryPressed },
  sendButtonDisabled: { backgroundColor: colors.surfacePressed, opacity: 0.7 },
  sendButtonText: { ...typography.label, color: colors.textPrimary },
  stateScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: layout.screenGutter,
    backgroundColor: colors.background,
  },
  stateIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  errorIconText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.danger,
  },
  stateTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.supporting,
    maxWidth: 360,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 160,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginTop: spacing[2],
  },
  retryButtonText: { ...typography.button, color: colors.textPrimary },
});
