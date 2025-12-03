import React, { useState, useEffect } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Profile from '../components/Profile.js';
import Header from '../components/Header.js';
import Footer from '../components/Footer.js';
import type { User } from '../types/auth.js';
import type { CartItem } from '../types/cart';
import authService from '../services/authService.js';
import { apiCartService } from '../services/apiCartService';
import { ROUTES } from '../constants/routes.js';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializePage = async () => {
      // Check if user is authenticated
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate(ROUTES.LOGIN);
        return;
      }

      try {
        // Fetch fresh user data from API
        const freshUser = await authService.fetchCurrentUser();
        setUser(freshUser);
        await fetchCart(freshUser);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // If API fails, fallback to localStorage data
        setUser(currentUser);
        await fetchCart(currentUser);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [navigate]);

  const fetchCart = async (userToCheck?: User | null) => {
    const userForCheck = userToCheck || user;
    if (!userForCheck) return;
    
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

  const handleUserUpdate = async () => {
    // Fetch fresh user data from API after profile update
    try {
      const freshUser = await authService.fetchCurrentUser();
      setUser(freshUser);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If API fails, fallback to localStorage data
      const updatedUser = authService.getCurrentUser();
      setUser(updatedUser);
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <Box className="profile-page-container" bg="gray.50" minH="100vh" color="gray.900">
        <Header
          user={user}
          cartItems={0}
          cartItemsData={[]}
          onRemoveFromCart={handleRemoveFromCart}
        />
        <Box textAlign="center" py={12}>
          <Text>Loading profile...</Text>
        </Box>
        <Footer />
      </Box>
    );
  }

  return (
    <Box className="profile-page-container" bg="gray.50" minH="100vh" color="gray.900">
      <Header
        user={user}
        cartItems={getTotalItems()}
        cartItemsData={cartItems}
        onRemoveFromCart={handleRemoveFromCart}
      />

      <Profile user={user} onUserUpdate={handleUserUpdate} />

      <Footer />
    </Box>
  );
};

export default ProfilePage;