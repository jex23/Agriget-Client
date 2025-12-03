export interface ProductSalesAnalytics {
  product_id: number;
  product_name: string;
  category: string;
  total_quantity_sold: number;
  total_revenue: number;
  order_count: number;
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
  total_revenue: number;
}

export interface PaymentStatusBreakdown {
  status: string;
  count: number;
  total_revenue: number;
}

export interface SalesAnalyticsResponse {
  total_revenue: number;
  total_orders: number;
  total_products_sold: number;
  products_sales: ProductSalesAnalytics[];
  order_status_breakdown: OrderStatusBreakdown[];
  payment_status_breakdown: PaymentStatusBreakdown[];
  date_range_start: string | null;
  date_range_end: string | null;
}
