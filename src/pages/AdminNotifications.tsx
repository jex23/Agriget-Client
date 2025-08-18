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
  Input,
  Textarea,
  Spinner
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/auth.js';
import type { 
  NotificationResponse, 
  NotificationCreate, 
  NotificationFilters 
} from '../types/notification.js';
import authService from '../services/authService.js';
import notificationService from '../services/notificationService.js';
import { ROUTES } from '../constants/routes.js';
import AdminHeader from '../components/AdminHeader.js';
import AdminSidebar from '../components/AdminSidebar.js';

const AdminNotifications: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationResponse | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    skip: 0,
    limit: 20
  });
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const [newNotification, setNewNotification] = useState<NotificationCreate>({
    type: 'new_order',
    title: '',
    message: '',
    priority: 'medium'
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
    
    if (currentUser.role !== 'admin') {
      navigate(ROUTES.HOME);
      return;
    }
    
    setUser(currentUser);
    setIsLoading(false);
    fetchNotifications();
    fetchUnreadCount();
  }, [navigate]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(filters);
      setNotifications(data);
      setTotalCount(data.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleCreateNotification = async () => {
    try {
      await notificationService.createNotification(newNotification);
      setShowCreateModal(false);
      setNewNotification({
        type: 'new_order',
        title: '',
        message: '',
        priority: 'medium'
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const handleMarkAsArchived = async (notificationId: number) => {
    try {
      await notificationService.markAsArchived(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to archive notification:', error);
    }
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      skip: key !== 'skip' ? 0 : value
    }));
  };

  useEffect(() => {
    if (!isLoading) {
      fetchNotifications();
    }
  }, [filters]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread':
        return 'blue';
      case 'read':
        return 'green';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleViewDetails = (notification: NotificationResponse) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Spinner size="xl" />
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
        notifications={unreadCount}
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
            <VStack gap={6} align="stretch">
              {/* Header */}
              <Flex justify="space-between" align="center">
                <Box>
                  <Heading size="xl" mb={2}>Notifications</Heading>
                  <Text color="gray.600">Manage system notifications and alerts</Text>
                </Box>
                <Button colorScheme="blue" onClick={() => setShowCreateModal(true)}>
                  Create Notification
                </Button>
              </Flex>

              {/* Filters */}
              <Box p={4} border="1px" borderColor="gray.200" borderRadius="md" bg="white">
                <Flex gap={4} wrap="wrap" align="end">
                  <Box>
                    <Text mb={2} fontSize="sm" fontWeight="medium">Status</Text>
                    <select 
                      style={{
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        minWidth: '150px'
                      }}
                      value={filters.status || ''}
                      onChange={(e: any) => handleFilterChange('status', e.target.value || undefined)}
                    >
                      <option value="">All Statuses</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                      <option value="archived">Archived</option>
                    </select>
                  </Box>

                  <Box>
                    <Text mb={2} fontSize="sm" fontWeight="medium">Type</Text>
                    <select 
                      style={{
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        minWidth: '150px'
                      }}
                      value={filters.type || ''}
                      onChange={(e: any) => handleFilterChange('type', e.target.value || undefined)}
                    >
                      <option value="">All Types</option>
                      <option value="new_order">New Order</option>
                      <option value="order_updated">Order Updated</option>
                      <option value="payment_received">Payment Received</option>
                      <option value="user_registered">User Registered</option>
                    </select>
                  </Box>

                  <Box>
                    <Text mb={2} fontSize="sm" fontWeight="medium">Priority</Text>
                    <select 
                      style={{
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        minWidth: '150px'
                      }}
                      value={filters.priority || ''}
                      onChange={(e: any) => handleFilterChange('priority', e.target.value || undefined)}
                    >
                      <option value="">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </Box>

                  <Button onClick={fetchNotifications} variant="outline">
                    Refresh
                  </Button>
                </Flex>
              </Box>

              {/* Stats */}
              <HStack gap={4}>
                <Badge colorScheme="blue" p={2} fontSize="md">
                  Total: {totalCount}
                </Badge>
                <Badge colorScheme="red" p={2} fontSize="md">
                  Unread: {unreadCount}
                </Badge>
              </HStack>

              {/* Notifications List */}
              <VStack gap={4} align="stretch">
                {notifications.length === 0 ? (
                  <Box p={8} border="1px" borderColor="gray.200" borderRadius="md" bg="white" textAlign="center">
                    <Text color="gray.500">No notifications found</Text>
                  </Box>
                ) : (
                  notifications.map((notification) => (
                    <Box 
                      key={notification.id} 
                      p={4} 
                      border="1px" 
                      borderColor={notification.status === 'unread' ? 'blue.200' : 'gray.200'}
                      borderRadius="md" 
                      bg={notification.status === 'unread' ? 'blue.50' : 'white'}
                      boxShadow={notification.status === 'unread' ? 'md' : 'sm'}
                    >
                      <Flex justify="space-between" align="start" gap={4}>
                        <VStack align="start" flex={1} gap={2}>
                          <HStack gap={3}>
                            <Badge colorScheme={getStatusColor(notification.status)}>
                              {notification.status}
                            </Badge>
                            <Badge colorScheme={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            <Badge variant="outline">
                              {notification.type.replace('_', ' ')}
                            </Badge>
                          </HStack>
                          <Heading size="md">{notification.title}</Heading>
                          <Text color="gray.600" lineHeight="1.5">
                            {notification.message}
                          </Text>
                          <HStack gap={4} fontSize="sm" color="gray.500">
                            <Text>{formatDate(notification.created_at)}</Text>
                            {notification.user_first_name && (
                              <Text>
                                By: {notification.user_first_name} {notification.user_last_name}
                              </Text>
                            )}
                            {notification.read_at && (
                              <Text>Read: {formatDate(notification.read_at)}</Text>
                            )}
                          </HStack>
                        </VStack>
                        <VStack gap={2}>
                          <Button size="sm" onClick={() => handleViewDetails(notification)}>
                            View
                          </Button>
                          {notification.status === 'unread' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              Mark Read
                            </Button>
                          )}
                          {notification.status !== 'archived' && (
                            <Button
                              size="sm"
                              variant="outline"
                              colorScheme="gray"
                              onClick={() => handleMarkAsArchived(notification.id)}
                            >
                              Archive
                            </Button>
                          )}
                        </VStack>
                      </Flex>
                    </Box>
                  ))
                )}
              </VStack>
            </VStack>
          </Container>
        </Box>
      </Flex>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <Box 
          position="fixed" 
          top="0" 
          left="0" 
          right="0" 
          bottom="0" 
          bg="blackAlpha.600" 
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setShowCreateModal(false)}
        >
          <Box 
            bg="white" 
            p={6} 
            borderRadius="md" 
            maxW="md" 
            w="90%"
            onClick={(e) => e.stopPropagation()}
          >
            <Heading size="lg" mb={4}>Create New Notification</Heading>
            <VStack gap={4}>
              <Box w="full">
                <Text mb={2} fontSize="sm" fontWeight="medium">Type</Text>
                <select 
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}
                  value={newNotification.type}
                  onChange={(e: any) => setNewNotification(prev => ({ 
                    ...prev, 
                    type: e.target.value as any 
                  }))}
                >
                  <option value="new_order">New Order</option>
                  <option value="order_updated">Order Updated</option>
                  <option value="payment_received">Payment Received</option>
                  <option value="user_registered">User Registered</option>
                </select>
              </Box>

              <Box w="full">
                <Text mb={2} fontSize="sm" fontWeight="medium">Priority</Text>
                <select 
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}
                  value={newNotification.priority}
                  onChange={(e: any) => setNewNotification(prev => ({ 
                    ...prev, 
                    priority: e.target.value as any 
                  }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Box>

              <Box w="full">
                <Text mb={2} fontSize="sm" fontWeight="medium">Title</Text>
                <Input
                  value={newNotification.title}
                  onChange={(e) => setNewNotification(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  placeholder="Enter notification title"
                />
              </Box>

              <Box w="full">
                <Text mb={2} fontSize="sm" fontWeight="medium">Message</Text>
                <Textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification(prev => ({ 
                    ...prev, 
                    message: e.target.value 
                  }))}
                  placeholder="Enter notification message"
                  rows={4}
                />
              </Box>
            </VStack>
            
            <HStack gap={3} mt={6} justify="end">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={handleCreateNotification}
                disabled={!newNotification.title || !newNotification.message}
              >
                Create
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* Notification Detail Modal */}
      {showDetailModal && selectedNotification && (
        <Box 
          position="fixed" 
          top="0" 
          left="0" 
          right="0" 
          bottom="0" 
          bg="blackAlpha.600" 
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setShowDetailModal(false)}
        >
          <Box 
            bg="white" 
            p={6} 
            borderRadius="md" 
            maxW="lg" 
            w="90%"
            maxH="80vh"
            overflowY="auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Heading size="lg" mb={4}>Notification Details</Heading>
            <VStack gap={4} align="stretch">
              <HStack gap={3}>
                <Badge colorScheme={getStatusColor(selectedNotification.status)}>
                  {selectedNotification.status}
                </Badge>
                <Badge colorScheme={getPriorityColor(selectedNotification.priority)}>
                  {selectedNotification.priority}
                </Badge>
                <Badge variant="outline">
                  {selectedNotification.type.replace('_', ' ')}
                </Badge>
              </HStack>
              <Box>
                <Text fontWeight="bold" mb={2}>Title:</Text>
                <Text>{selectedNotification.title}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" mb={2}>Message:</Text>
                <Text>{selectedNotification.message}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" mb={2}>Created:</Text>
                <Text>{formatDate(selectedNotification.created_at)}</Text>
              </Box>
              {selectedNotification.read_at && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Read At:</Text>
                  <Text>{formatDate(selectedNotification.read_at)}</Text>
                </Box>
              )}
              {selectedNotification.user_first_name && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Triggered By:</Text>
                  <Text>
                    {selectedNotification.user_first_name} {selectedNotification.user_last_name}
                    {selectedNotification.user_email && ` (${selectedNotification.user_email})`}
                  </Text>
                </Box>
              )}
              {selectedNotification.metadata && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Metadata:</Text>
                  <Box bg="gray.50" p={3} borderRadius="md">
                    <Text as="pre" fontSize="xs" whiteSpace="pre-wrap">
                      {JSON.stringify(selectedNotification.metadata, null, 2)}
                    </Text>
                  </Box>
                </Box>
              )}
            </VStack>
            
            <Flex justify="end" mt={6}>
              <Button onClick={() => setShowDetailModal(false)}>Close</Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdminNotifications;