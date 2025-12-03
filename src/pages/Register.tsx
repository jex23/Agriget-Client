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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import type { RegisterCredentials } from '../types/auth.js';
import authService from '../services/authService.js';
import { ROUTES } from '../constants/routes.js';
import { VALIDATION_MESSAGES, VALIDATION_RULES } from '../constants/validation.js';
import PhilippineAddressForm from '../components/PhilippineAddressForm';
import './Register.css';

const Register: React.FC = () => {
  // Registration steps: 1 = Email, 2 = OTP Verification, 3 = Registration Form
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [credentials, setCredentials] = useState<RegisterCredentials>({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    phone: '09',
    address: '',
    date_of_birth: '',
    role: 'user'
  });
  const [errors, setErrors] = useState<Partial<RegisterCredentials> & { email?: string; otp?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // Step 1: Request OTP for email
  const handleRequestOtp = async () => {
    setGeneralError('');
    setGeneralSuccess('');

    if (!email) {
      setErrors({ email: VALIDATION_MESSAGES.EMAIL_REQUIRED });
      return;
    }

    if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
      setErrors({ email: VALIDATION_MESSAGES.EMAIL_INVALID });
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestOtp(email, 'register');
      setGeneralSuccess('OTP sent successfully! Please check your email.');
      setStep(2);
      setErrors({});
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setGeneralError('');
    setGeneralSuccess('');

    if (!otpCode) {
      setErrors({ otp: 'OTP code is required' });
      return;
    }

    if (otpCode.length !== 6) {
      setErrors({ otp: 'OTP must be 6 digits' });
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otpCode, 'register');
      setIsEmailVerified(true);
      setGeneralSuccess('Email verified successfully! Please complete your registration.');
      setCredentials(prev => ({ ...prev, email }));
      setStep(3);
      setErrors({});
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterCredentials> = {};

    if (!credentials.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!credentials.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!credentials.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!credentials.password) {
      newErrors.password = VALIDATION_MESSAGES.PASSWORD_REQUIRED;
    } else if (credentials.password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      newErrors.password = VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH;
    }

    if (!credentials.confirmPassword) {
      newErrors.confirmPassword = VALIDATION_MESSAGES.CONFIRM_PASSWORD_REQUIRED;
    } else if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH;
    }

    if (!credentials.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!credentials.phone?.trim() || credentials.phone === '09') {
      newErrors.phone = 'Please enter the remaining 9 digits';
    } else if (!/^\d+$/.test(credentials.phone)) {
      newErrors.phone = 'Phone number must contain only numbers';
    } else if (!credentials.phone.startsWith('09')) {
      newErrors.phone = 'Phone number must start with 09';
    } else if (credentials.phone.length !== 11) {
      newErrors.phone = `Phone number must be 11 digits (${11 - credentials.phone.length} more digit${11 - credentials.phone.length !== 1 ? 's' : ''} needed)`;
    }

    if (!credentials.address?.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!credentials.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      // Check if user is at least 18 years old
      const birthDate = new Date(credentials.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        newErrors.date_of_birth = 'You must be at least 18 years old to register';
      }

      // Check if date is not in the future
      if (birthDate > today) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!isEmailVerified) {
      setGeneralError('Please verify your email first');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authService.register(credentials);
      navigate(ROUTES.HOME);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;

    // Special handling for phone field - only allow digits and limit to 11 characters
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 11);
      // Ensure the phone number always starts with "09"
      if (!value.startsWith('09') || value.length < 2) {
        value = '09';
      }
    }

    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSelectChange = (field: keyof RegisterCredentials) => (
    e: React.ChangeEvent<HTMLSelectElement>
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
    <Box className="register-container">
      <Box className="register-card">
        <VStack gap={6}>
          <VStack gap={2} textAlign="center">
            <Heading className="register-brand-title" size="lg">
              🏗️ Joey's Aggregates Trading
            </Heading>
            <Text className="register-brand-subtitle" fontSize="sm">
              Premium Construction Materials & Aggregates
            </Text>
            <Text className="register-form-title" fontSize="md" fontWeight="medium" mt={4}>
              Create Your Account
            </Text>
          </VStack>

          {/* Progress Indicator */}
          <Box width="100%">
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight={step >= 1 ? 'bold' : 'normal'} color={step >= 1 ? 'blue.600' : 'gray.500'}>
                Email
              </Text>
              <Text fontSize="xs" fontWeight={step >= 2 ? 'bold' : 'normal'} color={step >= 2 ? 'blue.600' : 'gray.500'}>
                Verify OTP
              </Text>
              <Text fontSize="xs" fontWeight={step >= 3 ? 'bold' : 'normal'} color={step >= 3 ? 'blue.600' : 'gray.500'}>
                Complete
              </Text>
            </HStack>
            {/* Custom Progress Bar */}
            <Box
              width="100%"
              height="6px"
              bg="gray.200"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                height="100%"
                width={`${(step / 3) * 100}%`}
                bg="blue.500"
                borderRadius="full"
                transition="width 0.3s ease"
                style={{
                  backgroundColor: '#3182ce'
                }}
              />
            </Box>
          </Box>

          {generalError && (
            <Box className="register-error-box">
              <Text className="register-error-text">
                {generalError}
              </Text>
            </Box>
          )}

          {generalSuccess && (
            <Box bg="green.50" p={3} borderRadius="md" border="1px solid" borderColor="green.200" width="100%">
              <Text color="green.700" fontSize="sm">
                {generalSuccess}
              </Text>
            </Box>
          )}

          {/* Step 1: Email Input */}
          {step === 1 && (
            <VStack gap={4} width="100%">
              <Box w="full">
                <Text className="register-form-label" mb={2} fontWeight="medium">Email Address</Text>
                <Input
                  className={`register-input ${errors.email ? 'error' : ''}`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <Text className="register-field-error" fontSize="sm" mt={1}>
                    {errors.email}
                  </Text>
                )}
                <Text fontSize="xs" color="gray.500" mt={2}>
                  We'll send you a 6-digit verification code
                </Text>
              </Box>

              <Button
                className="register-submit-button"
                onClick={handleRequestOtp}
                width="full"
                loading={isLoading}
                bg="#3182ce"
                color="white"
                _hover={{ bg: "#2c5282" }}
                style={{
                  backgroundColor: '#3182ce',
                  color: '#ffffff'
                }}
              >
                {isLoading ? 'Sending OTP...' : 'Send Verification Code'}
              </Button>
            </VStack>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <VStack gap={4} width="100%">
              <Box w="full">
                <Text className="register-form-label" mb={2} fontWeight="medium">Enter Verification Code</Text>
                <Input
                  className={`register-input ${errors.otp ? 'error' : ''}`}
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(value);
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: undefined }));
                  }}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  textAlign="center"
                  fontSize="2xl"
                  letterSpacing="widest"
                />
                {errors.otp && (
                  <Text className="register-field-error" fontSize="sm" mt={1}>
                    {errors.otp}
                  </Text>
                )}
                <Text fontSize="xs" color="gray.500" mt={2}>
                  Check your email ({email}) for the verification code
                </Text>
              </Box>

              <HStack gap={3} width="100%" alignItems="stretch">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  width="50%"
                  borderColor="#3182ce"
                  color="#3182ce"
                  bg="white"
                  border="2px solid"
                  _hover={{ bg: "#edf2f7" }}
                  height="48px"
                  fontSize="md"
                  fontWeight="600"
                  style={{
                    borderColor: '#3182ce',
                    color: '#3182ce',
                    backgroundColor: '#ffffff',
                    borderWidth: '2px'
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  width="50%"
                  loading={isLoading}
                  bg="#3182ce"
                  color="white"
                  border="2px solid #3182ce"
                  _hover={{ bg: "#2c5282" }}
                  height="48px"
                  fontSize="md"
                  fontWeight="600"
                  style={{
                    backgroundColor: '#3182ce',
                    color: '#ffffff',
                    borderWidth: '2px',
                    borderColor: '#3182ce'
                  }}
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </HStack>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestOtp}
                disabled={isLoading}
                color="#3182ce"
                _hover={{ bg: "#edf2f7" }}
                style={{
                  color: '#3182ce',
                  backgroundColor: 'transparent'
                }}
              >
                Resend Code
              </Button>
            </VStack>
          )}

          {/* Step 3: Complete Registration Form */}
          {step === 3 && (
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack gap={4}>
                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">First Name</Text>
                  <Input
                    className={`register-input ${errors.first_name ? 'error' : ''}`}
                    type="text"
                    value={credentials.first_name}
                    onChange={handleChange('first_name')}
                    placeholder="Enter your first name"
                  />
                  {errors.first_name && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.first_name}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Last Name</Text>
                  <Input
                    className={`register-input ${errors.last_name ? 'error' : ''}`}
                    type="text"
                    value={credentials.last_name}
                    onChange={handleChange('last_name')}
                    placeholder="Enter your last name"
                  />
                  {errors.last_name && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.last_name}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Username</Text>
                  <Input
                    className={`register-input ${errors.username ? 'error' : ''}`}
                    type="text"
                    value={credentials.username}
                    onChange={handleChange('username')}
                    placeholder="Choose a username"
                  />
                  {errors.username && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.username}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Email (Verified)</Text>
                  <Input
                    className="register-input"
                    type="email"
                    value={credentials.email}
                    disabled
                    bg="gray.100"
                  />
                  <Text fontSize="xs" color="green.600" mt={1}>
                    ✓ Email verified
                  </Text>
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Password</Text>
                  <Box className="register-password-container">
                    <Input
                      className={`register-input ${errors.password ? 'error' : ''}`}
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={handleChange('password')}
                      placeholder="Enter your password"
                      pr={12}
                    />
                    <IconButton
                      className="register-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </IconButton>
                  </Box>
                  {errors.password && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.password}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Confirm Password</Text>
                  <Box className="register-password-container">
                    <Input
                      className={`register-input ${errors.confirmPassword ? 'error' : ''}`}
                      type={showConfirmPassword ? "text" : "password"}
                      value={credentials.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      placeholder="Confirm your password"
                      pr={12}
                    />
                    <IconButton
                      className="register-password-toggle"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </IconButton>
                  </Box>
                  {errors.confirmPassword && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.confirmPassword}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Gender</Text>
                  <select
                    className={`register-input ${errors.gender ? 'error' : ''}`}
                    value={credentials.gender}
                    onChange={handleSelectChange('gender')}
                  >
                    <option value="">Select your gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                  </select>
                  {errors.gender && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.gender}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Phone Number</Text>
                  <Input
                    className={`register-input ${errors.phone ? 'error' : ''}`}
                    type="tel"
                    value={credentials.phone}
                    onChange={handleChange('phone')}
                    placeholder="Enter remaining 9 digits"
                    maxLength={11}
                  />
                  {errors.phone && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.phone}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Complete Address</Text>
                  <PhilippineAddressForm
                    onAddressChange={(address) => {
                      setCredentials(prev => ({
                        ...prev,
                        address: address
                      }));
                      if (errors.address && address) {
                        setErrors(prev => ({
                          ...prev,
                          address: undefined
                        }));
                      }
                    }}
                    initialAddress={credentials.address}
                    darkMode={false}
                  />
                  {errors.address && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.address}
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text className="register-form-label" mb={2} fontWeight="medium">Date of Birth</Text>
                  <Box className="register-date-picker-container">
                    <Input
                      className={`register-input register-date-input ${errors.date_of_birth ? 'error' : ''}`}
                      type="date"
                      value={credentials.date_of_birth}
                      onChange={handleChange('date_of_birth')}
                      max={new Date().toISOString().split('T')[0]} // Prevent future dates
                      min="1900-01-01" // Reasonable minimum date
                      placeholder="mm/dd/yyyy"
                    />
                    <Text className="register-date-helper" fontSize="xs" color="gray.500" mt={1}>
                      You must be at least 18 years old to register
                    </Text>
                  </Box>
                  {errors.date_of_birth && (
                    <Text className="register-field-error" fontSize="sm" mt={1}>
                      {errors.date_of_birth}
                    </Text>
                  )}
                </Box>

                <Button
                  className="register-submit-button"
                  type="submit"
                  width="full"
                  loading={isLoading}
                  bg="#3182ce"
                  color="white"
                  _hover={{ bg: "#2c5282" }}
                  style={{
                    backgroundColor: '#3182ce',
                    color: '#ffffff'
                  }}
                >
                  {isLoading ? 'Creating account...' : 'Complete Registration'}
                </Button>
              </VStack>
            </form>
          )}

          <Box className="register-login-link">
            <Text className="register-login-text">
              Already have an account?{' '}
              <RouterLink to={ROUTES.LOGIN} className="register-login-link-text">
                Login here
              </RouterLink>
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default Register;
