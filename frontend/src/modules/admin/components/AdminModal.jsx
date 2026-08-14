import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const AdminModal = ({ isOpen, onClose, title, children, footer }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-5 bg-gradient-to-r from-[#0E1015] to-[#1A1D24] border-b-4 border-primary flex items-center justify-between relative overflow-hidden">
              <h2 className="text-xl font-bold text-white relative z-10">{title}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors relative z-10"
              >
                <CloseRoundedIcon />
              </button>
            </div>
            
            <div className="px-6 py-6 overflow-y-auto flex-1">
              {children}
            </div>
            
            {footer && (
              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminModal;
