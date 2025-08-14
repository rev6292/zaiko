import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import Notification, { NotificationProps } from '../components/Notification';

interface NotificationState extends Omit<NotificationProps, 'onClose'> {}

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

let idCounter = 0;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const newId = idCounter++;
    setNotifications(prev => [...prev, { id: newId, message, type }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-5 right-5 z-[100] w-full max-w-sm">
        {notifications.map(n => (
          <Notification key={n.id} {...n} onClose={removeNotification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};