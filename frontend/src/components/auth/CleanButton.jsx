import { motion } from 'framer-motion';

const CleanButton = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'right',
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'bg-primary-700 text-white hover:bg-primary-800 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'bg-transparent border-2 border-primary-700 text-primary-700 hover:bg-primary-50',
  };

  const sizes = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-[15px]',
    lg: 'h-14 px-8 text-base',
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={!isDisabled ? { y: -1 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-semibold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon sx={{ fontSize: 18 }} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon sx={{ fontSize: 18 }} />}
        </>
      )}
    </motion.button>
  );
};

export default CleanButton;
