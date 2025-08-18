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
    recentProducts: [] as Product[]
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
      
      setDashboardData({
        totalUsers: users.length,
        totalOrders: orders.length,
        totalRevenue,
        totalProducts: products.length,
        productsInStock,
        recentOrders,
        recentProducts
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
                variant="outline"
                onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
              >
                📊 View Orders
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
                📦 Inventory Check
              </Button>
              <Button 
                className="admin-quick-action" 
                size="lg" 
                variant="outline"
                onClick={fetchDashboardData}
              >
                🔄 Refresh Data
              </Button>
            </SimpleGrid>
          </Box>
            </VStack>
          </Container>
        </Box>
      </Flex>
    </Box>
  );
};

export default Admin;