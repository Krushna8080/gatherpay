import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, KeyboardAvoidingView, Platform, Dimensions, SafeAreaView } from 'react-native';
import { GiftedChat, IMessage, Send, User, Bubble, InputToolbar, Composer, Day, Message } from 'react-native-gifted-chat';
import { IconButton, Text } from 'react-native-paper';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, elevation } from '../theme';

interface GroupChatProps {
  groupId: string;
}

interface ChatMessage extends IMessage {
  image?: string;
}

const MESSAGES_LIMIT = 50;

export default function GroupChat({ groupId }: GroupChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuth();
  const { height: windowHeight } = Dimensions.get('window');

  useEffect(() => {
    if (!groupId || !user) return;

    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: ChatMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          text: data.text,
          createdAt: data.createdAt?.toDate() || new Date(),
          user: {
            _id: data.userId,
            name: data.userName || 'Unknown User',
          } as User,
          image: data.image,
        };
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [groupId, user]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!user || !groupId) return;

    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const message = newMessages[0];

      await addDoc(messagesRef, {
        text: message.text,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || user.phoneNumber,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [groupId, user]);

  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        left: {
          backgroundColor: colors.surfaceVariant,
          borderRadius: 16,
          borderBottomLeftRadius: 4,
          padding: 4,
          marginBottom: 4,
          marginLeft: 8,
          ...elevation.small,
        },
        right: {
          backgroundColor: colors.primary,
          borderRadius: 16,
          borderBottomRightRadius: 4,
          padding: 4,
          marginBottom: 4,
          marginRight: 8,
          ...elevation.small,
        },
      }}
      textStyle={{
        left: {
          color: colors.text,
          fontSize: 15,
          lineHeight: 20,
          marginHorizontal: 8,
          marginVertical: 4,
        },
        right: {
          color: colors.background,
          fontSize: 15,
          lineHeight: 20,
          marginHorizontal: 8,
          marginVertical: 4,
        },
      }}
    />
  );

  const renderMessage = (props: any) => (
    <Message
      {...props}
      containerStyle={{
        left: { marginVertical: 4 },
        right: { marginVertical: 4 },
      }}
    />
  );

  const renderDay = (props: any) => (
    <Day
      {...props}
      textStyle={{
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
      }}
      containerStyle={{
        marginVertical: 16,
      }}
    />
  );

  const renderSend = (props: any) => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <View style={styles.sendButton}>
        <IconButton
          icon="send"
          size={24}
          iconColor={colors.primary}
        />
      </View>
    </Send>
  );

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
      primaryStyle={styles.inputPrimary}
    />
  );

  const renderComposer = (props: any) => (
    <Composer
      {...props}
      textInputStyle={styles.composer}
      placeholder="Type a message..."
      placeholderTextColor={colors.placeholder}
    />
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <GiftedChat
            messages={messages}
            onSend={messages => onSend(messages)}
            user={{
              _id: user.uid,
              name: user.displayName || user.phoneNumber || '',
            }}
            renderMessage={renderMessage}
            renderBubble={renderBubble}
            renderDay={renderDay}
            renderInputToolbar={renderInputToolbar}
            renderComposer={renderComposer}
            renderSend={renderSend}
            alwaysShowSend
            renderAvatar={null}
            showUserAvatar={false}
            renderUsernameOnMessage
            parsePatterns={(linkStyle) => [
              { 
                type: 'url', 
                style: { ...linkStyle, color: colors.primary }, 
                onPress: (url: string) => Linking.openURL(url) 
              },
              { 
                type: 'phone', 
                style: { ...linkStyle, color: colors.primary }, 
                onPress: (phone: string) => Linking.openURL(`tel:${phone}`) 
              },
            ]}
            maxComposerHeight={100}
            minComposerHeight={44}
            listViewProps={{
              style: styles.listView,
              contentContainerStyle: styles.listViewContent,
              showsVerticalScrollIndicator: false,
              bounces: true,
              inverted: true,
            }}
            textInputProps={{
              style: styles.textInput,
              multiline: true,
              maxHeight: 100,
              selectionColor: colors.primary,
            }}
            bottomOffset={Platform.OS === 'ios' ? 90 : 0}
            maxInputLength={1000}
            timeFormat="HH:mm"
            dateFormat="LL"
            infiniteScroll
          />
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  sendContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },
  inputToolbar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...elevation.small,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  composer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    minHeight: 44,
  },
  listView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listViewContent: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  textInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
}); 