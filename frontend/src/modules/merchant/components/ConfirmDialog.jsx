import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmColor = 'red' }) => {
  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative bg-white rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-sm"
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full hidden flex items-center justify-center mb-4 ${
              confirmColor === 'red' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'
            } flex mb-4`}>
              <WarningRoundedIcon sx={{ fontSize: 24 }} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6">{message}</p>

            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-white transition-colors ${
                  confirmColor === 'red' 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
                    : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmDialog;
