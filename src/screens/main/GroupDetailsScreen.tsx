import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager, Easing } from 'react-native';
import { Text, Button, Divider, Portal, Modal, List, ActivityIndicator, IconButton } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, elevation } from '../../theme';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, query, orderBy, getDocs, writeBatch, increment } from 'firebase/firestore';
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

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
  const [showActions, setShowActions] = useState(true);
  const [sectionOrder, setSectionOrder] = useState<'chatFirst' | 'actionsFirst'>('chatFirst');
  
  // Enhanced animation values
  const [chatScale] = useState(new Animated.Value(1));
  const [actionsScale] = useState(new Animated.Value(1));
  const [swapRotation] = useState(new Animated.Value(0));

  // Add this state near the other state declarations
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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
    console.log('handleJoinGroup called', { 
      groupId,
      userId: user?.uid,
      groupStatus: group?.status,
      currentMemberCount: group?.memberCount
    });

    if (!group || !user) {
      console.log('No group or user found', { group, user });
      Alert.alert('Error', 'Unable to join group. Please try again later.');
      return;
    }

    if (group.memberCount >= MAX_GROUP_MEMBERS) {
      console.log('Group is full', { memberCount: group.memberCount });
      Alert.alert('Error', 'This group is already full');
      return;
    }

    if (group.status !== 'open') {
      console.log('Group is not open', { status: group.status });
      Alert.alert('Error', 'This group is no longer accepting new members');
      return;
    }

    if (group.members[user.uid]) {
      console.log('User is already a member', { userId: user.uid });
      Alert.alert('Error', 'You are already a member of this group');
      return;
    }

    try {
      console.log('Attempting to join group', { 
        groupId, 
        userId: user.uid,
        currentMembers: Object.keys(group.members).length 
      });
      
      const groupRef = doc(db, 'groups', groupId);
      const updatedMembers = { ...group.members, [user.uid]: true };
      
      await updateDoc(groupRef, {
        members: updatedMembers,
        memberCount: group.memberCount + 1,
        lastUpdated: serverTimestamp(),
      });

      console.log('Successfully joined group');
      
      // Add system message about new member
      const messagesRef = collection(db, 'groups', groupId, 'messages');
      await addDoc(messagesRef, {
        _id: Date.now().toString(),
        text: `${user.phoneNumber || 'A new member'} has joined the group.`,
        createdAt: serverTimestamp(),
        system: true,
        user: {
          _id: 'system',
          name: 'System',
        },
      });
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert(
        'Error',
        'Failed to join group. Please try again. ' + 
        (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !user?.uid || !group) {
      Alert.alert('Error', 'Unable to leave group - missing data');
      return;
    }

    if (!group.members[user.uid]) {
      Alert.alert('Error', 'You are not a member of this group');
      return;
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      
      // Update group document
      await updateDoc(groupRef, {
        [`members.${user.uid}`]: false,
        memberCount: increment(-1)
      });

      // Add system message
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        _id: Date.now().toString(),
        text: `${user.displayName || user.phoneNumber || 'A member'} has left the group.`,
        createdAt: serverTimestamp(),
        system: true,
        user: {
          _id: 'system',
          name: 'System',
        },
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave group. Please try again.');
    }
  };

  const handleLeaderLeaveGroup = () => {
    console.log('handleLeaderLeaveGroup called');
    if (!user || !group) {
      console.log('Missing user or group:', { user: !!user, group: !!group });
      return;
    }
    console.log('Showing leave confirmation dialog');
    setShowLeaveDialog(true);
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

  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: colors.primary,
          borderRadius: 16,
          padding: 2,
        },
        left: {
          backgroundColor: colors.surfaceVariant,
          borderRadius: 16,
          padding: 2,
        },
      }}
      textStyle={{
        right: {
          color: colors.background,
          fontSize: 15,
        },
        left: {
          color: colors.text,
          fontSize: 15,
        },
      }}
    />
  );

  const renderSend = (props: any) => (
    <Send {...props}>
      <View style={styles.sendButton}>
        <MaterialCommunityIcons name="send" size={20} color={colors.background} />
      </View>
    </Send>
  );

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

  const animateSection = (section: 'chat' | 'actions', show: boolean) => {
    const scale = section === 'chat' ? chatScale : actionsScale;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: show ? 0.98 : 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start();
  };

  const toggleSection = (section: 'chat' | 'actions') => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    if (section === 'chat') {
      setShowChat(!showChat);
      animateSection('chat', !showChat);
    } else {
      setShowActions(!showActions);
      animateSection('actions', !showActions);
    }
  };

  const swapSections = () => {
    Animated.timing(swapRotation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    }).start(() => {
      swapRotation.setValue(0);
    });

    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    
    setSectionOrder(prev => prev === 'chatFirst' ? 'actionsFirst' : 'chatFirst');
  };

  const renderSectionHeader = (title: string, isVisible: boolean, onToggle: () => void, icon: 'message-text' | 'format-list-bulleted') => (
    <Animated.View style={[styles.sectionHeader, { transform: [{ scale: isVisible ? chatScale : actionsScale }] }]}>
      <TouchableOpacity 
        style={styles.sectionHeaderContent} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name={icon} size={24} color={colors.primary} style={styles.headerIcon} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.headerControls}>
          <View style={[styles.expandIndicator, isVisible && styles.expandIndicatorActive]}>
            <MaterialCommunityIcons
              name={isVisible ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={isVisible ? colors.primary : colors.text}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderGroupInfo = () => (
    <Card style={styles.groupInfoCard}>
      <View style={styles.cardHeader}>
        <StatusBadge status={group!.status} />
        {isLeader && (
          <MaterialCommunityIcons 
            name="crown" 
            size={24} 
            color={colors.primary} 
          />
        )}
      </View>
      <Text style={styles.description}>{group!.description}</Text>
      <Divider style={styles.divider} />
      <View style={styles.actionButtons}>
        {group!.status === 'open' && !group!.members[user!.uid] && (
          <Button
            mode="contained"
            onPress={handleJoinGroup}
            style={styles.actionButton}
          >
            Join Group
          </Button>
        )}
        {group!.members[user!.uid] && !isLeader && (
          <Button
            mode="outlined"
            onPress={handleLeaveGroup}
            style={styles.actionButton}
            textColor={colors.error}
          >
            Leave Group
          </Button>
        )}
        {isLeader && group!.status === 'open' && (
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
              onPress={handleLeaderLeaveGroup}
              style={[styles.actionButton, styles.leaveGroupButton]}
              textColor={colors.error}
            >
              Leave Group
            </Button>
          </View>
        )}
      </View>
    </Card>
  );

  const renderGroupActions = () => (
    <View style={styles.actionsSection}>
      <Card style={styles.actionCard}>
        <List.Section>
          <List.Subheader style={styles.actionSubheader}>Group Actions</List.Subheader>
          
          {/* Members Section */}
          <List.Item
            title="Members"
            description={`${group!.memberCount}/${MAX_GROUP_MEMBERS} members`}
            left={props => <List.Icon {...props} icon="account-group" />}
            onPress={() => setShowMembersModal(true)}
            style={styles.actionItem}
          />

          {/* Order Status */}
          {group!.status !== 'open' && (
            <List.Item
              title="Current Order"
              description={`Status: ${group!.status}`}
              left={props => <List.Icon {...props} icon="shopping" />}
              onPress={() => setShowOrderModal(true)}
              style={styles.actionItem}
            />
          )}

          {/* Location */}
          <List.Item
            title="Group Location"
            description="View on map"
            left={props => <List.Icon {...props} icon="map-marker" />}
            onPress={handleShareLocation}
            style={styles.actionItem}
          />

          {/* Additional Actions */}
          {isLeader && (
            <List.Item
              title="Group Settings"
              description="Manage group preferences"
              left={props => <List.Icon {...props} icon="cog" />}
              onPress={() => {/* Implement settings */}}
              style={styles.actionItem}
            />
          )}
        </List.Section>
      </Card>
    </View>
  );

  useEffect(() => {
    if (group && user) {
      console.log('Debug - Render conditions:', {
        isOpen: group.status === 'open',
        isMember: group.members[user.uid],
        isLeader,
        user: user.uid
      });
    }
  }, [group, user, isLeader]);

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
      {/* Header Section */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text variant="headlineMedium" style={styles.groupName}>
              {group.name}
            </Text>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {`${group.memberCount}/${MAX_GROUP_MEMBERS}`}
                </Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {`₹${group.targetAmount}`}
                </Text>
                <Text style={styles.statLabel}>Target</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <View style={styles.mainContainer}>
        {/* Group Info & Actions */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
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
                    onPress={handleLeaderLeaveGroup}
                    style={[styles.actionButton, styles.leaveGroupButton]}
                    textColor={colors.error}
                  >
                    Leave Group
                  </Button>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Group Chat</Text>
          </View>
          <GiftedChat
            messages={messages}
            onSend={messages => onSend(messages)}
            user={{ _id: user?.uid || '', name: user?.displayName || '' }}
            renderBubble={renderBubble}
            renderSend={renderSend}
            alwaysShowSend
            minInputToolbarHeight={60}
            maxComposerHeight={100}
            renderAvatar={null}
            renderTime={(props) => (
              <View style={styles.messageTime}>
                <Text style={styles.timeText}>
                  {new Date(props.currentMessage?.createdAt || Date.now()).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            )}
            listViewProps={{
              style: styles.chatList,
              contentContainerStyle: styles.chatListContent,
              showsVerticalScrollIndicator: false,
            }}
          />
        </View>
      </View>

      <Portal>
        {renderOrderModal()}
        <Modal
          visible={showLeaveDialog}
          onDismiss={() => setShowLeaveDialog(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall" style={styles.modalTitle}>Leave Group</Text>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Are you sure you want to leave this group? Leadership will be transferred to another member.
            </Text>
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  console.log('Leave cancelled');
                  setShowLeaveDialog(false);
                }}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={async () => {
                  if (!user || !group) {
                    console.log('Missing user or group:', { user: !!user, group: !!group });
                    Alert.alert('Error', 'Unable to leave group. Please try again later.');
                    return;
                  }

                  try {
                    console.log('Leader confirmed leaving group');
                    setLoading(true);
                    setShowLeaveDialog(false);
                    
                    const groupRef = doc(db, 'groups', groupId);
                    const updatedMembers = { ...group.members };
                    delete updatedMembers[user.uid];
                    const remainingMembers = Object.keys(updatedMembers);
                    console.log('Remaining members:', remainingMembers);

                    if (remainingMembers.length === 0) {
                      console.log('No members left, deleting group');
                      await deleteDoc(groupRef);
                    } else {
                      console.log('Transferring leadership to:', remainingMembers[0]);
                      await updateDoc(groupRef, {
                        members: updatedMembers,
                        memberCount: remainingMembers.length,
                        createdBy: remainingMembers[0],
                        lastUpdated: serverTimestamp(),
                      });

                      const messagesRef = collection(db, 'groups', groupId, 'messages');
                      await addDoc(messagesRef, {
                        _id: Date.now().toString(),
                        text: `Group leadership has been transferred to a new member as the previous leader left.`,
                        createdAt: serverTimestamp(),
                        system: true,
                        user: {
                          _id: 'system',
                          name: 'System',
                        },
                      });
                    }
                    console.log('Successfully processed leader leaving');
                    navigation.goBack();
                  } catch (error) {
                    console.error('Error in leader leave process:', error);
                    Alert.alert('Error', 'Failed to leave group. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }}
                style={[styles.modalButton, styles.leaveButton]}
                textColor={colors.background}
              >
                Leave Group
              </Button>
            </View>
          </View>
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
    height: 140,
    backgroundColor: colors.primary,
  },
  headerGradient: {
    flex: 1,
  },
  headerContent: {
    padding: spacing.lg,
  },
  groupName: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: spacing.sm,
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.background,
    opacity: 0.9,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  infoSection: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  infoCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...elevation.small,
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
  actionButtons: {
    gap: spacing.sm,
  },
  actionButton: {
    marginVertical: spacing.xs,
    borderRadius: 8,
  },
  leaderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  startOrderButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  leaveGroupButton: {
    flex: 1,
    borderColor: colors.error,
  },
  chatSection: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatHeader: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    backgroundColor: colors.surface,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  chatList: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatListContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageTime: {
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
  },
  sendButton: {
    marginRight: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...elevation.small,
  },
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: 20,
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
    fontSize: 20,
  },
  orderContent: {
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  sectionHeader: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    ...elevation.medium,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    transform: [{ rotate: '0deg' }],
  },
  expandIndicatorActive: {
    backgroundColor: colors.surfaceVariant,
    transform: [{ rotate: '180deg' }],
  },
  swapButton: {
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    ...elevation.small,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  swapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  swapButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  actionsSection: {
    padding: spacing.md,
  },
  actionCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    ...elevation.medium,
  },
  actionSubheader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    padding: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },
  uploadSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    ...elevation.small,
  },
  uploadButton: {
    marginTop: spacing.sm,
    borderColor: colors.primary,
  },
  groupInfoCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    ...elevation.medium,
  },
  divider: {
    backgroundColor: colors.surfaceVariant,
    marginVertical: spacing.sm,
  },
  actionItem: {
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalButton: {
    minWidth: 100,
  },
  leaveButton: {
    backgroundColor: colors.error,
  },
}); 