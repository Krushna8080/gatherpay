import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List, ActivityIndicator } from 'react-native-paper';
import { doc, updateDoc, onSnapshot, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../theme';
import { errorHandler } from '../utils/ErrorHandler';

interface DeliveryCommunicationProps {
  orderId: string;
  groupId: string;
  onStatusUpdate: (status: DeliveryStatus) => void;
}

type DeliveryStatus = 'preparing' | 'picked_up' | 'in_transit' | 'delivered' | 'delayed';

interface DeliveryUpdate {
  id: string;
  status: DeliveryStatus;
  message: string;
  timestamp: Date;
  userId: string;
  userName?: string;
}

export function DeliveryCommunication({ orderId, groupId, onStatusUpdate }: DeliveryCommunicationProps) {
  const [status, setStatus] = useState<DeliveryStatus>('preparing');
  const [message, setMessage] = useState('');
  const [updates, setUpdates] = useState<DeliveryUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!orderId || !user) return;

    const unsubscribe = subscribeToUpdates();
    return () => unsubscribe();
  }, [orderId, user]);

  useEffect(() => {
    loadInitialStatus();
  }, [orderId]);

  const loadInitialStatus = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        if (orderData.deliveryStatus) {
          setStatus(orderData.deliveryStatus);
        }
      }
    } catch (error: any) {
      errorHandler.handleError(error, 'DeliveryCommunication');
      setError('Failed to load delivery status');
    }
  };

  const subscribeToUpdates = () => {
    try {
      const updatesRef = collection(db, 'orders', orderId, 'delivery_updates');
      return onSnapshot(updatesRef, (snapshot) => {
        const newUpdates: DeliveryUpdate[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newUpdates.push({
            id: doc.id,
            status: data.status,
            message: data.message,
            timestamp: data.timestamp.toDate(),
            userId: data.userId,
            userName: data.userName,
          });
        });
        setUpdates(newUpdates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        setLoading(false);
        setError(null);
      }, (error) => {
        errorHandler.handleError(error, 'DeliveryCommunication');
        setError('Failed to load updates');
        setLoading(false);
      });
    } catch (error: any) {
      errorHandler.handleError(error, 'DeliveryCommunication');
      setError('Failed to subscribe to updates');
      setLoading(false);
      return () => {};
    }
  };

  const handleStatusUpdate = async (newStatus: DeliveryStatus) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update status');
      return;
    }

    try {
      setLoading(true);
      
      // Update order status
      await updateDoc(doc(db, 'orders', orderId), {
        deliveryStatus: newStatus,
        lastUpdated: serverTimestamp(),
      });

      // Add status update
      await addDoc(collection(db, 'orders', orderId, 'delivery_updates'), {
        status: newStatus,
        message: message || getDefaultMessage(newStatus),
        timestamp: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || user.phoneNumber,
      });

      setMessage('');
      setStatus(newStatus);
      onStatusUpdate(newStatus);
      setError(null);
    } catch (error: any) {
      errorHandler.handleError(error, 'DeliveryCommunication');
      setError('Failed to update status');
      Alert.alert('Error', 'Failed to update delivery status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultMessage = (status: DeliveryStatus): string => {
    switch (status) {
      case 'preparing':
        return 'Order is being prepared';
      case 'picked_up':
        return 'Order has been picked up by delivery partner';
      case 'in_transit':
        return 'Order is on the way';
      case 'delivered':
        return 'Order has been delivered successfully';
      case 'delayed':
        return 'Order is experiencing a delay';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: DeliveryStatus): string => {
    switch (status) {
      case 'preparing':
        return 'food';
      case 'picked_up':
        return 'bike';
      case 'in_transit':
        return 'truck-delivery';
      case 'delivered':
        return 'check-circle';
      case 'delayed':
        return 'clock-alert';
      default:
        return 'information';
    }
  };

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={() => {
            setLoading(true);
            setError(null);
            loadInitialStatus();
            subscribeToUpdates();
          }}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>Delivery Status</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
            {(['preparing', 'picked_up', 'in_transit', 'delivered'] as DeliveryStatus[]).map((s) => (
              <Button
                key={s}
                mode={status === s ? 'contained' : 'outlined'}
                onPress={() => handleStatusUpdate(s)}
                icon={getStatusIcon(s)}
                style={styles.statusButton}
                disabled={loading}
              >
                {s.replace('_', ' ').toUpperCase()}
              </Button>
            ))}
          </ScrollView>

          <Button
            mode="outlined"
            onPress={() => handleStatusUpdate('delayed')}
            icon="clock-alert"
            style={[styles.delayButton, status === 'delayed' && styles.delayButtonActive]}
            disabled={loading}
          >
            REPORT DELAY
          </Button>

          <TextInput
            mode="outlined"
            value={message}
            onChangeText={setMessage}
            placeholder="Add a message (optional)"
            style={styles.input}
            disabled={loading}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>Status Updates</Text>
          
          {loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : updates.length > 0 ? (
            updates.map((update) => (
              <List.Item
                key={update.id}
                title={update.message}
                description={`${update.userName || 'Unknown'} • ${update.timestamp.toLocaleString()}`}
                left={props => <List.Icon {...props} icon={getStatusIcon(update.status)} />}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No updates yet</Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.md,
  },
  statusScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  statusButton: {
    marginRight: spacing.sm,
  },
  delayButton: {
    marginBottom: spacing.md,
    borderColor: colors.error,
  },
  delayButtonActive: {
    backgroundColor: colors.error,
  },
  input: {
    backgroundColor: colors.background,
  },
  loading: {
    margin: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.disabled,
    marginVertical: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
  },
}); 