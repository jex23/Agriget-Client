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
  Badge,
  Image,
  Spinner,
  Center,
  createToaster
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
import type { Order, OrderStatus, PaymentStatus } from '../types/order';
import authService from '../services/authService.js';
import { orderService } from '../services/orderService';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import AdminHeader from '../components/AdminHeader.js';
import AdminSidebar from '../components/AdminSidebar.js';
import './AdminOrders.css';

const AdminOrders: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ isExpanded: false, isMobile: window.innerWidth <= 1024 });
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const navigate = useNavigate();
  
  const toaster = createToaster({
    placement: 'top',
  });

  const statusOptions = createListCollection({
    items: [
      { label: 'All Orders', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Processing', value: 'processing' },
      { label: 'On Delivery', value: 'on_delivery' },
      { label: 'Completed', value: 'completed' },
      { label: 'Canceled', value: 'canceled' },
    ],
  });

  const orderStatusOptions = createListCollection({
    items: [
      { label: 'Pending', value: 'pending' },
      { label: 'Processing', value: 'processing' },
      { label: 'On Delivery', value: 'on_delivery' },
      { label: 'Completed', value: 'completed' },
      { label: 'Canceled', value: 'canceled' },
    ],
  });

  const paymentStatusOptions = createListCollection({
    items: [
      { label: 'Pending', value: 'pending' },
      { label: 'Paid', value: 'paid' },
      { label: 'Failed', value: 'failed' },
    ],
  });

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
    fetchOrders();
  }, [navigate]);

  const handleSidebarStateChange = (state: { isExpanded: boolean; isMobile: boolean }) => {
    setSidebarState(state);
  };

  // Calculate content class based on sidebar state
  const getContentClass = () => {
    let className = 'admin-main-content';
    if (!sidebarState.isMobile) {
      if (sidebarState.isExpanded) {
        className += ' sidebar-expanded';
      }
    }
    return className;
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getAllOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStatus === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.order_status === selectedStatus));
    }
  }, [orders, selectedStatus]);


  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleOrderStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await orderService.updateOrder(orderId, { order_status: newStatus });
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, order_status: newStatus }
            : order
        )
      );

      toaster.create({
        title: 'Order Updated',
        description: `Order status changed to ${formatStatus(newStatus)}`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to update order status. Please try again.',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handlePaymentStatusUpdate = async (orderId: number, newStatus: PaymentStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await orderService.updateOrder(orderId, { payment_status: newStatus });
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, payment_status: newStatus }
            : order
        )
      );

      toaster.create({
        title: 'Payment Updated',
        description: `Payment status changed to ${formatStatus(newStatus)}`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to update payment status. Please try again.',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setUpdatingOrderId(null);
    }
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'paid':
        return 'green';
      case 'failed':
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Box className="admin-orders-container">
        <AdminSidebar 
          isOpen={isSidebarOpen}
          onToggle={handleSidebarToggle}
          onSidebarStateChange={handleSidebarStateChange}
        />
        
        <AdminHeader 
          user={user} 
          onSidebarToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
          notifications={0}
          sidebarState={sidebarState}
        />
        
        <Box className={getContentClass()}>
          <Container maxW="container.xl" py={8}>
            <Center py={20}>
              <VStack>
                <Spinner size="xl" color="blue.500" />
                <Text color="gray.600">Loading orders...</Text>
              </VStack>
            </Center>
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="admin-orders-container">
      <AdminSidebar 
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
        onSidebarStateChange={handleSidebarStateChange}
      />
      
      <AdminHeader 
        user={user} 
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        notifications={0}
        sidebarState={sidebarState}
      />
      
      <Box className={getContentClass()}>
          <Container maxW="container.xl" py={8}>
            <VStack align="stretch" gap={6}>
              <Box>
                <HStack gap={4} align="center" mb={2}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(ROUTES.ADMIN)}
                    className="back-to-admin-btn"
                  >
                    <HStack gap={2}>
                      <Text>←</Text>
                      <Text>Back to Dashboard</Text>
                    </HStack>
                  </Button>
                </HStack>
                <Heading size="lg" color="blue.700" mb={2}>
                  Order Management
                </Heading>
                <Text color="gray.600">
                  Manage and process customer orders
                </Text>
              </Box>

              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={3}>Filter by Status:</Text>
                  <Box className="admin-order-tabs-container">
                    <HStack gap={2} wrap="wrap">
                      {statusOptions.items.map((tab) => (
                        <Button
                          key={tab.value}
                          size="sm"
                          variant={selectedStatus === tab.value ? "solid" : "outline"}
                          colorScheme={selectedStatus === tab.value ? "blue" : "gray"}
                          className={`admin-order-tab ${selectedStatus === tab.value ? 'admin-order-tab-active' : 'admin-order-tab-inactive'}`}
                          onClick={() => setSelectedStatus(tab.value)}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </HStack>
                  </Box>
                </Box>
                <Flex justify="flex-end">
                  <Text fontSize="sm" color="gray.500">
                    Showing {filteredOrders.length} of {orders.length} orders
                  </Text>
                </Flex>
              </VStack>

              {error && (
                <Box bg="red.50" p={4} borderRadius="lg" border="1px solid" borderColor="red.200">
                  <Text color="red.600" fontWeight="medium">Error: {error}</Text>
                </Box>
              )}

              {filteredOrders.length === 0 ? (
                <Box bg="white" p={8} borderRadius="lg" shadow="md">
                  <VStack py={8}>
                    <Text fontSize="xl" color="gray.500" mb={4}>
                      📋 No orders found
                    </Text>
                    <Text color="gray.400" textAlign="center" mb={6}>
                      {orders.length === 0 
                        ? "No orders have been placed yet."
                        : `No orders found with status "${selectedStatus === 'all' ? 'All' : formatStatus(selectedStatus)}". Try changing the filter.`
                      }
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <VStack gap={4} align="stretch">
                  {filteredOrders.map((order) => (
                    <Box key={order.id} bg="white" p={6} shadow="md" borderRadius="lg" className="admin-order-card">
                      <Flex direction={{ base: "column", lg: "row" }} gap={6} align="stretch">
                        {/* Left Section - Order Info */}
                        <Flex gap={4} flex={1} align="start">
                          <Box w={{ base: "80px", md: "100px" }} h={{ base: "80px", md: "100px" }} flexShrink={0}>
                            {order.product_image ? (
                              <Image
                                src={API_ENDPOINTS.image(order.product_image)}
                                alt={order.product_name || 'Product'}
                                w="full"
                                h="full"
                                objectFit="cover"
                                borderRadius="lg"
                              />
                            ) : (
                              <Box
                                w="full"
                                h="full"
                                bg="gray.100"
                                borderRadius="lg"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                fontSize="2xl"
                              >
                                🏗️
                              </Box>
                            )}
                          </Box>
                          <VStack align="start" flex={1} gap={2} justify="start">
                            <Text fontWeight="bold" fontSize="lg" color="gray.800">
                              {order.product_name || 'Product'}
                            </Text>
                            <HStack gap={4} wrap="wrap">
                              <Text fontSize="sm" color="gray.600">
                                Qty: <Text as="span" fontWeight="medium">{order.quantity}</Text>
                              </Text>
                              <Text fontSize="lg" fontWeight="bold" color="blue.600">
                                ₱{order.total_amount.toFixed(2)}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" fontWeight="bold" color="blue.600">
                              #{order.order_number}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Customer: <Text as="span" fontWeight="medium">{order.user_first_name} {order.user_last_name}</Text>
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Email: <Text as="span" fontWeight="medium">{order.user_email}</Text>
                            </Text>
                          </VStack>
                        </Flex>

                        {/* Middle Section - Order Details */}
                        <VStack align="start" gap={3} minW={{ base: "full", lg: "300px" }}>
                          <Text fontSize="sm" color="gray.500" fontWeight="medium">
                            Order Details
                          </Text>
                          <VStack align="stretch" gap={2} w="full">
                            <Flex justify="space-between" align="center">
                              <Text fontSize="sm" color="gray.600">Payment Terms:</Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {formatStatus(order.payment_terms)}
                              </Text>
                            </Flex>
                            {order.shipping_address && (
                              <Flex justify="space-between" align="start">
                                <Text fontSize="sm" color="gray.600">Shipping:</Text>
                                <Text fontSize="sm" fontWeight="medium" maxW="180px" textAlign="right">
                                  {order.shipping_address}
                                </Text>
                              </Flex>
                            )}
                            <Flex justify="space-between" align="center">
                              <Text fontSize="sm" color="gray.600">Order Date:</Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {formatDate(order.created_at)}
                              </Text>
                            </Flex>
                          </VStack>
                        </VStack>

                        {/* Right Section - Status Management */}
                        <VStack align={{ base: "stretch", lg: "end" }} gap={3} minW={{ base: "full", lg: "300px" }}>
                          <VStack align="stretch" gap={3} w="full">
                            {/* Order Status */}
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb={2}>Order Status:</Text>
                              <SelectRoot
                                collection={orderStatusOptions}
                                value={[order.order_status]}
                                onValueChange={(details) => {
                                  if (details.value && details.value.length > 0) {
                                    handleOrderStatusUpdate(order.id, details.value[0] as OrderStatus);
                                  }
                                }}
                                size="sm"
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger>
                                  <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                  {orderStatusOptions.items.map((option) => (
                                    <SelectItem key={option.value} item={option.value}>
                                      <Badge colorScheme={getStatusColor(option.value)} size="sm">
                                        {option.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectRoot>
                            </Box>

                            {/* Payment Status */}
                            <Box>
                              <Text fontSize="sm" color="gray.600" mb={2}>Payment Status:</Text>
                              <SelectRoot
                                collection={paymentStatusOptions}
                                value={[order.payment_status]}
                                onValueChange={(details) => {
                                  if (details.value && details.value.length > 0) {
                                    handlePaymentStatusUpdate(order.id, details.value[0] as PaymentStatus);
                                  }
                                }}
                                size="sm"
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger>
                                  <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentStatusOptions.items.map((option) => (
                                    <SelectItem key={option.value} item={option.value}>
                                      <Badge colorScheme={getPaymentStatusColor(option.value)} size="sm">
                                        {option.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectRoot>
                            </Box>

                            {updatingOrderId === order.id && (
                              <HStack justify="center">
                                <Spinner size="sm" />
                                <Text fontSize="sm" color="gray.500">Updating...</Text>
                              </HStack>
                            )}
                          </VStack>
                        </VStack>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </VStack>
          </Container>
      </Box>
    </Box>
  );
};

export default AdminOrders;