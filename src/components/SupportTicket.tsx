import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, List, Portal, Modal, Chip, ActivityIndicator } from 'react-native-paper';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../theme';
import { MediaUploader } from '../utils/MediaUploader';
import { errorHandler } from '../utils/ErrorHandler';

interface SupportTicketProps {
  visible: boolean;
  onClose: () => void;
  orderId?: string;
  groupId?: string;
}

type TicketPriority = 'low' | 'medium' | 'high';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketMessage {
  id: string;
  text: string;
  timestamp: Date;
  userId: string;
  isStaff: boolean;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  orderId?: string;
  groupId?: string;
  userId: string;
  messages: TicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export function SupportTicket({ visible, onClose, orderId, groupId }: SupportTicketProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [message, setMessage] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (ticket) {
      const unsubscribe = subscribeToMessages();
      return () => unsubscribe();
    }
  }, [ticket?.id]);

  const subscribeToMessages = () => {
    if (!ticket) return () => {};

    const messagesRef = collection(db, 'support_tickets', ticket.id, 'messages');
    return onSnapshot(messagesRef, (snapshot) => {
      const newMessages: TicketMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          text: data.text,
          timestamp: data.timestamp.toDate(),
          userId: data.userId,
          isStaff: data.isStaff,
        });
      });
      setTicket(prev => prev ? {
        ...prev,
        messages: newMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      } : null);
    });
  };

  const handleCreateTicket = async () => {
    if (!user || !subject || !description) return;

    try {
      setLoading(true);
      
      const ticketData = {
        subject,
        description,
        priority,
        status: 'open' as TicketStatus,
        orderId,
        groupId,
        userId: user.uid,
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ticketRef = await addDoc(collection(db, 'support_tickets'), ticketData);
      
      // Add initial message
      await addDoc(collection(db, 'support_tickets', ticketRef.id, 'messages'), {
        text: description,
        timestamp: serverTimestamp(),
        userId: user.uid,
        isStaff: false,
      });

      const newTicket = {
        id: ticketRef.id,
        ...ticketData,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setTicket(newTicket);
      setSubject('');
      setDescription('');
      setMessage('');
    } catch (error) {
      console.error('Error creating support ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !ticket || !message.trim()) return;

    try {
      setLoading(true);
      
      await addDoc(collection(db, 'support_tickets', ticket.id, 'messages'), {
        text: message,
        timestamp: serverTimestamp(),
        userId: user.uid,
        isStaff: false,
      });

      await updateDoc(doc(db, 'support_tickets', ticket.id), {
        updatedAt: serverTimestamp(),
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;

    try {
      setLoading(true);
      
      await updateDoc(doc(db, 'support_tickets', ticket.id), {
        status: 'closed',
        updatedAt: serverTimestamp(),
      });

      onClose();
    } catch (error) {
      console.error('Error closing ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: TicketPriority): string => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.disabled;
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <ScrollView>
          <Text variant="headlineMedium" style={styles.title}>Customer Support</Text>

          {!ticket ? (
            // Create new ticket form
            <Card style={styles.card}>
              <Card.Content>
                <TextInput
                  mode="outlined"
                  label="Subject"
                  value={subject}
                  onChangeText={setSubject}
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  style={styles.input}
                />

                <Text variant="titleMedium" style={styles.sectionTitle}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {(['low', 'medium', 'high'] as TicketPriority[]).map((p) => (
                    <Button
                      key={p}
                      mode={priority === p ? 'contained' : 'outlined'}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.priorityButton,
                        { borderColor: getPriorityColor(p) },
                        priority === p && { backgroundColor: getPriorityColor(p) },
                      ]}
                    >
                      {p.toUpperCase()}
                    </Button>
                  ))}
                </View>

                <Button
                  mode="contained"
                  onPress={handleCreateTicket}
                  loading={loading}
                  disabled={!subject || !description || loading}
                  style={styles.submitButton}
                >
                  Create Ticket
                </Button>
              </Card.Content>
            </Card>
          ) : (
            // Ticket conversation view
            <>
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium">{ticket.subject}</Text>
                  <Text variant="bodySmall" style={styles.ticketInfo}>
                    Ticket #{ticket.id.slice(0, 8)} • {ticket.status.toUpperCase()} •{' '}
                    {ticket.priority.toUpperCase()}
                  </Text>
                </Card.Content>
              </Card>

              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Messages</Text>
                  
                  {ticket.messages.map((msg) => (
                    <List.Item
                      key={msg.id}
                      title={msg.text}
                      description={msg.timestamp.toLocaleString()}
                      left={props => (
                        <List.Icon
                          {...props}
                          icon={msg.isStaff ? 'account-tie' : 'account'}
                          color={msg.isStaff ? colors.primary : undefined}
                        />
                      )}
                    />
                  ))}

                  <TextInput
                    mode="outlined"
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type your message..."
                    style={styles.input}
                  />

                  <View style={styles.actions}>
                    <Button
                      mode="contained"
                      onPress={handleSendMessage}
                      loading={loading}
                      disabled={!message.trim() || loading}
                      style={styles.messageButton}
                    >
                      Send
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={handleCloseTicket}
                      disabled={loading || ticket.status === 'closed'}
                      style={styles.closeButton}
                    >
                      Close Ticket
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.background,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 8,
    maxHeight: '80%',
  },
  title: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  priorityButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  ticketInfo: {
    marginTop: spacing.xs,
    color: colors.disabled,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  messageButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  closeButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
}); 