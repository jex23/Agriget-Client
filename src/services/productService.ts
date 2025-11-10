import { API_ENDPOINTS } from '../constants/api';
import type { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  GetProductsParams 
} from '../types/product';

class ProductService {
  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const defaultHeaders: Record<string, string> = {};
    
    if (token && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private buildFormData(data: CreateProductRequest | UpdateProductRequest): FormData {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'image' && value instanceof File) {
          formData.append('image', value);
        } else if (key === 'price' || key === 'stock_quantity') {
          formData.append(key, String(Number(value)));
        } else if (key === 'is_active') {
          formData.append(key, String(Boolean(value)));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    return formData;
  }

  async createProduct(productData: CreateProductRequest): Promise<Product> {
    const formData = this.buildFormData(productData);
    
    return this.makeRequest<Product>(API_ENDPOINTS.products, {
      method: 'POST',
      body: formData,
    });
  }

  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    let url = API_ENDPOINTS.products;

    if (params) {
      const searchParams = new URLSearchParams();

      if (params.skip !== undefined) searchParams.append('skip', String(params.skip));
      if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
      if (params.category) searchParams.append('category', params.category);
      if (params.is_active !== undefined) searchParams.append('is_active', String(params.is_active));

      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    console.log('🌐 API Endpoint:', url);
    console.log('🔍 Request params:', params);

    const products = await this.makeRequest<Product[]>(url, {
      method: 'GET',
    });

    console.log('✅ API Response - Products received:', products.length);
    console.log('📦 Raw API Response:', products);

    return products;
  }

  async getProduct(id: number): Promise<Product> {
    return this.makeRequest<Product>(API_ENDPOINTS.product(id), {
      method: 'GET',
    });
  }

  async updateProduct(id: number, productData: UpdateProductRequest): Promise<Product> {
    const formData = this.buildFormData(productData);
    
    return this.makeRequest<Product>(API_ENDPOINTS.product(id), {
      method: 'PUT',
      body: formData,
    });
  }

  async deleteProduct(id: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(API_ENDPOINTS.product(id), {
      method: 'DELETE',
    });
  }
}

export const productService = new ProductService();