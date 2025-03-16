import { AxiosError } from 'axios';
import { NOTIFICATION_MESSAGES } from './notification-context';

/**
 * Error categories for better error handling and messaging
 */
export enum ErrorCategory {
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  CONNECTION = 'CONNECTION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Maps HTTP status codes to error categories
 */
const mapStatusToCategory = (status?: number): ErrorCategory => {
  if (!status) return ErrorCategory.UNKNOWN;
  
  switch (status) {
    case 404:
      return ErrorCategory.NOT_FOUND;
    case 429:
      return ErrorCategory.RATE_LIMIT;
    case 400:
    case 422:
      return ErrorCategory.VALIDATION;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCategory.SERVER;
    default:
      return ErrorCategory.UNKNOWN;
  }
};

/**
 * Maps error types to user-friendly notification messages
 */
const getMessageForCategory = (category: ErrorCategory, context?: string): string => {
  switch (category) {
    case ErrorCategory.NOT_FOUND:
      return context === 'wallet' 
        ? NOTIFICATION_MESSAGES.WALLET_NOT_FOUND 
        : 'The requested resource could not be found.';
    case ErrorCategory.RATE_LIMIT:
      return NOTIFICATION_MESSAGES.API_RATE_LIMIT;
    case ErrorCategory.CONNECTION:
      return NOTIFICATION_MESSAGES.CONNECTION_ERROR;
    case ErrorCategory.VALIDATION:
      return context === 'wallet' 
        ? NOTIFICATION_MESSAGES.INVALID_ADDRESS 
        : 'Please check your input and try again.';
    case ErrorCategory.SERVER:
      return NOTIFICATION_MESSAGES.SERVER_ERROR;
    case ErrorCategory.UNKNOWN:
    default:
      return NOTIFICATION_MESSAGES.DATA_FETCH_ERROR;
  }
};

/**
 * Processes an error from an API request and returns an appropriate user message
 * 
 * @param error The error object from the catch block
 * @param context Optional context to provide more specific error messages
 * @returns A user-friendly error message
 */
export function handleApiError(error: unknown, context?: string): string {
  // Handle Axios errors specifically
  if (error instanceof AxiosError) {
    // Network errors (no response)
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return NOTIFICATION_MESSAGES.CONNECTION_ERROR;
    }
    
    // Server returned an error status
    if (error.response) {
      const category = mapStatusToCategory(error.response.status);
      return getMessageForCategory(category, context);
    }
  }
  
  // Handle general errors
  if (error instanceof Error) {
    // Check error message for common patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('not found') || message.includes('404')) {
      return getMessageForCategory(ErrorCategory.NOT_FOUND, context);
    }
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return getMessageForCategory(ErrorCategory.RATE_LIMIT, context);
    }
    
    if (message.includes('network') || message.includes('connection') || 
        message.includes('timeout') || message.includes('offline')) {
      return getMessageForCategory(ErrorCategory.CONNECTION, context);
    }
    
    if (message.includes('invalid') || message.includes('validation')) {
      return getMessageForCategory(ErrorCategory.VALIDATION, context);
    }
    
    if (message.includes('server error') || message.includes('500')) {
      return getMessageForCategory(ErrorCategory.SERVER, context);
    }
  }
  
  // Default fallback message
  return NOTIFICATION_MESSAGES.DATA_FETCH_ERROR;
} 