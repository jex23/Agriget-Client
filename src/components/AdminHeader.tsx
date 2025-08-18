import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Text,
  Heading,
  HStack,
  VStack,
  IconButton,
  Badge,
  Spinner
} from '@chakra-ui/react';
import logoImg from '../images/logo.png';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/auth.js';
import type { NotificationResponse } from '../types/notification.js';
import authService from '../services/authService.js';
import notificationService from '../services/notificationService.js';
import { ROUTES } from '../constants/routes.js';
import './AdminHeader.css';

interface AdminHeaderProps {
  user: User;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
  notifications?: number;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  onSidebarToggle,
  isSidebarOpen
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [isHovered, setIsHovered] = useState(false);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate sidebar width for header adjustment
  const getSidebarWidth = () => {
    if (isMobile) {
      return 0; // Mobile sidebar overlays, doesn't push content
    }
    
    // Desktop logic: check hover state or explicit sidebar state
    // Default collapsed state is 80px, expanded is 280px
    if (isHovered) {
      return 280; // Expanded on hover
    }
    
    // For desktop, sidebar is always visible (either collapsed or expanded)
    return 80; // Default collapsed state
  };

  const handleLogout = () => {
    authService.logout();
    navigate(ROUTES.LOGIN);
  };

  const handleHomeRedirect = () => {
    navigate(ROUTES.HOME);
  };

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const [notifications, unreadData] = await Promise.all([
        notificationService.getNotifications({ limit: 5, status: 'unread' }),
        notificationService.getUnreadCount()
      ]);
      setRecentNotifications(notifications);
      setUnreadCount(unreadData.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleNotificationClick = async () => {
    if (!showNotificationMenu) {
      fetchNotifications();
      // Mark all unread notifications as read when opening the menu
      if (unreadCount > 0) {
        try {
          // Mark all current notifications as read
          const markAsReadPromises = recentNotifications.map(notification => 
            notificationService.markAsRead(notification.id)
          );
          await Promise.all(markAsReadPromises);
          setUnreadCount(0);
          // Refresh notifications to show updated status
          fetchNotifications();
        } catch (error) {
          console.error('Failed to mark notifications as read:', error);
        }
      }
    }
    setShowNotificationMenu(!showNotificationMenu);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
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
        // Add a small delay to prevent flickering
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
      
      // Cleanup timeout as fallback
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


  return (
    <Box 
      className="admin-header-container" 
      bg="white" 
      color="gray.900"
      borderBottom="1px solid" 
      borderColor="gray.200" 
      shadow="sm"
      position="sticky"
      top="0"
      zIndex={999}
      ml={{ base: 0, lg: `${getSidebarWidth()}px` }}
      transition="margin-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
    >
      <Container maxW="container.xl" px={{ base: 3, md: 6 }} py={{ base: 3, md: 4 }}>
        <Flex align="center" justify="space-between">
          {/* Left Side - Brand and Mobile Menu */}
          <Flex align="center" gap={4} flex="1" minW="0">
            {/* Mobile Hamburger Menu */}
            <IconButton
              className="admin-header-hamburger"
              aria-label="Toggle admin sidebar"
              size="sm"
              variant="ghost"
              onClick={onSidebarToggle}
              display={{ base: 'flex', md: 'none' }}
              flexShrink={0}
            >
              {isSidebarOpen ? '✕' : '☰'}
            </IconButton>

            {/* Brand */}
            <HStack align="center" gap={{ base: 2, md: 3 }} cursor="pointer" onClick={handleHomeRedirect} overflow="hidden">
              <Box w={{ base: "32px", md: "40px" }} h={{ base: "32px", md: "40px" }} flexShrink={0}>
                <img src={logoImg} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
              <VStack align="start" gap={0} minW="0" overflow="hidden" display={{ base: 'none', sm: 'flex' }}>
                <Heading className="admin-header-brand" size={{ base: "sm", md: "md" }} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                  Joey's Aggregates
                </Heading>
                <Text className="admin-header-subtitle" fontSize={{ base: "2xs", md: "xs" }} whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                  Admin Dashboard
                </Text>
              </VStack>
            </HStack>
          </Flex>

          {/* Right Side - User Actions */}
          <HStack gap={{ base: 1, md: 2 }} flexShrink={0} maxW="50%">
            {/* Notifications */}
            <Box className="admin-header-notifications" position="relative" display={{ base: 'none', sm: 'block' }}>
              <IconButton
                className="admin-header-notification-button"
                aria-label="Notifications"
                size="sm"
                variant="ghost"
                onClick={handleNotificationClick}
              >
                🔔
              </IconButton>
              {unreadCount > 0 && (
                <Badge
                  className="admin-header-notification-badge"
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  colorScheme="red"
                  borderRadius="full"
                  fontSize="xs"
                  minW="18px"
                  h="18px"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              
              {/* Notifications Dropdown */}
              {showNotificationMenu && (
                <Box
                  position="absolute"
                  top="100%"
                  right="0"
                  mt={2}
                  bg="white"
                  border="1px solid #e2e8f0"
                  borderRadius="md"
                  boxShadow="lg"
                  zIndex={1000}
                  minW="320px"
                  maxH="400px"
                  overflowY="auto"
                >
                  <Box p={3} borderBottom="1px solid #e2e8f0">
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="bold">Recent Notifications</Text>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setShowNotificationMenu(false);
                          navigate('/admin/notifications');
                        }}
                      >
                        View All
                      </Button>
                    </Flex>
                  </Box>
                  
                  <Box p={2}>
                    {notificationLoading ? (
                      <Flex justify="center" py={4}>
                        <Spinner size="sm" />
                      </Flex>
                    ) : recentNotifications.length === 0 ? (
                      <Text textAlign="center" py={4} color="gray.500" fontSize="sm">
                        No recent notifications
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={2}>
                        {recentNotifications.map((notification) => (
                          <Box
                            key={notification.id}
                            p={2}
                            border="1px"
                            borderColor="gray.200"
                            borderRadius="md"
                            _hover={{ bg: 'gray.50' }}
                          >
                            <Flex justify="space-between" align="start" gap={2}>
                              <VStack align="start" flex={1} gap={1}>
                                <HStack gap={1}>
                                  <Badge colorScheme={getPriorityColor(notification.priority)} size="sm">
                                    {notification.priority}
                                  </Badge>
                                  <Badge variant="outline" size="sm">
                                    {notification.type.replace('_', ' ')}
                                  </Badge>
                                </HStack>
                                <Text fontSize="xs" fontWeight="medium" truncate>
                                  {notification.title}
                                </Text>
                                <Text fontSize="xs" color="gray.600" truncate>
                                  {notification.message}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {formatDate(notification.created_at)}
                                </Text>
                              </VStack>
                              <IconButton
                                size="xs"
                                aria-label="Mark as read"
                                onClick={() => handleMarkAsRead(notification.id)}
                                variant="ghost"
                                colorScheme="green"
                              >
                                ✓
                              </IconButton>
                            </Flex>
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            {/* View Site Button */}
            <Button
              className="admin-header-view-site"
              size="sm"
              variant="outline"
              onClick={handleHomeRedirect}
              display={{ base: 'none', lg: 'flex' }}
            >
              🌐 View Site
            </Button>

            {/* User Menu */}
            <Box className="admin-header-user-menu" position="relative" flexShrink={0}>
              <Button
                className="admin-header-user-button"
                size="sm"
                variant="ghost"
                onClick={() => setShowUserMenu(!showUserMenu)}
                minW="auto"
                px={3}
                maxW="200px"
              >
                <HStack gap={1}>
                  <Box className="admin-header-avatar">
                    {user.first_name?.charAt(0) || user.username?.charAt(0) || 'A'}
                  </Box>
                  <VStack align="start" gap={0} display={{ base: 'none', lg: 'flex' }} minW="0" maxW="120px">
                    <Text className="admin-header-user-name" fontSize="sm" fontWeight="medium" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                      {user.first_name || user.username}
                    </Text>
                    <Text className="admin-header-user-role" fontSize="xs" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                      Admin
                    </Text>
                  </VStack>
                  <Text fontSize="xs" display={{ base: 'none', sm: 'block' }}>▼</Text>
                </HStack>
              </Button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <Box
                  className="admin-header-user-dropdown"
                  position="absolute"
                  top="100%"
                  right="0"
                  mt={2}
                  bg="white"
                  border="1px solid #e2e8f0"
                  borderRadius="md"
                  boxShadow="lg"
                  zIndex={1000}
                  minW="200px"
                >
                  <VStack align="stretch" gap={0}>
                    <Button
                      className="admin-header-dropdown-item"
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      borderRadius="none"
                    >
                      👤 Profile Settings
                    </Button>
                    <Button
                      className="admin-header-dropdown-item"
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      borderRadius="none"
                      onClick={() => navigate('/admin/notifications')}
                    >
                      🔔 Notifications
                    </Button>
                    <Button
                      className="admin-header-dropdown-item"
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      borderRadius="none"
                      onClick={handleHomeRedirect}
                    >
                      🌐 View Site
                    </Button>
                    <Box h="1px" bg="gray.200" mx={2} />
                    <Button
                      className="admin-header-dropdown-item admin-header-logout"
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      borderRadius="none"
                      onClick={handleLogout}
                    >
                      🚪 Logout
                    </Button>
                  </VStack>
                </Box>
              )}
            </Box>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default AdminHeader;