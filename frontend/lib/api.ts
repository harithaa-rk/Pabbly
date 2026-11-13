import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const fieldErrors = data.errors
          .map((e: any) => e.message || `${e.field}: invalid`)
          .join(', ');
        return `${data.message} (${fieldErrors})`;
      }
      return data.message;
    }
    if (error.response?.status === 401) {
      return 'Session expired or invalid. Please sign in again.';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a few moments and try again.';
    }
    return error.message || 'An error occurred while contacting the server.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

