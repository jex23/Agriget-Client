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
  Icon,
  Table
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogBackdrop,
} from '@chakra-ui/react/dialog';
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
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    type: 'order_status' | 'payment_status' | 'shipment_type' | null;
    oldValue: string;
    newValue: string;
    orderId: number | null;
  }>({
    isOpen: false,
    type: null,
    oldValue: '',
    newValue: '',
    orderId: null,
  });


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
      { label: 'Cancelled', value: 'canceled' },
    ],
  });

  // Helper function to get available order status options based on current status
  const getOrderStatusOptions = (currentStatus: OrderStatus) => {
    const allOptions = [
      { label: 'Pending', value: 'pending' },
      { label: 'Processing', value: 'processing' },
      { label: 'On Delivery', value: 'on_delivery' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'canceled' },
    ];

    let filteredOptions = allOptions;

    // If current status is not 'pending', exclude 'pending' from options
    if (currentStatus !== 'pending') {
      filteredOptions = filteredOptions.filter(option => option.value !== 'pending');
    }

    // If current status has moved beyond 'processing', exclude 'processing' from options
    if (currentStatus === 'on_delivery' || currentStatus === 'completed' || currentStatus === 'canceled') {
      filteredOptions = filteredOptions.filter(option => option.value !== 'processing');
    }

    return createListCollection({ items: filteredOptions });
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

    // Only sort if we're not currently updating an order
    // This keeps the order in place during status updates
    if (updatingOrderId === null) {
      const sortedFiltered = sortOrdersByPriority(filtered);
      setFilteredOrders(sortedFiltered);
    } else {
      // Just update the filtered list without re-sorting
      setFilteredOrders(filtered);
    }
  }, [orders, selectedStatus, updatingOrderId]);


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
    const oldStatus = oldOrder?.order_status || '';
    console.log('  Current order status:', oldStatus);

    try {
      setUpdatingOrderId(orderId);

      const updateData = { order_status: newStatus };
      console.log('  Update Data:', JSON.stringify(updateData));

      const response = await orderService.updateOrder(orderId, updateData);
      console.log('✅ [ORDER STATUS UPDATE] API Response:', response);
      console.log('  Response order_status:', response.order_status);

      // Update the order in the current state without triggering a re-sort
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === orderId ? { ...o, order_status: newStatus } : o
        )
      );

      // Trigger sidebar refresh to update pending count
      setRefreshTrigger(prev => prev + 1);

      console.log('✅ [ORDER STATUS UPDATE] Order updated in state');
      console.log('  Updated to:', newStatus);

      // Show success modal
      console.log('🎯 [MODAL] Setting success modal state:', {
        isOpen: true,
        type: 'order_status',
        oldValue: oldStatus,
        newValue: newStatus,
        orderId: orderId,
      });
      setSuccessModal({
        isOpen: true,
        type: 'order_status',
        oldValue: oldStatus,
        newValue: newStatus,
        orderId: orderId,
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
    const oldStatus = oldOrder?.payment_status || '';
    console.log('  Current payment status:', oldStatus);

    try {
      setUpdatingOrderId(orderId);

      const updateData = { payment_status: newStatus };
      console.log('  Update Data:', JSON.stringify(updateData));

      const response = await orderService.updateOrder(orderId, updateData);
      console.log('✅ [PAYMENT STATUS UPDATE] API Response:', response);
      console.log('  Response payment_status:', response.payment_status);

      // Refresh orders to ensure state is in sync with database
      await refreshOrders();

      // Show success modal
      setSuccessModal({
        isOpen: true,
        type: 'payment_status',
        oldValue: oldStatus,
        newValue: newStatus,
        orderId: orderId,
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
    const oldShipmentType = oldOrder?.shipment_type || '';
    console.log('  Current shipment type:', oldShipmentType);

    try {
      setUpdatingOrderId(orderId);

      const updateData = { shipment_type: newShipmentType };
      console.log('  Update Data:', JSON.stringify(updateData));

      const response = await orderService.updateOrder(orderId, updateData);
      console.log('✅ [SHIPMENT TYPE UPDATE] API Response:', response);
      console.log('  Response shipment_type:', response.shipment_type);

      // Refresh orders to ensure state is in sync with database
      await refreshOrders();

      // Show success modal
      setSuccessModal({
        isOpen: true,
        type: 'shipment_type',
        oldValue: oldShipmentType,
        newValue: newShipmentType,
        orderId: orderId,
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

  // Debug: Log modal state on every render
  console.log('🎯 [MODAL] Current modal state:', successModal);

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
                <Box bg="white" borderRadius="lg" shadow="md" overflow="hidden">
                  <Box overflowX="auto">
                    <Table.Root size="sm" variant="outline" className="admin-orders-table">
                      <Table.Header>
                        <Table.Row bg="gray.50">
                          <Table.ColumnHeader w="80px" textAlign="center">Product</Table.ColumnHeader>
                          <Table.ColumnHeader minW="200px">Order Details</Table.ColumnHeader>
                          <Table.ColumnHeader minW="150px">Customer</Table.ColumnHeader>
                          <Table.ColumnHeader minW="120px" textAlign="right">Amount</Table.ColumnHeader>
                          <Table.ColumnHeader minW="140px">Order Status</Table.ColumnHeader>
                          <Table.ColumnHeader minW="140px">Payment</Table.ColumnHeader>
                          <Table.ColumnHeader minW="120px">Shipment</Table.ColumnHeader>
                          <Table.ColumnHeader minW="100px">Priority</Table.ColumnHeader>
                          <Table.ColumnHeader minW="120px" textAlign="center">Actions</Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {filteredOrders.map((order) => {
                          const priorityIndicator = getPriorityIndicator(order);

                          return (
                            <Table.Row
                              key={order.id}
                              bg={priorityIndicator ? priorityIndicator.bg : "white"}
                              borderLeft={priorityIndicator ? "4px solid" : "none"}
                              borderColor={priorityIndicator ? priorityIndicator.borderColor : "transparent"}
                              _hover={{ bg: "gray.50" }}
                              className="admin-order-row"
                            >
                              {/* Product Image */}
                              <Table.Cell textAlign="center">
                                <Box w="60px" h="60px" mx="auto">
                                  {order.product_image ? (
                                    <Image
                                      src={API_ENDPOINTS.image(order.product_image)}
                                      alt={order.product_name || 'Product'}
                                      w="full"
                                      h="full"
                                      objectFit="cover"
                                      borderRadius="md"
                                    />
                                  ) : (
                                    <Box
                                      w="full"
                                      h="full"
                                      bg="gray.100"
                                      borderRadius="md"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      fontSize="xl"
                                    >
                                      🏗️
                                    </Box>
                                  )}
                                </Box>
                              </Table.Cell>

                              {/* Order Details */}
                              <Table.Cell>
                                <VStack align="start" gap={1}>
                                  {priorityIndicator && (
                                    <Badge
                                      colorScheme={priorityIndicator.color}
                                      fontSize="2xs"
                                      fontWeight="bold"
                                      px={2}
                                      py={0.5}
                                      borderRadius="full"
                                    >
                                      {priorityIndicator.icon} {priorityIndicator.text}
                                    </Badge>
                                  )}
                                  <Text fontWeight="bold" fontSize="sm" color="gray.800" lineClamp={1}>
                                    {order.product_name || 'Product'}
                                  </Text>
                                  <Text fontSize="xs" fontWeight="bold" color="blue.600">
                                    #{order.order_number}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    Qty: {order.quantity}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {formatDate(order.created_at)}
                                  </Text>
                                </VStack>
                              </Table.Cell>

                              {/* Customer */}
                              <Table.Cell>
                                <VStack align="start" gap={0.5}>
                                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                                    {order.user_first_name} {order.user_last_name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500" lineClamp={1}>
                                    {order.user_email}
                                  </Text>
                                  {order.shipping_address && (
                                    <Text fontSize="xs" color="gray.500" lineClamp={2} mt={1}>
                                      {order.shipping_address}
                                    </Text>
                                  )}
                                </VStack>
                              </Table.Cell>

                              {/* Amount */}
                              <Table.Cell textAlign="right">
                                <VStack align="end" gap={1}>
                                  <Text fontSize="sm" fontWeight="bold" color="gray.700">
                                    ₱{order.total_amount.toFixed(2)}
                                  </Text>
                                  {order.free_shipping ? (
                                    <Badge colorScheme="green" fontSize="2xs">
                                      FREE SHIPPING
                                    </Badge>
                                  ) : order.shipping_fee && order.shipping_fee > 0 ? (
                                    <Text fontSize="xs" color="orange.600">
                                      + ₱{order.shipping_fee.toFixed(2)}
                                    </Text>
                                  ) : null}
                                  <Text fontSize="xs" color="blue.700" fontWeight="bold" mt={1} pt={1} borderTop="1px solid" borderColor="gray.200">
                                    ₱{((order.total_amount || 0) + (order.free_shipping ? 0 : (order.shipping_fee || 0))).toFixed(2)}
                                  </Text>
                                </VStack>
                              </Table.Cell>

                              {/* Order Status */}
                              <Table.Cell>
                                <SelectRoot
                                  collection={getOrderStatusOptions(order.order_status)}
                                  value={[order.order_status]}
                                  onValueChange={(details) => {
                                    console.log('🔵 [SELECT] Order status change triggered:', details);
                                    if (details.value && details.value.length > 0) {
                                      handleOrderStatusUpdate(order.id, details.value[0] as OrderStatus);
                                    }
                                  }}
                                  size="xs"
                                  disabled={updatingOrderId === order.id}
                                >
                                  <SelectTrigger>
                                    <Badge colorScheme={getStatusColor(order.order_status)} size="sm" w="full">
                                      {formatStatus(order.order_status)}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getOrderStatusOptions(order.order_status).items.map((option) => (
                                      <SelectItem key={option.value} item={option.value}>
                                        <Badge colorScheme={getStatusColor(option.value)} size="sm">
                                          {option.label}
                                        </Badge>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </SelectRoot>
                              </Table.Cell>

                              {/* Payment Status */}
                              <Table.Cell>
                                <VStack align="start" gap={1}>
                                  <SelectRoot
                                    collection={getPaymentStatusOptions(order.payment_status)}
                                    value={[order.payment_status]}
                                    onValueChange={(details) => {
                                      if (details.value && details.value.length > 0) {
                                        handlePaymentStatusUpdate(order.id, details.value[0] as PaymentStatus);
                                      }
                                    }}
                                    size="xs"
                                    disabled={updatingOrderId === order.id}
                                  >
                                    <SelectTrigger>
                                      <Badge colorScheme={getPaymentStatusColor(order.payment_status)} size="sm" w="full">
                                        {formatStatus(order.payment_status)}
                                      </Badge>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getPaymentStatusOptions(order.payment_status).items.map((option) => (
                                        <SelectItem key={option.value} item={option.value}>
                                          <Badge colorScheme={getPaymentStatusColor(option.value)} size="sm">
                                            {option.label}
                                          </Badge>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </SelectRoot>
                                  <Text fontSize="2xs" color="gray.500">
                                    {formatStatus(order.payment_terms)}
                                  </Text>
                                </VStack>
                              </Table.Cell>

                              {/* Shipment Type */}
                              <Table.Cell>
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
                                  size="xs"
                                  disabled={updatingOrderId === order.id}
                                >
                                  <SelectTrigger>
                                    <Badge colorScheme={getShipmentTypeColor(order.shipment_type)} size="sm" w="full">
                                      {formatStatus(order.shipment_type)}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem item="delivery">
                                      <Badge colorScheme="blue" size="sm">
                                        Delivery
                                      </Badge>
                                    </SelectItem>
                                    <SelectItem item="pickup">
                                      <Badge colorScheme="green" size="sm">
                                        Pickup
                                      </Badge>
                                    </SelectItem>
                                  </SelectContent>
                                </SelectRoot>
                              </Table.Cell>

                              {/* Priority */}
                              <Table.Cell>
                                <Badge colorScheme={getPriorityColor(order.priority)} size="sm">
                                  {formatStatus(order.priority)}
                                </Badge>
                              </Table.Cell>

                              {/* Actions */}
                              <Table.Cell textAlign="center">
                                <VStack gap={2}>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => navigate(`/admin/orders/${order.id}/proof`)}
                                    w="full"
                                    className="admin-order-action-button"
                                    style={{
                                      backgroundColor: '#ffffff',
                                      color: order.order_status === 'completed' ? '#3182ce' : '#718096',
                                      borderColor: order.order_status === 'completed' ? '#3182ce' : '#cbd5e0',
                                      borderWidth: '1px',
                                      borderStyle: 'solid'
                                    }}
                                  >
                                    <Icon fontSize="xs"><FiImage /></Icon>
                                    <Text fontSize="2xs" ml={1}>Proofs</Text>
                                  </Button>
                                  {updatingOrderId === order.id && (
                                    <Spinner size="xs" color="blue.500" />
                                  )}
                                </VStack>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </Box>
              )}
            </VStack>
          </Container>
      </Box>

      {/* Success Modal */}
      <DialogRoot
        open={successModal.isOpen}
        onOpenChange={(details) => {
          console.log('🎯 [MODAL] onOpenChange called:', details);
          if (!details.open) {
            setSuccessModal({
              isOpen: false,
              type: null,
              oldValue: '',
              newValue: '',
              orderId: null,
            });
          }
        }}
      >
        <DialogBackdrop style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1400
        }} />
        <DialogContent style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: 0,
          maxWidth: '500px',
          width: '90%',
          zIndex: 1401,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <DialogHeader style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <DialogTitle>
              <HStack gap={2}>
                <Text fontSize="2xl">✅</Text>
                <Text>Update Successful</Text>
              </HStack>
            </DialogTitle>
          </DialogHeader>
          <DialogBody style={{
            padding: '1.5rem'
          }}>
            <VStack align="stretch" gap={4} py={2}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Order #{successModal.orderId}
                </Text>
                <Text fontSize="md" fontWeight="semibold" mb={3}>
                  {successModal.type === 'order_status' && 'Order Status Updated'}
                  {successModal.type === 'payment_status' && 'Payment Status Updated'}
                  {successModal.type === 'shipment_type' && 'Shipment Type Updated'}
                </Text>
              </Box>

              <Box bg="gray.50" p={4} borderRadius="md">
                <HStack justify="space-between" align="center">
                  <VStack align="start" gap={1}>
                    <Text fontSize="xs" color="gray.500">Previous</Text>
                    <Badge colorScheme={
                      successModal.type === 'order_status' ? getStatusColor(successModal.oldValue) :
                      successModal.type === 'payment_status' ? getPaymentStatusColor(successModal.oldValue) :
                      getShipmentTypeColor(successModal.oldValue)
                    } size="md">
                      {formatStatus(successModal.oldValue)}
                    </Badge>
                  </VStack>

                  <Text fontSize="2xl" color="gray.400">→</Text>

                  <VStack align="end" gap={1}>
                    <Text fontSize="xs" color="gray.500">Updated to</Text>
                    <Badge colorScheme={
                      successModal.type === 'order_status' ? getStatusColor(successModal.newValue) :
                      successModal.type === 'payment_status' ? getPaymentStatusColor(successModal.newValue) :
                      getShipmentTypeColor(successModal.newValue)
                    } size="md">
                      {formatStatus(successModal.newValue)}
                    </Badge>
                  </VStack>
                </HStack>
              </Box>

              <Text fontSize="sm" color="gray.600" textAlign="center">
                The {successModal.type?.replace('_', ' ')} has been successfully updated.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter style={{
            padding: '1.5rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <Button
              onClick={() => setSuccessModal({
                isOpen: false,
                type: null,
                oldValue: '',
                newValue: '',
                orderId: null,
              })}
              style={{
                backgroundColor: '#3182ce',
                color: 'white',
                width: '100%',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Box>
  );
};

export default AdminOrders;