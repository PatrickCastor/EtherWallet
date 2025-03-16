import { useState, useCallback } from 'react';
import { useNotification, NOTIFICATION_MESSAGES, NotificationType } from '@/lib/notification-context';
import { handleApiError } from '@/lib/error-handler';

interface ApiOptions {
  loadingMessage?: string;
  successMessage?: string;
  context?: string;
  showLoadingNotification?: boolean;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
}

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for handling API calls with integrated notifications
 * 
 * @returns Object with API state and helper methods
 */
export function useApiNotification<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null
  });
  
  const { showNotification, hideNotification } = useNotification();
  
  /**
   * Execute an API call with automatic notifications for loading, success, and error states
   * 
   * @param apiCall Promise that resolves to API response data
   * @param options Configuration options for notifications
   * @returns Promise that resolves to API response data
   */
  const executeApiCall = useCallback(async (
    apiCall: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<T | null> => {
    const {
      loadingMessage = NOTIFICATION_MESSAGES.LOADING_DATA,
      successMessage = NOTIFICATION_MESSAGES.DATA_REFRESHED,
      context,
      showLoadingNotification = true,
      showSuccessNotification = true,
      showErrorNotification = true
    } = options;
    
    // Reset state and show loading notification
    setState({ data: null, isLoading: true, error: null });
    
    // Show loading notification if enabled
    let loadingId: string | undefined;
    if (showLoadingNotification) {
      loadingId = showNotification(loadingMessage, 'info');
    }
    
    try {
      // Execute the API call
      const result = await apiCall();
      
      // Update state with successful result
      setState({ data: result, isLoading: false, error: null });
      
      // Hide loading notification if it was shown
      if (loadingId) {
        hideNotification(loadingId);
      }
      
      // Show success notification if enabled
      if (showSuccessNotification) {
        showNotification(successMessage, 'success');
      }
      
      return result;
    } catch (error) {
      // Generate appropriate error message
      const errorMessage = handleApiError(error, context);
      
      // Update state with error
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(errorMessage)
      });
      
      // Hide loading notification if it was shown
      if (loadingId) {
        hideNotification(loadingId);
      }
      
      // Show error notification if enabled
      if (showErrorNotification) {
        showNotification(errorMessage, 'error');
      }
      
      return null;
    }
  }, [showNotification, hideNotification]);
  
  return {
    ...state,
    executeApiCall
  };
} 