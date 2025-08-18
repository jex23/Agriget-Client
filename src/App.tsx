import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Home from './pages/Home.js';
import Cart from './pages/Cart.js';
import Orders from './pages/Orders.js';
import Profile from './pages/Profile.js';
import Admin from './pages/Admin.js';
import AdminProduct from './pages/AdminProduct.js';
import AdminCart from './pages/AdminCart.js';
import AdminUser from './pages/AdminUser.js';
import AdminOrders from './pages/AdminOrders.js';
import AdminNotifications from './pages/AdminNotifications.js';
import { ROUTES } from './constants/routes.js';
import './App.css';
import './pages/Login.css';
import './pages/Register.css';
import './pages/Home.css';
import './pages/Cart.css';
import './pages/Orders.css';
import './pages/Profile.css';
import './pages/Admin.css';
import './pages/AdminProduct.css';
import './pages/AdminCart.css';
import './pages/AdminUser.css';
import './pages/AdminOrders.css';
import './components/Header.css';
import './components/Footer.css';
import './components/Sidebar.css';
import './components/Product.css';
import './components/AdminHeader.css';
import './components/AdminSidebar.css';

// Enhanced Chakra system with mobile-first responsive configuration
const system = createSystem(defaultConfig);

// Force light mode by setting body styles
if (typeof document !== 'undefined') {
  document.documentElement.style.colorScheme = 'light';
  document.body.style.backgroundColor = '#ffffff';
  document.body.style.color = '#2d3748';
}

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f7fafc'
        }}>
          <h1 style={{ color: '#e53e3e', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#718096', marginBottom: '2rem' }}>
            We're sorry, but something unexpected happened. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#2b6cb0',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="loading-container" style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f7fafc'
  }}>
    <div className="loading-spinner"></div>
    <span style={{ marginLeft: '1rem', color: '#718096' }}>Loading...</span>
  </div>
);

// Main App Component
const AppContent: React.FC = () => {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Add mobile class to body for global mobile styles
    if (isMobile) {
      document.body.classList.add('mobile');
    } else {
      document.body.classList.remove('mobile');
    }

    // Add viewport meta tag for mobile if not present
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }

    // Prevent zoom on iOS
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    if (isMobile) {
      document.addEventListener('touchstart', preventZoom, { passive: false });
    }

    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [isMobile]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`App ${isMobile ? 'mobile' : 'desktop'}`}>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.CART} element={<Cart />} />
            <Route path={ROUTES.ORDERS} element={<Orders />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route path={ROUTES.ADMIN} element={<Admin />} />
            <Route path={ROUTES.ADMIN_PRODUCTS} element={<AdminProduct />} />
            <Route path={ROUTES.ADMIN_CART} element={<AdminCart />} />
            <Route path={ROUTES.ADMIN_USERS} element={<AdminUser />} />
            <Route path={ROUTES.ADMIN_ORDERS} element={<AdminOrders />} />
            <Route path={ROUTES.ADMIN_NOTIFICATIONS} element={<AdminNotifications />} />
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ChakraProvider value={system}>
        <AppContent />
      </ChakraProvider>
    </ErrorBoundary>
  );
};

export default App;