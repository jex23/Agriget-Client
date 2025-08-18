import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  Textarea,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Spinner,
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
import { Alert } from '@chakra-ui/react/alert';
import { Switch } from '@chakra-ui/react/switch';
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';
import { productService } from '../services/productService';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../types/product';
import { API_ENDPOINTS } from '../constants/api';
import './AdminProduct.css';
import '../pages/Admin.css';

const AdminProduct: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    description: '',
    category: '',
    unit: '',
    stock_quantity: 0,
    price: 0,
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ isExpanded: false, isMobile: window.innerWidth <= 1024 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Category and unit mappings
  const categories = [
    { label: 'Hollow Blocks', value: 'Hollow Blocks' },
    { label: 'Gravel', value: 'Gravel' },
    { label: 'Sand', value: 'Sand' },
    { label: 'Steel', value: 'Steel' }
  ];

  const getUnitsForCategory = (category: string) => {
    switch (category) {
      case 'Hollow Blocks':
        return [
          { label: '3" CHB', value: '3" CHB' },
          { label: '4" CHB', value: '4" CHB' },
          { label: '5" CHB', value: '5" CHB' },
          { label: '6" CHB', value: '6" CHB' }
        ];
      case 'Sand':
        return [
          { label: 'Cubic Meter (m³)', value: 'm³' },
          { label: 'Cubic Yard (yd³)', value: 'yd³' }
        ];
      case 'Gravel':
        return [
          { label: 'Gravel 3/8" - Cubic Meter (m³)', value: '3/8" m³' },
          { label: 'Gravel 1/2" - Cubic Meter (m³)', value: '1/2" m³' },
          { label: 'Gravel 3/4" - Cubic Meter (m³)', value: '3/4" m³' },
          { label: 'Gravel 1" - Cubic Meter (m³)', value: '1" m³' },
          { label: 'Gravel 3/8" - Cubic Yard (yd³)', value: '3/8" yd³' },
          { label: 'Gravel 1/2" - Cubic Yard (yd³)', value: '1/2" yd³' },
          { label: 'Gravel 3/4" - Cubic Yard (yd³)', value: '3/4" yd³' },
          { label: 'Gravel 1" - Cubic Yard (yd³)', value: '1" yd³' }
        ];
      case 'Steel':
        return [
          { label: '8mm Rebar', value: '8mm' },
          { label: '10mm Rebar', value: '10mm' },
          { label: '12mm Rebar', value: '12mm' },
          { label: '16mm Rebar', value: '16mm' },
          { label: '20mm Rebar', value: '20mm' },
          { label: '25mm Rebar', value: '25mm' }
        ];
      default:
        return [
          { label: 'Per Piece', value: 'pcs' },
          { label: 'Per Cubic Meter', value: 'm³' }
        ];
    }
  };

  const [availableUnits, setAvailableUnits] = useState(getUnitsForCategory(''));
  
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
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      toaster.create({
        title: 'Error',
        description: 'Failed to fetch products',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toaster.create({
        title: 'Validation Error',
        description: 'Product name is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (!formData.category) {
      toaster.create({
        title: 'Validation Error',
        description: 'Category is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (!formData.unit) {
      toaster.create({
        title: 'Validation Error',
        description: 'Unit is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      const submitData: CreateProductRequest | UpdateProductRequest = { 
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity)
      };
      
      if (imageFile) {
        submitData.image = imageFile;
      }

      if (isEditing && selectedProduct) {
        await productService.updateProduct(selectedProduct.id, submitData as UpdateProductRequest);
        toaster.create({
          title: 'Success',
          description: 'Product updated successfully',
          type: 'success',
          duration: 3000,
        });
      } else {
        await productService.createProduct(submitData as CreateProductRequest);
        toaster.create({
          title: 'Success',
          description: 'Product created successfully',
          type: 'success',
          duration: 3000,
        });
      }
      
      resetForm();
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Product save error:', err);
      toaster.create({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save product',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productService.deleteProduct(id);
      toaster.create({
        title: 'Success',
        description: 'Product deleted successfully',
        type: 'success',
        duration: 3000,
      });
      fetchProducts();
    } catch (err) {
      toaster.create({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete product',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    const category = product.category || '';
    setFormData({
      name: product.name,
      description: product.description || '',
      category: category,
      unit: product.unit,
      stock_quantity: product.stock_quantity,
      price: product.price,
      is_active: product.is_active
    });
    setAvailableUnits(getUnitsForCategory(category));
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    setAvailableUnits(getUnitsForCategory(''));
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      unit: '',
      stock_quantity: 0,
      price: 0,
      is_active: true
    });
    setImageFile(null);
    setSelectedProduct(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  return (
    <Box className="admin-container">
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
                  Product Management
                </Heading>
                <Text className="admin-subtitle">
                  Manage your inventory, add new products, and track stock levels.
                </Text>
              </Box>

              {error && (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Title>Error</Alert.Title>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Root>
              )}

              {/* Product Management Section */}
              <Box className="admin-section">
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading className="admin-section-title" size="lg">
                    Products
                  </Heading>
                  <Button 
                    className="admin-action-button"
                    onClick={handleAdd}
                  >
                    Add Product
                  </Button>
                </Flex>
                
                <Box className="admin-table-container" overflowX="auto">
                  {loading ? (
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center" 
                      justifyContent="center" 
                      py={12}
                    >
                      <Spinner size="md" color="#3182ce" />
                      <Text mt={3} color="#718096" fontSize="sm">Loading products...</Text>
                    </Box>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Unit</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              {product.image_url ? (
                                <img
                                  src={product.image_url.startsWith('http') ? product.image_url : API_ENDPOINTS.image(product.image_url)}
                                  alt={product.name}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'cover',
                                    borderRadius: '8px'
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Box
                                  boxSize="50px"
                                  bg="#f7fafc"
                                  borderRadius="md"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Text fontSize="xs" color="#718096">No Image</Text>
                                </Box>
                              )}
                            </td>
                            <td className="admin-table-cell-bold">{product.name}</td>
                            <td>{product.category || 'N/A'}</td>
                            <td>₱{product.price.toFixed(2)}</td>
                            <td>
                              <Text color={product.stock_quantity < 10 ? '#e53e3e' : '#2d3748'}>
                                {product.stock_quantity}
                              </Text>
                            </td>
                            <td>{product.unit}</td>
                            <td>
                              <Badge 
                                className={`admin-badge-${
                                  product.is_active ? 'green' : 'orange'
                                }`}
                              >
                                {product.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>
                              <HStack gap={2}>
                                <Button 
                                  className="admin-action-button"
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEdit(product)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  colorScheme="red"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  Delete
                                </Button>
                              </HStack>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Box>
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
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Heading className="admin-section-title" size="lg">
                {isEditing ? 'Edit Product' : 'Add New Product'}
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
                  <Box width="100%">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Product Name *</Text>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </Box>

                  <Box width="100%">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Description</Text>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter product description"
                      rows={3}
                    />
                  </Box>

                  <HStack width="100%" gap={4}>
                    <Box flex="1">
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>Category</Text>
                      <SelectRoot 
                        collection={createListCollection({ items: categories })}
                        value={formData.category ? [formData.category] : []} 
                        onValueChange={(details) => {
                          const newCategory = details.value?.[0] ?? '';
                          setFormData({ 
                            ...formData, 
                            category: newCategory,
                            unit: '' // Reset unit when category changes
                          });
                          setAvailableUnits(getUnitsForCategory(newCategory));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} item={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Box>

                    <Box flex="1">
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>Unit</Text>
                      <SelectRoot 
                        collection={createListCollection({ items: availableUnits })}
                        value={formData.unit ? [formData.unit] : []} 
                        onValueChange={(details) => setFormData({ ...formData, unit: details.value?.[0] ?? '' })}
                        disabled={!formData.category}
                      >
                        <SelectTrigger>
                          <SelectValueText 
                            placeholder={formData.category ? "Select unit" : "Select category first"} 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUnits.map((unit) => (
                            <SelectItem key={unit.value} item={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Box>
                  </HStack>

                  <HStack width="100%" gap={4}>
                    <Box flex="1">
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>Price (₱) *</Text>
                      <Input
                        type="number"
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ 
                            ...formData, 
                            price: value === '' ? 0 : parseFloat(value) || 0 
                          });
                        }}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </Box>

                    <Box flex="1">
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>Stock Quantity</Text>
                      <Input
                        type="number"
                        value={formData.stock_quantity === 0 ? '' : formData.stock_quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ 
                            ...formData, 
                            stock_quantity: value === '' ? 0 : parseInt(value) || 0 
                          });
                        }}
                        placeholder="0"
                        min="0"
                      />
                    </Box>
                  </HStack>

                  <Box width="100%">
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Product Image</Text>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      p={1}
                    />
                  </Box>

                  <HStack width="100%" justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight="semibold">Active</Text>
                    <Switch.Root
                      checked={formData.is_active}
                      onCheckedChange={(details) => setFormData({ ...formData, is_active: details.checked })}
                    >
                      <Switch.Thumb />
                    </Switch.Root>
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
                  {isEditing ? 'Update' : 'Create'} Product
                </Button>
              </Flex>
            </form>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdminProduct;