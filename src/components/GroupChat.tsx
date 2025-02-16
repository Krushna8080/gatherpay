import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { GiftedChat, IMessage, Send, User } from 'react-native-gifted-chat';
import { IconButton } from 'react-native-paper';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

interface GroupChatProps {
  groupId: string;
}

interface ChatMessage extends IMessage {
  image?: string;
}

export default function GroupChat({ groupId }: GroupChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!groupId || !user) return;

    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

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

  const renderSend = (props: any) => (
    <Send {...props}>
      <IconButton
        icon="send"
        size={24}
        iconColor={colors.primary}
        style={styles.sendButton}
      />
    </Send>
  );

  if (!user) return null;

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: user.uid,
          name: user.displayName || user.phoneNumber || '',
        }}
        renderSend={renderSend}
        placeholder="Type a message..."
        alwaysShowSend
        renderAvatar={null}
        showUserAvatar={false}
        renderUsernameOnMessage
        parsePatterns={(linkStyle) => [
          { 
            type: 'url', 
            style: linkStyle, 
            onPress: (url: string) => Linking.openURL(url) 
          },
          { 
            type: 'phone', 
            style: linkStyle, 
            onPress: (phone: string) => Linking.openURL(`tel:${phone}`) 
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sendButton: {
    marginBottom: 5,
    marginRight: 5,
  },
}); 