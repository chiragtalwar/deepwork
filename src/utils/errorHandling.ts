import { AuthError } from "@supabase/supabase-js";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleAuthError = (error: unknown) => {
  if (error instanceof AuthError) {
    // Handle Supabase auth errors
    return new AppError(error.message, 'AUTH_ERROR', 401);
  }
  
  // Handle other errors
  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
}; 