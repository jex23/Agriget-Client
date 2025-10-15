import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  HStack,
  Badge,
  IconButton,
  Flex,
  Image,
  VStack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi';
import type { Product as ProductType } from '../types/product';
import type { User } from '../types/auth.js';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import { apiCartService } from '../services/apiCartService';
import './Product.css';

interface ProductProps {
  product: ProductType;
  user: User | null;
  onCartUpdate?: () => void; // Callback to refresh cart data
}

const Product: React.FC<ProductProps> = ({
  product,
  user,
  onCartUpdate
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showQuantityControls, setShowQuantityControls] = useState(false);
  const minimumOrder = product.minimum_order || 1;
  const [localQuantity, setLocalQuantity] = useState(minimumOrder); // Local quantity state starting at minimum order
  const [showMinimumOrderWarning, setShowMinimumOrderWarning] = useState(false);

  // Update localQuantity when minimum_order changes
  useEffect(() => {
    setLocalQuantity(minimumOrder);
  }, [minimumOrder]);

  // Log product minimum_order for debugging
  useEffect(() => {
    console.log('🛒 [Product Card] Product:', product.name);
    console.log('🛒 [Product Card] product.minimum_order from API:', product.minimum_order);
    console.log('🛒 [Product Card] minimumOrder (with fallback):', minimumOrder);
    console.log('🛒 [Product Card] Will show badge:', minimumOrder >= 1);
  }, [product, minimumOrder]);

  const handleAddToCart = async () => {
    console.log('🛒 [Product] handleAddToCart clicked for product:', product.id, product.name);
    console.log('🛒 [Product] User:', user ? user.name : 'Not logged in');
    console.log('🛒 [Product] localQuantity:', localQuantity);
    console.log('🛒 [Product] showQuantityControls:', showQuantityControls);

    if (!user) {
      console.log('🛒 [Product] No user, redirecting to login');
      navigate(ROUTES.LOGIN);
      return;
    }

    // First click: just show quantity controls without API call
    if (!showQuantityControls) {
      console.log('🛒 [Product] First click - showing quantity controls without API call');
      setShowQuantityControls(true);
      return;
    }

    // Subsequent clicks: Validate minimum order before API call
    if (localQuantity < minimumOrder) {
      console.log('🛒 [Product] Quantity below minimum order, showing warning');
      setShowMinimumOrderWarning(true);
      setTimeout(() => setShowMinimumOrderWarning(false), 3000);
      return;
    }

    setIsLoading(true);
    try {
      console.log('🛒 [Product] Making API call - calling apiCartService.addToCart with:', {
        product_id: product.id,
        quantity: localQuantity
      });

      const response = await apiCartService.addToCart({
        product_id: product.id,
        quantity: localQuantity
      });

      console.log('🛒 [Product] API response:', response);

      // Hide quantity controls and reset quantity after successful API call
      console.log('🛒 [Product] Hiding quantity controls and resetting quantity after successful API call');
      setShowQuantityControls(false);
      setLocalQuantity(minimumOrder); // Reset to minimum order for next time
      setShowMinimumOrderWarning(false);

      // Trigger cart update callback
      console.log('🛒 [Product] Calling onCartUpdate callback');
      onCartUpdate?.();

      console.log('🛒 [Product] Add to cart completed successfully');
    } catch (error) {
      console.error('🛒 [Product] Failed to add to cart:', error);
      if (error instanceof Error) {
        console.error('🛒 [Product] Error message:', error.message);
      }
      // Don't hide quantity controls if API call failed
      console.log('🛒 [Product] API call failed, keeping quantity controls visible');
    } finally {
      setIsLoading(false);
      console.log('🛒 [Product] setIsLoading(false)');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    const quantityToAdd = showQuantityControls ? localQuantity : minimumOrder;

    // Validate minimum order
    if (quantityToAdd < minimumOrder) {
      console.log('🛒 [Product] Quantity below minimum order, showing warning');
      setShowMinimumOrderWarning(true);
      setTimeout(() => setShowMinimumOrderWarning(false), 3000);
      return;
    }

    setIsLoading(true);
    try {
      // Add to cart with current local quantity
      await apiCartService.addToCart({
        product_id: product.id,
        quantity: quantityToAdd
      });
      onCartUpdate?.();

      // Navigate to cart for immediate checkout
      navigate(ROUTES.CART);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityIncrease = () => {
    console.log('🛒 [Product] Increasing local quantity from', localQuantity, 'to', localQuantity + 1);
    setLocalQuantity(prev => prev + 1);
  };

  const handleQuantityDecrease = () => {
    if (localQuantity > minimumOrder) {
      console.log('🛒 [Product] Decreasing local quantity from', localQuantity, 'to', localQuantity - 1);
      setLocalQuantity(prev => prev - 1);
      setShowMinimumOrderWarning(false);
    } else {
      console.log('🛒 [Product] Minimum order quantity reached, hiding controls');
      setShowQuantityControls(false);
      setLocalQuantity(minimumOrder);
      setShowMinimumOrderWarning(false);
    }
  };

  const getBadgeColorScheme = (category?: string) => {
    if (!category) return 'gray';
    switch (category.toLowerCase()) {
      case 'hollow blocks':
        return 'blue';
      case 'sand':
        return 'orange';
      case 'gravel':
        return 'green';
      default:
        return 'gray';
    }
  };

  const handleProductClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <Box 
      className="product-card"
      bg="white"
      borderRadius={{ base: "12px", md: "16px" }}
      boxShadow="0 2px 8px rgba(0,0,0,0.08)"
      overflow="hidden"
      transition="all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      _hover={{ 
        transform: { base: 'translateY(-4px)', md: 'translateY(-8px)' }, 
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
        cursor: 'pointer'
      }}
      width={{ base: "100%", sm: "280px", md: "300px" }}
      maxWidth="100%"
      minHeight={{ base: "380px", md: "420px" }}
      display="flex"
      flexDirection="column"
      position="relative"
      border="1px solid"
      borderColor="gray.100"
      mx="auto"
    >
      {/* Product Image Container */}
      <Box
        position="relative"
        height={{ base: "180px", sm: "200px", md: "200px" }}
        width="100%"
        bg="gray.50"
        overflow="hidden"
        flexShrink={0}
        cursor="pointer"
        onClick={handleProductClick}
      >
        {/* Wishlist Button */}
        <IconButton
          aria-label="Add to wishlist"
          position="absolute"
          top={3}
          right={3}
          size="sm"
          variant="ghost"
          bg="white"
          color="gray.600"
          _hover={{ color: "red.500", bg: "white" }}
          borderRadius="full"
          boxShadow="0 2px 8px rgba(0,0,0,0.1)"
          zIndex={2}
        >
          <FiHeart />
        </IconButton>

        {/* Stock Badge */}
        {product.stock_quantity > 0 && product.is_active ? (
          <Badge
            position="absolute"
            top={3}
            left={3}
            bg="green.500"
            color="white"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="600"
            zIndex={2}
          >
            In Stock
          </Badge>
        ) : (
          <Badge
            position="absolute"
            top={3}
            left={3}
            bg="red.500"
            color="white"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="600"
            zIndex={2}
          >
            Out of Stock
          </Badge>
        )}

        {/* Product Image */}
        <Image 
          src={product.image_url ? API_ENDPOINTS.image(product.image_url) : '/placeholder-product.png'} 
          alt={product.name}
          width="100%"
          height="100%"
          objectFit="cover"
          transition="transform 0.3s ease"
          _hover={{ transform: "scale(1.05)" }}
        
        />
        <Flex
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          align="center"
          justify="center"
          bg="gray.100"
          fontSize="5xl"
          display="none"
          className="fallback-icon"
        >
          🏗️
        </Flex>
      </Box>

      {/* Product Content */}
      <Box p={{ base: 4, md: 5 }} flex="1" display="flex" flexDirection="column">
        {/* Category Badge */}
        {product.category && (
          <Badge
            className={`product-badge product-badge-${getBadgeColorScheme(product.category)}`}
            colorScheme={getBadgeColorScheme(product.category)}
            size="sm"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="600"
            mb={3}
            alignSelf="flex-start"
            textTransform="uppercase"
          >
            {product.category}
          </Badge>
        )}

        {/* Product Name */}
        <Box
          className="product-name"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight="700"
          color="gray.900"
          lineHeight="1.3"
          mb={2}
          minHeight={{ base: "2rem", md: "2.5rem" }}
          overflow="hidden"
          cursor="pointer"
          onClick={handleProductClick}
          transition="color 0.2s"
          _hover={{ color: "blue.600" }}
          css={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}
        >
          {product.name}
        </Box>

        {/* Stock Information */}
        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={2}>
          {product.stock_quantity} {product.unit} available
        </Text>

        {/* Minimum Order Information */}
        <VStack align="start" gap={1} mb={3}>
          <Badge
            colorScheme={minimumOrder > 1 ? "orange" : "gray"}
            size="sm"
            px={2}
            py={1}
            borderRadius="md"
            fontSize="2xs"
            fontWeight="600"
          >
            Min. Order: {minimumOrder} {product.unit}
          </Badge>
          {showMinimumOrderWarning && (
            <Text fontSize="2xs" color="red.500" fontWeight="600">
              ⚠️ Please order at least {minimumOrder} {product.unit}
            </Text>
          )}
        </VStack>

        {/* Pricing */}
        <Box className="product-pricing" mb={4}>
          <Text 
            className="product-price" 
            fontSize={{ base: "xl", md: "2xl" }} 
            fontWeight="800" 
            color="blue.600"
            lineHeight="1"
          >
            ₱{product.price.toFixed(2)}
          </Text>
          <Text className="product-unit" fontSize={{ base: "xs", md: "sm" }} color="gray.500">
            per {product.unit}
          </Text>
        </Box>

        {/* Action Buttons */}
        <Box className="product-actions" mt="auto">
          {/* Quantity Controls */}
          {showQuantityControls && (
            <Box mb={3}>
              <HStack
                className="product-quantity-controls"
                justify="space-between"
                width="100%"
                bg={localQuantity < minimumOrder ? "red.50" : "gray.50"}
                borderRadius="12px"
                p={2}
                border="2px solid"
                borderColor={localQuantity < minimumOrder ? "red.300" : "gray.200"}
                transition="all 0.2s"
              >
                <IconButton
                  aria-label="Decrease quantity"
                  size="sm"
                  variant="solid"
                  colorScheme="blue"
                  bg="blue.500"
                  color="white"
                  _hover={{ bg: 'blue.600' }}
                  _active={{ bg: 'blue.700' }}
                  _focus={{ boxShadow: 'none' }}
                  onClick={handleQuantityDecrease}
                  disabled={isLoading || product.stock_quantity === 0 || !product.is_active}
                  borderRadius="full"
                >
                  <FiMinus />
                </IconButton>
                <VStack gap={0}>
                  <Text
                    fontWeight="700"
                    fontSize="lg"
                    color={localQuantity < minimumOrder ? "red.600" : "gray.800"}
                    minW="40px"
                    textAlign="center"
                  >
                    {localQuantity}
                  </Text>
                  {localQuantity < minimumOrder && (
                    <Text fontSize="2xs" color="red.500" fontWeight="600">
                      Below min
                    </Text>
                  )}
                </VStack>
                <IconButton
                  aria-label="Increase quantity"
                  size="sm"
                  variant="solid"
                  colorScheme="blue"
                  bg="blue.500"
                  color="white"
                  _hover={{ bg: 'blue.600' }}
                  _active={{ bg: 'blue.700' }}
                  _focus={{ boxShadow: 'none' }}
                  onClick={handleQuantityIncrease}
                  disabled={isLoading || product.stock_quantity === 0 || !product.is_active}
                  borderRadius="full"
                >
                  <FiPlus />
                </IconButton>
              </HStack>
            </Box>
          )}

          {/* Add to Cart Button */}
          <Button
            className="product-add-to-cart-button"
            size={{ base: "sm", md: "md" }}
            width="100%"
            variant="outline"
            colorScheme="blue"
            onClick={handleAddToCart}
            disabled={isLoading || product.stock_quantity === 0 || !product.is_active}
            loading={isLoading}
            fontWeight="600"
            mb={3}
            h={{ base: "40px", md: "44px" }}
            borderRadius={{ base: "8px", md: "12px" }}
            borderWidth="2px"
            fontSize={{ base: "sm", md: "md" }}
            _hover={{
              bg: "blue.50",
              transform: "translateY(-1px)"
            }}
          >
            <FiShoppingCart style={{ marginRight: 8 }} />
            {(product.stock_quantity > 0 && product.is_active) ? 'Add to Cart' : 'Out of Stock'}
          </Button>

          {/* Buy Now Button */}
          <Button
            className="product-buy-now-button"
            size={{ base: "sm", md: "md" }}
            width="100%"
            colorScheme="blue"
            onClick={handleBuyNow}
            disabled={isLoading || product.stock_quantity === 0 || !product.is_active}
            loading={isLoading}
            fontWeight="600"
            h={{ base: "40px", md: "44px" }}
            borderRadius={{ base: "8px", md: "12px" }}
            fontSize={{ base: "sm", md: "md" }}
            bg="blue.600"
            _hover={{
              bg: "blue.700",
              transform: "translateY(-1px)"
            }}
            _active={{
              transform: "translateY(0px)"
            }}
          >
            Buy Now
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Product;