import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Heading,
  IconButton,
  HStack
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogCloseTrigger,
  DialogPositioner
} from '@chakra-ui/react/dialog';
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

  // Forgot Password Modal State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

  // Forgot Password Handlers
  const handleForgotPasswordOpen = () => {
    setIsForgotPasswordOpen(true);
    setForgotPasswordStep(1);
    setForgotPasswordEmail('');
    setForgotPasswordOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const handleForgotPasswordClose = () => {
    setIsForgotPasswordOpen(false);
    setForgotPasswordStep(1);
    setForgotPasswordEmail('');
    setForgotPasswordOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const handleRequestPasswordResetOtp = async () => {
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    if (!forgotPasswordEmail) {
      setForgotPasswordError(VALIDATION_MESSAGES.EMAIL_REQUIRED);
      return;
    }

    if (!VALIDATION_RULES.EMAIL_REGEX.test(forgotPasswordEmail)) {
      setForgotPasswordError(VALIDATION_MESSAGES.EMAIL_INVALID);
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      await authService.requestOtp(forgotPasswordEmail, 'forgot_password');
      setForgotPasswordSuccess('OTP sent successfully! Please check your email.');
      setForgotPasswordStep(2);
    } catch (error) {
      setForgotPasswordError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleVerifyPasswordResetOtp = async () => {
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    if (!forgotPasswordOtp) {
      setForgotPasswordError('OTP code is required');
      return;
    }

    if (forgotPasswordOtp.length !== 6) {
      setForgotPasswordError('OTP must be 6 digits');
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      await authService.verifyOtp(forgotPasswordEmail, forgotPasswordOtp, 'forgot_password');
      setForgotPasswordSuccess('OTP verified! Please enter your new password.');
      setForgotPasswordStep(3);
    } catch (error) {
      setForgotPasswordError(error instanceof Error ? error.message : 'Invalid OTP code');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    if (!newPassword) {
      setForgotPasswordError(VALIDATION_MESSAGES.PASSWORD_REQUIRED);
      return;
    }

    if (newPassword.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      setForgotPasswordError(VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH);
      return;
    }

    if (!confirmNewPassword) {
      setForgotPasswordError('Please confirm your new password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotPasswordError(VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH);
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      await authService.resetPassword(forgotPasswordEmail, forgotPasswordOtp, newPassword);
      setForgotPasswordSuccess('Password reset successfully! You can now login with your new password.');

      // Close modal after 2 seconds
      setTimeout(() => {
        handleForgotPasswordClose();
      }, 2000);
    } catch (error) {
      setForgotPasswordError(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsForgotPasswordLoading(false);
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

              {/* Forgot Password Link */}
              <Box w="full" textAlign="right">
                <Button
                  variant="plain"
                  size="sm"
                  onClick={handleForgotPasswordOpen}
                  color="#3182ce"
                  _hover={{
                    textDecoration: "underline",
                    bg: "transparent"
                  }}
                  bg="transparent"
                  border="none"
                  p={0}
                  h="auto"
                  fontWeight="normal"
                  style={{
                    color: '#3182ce',
                    backgroundColor: 'transparent',
                    border: 'none',
                    boxShadow: 'none'
                  }}
                >
                  Forgot Password?
                </Button>
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
              <RouterLink to={ROUTES.REGISTER} className="login-register-link-text">
                Register here
              </RouterLink>
            </Text>
          </Box>
        </VStack>
      </Box>

      {/* Forgot Password Dialog */}
      <DialogRoot
        open={isForgotPasswordOpen}
        onOpenChange={(e) => !e.open && handleForgotPasswordClose()}
        placement="center"
      >
        <DialogBackdrop bg="blackAlpha.600" />
        <DialogPositioner>
          <DialogContent
            maxW="500px"
            p={6}
            bg="white"
            color="gray.800"
            style={{
              backgroundColor: '#ffffff',
              color: '#2d3748'
            }}
          >
            <DialogHeader>
              <DialogTitle fontSize="xl" fontWeight="bold" color="gray.800">
                Reset Password
              </DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger onClick={handleForgotPasswordClose} />
          <DialogBody>
            <VStack gap={4} mt={4}>
              {forgotPasswordError && (
                <Box bg="red.50" p={3} borderRadius="md" border="1px solid" borderColor="red.200" width="100%">
                  <Text color="red.700" fontSize="sm">
                    {forgotPasswordError}
                  </Text>
                </Box>
              )}

              {forgotPasswordSuccess && (
                <Box bg="green.50" p={3} borderRadius="md" border="1px solid" borderColor="green.200" width="100%">
                  <Text color="green.700" fontSize="sm">
                    {forgotPasswordSuccess}
                  </Text>
                </Box>
              )}

              {/* Step 1: Email Input */}
              {forgotPasswordStep === 1 && (
                <VStack gap={4} width="100%">
                  <Text fontSize="sm" color="gray.600">
                    Enter your email address and we'll send you a verification code to reset your password.
                  </Text>
                  <Box w="full">
                    <Text mb={2} fontWeight="medium" fontSize="sm" color="gray.700">Email Address</Text>
                    <Input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Enter your email address"
                      bg="white"
                      borderColor="gray.300"
                      color="gray.800"
                      _placeholder={{ color: "gray.400" }}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        borderColor: '#cbd5e0'
                      }}
                    />
                  </Box>
                  <Button
                    onClick={handleRequestPasswordResetOtp}
                    width="full"
                    bg="#3182ce"
                    color="white"
                    _hover={{ bg: "#2c5282" }}
                    loading={isForgotPasswordLoading}
                    style={{
                      backgroundColor: '#3182ce',
                      color: '#ffffff'
                    }}
                  >
                    {isForgotPasswordLoading ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                </VStack>
              )}

              {/* Step 2: OTP Verification */}
              {forgotPasswordStep === 2 && (
                <VStack gap={4} width="100%">
                  <Text fontSize="sm" color="gray.600">
                    Enter the 6-digit verification code sent to {forgotPasswordEmail}
                  </Text>
                  <Box w="full">
                    <Text mb={2} fontWeight="medium" fontSize="sm" color="gray.700">Verification Code</Text>
                    <Input
                      type="text"
                      value={forgotPasswordOtp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setForgotPasswordOtp(value);
                      }}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      textAlign="center"
                      fontSize="2xl"
                      letterSpacing="widest"
                      bg="white"
                      borderColor="gray.300"
                      color="gray.800"
                      _placeholder={{ color: "gray.400" }}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#2d3748',
                        borderColor: '#cbd5e0'
                      }}
                    />
                  </Box>
                  <HStack gap={3} width="100%">
                    <Button
                      variant="outline"
                      onClick={() => setForgotPasswordStep(1)}
                      width="50%"
                      borderColor="#3182ce"
                      color="#3182ce"
                      _hover={{ bg: "#edf2f7" }}
                      style={{
                        borderColor: '#3182ce',
                        color: '#3182ce',
                        backgroundColor: 'transparent'
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyPasswordResetOtp}
                      width="50%"
                      bg="#3182ce"
                      color="white"
                      _hover={{ bg: "#2c5282" }}
                      loading={isForgotPasswordLoading}
                      style={{
                        backgroundColor: '#3182ce',
                        color: '#ffffff'
                      }}
                    >
                      {isForgotPasswordLoading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                  </HStack>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRequestPasswordResetOtp}
                    disabled={isForgotPasswordLoading}
                    color="#3182ce"
                    _hover={{ bg: "#edf2f7" }}
                    style={{
                      color: '#3182ce'
                    }}
                  >
                    Resend Code
                  </Button>
                </VStack>
              )}

              {/* Step 3: New Password */}
              {forgotPasswordStep === 3 && (
                  <VStack gap={4} width="100%">
                    <Text fontSize="sm" color="gray.600">
                      Enter your new password
                    </Text>
                    <Box w="full">
                      <Text mb={2} fontWeight="medium" fontSize="sm" color="gray.700">New Password</Text>
                      <Box position="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          pr={12}
                          bg="white"
                          borderColor="gray.300"
                          color="gray.800"
                          _placeholder={{ color: "gray.400" }}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2d3748',
                            borderColor: '#cbd5e0'
                          }}
                        />
                        <IconButton
                          position="absolute"
                          right={2}
                          top="50%"
                          transform="translateY(-50%)"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? "👁️" : "👁️‍🗨️"}
                        </IconButton>
                      </Box>
                    </Box>
                    <Box w="full">
                      <Text mb={2} fontWeight="medium" fontSize="sm" color="gray.700">Confirm New Password</Text>
                      <Box position="relative">
                        <Input
                          type={showConfirmNewPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Confirm new password"
                          pr={12}
                          bg="white"
                          borderColor="gray.300"
                          color="gray.800"
                          _placeholder={{ color: "gray.400" }}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#2d3748',
                            borderColor: '#cbd5e0'
                          }}
                        />
                        <IconButton
                          position="absolute"
                          right={2}
                          top="50%"
                          transform="translateY(-50%)"
                          aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        >
                          {showConfirmNewPassword ? "👁️" : "👁️‍🗨️"}
                        </IconButton>
                      </Box>
                    </Box>
                    <Button
                      onClick={handleResetPassword}
                      width="full"
                      bg="#3182ce"
                      color="white"
                      _hover={{ bg: "#2c5282" }}
                      loading={isForgotPasswordLoading}
                      style={{
                        backgroundColor: '#3182ce',
                        color: '#ffffff'
                      }}
                    >
                      {isForgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                  </VStack>
                )}
              </VStack>
            </DialogBody>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  );
};

export default Login;
