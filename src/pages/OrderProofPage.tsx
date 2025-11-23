import React, { useEffect, useState, useRef } from 'react';
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
  Input,
  Textarea,
  IconButton,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiX, FiEdit2, FiArrowLeft } from 'react-icons/fi';
import type { User } from '../types/auth.js';
import type { Order } from '../types/order';
import type { OrderProofResponse } from '../types/orderProof';
import authService from '../services/authService.js';
import { orderService } from '../services/orderService';
import { orderProofService } from '../services/orderProofService';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import AdminHeader from '../components/AdminHeader.js';
import AdminSidebar from '../components/AdminSidebar.js';

const OrderProofPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderProofs, setOrderProofs] = useState<OrderProofResponse[]>([]);
  const [selectedProof, setSelectedProof] = useState<OrderProofResponse | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofRemarks, setProofRemarks] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ isExpanded: false, isMobile: window.innerWidth <= 1024 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toaster = createToaster({
    placement: 'top',
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (currentUser.role !== 'admin') {
      navigate(ROUTES.HOME);
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

  const handleSidebarStateChange = (state: { isExpanded: boolean; isMobile: boolean }) => {
    setSidebarState(state);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getContentClass = () => {
    let className = 'admin-main-content';
    if (!sidebarState.isMobile) {
      if (sidebarState.isExpanded) {
        className += ' sidebar-expanded';
      }
    }
    return className;
  };

  const canUploadProof = (): boolean => {
    return order?.order_status === 'completed';
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toaster.create({
          title: 'Invalid File',
          description: 'Please select an image file',
          type: 'error',
          duration: 3000,
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toaster.create({
          title: 'File Too Large',
          description: 'Please select an image smaller than 5MB',
          type: 'error',
          duration: 3000,
        });
        return;
      }

      setProofFile(file);
    }
  };

  const handleUploadProof = async () => {
    if (!orderId) return;

    if (!proofFile && !selectedProof) {
      toaster.create({
        title: 'Error',
        description: 'Please select an image file',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setUploadingProof(true);

      if (selectedProof) {
        await orderProofService.updateOrderProof(selectedProof.id, {
          image: proofFile || undefined,
          remarks: proofRemarks,
        });

        toaster.create({
          title: 'Success',
          description: 'Order proof updated successfully',
          type: 'success',
          duration: 3000,
        });
      } else {
        if (!proofFile) {
          toaster.create({
            title: 'Error',
            description: 'Please select an image file',
            type: 'error',
            duration: 3000,
          });
          return;
        }

        await orderProofService.createOrderProof({
          order_id: parseInt(orderId),
          image: proofFile,
          remarks: proofRemarks,
        });

        toaster.create({
          title: 'Success',
          description: 'Order proof uploaded successfully',
          type: 'success',
          duration: 3000,
        });
      }

      // Refresh proofs and reset form
      const proofsData = await orderProofService.getOrderProofs(parseInt(orderId));
      setOrderProofs(proofsData);
      setSelectedProof(null);
      setProofFile(null);
      setProofRemarks('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      toaster.create({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload proof',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleEditProof = (proof: OrderProofResponse) => {
    setSelectedProof(proof);
    setProofRemarks(proof.remarks || '');
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelEdit = () => {
    setSelectedProof(null);
    setProofFile(null);
    setProofRemarks('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Box minH="100vh" bg="#f7fafc">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onToggle={handleSidebarToggle}
          onSidebarStateChange={handleSidebarStateChange}
          refreshTrigger={0}
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
                <Text color="gray.600">Loading order details...</Text>
              </VStack>
            </Center>
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="#f7fafc">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onToggle={handleSidebarToggle}
        onSidebarStateChange={handleSidebarStateChange}
        refreshTrigger={0}
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
          <VStack align="stretch" gap={6}>
            {/* Header */}
            <Box>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(ROUTES.ADMIN_ORDERS)}
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
                Order Proof Management
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
                    <Text color="gray.600">Customer:</Text>
                    <Text fontWeight="medium">{order.user_first_name} {order.user_last_name}</Text>
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

            {/* Warning for non-completed orders */}
            {!canUploadProof() && (
              <Box bg="orange.50" p={4} borderRadius="lg" border="1px solid" borderColor="orange.200">
                <HStack gap={2}>
                  <Text fontSize="2xl">⚠️</Text>
                  <VStack align="start" gap={1}>
                    <Text fontSize="md" fontWeight="medium" color="orange.700">
                      Upload Restricted
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                      Order proofs can only be uploaded for orders with "Completed" status.
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            )}

            {/* Existing Proofs */}
            {orderProofs.length > 0 && (
              <Box bg="white" p={6} borderRadius="lg" shadow="md" border="1px solid" borderColor="gray.200">
                <Heading size="md" mb={4}>Existing Proofs ({orderProofs.length})</Heading>
                <VStack align="stretch" gap={4}>
                  {orderProofs.map((proof) => (
                    <Box
                      key={proof.id}
                      p={4}
                      borderWidth="2px"
                      borderRadius="lg"
                      borderColor={selectedProof?.id === proof.id ? 'blue.400' : 'gray.200'}
                      bg={selectedProof?.id === proof.id ? 'blue.50' : 'white'}
                    >
                      <Flex gap={4} align="start">
                        <Box w="150px" h="150px" flexShrink={0}>
                          <Image
                            src={API_ENDPOINTS.image(proof.image_path)}
                            alt="Order proof"
                            w="full"
                            h="full"
                            objectFit="cover"
                            borderRadius="md"
                          />
                        </Box>
                        <VStack align="start" flex={1} gap={2}>
                          {proof.remarks && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" mb={1}>Remarks:</Text>
                              <Text fontSize="sm" color="gray.700">{proof.remarks}</Text>
                            </Box>
                          )}
                          <Text fontSize="xs" color="gray.500">
                            Uploaded: {formatDate(proof.created_at)}
                          </Text>
                        </VStack>
                        {canUploadProof() && (
                          <Button
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={() => handleEditProof(proof)}
                            leftIcon={<FiEdit2 />}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#3182ce',
                              borderColor: '#3182ce',
                              border: '1px solid #3182ce'
                            }}
                            _hover={{
                              backgroundColor: '#ebf8ff'
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Upload/Edit Form */}
            {canUploadProof() && (
              <Box bg="white" p={6} borderRadius="lg" shadow="md" border="1px solid" borderColor="gray.200">
                <Heading size="md" mb={4}>
                  {selectedProof ? 'Edit Proof' : 'Upload New Proof'}
                </Heading>

                <VStack align="stretch" gap={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                      {selectedProof ? 'Update Image (optional):' : 'Upload Image:'}
                    </Text>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      size="md"
                      p={2}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        borderColor: '#e2e8f0'
                      }}
                    />
                    {proofFile && (
                      <HStack mt={3} p={3} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                        <Icon color="green.600"><FiUpload /></Icon>
                        <Text fontSize="sm" color="green.700" flex={1}>{proofFile.name}</Text>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          aria-label="Remove file"
                          colorScheme="red"
                          onClick={() => {
                            setProofFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#e53e3e',
                            border: 'none'
                          }}
                          _hover={{
                            backgroundColor: '#fed7d7'
                          }}
                        >
                          <FiX />
                        </IconButton>
                      </HStack>
                    )}
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={2} color="gray.700">
                      Remarks (optional):
                    </Text>
                    <Textarea
                      value={proofRemarks}
                      onChange={(e) => setProofRemarks(e.target.value)}
                      placeholder="Add any notes about this proof..."
                      size="md"
                      rows={4}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        borderColor: '#e2e8f0'
                      }}
                    />
                  </Box>

                  <HStack justify="flex-end" gap={3}>
                    {selectedProof && (
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={uploadingProof}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#4a5568',
                          borderColor: '#e2e8f0',
                          border: '1px solid #e2e8f0'
                        }}
                        _hover={{
                          backgroundColor: '#f7fafc',
                          borderColor: '#cbd5e0'
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      colorScheme="blue"
                      onClick={handleUploadProof}
                      isLoading={uploadingProof}
                      isDisabled={!proofFile && !selectedProof}
                      leftIcon={<FiUpload />}
                      style={{
                        backgroundColor: (!proofFile && !selectedProof) ? '#cbd5e0' : '#3182ce',
                        color: '#ffffff',
                        border: 'none'
                      }}
                      _hover={{
                        backgroundColor: (!proofFile && !selectedProof) ? '#cbd5e0' : '#2c5282'
                      }}
                    >
                      {selectedProof ? 'Update Proof' : 'Upload Proof'}
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Empty state */}
            {orderProofs.length === 0 && (
              <Box bg="white" p={8} borderRadius="lg" shadow="md" border="1px solid" borderColor="gray.200" textAlign="center">
                <Text fontSize="4xl" mb={2}>📄</Text>
                <Text fontSize="lg" color="gray.600" mb={2}>No Proofs Uploaded Yet</Text>
                <Text fontSize="sm" color="gray.500">
                  {canUploadProof()
                    ? 'Upload the first proof using the form above'
                    : 'Proofs can only be uploaded for completed orders'}
                </Text>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
    </Box>
  );
};

export default OrderProofPage;
