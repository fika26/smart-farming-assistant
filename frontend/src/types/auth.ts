export interface User {
  id: string;
  full_name: string;
  email: string;
  farm_name: string;
  location: string | null;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  farm_name: string;
  location?: string | null;
}

export interface ForgotPasswordResult {
  message: string;
  email_delivery_configured: boolean;
  prototype_reset_token: string | null;
}
