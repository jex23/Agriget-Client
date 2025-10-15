import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  IconButton,
  Flex,
  Image,
  SimpleGrid,
  Skeleton,
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiShoppingCart, FiArrowLeft, FiPlus, FiMinus, FiPackage, FiInfo } from 'react-icons/fi';
import type { User } from '../types/auth.js';
import type { Product } from '../types/product';
import type { CartItem } from '../types/cart';
import authService from '../services/authService.js';
import { productService } from '../services/productService';
import { apiCartService } from '../services/apiCartService';
import { API_ENDPOINTS } from '../constants/api';
import { ROUTES } from '../constants/routes.js';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import './ProductDetails.css';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      fetchCart();
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Set initial quantity to minimum order when product is loaded
  useEffect(() => {
    if (product && product.minimum_order) {
      setQuantity(product.minimum_order);
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const productData = await productService.getProduct(Number(id));
      setProduct(productData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const cartData = await apiCartService.getCart();
      setCartItems(cartData);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  };

  const handleRemoveFromCart = async (productId: number) => {
    try {
      await apiCartService.removeFromCart(productId);
      await fetchCart();
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    }
  };

  const handleClearCart = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove all ${cartItems.length} item(s) from your cart? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiCartService.clearCart();
      await fetchCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleQuantityIncrease = () => {
    setQuantity(prev => prev + 1);
  };

  const handleQuantityDecrease = () => {
    const minOrder = product?.minimum_order || 1;
    if (quantity > minOrder) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!product) return;

    const minOrder = product.minimum_order || 1;
    if (quantity < minOrder) {
      alert(`Minimum order quantity is ${minOrder} ${product.unit}`);
      return;
    }

    setIsAddingToCart(true);
    try {
      await apiCartService.addToCart({
        product_id: product.id,
        quantity: quantity
      });
      await fetchCart();
      alert('Product added to cart successfully!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!product) return;

    const minOrder = product.minimum_order || 1;
    if (quantity < minOrder) {
      alert(`Minimum order quantity is ${minOrder} ${product.unit}`);
      return;
    }

    setIsAddingToCart(true);
    try {
      await apiCartService.addToCart({
        product_id: product.id,
        quantity: quantity
      });
      await fetchCart();
      navigate(ROUTES.CART);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
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

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <Box className="product-details-container" bg="gray.50" minH="100vh">
        <Header
          user={user}
          cartItems={getTotalItems()}
          cartItemsData={cartItems}
          onSidebarToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
          onRemoveFromCart={handleRemoveFromCart}
          onRemoveAllFromCart={handleClearCart}
        />
        <Container maxW="container.xl" py={8}>
          <VStack gap={6} align="stretch">
            <Skeleton height="40px" width="150px" />
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
              <Skeleton height="400px" />
              <VStack gap={4} align="stretch">
                <Skeleton height="30px" />
                <Skeleton height="20px" />
                <Skeleton height="60px" />
                <Skeleton height="100px" />
              </VStack>
            </SimpleGrid>
          </VStack>
        </Container>
        <Footer />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box className="product-details-container" bg="gray.50" minH="100vh">
        <Header
          user={user}
          cartItems={getTotalItems()}
          cartItemsData={cartItems}
          onSidebarToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
          onRemoveFromCart={handleRemoveFromCart}
          onRemoveAllFromCart={handleClearCart}
        />
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center" py={12}>
            <Text fontSize="4xl" mb={4}>😕</Text>
            <Heading size="lg" mb={4} color="gray.700">Product Not Found</Heading>
            <Text color="gray.600" mb={6}>{error || 'The product you are looking for does not exist.'}</Text>
            <Button colorScheme="blue" onClick={() => navigate(ROUTES.HOME)}>
              Back to Home
            </Button>
          </Box>
        </Container>
        <Footer />
      </Box>
    );
  }

  const minimumOrder = product.minimum_order || 1;
  const isOutOfStock = product.stock_quantity === 0 || !product.is_active;

  return (
    <Box className="product-details-container" bg="gray.50" minH="100vh" color="gray.900">
      <Header
        user={user}
        cartItems={getTotalItems()}
        cartItemsData={cartItems}
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        onRemoveFromCart={handleRemoveFromCart}
        onRemoveAllFromCart={handleClearCart}
      />

      <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <VStack gap={{ base: 4, md: 8 }} align="center">
          {/* Back Button */}
          <Box width="100%" maxW="1200px">
            <Button
              variant="ghost"
              onClick={() => navigate(ROUTES.HOME)}
              alignSelf="flex-start"
              color="gray.700"
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              _hover={{ bg: "gray.100", color: "gray.900", borderColor: "gray.300" }}
              fontWeight="600"
              px={4}
              h="40px"
            >
              <HStack gap={2}>
                <Box color="gray.700" display="flex" alignItems="center">
                  <FiArrowLeft size={18} />
                </Box>
                <Text color="gray.700" fontSize="sm" fontWeight="600">
                  Back to Products
                </Text>
              </HStack>
            </Button>
          </Box>

          {/* Product Details */}
          <Flex
            direction={{ base: "column", lg: "row" }}
            gap={{ base: 6, md: 8 }}
            align="flex-start"
            width="100%"
            maxW="1200px"
            mx="auto"
          >
            {/* Left Column - Image and Description */}
            <VStack align="stretch" gap={6} flex={{ base: "1", lg: "0 0 50%" }} maxW={{ base: "100%", lg: "600px" }}>
              {/* Product Image */}
              <Box
                bg="white"
                borderRadius={{ base: "lg", md: "xl" }}
                overflow="hidden"
                boxShadow="md"
                position="relative"
                border="1px solid"
                borderColor="gray.200"
              >
                {/* Stock Badge */}
                <Badge
                  position="absolute"
                  top={4}
                  left={4}
                  bg={isOutOfStock ? "red.500" : "green.500"}
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="md"
                  fontSize="sm"
                  fontWeight="600"
                  zIndex={2}
                >
                  {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                </Badge>

                <Image
                  src={product.image_url ? API_ENDPOINTS.image(product.image_url) : '/placeholder-product.png'}
                  alt={product.name}
                  width="100%"
                  height={{ base: "300px", md: "400px", lg: "450px" }}
                  objectFit="cover"
                />
              </Box>

              {/* Description - Below Image */}
              {product.description && (
                <Box
                  bg="white"
                  p={{ base: 5, md: 6 }}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="gray.200"
                  boxShadow="sm"
                >
                  <Heading size="md" mb={3} color="gray.800">
                    Description
                  </Heading>
                  <Text color="gray.700" fontSize={{ base: "sm", md: "md" }} lineHeight="1.8">
                    {product.description}
                  </Text>
                </Box>
              )}
            </VStack>

            {/* Right Column - Product Information */}
            <VStack align="stretch" gap={{ base: 4, md: 5 }} flex="1" maxW={{ base: "100%", lg: "500px" }}>
              {/* Category Badge */}
              {product.category && (
                <Badge
                  colorScheme={getBadgeColorScheme(product.category)}
                  size="sm"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="600"
                  alignSelf="flex-start"
                  textTransform="uppercase"
                >
                  {product.category}
                </Badge>
              )}

              {/* Product Name */}
              <Heading
                size={{ base: "lg", md: "xl" }}
                color="gray.900"
                lineHeight="1.3"
              >
                {product.name}
              </Heading>

              {/* Price & Savings Badge */}
              <Box
                bg="gradient-to-r from-blue-50 to-indigo-50"
                p={5}
                borderRadius="xl"
                border="2px solid"
                borderColor="blue.200"
                position="relative"
                overflow="hidden"
                className="price-card"
              >
                {/* Decorative background element */}
                <Box
                  position="absolute"
                  top="-20px"
                  right="-20px"
                  width="100px"
                  height="100px"
                  bg="blue.100"
                  borderRadius="full"
                  opacity={0.3}
                />
                <VStack align="stretch" gap={2} position="relative" zIndex={1}>
                  <HStack align="baseline" gap={2}>
                    <Text
                      fontSize={{ base: "3xl", md: "4xl" }}
                      fontWeight="900"
                      color="blue.600"
                      lineHeight="1"
                    >
                      ₱{product.price.toFixed(2)}
                    </Text>
                    <Text fontSize={{ base: "md", md: "lg" }} color="gray.600" fontWeight="600">
                      per {product.unit}
                    </Text>
                  </HStack>
                  <HStack gap={2}>
                    <Badge colorScheme="green" px={2} py={1} borderRadius="md" fontSize="xs">
                      ✓ Best Price
                    </Badge>
                    <Badge colorScheme="purple" px={2} py={1} borderRadius="md" fontSize="xs">
                      ✓ Quality Guaranteed
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              {/* Product Info Cards - Always show both */}
              <SimpleGrid columns={2} gap={3}>
                <Box
                  bg="white"
                  p={4}
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={isOutOfStock ? "red.200" : "green.200"}
                  boxShadow="sm"
                  className="info-card"
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    height="3px"
                    bg={isOutOfStock ? "red.400" : "green.400"}
                  />
                  <HStack gap={2} mb={2}>
                    <Box color={isOutOfStock ? "red.600" : "green.600"}>
                      <FiPackage size={18} />
                    </Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="700" textTransform="uppercase" letterSpacing="wide">
                      Availability
                    </Text>
                  </HStack>
                  <VStack align="start" gap={1}>
                    <Text fontSize="xl" fontWeight="800" color={isOutOfStock ? "red.600" : "green.600"}>
                      {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                    </Text>
                    {!isOutOfStock && (
                      <Text fontSize="xs" color="gray.600" fontWeight="600">
                        {product.stock_quantity} {product.unit} available
                      </Text>
                    )}
                  </VStack>
                </Box>

                <Box
                  bg={minimumOrder > 1 ? "orange.50" : "blue.50"}
                  p={4}
                  borderRadius="lg"
                  border="2px solid"
                  borderColor={minimumOrder > 1 ? "orange.200" : "blue.200"}
                  boxShadow="sm"
                  className="info-card"
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    height="3px"
                    bg={minimumOrder > 1 ? "orange.400" : "blue.400"}
                  />
                  <HStack gap={2} mb={2}>
                    <Box color={minimumOrder > 1 ? "orange.600" : "blue.600"}>
                      <FiInfo size={18} />
                    </Box>
                    <Text fontSize="xs" color={minimumOrder > 1 ? "orange.800" : "blue.800"} fontWeight="700" textTransform="uppercase" letterSpacing="wide">
                      Minimum Order
                    </Text>
                  </HStack>
                  <VStack align="start" gap={1}>
                    <HStack align="baseline" gap={1}>
                      <Text fontSize="2xl" fontWeight="800" color={minimumOrder > 1 ? "orange.800" : "blue.800"}>
                        {minimumOrder}
                      </Text>
                      <Text fontSize="md" fontWeight="600" color={minimumOrder > 1 ? "orange.700" : "blue.700"}>
                        {product.unit}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color={minimumOrder > 1 ? "orange.700" : "blue.700"} fontWeight="600">
                      {minimumOrder === 1 ? 'minimum required' : 'per order'}
                    </Text>
                  </VStack>
                </Box>
              </SimpleGrid>

              {/* Trust Signals */}
              <Box
                bg="gradient-to-r from-green-50 to-emerald-50"
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="green.200"
                className="trust-signals"
              >
                <SimpleGrid columns={3} gap={3} textAlign="center">
                  <VStack gap={1}>
                    <Text fontSize="2xl">🚚</Text>
                    <Text fontSize="2xs" fontWeight="700" color="gray.700">
                      Fast Delivery
                    </Text>
                  </VStack>
                  <VStack gap={1}>
                    <Text fontSize="2xl">🏆</Text>
                    <Text fontSize="2xs" fontWeight="700" color="gray.700">
                      Premium Quality
                    </Text>
                  </VStack>
                  <VStack gap={1}>
                    <Text fontSize="2xl">💯</Text>
                    <Text fontSize="2xs" fontWeight="700" color="gray.700">
                      100% Genuine
                    </Text>
                  </VStack>
                </SimpleGrid>
              </Box>

              {/* Quantity Selector - Enhanced */}
              <Box
                bg="white"
                p={{ base: 4, md: 5 }}
                borderRadius="xl"
                border="2px solid"
                borderColor={quantity < minimumOrder ? "red.300" : "blue.200"}
                boxShadow="md"
                className="quantity-selector"
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontSize="sm" fontWeight="700" color="gray.800" textTransform="uppercase" letterSpacing="wide">
                    Select Quantity
                  </Text>
                  {quantity >= minimumOrder && (
                    <Badge colorScheme="green" fontSize="2xs" px={2} py={1} borderRadius="full">
                      ✓ Valid
                    </Badge>
                  )}
                </Flex>
                <HStack
                  justify="space-between"
                  bg={quantity < minimumOrder ? "red.50" : "blue.50"}
                  borderRadius="xl"
                  p={4}
                  border="2px solid"
                  borderColor={quantity < minimumOrder ? "red.400" : "blue.300"}
                  className="quantity-controls"
                >
                  <IconButton
                    aria-label="Decrease quantity"
                    size="lg"
                    variant="solid"
                    colorScheme="blue"
                    onClick={handleQuantityDecrease}
                    disabled={isOutOfStock || quantity <= minimumOrder}
                    borderRadius="full"
                    bg="blue.600"
                    color="white"
                    _hover={{ bg: "blue.700", transform: "scale(1.05)" }}
                    _active={{ transform: "scale(0.95)" }}
                    transition="all 0.2s"
                    boxShadow="md"
                  >
                    <FiMinus size={20} />
                  </IconButton>
                  <VStack gap={0}>
                    <Text
                      fontSize="3xl"
                      fontWeight="900"
                      color={quantity < minimumOrder ? "red.600" : "blue.700"}
                      minW="80px"
                      textAlign="center"
                    >
                      {quantity}
                    </Text>
                    <Text fontSize="xs" color="gray.600" fontWeight="600">
                      {product.unit}
                    </Text>
                    {quantity < minimumOrder && (
                      <Badge colorScheme="red" fontSize="2xs" mt={1}>
                        Below minimum
                      </Badge>
                    )}
                  </VStack>
                  <IconButton
                    aria-label="Increase quantity"
                    size="lg"
                    variant="solid"
                    colorScheme="blue"
                    onClick={handleQuantityIncrease}
                    disabled={isOutOfStock}
                    borderRadius="full"
                    bg="blue.600"
                    color="white"
                    _hover={{ bg: "blue.700", transform: "scale(1.05)" }}
                    _active={{ transform: "scale(0.95)" }}
                    transition="all 0.2s"
                    boxShadow="md"
                  >
                    <FiPlus size={20} />
                  </IconButton>
                </HStack>
                <Flex justify="space-between" align="center" mt={3}>
                  <Text fontSize="xs" color="gray.600" fontWeight="500">
                    Min: {minimumOrder} {product.unit}
                  </Text>
                  {!isOutOfStock && (
                    <Text fontSize="xs" color="green.600" fontWeight="600">
                      Max: {product.stock_quantity} {product.unit}
                    </Text>
                  )}
                </Flex>
              </Box>

              {/* Total Price - Enhanced */}
              <Box
                bg="gradient-to-r from-blue-600 to-indigo-600"
                p={{ base: 5, md: 6 }}
                borderRadius="xl"
                boxShadow="xl"
                className="total-price-card"
                position="relative"
                overflow="hidden"
              >
                {/* Animated background */}
                <Box
                  position="absolute"
                  top="-50px"
                  right="-50px"
                  width="150px"
                  height="150px"
                  bg="whiteAlpha.200"
                  borderRadius="full"
                  className="price-glow"
                />
                <VStack gap={2} position="relative" zIndex={1}>
                  <Flex justify="space-between" align="center" width="100%">
                    <VStack align="start" gap={0}>
                      <Text fontSize="xs" fontWeight="700" color="blue.100" textTransform="uppercase" letterSpacing="wider">
                        Total Amount
                      </Text>
                      <Text fontSize="2xs" color="blue.200">
                        ({quantity} {product.unit})
                      </Text>
                    </VStack>
                    <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="900" color="white" textShadow="0 2px 8px rgba(0,0,0,0.2)">
                      ₱{(product.price * quantity).toFixed(2)}
                    </Text>
                  </Flex>
                  {quantity > minimumOrder && (
                    <Box bg="whiteAlpha.200" px={3} py={1} borderRadius="full" width="100%">
                      <Text fontSize="2xs" color="white" fontWeight="600" textAlign="center">
                        💰 Great choice! Ordering {quantity - minimumOrder} extra {product.unit}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>

              {/* Action Buttons - Enhanced */}
              <VStack gap={3} width="100%">
                <Button
                  size="lg"
                  width="100%"
                  variant="outline"
                  colorScheme="blue"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || isOutOfStock || quantity < minimumOrder}
                  loading={isAddingToCart}
                  h="56px"
                  fontSize="md"
                  fontWeight="700"
                  borderWidth="2px"
                  color="blue.600"
                  borderColor="blue.600"
                  bg="white"
                  borderRadius="xl"
                  _hover={{
                    bg: "blue.50",
                    transform: "translateY(-3px)",
                    boxShadow: "lg",
                    borderColor: "blue.700"
                  }}
                  _active={{
                    transform: "translateY(-1px)",
                  }}
                  transition="all 0.2s"
                  className="add-to-cart-btn"
                >
                  <HStack gap={2}>
                    <FiShoppingCart size={20} />
                    <Text>
                      {isOutOfStock ? 'Out of Stock' : quantity < minimumOrder ? `Select ${minimumOrder} ${product.unit} minimum` : 'Add to Cart'}
                    </Text>
                  </HStack>
                </Button>

                <Button
                  size="lg"
                  width="100%"
                  colorScheme="blue"
                  onClick={handleBuyNow}
                  disabled={isAddingToCart || isOutOfStock || quantity < minimumOrder}
                  loading={isAddingToCart}
                  h="60px"
                  fontSize="lg"
                  fontWeight="800"
                  bg="gradient-to-r from-blue-600 to-indigo-600"
                  color="white"
                  borderRadius="xl"
                  boxShadow="xl"
                  _hover={{
                    bg: "gradient-to-r from-blue-700 to-indigo-700",
                    transform: "translateY(-3px)",
                    boxShadow: "2xl"
                  }}
                  _active={{
                    transform: "translateY(-1px)",
                  }}
                  transition="all 0.2s"
                  className="buy-now-btn"
                  position="relative"
                  overflow="hidden"
                >
                  <Box position="relative" zIndex={1}>
                    {isOutOfStock ? 'Out of Stock' : quantity < minimumOrder ? `Select ${minimumOrder} ${product.unit} minimum` : '🛒 Buy Now - Fast Checkout'}
                  </Box>
                  <Box
                    position="absolute"
                    top="0"
                    left="-100%"
                    width="100%"
                    height="100%"
                    bg="whiteAlpha.300"
                    className="btn-shine"
                  />
                </Button>

                {!isOutOfStock && quantity >= minimumOrder && (
                  <Flex gap={2} align="center" justify="center" width="100%">
                    <Text fontSize="xs" color="green.600" fontWeight="700">
                      ✓ Ready to order
                    </Text>
                    <Text fontSize="xs" color="gray.500">•</Text>
                    <Text fontSize="xs" color="blue.600" fontWeight="700">
                      🚚 Fast delivery available
                    </Text>
                  </Flex>
                )}
              </VStack>
            </VStack>
          </Flex>
        </VStack>
      </Container>

      <Footer />
    </Box>
  );
};

export default ProductDetails;
