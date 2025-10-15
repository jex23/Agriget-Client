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
    status: 'active'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ isExpanded: false, isMobile: window.innerWidth <= 1024 });
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const data = await adminUserService.getAllUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      toaster.create({
        title: 'Error',
        description: 'Failed to fetch users',
        type: 'error',
        duration: 3000,
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

      if (isEditing && selectedUser) {
        await adminUserService.updateUser(selectedUser.id, submitData);
        toaster.create({
          title: 'Success',
          description: 'User updated successfully',
          type: 'success',
          duration: 3000,
        });
      }
      
      resetForm();
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('User save error:', err);
      toaster.create({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save user',
        type: 'error',
        duration: 3000,
      });
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
      status: user.status
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
      status: 'active'
    });
    setSelectedUser(null);
  };

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
                <Heading className="admin-title" size="xl" mb={2}>
                  User Management
                </Heading>
                <Text className="admin-subtitle">
                  Manage user accounts, roles, and permissions.
                </Text>
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
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
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
    </Box>
  );
};

export default AdminUser;