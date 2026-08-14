import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const BottomSheet = ({ isOpen, onClose, title, children, height = 'auto' }) => {
  const sheetRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={height !== 'auto' ? { maxHeight: height } : {}}
            className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-3xl z-50 overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="font-semibold text-text-primary">{title}</span>
                <button onClick={onClose}>
                  <CloseRoundedIcon sx={{ fontSize: 22 }} className="text-gray-400" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: '70vh' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
