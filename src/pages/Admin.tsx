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
  Badge
} from '@chakra-ui/react';
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
  const navigate = useNavigate();

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
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      
      // Fetch all data in parallel
      const [orders, products, users] = await Promise.all([
        orderService.getAllOrders().catch(() => []),
        productService.getProducts().catch(() => []),
        adminUserService.getAllUsers().catch(() => [])
      ]);
      
      // Calculate statistics
      const totalRevenue = orders.reduce((sum, order) => {
        return order.order_status === 'completed' && order.payment_status === 'paid'
          ? sum + order.total_amount
          : sum;
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
                              <Text fontWeight="bold" color="red.600">₱{order.total_amount.toFixed(2)}</Text>
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
                            <Text fontWeight="bold" fontSize="sm" color="blue.600">₱{order.total_amount.toFixed(2)}</Text>
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
                        <td>₱{order.total_amount.toFixed(2)}</td>
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