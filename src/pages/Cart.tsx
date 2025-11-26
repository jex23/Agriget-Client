import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  IconButton,
  SimpleGrid,
  Input,
  createToaster
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
import type { User } from '../types/auth.js';
import type { CartItem } from '../types/cart';
import type { CreateOrderRequest, PaymentTerms, OrderPriority, ShipmentType } from '../types/order';
import { API_ENDPOINTS } from '../constants/api';
import authService from '../services/authService.js';
import { apiCartService } from '../services/apiCartService';
import { orderService } from '../services/orderService';
import { cacheService } from '../services/cacheService';
import { ROUTES } from '../constants/routes.js';
import Header from '../components/Header.js';
import PhilippineAddressForm from '../components/PhilippineAddressForm';
import './Cart.css';

const Cart: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [localQuantities, setLocalQuantities] = useState<{ [key: number]: number }>({});
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: boolean }>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('cash_on_delivery');
  const [priority, setPriority] = useState<OrderPriority>('medium');
  const [shipmentType, setShipmentType] = useState<ShipmentType>('delivery');
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();
  
  const toaster = createToaster({
    placement: 'top'
  });

  const paymentOptions = [
    { label: 'Cash on Delivery', value: 'cash_on_delivery' },
    { label: 'Pay Upon Pick Up', value: 'over_the_counter' }
  ];

  const priorityOptions = [
    { label: 'High Priority', value: 'high' },
    { label: 'Medium Priority', value: 'medium' },
    { label: 'Low Priority', value: 'low' }
  ];

  const shipmentOptions = [
    { label: 'Delivery', value: 'delivery' },
    { label: 'Pickup', value: 'pickup' }
  ];

  // Auto-sync timer ref
  const autoSyncTimeoutRef = useRef<number | null>(null);

  // Function to get user profile with address
  const fetchUserProfile = async () => {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch(API_ENDPOINTS.user, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch user profile');
      
      const profileData = await response.json();
      setUserProfile(profileData);
      
      // Set default shipping address from user profile
      if (profileData.address) {
        setShippingAddress(profileData.address);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
      return;
    }
    setUser(currentUser);

    // Load cart from API and user profile
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🛒 [Cart] Fetching cart from API');
        
        // Fetch cart and user profile in parallel
        const [cartData] = await Promise.all([
          apiCartService.getCart(),
          fetchUserProfile()
        ]);
        
        console.log('🛒 [Cart] Cart data received:', cartData);

        // Log each item's details for debugging
        cartData.forEach((item, index) => {
          console.log(`📦 [Cart Item ${index + 1}]`, {
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_category: item.product_category,
            product_price: item.product_price,
            quantity: item.quantity,
            product_unit: item.product_unit,
            product_minimum_order: item.product_minimum_order,
            full_item: item
          });
        });

        setCartItems(cartData);

        // Initialize local quantities with current cart quantities
        const quantities: { [key: number]: number } = {};
        const selections: { [key: number]: boolean } = {};
        cartData.forEach(item => {
          quantities[item.product_id] = item.quantity;
          selections[item.product_id] = true; // Select all items by default
        });
        setLocalQuantities(quantities);
        setSelectedItems(selections);
        console.log('🛒 [Cart] Local quantities initialized:', quantities);
        console.log('🛒 [Cart] Item selections initialized:', selections);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cart');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Local quantity management (no API calls)
  const updateLocalQuantity = (productId: number, newQuantity: number) => {
    console.log('🛒 [Cart] Updating local quantity for product', productId, 'to', newQuantity);
    
    if (newQuantity <= 0) {
      console.log('🛒 [Cart] Quantity is 0 or less, removing from local state');
      setLocalQuantities(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      setSelectedItems(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      setCartItems(prev => prev.filter(item => item.product_id !== productId));
    } else {
      setLocalQuantities(prev => ({
        ...prev,
        [productId]: newQuantity
      }));
      
      // Update display quantity in cart items
      setCartItems(prev => 
        prev.map(item => 
          item.product_id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
    
    // Mark as having unsynced changes (but don't schedule auto-sync here)
    setHasUnsyncedChanges(true);
  };

  // API call to sync with server (called on blur or specific actions)
  const syncQuantityWithAPI = async (productId: number) => {
    const localQuantity = localQuantities[productId];
    console.log('🛒 [Cart] Syncing quantity for product', productId, 'with API. Local quantity:', localQuantity);
    
    if (!localQuantity || localQuantity <= 0) {
      // Remove from cart
      try {
        await apiCartService.removeFromCart(productId);
        console.log('🛒 [Cart] Successfully removed item from cart via API');
      } catch (err) {
        console.error('🛒 [Cart] Failed to remove item from cart:', err);
        setError(err instanceof Error ? err.message : 'Failed to remove item');
      }
    } else {
      // Update quantity
      try {
        await apiCartService.updateCartItem(productId, { quantity: localQuantity });
        console.log('🛒 [Cart] Successfully updated quantity via API');
      } catch (err) {
        console.error('🛒 [Cart] Failed to update quantity:', err);
        setError(err instanceof Error ? err.message : 'Failed to update quantity');
        // Revert local quantity on API failure
        const originalItem = cartItems.find(item => item.product_id === productId);
        if (originalItem) {
          updateLocalQuantity(productId, originalItem.quantity);
        }
      }
    }
  };

  const removeFromCart = async (productId: number) => {
    console.log('🛒 [Cart] Removing item', productId, 'from cart');
    updateLocalQuantity(productId, 0);
    await syncQuantityWithAPI(productId);
  };

  const handleRemoveFromCart = async (productId: number) => {
    await removeFromCart(productId);
  };

  const handleItemSelection = (productId: number, isSelected: boolean) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: isSelected
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.keys(selectedItems).every(id => selectedItems[parseInt(id)]);
    const newSelections: { [key: number]: boolean } = {};
    cartItems.forEach(item => {
      newSelections[item.product_id] = !allSelected;
    });
    setSelectedItems(newSelections);
  };

  const getSelectedItems = () => {
    return cartItems.filter(item => selectedItems[item.product_id]);
  };

  const getTotalItems = () => {
    const total = Object.values(localQuantities).reduce((sum, quantity) => sum + quantity, 0);
    console.log('🛒 [Cart] Total items (local):', total);
    return total;
  };

  const getSelectedTotalItems = () => {
    return getSelectedItems().reduce((sum, item) => {
      return sum + (localQuantities[item.product_id] || item.quantity);
    }, 0);
  };

  const getTotalPrice = () => {
    const total = cartItems.reduce((total, item) => {
      const localQuantity = localQuantities[item.product_id] || 0;
      return total + (getItemPrice(item) * localQuantity);
    }, 0);
    console.log('🛒 [Cart] Total price (local):', total);
    return total;
  };

  const getSelectedTotalPrice = () => {
    return getSelectedItems().reduce((total, item) => {
      const localQuantity = localQuantities[item.product_id] || item.quantity;
      return total + (getItemPrice(item) * localQuantity);
    }, 0);
  };

  // Helper function to detect CHB hollow blocks and return size
  const getCHBHollowBlockSize = (item: CartItem): '4x4' | '5x5' | null => {
    const productName = item.product_name;
    const category = item.product_category;
    const nameLower = productName.toLowerCase();
    const categoryLower = category?.toLowerCase() || '';

    console.log('🔍 [CHB Detection] Checking product:', {
      name: productName,
      category: category,
      nameLower,
      categoryLower
    });

    // Check if category is "Hollow Blocks" or name contains hollow block indicators
    const isHollowBlock = categoryLower.includes('hollow') ||
                         nameLower.includes('chb') ||
                         nameLower.includes('hollow block') ||
                         nameLower.includes('hollowblock') ||
                         nameLower.includes('hollow');

    console.log('🔍 [CHB Detection] Is hollow block?', isHollowBlock);

    if (isHollowBlock) {
      // Check for 4x4 or 4" or 4 inch
      if (nameLower.includes('4x4') || nameLower.includes('4"') || nameLower.includes('4 inch') || nameLower.includes('4"') || nameLower.includes(' 4')) {
        console.log('✅ [CHB Detection] Detected as 4x4 hollow block');
        return '4x4';
      }
      // Check for 5x5 or 5" or 5 inch
      if (nameLower.includes('5x5') || nameLower.includes('5"') || nameLower.includes('5 inch') || nameLower.includes('5"') || nameLower.includes(' 5')) {
        console.log('✅ [CHB Detection] Detected as 5x5 hollow block');
        return '5x5';
      }
      // Default to 4x4 if no size specified but is hollow block
      console.log('⚠️ [CHB Detection] Hollow block detected but no size, defaulting to 4x4');
      return '4x4';
    }

    console.log('❌ [CHB Detection] Not a hollow block');
    return null;
  };

  // Get minimum order for CHB hollow blocks (50) or use product's minimum order
  const getMinimumOrder = (item: CartItem): number => {
    const chbSize = getCHBHollowBlockSize(item);
    if (chbSize) {
      return 50; // CHB hollow blocks have minimum order of 50
    }
    return item.product_minimum_order || 1;
  };

  // Get pickup price for CHB hollow blocks (no minimum order required)
  const getCHBPickupPrice = (item: CartItem): number | null => {
    console.log('💰 [Pickup Price] Checking for:', item.product_name, '| Shipment Type:', shipmentType);

    if (shipmentType !== 'pickup') {
      console.log('💰 [Pickup Price] Not pickup, returning null');
      return null; // No special pickup price if not pickup
    }

    const chbSize = getCHBHollowBlockSize(item);
    console.log('💰 [Pickup Price] CHB Size detected:', chbSize);

    if (chbSize === '4x4') {
      console.log('💰 [Pickup Price] Returning ₱14 for 4x4');
      return 14; // New price for 4x4 when pickup (any quantity)
    } else if (chbSize === '5x5') {
      console.log('💰 [Pickup Price] Returning ₱19 for 5x5');
      return 19; // New price for 5x5 when pickup (any quantity)
    }

    console.log('💰 [Pickup Price] No CHB size matched, returning null');
    return null;
  };

  // Get pickup discount amount for display
  const getCHBPickupDiscount = (item: CartItem): number => {
    const pickupPrice = getCHBPickupPrice(item);
    if (pickupPrice !== null) {
      const discount = item.product_price - pickupPrice;
      console.log('🏷️ [Discount] Product:', item.product_name, '| Original:', item.product_price, '| Pickup:', pickupPrice, '| Discount:', discount);
      return discount; // Show the discount amount
    }
    return 0;
  };

  // Get item price after applying pickup pricing
  const getItemPrice = (item: CartItem): number => {
    const pickupPrice = getCHBPickupPrice(item);
    if (pickupPrice !== null) {
      console.log('💵 [Item Price] Using pickup price:', pickupPrice, 'for', item.product_name);
      return pickupPrice; // Return the pickup price for CHB blocks
    }
    console.log('💵 [Item Price] Using original price:', item.product_price, 'for', item.product_name);
    return item.product_price; // Return original price for other items
  };

  // Calculate shipping fee for an item based on minimum order
  const getShippingFee = (item: CartItem, quantity: number): number => {
    // Pickup has no shipping fee
    if (shipmentType === 'pickup') {
      return 0;
    }

    const minimumOrder = getMinimumOrder(item); // Use CHB-aware minimum order
    // If quantity is less than or equal to minimum order, charge shipping fee
    return quantity <= minimumOrder ? 60 : 0;
  };

  // Calculate total shipping fees for selected items
  const getTotalShippingFee = () => {
    return getSelectedItems().reduce((total, item) => {
      const localQuantity = localQuantities[item.product_id] || item.quantity;
      return total + getShippingFee(item, localQuantity);
    }, 0);
  };

  // Calculate grand total (items + shipping)
  const getGrandTotal = () => {
    return getSelectedTotalPrice() + getTotalShippingFee();
  };

  // Auto-sync after 3 seconds of inactivity
  const scheduleAutoSync = () => {
    console.log('🛒 [Cart] Scheduling auto-sync in 3 seconds');
    
    // Clear existing timeout
    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }
    
    // Set new timeout
    autoSyncTimeoutRef.current = setTimeout(() => {
      console.log('🛒 [Cart] Auto-sync triggered after 3 seconds of inactivity');
      syncAllChangesWithAPI();
      setHasUnsyncedChanges(false);
    }, 3000); // 3 seconds
  };

  const syncAllChangesWithAPI = async () => {
    if (!hasUnsyncedChanges) {
      console.log('🛒 [Cart] No unsynced changes, skipping sync');
      return;
    }
    
    console.log('🛒 [Cart] Syncing all changes with API');
    const promises = Object.entries(localQuantities).map(([productId]) => 
      syncQuantityWithAPI(parseInt(productId))
    );
    
    try {
      await Promise.all(promises);
      console.log('🛒 [Cart] All changes synced successfully');
      setHasUnsyncedChanges(false);
    } catch (error) {
      console.error('🛒 [Cart] Failed to sync some changes:', error);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, []);

  const clearCart = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to remove all ${cartItems.length} item(s) from your cart? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiCartService.clearCart();
      setCartItems([]);
      setLocalQuantities({});
      setSelectedItems({});

      toaster.create({
        title: 'Cart Cleared',
        description: 'All items have been removed from your cart',
        type: 'success',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(errorMessage);
      toaster.create({
        title: 'Error',
        description: errorMessage,
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleCheckout = () => {
    const selectedItems = getSelectedItems();
    if (selectedItems.length === 0) {
      toaster.create({
        title: 'No Items Selected',
        description: 'Please select at least one item to checkout',
        type: 'warning',
        duration: 3000,
      });
      return;
    }
    // Sync all changes before proceeding to checkout
    syncAllChangesWithAPI();
    setIsCheckoutModalOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      toaster.create({
        title: 'Validation Error',
        description: 'Shipping address is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsPlacingOrder(true);

      // Create orders for each selected cart item
      const selectedCartItems = getSelectedItems();

      // Log items being ordered for stock tracking
      console.log('📋 [Cart] Creating orders for items:');
      selectedCartItems.forEach(item => {
        const localQuantity = localQuantities[item.product_id] || item.quantity;
        console.log(`  - Product ID: ${item.product_id}, Name: ${item.product_name}, Quantity: ${localQuantity}`);
      });

      const orderPromises = selectedCartItems.map(async (item) => {
        const localQuantity = localQuantities[item.product_id] || item.quantity;
        const shippingFee = getShippingFee(item, localQuantity);
        const orderData: CreateOrderRequest = {
          product_id: item.product_id,
          quantity: localQuantity,
          payment_terms: paymentTerms,
          shipping_address: shippingAddress.trim(),
          shipping_fee: shippingFee,
          free_shipping: shippingFee === 0,
          priority: priority,
          shipment_type: shipmentType
        };

        return orderService.createOrder(orderData);
      });

      const orderResults = await Promise.all(orderPromises);

      console.log('✅ [Cart] Orders created successfully:', orderResults.length);
      console.log('📦 [Cart] Order details:', orderResults);

      // Clear products cache so Home page will show updated stock quantities
      console.log('🔄 [Cart] Clearing products cache to refresh stock quantities');
      console.log('💡 [Cart] When you navigate to Home, products will be refetched with updated stock');
      cacheService.clearProductsCache();

      // Remove only the selected items from cart after successful order creation
      const selectedProductIds = selectedCartItems.map(item => item.product_id);

      for (const productId of selectedProductIds) {
        await apiCartService.removeFromCart(productId);
      }

      // Update local state to remove selected items
      setCartItems(prev => prev.filter(item => !selectedProductIds.includes(item.product_id)));
      setLocalQuantities(prev => {
        const updated = { ...prev };
        selectedProductIds.forEach(id => delete updated[id]);
        return updated;
      });
      setSelectedItems(prev => {
        const updated = { ...prev };
        selectedProductIds.forEach(id => delete updated[id]);
        return updated;
      });
      setIsCheckoutModalOpen(false);

      toaster.create({
        title: 'Order Placed Successfully!',
        description: `${selectedCartItems.length} order(s) have been placed. Stock quantities have been updated. You will be contacted for delivery details.`,
        type: 'success',
        duration: 5000,
      });
      
    } catch (err) {
      console.error('Failed to place order:', err);
      toaster.create({
        title: 'Order Failed',
        description: err instanceof Error ? err.message : 'Failed to place order',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Box className="cart-container">
        <Header
          user={user}
          cartItems={0}
          cartItemsData={[]}
          onSidebarToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
          onRemoveFromCart={handleRemoveFromCart}
          onRemoveAllFromCart={clearCart}
        />
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center" py={12}>
            <Text>Loading cart...</Text>
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="cart-container">
        <Header
          user={user}
          cartItems={0}
          cartItemsData={[]}
          onSidebarToggle={handleSidebarToggle}
          isSidebarOpen={isSidebarOpen}
          onRemoveFromCart={handleRemoveFromCart}
          onRemoveAllFromCart={clearCart}
        />
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center" py={12}>
            <Text color="red.500">Error: {error}</Text>
            <Button mt={4} onClick={() => window.location.reload()}>
              Retry
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box className="cart-container">
      <Header
        user={user}
        cartItems={getTotalItems()}
        cartItemsData={cartItems}
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
        onRemoveFromCart={handleRemoveFromCart}
        onRemoveAllFromCart={clearCart}
      />
      
      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          <Box>
            <Heading className="cart-title" size="xl" mb={2}>
              Shopping Cart
            </Heading>
            <Text className="cart-subtitle">
              {cartItems.length === 0 ? 'Your cart is empty' : `${getTotalItems()} items in your cart`}
            </Text>
          </Box>

          {cartItems.length === 0 ? (
            <Box className="cart-empty-state" textAlign="center" py={12}>
              <Text className="cart-empty-icon" fontSize="6xl" mb={4}>🛒</Text>
              <Heading className="cart-empty-title" size="lg" mb={4}>
                Your cart is empty
              </Heading>
              <Text className="cart-empty-text" mb={6}>
                Looks like you haven't added any items to your cart yet.
              </Text>
              <Button 
                className="cart-continue-shopping-button"
                onClick={() => navigate(ROUTES.HOME)}
              >
                Continue Shopping
              </Button>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
              {/* Cart Items */}
              <Box gridColumn={{ base: 1, lg: "1 / 3" }}>
                <VStack gap={4}>
                  {/* Select All Checkbox */}
                  <Box w="full" p={4} bg="gray.50" borderRadius="lg">
                    <Flex align="center" justify="space-between">
                      <HStack gap={2}>
                        <Box position="relative">
                          <input
                            type="checkbox"
                            checked={cartItems.length > 0 && cartItems.every(item => selectedItems[item.product_id])}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = cartItems.some(item => selectedItems[item.product_id]) && !cartItems.every(item => selectedItems[item.product_id]);
                              }
                            }}
                            onChange={handleSelectAll}
                            className="cart-select-all-checkbox"
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer'
                            }}
                          />
                        </Box>
                        <Text fontWeight="medium" fontSize="sm">
                          Select All Items ({cartItems.length})
                        </Text>
                      </HStack>
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={clearCart}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#e53e3e'
                        }}
                        _hover={{
                          backgroundColor: '#fed7d7'
                        }}
                      >
                        🗑️ Clear All
                      </Button>
                    </Flex>
                  </Box>
                  {cartItems.map(item => (
                    <Box key={item.id} className="cart-item-card">
                      <Flex gap={4} align="center">
                        <Box position="relative">
                          <input
                            type="checkbox"
                            checked={selectedItems[item.product_id] || false}
                            onChange={(e) => handleItemSelection(item.product_id, e.target.checked)}
                            className="cart-item-checkbox"
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer'
                            }}
                          />
                        </Box>
                        <Box className="cart-item-image">
                          {item.product_image ? (
                            <img 
                              src={API_ENDPOINTS.image(item.product_image)} 
                              alt={item.product_name}
                              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                          ) : (
                            <Box 
                              width="60px" 
                              height="60px" 
                              bg="gray.100" 
                              borderRadius="8px"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              🏗️
                            </Box>
                          )}
                        </Box>
                        <VStack align="start" flex={1} gap={1}>
                          <Heading className="cart-item-name" size="md">
                            {item.product_name}
                          </Heading>
                        </VStack>
                        <VStack gap={2}>
                          <VStack gap={0} align="end">
                            <Text className="cart-item-price" fontWeight="bold">
                              ₱{getItemPrice(item).toFixed(2)}
                            </Text>
                            {getCHBPickupDiscount(item) > 0 && (
                              <Text fontSize="xs" color="green.600" fontWeight="medium">
                                Pickup discount: -₱{getCHBPickupDiscount(item)}
                              </Text>
                            )}
                          </VStack>
                          <HStack>
                            <Button
                              className="cart-quantity-button"
                              size="sm"
                              onClick={() => {
                                const currentQuantity = localQuantities[item.product_id] || item.quantity;
                                updateLocalQuantity(item.product_id, currentQuantity - 1);
                                scheduleAutoSync();
                              }}
                            >
                              -
                            </Button>
                            <Text
                              className="cart-quantity-text"
                              minW="40px"
                              textAlign="center"
                            >
                              {localQuantities[item.product_id] || item.quantity}
                            </Text>
                            <Button
                              className="cart-quantity-button"
                              size="sm"
                              onClick={() => {
                                const currentQuantity = localQuantities[item.product_id] || item.quantity;
                                updateLocalQuantity(item.product_id, currentQuantity + 1);
                                scheduleAutoSync();
                              }}
                            >
                              +
                            </Button>
                          </HStack>
                          <Text className="cart-item-total" fontWeight="bold">
                            ₱{(getItemPrice(item) * (localQuantities[item.product_id] || item.quantity)).toFixed(2)}
                          </Text>
                        </VStack>
                        <IconButton
                          className="cart-remove-button"
                          aria-label="Remove item"
                          size="sm"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          🗑️
                        </IconButton>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </Box>

              {/* Cart Summary */}
              <Box className="cart-summary-card">
                <VStack gap={4}>
                  <Heading className="cart-summary-title" size="lg">
                    Order Summary
                  </Heading>
                  <Box borderTop="1px solid #e2e8f0" width="100%" />
                  <VStack gap={2} width="100%">
                    <Flex justify="space-between" width="100%">
                      <Text className="cart-summary-label">Selected Items ({getSelectedTotalItems()})</Text>
                      <Text className="cart-summary-value">₱{getSelectedTotalPrice().toFixed(2)}</Text>
                    </Flex>
                    <Flex justify="space-between" width="100%">
                      <Text className="cart-summary-label" fontSize="xs" color="gray.500">Total Items ({getTotalItems()})</Text>
                      <Text className="cart-summary-value" fontSize="xs" color="gray.500">₱{getTotalPrice().toFixed(2)}</Text>
                    </Flex>
                    <Flex justify="space-between" width="100%">
                      <Text className="cart-summary-label">Shipping Fee</Text>
                      <Text className="cart-summary-value" color={getTotalShippingFee() > 0 ? "orange.600" : "green.600"} fontWeight="semibold">
                        {getTotalShippingFee() > 0 ? `₱${getTotalShippingFee().toFixed(2)}` : 'Free'}
                      </Text>
                    </Flex>
                    {getTotalShippingFee() > 0 && (
                      <Box bg="orange.50" p={2} borderRadius="md" width="100%">
                        <Text fontSize="xs" color="orange.700">
                          💡 Order above minimum quantity to get free shipping!
                        </Text>
                      </Box>
                    )}
                  </VStack>
                  <Box borderTop="1px solid #e2e8f0" width="100%" />

                  {/* Shipment Type Selection */}
                  <Box width="100%">
                    <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.700">
                      Shipment Type
                    </Text>
                    <SelectRoot
                      collection={createListCollection({ items: shipmentOptions })}
                      value={[shipmentType]}
                      onValueChange={(details) => setShipmentType(details.value?.[0] as ShipmentType || 'delivery')}
                      size="sm"
                    >
                      <SelectTrigger style={{
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingRight: '12px'
                      }}>
                        <SelectValueText placeholder="Select shipment type" />
                      </SelectTrigger>
                      <SelectContent style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem'
                      }}>
                        {shipmentOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            item={option.value}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#2d3748'
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
                    {shipmentType === 'pickup' && getSelectedItems().some(item => getCHBHollowBlockSize(item)) && (
                      <Box bg="green.50" p={2} borderRadius="md" mt={2}>
                        <Text fontSize="xs" color="green.700" fontWeight="medium">
                          🎉 Pickup discount applied to hollow blocks!
                        </Text>
                        {getSelectedItems().filter(item => getCHBHollowBlockSize(item)).map(item => {
                          const size = getCHBHollowBlockSize(item);
                          const discount = getCHBPickupDiscount(item);
                          return (
                            <Text key={item.product_id} fontSize="xs" color="green.700">
                              • {item.product_name}: -₱{discount}/pc (now ₱{getItemPrice(item)}/pc)
                            </Text>
                          );
                        })}
                      </Box>
                    )}
                  </Box>

                  {/* Order Priority Selection */}
                  <Box width="100%">
                    <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.700">
                      Order Priority
                    </Text>
                    <SelectRoot
                      collection={createListCollection({ items: priorityOptions })}
                      value={[priority]}
                      onValueChange={(details) => setPriority(details.value?.[0] as OrderPriority || 'medium')}
                      size="sm"
                    >
                      <SelectTrigger style={{
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingRight: '12px'
                      }}>
                        <SelectValueText placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem'
                      }}>
                        {priorityOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            item={option.value}
                            style={{
                              backgroundColor: '#ffffff',
                              color: '#2d3748'
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

                  <Box borderTop="1px solid #e2e8f0" width="100%" />
                  <Flex justify="space-between" width="100%">
                    <Text className="cart-total-label" fontWeight="bold" fontSize="lg">
                      Grand Total
                    </Text>
                    <Text className="cart-total-value" fontWeight="bold" fontSize="lg" color="blue.600">
                      ₱{getGrandTotal().toFixed(2)}
                    </Text>
                  </Flex>
                  <VStack gap={3} width="100%">
                    <Button
                      className="cart-checkout-button"
                      width="100%"
                      onClick={handleCheckout}
                      disabled={getSelectedItems().length === 0}
                    >
                      Proceed to Checkout ({getSelectedItems().length} items)
                    </Button>
                    <Button
                      className="cart-continue-button"
                      width="100%"
                      variant="outline"
                      onClick={() => navigate(ROUTES.HOME)}
                    >
                      Continue Shopping
                    </Button>
                    <Button
                      className="cart-clear-button"
                      width="100%"
                      variant="outline"
                      colorScheme="red"
                      size="sm"
                      onClick={clearCart}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#e53e3e',
                        border: '1px solid #e53e3e'
                      }}
                      _hover={{
                        backgroundColor: '#fed7d7'
                      }}
                    >
                      🗑️ Clear All Items
                    </Button>
                  </VStack>
                </VStack>
              </Box>
            </SimpleGrid>
          )}
        </VStack>
      </Container>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.6)"
          zIndex={1000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          className="cart-checkout-modal-overlay"
        >
          <Box
            bg="white"
            borderRadius="lg"
            p={6}
            maxWidth="600px"
            width="100%"
            maxHeight="90vh"
            overflow="auto"
            className="cart-checkout-modal"
            style={{
              backgroundColor: '#ffffff !important',
              color: '#2d3748 !important',
              border: '1px solid #e2e8f0'
            }}
          >
            <VStack gap={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="lg" style={{ color: '#2d3748 !important' }}>Checkout</Heading>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  style={{
                    backgroundColor: '#ffffff !important',
                    color: '#4a5568 !important',
                    border: '1px solid #e2e8f0 !important'
                  }}
                >
                  ✕
                </Button>
              </Flex>

              {/* Order Summary */}
              <Box borderBottom="1px solid #e2e8f0" pb={4}>
                <Heading size="md" mb={3} style={{ color: '#2d3748 !important' }}>Order Summary</Heading>
                <VStack gap={2} align="stretch">
                  {getSelectedItems().map(item => {
                    const localQuantity = localQuantities[item.product_id] || item.quantity;
                    const itemPrice = getItemPrice(item); // Price after pickup discount
                    const itemTotal = itemPrice * localQuantity;
                    const itemShippingFee = getShippingFee(item, localQuantity);
                    const minimumOrder = getMinimumOrder(item); // CHB-aware minimum order
                    const pickupDiscount = getCHBPickupDiscount(item);

                    return (
                      <Box key={item.id} borderBottom="1px solid #f7fafc" pb={2}>
                        <Flex justify="space-between" align="center">
                          <VStack align="start" gap={0}>
                            <Text fontWeight="medium" style={{ color: '#2d3748 !important' }}>{item.product_name}</Text>
                            <HStack gap={2}>
                              <Text fontSize="xs" style={{ color: '#718096 !important' }}>
                                Qty: {localQuantity} {item.product_unit || 'pcs'}
                              </Text>
                              {localQuantity <= minimumOrder && (
                                <Text fontSize="xs" style={{ color: '#ed8936 !important' }}>
                                  (≤ min: {minimumOrder})
                                </Text>
                              )}
                            </HStack>
                            {pickupDiscount > 0 && (
                              <Text fontSize="xs" style={{ color: '#38a169 !important' }} fontWeight="medium">
                                Pickup discount: -₱{pickupDiscount}/pc
                              </Text>
                            )}
                          </VStack>
                          <VStack align="end" gap={0}>
                            <Text fontWeight="medium" style={{ color: '#2d3748 !important' }}>
                              ₱{itemTotal.toFixed(2)}
                            </Text>
                            {itemShippingFee > 0 && (
                              <Text fontSize="xs" style={{ color: '#ed8936 !important' }}>
                                +₱{itemShippingFee} shipping
                              </Text>
                            )}
                          </VStack>
                        </Flex>
                      </Box>
                    );
                  })}
                  <Flex justify="space-between" align="center" pt={2}>
                    <Text fontSize="sm" style={{ color: '#718096 !important' }}>Subtotal</Text>
                    <Text fontSize="sm" style={{ color: '#718096 !important' }}>₱{getSelectedTotalPrice().toFixed(2)}</Text>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" style={{ color: '#718096 !important' }}>Shipping Fee</Text>
                    <Text fontSize="sm" style={{ color: getTotalShippingFee() > 0 ? '#ed8936 !important' : '#48bb78 !important' }} fontWeight="semibold">
                      {getTotalShippingFee() > 0 ? `₱${getTotalShippingFee().toFixed(2)}` : 'Free'}
                    </Text>
                  </Flex>
                  {getTotalShippingFee() > 0 && (
                    <Box bg="#fef5e7" p={2} borderRadius="md">
                      <Text fontSize="xs" style={{ color: '#c05621 !important' }}>
                        💡 Tip: Order above minimum quantity to get free shipping!
                      </Text>
                    </Box>
                  )}
                  <Flex justify="space-between" align="center" pt={2} borderTop="2px solid #e2e8f0">
                    <Text fontSize="lg" fontWeight="bold" style={{ color: '#2d3748 !important' }}>Grand Total</Text>
                    <Text fontSize="lg" fontWeight="bold" style={{ color: '#3182ce !important' }}>₱{getGrandTotal().toFixed(2)}</Text>
                  </Flex>
                </VStack>
              </Box>

              {/* Payment Terms */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2} style={{ color: '#4a5568 !important' }}>Payment Terms</Text>
                <SelectRoot
                  collection={createListCollection({ items: paymentOptions })}
                  value={[paymentTerms]}
                  onValueChange={(details) => setPaymentTerms(details.value?.[0] as PaymentTerms || 'cash_on_delivery')}
                >
                  <SelectTrigger style={{
                    backgroundColor: '#ffffff !important',
                    color: '#2d3748 !important',
                    border: '1px solid #e2e8f0 !important',
                    borderRadius: '0.375rem !important'
                  }}>
                    <SelectValueText placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent style={{
                    backgroundColor: '#ffffff !important',
                    border: '1px solid #e2e8f0 !important',
                    borderRadius: '0.375rem !important'
                  }}>
                    {paymentOptions.map((option) => (
                      <SelectItem key={option.value} item={option.value} style={{
                        backgroundColor: '#ffffff !important',
                        color: '#2d3748 !important'
                      }}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>

              {/* Priority */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2} style={{ color: '#4a5568 !important' }}>Order Priority</Text>
                <SelectRoot
                  collection={createListCollection({ items: priorityOptions })}
                  value={[priority]}
                  onValueChange={(details) => setPriority(details.value?.[0] as OrderPriority || 'medium')}
                >
                  <SelectTrigger style={{
                    backgroundColor: '#ffffff !important',
                    color: '#2d3748 !important',
                    border: '1px solid #e2e8f0 !important',
                    borderRadius: '0.375rem !important'
                  }}>
                    <SelectValueText placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent style={{
                    backgroundColor: '#ffffff !important',
                    border: '1px solid #e2e8f0 !important',
                    borderRadius: '0.375rem !important'
                  }}>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} item={option.value} style={{
                        backgroundColor: '#ffffff !important',
                        color: '#2d3748 !important'
                      }}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>

              {/* Shipment Type */}
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2} style={{ color: '#4a5568 !important' }}>Shipment Type</Text>
                <SelectRoot
                  collection={createListCollection({ items: shipmentOptions })}
                  value={[shipmentType]}
                  onValueChange={(details) => setShipmentType(details.value?.[0] as ShipmentType || 'delivery')}
                >
                  <SelectTrigger style={{
                    backgroundColor: '#ffffff !important',
                    color: '#2d3748 !important',
                    border: '1px solid #e2e8f0 !important',
                    borderRadius: '0.375rem !important'
                  }}>
                    <SelectValueText placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent style={{
                    backgroundColor: '#ffffff !important',
                    border: '1px solid #e2e8f0 !important',
                    borderRadius: '0.375rem !important'
                  }}>
                    {shipmentOptions.map((option) => (
                      <SelectItem key={option.value} item={option.value} style={{
                        backgroundColor: '#ffffff !important',
                        color: '#2d3748 !important'
                      }}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>

              {/* Shipping Address */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3} style={{ color: '#2d3748 !important' }}>
                  Shipping Address
                </Text>
                <PhilippineAddressForm
                  onAddressChange={(address) => setShippingAddress(address)}
                  initialAddress={userProfile?.address || shippingAddress}
                  darkMode={true}
                />
              </Box>

              {/* Action Buttons */}
              <HStack gap={3} pt={4}>
                <Button
                  flex={1}
                  variant="outline"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  disabled={isPlacingOrder}
                  style={{
                    backgroundColor: '#ffffff !important',
                    color: '#3182ce !important',
                    border: '1px solid #3182ce !important'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  onClick={handlePlaceOrder}
                  loading={isPlacingOrder}
                  disabled={isPlacingOrder}
                  style={{
                    backgroundColor: '#3182ce !important',
                    color: '#ffffff !important',
                    border: '1px solid #3182ce !important'
                  }}
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Cart;