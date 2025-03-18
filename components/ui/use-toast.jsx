"use client";

import React, { createContext, useContext, useState } from "react";
import { X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = ({ title, description, variant = "default", duration = 5000 }) => {
    const id = Date.now().toString();
    const newToast = { id, title, description, variant, duration };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    if (duration !== Infinity) {
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
      }, duration);
    }
    
    return id;
  };

  const dismissToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismissToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 z-50 max-h-screen overflow-hidden pointer-events-none flex flex-col-reverse gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const { id, title, description, variant } = toast;
  
  const variantClasses = {
    default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    destructive: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500 dark:text-red-400",
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-500 dark:text-green-400",
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg ${variantClasses[variant] || variantClasses.default} animate-in slide-in-from-bottom-5`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-1">
            {title && <div className="font-medium">{title}</div>}
            {description && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</div>}
          </div>
          <button
            onClick={onDismiss}
            className="ml-4 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// For easy integration with _app.jsx or layout.jsx
export const Toaster = () => {
  const { toast, dismissToast } = useContext(ToastContext) || { 
    toast: () => {}, 
    dismissToast: () => {} 
  };
  
  return (
    <ToastContainer 
      toasts={[]} 
      dismissToast={dismissToast} 
    />
  );
}; 