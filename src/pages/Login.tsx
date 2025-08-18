import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Heading,
  Link,
  IconButton
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import type { LoginCredentials } from '../types/auth.js';
import authService from '../services/authService.js';
import { ROUTES } from '../constants/routes.js';
import { VALIDATION_MESSAGES, VALIDATION_RULES } from '../constants/validation.js';
import './Login.css';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.username) {
      newErrors.username = 'Username or email is required';
    }

    if (!credentials.password) {
      newErrors.password = VALIDATION_MESSAGES.PASSWORD_REQUIRED;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const authResponse = await authService.login(credentials);
      
      // Role-based navigation
      if (authResponse.user.role === 'admin') {
        navigate(ROUTES.ADMIN);
      } else {
        navigate(ROUTES.HOME);
      }
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <Box className="login-container">
      <Box className="login-card">
        <VStack gap={6}>
          <VStack gap={2} textAlign="center">
            <Heading className="login-brand-title" size="lg">
              🏗️ Joey's Aggregates Trading
            </Heading>
            <Text className="login-brand-subtitle" fontSize="sm">
              Premium Construction Materials & Aggregates
            </Text>
            <Text className="login-form-title" fontSize="md" fontWeight="medium" mt={4}>
              Login to Your Account
            </Text>
          </VStack>

          {generalError && (
            <Box className="login-error-box">
              <Text className="login-error-text">
                {generalError}
              </Text>
            </Box>
          )}

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack gap={4}>
              <Box w="full">
                <Text className="login-form-label" mb={2} fontWeight="medium">Username or Email</Text>
                <Input
                  className={`login-input ${errors.username ? 'error' : ''}`}
                  type="text"
                  value={credentials.username}
                  onChange={handleChange('username')}
                  placeholder="Enter your username or email"
                />
                {errors.username && (
                  <Text className="login-field-error" fontSize="sm" mt={1}>
                    {errors.username}
                  </Text>
                )}
              </Box>

              <Box w="full">
                <Text className="login-form-label" mb={2} fontWeight="medium">Password</Text>
                <Box className="login-password-container">
                  <Input
                    className={`login-input ${errors.password ? 'error' : ''}`}
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    onChange={handleChange('password')}
                    placeholder="Enter your password"
                    pr={12}
                  />
                  <IconButton
                    className="login-password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </IconButton>
                </Box>
                {errors.password && (
                  <Text className="login-field-error" fontSize="sm" mt={1}>
                    {errors.password}
                  </Text>
                )}
              </Box>

              <Button
                className="login-submit-button"
                type="submit"
                width="full"
                loading={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </VStack>
          </form>

          <Box className="login-register-link">
            <Text className="login-register-text">
              Don't have an account?{' '}
              <RouterLink to={ROUTES.REGISTER}>
                <Link className="login-register-link-text">
                  Register here
                </Link>
              </RouterLink>
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default Login;