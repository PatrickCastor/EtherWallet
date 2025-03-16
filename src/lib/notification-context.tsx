"use client"

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Toast } from '@/components/ui/toast'

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'default'

export interface Notification {
  id: string
  message: string
  type: NotificationType
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (message: string, type?: NotificationType, duration?: number) => string
  hideNotification: (id: string) => void
  clearAllNotifications: () => void
}

// Create predefined notification messages for consistent user experience
export const NOTIFICATION_MESSAGES = {
  // Success messages
  WALLET_DATA_LOADED: "Wallet data loaded successfully.",
  TRANSACTION_SAVED: "Transaction data saved successfully.",
  CONNECTION_ESTABLISHED: "Connection established successfully.",
  DATA_REFRESHED: "Data refreshed successfully.",
  ADDRESS_COPIED: "Wallet address copied to clipboard.",
  
  // Error messages
  WALLET_NOT_FOUND: "This wallet address could not be found or has no transactions.",
  INVALID_ADDRESS: "Please enter a valid Ethereum wallet address.",
  API_RATE_LIMIT: "We've reached our request limit. Please try again in a minute.",
  CONNECTION_ERROR: "Unable to connect to the blockchain explorer. Please try again later.",
  SERVER_ERROR: "Server error occurred. Please try again later.",
  DATA_FETCH_ERROR: "Error fetching data. Please try again.",
  
  // Warning messages
  LOW_BALANCE: "This wallet has a low balance.",
  NETWORK_SLOW: "Network connection is slow. Data may take longer to load.",
  LARGE_DATASET: "Large amount of transaction data. Rendering may take a moment.",
  
  // Info messages
  LOADING_DATA: "Loading blockchain data...",
  CONNECTING: "Connecting to blockchain explorer...",
  PROCESSING_TRANSACTION: "Processing transaction data...",
  WEBSOCKET_RECONNECTING: "Connection interrupted. Attempting to reconnect..."
}

// Simple ID generator without external dependencies
let notificationIdCounter = 0;
const generateId = () => `notification-${Date.now()}-${notificationIdCounter++}`;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const pathname = usePathname()
  
  // Add a ref to track the last notification timestamp for message types
  const lastNotificationTimestamps = useRef<Record<string, number>>({});
  
  // Clear notifications on route change with a slight delay
  // to allow new notifications to be created first
  useEffect(() => {
    const timeoutRef = setTimeout(() => {
      setNotifications(prev => {
        // If there are new notifications that were added right after navigation,
        // we want to keep them (they'll be very recent)
        const now = Date.now();
        const recentThreshold = 300; // 300ms threshold
        
        // First check if we have any really recent notifications (added after navigation)
        const hasRecentNotifications = prev.some(notification => {
          const notificationTime = lastNotificationTimestamps.current[`${notification.message}-${notification.type}`] || 0;
          return (now - notificationTime) < recentThreshold;
        });
        
        // If we have very recent notifications, keep them
        if (hasRecentNotifications) {
          return prev;
        }
        
        // Otherwise clear all
        return [];
      });
    }, 50); // Small delay to allow components to create new notifications
    
    return () => clearTimeout(timeoutRef);
  }, [pathname]);

  const showNotification = useCallback((message: string, type: NotificationType = 'default', duration = 5000): string => {
    const id = generateId();
    const now = Date.now();
    
    // Check if we should throttle this notification type and message
    const notificationKey = `${message}-${type}`;
    const lastTimestamp = lastNotificationTimestamps.current[notificationKey] || 0;
    const minInterval = 2000; // Minimum 2 seconds between identical notifications
    
    if (now - lastTimestamp < minInterval) {
      // Skip this notification as it's too soon after an identical one
      return id;
    }
    
    // Update timestamp for this notification type
    lastNotificationTimestamps.current[notificationKey] = now;
    
    setNotifications(prev => {
      // Check if this exact notification already exists
      const isDuplicate = prev.some(
        notification => notification.message === message && notification.type === type
      );
      
      // If it's a duplicate, don't add it
      if (isDuplicate) {
        return prev;
      }
      
      // Limit to maximum 5 notifications 
      const newNotifications = [...prev, { id, message, type, duration }];
      if (newNotifications.length > 5) {
        // Remove the oldest notification if we exceed the limit
        return newNotifications.slice(1);
      }
      return newNotifications;
    });
    
    return id;
  }, []);

  const hideNotification = useCallback((id: string): void => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const clearAllNotifications = useCallback((): void => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        hideNotification,
        clearAllNotifications
      }}
    >
      {children}
      {/* Render all active notifications */}
      {notifications.map((notification, index) => (
        <Toast
          key={notification.id}
          message={notification.message}
          variant={notification.type}
          position="top-right"
          animation="slide"
          duration={notification.duration}
          visible={true}
          index={index}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
} 