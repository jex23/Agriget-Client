import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Spinner,
  createToaster,
  Container,
  Flex,
  Image,
  Input
} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '@chakra-ui/react/select';
import { createListCollection } from '@chakra-ui/react';
import { Alert } from '@chakra-ui/react/alert';
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';
import type { CartItem } from '../types/cart';
import cartService from '../services/cartService';
import { API_ENDPOINTS } from '../constants/api';
import './AdminCart.css';
import '../pages/Admin.css';

const AdminCart: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ isExpanded: false, isMobile: window.innerWidth <= 1024 });
  const [userFilter, setUserFilter] = useState<string>('');
  const [filterType, setFilterType] = useState<'name' | 'username' | 'email'>('name');
  
  const toaster = createToaster({
    placement: 'top'
  });

  const handleSidebarStateChange = (state: { isExpanded: boolean; isMobile: boolean }) => {
    setSidebarState(state);
  };

  // Calculate content class based on sidebar state
  const getContentClass = () => {
    let className = 'admin-main-content';
    if (!sidebarState.isMobile) {
      if (sidebarState.isExpanded) {
        className += ' sidebar-expanded';
      }
    }
    return className;
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    console.log('🛒 Fetching all cart items...');
    
    try {
      setLoading(true);
      const data = await cartService.getAllCarts();
      console.log('📥 Cart items fetched:', data);
      console.log('🛒 Number of cart items:', data.length);
      
      setCartItems(data);
      setFilteredItems(data);
      setError(null);
      console.log('✅ Cart items fetched successfully');
      
    } catch (err: any) {
      console.log('❌ Error in fetchCartItems:', err);
      setError(err.message);
      toaster.create({
        title: 'Error',
        description: 'Failed to fetch cart items',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = (items: CartItem[], filter: string, type: 'name' | 'username' | 'email') => {
    if (!filter.trim()) return items;
    
    return items.filter(item => {
      switch (type) {
        case 'name':
          const fullName = `${item.user_first_name} ${item.user_last_name}`.toLowerCase();
          return fullName.includes(filter.toLowerCase());
        case 'username':
          return item.user_username.toLowerCase().includes(filter.toLowerCase());
        case 'email':
          return item.user_email.toLowerCase().includes(filter.toLowerCase());
        default:
          return true;
      }
    });
  };

  const handleFilterChange = (filter: string) => {
    setUserFilter(filter);
    const filtered = filterItems(cartItems, filter, filterType);
    setFilteredItems(filtered);
  };

  const handleFilterTypeChange = (type: 'name' | 'username' | 'email') => {
    setFilterType(type);
    const filtered = filterItems(cartItems, userFilter, type);
    setFilteredItems(filtered);
  };

  const clearFilter = () => {
    setUserFilter('');
    setFilteredItems(cartItems);
  };

  const getTotalValue = () => {
    return filteredItems.reduce((total, item) => {
      return total + (item.product_price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return filteredItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getUniqueUsers = () => {
    const userIds = [...new Set(filteredItems.map(item => item.user_id))];
    return userIds.length;
  };

  return (
    <Box className="admin-container">
      <AdminSidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onSidebarStateChange={handleSidebarStateChange}
      />
      
      <AdminHeader 
        user={{ 
          id: 1, 
          username: 'admin', 
          email: 'admin@agrivet.com', 
          first_name: 'Admin', 
          last_name: 'User', 
          role: 'admin' 
        } as any} 
        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        sidebarState={sidebarState}
      />
      
      <Box className={getContentClass()}>
          <Container maxW="container.xl" py={8}>
            <VStack gap={8} align="stretch">
              {/* Welcome Section */}
              <Box>
                <Heading className="admin-title" size="xl" mb={2}>
                  Cart Management
                </Heading>
                <Text className="admin-subtitle">
                  View and manage all user cart items across the platform.
                </Text>
              </Box>

              {/* Cart Statistics */}
              <HStack gap={4} wrap="wrap">
                <Box className="admin-stat-card" flex="1" minW="200px">
                  <Text className="admin-stat-label" fontSize="sm">Total Items</Text>
                  <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="#3182ce">
                    {getTotalItems()}
                  </Text>
                </Box>
                <Box className="admin-stat-card" flex="1" minW="200px">
                  <Text className="admin-stat-label" fontSize="sm">Total Value</Text>
                  <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="#38a169">
                    ₱{getTotalValue().toFixed(2)}
                  </Text>
                </Box>
                <Box className="admin-stat-card" flex="1" minW="200px">
                  <Text className="admin-stat-label" fontSize="sm">Users with Items</Text>
                  <Text className="admin-stat-number" fontSize="2xl" fontWeight="bold" color="#ed8936">
                    {getUniqueUsers()}
                  </Text>
                </Box>
              </HStack>

              {error && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Title>Error</Alert.Title>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Root>
              )}

              {/* User Filter Section */}
              <Box className="admin-section">
                <Heading className="admin-section-title" size="md" mb={4}>
                  Filter by User
                </Heading>
                <HStack gap={4} wrap="wrap" mb={4}>
                  <SelectRoot 
                    collection={createListCollection({ 
                      items: [
                        { label: 'Full Name', value: 'name' },
                        { label: 'Username', value: 'username' },
                        { label: 'Email', value: 'email' }
                      ] 
                    })}
                    value={[filterType]} 
                    onValueChange={(details) => handleFilterTypeChange(details.value?.[0] as 'name' | 'username' | 'email' || 'name')}
                    width="150px"
                    size="sm"
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem item="name">Full Name</SelectItem>
                      <SelectItem item="username">Username</SelectItem>
                      <SelectItem item="email">Email</SelectItem>
                    </SelectContent>
                  </SelectRoot>
                  <Input
                    placeholder={`Search by ${filterType === 'name' ? 'full name' : filterType}...`}
                    value={userFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    width="300px"
                    size="sm"
                  />
                  {userFilter && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={clearFilter}
                    >
                      Clear Filter
                    </Button>
                  )}
                  <Text fontSize="sm" color="#718096">
                    {filteredItems.length} of {cartItems.length} items shown
                  </Text>
                </HStack>
              </Box>

              {/* Cart Items Section */}
              <Box className="admin-section">
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading className="admin-section-title" size="lg">
                    Cart Items {userFilter && `(${filteredItems.length} filtered)`}
                  </Heading>
                  <Button 
                    className="admin-action-button"
                    onClick={fetchCartItems}
                  >
                    Refresh
                  </Button>
                </Flex>
                
                <Box className="admin-table-container" overflowX="auto">
                  {loading ? (
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center" 
                      py={12}
                    >
                      <Spinner size="md" color="#3182ce" />
                      <Text mt={3} color="#718096" fontSize="sm">Loading cart items...</Text>
                    </Box>
                  ) : filteredItems.length === 0 ? (
                    <Box textAlign="center" py={12}>
                      <Text color="#718096" fontSize="lg">
                        {cartItems.length === 0 ? 'No cart items found' : 'No items match the current filter'}
                      </Text>
                      <Text color="#a0aec0" fontSize="sm" mt={2}>
                        {cartItems.length === 0 ? 'All users have empty carts' : 'Try adjusting your search criteria'}
                      </Text>
                    </Box>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>User</th>
                          <th>Contact</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total Price</th>
                          <th>Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => (
                          <tr key={`${item.user_id}-${item.product_id}`}>
                            <td>
                              <HStack gap={3}>
                                {item.product_image ? (
                                  <Image
                                    src={item.product_image.startsWith('http') ? item.product_image : API_ENDPOINTS.image(item.product_image)}
                                    alt={item.product_name}
                                    boxSize="40px"
                                    objectFit="cover"
                                    borderRadius="md"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Box
                                    boxSize="40px"
                                    bg="#f7fafc"
                                    borderRadius="md"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    <Text fontSize="xs" color="#718096">No Image</Text>
                                  </Box>
                                )}
                                <Text className="admin-table-cell-bold">{item.product_name}</Text>
                              </HStack>
                            </td>
                            <td>
                              <VStack gap={1} align="start">
                                <Text className="admin-table-cell-bold">
                                  {item.user_first_name} {item.user_last_name}
                                </Text>
                                <Badge className="admin-badge-blue" fontSize="xs">
                                  @{item.user_username}
                                </Badge>
                              </VStack>
                            </td>
                            <td>
                              <VStack gap={1} align="start">
                                <Text fontSize="sm">{item.user_email}</Text>
                                {item.user_phone && (
                                  <Text fontSize="xs" color="#718096">{item.user_phone}</Text>
                                )}
                              </VStack>
                            </td>
                            <td>{item.quantity}</td>
                            <td>₱{item.product_price.toFixed(2)}</td>
                            <td className="admin-table-cell-bold">
                              ₱{(item.product_price * item.quantity).toFixed(2)}
                            </td>
                            <td>{new Date(item.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Box>
              </Box>
            </VStack>
          </Container>
      </Box>
    </Box>
  );
};

export default AdminCart;