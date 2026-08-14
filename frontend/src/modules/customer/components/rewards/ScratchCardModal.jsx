import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SparklesIcon from '@mui/icons-material/AutoAwesomeRounded';
import toast from 'react-hot-toast';

const ScratchCardModal = ({ isOpen, card, onClose, onScratched }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [isRevealed, setIsRevealed] = useState(card?.status === 'scratched');
  const [copied, setCopied] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(card?.status === 'scratched' ? 100 : 0);

  const reward = card?.rewardSnapshot || {};

  useEffect(() => {
    if (!isOpen || !card) return;

    const alreadyScratched = card.status === 'scratched';
    setIsRevealed(alreadyScratched);
    setScratchProgress(alreadyScratched ? 100 : 0);
    setCopied(false);

    if (alreadyScratched) return;

    // Initialize Canvas after modal mounts
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio || 320 * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio || 220 * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Draw premium Offerly scratch coating (Green & Gold gradient with sparkles)
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, '#5EB929');
      gradient.addColorStop(0.5, '#489A1B');
      gradient.addColorStop(1, '#2E6312');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Add shimmer pattern/lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let i = -rect.height; i < rect.width + rect.height; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + rect.height, rect.height);
        ctx.stroke();
      }

      // Scratch instructions text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨ SCRATCH HERE ✨', rect.width / 2, rect.height / 2 - 10);

      ctx.font = '500 12px Poppins, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(`Level ${card.milestoneLevel} Milestone Reward`, rect.width / 2, rect.height / 2 + 16);
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, card]);

  // Scratch handler
  const scratch = (clientX, clientY) => {
    if (isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (isDrawing.current && lastPos.current.x) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    lastPos.current = { x, y };

    // Calculate percentage scratched
    calculateProgress();
  };

  const calculateProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    // Sample every 16th pixel for performance
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    const totalSampled = pixels.length / 16;
    const percent = Math.round((transparentPixels / totalSampled) * 100);
    setScratchProgress(percent);

    // Auto reveal when 45% scratched
    if (percent > 45 && !isRevealed) {
      triggerFullReveal();
    }
  };

  const triggerFullReveal = () => {
    setIsRevealed(true);
    setScratchProgress(100);

    // Trigger Confetti Burst!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#5EB929', '#7AD032', '#FBBF24', '#FFFFFF'],
      });
    } catch (e) {
      console.error(e);
    }

    if (onScratched && card?.status !== 'scratched') {
      onScratched(card._id);
    }
  };

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    lastPos.current = { x: 0, y: 0 };
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    lastPos.current = { x: 0, y: 0 };
  };

  const handleTouchStart = (e) => {
    isDrawing.current = true;
    lastPos.current = { x: 0, y: 0 };
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDrawing.current) return;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleCopyCode = () => {
    if (!reward?.couponCode) return;
    navigator.clipboard.writeText(reward.couponCode);
    setCopied(true);
    toast.success('Coupon code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !card) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 overflow-hidden border border-gray-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                  Level {card.milestoneLevel} Milestone
                </span>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">
                  {card.milestoneName || 'Milestone Reward'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            >
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Scratch Surface Area */}
          <div className="relative w-full h-[220px] rounded-2xl overflow-hidden shadow-inner border border-gray-100 select-none touch-none bg-gradient-to-br from-amber-50 to-emerald-50">
            {/* UNDERNEATH REWARD CONTENT */}
            <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center space-y-2">
              <motion.div
                animate={isRevealed ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm"
              >
                <CardGiftcardRoundedIcon sx={{ fontSize: 32 }} />
              </motion.div>

              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-sm">
                {reward.discountType === 'percentage'
                  ? `${reward.discountValue}% OFF`
                  : reward.discountType === 'flat'
                  ? `₹${reward.discountValue} OFF`
                  : reward.discountType || 'SPECIAL OFFER'}
              </span>

              <h4 className="text-base font-bold text-gray-900 line-clamp-1">{reward.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2 px-2">
                {reward.description || 'Show coupon code at merchant store to redeem your milestone perk.'}
              </p>
            </div>

            {/* CANVAS SCRATCH LAYER */}
            {!isRevealed && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-pointer z-10"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              />
            )}
          </div>

          {/* Bottom Card Actions */}
          <div className="mt-5 space-y-3">
            {isRevealed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Coupon Code</p>
                    <p className="text-sm font-bold text-gray-900 font-mono tracking-wider">
                      {reward.couponCode || 'CLAIMED'}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-xs font-semibold text-gray-700 rounded-xl shadow-sm hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                  >
                    {copied ? (
                      <>
                        <CheckRoundedIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-primary text-white text-sm font-semibold rounded-2xl shadow-md hover:bg-primary-dark transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500">
                  <SparklesIcon sx={{ fontSize: 15 }} className="text-primary" />
                  Scratch the card to reveal your reward! ({scratchProgress}%)
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-200 rounded-full"
                    style={{ width: `${scratchProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScratchCardModal;
