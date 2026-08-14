import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

const RejectionReasonModal = ({ isOpen, merchantName, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const maxLength = 500;
  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason(''); // Reset for next use
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rejection-modal-title"
          aria-describedby="rejection-modal-description"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <WarningRoundedIcon className="text-red-600" sx={{ fontSize: 24 }} />
                </div>
                <div>
                  <h2 id="rejection-modal-title" className="text-xl font-black text-gray-900 leading-tight">
                    Reject {merchantName}?
                  </h2>
                  <p id="rejection-modal-description" className="text-xs text-gray-500 font-medium mt-0.5">
                    This action will notify the merchant
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-red-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Close modal"
              >
                <CloseRoundedIcon className="text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8">
              <label 
                htmlFor="rejection-reason"
                className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3"
              >
                Rejection Reason (Optional)
              </label>
              <textarea
                id="rejection-reason"
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, maxLength))}
                placeholder="Provide a reason for rejection to help the merchant understand..."
                rows="5"
                maxLength={maxLength}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-4 text-gray-800 font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all"
                aria-describedby="rejection-reason-help rejection-reason-count"
              />
              <div className="flex items-center justify-between mt-2">
                <p id="rejection-reason-help" className="text-xs text-gray-400 italic">
                  This message will be shown to the merchant
                </p>
                <span 
                  id="rejection-reason-count"
                  className={`text-xs font-bold ${reason.length >= maxLength ? 'text-red-600' : 'text-gray-400'}`}
                  aria-live="polite"
                >
                  {reason.length}/{maxLength}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                aria-label="Cancel rejection"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all uppercase tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Confirm merchant rejection"
              >
                Confirm Rejection
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RejectionReasonModal;
