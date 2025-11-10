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
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '@chakra-ui/react/select';
import { createListCollection } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiPlus, FiMinus } from 'react-icons/fi';
import type { Product as ProductType } from '../types/product';
import type { User } from '../types/auth.js';
import { ROUTES } from '../constants/routes.js';
import { API_ENDPOINTS } from '../constants/api';
import { apiCartService } from '../services/apiCartService';
import './Product.css';

interface HollowBlocksProductProps {
  products: ProductType[]; // Array of hollow block products with different sizes
  user: User | null;
  onCartUpdate?: () => void;
}

const HollowBlocksProduct: React.FC<HollowBlocksProductProps> = ({
  products,
  user,
  onCartUpdate
}) => {
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuantityControls, setShowQuantityControls] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(1);
  const [showMinimumOrderWarning, setShowMinimumOrderWarning] = useState(false);

  // Extract size from product unit (e.g., "5\" CHB" -> "5\" CHB" or "4\" CHB" -> "4\" CHB")
  function extractSizeName(unit: string): string {
    // The unit already contains the size info like "5" CHB" or "4" CHB"
    // Just return it as-is
    return unit;
  }

  // Sort products by size and create size options
  const sortedProducts = [...products].sort((a, b) => {
    // Extract size number from unit (e.g., "5\" CHB" -> 5)
    const sizeA = parseFloat(a.unit.match(/\d+/)?.[0] || '0');
    const sizeB = parseFloat(b.unit.match(/\d+/)?.[0] || '0');
    return sizeA - sizeB;
  });

  const sizeOptions = createListCollection({
    items: sortedProducts.map(product => ({
      label: extractSizeName(product.unit),
      value: product.id.toString()
    }))
  });

  // Initialize with first product
  useEffect(() => {
    if (sortedProducts.length > 0 && !selectedProduct) {
      const firstProduct = sortedProducts[0];
      setSelectedProduct(firstProduct);
      setSelectedSize(firstProduct.id.toString());
      setLocalQuantity(firstProduct.minimum_order || 1);
    }
  }, [sortedProducts]);

  // Update selected product when size changes
  const handleSizeChange = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      setSelectedProduct(product);
      setSelectedSize(productId);
      setLocalQuantity(product.minimum_order || 1);
      setShowQuantityControls(false);
      setShowMinimumOrderWarning(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedProduct) return;

    const minimumOrder = selectedProduct.minimum_order || 1;

    // First click: show quantity controls
    if (!showQuantityControls) {
      setShowQuantityControls(true);
      return;
    }

    // Validate minimum order
    if (localQuantity < minimumOrder) {
      setShowMinimumOrderWarning(true);
      setTimeout(() => setShowMinimumOrderWarning(false), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await apiCartService.addToCart({
        product_id: selectedProduct.id,
        quantity: localQuantity
      });

      setShowQuantityControls(false);
      setLocalQuantity(minimumOrder);
      setShowMinimumOrderWarning(false);
      onCartUpdate?.();
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedProduct) return;

    const quantityToAdd = showQuantityControls ? localQuantity : (selectedProduct.minimum_order || 1);
    const minimumOrder = selectedProduct.minimum_order || 1;

    if (quantityToAdd < minimumOrder) {
      setShowMinimumOrderWarning(true);
      setTimeout(() => setShowMinimumOrderWarning(false), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await apiCartService.addToCart({
        product_id: selectedProduct.id,
        quantity: quantityToAdd
      });
      onCartUpdate?.();
      navigate(ROUTES.CART);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityIncrease = () => {
    setLocalQuantity(prev => prev + 1);
  };

  const handleQuantityDecrease = () => {
    const minimumOrder = selectedProduct?.minimum_order || 1;
    if (localQuantity > minimumOrder) {
      setLocalQuantity(prev => prev - 1);
      setShowMinimumOrderWarning(false);
    } else {
      setShowQuantityControls(false);
      setLocalQuantity(minimumOrder);
      setShowMinimumOrderWarning(false);
    }
  };

  const handleProductClick = () => {
    if (selectedProduct) {
      navigate(`/product/${selectedProduct.id}`);
    }
  };

  if (!selectedProduct) return null;

  const minimumOrder = selectedProduct.minimum_order || 1;

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
        {selectedProduct.stock_quantity > 0 && selectedProduct.is_active ? (
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
          src={selectedProduct.image_url ? API_ENDPOINTS.image(selectedProduct.image_url) : '/placeholder-product.png'}
          alt="Hollow Blocks"
          width="100%"
          height="100%"
          objectFit="cover"
          transition="transform 0.3s ease"
          _hover={{ transform: "scale(1.05)" }}
        />
      </Box>

      {/* Product Content */}
      <Box p={{ base: 4, md: 5 }} flex="1" display="flex" flexDirection="column">
        {/* Category Badge */}
        <Badge
          className="product-badge product-badge-blue"
          colorScheme="blue"
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
          HOLLOW BLOCKS
        </Badge>

        {/* Product Name */}
        <Box
          className="product-name"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight="700"
          color="gray.900"
          lineHeight="1.3"
          mb={2}
          minHeight={{ base: "2rem", md: "2.5rem" }}
          cursor="pointer"
          onClick={handleProductClick}
          transition="color 0.2s"
          _hover={{ color: "blue.600" }}
        >
          Hollow Blocks
        </Box>

        {/* Size Selection */}
        <Box mb={3}>
          <Text fontSize="xs" fontWeight="semibold" mb={2} color="gray.600">
            Select Size:
          </Text>
          <SelectRoot
            collection={sizeOptions}
            value={selectedSize ? [selectedSize] : []}
            onValueChange={(details) => {
              if (details.value && details.value.length > 0) {
                handleSizeChange(details.value[0]);
              }
            }}
            size="sm"
          >
            <SelectTrigger style={{
              backgroundColor: '#ffffff',
              color: '#2d3748',
              border: '2px solid #3182ce',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingRight: '12px',
              fontWeight: '600'
            }}>
              <SelectValueText placeholder="Select size" />
            </SelectTrigger>
            <SelectContent style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem'
            }}>
              {sizeOptions.items.map((option) => (
                <SelectItem
                  key={option.value}
                  item={option.value}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#2d3748',
                    fontWeight: '500'
                  }}
                  _hover={{
                    backgroundColor: '#f7fafc'
                  }}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
        </Box>

        {/* Stock Information */}
        <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={2}>
          {selectedProduct.stock_quantity} {selectedProduct.unit} available
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
            Min. Order: {minimumOrder} {selectedProduct.unit}
          </Badge>
          {showMinimumOrderWarning && (
            <Text fontSize="2xs" color="red.500" fontWeight="600">
              ⚠️ Please order at least {minimumOrder} {selectedProduct.unit}
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
            ₱{selectedProduct.price.toFixed(2)}
          </Text>
          <Text className="product-unit" fontSize={{ base: "xs", md: "sm" }} color="gray.500">
            per {selectedProduct.unit}
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
                  onClick={handleQuantityDecrease}
                  disabled={isLoading || selectedProduct.stock_quantity === 0 || !selectedProduct.is_active}
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
                  onClick={handleQuantityIncrease}
                  disabled={isLoading || selectedProduct.stock_quantity === 0 || !selectedProduct.is_active}
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
            disabled={isLoading || selectedProduct.stock_quantity === 0 || !selectedProduct.is_active}
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
            {(selectedProduct.stock_quantity > 0 && selectedProduct.is_active) ? 'Add to Cart' : 'Out of Stock'}
          </Button>

          {/* Buy Now Button */}
          <Button
            className="product-buy-now-button"
            size={{ base: "sm", md: "md" }}
            width="100%"
            colorScheme="blue"
            onClick={handleBuyNow}
            disabled={isLoading || selectedProduct.stock_quantity === 0 || !selectedProduct.is_active}
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
          >
            Buy Now
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default HollowBlocksProduct;
