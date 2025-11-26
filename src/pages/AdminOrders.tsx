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
  createToaster,
  Icon
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
import { FiImage } from 'react-icons/fi';
import type { User } from '../types/auth.js';
import type { Order, OrderStatus, PaymentStatus, ShipmentType } from '../types/order';
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  const navigate = useNavigate();
  
  const toaster = createToaster({
    placement: 'top',
  });

  const statusOptions = createListCollection({
    items: [
      { label: 'All Orders', value: 'all' },
      { label: '🚨 Needs Processing', value: 'needs_processing' },
      { label: 'Pending', value: 'pending' },
      { label: 'Processing', value: 'processing' },
      { label: 'On Delivery', value: 'on_delivery' },
      { label: 'Completed', value: 'completed' },
      { label: 'Canceled', value: 'canceled' },
    ],
  });

  // Helper function to get available order status options based on current status
  const getOrderStatusOptions = (currentStatus: OrderStatus) => {
    const allOptions = [
      { label: 'Pending', value: 'pending' },
      { label: 'Processing', value: 'processing' },
      { label: 'On Delivery', value: 'on_delivery' },
      { label: 'Completed', value: 'completed' },
      { label: 'Canceled', value: 'canceled' },
    ];

    // If current status is not 'pending', exclude 'pending' from options
    if (currentStatus !== 'pending') {
      return createListCollection({
        items: allOptions.filter(option => option.value !== 'pending')
      });
    }

    return createListCollection({ items: allOptions });
  };

  // Helper function to get available payment status options based on current status
  const getPaymentStatusOptions = (currentStatus: PaymentStatus) => {
    const allOptions = [
      { label: 'Pending', value: 'pending' },
      { label: 'Paid', value: 'paid' },
      { label: 'Failed', value: 'failed' },
    ];

    // If current status is 'paid' or 'failed', exclude 'pending' from options
    if (currentStatus === 'paid' || currentStatus === 'failed') {
      return createListCollection({
        items: allOptions.filter(option => option.value !== 'pending')
      });
    }

    return createListCollection({ items: allOptions });
  };


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

      // Trigger sidebar refresh to update pending count
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async (): Promise<Order[]> => {
    try {
      console.log('🔄 [REFRESH] Fetching latest orders from database...');
      const ordersData = await orderService.getAllOrders();
      console.log('🔄 [REFRESH] Received orders:', ordersData.length, 'orders');

      // Log the specific order we just updated to verify the data
      const orderIds = ordersData.map(o => o.id);
      console.log('🔄 [REFRESH] Order IDs in response:', orderIds);

      setOrders(ordersData);
      console.log('🔄 [REFRESH] State updated with new orders');

      // Trigger sidebar refresh to update pending count
      setRefreshTrigger(prev => prev + 1);

      // Return the fresh data so caller can use it directly
      return ordersData;
    } catch (error) {
      console.error('❌ [REFRESH] Error refreshing orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh orders');
      return [];
    }
  };

  const getOrderPriority = (order: Order): number => {
    // Priority scoring system (lower number = higher priority)
    let priority = 0;
    
    // Order status priority
    switch (order.order_status) {
      case 'pending':
        priority += 1; // Highest priority - new orders need immediate attention
        break;
      case 'processing':
        priority += 2; // Second priority - already being worked on
        break;
      case 'on_delivery':
        priority += 3; // Third priority - in transit
        break;
      case 'completed':
        priority += 5; // Lower priority - already done
        break;
      case 'canceled':
        priority += 6; // Lowest priority - canceled orders
        break;
    }
    
    // Payment status priority modifier
    if (order.payment_status === 'pending' && order.order_status !== 'canceled') {
      priority -= 0.5; // Boost priority for unpaid orders that need attention
    }
    
    // Age priority modifier (older orders get higher priority)
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    const daysSinceCreated = orderAge / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 3) {
      priority -= 0.3; // Boost priority for orders older than 3 days
    }
    
    return priority;
  };

  const sortOrdersByPriority = (ordersList: Order[]): Order[] => {
    return [...ordersList].sort((a, b) => {
      const priorityA = getOrderPriority(a);
      const priorityB = getOrderPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower priority score comes first
      }
      
      // If same priority, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  useEffect(() => {
    let filtered: Order[];
    
    if (selectedStatus === 'all') {
      filtered = orders;
    } else if (selectedStatus === 'needs_processing') {
      // Filter orders that need immediate processing
      filtered = orders.filter(order => 
        isHighPriorityOrder(order) || isUrgentOrder(order)
      );
    } else {
      filtered = orders.filter(order => order.order_status === selectedStatus);
    }
    
    // Always sort by priority regardless of filter
    const sortedFiltered = sortOrdersByPriority(filtered);
    setFilteredOrders(sortedFiltered);
  }, [orders, selectedStatus]);


  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleOrderStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    console.log('🔵 [ORDER STATUS UPDATE] Starting update...');
    console.log('  Order ID:', orderId);
    console.log('  New Status:', newStatus);
    console.log('  Status Type:', typeof newStatus);
    console.log('  Valid Statuses:', ['pending', 'processing', 'on_delivery', 'completed', 'canceled']);
    console.log('  Is Valid:', ['pending', 'processing', 'on_delivery', 'completed', 'canceled'].includes(newStatus));

    const oldOrder = orders.find(o => o.id === orderId);
    console.log('  Current order status:', oldOrder?.order_status);

    try {
      setUpdatingOrderId(orderId);

      const updateData = { order_status: newStatus };
      console.log('  Update Data:', JSON.stringify(updateData));

      const response = await orderService.updateOrder(orderId, updateData);
      console.log('✅ [ORDER STATUS UPDATE] API Response:', response);
      console.log('  Response order_status:', response.order_status);

      // Add a small delay to ensure backend transaction has committed
      console.log('  Waiting 300ms for backend transaction to commit...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Refresh orders to ensure state is in sync with database
      console.log('  Calling refreshOrders()...');
      const freshOrders = await refreshOrders();

      // Use the fresh data directly instead of relying on state closure
      const updatedOrder = freshOrders.find(o => o.id === orderId);
      console.log('  Order in fresh data:', updatedOrder?.order_status);

      if (updatedOrder && updatedOrder.order_status === newStatus) {
        console.log('✅ [ORDER STATUS UPDATE] Verification successful - order status matches in database');
      } else {
        console.warn('⚠️ [ORDER STATUS UPDATE] Verification issue:');
        console.warn('  Expected status:', newStatus);
        console.warn('  Actual status in DB:', updatedOrder?.order_status);
      }

      toaster.create({
        title: 'Order Updated',
        description: `Order status changed to ${formatStatus(newStatus)}`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ [ORDER STATUS UPDATE] Error:', error);
      console.error('  Error details:', error instanceof Error ? error.message : 'Unknown error');
      toaster.create({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update order status. Please try again.',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handlePaymentStatusUpdate = async (orderId: number, newStatus: PaymentStatus) => {
    console.log('🟢 [PAYMENT STATUS UPDATE] Starting update...');
    console.log('  Order ID:', orderId);
    console.log('  New Status:', newStatus);
    console.log('  Status Type:', typeof newStatus);
    console.log('  Valid Statuses:', ['pending', 'paid', 'failed']);
    console.log('  Is Valid:', ['pending', 'paid', 'failed'].includes(newStatus));

    const oldOrder = orders.find(o => o.id === orderId);
    console.log('  Current payment status:', oldOrder?.payment_status);

    try {
      setUpdatingOrderId(orderId);

      const updateData = { payment_status: newStatus };
      console.log('  Update Data:', JSON.stringify(updateData));

      const response = await orderService.updateOrder(orderId, updateData);
      console.log('✅ [PAYMENT STATUS UPDATE] API Response:', response);
      console.log('  Response payment_status:', response.payment_status);

      // Refresh orders to ensure state is in sync with database
      await refreshOrders();

      toaster.create({
        title: 'Payment Updated',
        description: `Payment status changed to ${formatStatus(newStatus)}`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ [PAYMENT STATUS UPDATE] Error:', error);
      console.error('  Error details:', error instanceof Error ? error.message : 'Unknown error');
      toaster.create({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update payment status. Please try again.',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleShipmentTypeUpdate = async (orderId: number, newShipmentType: ShipmentType) => {
    console.log('🟡 [SHIPMENT TYPE UPDATE] Starting update...');
    console.log('  Order ID:', orderId);
    console.log('  New Shipment Type:', newShipmentType);
    console.log('  Type:', typeof newShipmentType);
    console.log('  Valid Types:', ['delivery', 'pickup']);
    console.log('  Is Valid:', ['delivery', 'pickup'].includes(newShipmentType));

    const oldOrder = orders.find(o => o.id === orderId);
    console.log('  Current shipment type:', oldOrder?.shipment_type);

    try {
      setUpdatingOrderId(orderId);

      const updateData = { shipment_type: newShipmentType };
      console.log('  Update Data:', JSON.stringify(updateData));

      const response = await orderService.updateOrder(orderId, updateData);
      console.log('✅ [SHIPMENT TYPE UPDATE] API Response:', response);
      console.log('  Response shipment_type:', response.shipment_type);

      // Refresh orders to ensure state is in sync with database
      await refreshOrders();

      toaster.create({
        title: 'Shipment Type Updated',
        description: `Shipment type changed to ${formatStatus(newShipmentType)}`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ [SHIPMENT TYPE UPDATE] Error:', error);
      console.error('  Error details:', error instanceof Error ? error.message : 'Unknown error');
      toaster.create({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update shipment type. Please try again.',
        type: 'error',
        duration: 5000,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getShipmentTypeColor = (shipmentType: string) => {
    switch (shipmentType) {
      case 'delivery':
        return 'blue';
      case 'pickup':
        return 'green';
      default:
        return 'gray';
    }
  };

  const formatStatus = (status: string) => {
    // Special case for payment terms
    if (status === 'over_the_counter') {
      return 'Pay Upon Pick Up';
    }
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
        color: 'red',
        bg: 'red.50',
        borderColor: 'red.200'
      };
    }
    if (isHighPriorityOrder(order)) {
      return {
        icon: '⚠️',
        text: 'High Priority',
        color: 'orange',
        bg: 'orange.50',
        borderColor: 'orange.200'
      };
    }
    return null;
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
          refreshTrigger={refreshTrigger}
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
        refreshTrigger={refreshTrigger}
      />
      
      <AdminHeader 
        user={user} 
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        notifications={0}
        sidebarState={sidebarState}
      />
      
      <Box className={getContentClass()}>
          <Container maxW="container.xl" py={{ base: 4, md: 6, lg: 8 }} px={{ base: 4, md: 6 }}>
            <VStack align="stretch" gap={{ base: 4, md: 6 }}>
              <Box>
                <HStack gap={{ base: 2, md: 4 }} align="center" mb={{ base: 2, md: 2 }} wrap="wrap">
                  <Button
                    variant="ghost"
                    size={{ base: "xs", md: "sm" }}
                    onClick={() => navigate(ROUTES.ADMIN)}
                    className="back-to-admin-btn"
                  >
                    <HStack gap={{ base: 1, md: 2 }}>
                      <Text fontSize={{ base: "sm", md: "md" }}>←</Text>
                      <Text fontSize={{ base: "sm", md: "md" }} display={{ base: "none", sm: "block" }}>Back to Dashboard</Text>
                      <Text fontSize={{ base: "sm", md: "md" }} display={{ base: "block", sm: "none" }}>Back</Text>
                    </HStack>
                  </Button>
                </HStack>
                <Heading size={{ base: "md", md: "lg" }} color="blue.700" mb={2}>
                  Order Management
                </Heading>
                <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>
                  Manage and process customer orders
                </Text>
              </Box>

              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 2, md: 3 }}>Filter by Status:</Text>
                  <SelectRoot
                    collection={statusOptions}
                    value={[selectedStatus]}
                    onValueChange={(details) => {
                      if (details.value && details.value.length > 0) {
                        setSelectedStatus(details.value[0]);
                      }
                    }}
                    size={{ base: "sm", md: "md" }}
                    width={{ base: "full", md: "320px" }}
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
                      <SelectValueText placeholder="Select status filter" />
                      <Text ml={2} fontSize="sm">▼</Text>
                    </SelectTrigger>
                    <SelectContent style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem'
                    }}>
                      {statusOptions.items.map((option) => (
                        <SelectItem
                          key={option.value}
                          item={option.value}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2d3748'
                          }}
                          _hover={{
                            backgroundColor: '#f7fafc'
                          }}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </Box>
                <Flex direction={{ base: "column", lg: "row" }} justify="space-between" align={{ base: "stretch", lg: "center" }} gap={{ base: 3, lg: 4 }}>
                  <VStack align={{ base: "center", lg: "flex-start" }} gap={3}>
                    <HStack gap={{ base: 2, md: 4 }} wrap="wrap" justify={{ base: "center", lg: "flex-start" }}>
                      {/* Priority Summary */}
                      <Badge colorScheme="red" size={{ base: "sm", md: "md" }} px={{ base: 2, md: 3 }} py={1} borderRadius="full">
                        <HStack gap={1}>
                          <Text>🚨</Text>
                          <Text display={{ base: "none", sm: "block" }}>Urgent:</Text>
                          <Text fontWeight="bold">{filteredOrders.filter(isUrgentOrder).length}</Text>
                        </HStack>
                      </Badge>
                      <Badge colorScheme="orange" size={{ base: "sm", md: "md" }} px={{ base: 2, md: 3 }} py={1} borderRadius="full">
                        <HStack gap={1}>
                          <Text>⚠️</Text>
                          <Text display={{ base: "none", sm: "block" }}>High Priority:</Text>
                          <Text fontWeight="bold">{filteredOrders.filter(isHighPriorityOrder).length}</Text>
                        </HStack>
                      </Badge>
                      <Badge colorScheme="blue" size={{ base: "sm", md: "md" }} px={{ base: 2, md: 3 }} py={1} borderRadius="full">
                        <HStack gap={1}>
                          <Text>📋</Text>
                          <Text display={{ base: "none", sm: "block" }}>Pending:</Text>
                          <Text fontWeight="bold">{filteredOrders.filter(order => order.order_status === 'pending').length}</Text>
                        </HStack>
                      </Badge>
                    </HStack>
                  </VStack>
                  <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500" textAlign={{ base: "center", lg: "right" }} mt={{ base: 2, lg: 0 }}>
                    Showing {filteredOrders.length} of {orders.length} orders
                  </Text>
                </Flex>
              </VStack>

              {error && (
                <Box bg="red.50" p={{ base: 3, md: 4 }} borderRadius="lg" border="1px solid" borderColor="red.200">
                  <Text color="red.600" fontWeight="medium" fontSize={{ base: "sm", md: "md" }}>Error: {error}</Text>
                </Box>
              )}

              {filteredOrders.length === 0 ? (
                <Box bg="white" p={{ base: 6, md: 8 }} borderRadius="lg" shadow="md">
                  <VStack py={{ base: 6, md: 8 }}>
                    <Text fontSize={{ base: "lg", md: "xl" }} color="gray.500" mb={4}>
                      📋 No orders found
                    </Text>
                    <Text color="gray.400" textAlign="center" mb={6} fontSize={{ base: "sm", md: "md" }} px={{ base: 2, md: 0 }}>
                      {orders.length === 0 
                        ? "No orders have been placed yet."
                        : `No orders found with status "${selectedStatus === 'all' ? 'All' : formatStatus(selectedStatus)}". Try changing the filter.`
                      }
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <VStack gap={4} align="stretch">
                  {filteredOrders.map((order) => {
                    const priorityIndicator = getPriorityIndicator(order);
                    
                    return (
                    <Box 
                      key={order.id} 
                      bg={priorityIndicator ? priorityIndicator.bg : "white"}
                      p={{ base: 4, md: 5, lg: 6 }} 
                      shadow={priorityIndicator ? "lg" : "md"}
                      borderRadius={{ base: "md", md: "lg" }} 
                      border={priorityIndicator ? "2px solid" : "1px solid"}
                      borderColor={priorityIndicator ? priorityIndicator.borderColor : "gray.200"}
                      className="admin-order-card"
                      position="relative"
                      overflow="hidden"
                    >
                      {/* Priority Indicator Badge */}
                      {priorityIndicator && (
                        <Box
                          position="absolute"
                          top={{ base: 2, md: 3 }}
                          right={{ base: 2, md: 3 }}
                          zIndex={2}
                        >
                          <Badge 
                            colorScheme={priorityIndicator.color}
                            fontSize={{ base: "2xs", md: "xs" }}
                            fontWeight="bold"
                            px={{ base: 2, md: 3 }}
                            py={1}
                            borderRadius="full"
                            textTransform="uppercase"
                            letterSpacing="wide"
                          >
                            <HStack gap={1}>
                              <Text>{priorityIndicator.icon}</Text>
                              <Text display={{ base: "none", sm: "block" }}>{priorityIndicator.text}</Text>
                            </HStack>
                          </Badge>
                        </Box>
                      )}
                      
                      <Flex direction={{ base: "column", md: "row" }} gap={{ base: 4, md: 6 }} align="stretch">
                        {/* Left Section - Order Info */}
                        <Flex gap={{ base: 3, md: 4 }} flex={1} align="start">
                          <Box w={{ base: "70px", sm: "80px", md: "100px" }} h={{ base: "70px", sm: "80px", md: "100px" }} flexShrink={0}>
                            {order.product_image ? (
                              <Image
                                src={API_ENDPOINTS.image(order.product_image)}
                                alt={order.product_name || 'Product'}
                                w="full"
                                h="full"
                                objectFit="cover"
                                borderRadius={{ base: "md", md: "lg" }}
                              />
                            ) : (
                              <Box
                                w="full"
                                h="full"
                                bg="gray.100"
                                borderRadius={{ base: "md", md: "lg" }}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                fontSize={{ base: "xl", md: "2xl" }}
                              >
                                🏗️
                              </Box>
                            )}
                          </Box>
                          <VStack align="start" flex={1} gap={{ base: 1, md: 2 }} justify="start" minW={0}>
                            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="gray.800" truncate>
                              {order.product_name || 'Product'}
                            </Text>
                            <VStack align="start" gap={1}>
                              <Flex gap={{ base: 1, sm: 4 }} wrap="wrap" align="center">
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
                                  Qty: <Text as="span" fontWeight="medium">{order.quantity}</Text>
                                </Text>
                                <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="gray.700">
                                  ₱{order.total_amount.toFixed(2)}
                                </Text>
                              </Flex>
                              {order.shipping_fee !== undefined && order.shipping_fee > 0 && !order.free_shipping && (
                                <HStack gap={2}>
                                  <Text fontSize={{ base: "2xs", md: "xs" }} color="orange.600" fontWeight="semibold">
                                    + ₱{order.shipping_fee.toFixed(2)} shipping
                                  </Text>
                                </HStack>
                              )}
                              {order.free_shipping && (
                                <Badge colorScheme="green" size="sm" fontSize="2xs">
                                  FREE SHIPPING
                                </Badge>
                              )}
                            </VStack>
                            <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold" color="blue.600">
                              #{order.order_number}
                            </Text>
                            <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" truncate>
                              Customer: <Text as="span" fontWeight="medium">{order.user_first_name} {order.user_last_name}</Text>
                            </Text>
                            <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" truncate display={{ base: "none", sm: "block" }}>
                              Email: <Text as="span" fontWeight="medium">{order.user_email}</Text>
                            </Text>
                          </VStack>
                        </Flex>

                        {/* Middle Section - Order Details */}
                        <VStack align="start" gap={{ base: 2, md: 3 }} minW={{ base: "full", md: "280px", lg: "300px" }}>
                          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500" fontWeight="medium">
                            Order Details
                          </Text>
                          <VStack align="stretch" gap={{ base: 1, md: 2 }} w="full">
                            <Flex justify="space-between" align="center" wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Payment Terms:</Text>
                              <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium">
                                {formatStatus(order.payment_terms)}
                              </Text>
                            </Flex>
                            <Flex justify="space-between" align="center" wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Priority:</Text>
                              <Badge colorScheme={getPriorityColor(order.priority)} size="sm" fontSize={{ base: "2xs", md: "xs" }}>
                                {formatStatus(order.priority)}
                              </Badge>
                            </Flex>
                            <Flex justify="space-between" align="center" wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Shipment Type:</Text>
                              <Badge colorScheme={getShipmentTypeColor(order.shipment_type)} size="sm" fontSize={{ base: "2xs", md: "xs" }}>
                                {formatStatus(order.shipment_type)}
                              </Badge>
                            </Flex>
                            {order.shipping_address && (
                              <Flex justify="space-between" align="start" wrap="wrap">
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 0 }}>Shipping:</Text>
                                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" maxW={{ base: "100%", md: "180px" }} textAlign={{ base: "left", md: "right" }}>
                                  {order.shipping_address}
                                </Text>
                              </Flex>
                            )}
                            <Flex justify="space-between" align="center" wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Shipping Fee:</Text>
                              {order.free_shipping ? (
                                <Badge colorScheme="green" size="sm" fontSize="2xs">
                                  FREE
                                </Badge>
                              ) : (
                                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold" color="orange.600">
                                  ₱{(order.shipping_fee || 0).toFixed(2)}
                                </Text>
                              )}
                            </Flex>
                            <Flex justify="space-between" align="center" wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Order Date:</Text>
                              <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium">
                                {formatDate(order.created_at)}
                              </Text>
                            </Flex>
                            <Box borderTop="1px solid" borderColor="gray.200" pt={2} mt={1}>
                              <Flex justify="space-between" align="center">
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.700" fontWeight="bold">Grand Total:</Text>
                                <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="blue.700">
                                  ₱{((order.total_amount || 0) + (order.free_shipping ? 0 : (order.shipping_fee || 0))).toFixed(2)}
                                </Text>
                              </Flex>
                            </Box>
                          </VStack>
                        </VStack>

                        {/* Right Section - Status Management */}
                        <VStack align={{ base: "stretch", md: "stretch", lg: "end" }} gap={{ base: 2, md: 3 }} minW={{ base: "full", md: "250px", lg: "300px" }}>
                          <VStack align="stretch" gap={{ base: 2, md: 3 }} w="full">
                            {/* View Order Proofs Button */}
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 2 }}>Order Proof:</Text>
                              <Button
                                size={{ base: "sm", md: "sm" }}
                                variant="outline"
                                onClick={() => {
                                  navigate(`/admin/orders/${order.id}/proof`);
                                }}
                                w="full"
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: order.order_status === 'completed' ? '#3182ce' : '#718096',
                                  borderColor: order.order_status === 'completed' ? '#3182ce' : '#cbd5e0'
                                }}
                                _hover={{
                                  backgroundColor: order.order_status === 'completed' ? '#ebf8ff' : '#f7fafc'
                                }}
                              >
                                <HStack gap={1}>
                                  <Icon><FiImage /></Icon>
                                  <Text fontSize={{ base: "xs", md: "sm" }}>
                                    {order.order_status === 'completed' ? 'Manage Proofs' : 'View Proofs'}
                                  </Text>
                                </HStack>
                              </Button>
                              {order.order_status !== 'completed' && (
                                <Text fontSize="2xs" color="orange.600" mt={1}>
                                  Only completed orders can have proofs
                                </Text>
                              )}
                            </Box>

                            {/* Order Status */}
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 2 }}>Order Status:</Text>
                              <SelectRoot
                                collection={getOrderStatusOptions(order.order_status)}
                                value={[order.order_status]}
                                onValueChange={(details) => {
                                  if (details.value && details.value.length > 0) {
                                    handleOrderStatusUpdate(order.id, details.value[0] as OrderStatus);
                                  }
                                }}
                                size={{ base: "sm", md: "sm" }}
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger h={{ base: "36px", md: "40px" }}>
                                  <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                  {getOrderStatusOptions(order.order_status).items.map((option) => (
                                    <SelectItem key={option.value} item={option.value}>
                                      <Badge colorScheme={getStatusColor(option.value)} size={{ base: "sm", md: "sm" }}>
                                        {option.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectRoot>
                            </Box>

                            {/* Payment Status */}
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 2 }}>Payment Status:</Text>
                              <SelectRoot
                                collection={getPaymentStatusOptions(order.payment_status)}
                                value={[order.payment_status]}
                                onValueChange={(details) => {
                                  if (details.value && details.value.length > 0) {
                                    handlePaymentStatusUpdate(order.id, details.value[0] as PaymentStatus);
                                  }
                                }}
                                size={{ base: "sm", md: "sm" }}
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger h={{ base: "36px", md: "40px" }}>
                                  <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                  {getPaymentStatusOptions(order.payment_status).items.map((option) => (
                                    <SelectItem key={option.value} item={option.value}>
                                      <Badge colorScheme={getPaymentStatusColor(option.value)} size={{ base: "sm", md: "sm" }}>
                                        {option.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectRoot>
                            </Box>

                            {/* Shipment Type */}
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 2 }}>Shipment Type:</Text>
                              <SelectRoot
                                collection={createListCollection({ items: [
                                  { label: 'Delivery', value: 'delivery' },
                                  { label: 'Pickup', value: 'pickup' }
                                ]})}
                                value={[order.shipment_type]}
                                onValueChange={(details) => {
                                  if (details.value && details.value.length > 0) {
                                    handleShipmentTypeUpdate(order.id, details.value[0] as ShipmentType);
                                  }
                                }}
                                size={{ base: "sm", md: "sm" }}
                                disabled={updatingOrderId === order.id}
                              >
                                <SelectTrigger h={{ base: "36px", md: "40px" }}>
                                  <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem item="delivery">
                                    <Badge colorScheme="blue" size={{ base: "sm", md: "sm" }}>
                                      Delivery
                                    </Badge>
                                  </SelectItem>
                                  <SelectItem item="pickup">
                                    <Badge colorScheme="green" size={{ base: "sm", md: "sm" }}>
                                      Pickup
                                    </Badge>
                                  </SelectItem>
                                </SelectContent>
                              </SelectRoot>
                            </Box>

                            {/* Priority - Display Only */}
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 2 }}>Priority:</Text>
                              <Box py={2}>
                                <Badge colorScheme={getPriorityColor(order.priority)} size={{ base: "sm", md: "md" }} px={3} py={1}>
                                  {formatStatus(order.priority)}
                                </Badge>
                              </Box>
                            </Box>

                            {updatingOrderId === order.id && (
                              <HStack justify="center" py={2}>
                                <Spinner size={{ base: "sm", md: "sm" }} />
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">Updating...</Text>
                              </HStack>
                            )}
                          </VStack>
                        </VStack>
                      </Flex>
                    </Box>
                    );
                  })}
                </VStack>
              )}
            </VStack>
          </Container>
      </Box>
    </Box>
  );
};

export default AdminOrders;