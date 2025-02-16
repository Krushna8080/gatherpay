export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  targetAmount: number;
  status: 'open' | 'ordering' | 'ordered' | 'completed' | 'cancelled';
  createdBy: string;
  members: { [key: string]: boolean };
  location: {
    latitude: number;
    longitude: number;
    lastUpdated?: Date;
  };
  distance?: number; // Distance from user in meters
}

export interface OrderItem {
  userId: string;
  items: string;
  amount: number;
  paid: boolean;
}

export interface Order {
  id: string;
  groupId: string;
  leaderId: string;
  totalAmount: number;
  items: OrderItem[];
  screenshot: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  timestamp: Date;
  userId: string;
  fromUserId?: string;
  toUserId?: string;
  groupId?: string;
  orderId?: string;
  status: 'pending' | 'completed' | 'failed';
  failureReason?: string;
} 