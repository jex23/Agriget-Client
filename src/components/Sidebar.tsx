import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Button,
  Text,
  Heading,
  IconButton
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes.js';
import './Sidebar.css';

interface SidebarProps {
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  cartItems: number;
  totalPrice: number;
  isOpen?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  cartItems,
  totalPrice,
  isOpen = false,
  onToggle
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar-container');
      const headerHamburger = document.querySelector('.header-hamburger-button');
      
      if (isMobile && isOpen && sidebar && !sidebar.contains(event.target as Node) && 
          headerHamburger && !headerHamburger.contains(event.target as Node) && onToggle) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen, onToggle]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobile, isOpen]);

  const handleCategorySelect = (category: string) => {
    onCategorySelect(category);
    if (isMobile && onToggle) {
      onToggle();
    }
  };

  const handleViewCart = () => {
    navigate(ROUTES.CART);
    if (isMobile && onToggle) {
      onToggle();
    }
  };

  const handleCheckout = () => {
    navigate(ROUTES.CART);
    if (isMobile && onToggle) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <Box
          className={`sidebar-overlay ${isOpen ? 'mobile-open' : ''}`}
          onClick={onToggle}
        />
      )}

      <Box
        className={`sidebar-container ${isMobile && isOpen ? 'mobile-open' : ''}`}
        w={isMobile ? "280px" : "280px"}
        p={isMobile ? 4 : 6}
        h={isMobile ? "100vh" : "fit-content"}
        position={isMobile ? "fixed" : "sticky"}
        top={isMobile ? "0" : "20px"}
        left={isMobile ? (isOpen ? "0" : "-100%") : "auto"}
        zIndex={isMobile ? 1000 : "auto"}
      >
        <VStack align="stretch" gap={isMobile ? 4 : 6}>
          {/* Mobile Header */}
          {isMobile && (
            <Box className="sidebar-mobile-header">
              <Heading className="sidebar-title" size="md">
                Categories & Cart
              </Heading>
              <IconButton
                className="sidebar-mobile-close"
                aria-label="Close sidebar"
                onClick={onToggle}
              >
                ✕
              </IconButton>
            </Box>
          )}

          {/* Categories */}
          <Box>
            <Heading className="sidebar-title" size={isMobile ? "sm" : "md"} mb={isMobile ? 3 : 4}>
              Categories
            </Heading>
            <VStack align="stretch" gap={2}>
              {categories.map(category => (
                <Button
                  key={category}
                  className="sidebar-category-button"
                  data-selected={selectedCategory === category}
                  size="sm"
                  onClick={() => handleCategorySelect(category)}
                >
                  {category}
                </Button>
              ))}
            </VStack>
          </Box>

          <Box className="sidebar-divider" />

          {/* Quick Cart Summary */}
          <Box>
            <Heading className="sidebar-cart-summary-title" size={isMobile ? "sm" : "md"} mb={isMobile ? 3 : 4}>
              Cart Summary
            </Heading>
            <VStack align="stretch" gap={3}>
              <Box className="sidebar-cart-items-box">
                <Text className="sidebar-cart-items-label" fontSize="sm" mb={1}>
                  Items in Cart
                </Text>
                <Text className="sidebar-cart-items-value" fontSize="lg" fontWeight="bold">
                  {cartItems}
                </Text>
              </Box>
              
              <Box className="sidebar-cart-total-box">
                <Text className="sidebar-cart-total-label" fontSize="sm" mb={1}>
                  Total Amount
                </Text>
                <Text className="sidebar-cart-total-value" fontSize="lg" fontWeight="bold">
                  ₱{totalPrice.toFixed(2)}
                </Text>
              </Box>

              {cartItems > 0 && (
                <>
                  <Button 
                    className="sidebar-action-button-outline" 
                    size="sm"
                    onClick={handleViewCart}
                  >
                    View Cart Details
                  </Button>
                  <Button 
                    className="sidebar-action-button-solid" 
                    size="sm"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                  </Button>
                </>
              )}
            </VStack>
          </Box>

          {!isMobile && <Box className="sidebar-divider" />}

          {/* Quick Info - Hide on mobile to save space */}
          {!isMobile && (
            <Box>
              <Heading className="sidebar-title" size="sm" mb={3}>
                Need Help?
              </Heading>
              <VStack align="stretch" gap={2}>
                <Box className="sidebar-help-box">
                  <Text className="sidebar-help-label" fontSize="xs">📞 Call Us</Text>
                  <Text className="sidebar-help-value" fontSize="sm" fontWeight="medium">+63 912 345 6789</Text>
                </Box>
                <Box className="sidebar-help-box">
                  <Text className="sidebar-help-label" fontSize="xs">🚚 Free Delivery</Text>
                  <Text className="sidebar-help-value" fontSize="sm" fontWeight="medium">Orders ₱5,000+</Text>
                </Box>
              </VStack>
            </Box>
          )}
        </VStack>
      </Box>
    </>
  );
};

export default Sidebar;