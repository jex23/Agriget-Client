import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  createToaster,
  Container,
  Flex
} from '@chakra-ui/react';
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from '@chakra-ui/react/select';
import { createListCollection } from '@chakra-ui/react';
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';
import adminUserService from '../services/adminUserService';
import type { UserResponse, UserUpdate } from '../types/users';
import './AdminUser.css';
import '../pages/Admin.css';

const AdminUser: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState<UserUpdate>({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'male',
    role: 'user',
    status: 'active',
    archive: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ isExpanded: false, isMobile: window.innerWidth <= 1024 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    success: boolean;
    message: string;
  }>({
    isOpen: false,
    success: false,
    message: ''
  });

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non-binary' }
  ];

  const roleOptions = [
    { label: 'User', value: 'user' },
    { label: 'Admin', value: 'admin' }
  ];

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Disabled', value: 'disable' }
  ];

  const archiveOptions = [
    { label: 'Active', value: '0' },
    { label: 'Archived', value: '1' }
  ];

  const filterOptions = [
    { label: 'All Users', value: 'all' },
    { label: 'Active Only', value: 'active' },
    { label: 'Archived Only', value: 'archived' }
  ];

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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('[DEBUG] fetchUsers: Starting to fetch all users...');
      console.log('[DEBUG] fetchUsers: API endpoint will be:', '/users');
      console.log('[DEBUG] fetchUsers: HTTP method: GET');

      const data = await adminUserService.getAllUsers();

      console.log('[DEBUG] fetchUsers: Successfully fetched users:', data.length, 'users');
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('[DEBUG] fetchUsers: ERROR occurred');
      console.error('[DEBUG] fetchUsers: Error type:', err instanceof Error ? 'Error' : typeof err);
      console.error('[DEBUG] fetchUsers: Error message:', err instanceof Error ? err.message : err);
      console.error('[DEBUG] fetchUsers: Full error object:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);

      // Show error modal
      setResultModal({
        isOpen: true,
        success: false,
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name?.trim()) {
      toaster.create({
        title: 'Validation Error',
        description: 'First name is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (!formData.last_name?.trim()) {
      toaster.create({
        title: 'Validation Error',
        description: 'Last name is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (!formData.email?.trim()) {
      toaster.create({
        title: 'Validation Error',
        description: 'Email is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (!formData.username?.trim()) {
      toaster.create({
        title: 'Validation Error',
        description: 'Username is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const submitData: UserUpdate = {
        ...formData,
        first_name: formData.first_name?.trim(),
        last_name: formData.last_name?.trim(),
        username: formData.username?.trim(),
        email: formData.email?.trim(),
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined
      };

      console.log('[DEBUG] handleSubmit: Starting user update...');
      console.log('[DEBUG] handleSubmit: isEditing:', isEditing);
      console.log('[DEBUG] handleSubmit: selectedUser:', selectedUser);
      console.log('[DEBUG] handleSubmit: submitData:', submitData);

      if (isEditing && selectedUser) {
        console.log('[DEBUG] handleSubmit: Updating user ID:', selectedUser.id);
        console.log('[DEBUG] handleSubmit: API endpoint:', `/user/${selectedUser.id}`);
        console.log('[DEBUG] handleSubmit: HTTP method: PUT');
        console.log('[DEBUG] handleSubmit: Request body:', JSON.stringify(submitData, null, 2));

        await adminUserService.updateUser(selectedUser.id, submitData);

        console.log('[DEBUG] handleSubmit: User updated successfully');

        // Show success modal
        setResultModal({
          isOpen: true,
          success: true,
          message: 'User updated successfully!'
        });

        resetForm();
        setIsModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error('[DEBUG] handleSubmit: ERROR occurred during user update');
      console.error('[DEBUG] handleSubmit: Error type:', err instanceof Error ? 'Error' : typeof err);
      console.error('[DEBUG] handleSubmit: Error message:', err instanceof Error ? err.message : err);
      console.error('[DEBUG] handleSubmit: Full error object:', err);
      console.error('[DEBUG] handleSubmit: Stack trace:', err instanceof Error ? err.stack : 'N/A');

      // Show error modal
      setResultModal({
        isOpen: true,
        success: false,
        message: err instanceof Error ? err.message : 'Failed to save user'
      });

      setIsModalOpen(false);
    }
  };

  const handleEdit = (user: UserResponse) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      date_of_birth: user.date_of_birth || '',
      gender: user.gender,
      role: user.role,
      status: user.status,
      archive: user.archive
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      gender: 'male',
      role: 'user',
      status: 'active',
      archive: 0
    });
    setSelectedUser(null);
  };

  // Filter users based on archive status
  const filteredUsers = users.filter(user => {
    if (archiveFilter === 'all') {
      return true; // Show all users
    } else if (archiveFilter === 'active') {
      return user.archive === 0; // Show only active users
    } else {
      return user.archive === 1; // Show only archived users
    }
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box className="admin-user-container">
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
                <Flex justify="space-between" align="center" mb={2}>
                  <Box>
                    <Heading className="admin-title" size="xl" mb={2}>
                      User Management
                    </Heading>
                    <Text className="admin-subtitle">
                      Manage user accounts, roles, and permissions.
                    </Text>
                  </Box>
                  <HStack gap={3}>
                    <Box minW="200px">
                      <SelectRoot
                        collection={createListCollection({ items: filterOptions })}
                        value={[archiveFilter]}
                        onValueChange={(details) => {
                          const newFilter = details.value?.[0] as 'all' | 'active' | 'archived';
                          setArchiveFilter(newFilter);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Filter users" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions.map((option) => (
                            <SelectItem key={option.value} item={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Box>
                  </HStack>
                </Flex>
              </Box>

              {error && (
                <div className="admin-user-error">
                  {error}
                </div>
              )}

              {/* User Management Section */}
              <Box className="admin-section">
                <div className="admin-user-table-container">
            {loading ? (
              <div className="admin-user-loading">
                <div className="admin-user-loading-spinner"></div>
                <Text>Loading users...</Text>
              </div>
            ) : (
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Archive</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="admin-user-username">
                        {user.first_name} {user.last_name}
                      </td>
                      <td>{user.username}</td>
                      <td className="admin-user-email">{user.email}</td>
                      <td>{user.phone || 'N/A'}</td>
                      <td>
                        <span className={`admin-user-role-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <Badge
                          className={`admin-badge-${
                            user.status === 'active' ? 'green' : 'orange'
                          }`}
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          className={`admin-badge-${
                            user.archive === 0 ? 'green' : 'gray'
                          }`}
                        >
                          {user.archive === 0 ? 'Active' : 'Archived'}
                        </Badge>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="admin-user-actions">
                          <button
                            className="admin-user-edit-btn"
                            onClick={() => handleEdit(user)}
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
                </div>
              </Box>
            </VStack>
          </Container>
      </Box>

      {/* Custom Modal */}
      {isModalOpen && (
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
        >
          <Box
            className="admin-section"
            maxWidth="600px"
            width="100%"
            maxHeight="90vh"
            overflow="auto"
            bg="white"
            borderRadius="lg"
            p={6}
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Heading className="admin-section-title" size="lg">
                Edit User
              </Heading>
              <Button
                className="admin-action-button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </Button>
            </Flex>

            <form onSubmit={handleSubmit}>
              <VStack gap={4}>
                <HStack width="100%" gap={4}>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>First Name *</Text>
                    <Input
                      value={formData.first_name || ''}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Last Name *</Text>
                    <Input
                      value={formData.last_name || ''}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </Box>
                </HStack>

                <HStack width="100%" gap={4}>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Username *</Text>
                    <Input
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Email *</Text>
                    <Input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </Box>
                </HStack>

                <HStack width="100%" gap={4}>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Phone</Text>
                    <Input
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Date of Birth</Text>
                    <Input
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </Box>
                </HStack>

                <Box width="100%">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Address</Text>
                  <Input
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </Box>

                <HStack width="100%" gap={4}>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Gender</Text>
                    <SelectRoot
                      collection={createListCollection({ items: genderOptions })}
                      value={formData.gender ? [formData.gender] : []}
                      onValueChange={(details) => setFormData({ ...formData, gender: details.value?.[0] as 'male' | 'female' | 'non-binary' })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} item={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Box>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Role</Text>
                    <SelectRoot
                      collection={createListCollection({ items: roleOptions })}
                      value={formData.role ? [formData.role] : []}
                      onValueChange={(details) => setFormData({ ...formData, role: details.value?.[0] as 'admin' | 'user' })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} item={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Box>
                </HStack>

                <HStack width="100%" gap={4}>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Status</Text>
                    <SelectRoot
                      collection={createListCollection({ items: statusOptions })}
                      value={formData.status ? [formData.status] : []}
                      onValueChange={(details) => setFormData({ ...formData, status: details.value?.[0] as 'active' | 'disable' })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} item={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Box>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Archive Status</Text>
                    <SelectRoot
                      collection={createListCollection({ items: archiveOptions })}
                      value={formData.archive !== undefined ? [String(formData.archive)] : ['0']}
                      onValueChange={(details) => {
                        const newValue = parseInt(details.value?.[0] || '0') as 0 | 1;
                        setFormData({ ...formData, archive: newValue });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Select archive status" />
                      </SelectTrigger>
                      <SelectContent>
                        {archiveOptions.map((option) => (
                          <SelectItem key={option.value} item={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Box>
                </HStack>
              </VStack>

              <Flex justify="flex-end" gap={3} mt={6} pt={4} borderTop="1px solid #e2e8f0">
                <Button 
                  className="admin-action-button"
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="admin-action-button"
                  type="submit"
                >
                  Update User
                </Button>
              </Flex>
            </form>
          </Box>
        </Box>
      )}

      {/* Result Modal */}
      {resultModal.isOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.6)"
          zIndex={1100}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
          onClick={() => setResultModal({ isOpen: false, success: false, message: '' })}
        >
          <Box
            className="admin-section"
            maxWidth="500px"
            width="100%"
            bg="white"
            borderRadius="lg"
            p={8}
            textAlign="center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <Box fontSize="4xl" mb={4}>
              {resultModal.success ? '✅' : '❌'}
            </Box>

            {/* Title */}
            <Heading
              size="lg"
              mb={3}
              color={resultModal.success ? 'green.600' : 'red.600'}
            >
              {resultModal.success ? 'Success!' : 'Error!'}
            </Heading>

            {/* Message */}
            <Text fontSize="md" mb={6} color="gray.700">
              {resultModal.message}
            </Text>

            {/* Close Button */}
            <Button
              className="admin-action-button"
              size="lg"
              onClick={() => setResultModal({ isOpen: false, success: false, message: '' })}
              width="100%"
            >
              Close
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdminUser;