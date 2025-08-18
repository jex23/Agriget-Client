import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  HStack
} from '@chakra-ui/react';
import { 
  FiHome, 
  FiPackage, 
  FiShoppingBag, 
  FiUsers, 
  FiShoppingCart,
  FiSettings,
  FiBarChart,
  FiChevronLeft,
  FiChevronRight,
  FiBell
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants/routes.js';
import './AdminSidebar.css';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onExpansionChange?: (expanded: boolean) => void;
  onSidebarStateChange?: (state: { isExpanded: boolean; isMobile: boolean }) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onToggle,
  onExpansionChange,
  onSidebarStateChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth <= 1024;
      setIsMobile(newIsMobile);
      
      // Notify parent about state change
      const isExpanded = newIsMobile ? isOpen : (!isCollapsed || isHovered);
      if (onSidebarStateChange) {
        onSidebarStateChange({ isExpanded, isMobile: newIsMobile });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, isCollapsed, isHovered, onSidebarStateChange]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.admin-sidebar-container');
      const hamburger = document.querySelector('.admin-header-hamburger');
      
      if (isOpen && sidebar && !sidebar.contains(event.target as Node) && 
          hamburger && !hamburger.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent scroll on mobile
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onToggle, isMobile]);

  const menuItems = [
    {
      icon: FiBarChart,
      label: 'Dashboard',
      path: ROUTES.ADMIN,
      badge: null,
      color: 'blue.500'
    },
    {
      icon: FiPackage,
      label: 'Products',
      path: ROUTES.ADMIN_PRODUCTS,
      badge: null,
      color: 'green.500'
    },
    {
      icon: FiShoppingBag,
      label: 'Orders',
      path: ROUTES.ADMIN_ORDERS,
      badge: null,
      color: 'orange.500'
    },
    {
      icon: FiUsers,
      label: 'Users',
      path: ROUTES.ADMIN_USERS,
      badge: null,
      color: 'purple.500'
    },
    {
      icon: FiBell,
      label: 'Notifications',
      path: ROUTES.ADMIN_NOTIFICATIONS,
      badge: null,
      color: 'yellow.500'
    },
    {
      icon: FiShoppingCart,
      label: 'Cart',
      path: ROUTES.ADMIN_CART,
      badge: null,
      color: 'red.500'
    }
  ];


  const handleNavigation = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 1024) {
      onToggle();
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
      setIsCollapsed(false);
      
      // Notify parent about expansion
      if (onExpansionChange) {
        onExpansionChange(true);
      }
      if (onSidebarStateChange) {
        onSidebarStateChange({ isExpanded: true, isMobile });
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      // Add a small delay before collapsing to prevent flickering
      setTimeout(() => {
        setIsCollapsed(true);
        // Notify parent about collapse
        if (onExpansionChange) {
          onExpansionChange(false);
        }
        if (onSidebarStateChange) {
          onSidebarStateChange({ isExpanded: false, isMobile });
        }
      }, 300);
    }
  };

  // Determine if sidebar should be expanded
  // On mobile (when sidebar is toggled), always show labels
  // On desktop, show labels when hovered or not collapsed
  const isExpanded = isMobile ? isOpen : (!isCollapsed || isHovered);

  return (
    <>
      {/* Overlay for mobile */}
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.5)"
        zIndex={999}
        onClick={onToggle}
        display={{ base: isOpen ? 'block' : 'none', lg: 'none' }}
      />

      {/* Sidebar */}
      <Box
        data-sidebar="admin"
        data-expanded={isExpanded}
        position="fixed"
        top="0"
        left={0}
        h="100vh"
        w={isExpanded ? "280px" : "80px"}
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        shadow="lg"
        zIndex={1000}
        transition="all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
        transform={{
          base: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          lg: 'translateX(0)'
        }}
        display="flex"
        flexDirection="column"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <Box p={6} borderBottom="1px solid" borderColor="gray.100">
          {isExpanded ? (
            <VStack align="start" gap={1}>
              <Heading size="md" color="gray.800" fontWeight="800">
                Admin Panel
              </Heading>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                Management Dashboard
              </Text>
            </VStack>
          ) : (
            <Box
              w="40px"
              h="40px"
              bg="blue.500"
              borderRadius="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontWeight="bold"
              fontSize="lg"
            >
              A
            </Box>
          )}
          
          {/* Mobile Close Button */}
          <Button
            position="absolute"
            top={4}
            right={4}
            variant="ghost"
            size="sm"
            onClick={onToggle}
            display={{ base: 'flex', lg: 'none' }}
            borderRadius="lg"
          >
            ✕
          </Button>
        </Box>

        {/* Navigation Menu */}
        <VStack flex={1} p={4} gap={2} align="stretch" overflowY="auto">
          {isExpanded && (
            <Text 
              fontSize="xs" 
              fontWeight="700" 
              color="gray.500" 
              textTransform="uppercase" 
              letterSpacing="wide"
              mb={2}
              px={3}
            >
              Navigation
            </Text>
          )}
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                size="lg"
                justifyContent="flex-start"
                onClick={() => handleNavigation(item.path)}
                title={!isExpanded ? item.label : undefined}
                h="56px"
                px={3}
                borderRadius="xl"
                bg={isActive ? 'blue.50' : 'transparent'}
                color={isActive ? 'blue.600' : 'gray.700'}
                _hover={{
                  bg: isActive ? 'blue.100' : 'gray.50',
                  transform: 'translateX(4px)'
                }}
                transition="all 0.2s ease"
                position="relative"
                overflow="hidden"
              >
                <HStack gap={4} flex={1} align="center">
                  <Box
                    fontSize="20px"
                    color={isActive ? 'blue.600' : item.color}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon />
                  </Box>
                  {isExpanded && (
                    <Text 
                      fontSize="md" 
                      fontWeight={isActive ? "600" : "500"}
                      color={isActive ? 'blue.600' : 'gray.700'}
                    >
                      {item.label}
                    </Text>
                  )}
                </HStack>
                
                {/* Active Indicator */}
                {isActive && (
                  <Box
                    position="absolute"
                    right="0"
                    top="50%"
                    transform="translateY(-50%)"
                    w="3px"
                    h="24px"
                    bg="blue.500"
                    borderRadius="full"
                  />
                )}
              </Button>
            );
          })}
        </VStack>

        {/* Footer */}
        <Box p={4} borderTop="1px solid" borderColor="gray.100">
          {isExpanded ? (
            <VStack gap={2}>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                Admin Dashboard v1.0
              </Text>
              <Button
                size="sm"
                variant="outline"
                borderRadius="lg"
                onClick={() => setIsCollapsed(!isCollapsed)}
                w="full"
              >
                <FiChevronLeft />
              </Button>
            </VStack>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              borderRadius="lg"
              onClick={() => setIsCollapsed(!isCollapsed)}
              w="full"
            >
              <FiChevronRight />
            </Button>
          )}
        </Box>
      </Box>
    </>
  );
};

export default AdminSidebar;