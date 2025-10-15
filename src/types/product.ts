export interface Product {
  id: number;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  stock_quantity: number;
  price: number;
  minimum_order?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  stock_quantity?: number;
  price: number;
  is_active?: boolean;
  image?: File;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  stock_quantity?: number;
  price?: number;
  is_active?: boolean;
  image?: File;
}

export interface GetProductsParams {
  skip?: number;
  limit?: number;
  category?: string;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}