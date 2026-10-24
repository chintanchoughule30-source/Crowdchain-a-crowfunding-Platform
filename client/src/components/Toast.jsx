import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const iconMap = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

const colorMap = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

const dotMap = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-indigo-500',
  warning: 'bg-amber-500',
};

const ToastItem = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-300 ${
        colorMap[type]
      } ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      <div
        className={`w-6 h-6 rounded-full ${dotMap[type]} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}
      >
        {iconMap[type]}
      </div>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-current opacity-40 hover:opacity-70 text-sm flex-shrink-0 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
};

export default ToastProvider;
