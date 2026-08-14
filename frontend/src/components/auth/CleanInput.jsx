const CleanInput = ({
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helperText,
  name,
  className = '',
  ...props
}) => {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon sx={{ fontSize: 20 }} />
          </div>
        )}
        
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full h-12 bg-[#FAFBFC] border rounded-md px-4 text-[15px] text-gray-900 placeholder:text-gray-400
                     focus:bg-white focus:border-primary-700 focus:ring-4 focus:ring-primary-700/10 focus:outline-none
                     transition-all duration-200
                     ${Icon ? 'pl-12' : 'pl-4'}
                     ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200'}`}
          {...props}
        />
      </div>
      
      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}
      
      {!error && helperText && (
        <p className="text-xs text-gray-500 mt-1.5">{helperText}</p>
      )}
    </div>
  );
};

export default CleanInput;
