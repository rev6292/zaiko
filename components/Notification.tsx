import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

export interface NotificationProps {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: (id: number) => void;
  duration?: number;
}

const icons = {
  success: <CheckCircleIcon className="h-6 w-6 text-white" />,
  error: <ExclamationTriangleIcon className="h-6 w-6 text-white" />,
  info: <InformationCircleIcon className="h-6 w-6 text-white" />,
};

const bgColors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const Notification: React.FC<NotificationProps> = ({ id, message, type, onClose, duration = 5000 }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Allow time for exit animation
  };

  return (
    <div
      className={`flex items-start w-full max-w-sm p-4 my-2 text-white rounded-lg shadow-lg transition-all duration-300 transform ${bgColors[type]} ${
        exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
      role="alert"
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="ml-3 mr-2 text-sm font-medium flex-grow">{message}</div>
      <button
        onClick={handleClose}
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex h-8 w-8 rounded-lg hover:bg-white/20 focus:ring-2 focus:ring-white/50"
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Notification;