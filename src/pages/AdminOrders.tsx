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
      
      // Trigger sidebar refresh to update pending count
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
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
      
      // Trigger sidebar refresh if order status changed from/to pending
      if (newStatus === 'pending' || orders.find(o => o.id === orderId)?.order_status === 'pending') {
        setRefreshTrigger(prev => prev + 1);
      }
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
                  <Box className="admin-order-tabs-container">
                    <HStack gap={{ base: 1, sm: 2 }} wrap="wrap" justify={{ base: "center", md: "flex-start" }}>
                      {statusOptions.items.map((tab) => (
                        <Button
                          key={tab.value}
                          size={{ base: "xs", sm: "sm" }}
                          variant={selectedStatus === tab.value ? "solid" : "outline"}
                          colorScheme={selectedStatus === tab.value ? "blue" : "gray"}
                          className={`admin-order-tab ${selectedStatus === tab.value ? 'admin-order-tab-active' : 'admin-order-tab-inactive'}`}
                          onClick={() => setSelectedStatus(tab.value)}
                          fontSize={{ base: "xs", sm: "sm" }}
                          px={{ base: 2, sm: 4 }}
                          py={{ base: 1, sm: 2 }}
                          whiteSpace="nowrap"
                          flexShrink={0}
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </HStack>
                  </Box>
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
                            <Flex direction={{ base: "column", sm: "row" }} gap={{ base: 1, sm: 4 }} wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">
                                Qty: <Text as="span" fontWeight="medium">{order.quantity}</Text>
                              </Text>
                              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="blue.600">
                                ₱{order.total_amount.toFixed(2)}
                              </Text>
                            </Flex>
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
                            {order.shipping_address && (
                              <Flex justify="space-between" align="start" wrap="wrap">
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 0 }}>Shipping:</Text>
                                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" maxW={{ base: "100%", md: "180px" }} textAlign={{ base: "left", md: "right" }}>
                                  {order.shipping_address}
                                </Text>
                              </Flex>
                            )}
                            <Flex justify="space-between" align="center" wrap="wrap">
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Order Date:</Text>
                              <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium">
                                {formatDate(order.created_at)}
                              </Text>
                            </Flex>
                          </VStack>
                        </VStack>

                        {/* Right Section - Status Management */}
                        <VStack align={{ base: "stretch", md: "stretch", lg: "end" }} gap={{ base: 2, md: 3 }} minW={{ base: "full", md: "250px", lg: "300px" }}>
                          <VStack align="stretch" gap={{ base: 2, md: 3 }} w="full">
                            {/* Order Status */}
                            <Box>
                              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={{ base: 1, md: 2 }}>Order Status:</Text>
                              <SelectRoot
                                collection={orderStatusOptions}
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
                                  {orderStatusOptions.items.map((option) => (
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
                                collection={paymentStatusOptions}
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
                                  {paymentStatusOptions.items.map((option) => (
                                    <SelectItem key={option.value} item={option.value}>
                                      <Badge colorScheme={getPaymentStatusColor(option.value)} size={{ base: "sm", md: "sm" }}>
                                        {option.label}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </SelectRoot>
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