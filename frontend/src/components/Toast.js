import React, { useEffect } from 'react';
import '../Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  console.log('Toast rendering:', { message, type, duration });

  useEffect(() => {
    console.log('Toast mounted with message:', message);
    const timer = setTimeout(() => {
      console.log('Toast auto-closing');
      onClose();
    }, duration);

    return () => {
      console.log('Toast cleanup');
      clearTimeout(timer);
    };
  }, [duration, onClose, message]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      case 'warning':
        return '⚠';
      default:
        return '✓';
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

export default Toast;
