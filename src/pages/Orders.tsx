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
import { Alert } from '@chakra-ui/react/alert';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import type { User } from '../types/auth.js';
import type { Order } from '../types/order';
import type { CartItem } from '../types/cart';
import authService from '../services/authService.js';
import { orderService } from '../services/orderService';
import { apiCartService } from '../services/apiCartService';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import Header from '../components/Header.js';

const Orders: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const navigate = useNavigate();
  const toaster = createToaster({
    placement: 'top',
  });

  const statusTabs = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'On Delivery', value: 'on_delivery' },
    { label: 'Completed', value: 'completed' },
    { label: 'Canceled', value: 'canceled' },
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
      return;
    }
    
    setUser(currentUser);
    fetchCart();
    fetchOrders();
  }, [navigate]);

  const fetchCart = async () => {
    try {
      const cartData = await apiCartService.getCart();
      setCartItems(cartData);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getUserOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCart = async (productId: number) => {
    try {
      await apiCartService.removeFromCart(productId);
      setCartItems(prevItems => prevItems.filter(item => item.product_id !== productId));
    } catch (error) {
      console.error('Error removing item from cart:', error);
    }
  };

  useEffect(() => {
    if (selectedStatus === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.order_status === selectedStatus));
    }
    setCurrentPage(1);
  }, [orders, selectedStatus]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    setPaginatedOrders(filteredOrders.slice(startIndex, endIndex));
  }, [filteredOrders, currentPage, ordersPerPage]);

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
  };

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      setCancellingOrderId(orderId);
      await orderService.cancelOrder(orderId);
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, order_status: 'canceled' }
            : order
        )
      );

      toaster.create({
        title: 'Order Canceled',
        description: 'Your order has been successfully canceled.',
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      
      let errorMessage = 'Failed to cancel order. Please try again.';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('400') || message.includes('bad request')) {
          if (message.includes('order status must be')) {
            errorMessage = 'Cannot cancel this order. It may not be in a cancelable state.';
          } else {
            errorMessage = 'Cannot cancel this order. Order may already be processed or canceled.';
          }
        } else if (message.includes('500') && message.includes('data truncated')) {
          errorMessage = 'Database error: Invalid order status. Please contact support.';
        } else if (message.includes('401') || message.includes('unauthorized')) {
          errorMessage = 'You are not authorized to cancel this order.';
        } else if (message.includes('403') || message.includes('forbidden')) {
          errorMessage = 'You do not have permission to cancel this order.';
        } else if (message.includes('404') || message.includes('not found')) {
          errorMessage = 'Order not found. It may have been already canceled or removed.';
        } else if (message.includes('422') || message.includes('unprocessable')) {
          errorMessage = 'Order cannot be cancelled at this stage.';
        } else if (message.includes('500') || message.includes('internal server error')) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message && !message.includes('http error')) {
          errorMessage = error.message;
        }
      }
      
      toaster.create({
        title: 'Error',
        description: errorMessage,
        type: 'error',
        duration: 4000,
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const isOrderOlderThanOneHour = (createdAt: string) => {
    const orderTime = new Date(createdAt).getTime();
    const currentTime = new Date().getTime();
    const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
    return (currentTime - orderTime) > oneHourInMs;
  };

  const canCancelOrder = (order: Order) => {
    const hasValidStatus = order.order_status === 'pending' || order.order_status === 'processing';
    const isWithinTimeLimit = !isOrderOlderThanOneHour(order.created_at);
    return hasValidStatus && isWithinTimeLimit;
  };

  const getCancelDisabledReason = (order: Order) => {
    if (order.order_status !== 'pending' && order.order_status !== 'processing') {
      return 'Order status does not allow cancellation';
    }
    if (isOrderOlderThanOneHour(order.created_at)) {
      return 'Order cannot be cancelled after 1 hour';
    }
    return '';
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

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Header 
          user={user} 
          cartItems={cartItems.length}
          cartItemsData={cartItems}
          onRemoveFromCart={handleRemoveFromCart}
        />
        <Container maxW="container.xl" py={8}>
          <Center py={20}>
            <VStack>
              <Spinner size="xl" color="blue.500" />
              <Text color="gray.600">Loading your orders...</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <Header 
        user={user} 
        cartItems={cartItems.length}
        cartItemsData={cartItems}
        onRemoveFromCart={handleRemoveFromCart}
      />
      
      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={6}>
          <Box>
            <HStack gap={4} align="center" mb={2}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(ROUTES.HOME)}
                className="back-to-home-btn"
              >
                <HStack gap={2}>
                  <Text>←</Text>
                  <Text>Back to Home</Text>
                </HStack>
              </Button>
            </HStack>
            <Heading size="lg" color="blue.700" mb={2}>
              My Orders
            </Heading>
            <Text color="gray.600">
              Track and manage your orders
            </Text>
          </Box>

          <VStack align="stretch" gap={4}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
              <Box minW={{ base: "full", md: "250px" }}>
                <Text fontSize="sm" color="gray.600" mb={2}>Filter by Status:</Text>
                <SelectRoot
                  collection={createListCollection({ items: statusTabs })}
                  value={[selectedStatus]}
                  onValueChange={(details) => handleStatusChange(details.value[0])}
                  size="sm"
                >
                  <SelectTrigger bg="white" borderColor="gray.300" color="gray.800">
                    <Flex justify="space-between" align="center" width="100%">
                      <SelectValueText placeholder="Select status" />
                      <Icon fontSize="lg" color="gray.600">
                        <FiChevronDown />
                      </Icon>
                    </Flex>
                  </SelectTrigger>
                  <SelectContent bg="white" color="gray.800" borderColor="gray.300">
                    {statusTabs.map((status) => (
                      <SelectItem key={status.value} item={status.value} bg="white" color="gray.800" _hover={{ bg: "blue.50" }}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>
              <Flex direction="column" gap={1} align={{ base: "start", md: "end" }}>
                <Text fontSize="sm" color="gray.500">
                  Showing {((currentPage - 1) * ordersPerPage) + 1}-{Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </Text>
                {totalPages > 1 && (
                  <Text fontSize="sm" color="gray.500">
                    Page {currentPage} of {totalPages}
                  </Text>
                )}
              </Flex>
            </Flex>
          </VStack>

          {error && (
            <Alert.Root status="error">
              <Alert.Indicator />
              <Alert.Title>Error</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          {paginatedOrders.length === 0 && filteredOrders.length === 0 ? (
            <Box bg="white" p={8} borderRadius="lg" shadow="md">
              <VStack py={8}>
                <Text fontSize="xl" color="gray.500" mb={4}>
                  🛒 No orders found
                </Text>
                <Text color="gray.400" textAlign="center" mb={6}>
                  {orders.length === 0 
                    ? "You haven't placed any orders yet. Start shopping to see your orders here!"
                    : `No orders found with status "${selectedStatus === 'all' ? 'All' : formatStatus(selectedStatus)}". Try changing the filter.`
                  }
                </Text>
                <Button 
                  className="orders-start-shopping-button"
                  onClick={() => navigate(ROUTES.HOME)}
                >
                  Start Shopping
                </Button>
              </VStack>
            </Box>
          ) : (
            <>
              <VStack gap={4} align="stretch">
                {paginatedOrders.map((order) => (
                <Box key={order.id} bg="white" p={6} shadow="md" borderRadius="lg" className="order-card-full">
                  <Flex direction={{ base: "column", lg: "row" }} gap={6} align="stretch">
                    {/* Left Section - Product Info */}
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
                        <Text fontWeight="bold" fontSize="lg" color="gray.800" lineClamp={2}>
                          {order.product_name || 'Product'}
                        </Text>
                        <VStack align="start" gap={1}>
                          <HStack gap={4} wrap="wrap">
                            <Text fontSize="sm" color="gray.600">
                              Qty: <Text as="span" fontWeight="medium">{order.quantity}</Text>
                            </Text>
                            <Text fontSize="md" fontWeight="bold" color="gray.700">
                              ₱{order.total_amount.toFixed(2)}
                            </Text>
                          </HStack>
                          {order.shipping_fee !== undefined && order.shipping_fee > 0 && !order.free_shipping && (
                            <HStack gap={2}>
                              <Text fontSize="xs" color="orange.600">
                                + ₱{order.shipping_fee.toFixed(2)} shipping
                              </Text>
                            </HStack>
                          )}
                          {order.free_shipping && (
                            <HStack gap={2}>
                              <Badge colorScheme="green" size="sm" fontSize="2xs">
                                FREE SHIPPING
                              </Badge>
                            </HStack>
                          )}
                        </VStack>
                        <Text fontSize="sm" fontWeight="bold" color="blue.600">
                          #{order.order_number}
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
                          <Text fontSize="sm" color="gray.600">Status:</Text>
                          <Badge colorScheme={getStatusColor(order.order_status)} size="sm">
                            {formatStatus(order.order_status)}
                          </Badge>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.600">Payment:</Text>
                          <Badge colorScheme={getPaymentStatusColor(order.payment_status)} size="sm">
                            {formatStatus(order.payment_status)}
                          </Badge>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.600">Priority:</Text>
                          <Badge colorScheme={getPriorityColor(order.priority)} size="sm">
                            {formatStatus(order.priority)}
                          </Badge>
                        </Flex>
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color="gray.600">Terms:</Text>
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
                          <Text fontSize="sm" color="gray.600">Shipping Fee:</Text>
                          {order.free_shipping ? (
                            <Badge colorScheme="green" size="sm">
                              FREE
                            </Badge>
                          ) : (
                            <Text fontSize="sm" fontWeight="bold" color="orange.600">
                              ₱{(order.shipping_fee || 0).toFixed(2)}
                            </Text>
                          )}
                        </Flex>
                        <Box borderTop="1px solid" borderColor="gray.200" pt={2} mt={1}>
                          <Flex justify="space-between" align="center">
                            <Text fontSize="sm" color="gray.700" fontWeight="semibold">Grand Total:</Text>
                            <Text fontSize="md" fontWeight="bold" color="blue.700">
                              ₱{((order.total_amount || 0) + (order.free_shipping ? 0 : (order.shipping_fee || 0))).toFixed(2)}
                            </Text>
                          </Flex>
                        </Box>
                      </VStack>
                    </VStack>

                    {/* Right Section - Actions and Date */}
                    <VStack align={{ base: "stretch", lg: "end" }} gap={3} minW={{ base: "full", lg: "200px" }}>
                      <Text fontSize="xs" color="gray.500" textAlign={{ base: "left", lg: "right" }}>
                        {formatDate(order.created_at)}
                      </Text>
                      <Flex direction="column" gap={2} w={{ base: "full", lg: "auto" }}>
                        {canCancelOrder(order) ? (
                          <Button
                            className="orders-cancel-button"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            loading={cancellingOrderId === order.id}
                            disabled={cancellingOrderId !== null}
                            w={{ base: "full", lg: "120px" }}
                          >
                            Cancel Order
                          </Button>
                        ) : (
                          (order.order_status === 'pending' || order.order_status === 'processing') &&
                          isOrderOlderThanOneHour(order.created_at) && (
                            <Box
                              bg="orange.50"
                              border="1px solid"
                              borderColor="orange.200"
                              borderRadius="md"
                              p={2}
                              w={{ base: "full", lg: "auto" }}
                            >
                              <Text fontSize="xs" color="orange.700" textAlign="center">
                                ⚠️ Cannot cancel after 1 hour
                              </Text>
                            </Box>
                          )
                        )}
                      </Flex>
                    </VStack>
                  </Flex>
                </Box>
                ))}
              </VStack>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Box mt={6}>
                  <Flex justify="center" align="center" gap={2} wrap="wrap">
                    {/* Previous Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                    >
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <HStack gap={1}>
                      {getPageNumbers().map((pageNum) => (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={currentPage === pageNum ? "solid" : "outline"}
                          colorScheme={currentPage === pageNum ? "blue" : "gray"}
                          onClick={() => handlePageChange(pageNum)}
                          className={`pagination-btn ${currentPage === pageNum ? 'pagination-btn-active' : 'pagination-btn-inactive'}`}
                          minW="40px"
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </HStack>
                    
                    {/* Next Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                    >
                      Next
                    </Button>
                  </Flex>
                </Box>
              )}
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default Orders;