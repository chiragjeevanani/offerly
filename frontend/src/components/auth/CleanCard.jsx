import { motion } from 'framer-motion';

const CleanCard = ({ 
  children, 
  className = '',
  showHeader = true,
  title = 'Offerly — Secure Access'
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`w-full max-w-[500px] bg-white rounded-md shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-200 overflow-hidden ${className}`}
    >
      {showHeader && (
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>
          <div className="ml-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </div>
        </div>
      )}
      
      {children}
    </motion.div>
  );
};

export default CleanCard;
