export interface NotificationResponse {
  id: number;
  type: 'new_order' | 'order_updated' | 'payment_received' | 'user_registered';
  title: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  related_id?: number;
  related_type?: 'order' | 'user' | 'product';
  triggered_by_user_id?: number;
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
}

export interface NotificationCreate {
  type: 'new_order' | 'order_updated' | 'payment_received' | 'user_registered';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  related_id?: number;
  related_type?: 'order' | 'user' | 'product';
  triggered_by_user_id?: number;
  metadata?: Record<string, any>;
}

export interface NotificationUpdate {
  status?: 'unread' | 'read' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationFilters {
  status?: 'unread' | 'read' | 'archived';
  type?: 'new_order' | 'order_updated' | 'payment_received' | 'user_registered';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  skip?: number;
  limit?: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}