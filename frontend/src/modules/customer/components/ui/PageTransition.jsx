import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const PageTransition = ({ children }) => (
  <AnimatePresence mode="wait">
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default PageTransition;
