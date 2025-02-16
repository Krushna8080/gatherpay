import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Modal, Portal, Text, Button, List, Divider, Card } from 'react-native-paper';
import { colors, spacing } from '../theme';
import { StatusBadge } from './ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface OrderItem {
  userId: string;
  items: string;
  itemMRP: number;
  finalAmount: number;
  approved: boolean;
  received: boolean;
  receivedAt?: Date;
  noShow?: boolean;
  noShowPenalty?: number;
}

interface OrderSplit {
  userId: string;
  originalAmount: number;
  taxShare: number;
  discountShare: number;
  finalAmount: number;
  approved: boolean;
}

interface Order {
  id: string;
  groupId: string;
  leaderId: string;
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  items: Record<string, OrderItem>;
  splits: Record<string, OrderSplit>;
  screenshot: string;
  status: 'pending' | 'splitting' | 'delivering' | 'completed';
  createdAt: Date;
  platformFee?: number;
}

interface GroupMember {
  id: string;
  phoneNumber: string;
  name?: string;
}

interface OrderDetailsModalProps {
  visible: boolean;
  onDismiss: () => void;
  order: Order;
  members: GroupMember[];
  currentUserId: string;
  isLeader: boolean;
  onAddItems: () => void;
  onApproveSplit: (userId: string) => void;
  onConfirmReceipt: (userId: string) => void;
  onMarkNoShow: (userId: string) => void;
  onCompleteOrder: () => void;
}

export default function OrderDetailsModal({
  visible,
  onDismiss,
  order,
  members,
  currentUserId,
  isLeader,
  onAddItems,
  onApproveSplit,
  onConfirmReceipt,
  onMarkNoShow,
  onCompleteOrder,
}: OrderDetailsModalProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.name || member?.phoneNumber || 'Unknown User';
  };

  const renderSplitDetails = () => {
    return (
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Split Details
        </Text>
        {Object.entries(order.splits).map(([userId, split]) => (
          <Card key={userId} style={styles.splitCard}>
            <Card.Content>
              <View style={styles.splitHeader}>
                <View>
                  <Text variant="titleMedium">{getMemberName(userId)}</Text>
                  <Text variant="bodySmall">Original Amount: ₹{split.originalAmount}</Text>
                </View>
                <View style={styles.splitAmount}>
                  <Text variant="titleLarge">₹{split.finalAmount}</Text>
                  <StatusBadge
                    status={split.approved ? 'success' : 'warning'}
                    text={split.approved ? 'Approved' : 'Pending'}
                    size="small"
                  />
                </View>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.splitDetails}>
                <Text variant="bodySmall">Tax Share: ₹{split.taxShare}</Text>
                <Text variant="bodySmall">Discount Share: -₹{split.discountShare}</Text>
              </View>
              {!split.approved && userId === currentUserId && (
                <Button
                  mode="contained"
                  onPress={() => onApproveSplit(userId)}
                  style={styles.actionButton}
                >
                  Approve Split
                </Button>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };

  const renderDeliveryStatus = () => {
    return (
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Delivery Status
        </Text>
        {Object.entries(order.items).map(([userId, item]) => (
          <List.Item
            key={userId}
            title={getMemberName(userId)}
            description={item.items}
            left={props => (
              <List.Icon
                {...props}
                icon={item.received ? 'check-circle' : item.noShow ? 'close-circle' : 'clock'}
                color={item.received ? colors.success : item.noShow ? colors.error : colors.warning}
              />
            )}
            right={() => (
              <View style={styles.itemActions}>
                {!item.received && !item.noShow && userId === currentUserId && (
                  <Button
                    mode="contained-tonal"
                    onPress={() => onConfirmReceipt(userId)}
                  >
                    Confirm Receipt
                  </Button>
                )}
                {isLeader && !item.received && !item.noShow && (
                  <Button
                    mode="outlined"
                    onPress={() => onMarkNoShow(userId)}
                    textColor={colors.error}
                  >
                    Mark No-Show
                  </Button>
                )}
              </View>
            )}
          />
        ))}
      </View>
    );
  };

  const renderActions = () => {
    const allSplitsApproved = Object.values(order.splits).every(split => split.approved);
    const allItemsReceived = Object.values(order.items).every(item => item.received || item.noShow);

    return (
      <View style={styles.actions}>
        {order.status === 'pending' && (
          <Button
            mode="contained"
            onPress={onAddItems}
            icon="plus"
            style={styles.actionButton}
          >
            Add Items
          </Button>
        )}
        {isLeader && order.status === 'delivering' && allItemsReceived && (
          <Button
            mode="contained"
            onPress={onCompleteOrder}
            icon="check"
            style={styles.actionButton}
          >
            Complete Order
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={styles.actionButton}
        >
          Close
        </Button>
      </View>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text variant="headlineSmall" style={styles.title}>
            Order Details
          </Text>

          <Card style={styles.orderSummary}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text variant="titleMedium">Total Amount</Text>
                <Text variant="headlineSmall">₹{order.totalAmount}</Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.summaryDetails}>
                <Text variant="bodySmall">Tax: ₹{order.totalTax}</Text>
                <Text variant="bodySmall">Discount: -₹{order.totalDiscount}</Text>
                {order.platformFee && (
                  <Text variant="bodySmall">Platform Fee: ₹{order.platformFee}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {order.screenshot && (
            <Card style={styles.screenshotCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Order Screenshot
                </Text>
                <Image
                  source={{ uri: order.screenshot }}
                  style={styles.screenshot}
                  resizeMode="contain"
                />
              </Card.Content>
            </Card>
          )}

          {order.status === 'splitting' && renderSplitDetails()}
          {order.status === 'delivering' && renderDeliveryStatus()}
          {renderActions()}
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
    maxHeight: '90%',
  },
  title: {
    marginBottom: spacing.lg,
    color: colors.primary,
  },
  orderSummary: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryDetails: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  splitCard: {
    marginBottom: spacing.sm,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  splitAmount: {
    alignItems: 'flex-end',
  },
  splitDetails: {
    marginTop: spacing.sm,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  screenshotCard: {
    marginTop: spacing.md,
  },
  screenshot: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
}); 