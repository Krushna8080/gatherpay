import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, List, Portal, Modal } from 'react-native-paper';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing } from '../theme';
import { MediaUploader } from '../utils/MediaUploader';
import { errorHandler } from '../utils/ErrorHandler';

interface DisputeResolutionProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  groupId: string;
}

type DisputeType = 'payment' | 'delivery' | 'quality' | 'other';

export function DisputeResolution({ visible, onClose, orderId, groupId }: DisputeResolutionProps) {
  const [type, setType] = useState<DisputeType>('payment');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleAddEvidence = async () => {
    try {
      const result = await MediaUploader.pickImage({
        allowsEditing: true,
        quality: 0.8,
      });
      setEvidence(result.uri);
    } catch (error:any) {
      errorHandler.handleError(error, 'DisputeResolution');
    }
  };

  const handleSubmitDispute = async () => {
    if (!user || !description) return;

    try {
      setLoading(true);

      // Create dispute document
      const disputeRef = await addDoc(collection(db, 'disputes'), {
        orderId,
        groupId,
        userId: user.uid,
        type,
        description,
        evidence,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update order status
      await updateDoc(doc(db, 'orders', orderId), {
        hasDispute: true,
        disputeId: disputeRef.id,
        status: 'disputed',
      });

      onClose();
    } catch (error:any) {
      errorHandler.handleError(error, 'DisputeResolution');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <ScrollView>
          <Text variant="headlineMedium" style={styles.title}>Report an Issue</Text>
          
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Issue Type</Text>
              <List.Section>
                <List.Item
                  title="Payment Issue"
                  left={props => <List.Icon {...props} icon="cash" />}
                  onPress={() => setType('payment')}
                  right={props => type === 'payment' && <List.Icon {...props} icon="check" />}
                />
                <List.Item
                  title="Delivery Problem"
                  left={props => <List.Icon {...props} icon="truck" />}
                  onPress={() => setType('delivery')}
                  right={props => type === 'delivery' && <List.Icon {...props} icon="check" />}
                />
                <List.Item
                  title="Quality Issue"
                  left={props => <List.Icon {...props} icon="alert" />}
                  onPress={() => setType('quality')}
                  right={props => type === 'quality' && <List.Icon {...props} icon="check" />}
                />
                <List.Item
                  title="Other"
                  left={props => <List.Icon {...props} icon="dots-horizontal" />}
                  onPress={() => setType('other')}
                  right={props => type === 'other' && <List.Icon {...props} icon="check" />}
                />
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
              <TextInput
                mode="outlined"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="Please describe the issue in detail..."
                style={styles.input}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Evidence</Text>
              <Button
                mode="outlined"
                onPress={handleAddEvidence}
                icon="camera"
                style={styles.uploadButton}
              >
                Add Photo Evidence
              </Button>
              {evidence && (
                <Text variant="bodySmall" style={styles.evidenceText}>
                  Evidence uploaded successfully
                </Text>
              )}
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={handleSubmitDispute}
            loading={loading}
            disabled={!description || loading}
            style={styles.submitButton}
          >
            Submit Report
          </Button>
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
  sectionTitle: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
  },
  uploadButton: {
    marginTop: spacing.sm,
  },
  evidenceText: {
    marginTop: spacing.sm,
    color: colors.primary,
  },
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
}); 