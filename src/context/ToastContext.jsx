import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toastVariants } from '../styles/motion';

const ToastContext = createContext({
  showToast: () => {},
  toast: () => {}
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const badgeType = type === 'error' ? 'danger' : type;
    const newToast = { id, message, type: badgeType };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toast: showToast }}>
      {children}
      <div id="toast-root" className="toast-root" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast badge-${t.type}`}
              layout
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
export default ToastContext;
