import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  HStack,
  Badge,
  IconButton,
  Flex,
  Image
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
  const [localQuantity, setLocalQuantity] = useState(1); // Local quantity state starting at 1

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

    // Subsequent clicks: make API call with selected quantity
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
      setLocalQuantity(1); // Reset to 1 for next time
      
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

    setIsLoading(true);
    try {
      // Add to cart with current local quantity
      await apiCartService.addToCart({
        product_id: product.id,
        quantity: showQuantityControls ? localQuantity : 1
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
    if (localQuantity > 1) {
      console.log('🛒 [Product] Decreasing local quantity from', localQuantity, 'to', localQuantity - 1);
      setLocalQuantity(prev => prev - 1);
    } else {
      console.log('🛒 [Product] Minimum quantity reached, hiding controls');
      setShowQuantityControls(false);
      setLocalQuantity(1);
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

  return (
    <Box 
      className="product-card"
      bg="white"
      borderRadius="16px"
      boxShadow="0 2px 8px rgba(0,0,0,0.08)"
      overflow="hidden"
      transition="all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      _hover={{ 
        transform: 'translateY(-8px)', 
        boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
        cursor: 'pointer'
      }}
      width="300px"
      minHeight="420px"
      display="flex"
      flexDirection="column"
      position="relative"
      border="1px solid"
      borderColor="gray.100"
    >
      {/* Product Image Container */}
      <Box 
        position="relative"
        height="200px"
        width="100%"
        bg="gray.50"
        overflow="hidden"
        flexShrink={0}
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
      <Box p={5} flex="1" display="flex" flexDirection="column">
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
          fontSize="lg"
          fontWeight="700"
          color="gray.900"
          lineHeight="1.3"
          mb={2}
          minHeight="2.5rem"
          overflow="hidden"
          css={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}
        >
          {product.name}
        </Box>

        {/* Stock Information */}
        <Text fontSize="sm" color="gray.600" mb={3}>
          {product.stock_quantity} {product.unit} available
        </Text>

        {/* Pricing */}
        <Box className="product-pricing" mb={4}>
          <Text 
            className="product-price" 
            fontSize="2xl" 
            fontWeight="800" 
            color="blue.600"
            lineHeight="1"
          >
            ₱{product.price.toFixed(2)}
          </Text>
          <Text className="product-unit" fontSize="sm" color="gray.500">
            per {product.unit}
          </Text>
        </Box>

        {/* Action Buttons */}
        <Box className="product-actions" mt="auto">
          {/* Quantity Controls */}
          {showQuantityControls && (
            <HStack 
              className="product-quantity-controls" 
              justify="space-between" 
              width="100%"
              bg="gray.50"
              borderRadius="12px"
              p={2}
              mb={3}
              border="1px solid"
              borderColor="gray.200"
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
              <Text 
                fontWeight="700" 
                fontSize="lg"
                color="gray.800"
                minW="40px"
                textAlign="center"
              >
                {localQuantity}
              </Text>
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
          )}

          {/* Add to Cart Button */}
          <Button
            className="product-add-to-cart-button"
            size="md"
            width="100%"
            variant="outline"
            colorScheme="blue"
            onClick={handleAddToCart}
            disabled={isLoading || product.stock_quantity === 0 || !product.is_active}
            loading={isLoading}
            fontWeight="600"
            mb={3}
            h="44px"
            borderRadius="12px"
            borderWidth="2px"
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
            size="md"
            width="100%"
            colorScheme="blue"
            onClick={handleBuyNow}
            disabled={isLoading || product.stock_quantity === 0 || !product.is_active}
            loading={isLoading}
            fontWeight="600"
            h="44px"
            borderRadius="12px"
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