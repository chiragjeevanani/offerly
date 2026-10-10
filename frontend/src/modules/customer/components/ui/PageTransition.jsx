import { motion } from 'framer-motion';

// Opacity only, and short: translating the whole page on every navigation adds a
// visible slide on top of the route change and makes taps feel delayed.
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.12, ease: 'easeOut' }}
    className="h-full"
  >
    {children}
  </motion.div>
);

export default PageTransition;
