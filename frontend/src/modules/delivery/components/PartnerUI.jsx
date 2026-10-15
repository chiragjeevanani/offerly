import { motion } from 'framer-motion';
import { STAGE_LABEL } from '../utils/partner';

// Small building blocks shared by the delivery partner screens, in the
// customer app's look: Poppins, #5EB929, white rounded cards on #F8FAFC.

export const BrandMark = ({ subtitle = 'Delivery Partner' }) => (
  <div className="flex flex-col items-center gap-4">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-16 h-16 bg-gray-900 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-black/20 p-2.5"
    >
      <img src="/offerly-logo-ring-256.webp" alt="Offerly" className="w-full h-full object-contain" />
    </motion.div>
    <div className="text-center">
      <h1 className="text-gray-900 font-bold text-2xl tracking-tight">Offerly</h1>
      <p className="text-[#5EB929] text-[10px] font-bold uppercase tracking-[0.3em] mt-0.5">{subtitle}</p>
    </div>
  </div>
);

export const Card = ({ className = '', children, ...props }) => (
  <div className={`bg-white rounded-[1.75rem] border border-gray-50 shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

export const SectionLabel = ({ children, className = '' }) => (
  <p className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${className}`}>{children}</p>
);

export const Spinner = ({ className = 'w-5 h-5 border-white/30 border-t-white' }) => (
  <div className={`border-2 rounded-full animate-spin ${className}`} />
);

export const PrimaryButton = ({ loading, children, className = '', variant = 'green', ...props }) => {
  const look = {
    green: 'bg-[#5EB929] text-white shadow-lg shadow-[#5EB929]/25',
    dark: 'bg-gray-900 text-white shadow-lg shadow-black/20',
    light: 'bg-white text-gray-700 border border-gray-200',
    danger: 'bg-white text-red-500 border border-red-100',
  }[variant];
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      disabled={loading || props.disabled}
      className={`min-h-[52px] px-5 rounded-2xl font-bold text-[12px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${look} ${className}`}
      {...props}
    >
      {loading ? <Spinner className={variant === 'light' || variant === 'danger' ? 'w-5 h-5 border-gray-200 border-t-gray-600' : undefined} /> : children}
    </motion.button>
  );
};

export const TextField = ({ label, error, hint, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    <input
      {...props}
      className={`mt-1.5 w-full h-12 px-4 bg-[#F8FAFC] border rounded-xl text-[13px] font-semibold text-gray-900 outline-none transition-all focus:bg-white focus:border-[#5EB929]/50 focus:ring-2 focus:ring-[#5EB929]/10 ${
        error ? 'border-red-300' : 'border-gray-100'
      }`}
    />
    {error ? (
      <span className="block mt-1 text-[10px] font-bold text-red-500">{error}</span>
    ) : hint ? (
      <span className="block mt-1 text-[10px] font-medium text-gray-400">{hint}</span>
    ) : null}
  </label>
);

export const StageBadge = ({ stage }) => {
  const s = STAGE_LABEL[stage] || { label: stage, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${s.cls}`}>{s.label}</span>;
};
