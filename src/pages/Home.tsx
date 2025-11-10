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
  SimpleGrid,
  Input,
  Badge,
  IconButton,
  Image,
  Grid,
  Center,
} from '@chakra-ui/react';
import { FiSearch, FiGrid, FiList, FiChevronLeft, FiChevronRight, FiTruck, FiShield, FiAward, FiPercent, FiTag, FiShoppingCart } from 'react-icons/fi';
import slide1 from '../images/1.png';
import slide2 from '../images/2.png';
import slide3 from '../images/3.png';
import type { User } from '../types/auth.js';
import authService from '../services/authService.js';
import Header from '../components/Header.js';
import Sidebar from '../components/Sidebar.js';
import Product from '../components/Product.js';
import HollowBlocksProduct from '../components/HollowBlocksProduct.js';
import { productService } from '../services/productService';
import { cacheService } from '../services/cacheService';
import { apiCartService } from '../services/apiCartService';
import type { Product as ProductType } from '../types/product';
import type { CartItem } from '../types/cart';
import './Home.css';


const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Slideshow state
  const slides = [slide1, slide2, slide3];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);


  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // Load cart from API if user is logged in
    if (currentUser) {
      fetchCart(currentUser);
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Try to get products from cache first
        const cachedProducts = cacheService.getCachedProducts();

        if (cachedProducts && cachedProducts.length > 0) {
          console.log('💾 Loading products from CACHE (not API)');
          console.log('📦 Cached Products Count:', cachedProducts.length);
          console.log('📊 Cached Product Details:');
          cachedProducts.forEach((product, index) => {
            console.log(`Product ${index + 1}:`, {
              id: product.id,
              name: product.name,
              category: product.category,
              unit: product.unit,
              price: product.price,
              stock_quantity: product.stock_quantity,
              minimum_order: product.minimum_order,
              is_active: product.is_active,
              image_url: product.image_url
            });
          });

          setProducts(cachedProducts);

          // Extract unique categories from cached products
          const uniqueCategories = ['All', ...new Set(cachedProducts.map(p => p.category).filter((cat): cat is string => Boolean(cat)))];
          setCategories(uniqueCategories);
          setLoading(false);
          return;
        }

        // If no cache, fetch from API
        const fetchedProducts = await productService.getProducts({ is_active: true });

        console.log('📦 API Response - Products:', fetchedProducts);
        console.log('📊 Product Details:');
        fetchedProducts.forEach((product, index) => {
          console.log(`Product ${index + 1}:`, {
            id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit,
            price: product.price,
            stock_quantity: product.stock_quantity,
            minimum_order: product.minimum_order,
            is_active: product.is_active,
            image_url: product.image_url
          });
        });

        setProducts(fetchedProducts);

        // Cache the fetched products (cache for 5 minutes)
        cacheService.cacheProducts(fetchedProducts);

        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(fetchedProducts.map(p => p.category).filter((cat): cat is string => Boolean(cat)))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('🏠 [Home] ❌ Error fetching products:', err);
        if (err instanceof Error) {
          console.error('🏠 [Home] Error message:', err.message);
          console.error('🏠 [Home] Error stack:', err.stack);
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch products');

        // Try to load from cache even if API fails
        const cachedProducts = cacheService.getCachedProducts();
        if (cachedProducts) {
          setProducts(cachedProducts);
          const uniqueCategories = ['All', ...new Set(cachedProducts.map(p => p.category).filter((cat): cat is string => Boolean(cat)))];
          setCategories(uniqueCategories);
          setError(null); // Clear error since we have cached data
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const fetchCart = async (userToCheck?: User | null) => {
    const userForCheck = userToCheck || user;

    if (!userForCheck) {
      return;
    }

    try {
      const cartData = await apiCartService.getCart();
      setCartItems(cartData);
    } catch (error) {
      console.error('🏠 [Home] Failed to fetch cart:', error);
      if (error instanceof Error) {
        console.error('🏠 [Home] Error message:', error.message);
      }
    }
  };

  const handleRemoveFromCart = async (productId: number) => {
    try {
      await apiCartService.removeFromCart(productId);
      await fetchCart();
    } catch (error) {
      console.error('🏠 [Home] Failed to remove from cart:', error);
    }
  };

  const handleClearCart = async () => {
    // Show confirmation dialog
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
      console.error('🏠 [Home] Failed to clear cart:', error);
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.product_price * item.quantity), 0);
  };


  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };


  const filteredProducts = selectedCategory === 'All'
    ? products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products.filter(product =>
        product.category === selectedCategory &&
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         product.category?.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  // Group products: separate hollow blocks from others
  const groupedProducts = () => {
    const hollowBlocks: ProductType[] = [];
    const otherProducts: ProductType[] = [];

    filteredProducts.forEach(product => {
      if (product.category?.toLowerCase() === 'hollow blocks') {
        hollowBlocks.push(product);
      } else {
        otherProducts.push(product);
      }
    });

    return { hollowBlocks, otherProducts };
  };

  const { hollowBlocks, otherProducts } = groupedProducts();

  return (
    <Box className="home-container" bg="gray.50" minH="100vh" color="gray.900">
      <Header
        user={user}
        cartItems={getTotalItems()}
        cartItemsData={cartItems}
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        onRemoveFromCart={handleRemoveFromCart}
        onRemoveAllFromCart={handleClearCart}
      />
      
      {/* Hero Slideshow */}
      <Box position="relative" overflow="hidden" bg="transparent">
        <Container maxW="container.xl" px={0}>
          <Box position="relative" w="100%" h={{ base: '220px', md: '420px' }}>
            {slides.map((src: any, idx: number) => (
              <Image
                key={idx}
                src={src}
                alt={`slide-${idx}`}
                objectFit="cover"
                width="100%"
                height="100%"
                position="absolute"
                top={0}
                left={0}
                transition="opacity 600ms ease-in-out, transform 600ms ease-in-out"
                opacity={idx === currentSlide ? 1 : 0}
                transform={idx === currentSlide ? 'scale(1)' : 'scale(1.02)'}
                zIndex={5}
                bg="transparent"
              />
            ))}

            {/* Controls */}
            <IconButton
              aria-label="Previous slide"
              position="absolute"
              left={4}
              top="50%"
              transform="translateY(-50%)"
              zIndex={20}
              onClick={() => setCurrentSlide((s) => (s - 1 + slides.length) % slides.length)}
              colorScheme="blackAlpha"
              pointerEvents="auto"
            >
              <FiChevronLeft />
            </IconButton>
            <IconButton
              aria-label="Next slide"
              position="absolute"
              right={4}
              top="50%"
              transform="translateY(-50%)"
              zIndex={20}
              onClick={() => setCurrentSlide((s) => (s + 1) % slides.length)}
              colorScheme="blackAlpha"
              pointerEvents="auto"
            >
              <FiChevronRight />
            </IconButton>

            {/* Indicators */}
            <HStack gap={2} position="absolute" bottom={4} left="50%" transform="translateX(-50%)" zIndex={30}>
              {slides.map((_, i) => (
                <Box
                  key={i}
                  as="button"
                  width="8px"
                  height="8px"
                  bg={i === currentSlide ? 'white' : 'rgba(255,255,255,0.45)'}
                  borderRadius="full"
                  onClick={() => setCurrentSlide(i)}
                  pointerEvents="auto"
                  transition="background-color 150ms ease, transform 150ms ease"
                  _hover={{ transform: 'scale(1.2)' }}
                />
              ))}
            </HStack>
          </Box>
        </Container>
      </Box>

      {/* Benefits Bar */}
      <Box bg="blue.600" py={{ base: 3, md: 4 }}>
        <Container maxW="container.xl">
          <Grid
            templateColumns={{ base: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)' }}
            gap={{ base: 3, md: 6 }}
          >
            <Flex align="center" justify="center" gap={2} color="white">
              <Box fontSize={{ base: '18px', md: '24px' }}><FiTruck /></Box>
              <VStack align="start" gap={0}>
                <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="700">Fast Delivery</Text>
                <Text fontSize={{ base: '2xs', md: 'xs' }} opacity={0.9}>Quick & Reliable</Text>
              </VStack>
            </Flex>
            <Flex align="center" justify="center" gap={2} color="white">
              <Box fontSize={{ base: '18px', md: '24px' }}><FiShield /></Box>
              <VStack align="start" gap={0}>
                <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="700">Quality Assured</Text>
                <Text fontSize={{ base: '2xs', md: 'xs' }} opacity={0.9}>Premium Products</Text>
              </VStack>
            </Flex>
            <Flex align="center" justify="center" gap={2} color="white">
              <Box fontSize={{ base: '18px', md: '24px' }}><FiAward /></Box>
              <VStack align="start" gap={0}>
                <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="700">Best Price</Text>
                <Text fontSize={{ base: '2xs', md: 'xs' }} opacity={0.9}>Competitive Rates</Text>
              </VStack>
            </Flex>
          </Grid>
        </Container>
      </Box>

      {/* Promotional Banner */}
      <Container maxW="container.xl" pt={{ base: 6, md: 8 }} px={{ base: 4, md: 6 }}>
        <Box
          bg="blue.600"
          bgGradient="linear(to-r, blue.600, blue.700)"
          borderRadius={{ base: 'xl', md: '2xl' }}
          p={{ base: 6, md: 8 }}
          position="relative"
          overflow="hidden"
          boxShadow="xl"
        >
          <Box
            position="absolute"
            top="-20px"
            right="-20px"
            fontSize="120px"
            opacity={0.1}
            transform="rotate(-15deg)"
            color="white"
          >
            <FiPercent />
          </Box>
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            gap={4}
            position="relative"
            zIndex={1}
          >
            <VStack align={{ base: 'center', md: 'start' }} gap={2}>
              <Badge colorScheme="yellow" fontSize="xs" px={3} py={1} borderRadius="full" fontWeight="700">
                LIMITED TIME OFFER
              </Badge>
              <Heading
                size={{ base: 'lg', md: 'xl' }}
                color="white"
                textAlign={{ base: 'center', md: 'left' }}
                textShadow="0 2px 4px rgba(0,0,0,0.2)"
              >
                Special Discount for Bulk Orders!
              </Heading>
              <Text
                color="white"
                fontSize={{ base: 'sm', md: 'md' }}
                textAlign={{ base: 'center', md: 'left' }}
                textShadow="0 1px 2px rgba(0,0,0,0.2)"
              >
                Free shipping above minimum order
              </Text>
            </VStack>
            <Button
              size={{ base: 'md', md: 'lg' }}
              colorScheme="yellow"
              color="gray.800"
              fontWeight="700"
              px={8}
              h={{ base: '44px', md: '52px' }}
              borderRadius="full"
              boxShadow="lg"
              _hover={{ transform: 'translateY(-2px)', boxShadow: '2xl' }}
              transition="all 0.2s"
              flexShrink={0}
            >
              Shop Now
            </Button>
          </Flex>
        </Box>
      </Container>


      {/* Main Content */}
      <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
        <Flex gap={{ base: 4, md: 8 }} align="flex-start" bg="transparent" direction={{ base: "column", lg: "row" }}>
          <Sidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            cartItems={getTotalItems()}
            totalPrice={getTotalPrice()}
            isOpen={isSidebarOpen}
            onToggle={handleSidebarToggle}
          />
          
          <VStack gap={6} align="stretch" flex={1}>
            {/* Search and Filter Bar */}
            <Box bg="white" borderRadius={{ base: "lg", md: "xl" }} shadow="sm" border="1px solid" borderColor="gray.200" p={{ base: 4, md: 6 }}>
              <Flex gap={{ base: 3, md: 4 }} align="center" justify="space-between" wrap="wrap">
                <Box position="relative" maxW={{ base: "100%", md: "400px" }} flex={1} w={{ base: "100%", md: "auto" }}>
                  <Box
                    position="absolute"
                    left={3}
                    top="50%"
                    transform="translateY(-50%)"
                    color="gray.400"
                    zIndex={2}
                    pointerEvents="none"
                  >
                    <FiSearch />
                  </Box>
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    borderRadius={{ base: "md", md: "lg" }}
                    bg="gray.50"
                    border="none"
                    pl="40px"
                    h={{ base: "44px", md: "40px" }}
                    fontSize={{ base: "16px", md: "14px" }}
                    color="gray.900"
                    _placeholder={{ color: "gray.500" }}
                    _focus={{ bg: "white", shadow: "sm" }}
                  />
                </Box>
                
                <HStack gap={2} mt={{ base: 2, md: 0 }} w={{ base: "100%", md: "auto" }} justify={{ base: "center", md: "flex-end" }}>
                  <IconButton
                    aria-label="Grid view"
                    variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                    colorScheme="blue"
                    onClick={() => setViewMode('grid')}
                    borderRadius={{ base: "md", md: "lg" }}
                    size={{ base: "md", md: "md" }}
                    color={viewMode === 'grid' ? 'white' : 'blue.500'}
                    bg={viewMode === 'grid' ? 'blue.500' : 'transparent'}
                    _hover={{ bg: viewMode === 'grid' ? 'blue.600' : 'blue.50' }}
                  >
                    <FiGrid />
                  </IconButton>
                  <IconButton
                    aria-label="List view"
                    variant={viewMode === 'list' ? 'solid' : 'ghost'}
                    colorScheme="blue"
                    onClick={() => setViewMode('list')}
                    borderRadius={{ base: "md", md: "lg" }}
                    size={{ base: "md", md: "md" }}
                    color={viewMode === 'list' ? 'white' : 'blue.500'}
                    bg={viewMode === 'list' ? 'blue.500' : 'transparent'}
                    _hover={{ bg: viewMode === 'list' ? 'blue.600' : 'blue.50' }}
                  >
                    <FiList />
                  </IconButton>
                </HStack>
              </Flex>
            </Box>

            {/* Category and Results Header */}
            <Box
              bg="white"
              borderRadius={{ base: "lg", md: "xl" }}
              p={{ base: 4, md: 6 }}
              boxShadow="sm"
              border="1px solid"
              borderColor="gray.200"
            >
              <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={{ base: 3, md: 0 }}>
                <VStack align="start" gap={2}>
                  <HStack>
                    <Box fontSize="24px"><FiTag /></Box>
                    <Heading size={{ base: "md", md: "lg" }} color="gray.800">
                      {selectedCategory === 'All' ? 'Browse All Products' : selectedCategory}
                    </Heading>
                  </HStack>
                  <Text color="gray.600" fontSize={{ base: "xs", md: "sm" }}>
                    Discover {filteredProducts.length} quality products at competitive prices
                  </Text>
                </VStack>

                {searchQuery && (
                  <Badge colorScheme="blue" fontSize={{ base: "xs", md: "sm" }} px={4} py={2} borderRadius="full" alignSelf={{ base: "flex-start", md: "center" }}>
                    Searching: "{searchQuery}"
                  </Badge>
                )}
              </Flex>
            </Box>

            {/* Products Grid */}
            {loading ? (
              <Box bg="white" borderRadius={{ base: "lg", md: "xl" }} shadow="sm" textAlign="center" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
                <VStack gap={4}>
                  <Box fontSize={{ base: "3xl", md: "4xl" }}>🔄</Box>
                  <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>Loading amazing products...</Text>
                </VStack>
              </Box>
            ) : error ? (
              <Box bg="white" borderRadius={{ base: "lg", md: "xl" }} shadow="sm" border="1px solid" borderColor="red.200" textAlign="center" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
                <VStack gap={4}>
                  <Box fontSize={{ base: "3xl", md: "4xl" }}>⚠️</Box>
                  <Text color="red.500" fontWeight="600" fontSize={{ base: "sm", md: "md" }}>Error: {error}</Text>
                  <Button onClick={() => window.location.reload()} colorScheme="red" variant="outline" size={{ base: "sm", md: "md" }}>
                    Try Again
                  </Button>
                </VStack>
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Box bg="white" borderRadius={{ base: "lg", md: "xl" }} shadow="sm" textAlign="center" py={{ base: 8, md: 12 }} px={{ base: 4, md: 6 }}>
                <VStack gap={4}>
                  <Box fontSize={{ base: "3xl", md: "4xl" }}>🔍</Box>
                  <Text color="gray.600" fontSize={{ base: "md", md: "lg" }}>No products found</Text>
                  <Text color="gray.500" fontSize={{ base: "xs", md: "sm" }}>
                    Try adjusting your search or category filter
                  </Text>
                  {searchQuery && (
                    <Button onClick={() => setSearchQuery('')} variant="outline" size={{ base: "sm", md: "sm" }}>
                      Clear Search
                    </Button>
                  )}
                </VStack>
              </Box>
            ) : (
              <SimpleGrid
                columns={{
                  base: viewMode === 'grid' ? 1 : 1,
                  sm: viewMode === 'grid' ? 2 : 1,
                  md: viewMode === 'grid' ? 2 : 1,
                  lg: viewMode === 'grid' ? 3 : 1,
                  xl: viewMode === 'grid' ? 4 : 1
                }}
                gap={{ base: 4, sm: 5, md: 6 }}
                justifyItems="center"
                w="full"
                px={{ base: 2, sm: 4, md: 0 }}
              >
                {/* Render Hollow Blocks as one combined product */}
                {hollowBlocks.length > 0 && (
                  <Box
                    key="hollow-blocks-combined"
                    w="full"
                    maxW={{
                      base: "100%",
                      sm: viewMode === 'list' ? "100%" : "280px",
                      md: viewMode === 'list' ? "100%" : "300px",
                      lg: viewMode === 'list' ? "100%" : "280px",
                      xl: viewMode === 'list' ? "100%" : "300px"
                    }}
                    mx="auto"
                    display="flex"
                    justifyContent="center"
                  >
                    <HollowBlocksProduct
                      products={hollowBlocks}
                      user={user}
                      onCartUpdate={fetchCart}
                    />
                  </Box>
                )}

                {/* Render other products normally */}
                {otherProducts.map(product => (
                  <Box
                    key={product.id}
                    w="full"
                    maxW={{
                      base: "100%",
                      sm: viewMode === 'list' ? "100%" : "280px",
                      md: viewMode === 'list' ? "100%" : "300px",
                      lg: viewMode === 'list' ? "100%" : "280px",
                      xl: viewMode === 'list' ? "100%" : "300px"
                    }}
                    mx="auto"
                    display="flex"
                    justifyContent="center"
                  >
                    <Product
                      product={product}
                      user={user}
                      onCartUpdate={fetchCart}
                    />
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </Flex>
      </Container>

      {/* Why Choose Us Section */}
      <Box bg="gray.100" py={{ base: 12, md: 16 }} mt={8}>
        <Container maxW="container.xl">
          <VStack gap={8}>
            <VStack gap={3} textAlign="center">
              <Heading size={{ base: "lg", md: "xl" }} color="gray.800">
                Why Customers Choose Us
              </Heading>
              <Text color="gray.600" fontSize={{ base: "sm", md: "md" }} maxW="600px">
                Join thousands of satisfied customers who trust us for their construction material needs
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} w="full">
              <Box
                bg="white"
                p={{ base: 6, md: 8 }}
                borderRadius="xl"
                boxShadow="md"
                textAlign="center"
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
              >
                <Center mb={4}>
                  <Box
                    bg="green.100"
                    p={4}
                    borderRadius="full"
                    color="green.600"
                    fontSize="32px"
                  >
                    <FiShield />
                  </Box>
                </Center>
                <Heading size="md" mb={3} color="gray.800">
                  Guaranteed Quality
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  All products are carefully inspected and certified to meet the highest industry standards
                </Text>
              </Box>

              <Box
                bg="white"
                p={{ base: 6, md: 8 }}
                borderRadius="xl"
                boxShadow="md"
                textAlign="center"
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
              >
                <Center mb={4}>
                  <Box
                    bg="blue.100"
                    p={4}
                    borderRadius="full"
                    color="blue.600"
                    fontSize="32px"
                  >
                    <FiTruck />
                  </Box>
                </Center>
                <Heading size="md" mb={3} color="gray.800">
                  On-Time Delivery
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Fast and reliable delivery service ensuring your materials arrive exactly when you need them
                </Text>
              </Box>

              <Box
                bg="white"
                p={{ base: 6, md: 8 }}
                borderRadius="xl"
                boxShadow="md"
                textAlign="center"
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
              >
                <Center mb={4}>
                  <Box
                    bg="orange.100"
                    p={4}
                    borderRadius="full"
                    color="orange.600"
                    fontSize="32px"
                  >
                    <FiAward />
                  </Box>
                </Center>
                <Heading size="md" mb={3} color="gray.800">
                  Best Value
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  Competitive pricing with bulk discounts and loyalty rewards for regular customers
                </Text>
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Call to Action Section */}
      <Container maxW="container.xl" py={{ base: 12, md: 16 }} px={{ base: 4, md: 6 }}>
        <Box
          bg="blue.600"
          bgGradient="linear(to-br, blue.600, blue.700)"
          borderRadius="2xl"
          p={{ base: 8, md: 12 }}
          textAlign="center"
          position="relative"
          overflow="hidden"
          boxShadow="2xl"
        >
          <Box
            position="absolute"
            top="-50px"
            left="-50px"
            fontSize="200px"
            opacity={0.1}
            transform="rotate(-15deg)"
          >
            <FiShoppingCart />
          </Box>
          <Box
            position="absolute"
            bottom="-50px"
            right="-50px"
            fontSize="200px"
            opacity={0.1}
            transform="rotate(15deg)"
          >
            <FiShoppingCart />
          </Box>

          <VStack gap={6} position="relative" zIndex={1}>
            <Badge
              colorScheme="yellow"
              fontSize={{ base: "xs", md: "sm" }}
              px={4}
              py={2}
              borderRadius="full"
              fontWeight="700"
            >
              START SAVING TODAY
            </Badge>
            <Heading
              size={{ base: "xl", md: "2xl" }}
              color="white"
              maxW="800px"
            >
              Ready to Start Your Next Project?
            </Heading>
            <Text
              color="white"
              fontSize={{ base: "md", md: "lg" }}
              maxW="600px"
              opacity={0.95}
            >
              Browse our complete catalog of construction materials and get the best prices with fast delivery
            </Text>
            <HStack gap={4} flexWrap="wrap" justify="center" pt={4}>
              <Button
                size="lg"
                colorScheme="yellow"
                color="gray.800"
                fontWeight="700"
                px={10}
                h="56px"
                borderRadius="full"
                fontSize="lg"
                boxShadow="xl"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: '2xl'
                }}
                transition="all 0.2s"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Browse Products
              </Button>
              <Button
                size="lg"
                variant="outline"
                color="white"
                borderColor="white"
                borderWidth="2px"
                fontWeight="700"
                px={10}
                h="56px"
                borderRadius="full"
                fontSize="lg"
                _hover={{
                  bg: 'whiteAlpha.200',
                  transform: 'translateY(-2px)'
                }}
                transition="all 0.2s"
              >
                Contact Us
              </Button>
            </HStack>

            {/* Trust Badges */}
            <HStack
              gap={{ base: 4, md: 8 }}
              pt={8}
              flexWrap="wrap"
              justify="center"
              color="white"
              opacity={0.9}
            >
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="800">5,000+</Text>
                <Text fontSize="sm">Happy Customers</Text>
              </VStack>
              <Box w="1px" h="40px" bg="whiteAlpha.400" display={{ base: 'none', md: 'block' }} />
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="800">10,000+</Text>
                <Text fontSize="sm">Orders Delivered</Text>
              </VStack>
              <Box w="1px" h="40px" bg="whiteAlpha.400" display={{ base: 'none', md: 'block' }} />
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="800">99%</Text>
                <Text fontSize="sm">Satisfaction Rate</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;