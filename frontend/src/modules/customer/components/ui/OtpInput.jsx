import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const OtpInput = ({ length = 6, onComplete, onReset }) => {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);
  const [shakeIndex, setShakeIndex] = useState(null);

  // Expose reset via parent
  useEffect(() => {
    if (onReset) {
      setValues(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [onReset, length]);

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const char = val.slice(-1);
    const newValues = [...values];
    newValues[index] = char;
    setValues(newValues);

    // Auto advance
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check complete
    const filled = newValues.every((v) => v !== '');
    if (filled) {
      onComplete?.(newValues.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newValues = [...values];
      if (values[index]) {
        newValues[index] = '';
        setValues(newValues);
      } else if (index > 0) {
        newValues[index - 1] = '';
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const newValues = Array(length).fill('');
    pasted.split('').forEach((char, i) => { newValues[i] = char; });
    setValues(newValues);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
    if (pasted.length === length) onComplete?.(pasted);
  };

  return (
    <div className="flex items-center gap-3 justify-center">
      {values.map((val, index) => (
        <motion.div
          key={index}
          animate={shakeIndex === index ? { x: [-4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.3 }}
        >
          <motion.input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            animate={{ scale: val ? 1.05 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background transition-colors outline-none
              ${val ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-primary'}
              focus:border-primary focus:ring-2 focus:ring-primary/20`}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default OtpInput;
