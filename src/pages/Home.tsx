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
  Grid,
  Image,
} from '@chakra-ui/react';
import { FiSearch, FiGrid, FiList, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import slide1 from '../images/1.png';
import slide2 from '../images/2.png';
import slide3 from '../images/3.png';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/auth.js';
import authService from '../services/authService.js';
import { ROUTES } from '../constants/routes.js';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import Sidebar from '../components/Sidebar.js';
import Product from '../components/Product.js';
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
  const navigate = useNavigate();

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
    console.log('🏠 [Home] Initial useEffect called');
    const currentUser = authService.getCurrentUser();
    console.log('🏠 [Home] Current user from authService:', currentUser ? currentUser.name : 'No user');
    setUser(currentUser);
    
    // Load cart from API if user is logged in
    if (currentUser) {
      console.log('🏠 [Home] User found, calling fetchCart with user parameter');
      fetchCart(currentUser);
    } else {
      console.log('🏠 [Home] No user found, skipping fetchCart');
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Try to get products from cache first
        const cachedProducts = cacheService.getCachedProducts();
        
        if (cachedProducts && cachedProducts.length > 0) {
          console.log('Loading products from cache');
          setProducts(cachedProducts);
          
          // Extract unique categories from cached products
          const uniqueCategories = ['All', ...new Set(cachedProducts.map(p => p.category).filter((cat): cat is string => Boolean(cat)))];
          setCategories(uniqueCategories);
          setLoading(false);
          return;
        }
        
        // If no cache, fetch from API
        console.log('Fetching products from API');
        const fetchedProducts = await productService.getProducts({ is_active: true });
        setProducts(fetchedProducts);
        
        // Cache the fetched products (cache for 5 minutes)
        cacheService.cacheProducts(fetchedProducts);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(fetchedProducts.map(p => p.category).filter((cat): cat is string => Boolean(cat)))];
        setCategories(uniqueCategories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
        
        // Try to load from cache even if API fails
        const cachedProducts = cacheService.getCachedProducts();
        if (cachedProducts) {
          console.log('API failed, loading products from cache as fallback');
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
    console.log('🏠 [Home] fetchCart called');
    console.log('🏠 [Home] User (parameter):', userToCheck ? userToCheck.name : 'No user param');
    console.log('🏠 [Home] User (state):', user ? user.name : 'No user state');
    console.log('🏠 [Home] User (final check):', userForCheck ? userForCheck.name : 'No user');
    
    if (!userForCheck) {
      console.log('🏠 [Home] No user, skipping cart fetch');
      return;
    }
    
    try {
      console.log('🏠 [Home] Calling apiCartService.getCart()');
      const cartData = await apiCartService.getCart();
      console.log('🏠 [Home] Cart data received:', cartData);
      console.log('🏠 [Home] Number of cart items:', cartData.length);
      
      setCartItems(cartData);
      console.log('🏠 [Home] Cart items state updated');
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

  const getTotalItems = () => {
    const total = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    console.log('🏠 [Home] getTotalItems:', total, 'from', cartItems.length, 'cart items');
    return total;
  };

  const getTotalPrice = () => {
    const total = cartItems.reduce((total, item) => total + (item.product_price * item.quantity), 0);
    console.log('🏠 [Home] getTotalPrice:', total);
    return total;
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

  return (
    <Box className="home-container" bg="gray.50" minH="100vh" color="gray.900">
      <Header 
        user={user} 
        cartItems={getTotalItems()} 
        cartItemsData={cartItems}
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        onRemoveFromCart={handleRemoveFromCart}
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

            {/* No overlay text - images only */}

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


      {/* Main Content */}
      <Container maxW="container.xl" py={8}>
        <Flex gap={8} align="flex-start" bg="transparent">
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
            <Box bg="white" borderRadius="xl" shadow="sm" border="1px solid" borderColor="gray.200" p={6}>
              <Flex gap={4} align="center" justify="space-between" wrap="wrap">
                <Box position="relative" maxW="400px" flex={1}>
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
                    borderRadius="lg"
                    bg="gray.50"
                    border="none"
                    pl="40px"
                    color="gray.900"
                    _placeholder={{ color: "gray.500" }}
                    _focus={{ bg: "white", shadow: "sm" }}
                  />
                </Box>
                
                <HStack gap={2}>
                  <IconButton
                    aria-label="Grid view"
                    variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                    colorScheme="blue"
                    onClick={() => setViewMode('grid')}
                    borderRadius="lg"
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
                    borderRadius="lg"
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
            <Flex justify="space-between" align="center">
              <VStack align="start" gap={1}>
                <Heading size="lg" color="gray.800">
                  {selectedCategory === 'All' ? 'All Products' : selectedCategory}
                </Heading>
                <Text color="gray.600" fontSize="sm">
                  {filteredProducts.length} products found
                </Text>
              </VStack>
              
              {searchQuery && (
                <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">
                  Searching: "{searchQuery}"
                </Badge>
              )}
            </Flex>

            {/* Products Grid */}
            {loading ? (
              <Box bg="white" borderRadius="xl" shadow="sm" textAlign="center" py={12} px={6}>
                <VStack gap={4}>
                  <Box fontSize="4xl">🔄</Box>
                  <Text color="gray.600">Loading amazing products...</Text>
                </VStack>
              </Box>
            ) : error ? (
              <Box bg="white" borderRadius="xl" shadow="sm" border="1px solid" borderColor="red.200" textAlign="center" py={12} px={6}>
                <VStack gap={4}>
                  <Box fontSize="4xl">⚠️</Box>
                  <Text color="red.500" fontWeight="600">Error: {error}</Text>
                  <Button onClick={() => window.location.reload()} colorScheme="red" variant="outline">
                    Try Again
                  </Button>
                </VStack>
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Box bg="white" borderRadius="xl" shadow="sm" textAlign="center" py={12} px={6}>
                <VStack gap={4}>
                  <Box fontSize="4xl">🔍</Box>
                  <Text color="gray.600" fontSize="lg">No products found</Text>
                  <Text color="gray.500" fontSize="sm">
                    Try adjusting your search or category filter
                  </Text>
                  {searchQuery && (
                    <Button onClick={() => setSearchQuery('')} variant="outline" size="sm">
                      Clear Search
                    </Button>
                  )}
                </VStack>
              </Box>
            ) : (
              <SimpleGrid 
                columns={{ base: 1, md: viewMode === 'grid' ? 2 : 1, lg: viewMode === 'grid' ? 3 : 1 }} 
                gap={6}
                justifyItems="center"
                w="full"
              >
                {filteredProducts.map(product => (
                  <Box
                    key={product.id}
                    w="full"
                    maxW={{ base: viewMode === 'list' ? "400px" : "none", md: "none" }}
                    mx="auto"
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


      <Footer />
    </Box>
  );
};

export default Home;