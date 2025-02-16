import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Divider, Portal, Modal, List, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing } from '../../theme';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { useWallet } from '../../contexts/WalletContext';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as Location from 'expo-location';

const MAX_GROUP_MEMBERS = 10;
const LEADER_REWARD_PERCENTAGE = 5; // 5% of order amount as reward
const MAX_GROUPS_PER_USER = 5;

type GroupDetailsScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'GroupDetails'>;
  route: RouteProp<MainStackParamList, 'GroupDetails'>;
};

interface GroupMember {
  id: string;
  phoneNumber: string;
  name?: string;
}

interface OrderItem {
  userId: string;
  items: string;
  amount: number;
  paid: boolean;
}

interface Order {
  id: string;
  groupId: string;
  leaderId: string;
  totalAmount: number;
  items: OrderItem[];
  screenshot: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
}

interface Group {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  memberCount: number;
  status: 'open' | 'ordering' | 'ordered' | 'completed' | 'cancelled';
  createdBy: string;
  members: { [key: string]: boolean };
  location: {
    latitude: number;
    longitude: number;
    lastUpdated?: Date;
  };
  lastUpdated: Date;
  currentOrder?: Order;
  previousOrders?: Order[];
}

export default function GroupDetailsScreen({
  navigation,
  route,
}: GroupDetailsScreenProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const { user } = useAuth();
  const { groupId } = route.params;
  const { balance, deductMoney, addRewardCoins } = useWallet();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToGroup();
    const unsubscribeMessages = subscribeToMessages();
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for this feature');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getLocation();
    return () => {
      unsubscribe();
      unsubscribeMessages();
    };
  }, [groupId]);

  const subscribeToGroup = () => {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(groupRef, async (snapshot) => {
      if (snapshot.exists()) {
        const groupData = { id: snapshot.id, ...snapshot.data() } as Group;
        setGroup(groupData);
        setIsLeader(groupData.createdBy === user?.uid);
        await fetchMembers(groupData.members);
      } else {
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
      }
      setLoading(false);
    });
  };

  const fetchMembers = async (membersMap: { [key: string]: boolean }) => {
    try {
      setMemberLoading(true);
      const memberIds = Object.keys(membersMap);
      const memberPromises = memberIds.map(id => getDoc(doc(db, 'users', id)));
      const memberDocs = await Promise.all(memberPromises);
      const memberData: GroupMember[] = memberDocs.map(doc => ({
        id: doc.id,
        phoneNumber: doc.data()?.phoneNumber,
        name: doc.data()?.name,
      }));
      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setMemberLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const messagesRef = collection(db, 'groups', groupId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const newMessages: IMessage[] = [];
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        newMessages.push({
          _id: doc.id,
          text: messageData.text,
          createdAt: messageData.createdAt?.toDate() || new Date(),
          user: {
            _id: messageData.user._id,
            name: messageData.user.name,
          },
        });
      });
      setMessages(newMessages);
    });
  };

  const handleJoinGroup = async () => {
    if (!group || !user) return;

    if (group.memberCount >= MAX_GROUP_MEMBERS) {
      Alert.alert('Error', 'Group is full');
      return;
    }

    if (group.status !== 'open') {
      Alert.alert('Error', 'Group is no longer accepting new members');
      return;
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const updatedMembers = { ...group.members, [user.uid]: true };
      await updateDoc(groupRef, {
        members: updatedMembers,
        memberCount: group.memberCount + 1,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !user) return;

    if (isLeader) {
      Alert.alert(
        'Cannot Leave Group',
        'As the group leader, you cannot leave the group. You can cancel the group instead.'
      );
      return;
    }

    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const groupRef = doc(db, 'groups', groupId);
              const updatedMembers = { ...group.members };
              delete updatedMembers[user.uid];
              await updateDoc(groupRef, {
                members: updatedMembers,
                memberCount: group.memberCount - 1,
                lastUpdated: serverTimestamp(),
              });
              navigation.goBack();
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCloseGroup = async () => {
    if (!group || !isLeader || !user) return;

    Alert.alert(
      'Close Group',
      'Are you sure you want to close this group? This will permanently delete all group data including chats and media.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Group',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Send a final system message
              const messagesRef = collection(db, 'groups', groupId, 'messages');
              await addDoc(messagesRef, {
                text: 'This group has been closed by the leader.',
                createdAt: serverTimestamp(),
                user: {
                  _id: 'system',
                  name: 'System'
                },
                system: true
              });

              // 2. Delete all messages
              const messagesSnapshot = await getDocs(messagesRef);
              const messageDeletions = messagesSnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
              );
              await Promise.all(messageDeletions);

              // 3. Delete any media files
              if (group.currentOrder?.screenshot) {
                const storage = getStorage();
                const screenshotRef = ref(storage, `orders/${groupId}/${group.currentOrder.id}.jpg`);
                try {
                  await deleteObject(screenshotRef);
                } catch (error) {
                  console.error('Error deleting screenshot:', error);
                }
              }

              // 4. Delete the group document
              const groupRef = doc(db, 'groups', groupId);
              await deleteDoc(groupRef);

              Alert.alert('Success', 'Group has been closed and deleted');
              navigation.goBack();
            } catch (error) {
              console.error('Error closing group:', error);
              Alert.alert('Error', 'Failed to close group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleStartOrder = async () => {
    if (!group || !isLeader) return;

    if (group.memberCount < 2) {
      Alert.alert('Error', 'Need at least 2 members to start an order');
      return;
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        status: 'ordering',
        lastUpdated: serverTimestamp(),
      });
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error starting order:', error);
      Alert.alert('Error', 'Failed to start order. Please try again.');
    }
  };

  const handleUploadScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled) {
        const { uri } = result.assets[0];
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const storage = getStorage();
        const screenshotRef = ref(storage, `orders/${groupId}/${Date.now()}.jpg`);
        await uploadBytes(screenshotRef, blob);
        const downloadURL = await getDownloadURL(screenshotRef);
        
        setScreenshot(downloadURL);
      }
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      Alert.alert('Error', 'Failed to upload screenshot. Please try again.');
    }
  };

  const handleConfirmOrder = async () => {
    if (!group || !user || !screenshot) {
      Alert.alert('Error', 'Please upload the order screenshot first');
      return;
    }

    try {
      // Create new order
      const orderRef = await addDoc(collection(db, 'orders'), {
        groupId,
        leaderId: user.uid,
        totalAmount: 0, // Will be updated when members add their items
        items: [],
        screenshot,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Update group status
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        status: 'ordered',
        currentOrder: {
          id: orderRef.id,
          screenshot,
          status: 'pending',
        },
        lastUpdated: serverTimestamp(),
      });

      setShowOrderModal(false);
      Alert.alert('Success', 'Order created successfully. Members can now add their items.');
    } catch (error) {
      console.error('Error confirming order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    }
  };

  const handleAddOrderItem = async () => {
    if (!group || !user || !group.currentOrder) return;

    try {
      const orderRef = doc(db, 'orders', group.currentOrder.id);
      await updateDoc(orderRef, {
        [`items.${user.uid}`]: {
          userId: user.uid,
          items: '', // Will be implemented with a form
          amount: 0, // Will be implemented with a form
          paid: false,
        },
      });
    } catch (error) {
      console.error('Error adding order item:', error);
      Alert.alert('Error', 'Failed to add your order. Please try again.');
    }
  };

  const handlePayOrder = async (amount: number) => {
    if (!group || !user || !group.currentOrder) return;

    if (balance < amount) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      // Deduct money from user's wallet
      await deductMoney(amount, `Payment for group order in ${group.name}`);

      // Mark user's order as paid
      const orderRef = doc(db, 'orders', group.currentOrder.id);
      await updateDoc(orderRef, {
        [`items.${user.uid}.paid`]: true,
      });

      // Check if all members have paid
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data() as Order;
      const allPaid = Object.values(orderData.items).every(item => item.paid);

      if (allPaid) {
        // Complete the order
        await updateDoc(orderRef, { status: 'completed' });
        await updateDoc(doc(db, 'groups', groupId), {
          status: 'completed',
          lastUpdated: serverTimestamp(),
        });

        // Award leader with reward coins
        if (isLeader) {
          const rewardAmount = Math.floor(orderData.totalAmount * (LEADER_REWARD_PERCENTAGE / 100));
          await addRewardCoins(rewardAmount);
          Alert.alert('Congratulations!', `You earned ${rewardAmount} reward coins for leading this group order!`);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    }
  };

  const onSend = useCallback(async (messages: IMessage[] = []) => {
    if (!user || !group) return;

    try {
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      const newMessage = messages[0];
      await addDoc(messagesRef, {
        text: newMessage.text,
        createdAt: serverTimestamp(),
        user: {
          _id: user.uid,
          name: user.phoneNumber || 'Unknown User'
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  }, [user, group, groupId]);

  const handleShareLocation = async () => {
    if (!userLocation || !group || !user) return;

    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        'location.lastShared': serverTimestamp(),
        'location.sharedBy': user.uid,
        'location.latitude': userLocation.coords.latitude,
        'location.longitude': userLocation.coords.longitude,
      });
      Alert.alert('Success', 'Location shared with the group');
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading group details...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.centered}>
        <Text>Group not found</Text>
      </View>
    );
  }

  const renderGroupStatus = () => {
    switch (group.status) {
      case 'open':
        return <Text style={[styles.status, styles.statusOpen]}>Open</Text>;
      case 'ordering':
        return <Text style={[styles.status, styles.statusOrdering]}>Ordering</Text>;
      case 'completed':
        return <Text style={[styles.status, styles.statusCompleted]}>Completed</Text>;
      case 'cancelled':
        return <Text style={[styles.status, styles.statusCancelled]}>Cancelled</Text>;
      default:
        return null;
    }
  };

  const renderOrderModal = () => (
    <Modal
      visible={showOrderModal}
      onDismiss={() => setShowOrderModal(false)}
      contentContainerStyle={styles.modal}
    >
      <Text variant="headlineSmall">Order Details</Text>
      {isLeader ? (
        <>
          <Text variant="bodyMedium" style={styles.modalText}>
            Please place the order on the delivery platform and upload the confirmation screenshot here.
          </Text>
          {screenshot ? (
            <Card style={styles.screenshotCard}>
              <Card.Cover source={{ uri: screenshot }} />
            </Card>
          ) : null}
          <Button
            mode="contained"
            onPress={handleUploadScreenshot}
            style={styles.modalButton}
          >
            {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
          </Button>
          {screenshot && (
            <Button
              mode="contained"
              onPress={handleConfirmOrder}
              style={styles.modalButton}
            >
              Confirm Order
            </Button>
          )}
        </>
      ) : (
        <Text variant="bodyMedium" style={styles.modalText}>
          Waiting for the group leader to place and confirm the order...
        </Text>
      )}
      <Button
        mode="outlined"
        onPress={() => setShowOrderModal(false)}
        style={styles.modalButton}
      >
        Close
      </Button>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.detailsContainer}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="headlineMedium">{group.name}</Text>
              {renderGroupStatus()}
            </View>
            <Text variant="bodyLarge" style={styles.description}>
              {group.description}
            </Text>
            <Divider style={styles.divider} />
            <View style={styles.stats}>
              <Text variant="bodyMedium">Members: {group.memberCount}/{MAX_GROUP_MEMBERS}</Text>
              <Text variant="bodyMedium">Target: ₹{group.targetAmount}</Text>
            </View>
            <Button
              mode="outlined"
              onPress={() => setShowMembersModal(true)}
              style={styles.membersButton}
            >
              View Members
            </Button>
          </Card.Content>
        </Card>

        {group.status === 'open' && !group.members[user!.uid] && (
          <Button
            mode="contained"
            onPress={handleJoinGroup}
            style={styles.actionButton}
          >
            Join Group
          </Button>
        )}

        {group.members[user!.uid] && !isLeader && (
          <Button
            mode="outlined"
            onPress={handleLeaveGroup}
            style={styles.actionButton}
            textColor={colors.error}
          >
            Leave Group
          </Button>
        )}

        {isLeader && group.status === 'open' && (
          <View style={styles.leaderActions}>
            <Button
              mode="contained"
              onPress={handleStartOrder}
              style={styles.actionButton}
            >
              Start Order
            </Button>
            <Button
              mode="outlined"
              onPress={handleCloseGroup}
              style={styles.actionButton}
              textColor={colors.warning}
            >
              Close Group
            </Button>
          </View>
        )}

        {group.members[user!.uid] && (
          <Button
            mode="outlined"
            onPress={handleShareLocation}
            style={styles.actionButton}
            icon="map-marker"
          >
            Share Location
          </Button>
        )}
      </ScrollView>

      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{
            _id: user!.uid,
            name: user!.phoneNumber || 'Unknown User',
          }}
          renderAvatar={null}
        />
      </View>

      <Portal>
        {renderOrderModal()}
        <Modal
          visible={showMembersModal}
          onDismiss={() => setShowMembersModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>Group Members</Text>
          {memberLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollView>
              {members.map((member) => (
                <List.Item
                  key={member.id}
                  title={member.name || 'Unnamed User'}
                  description={member.phoneNumber}
                  left={props => <List.Icon {...props} icon="account" />}
                  right={props => 
                    member.id === group.createdBy && 
                    <List.Icon {...props} icon="crown" color={colors.primary} />
                  }
                />
              ))}
            </ScrollView>
          )}
          <Button
            mode="outlined"
            onPress={() => setShowMembersModal(false)}
            style={styles.modalButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
  },
  detailsContainer: {
    flex: 1,
    padding: spacing.md,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  status: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusOpen: {
    backgroundColor: colors.primary + '20',
    color: colors.primary,
  },
  statusOrdering: {
    backgroundColor: colors.secondary + '20',
    color: colors.secondary,
  },
  statusCompleted: {
    backgroundColor: '#4CAF50' + '20',
    color: '#4CAF50',
  },
  statusCancelled: {
    backgroundColor: colors.error + '20',
    color: colors.error,
  },
  description: {
    marginTop: spacing.sm,
  },
  divider: {
    marginVertical: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  membersButton: {
    marginTop: spacing.md,
  },
  actionButton: {
    marginVertical: spacing.md,
  },
  leaderActions: {
    marginTop: spacing.sm,
  },
  chatContainer: {
    flex: 2,
    borderTopWidth: 1,
    borderTopColor: colors.disabled,
  },
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: spacing.md,
  },
  modalText: {
    marginVertical: spacing.md,
  },
  modalButton: {
    marginTop: spacing.md,
  },
  screenshotCard: {
    marginVertical: spacing.md,
  },
}); 