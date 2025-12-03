import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  SimpleGrid,
  Badge,
  Tabs,
  Spinner,
  Center
} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '@chakra-ui/react/select';
import { createListCollection } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/auth.js';
import type { Product } from '../types/product.js';
import type { Order } from '../types/order.js';
import type { UserResponse } from '../types/users.js';
import authService from '../services/authService.js';
import { productService } from '../services/productService.js';
import { orderService } from '../services/orderService.js';
import adminUserService from '../services/adminUserService.js';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api.js';
import AdminHeader from '../components/AdminHeader.js';
import AdminSidebar from '../components/AdminSidebar.js';
import LineChart from '../components/LineChart.js';
import analyticsService from '../services/analyticsService.js';
import type { SalesAnalyticsResponse } from '../types/analytics.js';
import './Admin.css';

const Admin: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    productsInStock: 0,
    recentOrders: [] as Order[],
    recentProducts: [] as Product[],
    urgentOrders: [] as Order[],
    pendingOrders: [] as Order[],
    priorityStats: {
      urgentCount: 0,
      highPriorityCount: 0,
      pendingCount: 0
    }
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isHovered, setIsHovered] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState<'revenue' | 'orders' | 'customers'>('revenue');
  const [analyticsData, setAnalyticsData] = useState<{
    week: SalesAnalyticsResponse | null;
    month: SalesAnalyticsResponse | null;
    year: SalesAnalyticsResponse | null;
  }>({
    week: null,
    month: null,
    year: null,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const navigate = useNavigate();

  const salesPeriodOptions = createListCollection({
    items: [
      { label: 'Today', value: 'day' },
      { label: 'This Week', value: 'week' },
      { label: 'This Month', value: 'month' },
      { label: 'This Year', value: 'year' },
    ],
  });

  // Calculate sidebar width for main content adjustment
  const getSidebarWidth = () => {
    if (isMobile) {
      return 0; // Mobile sidebar overlays, doesn't push content
    }
    
    // Desktop logic: check hover state
    if (isHovered) {
      return 280; // Expanded on hover
    }
    
    return 80; // Default collapsed state
  };

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for sidebar hover state changes
  useEffect(() => {
    const handleSidebarHover = () => {
      if (!isMobile) {
        setIsHovered(true);
      }
    };

    const handleSidebarLeave = () => {
      if (!isMobile) {
        setTimeout(() => {
          setIsHovered(false);
        }, 150);
      }
    };

    const attachSidebarListeners = () => {
      const sidebar = document.querySelector('[data-sidebar="admin"]');
      
      if (sidebar) {
        sidebar.addEventListener('mouseenter', handleSidebarHover);
        sidebar.addEventListener('mouseleave', handleSidebarLeave);
        
        return () => {
          sidebar.removeEventListener('mouseenter', handleSidebarHover);
          sidebar.removeEventListener('mouseleave', handleSidebarLeave);
        };
      }
      
      return null;
    };

    // Try to attach listeners immediately
    let cleanup = attachSidebarListeners();
    
    // If sidebar not found, use MutationObserver to wait for it
    if (!cleanup) {
      const observer = new MutationObserver(() => {
        if (!cleanup) {
          cleanup = attachSidebarListeners();
          if (cleanup) {
            observer.disconnect();
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      const timeout = setTimeout(() => {
        observer.disconnect();
      }, 5000);
      
      return () => {
        observer.disconnect();
        clearTimeout(timeout);
        if (cleanup) cleanup();
      };
    }
    
    return cleanup;
  }, [isMobile]);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
      return;
    }
    
    // Check if user has admin role
    if (currentUser.role !== 'admin') {
      navigate(ROUTES.HOME);
      return;
    }

    setUser(currentUser);
    setIsLoading(false);

    // Fetch dashboard data
    fetchDashboardData();
    fetchAnalyticsData();
  }, [navigate]);

  const fetchAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);

      // Fetch analytics for all three periods in parallel
      const [weekData, monthData, yearData] = await Promise.all([
        analyticsService.getPeriodAnalytics('week').catch(() => null),
        analyticsService.getPeriodAnalytics('month').catch(() => null),
        analyticsService.getPeriodAnalytics('year').catch(() => null),
      ]);

      setAnalyticsData({
        week: weekData,
        month: monthData,
        year: yearData,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);

      // Fetch all data in parallel
      const [orders, products, users] = await Promise.all([
        orderService.getAllOrders().catch(() => []),
        productService.getProducts().catch(() => []),
        adminUserService.getAllUsers().catch(() => [])
      ]);

      // Store all orders and users for analytics
      setAllOrders(orders);
      setAllUsers(users);

      // Calculate statistics
      const totalRevenue = orders.reduce((sum, order) => {
        if (order.order_status === 'completed' && order.payment_status === 'paid') {
          const productTotal = order.total_amount;
          const shippingFee = order.free_shipping ? 0 : (order.shipping_fee || 0);
          return sum + productTotal + shippingFee;
        }
        return sum;
      }, 0);
      
      const productsInStock = products.filter(product => 
        product.is_active && product.stock_quantity > 0
      ).length;
      
      // Get recent orders (last 5)
      const recentOrders = orders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      // Get recent products (last 6)
      const recentProducts = products
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 6);
      
      // Calculate priority orders
      const urgentOrders = orders.filter(isUrgentOrder);
      const highPriorityOrders = orders.filter(isHighPriorityOrder);
      const pendingOrders = orders.filter(order => order.order_status === 'pending');
      
      // Sort urgent and high priority orders by creation date (newest first)
      const sortedUrgentOrders = urgentOrders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      const sortedPendingOrders = pendingOrders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
      
      setDashboardData({
        totalUsers: users.length,
        totalOrders: orders.length,
        totalRevenue,
        totalProducts: products.length,
        productsInStock,
        recentOrders,
        recentProducts,
        urgentOrders: sortedUrgentOrders,
        pendingOrders: sortedPendingOrders,
        priorityStats: {
          urgentCount: urgentOrders.length,
          highPriorityCount: highPriorityOrders.length,
          pendingCount: pendingOrders.length
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'processing':
        return 'blue';
      case 'on_delivery':
        return 'purple';
      case 'completed':
        return 'green';
      case 'canceled':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const isHighPriorityOrder = (order: Order): boolean => {
    // Orders that need immediate processing
    if (order.order_status === 'pending') return true;
    if (order.order_status === 'processing' && order.payment_status === 'pending') return true;
    
    // Older orders that need attention
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    const daysSinceCreated = orderAge / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 3 && ['pending', 'processing'].includes(order.order_status)) return true;
    
    return false;
  };

  const isUrgentOrder = (order: Order): boolean => {
    // Very urgent orders
    if (order.order_status === 'pending' && order.payment_status === 'pending') {
      const orderAge = Date.now() - new Date(order.created_at).getTime();
      const daysSinceCreated = orderAge / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 1; // Pending orders older than 1 day
    }
    return false;
  };

  const getPriorityIndicator = (order: Order) => {
    if (isUrgentOrder(order)) {
      return {
        icon: '🚨',
        text: 'URGENT',
        color: 'red'
      };
    }
    if (isHighPriorityOrder(order)) {
      return {
        icon: '⚠️',
        text: 'High Priority',
        color: 'orange'
      };
    }
    return null;
  };

  const calculateSalesForPeriod = (period: 'day' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const startOfPeriod = new Date();

    switch (period) {
      case 'day':
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startOfPeriod.setDate(now.getDate() - dayOfWeek);
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startOfPeriod.setMonth(0, 1);
        startOfPeriod.setHours(0, 0, 0, 0);
        break;
    }

    const filteredOrders = allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startOfPeriod && orderDate <= now;
    });

    const completedOrders = filteredOrders.filter(
      order => order.order_status === 'completed' && order.payment_status === 'paid'
    );

    // Calculate product sales and shipping fees separately
    const productSales = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalShippingFees = completedOrders.reduce((sum, order) => {
      return sum + (order.free_shipping ? 0 : (order.shipping_fee || 0));
    }, 0);
    const totalSales = productSales + totalShippingFees;

    const totalOrders = filteredOrders.length;
    const completedOrdersCount = completedOrders.length;
    const pendingOrdersCount = filteredOrders.filter(order => order.order_status === 'pending').length;

    // Count orders with free shipping
    const freeShippingCount = completedOrders.filter(order => order.free_shipping).length;
    const paidShippingCount = completedOrdersCount - freeShippingCount;

    return {
      totalSales,
      productSales,
      totalShippingFees,
      totalOrders,
      completedOrdersCount,
      pendingOrdersCount,
      averageOrderValue: completedOrdersCount > 0 ? totalSales / completedOrdersCount : 0,
      freeShippingCount,
      paidShippingCount,
    };
  };

  // Analytics data processing functions
  const getRevenueAnalytics = (period: 'week' | 'month' | 'year' = 'month') => {
    const now = new Date();
    let dataPoints: { label: string; value: number }[] = [];

    if (period === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayRevenue = allOrders
          .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= date && orderDate < nextDate &&
                   order.order_status === 'completed' && order.payment_status === 'paid';
          })
          .reduce((sum, order) => {
            return sum + order.total_amount + (order.free_shipping ? 0 : (order.shipping_fee || 0));
          }, 0);

        dataPoints.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: dayRevenue
        });
      }
    } else if (period === 'month') {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayRevenue = allOrders
          .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= date && orderDate < nextDate &&
                   order.order_status === 'completed' && order.payment_status === 'paid';
          })
          .reduce((sum, order) => {
            return sum + order.total_amount + (order.free_shipping ? 0 : (order.shipping_fee || 0));
          }, 0);

        // Show every 5th day to avoid crowding
        if (i % 5 === 0 || i === 29) {
          dataPoints.push({
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: dayRevenue
          });
        }
      }
    } else if (period === 'year') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);

        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const monthRevenue = allOrders
          .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= date && orderDate < nextMonth &&
                   order.order_status === 'completed' && order.payment_status === 'paid';
          })
          .reduce((sum, order) => {
            return sum + order.total_amount + (order.free_shipping ? 0 : (order.shipping_fee || 0));
          }, 0);

        dataPoints.push({
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: monthRevenue
        });
      }
    }

    return dataPoints;
  };

  const getOrdersAnalytics = (period: 'week' | 'month' | 'year' = 'month') => {
    const now = new Date();
    let dataPoints: { label: string; value: number }[] = [];

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= date && orderDate < nextDate;
        }).length;

        dataPoints.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: dayOrders
        });
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= date && orderDate < nextDate;
        }).length;

        if (i % 5 === 0 || i === 29) {
          dataPoints.push({
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: dayOrders
          });
        }
      }
    } else if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);

        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const monthOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= date && orderDate < nextMonth;
        }).length;

        dataPoints.push({
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: monthOrders
        });
      }
    }

    return dataPoints;
  };

  const getCustomerAnalytics = (period: 'week' | 'month' | 'year' = 'month') => {
    const now = new Date();
    let dataPoints: { label: string; value: number }[] = [];

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayCustomers = allUsers.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate >= date && userDate < nextDate;
        }).length;

        // Cumulative count
        const totalCustomers = allUsers.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate < nextDate;
        }).length;

        dataPoints.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: totalCustomers
        });
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const totalCustomers = allUsers.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate < nextDate;
        }).length;

        if (i % 5 === 0 || i === 29) {
          dataPoints.push({
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: totalCustomers
          });
        }
      }
    } else if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);

        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const totalCustomers = allUsers.filter(user => {
          const userDate = new Date(user.created_at);
          return userDate < nextMonth;
        }).length;

        dataPoints.push({
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          value: totalCustomers
        });
      }
    }

    return dataPoints;
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Text>Loading...</Text>
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Box className="admin-container">
      <AdminHeader 
        user={user} 
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        notifications={7}
      />
      
      <Flex>
        <AdminSidebar 
          isOpen={isSidebarOpen}
          onToggle={handleSidebarToggle}
        />
        
        <Box 
          flex={1} 
          className="admin-main-content"
          ml={{ base: 0, lg: `${getSidebarWidth()}px` }}
          transition="margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        >
          <Container maxW="container.xl" py={8}>
            <VStack gap={8} align="stretch">
              {/* Welcome Section */}
              <Box>
                <Heading className="admin-title" size="xl" mb={2}>
                  Dashboard Overview
                </Heading>
                <Text className="admin-subtitle">
                  Welcome back, {user.first_name}! Here's what's happening with your business today.
                </Text>
              </Box>

              {/* Analytics Dashboard */}
              <Box className="admin-section" bg="white" p={6} borderRadius="lg" shadow="md">
                <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
                  <Heading size="lg" color="blue.700">
                    📈 Analytics Dashboard
                  </Heading>
                  <HStack gap={3}>
                    <Button
                      size="sm"
                      variant={analyticsTab === 'revenue' ? 'solid' : 'outline'}
                      colorScheme="blue"
                      onClick={() => setAnalyticsTab('revenue')}
                    >
                      Revenue
                    </Button>
                    <Button
                      size="sm"
                      variant={analyticsTab === 'orders' ? 'solid' : 'outline'}
                      colorScheme="blue"
                      onClick={() => setAnalyticsTab('orders')}
                    >
                      Orders
                    </Button>
                    <Button
                      size="sm"
                      variant={analyticsTab === 'customers' ? 'solid' : 'outline'}
                      colorScheme="blue"
                      onClick={() => setAnalyticsTab('customers')}
                    >
                      Products
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={fetchAnalyticsData}
                      isLoading={analyticsLoading}
                    >
                      🔄 Refresh
                    </Button>
                  </HStack>
                </Flex>

                {/* Analytics Charts */}
                {analyticsLoading ? (
                  <Center py={20}>
                    <VStack>
                      <Spinner size="xl" color="blue.500" />
                      <Text color="gray.600">Loading analytics...</Text>
                    </VStack>
                  </Center>
                ) : (
                  <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
                    {/* Week View */}
                    <Box bg="gray.50" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
                      <VStack align="stretch" gap={4}>
                        <HStack justify="space-between">
                          <VStack align="start" gap={0}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700">Last 7 Days</Text>
                            <Text fontSize="xs" color="gray.500">Daily breakdown</Text>
                          </VStack>
                          {analyticsTab === 'revenue' && analyticsData.week && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                              ₱{analyticsData.week.total_revenue.toLocaleString()}
                            </Text>
                          )}
                          {analyticsTab === 'orders' && analyticsData.week && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                              {analyticsData.week.total_orders} orders
                            </Text>
                          )}
                          {analyticsTab === 'customers' && analyticsData.week && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                              {analyticsData.week.total_products_sold.toFixed(0)} products
                            </Text>
                          )}
                        </HStack>
                        <Box h="250px">
                          {analyticsTab === 'revenue' && analyticsData.week && (
                            <LineChart
                              data={analyticsData.week.order_status_breakdown.map((item, idx) => ({
                                label: item.status.substring(0, 3),
                                value: item.total_revenue
                              }))}
                              color="#3182ce"
                              height={250}
                              valuePrefix="₱"
                              title="Revenue by Status"
                            />
                          )}
                          {analyticsTab === 'orders' && analyticsData.week && (
                            <LineChart
                              data={analyticsData.week.order_status_breakdown.map((item, idx) => ({
                                label: item.status.substring(0, 3),
                                value: item.count
                              }))}
                              color="#805ad5"
                              height={250}
                              title="Orders by Status"
                            />
                          )}
                          {analyticsTab === 'customers' && analyticsData.week && (
                            <LineChart
                              data={analyticsData.week.products_sales.slice(0, 5).map((item, idx) => ({
                                label: item.product_name.substring(0, 10),
                                value: item.total_quantity_sold
                              }))}
                              color="#38a169"
                              height={250}
                              title="Top 5 Products"
                            />
                          )}
                        </Box>
                      </VStack>
                    </Box>

                    {/* Month View */}
                    <Box bg="blue.50" p={5} borderRadius="lg" border="2px solid" borderColor="blue.200">
                      <VStack align="stretch" gap={4}>
                        <HStack justify="space-between">
                          <VStack align="start" gap={0}>
                            <Text fontSize="sm" fontWeight="semibold" color="blue.800">Last 30 Days</Text>
                            <Text fontSize="xs" color="blue.600">Monthly trend</Text>
                          </VStack>
                          {analyticsTab === 'revenue' && analyticsData.month && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.700">
                              ₱{analyticsData.month.total_revenue.toLocaleString()}
                            </Text>
                          )}
                          {analyticsTab === 'orders' && analyticsData.month && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.700">
                              {analyticsData.month.total_orders} orders
                            </Text>
                          )}
                          {analyticsTab === 'customers' && analyticsData.month && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.700">
                              {analyticsData.month.total_products_sold.toFixed(0)} products
                            </Text>
                          )}
                        </HStack>
                        <Box h="250px">
                          {analyticsTab === 'revenue' && analyticsData.month && (
                            <LineChart
                              data={analyticsData.month.order_status_breakdown.map((item) => ({
                                label: item.status.substring(0, 3),
                                value: item.total_revenue
                              }))}
                              color="#2c5282"
                              height={250}
                              valuePrefix="₱"
                              title="Revenue by Status"
                            />
                          )}
                          {analyticsTab === 'orders' && analyticsData.month && (
                            <LineChart
                              data={analyticsData.month.order_status_breakdown.map((item) => ({
                                label: item.status.substring(0, 3),
                                value: item.count
                              }))}
                              color="#6b46c1"
                              height={250}
                              title="Orders by Status"
                            />
                          )}
                          {analyticsTab === 'customers' && analyticsData.month && (
                            <LineChart
                              data={analyticsData.month.products_sales.slice(0, 5).map((item) => ({
                                label: item.product_name.substring(0, 10),
                                value: item.total_quantity_sold
                              }))}
                              color="#2f855a"
                              height={250}
                              title="Top 5 Products"
                            />
                          )}
                        </Box>
                      </VStack>
                    </Box>

                    {/* Year View */}
                    <Box bg="gray.50" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
                      <VStack align="stretch" gap={4}>
                        <HStack justify="space-between">
                          <VStack align="start" gap={0}>
                            <Text fontSize="sm" fontWeight="semibold" color="gray.700">Last 12 Months</Text>
                            <Text fontSize="xs" color="gray.500">Yearly overview</Text>
                          </VStack>
                          {analyticsTab === 'revenue' && analyticsData.year && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                              ₱{analyticsData.year.total_revenue.toLocaleString()}
                            </Text>
                          )}
                          {analyticsTab === 'orders' && analyticsData.year && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                              {analyticsData.year.total_orders} orders
                            </Text>
                          )}
                          {analyticsTab === 'customers' && analyticsData.year && (
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                              {analyticsData.year.total_products_sold.toFixed(0)} products
                            </Text>
                          )}
                        </HStack>
                        <Box h="250px">
                          {analyticsTab === 'revenue' && analyticsData.year && (
                            <LineChart
                              data={analyticsData.year.order_status_breakdown.map((item) => ({
                                label: item.status.substring(0, 3),
                                value: item.total_revenue
                              }))}
                              color="#3182ce"
                              height={250}
                              valuePrefix="₱"
                              title="Revenue by Status"
                            />
                          )}
                          {analyticsTab === 'orders' && analyticsData.year && (
                            <LineChart
                              data={analyticsData.year.order_status_breakdown.map((item) => ({
                                label: item.status.substring(0, 3),
                                value: item.count
                              }))}
                              color="#805ad5"
                              height={250}
                              title="Orders by Status"
                            />
                          )}
                          {analyticsTab === 'customers' && analyticsData.year && (
                            <LineChart
                              data={analyticsData.year.products_sales.slice(0, 5).map((item) => ({
                                label: item.product_name.substring(0, 10),
                                value: item.total_quantity_sold
                              }))}
                              color="#38a169"
                              height={250}
                              title="Top 5 Products"
                            />
                          )}
                        </Box>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                )}

                {/* Chart Legend */}
                {!analyticsLoading && (
                  <Box mt={6} p={4} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200">
                    <VStack gap={3} align="start">
                      <HStack gap={2}>
                        <Text fontSize="sm" fontWeight="bold" color="blue.800">📊 Chart Label Legend</Text>
                      </HStack>
                      <SimpleGrid columns={{ base: 2, md: 5 }} gap={3} width="100%">
                        <HStack gap={2}>
                          <Badge colorScheme="orange" fontSize="xs" fontWeight="bold">pen</Badge>
                          <Text fontSize="xs" color="gray.700">Pending</Text>
                        </HStack>
                        <HStack gap={2}>
                          <Badge colorScheme="blue" fontSize="xs" fontWeight="bold">pro</Badge>
                          <Text fontSize="xs" color="gray.700">Processing</Text>
                        </HStack>
                        <HStack gap={2}>
                          <Badge colorScheme="purple" fontSize="xs" fontWeight="bold">on_</Badge>
                          <Text fontSize="xs" color="gray.700">On Delivery</Text>
                        </HStack>
                        <HStack gap={2}>
                          <Badge colorScheme="green" fontSize="xs" fontWeight="bold">com</Badge>
                          <Text fontSize="xs" color="gray.700">Completed</Text>
                        </HStack>
                        <HStack gap={2}>
                          <Badge colorScheme="red" fontSize="xs" fontWeight="bold">can</Badge>
                          <Text fontSize="xs" color="gray.700">Canceled</Text>
                        </HStack>
                      </SimpleGrid>
                    </VStack>
                  </Box>
                )}

                {/* Analytics Summary */}
                {!analyticsLoading && (
                  <Box mt={4} p={4} bg="gray.50" borderRadius="lg">
                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                      <VStack align="start" gap={1}>
                        <Text fontSize="xs" color="gray.600">
                          {analyticsTab === 'revenue' ? 'Top Product Revenue' :
                           analyticsTab === 'orders' ? 'Most Orders Status' :
                           'Best Selling Product'}
                        </Text>
                        <Text fontSize="sm" fontWeight="bold" color="blue.700">
                          {analyticsTab === 'revenue' && analyticsData.month?.products_sales[0] && (
                            `${analyticsData.month.products_sales[0].product_name} - ₱${analyticsData.month.products_sales[0].total_revenue.toLocaleString()}`
                          )}
                          {analyticsTab === 'orders' && analyticsData.month?.order_status_breakdown[0] && (
                            `${analyticsData.month.order_status_breakdown[0].status} (${analyticsData.month.order_status_breakdown[0].count})`
                          )}
                          {analyticsTab === 'customers' && analyticsData.month?.products_sales[0] && (
                            `${analyticsData.month.products_sales[0].product_name} (${analyticsData.month.products_sales[0].total_quantity_sold} sold)`
                          )}
                          {!analyticsData.month && 'N/A'}
                        </Text>
                      </VStack>
                      <VStack align="start" gap={1}>
                        <Text fontSize="xs" color="gray.600">Weekly Total</Text>
                        <Text fontSize="sm" fontWeight="bold" color="blue.700">
                          {analyticsTab === 'revenue' && analyticsData.week && (
                            `₱${analyticsData.week.total_revenue.toLocaleString()}`
                          )}
                          {analyticsTab === 'orders' && analyticsData.week && (
                            `${analyticsData.week.total_orders} orders`
                          )}
                          {analyticsTab === 'customers' && analyticsData.week && (
                            `${analyticsData.week.total_products_sold.toFixed(0)} products sold`
                          )}
                          {!analyticsData.week && 'N/A'}
                        </Text>
                      </VStack>
                      <VStack align="start" gap={1}>
                        <Text fontSize="xs" color="gray.600">Monthly Total</Text>
                        <Text fontSize="sm" fontWeight="bold" color="blue.700">
                          {analyticsTab === 'revenue' && analyticsData.month && (
                            `₱${analyticsData.month.total_revenue.toLocaleString()}`
                          )}
                          {analyticsTab === 'orders' && analyticsData.month && (
                            `${analyticsData.month.total_orders} orders`
                          )}
                          {analyticsTab === 'customers' && analyticsData.month && (
                            `${analyticsData.month.total_products_sold.toFixed(0)} products sold`
                          )}
                          {!analyticsData.month && 'N/A'}
                        </Text>
                      </VStack>
                    </SimpleGrid>

                    {/* Top Products Table */}
                    {analyticsData.month && analyticsData.month.products_sales.length > 0 && (
                      <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.200">
                        <Text fontSize="sm" fontWeight="bold" color="gray.700" mb={3}>
                          Top 5 Products This Month
                        </Text>
                        <VStack align="stretch" gap={2}>
                          {analyticsData.month.products_sales.slice(0, 5).map((product, idx) => (
                            <Flex
                              key={product.product_id}
                              justify="space-between"
                              align="center"
                              p={2}
                              bg="white"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="gray.200"
                            >
                              <HStack gap={3}>
                                <Badge colorScheme="blue" fontSize="xs">#{idx + 1}</Badge>
                                <VStack align="start" gap={0}>
                                  <Text fontSize="sm" fontWeight="medium">{product.product_name}</Text>
                                  <Text fontSize="xs" color="gray.500">{product.category}</Text>
                                </VStack>
                              </HStack>
                              <VStack align="end" gap={0}>
                                <Text fontSize="sm" fontWeight="bold" color="green.600">
                                  ₱{product.total_revenue.toLocaleString()}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {product.total_quantity_sold} sold | {product.order_count} orders
                                </Text>
                              </VStack>
                            </Flex>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

          {/* Statistics Cards */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} gap={6}>
            <Box className="admin-stat-card">
              <Text className="admin-stat-label" fontSize="sm" color="gray.600">Total Users</Text>
              <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="blue.600">
                {dataLoading ? '...' : dashboardData.totalUsers.toLocaleString()}
              </Text>
              <Text className="admin-stat-help" fontSize="xs" color="gray.500">Registered customers</Text>
            </Box>
            
            <Box className="admin-stat-card">
              <Text className="admin-stat-label" fontSize="sm" color="gray.600">Total Orders</Text>
              <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="blue.600">
                {dataLoading ? '...' : dashboardData.totalOrders.toLocaleString()}
              </Text>
              <Text className="admin-stat-help" fontSize="xs" color="gray.500">All time orders</Text>
            </Box>
            
            <Box className="admin-stat-card">
              <Text className="admin-stat-label" fontSize="sm" color="gray.600">Revenue</Text>
              <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="blue.600">
                {dataLoading ? '...' : `₱${dashboardData.totalRevenue.toLocaleString()}`}
              </Text>
              <Text className="admin-stat-help" fontSize="xs" color="gray.500">From completed orders</Text>
            </Box>
            
            <Box className="admin-stat-card">
              <Text className="admin-stat-label" fontSize="sm" color="gray.600">Products</Text>
              <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="blue.600">
                {dataLoading ? '...' : dashboardData.totalProducts.toLocaleString()}
              </Text>
              <Text className="admin-stat-help" fontSize="xs" color="gray.500">{dashboardData.productsInStock} in stock</Text>
            </Box>
            
            <Box className="admin-stat-card">
              <Text className="admin-stat-label" fontSize="sm" color="gray.600">Stock Status</Text>
              <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="blue.600">
                {dataLoading ? '...' : dashboardData.totalProducts > 0 ? Math.round((dashboardData.productsInStock / dashboardData.totalProducts) * 100) : 0}%
              </Text>
              <Text className="admin-stat-help" fontSize="xs" color="gray.500">Products available</Text>
            </Box>
          </SimpleGrid>

          {/* Sales Report Section */}
          <Box className="admin-section">
            <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={4}>
              <Heading className="admin-section-title" size="lg">
                📊 Sales Report
              </Heading>
              <HStack gap={3}>
                <Text fontSize="sm" color="gray.600">Filter by:</Text>
                <SelectRoot
                  collection={salesPeriodOptions}
                  value={[salesPeriod]}
                  onValueChange={(details) => {
                    if (details.value && details.value.length > 0) {
                      setSalesPeriod(details.value[0] as 'day' | 'week' | 'month' | 'year');
                    }
                  }}
                  size="sm"
                  width="150px"
                >
                  <SelectTrigger style={{
                    backgroundColor: '#ffffff',
                    color: '#2d3748',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingRight: '12px'
                  }}>
                    <SelectValueText placeholder="Select period" />
                    <Text ml={2} fontSize="sm">▼</Text>
                  </SelectTrigger>
                  <SelectContent style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem'
                  }}>
                    {salesPeriodOptions.items.map((option) => (
                      <SelectItem
                        key={option.value}
                        item={option.value}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#2d3748'
                        }}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </HStack>
            </Flex>

            {(() => {
              const salesData = calculateSalesForPeriod(salesPeriod);
              const periodLabel = salesPeriodOptions.items.find(item => item.value === salesPeriod)?.label || 'This Period';

              return (
                <>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 6 }} gap={6} mb={6}>
                    <Box bg="green.50" p={5} borderRadius="lg" border="2px solid" borderColor="green.200">
                      <VStack align="start" gap={2}>
                        <HStack>
                          <Text fontSize="2xl">💰</Text>
                          <Text fontSize="sm" color="green.700" fontWeight="semibold">Total Revenue</Text>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="green.700">
                          ₱{salesData.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text fontSize="xs" color="green.600">{periodLabel}</Text>
                      </VStack>
                    </Box>

                    <Box bg="cyan.50" p={5} borderRadius="lg" border="2px solid" borderColor="cyan.200">
                      <VStack align="start" gap={2}>
                        <HStack>
                          <Text fontSize="2xl">🛍️</Text>
                          <Text fontSize="sm" color="cyan.700" fontWeight="semibold">Product Sales</Text>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="cyan.700">
                          ₱{salesData.productSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text fontSize="xs" color="cyan.600">Excluding shipping</Text>
                      </VStack>
                    </Box>

                    <Box bg="indigo.50" p={5} borderRadius="lg" border="2px solid" borderColor="indigo.200">
                      <VStack align="start" gap={2}>
                        <HStack>
                          <Text fontSize="2xl">🚚</Text>
                          <Text fontSize="sm" color="indigo.700" fontWeight="semibold">Shipping Fees</Text>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="indigo.700">
                          ₱{salesData.totalShippingFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text fontSize="xs" color="indigo.600">
                          {salesData.paidShippingCount} paid, {salesData.freeShippingCount} free
                        </Text>
                      </VStack>
                    </Box>

                    <Box bg="purple.50" p={5} borderRadius="lg" border="2px solid" borderColor="purple.200">
                      <VStack align="start" gap={2}>
                        <HStack>
                          <Text fontSize="2xl">✅</Text>
                          <Text fontSize="sm" color="purple.700" fontWeight="semibold">Completed</Text>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="purple.700">
                          {salesData.completedOrdersCount.toLocaleString()}
                        </Text>
                        <Text fontSize="xs" color="purple.600">Paid orders</Text>
                      </VStack>
                    </Box>

                    <Box bg="orange.50" p={5} borderRadius="lg" border="2px solid" borderColor="orange.200">
                      <VStack align="start" gap={2}>
                        <HStack>
                          <Text fontSize="2xl">⏳</Text>
                          <Text fontSize="sm" color="orange.700" fontWeight="semibold">Pending</Text>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="orange.700">
                          {salesData.pendingOrdersCount.toLocaleString()}
                        </Text>
                        <Text fontSize="xs" color="orange.600">Awaiting process</Text>
                      </VStack>
                    </Box>

                    <Box bg="teal.50" p={5} borderRadius="lg" border="2px solid" borderColor="teal.200">
                      <VStack align="start" gap={2}>
                        <HStack>
                          <Text fontSize="2xl">📊</Text>
                          <Text fontSize="sm" color="teal.700" fontWeight="semibold">Avg Order</Text>
                        </HStack>
                        <Text fontSize="2xl" fontWeight="bold" color="teal.700">
                          ₱{salesData.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text fontSize="xs" color="teal.600">Per order</Text>
                      </VStack>
                    </Box>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box bg="gray.50" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                      <VStack align="start" gap={2}>
                        <Text fontSize="sm" fontWeight="bold" color="gray.700">Revenue Breakdown</Text>
                        <HStack justify="space-between" width="100%">
                          <Text fontSize="xs" color="gray.600">Product Sales:</Text>
                          <Text fontSize="sm" fontWeight="semibold" color="cyan.700">
                            ₱{salesData.productSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontSize="xs" color="gray.600">Shipping Fees:</Text>
                          <Text fontSize="sm" fontWeight="semibold" color="indigo.700">
                            ₱{salesData.totalShippingFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </HStack>
                        <Box borderTop="1px solid" borderColor="gray.300" pt={2} width="100%">
                          <HStack justify="space-between" width="100%">
                            <Text fontSize="sm" fontWeight="bold" color="gray.700">Total Revenue:</Text>
                            <Text fontSize="md" fontWeight="bold" color="green.700">
                              ₱{salesData.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </HStack>
                        </Box>
                      </VStack>
                    </Box>

                    <Box bg="gray.50" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200">
                      <VStack align="start" gap={2}>
                        <Text fontSize="sm" fontWeight="bold" color="gray.700">Performance Metrics</Text>
                        <HStack justify="space-between" width="100%">
                          <Text fontSize="xs" color="gray.600">Completion Rate:</Text>
                          <Text fontSize="sm" fontWeight="semibold" color="purple.700">
                            {salesData.totalOrders > 0
                              ? `${Math.round((salesData.completedOrdersCount / salesData.totalOrders) * 100)}%`
                              : 'N/A'}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text fontSize="xs" color="gray.600">Free Shipping Rate:</Text>
                          <Text fontSize="sm" fontWeight="semibold" color="green.700">
                            {salesData.completedOrdersCount > 0
                              ? `${Math.round((salesData.freeShippingCount / salesData.completedOrdersCount) * 100)}%`
                              : 'N/A'}
                          </Text>
                        </HStack>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="blue"
                          onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                          width="100%"
                          mt={2}
                        >
                          View All Orders →
                        </Button>
                      </VStack>
                    </Box>
                  </SimpleGrid>
                </>
              );
            })()}
          </Box>

          {/* Priority Orders Section */}
          <Box className="admin-section">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading className="admin-section-title" size="lg">
                🚨 Priority Orders
              </Heading>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`${ROUTES.ADMIN_ORDERS}?filter=needs_processing`)}
              >
                View All Priority Orders
              </Button>
            </Flex>
            
            {/* Priority Statistics */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={6}>
              <Box bg="red.50" p={4} borderRadius="lg" border="2px solid" borderColor="red.200">
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <Text fontSize="sm" color="red.600" fontWeight="medium">🚨 Urgent Orders</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="red.700">
                      {dataLoading ? '...' : dashboardData.priorityStats.urgentCount}
                    </Text>
                    <Text fontSize="xs" color="red.500">Needs immediate attention</Text>
                  </VStack>
                  <Button 
                    size="sm" 
                    colorScheme="red" 
                    variant="solid"
                    onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                    disabled={dashboardData.priorityStats.urgentCount === 0}
                  >
                    Process Now
                  </Button>
                </HStack>
              </Box>
              
              <Box bg="orange.50" p={4} borderRadius="lg" border="2px solid" borderColor="orange.200">
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <Text fontSize="sm" color="orange.600" fontWeight="medium">⚠️ High Priority</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="orange.700">
                      {dataLoading ? '...' : dashboardData.priorityStats.highPriorityCount}
                    </Text>
                    <Text fontSize="xs" color="orange.500">Requires attention</Text>
                  </VStack>
                  <Button 
                    size="sm" 
                    colorScheme="orange" 
                    variant="solid"
                    onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                    disabled={dashboardData.priorityStats.highPriorityCount === 0}
                  >
                    Review
                  </Button>
                </HStack>
              </Box>
              
              <Box bg="blue.50" p={4} borderRadius="lg" border="2px solid" borderColor="blue.200">
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <Text fontSize="sm" color="blue.600" fontWeight="medium">📋 Pending Orders</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.700">
                      {dataLoading ? '...' : dashboardData.priorityStats.pendingCount}
                    </Text>
                    <Text fontSize="xs" color="blue.500">Awaiting processing</Text>
                  </VStack>
                  <Button 
                    size="sm" 
                    colorScheme="blue" 
                    variant="solid"
                    onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                    disabled={dashboardData.priorityStats.pendingCount === 0}
                  >
                    Process
                  </Button>
                </HStack>
              </Box>
            </SimpleGrid>

            {/* Urgent Orders List */}
            {dashboardData.urgentOrders.length > 0 && (
              <Box>
                <Heading size="md" mb={3} color="red.600">🚨 Urgent Orders Requiring Immediate Action</Heading>
                <VStack gap={3} align="stretch">
                  {dashboardData.urgentOrders.map(order => {
                    const priorityIndicator = getPriorityIndicator(order);
                    return (
                      <Box 
                        key={order.id}
                        bg="red.50" 
                        p={4} 
                        borderRadius="lg" 
                        border="2px solid" 
                        borderColor="red.200"
                        position="relative"
                      >
                        {priorityIndicator && (
                          <Badge 
                            position="absolute"
                            top={2}
                            right={2}
                            colorScheme={priorityIndicator.color}
                            fontSize="xs"
                            fontWeight="bold"
                          >
                            {priorityIndicator.icon} {priorityIndicator.text}
                          </Badge>
                        )}
                        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                          <VStack align="start" gap={1} flex={1}>
                            <HStack gap={4} wrap="wrap">
                              <Text fontWeight="bold" color="red.800">#{order.order_number}</Text>
                              <Text fontSize="sm" color="gray.600">
                                {order.user_first_name} {order.user_last_name}
                              </Text>
                              <Text fontWeight="bold" color="red.600">
                                ₱{((order.total_amount || 0) + (order.free_shipping ? 0 : (order.shipping_fee || 0))).toFixed(2)}
                              </Text>
                            </HStack>
                            <HStack gap={4} wrap="wrap">
                              <Badge colorScheme={getStatusColor(order.order_status)}>
                                {formatStatus(order.order_status)}
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                Created: {formatDate(order.created_at)}
                              </Text>
                            </HStack>
                          </VStack>
                          <HStack gap={2}>
                            <Button 
                              size="sm" 
                              colorScheme="red"
                              onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                            >
                              Process Now
                            </Button>
                          </HStack>
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            )}

            {/* Pending Orders Preview */}
            {dashboardData.pendingOrders.length > 0 && (
              <Box mt={6}>
                <Heading size="md" mb={3} color="blue.600">📋 Recent Pending Orders</Heading>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                  {dashboardData.pendingOrders.slice(0, 4).map(order => (
                    <Box 
                      key={order.id}
                      bg="blue.50" 
                      p={3} 
                      borderRadius="md" 
                      border="1px solid" 
                      borderColor="blue.200"
                      _hover={{ bg: "blue.100", cursor: "pointer" }}
                      onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                    >
                      <Flex justify="space-between" align="center">
                        <VStack align="start" gap={1} flex={1}>
                          <HStack gap={2}>
                            <Text fontWeight="bold" fontSize="sm" color="blue.800">#{order.order_number}</Text>
                            <Text fontSize="xs" color="gray.600">
                              {order.user_first_name} {order.user_last_name}
                            </Text>
                          </HStack>
                          <HStack gap={2}>
                            <Text fontWeight="bold" fontSize="sm" color="blue.600">
                              ₱{((order.total_amount || 0) + (order.free_shipping ? 0 : (order.shipping_fee || 0))).toFixed(2)}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatDate(order.created_at)}
                            </Text>
                          </HStack>
                        </VStack>
                        <Text fontSize="xs" color="blue.500">Click to process →</Text>
                      </Flex>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </Box>

          {/* Recent Orders Table */}
          <Box className="admin-section">
            <Heading className="admin-section-title" size="lg" mb={4}>
              Recent Orders
            </Heading>
            <Box className="admin-table-container" overflowX="auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        Loading orders...
                      </td>
                    </tr>
                  ) : dashboardData.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    dashboardData.recentOrders.map(order => (
                      <tr key={order.id}>
                        <td className="admin-table-cell-bold">#{order.order_number}</td>
                        <td>{order.user_first_name} {order.user_last_name}</td>
                        <td>
                          <VStack align="start" gap={0}>
                            <Text fontWeight="bold">₱{((order.total_amount || 0) + (order.free_shipping ? 0 : (order.shipping_fee || 0))).toFixed(2)}</Text>
                            {order.shipping_fee !== undefined && order.shipping_fee > 0 && !order.free_shipping && (
                              <Text fontSize="xs" color="gray.500">
                                +₱{order.shipping_fee.toFixed(2)} shipping
                              </Text>
                            )}
                            {order.free_shipping && (
                              <Text fontSize="xs" color="green.600">
                                Free shipping
                              </Text>
                            )}
                          </VStack>
                        </td>
                        <td>
                          <Badge colorScheme={getStatusColor(order.order_status)}>
                            {formatStatus(order.order_status)}
                          </Badge>
                        </td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
          </Box>

          {/* Products Management */}
          <Box className="admin-section">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading className="admin-section-title" size="lg">
                Product Management
              </Heading>
              <HStack gap={3}>
                <Button className="admin-action-button" variant="outline">
                  Add Product
                </Button>
                <Button className="admin-action-button">
                  Manage Inventory
                </Button>
              </HStack>
            </Flex>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
              {dataLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Box key={index} className="admin-product-card">
                    <Flex gap={4} align="center">
                      <Box className="admin-product-image" bg="gray.100" w="60px" h="60px" borderRadius="8px" />
                      <VStack align="start" flex={1} gap={1}>
                        <Text>Loading...</Text>
                      </VStack>
                    </Flex>
                  </Box>
                ))
              ) : dashboardData.recentProducts.length === 0 ? (
                <Box gridColumn="1 / -1" textAlign="center" py={8}>
                  <Text color="gray.500">No products found</Text>
                </Box>
              ) : (
                dashboardData.recentProducts.map(product => (
                  <Box key={product.id} className="admin-product-card">
                    <Flex gap={4} align="center">
                      <Box className="admin-product-image">
                        {product.image_url ? (
                          <img 
                            src={API_ENDPOINTS.image(product.image_url)} 
                            alt={product.name}
                            style={{
                              width: '60px',
                              height: '60px',      
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Box
                            w="60px"
                            h="60px"
                            bg="gray.100"
                            borderRadius="8px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            🏗️
                          </Box>
                        )}
                      </Box>
                      <VStack align="start" flex={1} gap={1}>
                        <Text className="admin-product-name" fontWeight="bold" fontSize="sm">
                          {product.name}
                        </Text>
                        <Text className="admin-product-price" color="blue.500" fontWeight="bold">
                          ₱{product.price.toFixed(2)}
                        </Text>
                        <Badge colorScheme={product.is_active && product.stock_quantity > 0 ? 'green' : 'red'} size="sm">
                          {product.is_active && product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of Stock'}
                        </Badge>
                      </VStack>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
                      >
                        Edit
                      </Button>
                    </Flex>
                  </Box>
                ))
              )}
            </SimpleGrid>
          </Box>

          {/* Quick Actions */}
          <Box className="admin-section">
            <Heading className="admin-section-title" size="lg" mb={4}>
              Quick Actions
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
              <Button 
                className="admin-quick-action" 
                size="lg" 
                variant={dashboardData.priorityStats.urgentCount > 0 ? "solid" : "outline"}
                colorScheme={dashboardData.priorityStats.urgentCount > 0 ? "red" : "gray"}
                onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
              >
                <HStack gap={2}>
                  <Text>🚨 Priority Orders</Text>
                  {dashboardData.priorityStats.urgentCount > 0 && (
                    <Badge bg="white" color="red.600" borderRadius="full" fontSize="xs">
                      {dashboardData.priorityStats.urgentCount}
                    </Badge>
                  )}
                </HStack>
              </Button>
              <Button 
                className="admin-quick-action" 
                size="lg" 
                variant="outline"
                onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
              >
                📊 All Orders
              </Button>
              <Button 
                className="admin-quick-action" 
                size="lg" 
                variant="outline"
                onClick={() => navigate(ROUTES.ADMIN_USERS)}
              >
                👥 Manage Users
              </Button>
              <Button 
                className="admin-quick-action" 
                size="lg" 
                variant="outline"
                onClick={() => navigate(ROUTES.ADMIN_PRODUCTS)}
              >
                📦 Inventory
              </Button>
            </SimpleGrid>
            
            {/* Additional Priority Actions */}
            {(dashboardData.priorityStats.urgentCount > 0 || dashboardData.priorityStats.pendingCount > 0) && (
              <Box mt={4}>
                <Text fontSize="sm" color="gray.600" mb={3}>Priority Actions:</Text>
                <HStack gap={3} wrap="wrap">
                  {dashboardData.priorityStats.urgentCount > 0 && (
                    <Button 
                      size="sm"
                      colorScheme="red" 
                      variant="solid"
                      onClick={() => navigate(`${ROUTES.ADMIN_ORDERS}?filter=urgent`)}
                    >
                      🚨 Process {dashboardData.priorityStats.urgentCount} Urgent Order{dashboardData.priorityStats.urgentCount !== 1 ? 's' : ''}
                    </Button>
                  )}
                  {dashboardData.priorityStats.pendingCount > 0 && (
                    <Button 
                      size="sm"
                      colorScheme="blue" 
                      variant="outline"
                      onClick={() => navigate(`${ROUTES.ADMIN_ORDERS}?filter=pending`)}
                    >
                      📋 Review {dashboardData.priorityStats.pendingCount} Pending Order{dashboardData.priorityStats.pendingCount !== 1 ? 's' : ''}
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={fetchDashboardData}
                  >
                    🔄 Refresh Data
                  </Button>
                </HStack>
              </Box>
            )}
          </Box>
            </VStack>
          </Container>
        </Box>
      </Flex>
    </Box>
  );
};

export default Admin;