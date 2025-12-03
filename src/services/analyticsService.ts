import { API_ENDPOINTS } from '../constants/api';
import type { SalesAnalyticsResponse } from '../types/analytics';

class AnalyticsService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async getSalesAnalytics(startDate?: string, endDate?: string): Promise<SalesAnalyticsResponse> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const url = `${API_ENDPOINTS.analytics.sales}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch analytics' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      throw error;
    }
  }

  // Helper function to get analytics for specific periods
  async getPeriodAnalytics(period: 'day' | 'week' | 'month' | 'year'): Promise<SalesAnalyticsResponse> {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0]; // Today in YYYY-MM-DD format
    let startDate: string;

    switch (period) {
      case 'day':
        startDate = endDate; // Same day
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
    }

    return this.getSalesAnalytics(startDate, endDate);
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
