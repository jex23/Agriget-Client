import { API_ENDPOINTS } from '../constants/api';
import type { CartItem as CartResponse } from '../types/cart';
import getToken from './authService';

interface CartItem {
  [productId: string]: number;
}

class CartService {
  private storageKey = 'cart';

  getCart(): CartItem {
    const savedCart = localStorage.getItem(this.storageKey);
    return savedCart ? JSON.parse(savedCart) : {};
  }

  addToCart(productId: string, quantity: number = 1): void {
    const cart = this.getCart();
    cart[productId] = (cart[productId] || 0) + quantity;
    this.saveCart(cart);
  }

  removeFromCart(productId: string): void {
    const cart = this.getCart();
    delete cart[productId];
    this.saveCart(cart);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    
    const cart = this.getCart();
    cart[productId] = quantity;
    this.saveCart(cart);
  }

  clearCart(): void {
    localStorage.removeItem(this.storageKey);
  }

  getTotalItems(): number {
    const cart = this.getCart();
    return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  }

  getTotalPrice(products: Array<{ id: string; price: number }>): number {
    const cart = this.getCart();
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      return total + (product ? product.price * quantity : 0);
    }, 0);
  }

  private saveCart(cart: CartItem): void {
    localStorage.setItem(this.storageKey, JSON.stringify(cart));
  }

  // Admin API methods
  async getAllCarts(): Promise<CartResponse[]> {
    try {
      const response = await fetch(API_ENDPOINTS.cartAll, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getToken.getToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch all carts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all carts:', error);
      throw error;
    }
  }
}

export default new CartService();