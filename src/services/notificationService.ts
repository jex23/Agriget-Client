import type { 
  NotificationResponse, 
  NotificationCreate, 
  NotificationUpdate, 
  NotificationFilters,
  UnreadCountResponse 
} from '../types/notification.js';
import { API_ENDPOINTS } from '../constants/api';

class NotificationService {
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  async getNotifications(filters?: NotificationFilters): Promise<NotificationResponse[]> {
    const queryParams = new URLSearchParams();
    
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.skip) queryParams.append('skip', filters.skip.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const url = `${API_ENDPOINTS.notifications}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.makeRequest<NotificationResponse[]>(url);
  }

  async getNotification(notificationId: number): Promise<NotificationResponse> {
    return await this.makeRequest<NotificationResponse>(
      API_ENDPOINTS.notificationById(notificationId)
    );
  }

  async createNotification(notification: NotificationCreate): Promise<NotificationResponse> {
    return await this.makeRequest<NotificationResponse>(API_ENDPOINTS.notifications, {
      method: 'POST',
      body: JSON.stringify(notification),
    });
  }

  async updateNotification(
    notificationId: number, 
    notification: NotificationUpdate
  ): Promise<NotificationResponse> {
    return await this.makeRequest<NotificationResponse>(
      API_ENDPOINTS.notificationById(notificationId),
      {
        method: 'PUT',
        body: JSON.stringify(notification),
      }
    );
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    return await this.makeRequest<UnreadCountResponse>(
      API_ENDPOINTS.notificationsUnreadCount
    );
  }

  async markAsRead(notificationId: number): Promise<NotificationResponse> {
    return await this.updateNotification(notificationId, { status: 'read' });
  }

  async markAsArchived(notificationId: number): Promise<NotificationResponse> {
    return await this.updateNotification(notificationId, { status: 'archived' });
  }

  async markAsUnread(notificationId: number): Promise<NotificationResponse> {
    return await this.updateNotification(notificationId, { status: 'unread' });
  }
}

export default new NotificationService();