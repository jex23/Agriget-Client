import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Flex,
  Badge,
  IconButton,
  Image
} from '@chakra-ui/react';
import logoImg from '../images/logo.png';
import { 
  FiShoppingCart, 
  FiLogOut, 
  FiMenu, 
  FiX, 
  FiFileText,
  FiTrash2,
  FiHome,
  FiChevronDown,
  FiUser,
  FiSettings
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/auth.js';
import type { CartItem } from '../types/cart';
import authService from '../services/authService.js';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import './Header.css';

interface HeaderProps {
  user: User | null;
  cartItems: number;
  cartItemsData?: CartItem[];
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  onRemoveFromCart?: (productId: number) => void;
  onRemoveAllFromCart?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, cartItemsData, onSidebarToggle, isSidebarOpen, onRemoveFromCart, onRemoveAllFromCart }) => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [showMiniCart, setShowMiniCart] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside to close mini cart and user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMiniCart && !target.closest('.mini-cart-container')) {
        setShowMiniCart(false);
      }
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMiniCart, showUserMenu]);

  const handleLogout = () => {
    authService.logout();
    navigate(ROUTES.LOGIN);
  };

  // Get unique product count (number of different products, not total quantity)
  const getUniqueProductCount = () => {
    return cartItemsData?.length || 0;
  };

  // Get all items for mini cart (now shows all items with scroll)
  const getMiniCartItems = () => {
    return cartItemsData || [];
  };

  // Check if cart has more than 5 items (for dynamic height)
  const hasMoreThanFiveItems = () => {
    return (cartItemsData?.length || 0) > 5;
  };

  // Calculate total price for mini cart
  const getTotalPrice = () => {
    return cartItemsData?.reduce((total, item) => total + (item.product_price * item.quantity), 0) || 0;
  };

  // Handle delete item from mini cart
  const handleDeleteItem = (productId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    onRemoveFromCart?.(productId);
  };

  // Handle remove all items from mini cart
  const handleRemoveAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    onRemoveAllFromCart?.();
  };

  // Render mini cart component
  const renderMiniCart = () => {
    if (!cartItemsData || cartItemsData.length === 0) {
      return (
        <Box 
          w={{ base: "100%", md: "320px" }} 
          maxW={{ base: "400px", md: "320px" }}
          p={6} 
          textAlign="center" 
          bg="white"
          borderRadius={{ base: "16px 16px 0 0", md: "16px" }}
          mx={{ base: 4, md: 0 }}
          mb={{ base: 4, md: 0 }}
        >
          <VStack gap={3}>
            <Box fontSize="3xl" opacity={0.5} color="gray.400">🛒</Box>
            <Text fontSize="sm" color="gray.500" fontWeight="500">Your cart is empty</Text>
            <Button 
              size="sm" 
              colorScheme="blue" 
              variant="outline"
              onClick={() => {
                navigate(ROUTES.HOME);
                setShowMiniCart(false);
              }}
              borderRadius="lg"
              color="blue.600"
              borderColor="blue.600"
              bg="white"
              _hover={{ bg: "blue.50", color: "blue.700" }}
            >
              Continue Shopping
            </Button>
          </VStack>
        </Box>
      );
    }

    const miniCartItems = getMiniCartItems();

    return (
      <Box 
        w={{ base: "100%", md: "360px" }} 
        maxW={{ base: "400px", md: "360px" }}
        maxH={{ base: "80vh", md: "480px" }} 
        overflow="hidden" 
        bg="white" 
        color="gray.900"
        borderRadius={{ base: "16px 16px 0 0", md: "16px" }}
        mx={{ base: 4, md: 0 }}
        mb={{ base: 4, md: 0 }}
      >
        {/* Header */}
        <Box p={{ base: 3, md: 4 }} borderBottom="1px solid" borderColor="gray.100" bg="white">
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="700" color="gray.900">
              Shopping Cart
            </Text>
            <HStack gap={2}>
              <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                {getUniqueProductCount()} items
              </Text>
              {/* Close button - only show on mobile */}
              <IconButton
                aria-label="Close cart"
                size="sm"
                variant="ghost"
                onClick={() => setShowMiniCart(false)}
                display={{ base: 'flex', md: 'none' }}
                color="gray.500"
                _hover={{ bg: "gray.100", color: "gray.700" }}
                borderRadius="full"
              >
                <FiX size={18} />
              </IconButton>
            </HStack>
          </Flex>
          {/* Remove All Button */}
          {getUniqueProductCount() > 0 && onRemoveAllFromCart && (
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={handleRemoveAll}
              width="100%"
              fontWeight="500"
              color="red.500"
              _hover={{ bg: "red.50", color: "red.600" }}
              borderRadius="md"
            >
              <HStack gap={1}>
                <FiTrash2 size={12} />
                <Text fontSize="xs">Remove All Items</Text>
              </HStack>
            </Button>
          )}
        </Box>

        {/* Items */}
        <VStack 
          align="stretch" 
          gap={0} 
          maxH={{ 
            base: hasMoreThanFiveItems() ? "50vh" : "auto", 
            md: hasMoreThanFiveItems() ? "300px" : "auto" 
          }} 
          overflowY={hasMoreThanFiveItems() ? "auto" : "visible"} 
          bg="white"
        >
          {miniCartItems.map((item, index) => (
            <Box key={item.id} bg="white">
              <Flex p={{ base: 3, md: 4 }} align="center" gap={{ base: 2, md: 3 }} bg="white" _hover={{ bg: "gray.50" }}>
                <Box flexShrink={0} w={{ base: "40px", md: "48px" }} h={{ base: "40px", md: "48px" }}>
                  {item.product_image ? (
                    <Image
                      src={API_ENDPOINTS.image(item.product_image)}
                      alt={item.product_name}
                      w={{ base: "40px", md: "48px" }}
                      h={{ base: "40px", md: "48px" }}
                      objectFit="cover"
                      borderRadius="lg"
                      bg="gray.100"
                    />
                  ) : (
                    <Box
                      w={{ base: "40px", md: "48px" }}
                      h={{ base: "40px", md: "48px" }}
                      bg="gray.100"
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize={{ base: "md", md: "lg" }}
                      color="gray.600"
                    >
                      🏗️
                    </Box>
                  )}
                </Box>
                
                <VStack align="start" flex={1} gap={1}>
                  <Text 
                    fontSize={{ base: "xs", md: "sm" }}
                    fontWeight="600" 
                    color="gray.900"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {item.product_name}
                  </Text>
                  <Text fontSize={{ base: "2xs", md: "xs" }} color="gray.500">
                    ₱{item.product_price.toFixed(2)} × {item.quantity}
                  </Text>
                </VStack>
                
                <VStack align="end" gap={1}>
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="600" color="gray.900">
                    ₱{(item.product_price * item.quantity).toFixed(2)}
                  </Text>
                  <IconButton
                    aria-label="Remove item"
                    size={{ base: "2xs", md: "xs" }}
                    variant="ghost"
                    onClick={(e) => handleDeleteItem(item.product_id, e)}
                    borderRadius="md"
                    color="gray.400"
                    bg="transparent"
                    _hover={{ bg: "red.50", color: "red.500" }}
                    minW={{ base: "24px", md: "auto" }}
                    h={{ base: "24px", md: "auto" }}
                  >
                    <Box color="gray.400" fontSize={{ base: "10px", md: "12px" }}>
                      <FiTrash2 />
                    </Box>
                  </IconButton>
                </VStack>
              </Flex>
              {index < miniCartItems.length - 1 && (
                <Box h="1px" bg="gray.100" mx={4} />
              )}
            </Box>
          ))}
          
        </VStack>
        
        {/* Footer */}
        <Box p={{ base: 3, md: 4 }} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
          <Flex justify="space-between" align="center" mb={{ base: 2, md: 3 }}>
            <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="600" color="gray.700">
              Total ({getUniqueProductCount()} products)
            </Text>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" color="blue.600">
              ₱{getTotalPrice().toFixed(2)}
            </Text>
          </Flex>
          <Button
            size={{ base: "sm", md: "md" }}
            colorScheme="blue"
            width="100%"
            onClick={() => {
              navigate(ROUTES.CART);
              setShowMiniCart(false);
            }}
            fontWeight="600"
            borderRadius="lg"
            bg="blue.500"
            color="white"
            _hover={{ bg: "blue.600", color: "white" }}
            _active={{ bg: "blue.700", color: "white" }}
          >
            View Cart & Checkout
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box 
      className="header-container" 
      bg="white" 
      color="gray.900"
      borderBottom="1px solid" 
      borderColor="gray.200" 
      shadow="sm"
      position="sticky"
      top="0"
      zIndex={999}
    >
      <Container maxW="container.xl" px={{ base: 3, md: 6 }} py={{ base: 3, md: 4 }}>
        <Flex align="center" justify="space-between">
          {/* Left Section - Logo & Mobile Menu */}
          <HStack gap={{ base: 2, md: 4 }} align="center">
            {/* Mobile Hamburger Menu */}
            {isMobile && onSidebarToggle && (
              <IconButton
                aria-label="Toggle Categories Menu"
                size="sm"
                variant="ghost"
                onClick={onSidebarToggle}
                borderRadius="lg"
                color="gray.600"
                _hover={{ bg: "gray.100", color: "gray.800" }}
              >
                {isSidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
              </IconButton>
            )}
            
            {/* Logo Section */}
            <Flex align="center" gap={{ base: 2, md: 3 }} cursor="pointer" onClick={() => navigate(ROUTES.HOME)}>
              <Image
                src={logoImg}
                alt="logo"
                boxSize={{ base: "32px", md: "48px" }}
                objectFit="contain"
                borderRadius="md"
                background="transparent"
              />
              <VStack align="start" gap={0} display={{ base: 'none', sm: 'flex' }}>
                <Heading 
                  size={{ base: "sm", md: "md" }}
                  fontWeight="800"
                  color="gray.800"
                  letterSpacing="-0.02em"
                  _hover={{ color: "blue.600" }}
                  transition="color 0.2s"
                >
                  Joey's Aggregates Trading
                </Heading>
                <Text fontSize={{ base: "2xs", md: "xs" }} color="gray.500" fontWeight="500">
                  Premium Construction Materials
                </Text>
              </VStack>
            </Flex>
          </HStack>

          {/* Right Section - Clean Navigation */}
          <HStack gap={{ base: 2, md: 4 }} align="center">
            {user ? (
              <>
                {/* Cart Button */}
                <Box position="relative" className="mini-cart-container">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMiniCart(!showMiniCart);
                    }}
                    borderRadius="lg"
                    color="gray.700"
                    bg="transparent"
                    border="none"
                    fontWeight="500"
                    _hover={{ bg: "blue.50", color: "blue.600" }}
                    _active={{ bg: "blue.100" }}
                    _focus={{ boxShadow: "none" }}
                    position="relative"
                  >
                    <HStack gap={2}>
                      <Box color="gray.700"><FiShoppingCart /></Box>
                      <Text color="gray.700">Cart</Text>
                    </HStack>
                    {getUniqueProductCount() > 0 && (
                      <Badge
                        position="absolute"
                        top="-2px"
                        right="-2px"
                        borderRadius="full"
                        fontSize="xs"
                        bg="red.500"
                        color="white"
                        minW="20px"
                        h="20px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {getUniqueProductCount()}
                      </Badge>
                    )}
                  </Button>
                  
                  {/* Mini Cart Dropdown */}
                  {showMiniCart && (
                    <Box
                      position={{ base: "fixed", md: "absolute" }}
                      top={{ base: "0", md: "100%" }}
                      left={{ base: "0", md: "auto" }}
                      right={{ base: "0", md: "0" }}
                      bottom={{ base: "0", md: "auto" }}
                      mt={{ base: 0, md: 2 }}
                      bg={{ base: "rgba(0,0,0,0.5)", md: "transparent" }}
                      borderRadius={{ base: "0", md: "16px" }}
                      boxShadow={{ base: "none", md: "0 12px 32px rgba(0,0,0,0.12)" }}
                      zIndex={1000}
                      overflow="hidden"
                      display="flex"
                      alignItems={{ base: "flex-end", md: "flex-start" }}
                      justifyContent={{ base: "center", md: "flex-end" }}
                    >
                      {renderMiniCart()}
                    </Box>
                  )}
                </Box>

                {/* Admin Button - Only show for admin users */}
                {user.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => navigate(ROUTES.ADMIN)}
                    borderRadius="lg"
                    color="gray.700"
                    bg="transparent"
                    border="none"
                    fontWeight="500"
                    _hover={{ bg: "purple.50", color: "purple.600" }}
                    _active={{ bg: "purple.100" }}
                    _focus={{ boxShadow: "none" }}
                    title="Go to Admin Dashboard"
                  >
                    <HStack gap={2}>
                      <Box color="purple.600"><FiSettings /></Box>
                      <Text color="gray.700" display={{ base: 'none', sm: 'block' }}>Admin</Text>
                    </HStack>
                  </Button>
                )}

                {/* User Dropdown Menu */}
                <Box position="relative" className="user-menu-container">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    borderRadius="lg"
                    color="gray.700"
                    bg="transparent"
                    border="none"
                    fontWeight="500"
                    _hover={{ bg: "gray.100" }}
                    _active={{ bg: "gray.200" }}
                    _focus={{ boxShadow: "none" }}
                  >
                    <HStack gap={3}>
                      <Box
                        w="32px"
                        h="32px"
                        bg="blue.500"
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="white"
                        fontWeight="600"
                        fontSize="sm"
                      >
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </Box>
                      <Text fontSize="sm" fontWeight="600" color="gray.700" display={{ base: 'none', md: 'block' }}>
                        {user.name || 'User'}
                      </Text>
                      <Box color="gray.500" transform={showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'} transition="transform 0.2s">
                        <FiChevronDown />
                      </Box>
                    </HStack>
                  </Button>

                  {/* User Dropdown */}
                  {showUserMenu && (
                    <Box
                      position="absolute"
                      top="100%"
                      right="0"
                      mt={2}
                      bg="white"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="12px"
                      boxShadow="0 8px 24px rgba(0,0,0,0.12)"
                      zIndex={1000}
                      minW="180px"
                    >
                      <VStack align="stretch" p={2} gap={1}>
                        <Button
                          variant="ghost"
                          justifyContent="flex-start"
                          size="sm"
                          onClick={() => {
                            navigate(ROUTES.HOME);
                            setShowUserMenu(false);
                          }}
                          borderRadius="lg"
                          color="gray.700"
                          bg="transparent"
                          _hover={{ bg: "gray.100" }}
                          fontWeight="500"
                        >
                          <HStack gap={3}>
                            <Box color="gray.600"><FiHome /></Box>
                            <Text>Home</Text>
                          </HStack>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          justifyContent="flex-start"
                          size="sm"
                          onClick={() => {
                            navigate(ROUTES.ORDERS);
                            setShowUserMenu(false);
                          }}
                          borderRadius="lg"
                          color="gray.700"
                          bg="transparent"
                          _hover={{ bg: "gray.100" }}
                          fontWeight="500"
                        >
                          <HStack gap={3}>
                            <Box color="gray.600"><FiFileText /></Box>
                            <Text>Orders</Text>
                          </HStack>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          justifyContent="flex-start"
                          size="sm"
                          onClick={() => {
                            navigate(ROUTES.PROFILE);
                            setShowUserMenu(false);
                          }}
                          borderRadius="lg"
                          color="gray.700"
                          bg="transparent"
                          _hover={{ bg: "gray.100" }}
                          fontWeight="500"
                        >
                          <HStack gap={3}>
                            <Box color="gray.600"><FiUser /></Box>
                            <Text>Profile</Text>
                          </HStack>
                        </Button>

                        <Box h="1px" bg="gray.100" my={1} />
                        
                        <Button
                          variant="ghost"
                          justifyContent="flex-start"
                          size="sm"
                          onClick={() => {
                            handleLogout();
                            setShowUserMenu(false);
                          }}
                          borderRadius="lg"
                          color="red.600"
                          bg="transparent"
                          _hover={{ bg: "red.50", color: "red.700" }}
                          fontWeight="500"
                        >
                          <HStack gap={3}>
                            <Box color="red.600"><FiLogOut /></Box>
                            <Text>Logout</Text>
                          </HStack>
                        </Button>
                      </VStack>
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <>
                {/* Login & Register Buttons */}
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate(ROUTES.LOGIN)}
                  borderRadius="lg"
                  fontWeight="500"
                  color="gray.700"
                  bg="transparent"
                  border="none"
                  _hover={{ bg: "gray.100", color: "gray.900" }}
                  _active={{ bg: "gray.200" }}
                  _focus={{ boxShadow: "none" }}
                >
                  Login
                </Button>
                <Button
                  size="md"
                  onClick={() => navigate(ROUTES.REGISTER)}
                  borderRadius="lg"
                  fontWeight="600"
                  bg="blue.500"
                  color="white"
                  border="none"
                  _hover={{ bg: "blue.600", color: "white" }}
                  _active={{ bg: "blue.700", color: "white" }}
                  _focus={{ boxShadow: "none" }}
                >
                  Register
                </Button>
              </>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default Header;