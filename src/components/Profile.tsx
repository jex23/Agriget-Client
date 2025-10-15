import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Grid,
  GridItem,
  Flex
} from '@chakra-ui/react';
import { FiSave, FiEdit2, FiMail, FiPhone, FiMapPin, FiCalendar, FiLock } from 'react-icons/fi';
import type { User, UserUpdate, ChangePasswordRequest } from '../types/auth.js';
import authService from '../services/authService.js';
import adminUserService from '../services/adminUserService.js';
import PhilippineAddressForm from './PhilippineAddressForm';

interface ProfileProps {
  user: User | null;
  onUserUpdate?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserUpdate>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male'
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Password change state
  const [passwordData, setPasswordData] = useState<ChangePasswordRequest>({
    current_password: '',
    new_password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      // Type-safe access to extended user properties
      const extendedUser = user as User & {
        phone?: string;
        address?: string;
        date_of_birth?: string;
        gender?: string;
      };
      
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: extendedUser.phone || '',
        address: extendedUser.address || '',
        date_of_birth: extendedUser.date_of_birth || '',
        gender: extendedUser.gender || 'male'
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof UserUpdate, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const validateForm = (): boolean => {
    if (!formData.first_name?.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.last_name?.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email?.trim()) {
      setError('Email is required');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Phone validation (if provided)
    if (formData.phone?.trim() && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccessMessage(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Prepare update data - only include fields that have values
      const updateData: UserUpdate = {};
      
      if (formData.first_name?.trim()) updateData.first_name = formData.first_name.trim();
      if (formData.last_name?.trim()) updateData.last_name = formData.last_name.trim();
      if (formData.email?.trim()) updateData.email = formData.email.trim();
      if (formData.phone?.trim()) updateData.phone = formData.phone.trim();
      if (formData.address?.trim()) updateData.address = formData.address.trim();
      if (formData.date_of_birth?.trim()) updateData.date_of_birth = formData.date_of_birth.trim();
      if (formData.gender) updateData.gender = formData.gender;

      // Use AuthService to update current user profile
      const response = await authService.updateUser(updateData);

      console.log('Profile update successful:', {
        userId: user.id,
        updateData,
        response
      });

      // Update local storage with new user data
      const updatedUser = { 
        ...user, 
        ...updateData,
        name: `${updateData.first_name || user.first_name} ${updateData.last_name || user.last_name}`.trim()
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSuccessMessage(response.message || 'Your profile has been updated successfully.');

      // Trigger parent component update
      onUserUpdate?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (field: keyof ChangePasswordRequest, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const validatePasswordForm = (): boolean => {
    if (!passwordData.current_password?.trim()) {
      setPasswordError('Current password is required');
      return false;
    }
    if (!passwordData.new_password?.trim()) {
      setPasswordError('New password is required');
      return false;
    }
    if (passwordData.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return false;
    }
    if (passwordData.new_password !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }
    if (passwordData.current_password === passwordData.new_password) {
      setPasswordError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const getPasswordErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    // Check for specific error patterns and return user-friendly messages
    if (message.includes('401') || message.includes('unauthorized') || message.includes('current password is incorrect')) {
      return 'Current password is incorrect. Please verify your current password and try again.';
    }
    
    if (message.includes('400') || message.includes('bad request')) {
      return 'Invalid password format. Please ensure your new password meets the requirements.';
    }
    
    if (message.includes('403') || message.includes('forbidden')) {
      return 'You do not have permission to change your password at this time.';
    }
    
    if (message.includes('404') || message.includes('not found')) {
      return 'User account not found. Please refresh the page and try again.';
    }
    
    if (message.includes('429') || message.includes('too many requests')) {
      return 'Too many password change attempts. Please wait a moment before trying again.';
    }
    
    if (message.includes('500') || message.includes('internal server error')) {
      return 'Server error occurred. Please try again later or contact support.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // If it's a user-friendly message from the API, use it directly
    if (error.message && !message.includes('http error') && !message.includes('status:')) {
      return error.message;
    }
    
    // Default fallback message
    return 'Failed to change password. Please try again.';
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!validatePasswordForm()) {
      return;
    }

    setIsPasswordLoading(true);

    try {
      const response = await adminUserService.changePassword(passwordData);
      
      console.log('Password change successful:', response);

      setPasswordSuccess(response.message || 'Password changed successfully.');
      
      // Reset password form
      setPasswordData({
        current_password: '',
        new_password: ''
      });
      setConfirmPassword('');

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? getPasswordErrorMessage(error)
        : 'Failed to change password. Please try again.';
      
      console.error('Password change failed:', error);
      setPasswordError(errorMessage);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <Container maxW="container.md" py={8}>
        <Box 
          bg="orange.50"
          borderRadius="lg"
          p={4}
          border="1px solid"
          borderColor="orange.200"
        >
          <HStack gap={3}>
            <Box fontSize="lg" color="orange.500">⚠</Box>
            <Text color="orange.800">Please log in to view your profile.</Text>
          </HStack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Success Message */}
        {successMessage && (
          <Box 
            bg="green.50"
            borderRadius="lg"
            position="relative"
            p={4}
            border="1px solid"
            borderColor="green.200"
          >
            <HStack gap={3}>
              <Box fontSize="lg" color="green.500">✓</Box>
              <Text color="green.800">{successMessage}</Text>
            </HStack>
            <Button
              position="absolute"
              right={2}
              top={2}
              size="xs"
              variant="ghost"
              onClick={() => setSuccessMessage(null)}
              color="green.600"
            >
              ✕
            </Button>
          </Box>
        )}

        {/* Error Message */}
        {error && (
          <Box 
            bg="red.50"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="red.200"
          >
            <HStack gap={3}>
              <Box fontSize="lg" color="red.500">⚠</Box>
              <Text color="red.800">{error}</Text>
            </HStack>
          </Box>
        )}

        {/* Header */}
        <Box
          bg="white"
          borderRadius="xl"
          shadow="sm"
          border="1px solid"
          borderColor="gray.200"
          p={6}
        >
          <Flex align="center" gap={4}>
            <Box
              w="80px"
              h="80px"
              bg="blue.500"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontSize="2xl"
              fontWeight="bold"
            >
              {(user.name || `${user.first_name} ${user.last_name}`).charAt(0).toUpperCase()}
            </Box>
            <VStack align="start" gap={1}>
              <Heading size="lg" color="gray.800">
                {user.name || `${user.first_name} ${user.last_name}`}
              </Heading>
              <Text color="gray.600" fontSize="md">
                @{user.username}
              </Text>
              <Text color="gray.500" fontSize="sm" textTransform="capitalize">
                {user.role} Account
              </Text>
            </VStack>
          </Flex>
        </Box>

        {/* Profile Form */}
        <Box
          bg="white"
          borderRadius="xl"
          shadow="sm"
          border="1px solid"
          borderColor="gray.200"
          overflow="hidden"
        >
          <Box p={6} borderBottom="1px solid" borderColor="gray.100">
            <HStack gap={3}>
              <Box color="blue.500">
                <FiEdit2 size={20} />
              </Box>
              <Heading size="md" color="gray.800">
                Edit Profile
              </Heading>
            </HStack>
          </Box>
          
          <Box p={6}>
            <form onSubmit={handleSubmit}>
              <VStack gap={6} align="stretch">
                {/* Personal Information */}
                <Box>
                  <Heading size="sm" color="gray.700" mb={4}>
                    Personal Information
                  </Heading>
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                    <GridItem>
                      <VStack align="stretch" gap={2}>
                        <Text color="gray.700" fontWeight="600">First Name *</Text>
                        <Input
                          type="text"
                          value={formData.first_name || ''}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          placeholder="Enter your first name"
                          borderRadius="lg"
                          bg="gray.50"
                          border="1px solid"
                          borderColor="gray.200"
                          _focus={{ bg: "white", borderColor: "blue.500" }}
                        />
                      </VStack>
                    </GridItem>
                    
                    <GridItem>
                      <VStack align="stretch" gap={2}>
                        <Text color="gray.700" fontWeight="600">Last Name *</Text>
                        <Input
                          type="text"
                          value={formData.last_name || ''}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          placeholder="Enter your last name"
                          borderRadius="lg"
                          bg="gray.50"
                          border="1px solid"
                          borderColor="gray.200"
                          _focus={{ bg: "white", borderColor: "blue.500" }}
                        />
                      </VStack>
                    </GridItem>
                    
                    <GridItem>
                      <VStack align="stretch" gap={2}>
                        <HStack gap={2}>
                          <FiCalendar />
                          <Text color="gray.700" fontWeight="600">Date of Birth</Text>
                        </HStack>
                        <Input
                          type="date"
                          value={formData.date_of_birth || ''}
                          onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                          borderRadius="lg"
                          bg="gray.50"
                          border="1px solid"
                          borderColor="gray.200"
                          _focus={{ bg: "white", borderColor: "blue.500" }}
                        />
                      </VStack>
                    </GridItem>
                    
                    <GridItem>
                      <VStack align="stretch" gap={2}>
                        <Text color="gray.700" fontWeight="600">Gender</Text>
                        <select
                          value={formData.gender || 'male'}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#f7fafc',
                            border: '1px solid #e2e8f0',
                            outline: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            appearance: 'menulist'
                          }}
                          onFocus={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.borderColor = '#3182ce';
                          }}
                          onBlur={(e) => {
                            e.target.style.backgroundColor = '#f7fafc';
                            e.target.style.borderColor = '#e2e8f0';
                          }}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                        </select>
                      </VStack>
                    </GridItem>
                  </Grid>
                </Box>

                {/* Section Separator */}
                <Box h="1px" bg="gray.200" my={6} />

                {/* Contact Information */}
                <Box>
                  <Heading size="sm" color="gray.700" mb={4}>
                    Contact Information
                  </Heading>
                  <VStack gap={4} align="stretch">
                    <VStack align="stretch" gap={2}>
                      <HStack gap={2}>
                        <FiMail />
                        <Text color="gray.700" fontWeight="600">Email Address *</Text>
                      </HStack>
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email address"
                        borderRadius="lg"
                        bg="gray.50"
                        border="1px solid"
                        borderColor="gray.200"
                        _focus={{ bg: "white", borderColor: "blue.500" }}
                      />
                    </VStack>
                    
                    <VStack align="stretch" gap={2}>
                      <HStack gap={2}>
                        <FiPhone />
                        <Text color="gray.700" fontWeight="600">Phone Number</Text>
                      </HStack>
                      <Input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        borderRadius="lg"
                        bg="gray.50"
                        border="1px solid"
                        borderColor="gray.200"
                        _focus={{ bg: "white", borderColor: "blue.500" }}
                      />
                    </VStack>
                    
                    <VStack align="stretch" gap={2}>
                      <HStack gap={2}>
                        <FiMapPin />
                        <Text color="gray.700" fontWeight="600">Complete Address</Text>
                      </HStack>
                      <PhilippineAddressForm
                        onAddressChange={(address) => handleInputChange('address', address)}
                        initialAddress={formData.address || ''}
                        darkMode={false}
                      />
                    </VStack>
                  </VStack>
                </Box>

                {/* Submit Button */}
                <Flex justify="flex-end" pt={4}>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    bg="blue.500"
                    color="white"
                    _hover={{ bg: "blue.600" }}
                    _active={{ bg: "blue.700" }}
                    borderRadius="8px"
                    px={8}
                  >
                    <HStack gap={2}>
                      <FiSave />
                      <Text>{isLoading ? 'Updating...' : 'Update Profile'}</Text>
                    </HStack>
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Box>
        </Box>

        {/* Change Password Section */}
        <Box
          bg="white"
          borderRadius="xl"
          shadow="sm"
          border="1px solid"
          borderColor="gray.200"
          overflow="hidden"
        >
          <Box p={6} borderBottom="1px solid" borderColor="gray.100">
            <HStack gap={3}>
              <Box color="red.500">
                <FiLock size={20} />
              </Box>
              <Heading size="md" color="gray.800">
                Change Password
              </Heading>
            </HStack>
          </Box>
          
          <Box p={6}>
            {/* Password Success Message */}
            {passwordSuccess && (
              <Box 
                bg="green.50"
                borderRadius="lg"
                position="relative"
                p={4}
                border="1px solid"
                borderColor="green.200"
                mb={4}
              >
                <HStack gap={3}>
                  <Box fontSize="lg" color="green.500">✓</Box>
                  <Text color="green.800">{passwordSuccess}</Text>
                </HStack>
                <Button
                  position="absolute"
                  right={2}
                  top={2}
                  size="xs"
                  variant="ghost"
                  onClick={() => setPasswordSuccess(null)}
                  color="green.600"
                >
                  ✕
                </Button>
              </Box>
            )}

            {/* Password Error Message */}
            {passwordError && (
              <Box 
                bg={passwordError.includes('Current password is incorrect') ? "red.100" : "red.50"}
                borderRadius="lg"
                position="relative"
                p={4}
                border="2px solid"
                borderColor={passwordError.includes('Current password is incorrect') ? "red.300" : "red.200"}
                mb={4}
              >
                <HStack gap={3}>
                  <Box 
                    fontSize="lg" 
                    color={passwordError.includes('Current password is incorrect') ? "red.600" : "red.500"}
                  >
                    {passwordError.includes('Current password is incorrect') ? '🔒' : '⚠'}
                  </Box>
                  <VStack align="start" gap={1} flex={1}>
                    <Text 
                      color={passwordError.includes('Current password is incorrect') ? "red.900" : "red.800"}
                      fontWeight={passwordError.includes('Current password is incorrect') ? "600" : "500"}
                    >
                      {passwordError}
                    </Text>
                    {passwordError.includes('Current password is incorrect') && (
                      <Text fontSize="sm" color="red.700">
                        Please double-check your current password and ensure it's entered correctly.
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <Button
                  position="absolute"
                  right={2}
                  top={2}
                  size="xs"
                  variant="ghost"
                  onClick={() => setPasswordError(null)}
                  color={passwordError.includes('Current password is incorrect') ? "red.600" : "red.500"}
                >
                  ✕
                </Button>
              </Box>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <VStack gap={4} align="stretch">
                <VStack align="stretch" gap={2}>
                  <Text color="gray.700" fontWeight="600">Current Password *</Text>
                  <Input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                    placeholder="Enter your current password"
                    borderRadius="lg"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ bg: "white", borderColor: "blue.500" }}
                  />
                </VStack>

                <VStack align="stretch" gap={2}>
                  <Text color="gray.700" fontWeight="600">New Password *</Text>
                  <Input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                    placeholder="Enter your new password (min 6 characters)"
                    borderRadius="lg"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ bg: "white", borderColor: "blue.500" }}
                  />
                </VStack>

                <VStack align="stretch" gap={2}>
                  <Text color="gray.700" fontWeight="600">Confirm New Password *</Text>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    borderRadius="lg"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    _focus={{ bg: "white", borderColor: "blue.500" }}
                  />
                </VStack>

                <Flex justify="flex-end" pt={4}>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isPasswordLoading}
                    bg="red.500"
                    color="white"
                    _hover={{ bg: "red.600" }}
                    _active={{ bg: "red.700" }}
                    borderRadius="8px"
                    px={8}
                  >
                    <HStack gap={2}>
                      <FiLock />
                      <Text>{isPasswordLoading ? 'Changing...' : 'Change Password'}</Text>
                    </HStack>
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Box>
        </Box>
      </VStack>
    </Container>
  );
};

export default Profile;