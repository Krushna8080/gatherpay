import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated } from 'react-native';
import { Text, Button, Divider, Portal, Modal, List, ActivityIndicator, IconButton } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, elevation } from '../../theme';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { GiftedChat, IMessage, Bubble, Send } from 'react-native-gifted-chat';
import { useWallet } from '../../contexts/WalletContext';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';

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
  const [showChat, setShowChat] = useState(true);
  const [contentHeight] = useState(new Animated.Value(1));
  const [showActions, setShowActions] = useState(true);
  const [actionsHeight] = useState(new Animated.Value(1));

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
    if (!user || !group) return;

    // Check if user is the group leader
    if (group.createdBy !== user.uid) {
      Alert.alert('Error', 'Only the group leader can close the group');
      return;
    }

    // Confirm with the user
    Alert.alert(
      'Close Group',
      'This will permanently delete all group data including chats and media. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Close Group',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              // Get all messages in the group
              const messagesRef = collection(db, 'groups', group.id, 'messages');
              const messagesSnapshot = await getDocs(messagesRef);

              // Start a batch write
              const batch = writeBatch(db);

              // Delete all messages
              messagesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
              });

              // Update group status to closed and record closing time
              const groupRef = doc(db, 'groups', group.id);
              batch.update(groupRef, {
                status: 'completed',
                closedAt: serverTimestamp(),
                closedBy: user.uid,
              });

              // Send a final system message
              const finalMessageRef = doc(collection(db, 'groups', group.id, 'messages'));
              batch.set(finalMessageRef, {
                _id: finalMessageRef.id,
                text: 'Group has been closed by the leader',
                createdAt: serverTimestamp(),
                system: true,
                user: {
                  _id: 'system',
                  name: 'System',
                },
              });

              // Commit the batch
              await batch.commit();

              // Navigate back to home screen
              navigation.replace('Home');
            } catch (error: any) {
              console.error('Error closing group:', error);
              Alert.alert('Error', 'Failed to close group. Please try again.');
            } finally {
              setLoading(false);
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

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: colors.primary,
          },
          left: {
            backgroundColor: colors.surfaceVariant,
          },
        }}
        textStyle={{
          right: {
            color: colors.background,
          },
          left: {
            color: colors.text,
          },
        }}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={styles.sendButton}>
          <MaterialCommunityIcons name="send" size={24} color={colors.primary} />
        </View>
      </Send>
    );
  };

  const renderOrderModal = () => {
    if (!group) return null;

    return (
      <Modal
        visible={showOrderModal}
        onDismiss={() => setShowOrderModal(false)}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.modalHeader}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Group Order Details
          </Text>
          <TouchableOpacity 
            onPress={() => setShowOrderModal(false)}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons 
              name="close" 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.orderContent}>
          {isLeader && group.status === 'ordering' && (
            <View style={styles.uploadSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Order Screenshot
              </Text>
              <Button
                mode="outlined"
                onPress={handleUploadScreenshot}
                icon="camera"
                style={styles.uploadButton}
              >
                Upload Screenshot
              </Button>
            </View>
          )}
        </ScrollView>
      </Modal>
    );
  };

  const toggleSections = () => {
    // Animate both sections
    Animated.parallel([
      Animated.timing(contentHeight, {
        toValue: showChat ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(actionsHeight, {
        toValue: showActions ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start();

    // Toggle visibility states
    setShowChat(!showChat);
    setShowActions(!showActions);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerPattern}>
            <View style={[styles.patternCircle, styles.circle1]} />
            <View style={[styles.patternCircle, styles.circle2]} />
            <View style={[styles.patternCircle, styles.circle3]} />
          </View>
          <View style={styles.headerContent}>
            <Text variant="headlineMedium" style={styles.groupName}>
              {group.name}
            </Text>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  <AnimatedNumber 
                    value={group.memberCount} 
                    formatter={(val) => `${val}/${MAX_GROUP_MEMBERS}`}
                  />
                </Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  <AnimatedNumber 
                    value={group.targetAmount} 
                    formatter={(val) => `₹${val}`}
                  />
                </Text>
                <Text style={styles.statLabel}>Target</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.actionsContainer,
            {
              maxHeight: actionsHeight.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '50%']
              })
            }
          ]}
        >
          {showActions && (
            <ScrollView style={styles.scrollContent}>
              <Card variant="secondary" style={styles.infoCard}>
                <View style={styles.cardHeader}>
                  <StatusBadge status={group.status} />
                  {isLeader && (
                    <MaterialCommunityIcons 
                      name="crown" 
                      size={24} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.description}>{group.description}</Text>
                <Divider style={styles.divider} />
                <View style={styles.actionButtons}>
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
                        style={[styles.actionButton, styles.startOrderButton]}
                      >
                        Start Order
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={handleCloseGroup}
                        style={[styles.actionButton, styles.closeGroupButton]}
                        textColor={colors.warning}
                      >
                        Close Group
                      </Button>
                    </View>
                  )}
                </View>
              </Card>
            </ScrollView>
          )}
        </Animated.View>

        <View style={styles.toggleContainer}>
          <Button 
            mode="contained"
            onPress={toggleSections}
            icon={showChat ? "message-text" : "format-list-bulleted"}
            style={styles.toggleButton}
          >
            {showChat ? "Show Actions" : "Show Chat"}
          </Button>
        </View>

        <Animated.View 
          style={[
            styles.chatContainer,
            {
              maxHeight: contentHeight.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '50%']
              })
            }
          ]}
        >
          {showChat && (
            <GiftedChat
              messages={messages}
              onSend={onSend}
              user={{
                _id: user!.uid,
                name: user!.phoneNumber || 'Unknown User',
              }}
              renderBubble={renderBubble}
              renderSend={renderSend}
              renderAvatar={null}
              alwaysShowSend
              scrollToBottom
              infiniteScroll
              minInputToolbarHeight={60}
              listViewProps={{
                style: styles.chatList,
                contentContainerStyle: styles.chatListContent,
              }}
            />
          )}
        </Animated.View>
      </View>

      <Portal>
        {renderOrderModal()}
        <Modal
          visible={showMembersModal}
          onDismiss={() => setShowMembersModal(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Group Members
            </Text>
            <TouchableOpacity 
              onPress={() => setShowMembersModal(false)}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons 
                name="close" 
                size={24} 
                color={colors.text} 
              />
            </TouchableOpacity>
          </View>
          {memberLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollView style={styles.membersList}>
              {members.map((member) => (
                <List.Item
                  key={member.id}
                  title={member.name || 'Unnamed User'}
                  description={member.phoneNumber}
                  left={props => (
                    <View style={styles.memberListAvatar}>
                      <Text style={styles.avatarText}>
                        {member.name?.[0] || member.phoneNumber?.[0] || '?'}
                      </Text>
                    </View>
                  )}
                  right={props => 
                    member.id === group.createdBy && 
                    <MaterialCommunityIcons 
                      name="crown" 
                      size={24} 
                      color={colors.primary} 
                    />
                  }
                  style={styles.memberListItem}
                />
              ))}
            </ScrollView>
          )}
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
  header: {
    height: 200,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    position: 'relative',
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  patternCircle: {
    position: 'absolute',
    backgroundColor: colors.background,
    borderRadius: 9999,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
    opacity: 0.1,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 50,
    right: 50,
    opacity: 0.05,
  },
  circle3: {
    width: 100,
    height: 100,
    top: -20,
    left: 30,
    opacity: 0.08,
  },
  headerContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  groupName: {
    color: colors.background,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.background,
    opacity: 0.8,
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.md,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    marginVertical: spacing.xs,
  },
  membersCard: {
    marginBottom: spacing.lg,
  },
  membersPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  moreAvatar: {
    backgroundColor: colors.surfaceVariant,
  },
  avatarText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    backgroundColor: colors.surface,
  },
  sendButton: {
    marginRight: spacing.md,
    marginBottom: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 16,
    maxHeight: '80%',
    ...elevation.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  modalTitle: {
    color: colors.text,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.xs,
  },
  membersList: {
    padding: spacing.md,
  },
  memberListItem: {
    paddingVertical: spacing.sm,
  },
  memberListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text,
  },
  orderContent: {
    padding: spacing.md,
  },
  uploadSection: {
    marginTop: spacing.md,
  },
  uploadButton: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: 'bold',
  },
  leaderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  startOrderButton: {
    flex: 1,
  },
  closeGroupButton: {
    flex: 1,
  },
  chatToggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    backgroundColor: colors.surface,
  },
  toggleButton: {
    borderRadius: 20,
  },
  chatList: {
    backgroundColor: colors.background,
  },
  chatListContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionsContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
  },
  toggleContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    backgroundColor: colors.surface,
  },
  toggleButton: {
    borderRadius: 20,
  },
}); 