export interface OrderProof {
  id: number;
  order_id: number;
  image_path: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderProofRequest {
  order_id: number;
  image: File;
  remarks?: string;
}

export interface UpdateOrderProofRequest {
  image?: File;
  remarks?: string;
}

export type OrderProofResponse = OrderProof;
