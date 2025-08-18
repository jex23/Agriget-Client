import React, { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
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
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate(ROUTES.LOGIN);
      return;
    }
    setUser(currentUser);
    fetchCart(currentUser);
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

  const handleUserUpdate = () => {
    // Refresh user data from localStorage after profile update
    const updatedUser = authService.getCurrentUser();
    setUser(updatedUser);
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

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