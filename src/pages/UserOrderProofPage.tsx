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
  Image,
  Spinner,
  Center,
  createToaster,
  Badge,
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import type { User } from '../types/auth.js';
import type { Order } from '../types/order';
import type { OrderProofResponse } from '../types/orderProof';
import authService from '../services/authService.js';
import { orderService } from '../services/orderService';
import { orderProofService } from '../services/orderProofService';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';

const UserOrderProofPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderProofs, setOrderProofs] = useState<OrderProofResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const toaster = createToaster({
    placement: 'top',
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
      return;
    }

    setUser(currentUser);
    fetchOrderAndProofs();
  }, [navigate, orderId]);

  const fetchOrderAndProofs = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const [orderData, proofsData] = await Promise.all([
        orderService.getOrder(parseInt(orderId)),
        orderProofService.getOrderProofs(parseInt(orderId))
      ]);

      // Verify this order belongs to the current user
      const currentUser = authService.getCurrentUser();
      if (currentUser && orderData.user_id !== currentUser.id && currentUser.role !== 'admin') {
        toaster.create({
          title: 'Access Denied',
          description: 'You can only view proofs for your own orders',
          type: 'error',
          duration: 3000,
        });
        navigate(ROUTES.ORDERS);
        return;
      }

      setOrder(orderData);
      setOrderProofs(proofsData);
    } catch (error) {
      console.error('Error fetching order and proofs:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to load order details',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
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

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <>
        <Header user={user} cartItemCount={0} />
        <Box minH="calc(100vh - 200px)" bg="#f7fafc" py={8}>
          <Container maxW="container.xl">
            <Center py={20}>
              <VStack>
                <Spinner size="xl" color="blue.500" />
                <Text color="gray.600">Loading order proofs...</Text>
              </VStack>
            </Center>
          </Container>
        </Box>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header user={user} cartItemCount={0} />
      <Box minH="calc(100vh - 200px)" bg="#f7fafc" py={8}>
        <Container maxW="container.xl" py={{ base: 4, md: 6, lg: 8 }} px={{ base: 4, md: 6 }}>
          <VStack align="stretch" gap={6}>
            {/* Header */}
            <Box>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(ROUTES.ORDERS)}
                mb={4}
                leftIcon={<FiArrowLeft />}
                style={{
                  backgroundColor: 'transparent',
                  color: '#718096',
                  border: 'none'
                }}
                _hover={{
                  backgroundColor: '#f7fafc',
                  color: '#2b6cb0'
                }}
              >
                Back to Orders
              </Button>

              <Heading size="lg" color="blue.700" mb={2}>
                Order Proofs
              </Heading>
              {order && (
                <Text color="gray.600" fontSize="md">
                  Order #{order.order_number} - {order.product_name}
                </Text>
              )}
            </Box>

            {/* Order Summary Card */}
            {order && (
              <Box bg="white" p={6} borderRadius="lg" shadow="md" border="1px solid" borderColor="gray.200">
                <Heading size="md" mb={4}>Order Details</Heading>
                <VStack align="stretch" gap={3}>
                  <Flex justify="space-between">
                    <Text color="gray.600">Product:</Text>
                    <Text fontWeight="medium">{order.product_name}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600">Quantity:</Text>
                    <Text fontWeight="medium">{order.quantity}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600">Order Status:</Text>
                    <Badge colorScheme={order.order_status === 'completed' ? 'green' : 'blue'}>
                      {formatStatus(order.order_status)}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600">Payment Status:</Text>
                    <Badge colorScheme={order.payment_status === 'paid' ? 'green' : 'orange'}>
                      {formatStatus(order.payment_status)}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="gray.600">Total Amount:</Text>
                    <Text fontWeight="bold" color="blue.600">₱{order.total_amount.toFixed(2)}</Text>
                  </Flex>
                </VStack>
              </Box>
            )}

            {/* Proofs Display */}
            {orderProofs.length > 0 ? (
              <Box bg="white" p={6} borderRadius="lg" shadow="md" border="1px solid" borderColor="gray.200">
                <Heading size="md" mb={4}>Order Proofs ({orderProofs.length})</Heading>
                <VStack align="stretch" gap={4}>
                  {orderProofs.map((proof) => (
                    <Box
                      key={proof.id}
                      p={4}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderColor="gray.200"
                      bg="white"
                    >
                      <VStack align="stretch" gap={3}>
                        <Box w="full">
                          <Image
                            src={API_ENDPOINTS.image(proof.image_path)}
                            alt="Order proof"
                            w="full"
                            maxH="500px"
                            objectFit="contain"
                            borderRadius="md"
                          />
                        </Box>
                        {proof.remarks && (
                          <Box p={3} bg="gray.50" borderRadius="md">
                            <Text fontSize="xs" color="gray.500" mb={1} fontWeight="medium">Remarks:</Text>
                            <Text fontSize="sm" color="gray.700">{proof.remarks}</Text>
                          </Box>
                        )}
                        <Text fontSize="xs" color="gray.500">
                          Uploaded: {formatDate(proof.created_at)}
                        </Text>
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            ) : (
              <Box bg="white" p={8} borderRadius="lg" shadow="md" border="1px solid" borderColor="gray.200" textAlign="center">
                <Text fontSize="4xl" mb={2}>📄</Text>
                <Text fontSize="lg" color="gray.600" mb={2}>No Proofs Available Yet</Text>
                <Text fontSize="sm" color="gray.500">
                  Order proofs will be uploaded by the admin once your order is completed.
                </Text>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
      <Footer />
    </>
  );
};

export default UserOrderProofPage;
