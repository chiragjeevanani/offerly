import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { bookingAPI } from '../../../api/booking.api';
import toast from 'react-hot-toast';

/* ─── Premium Verification Modal ────────────────────────────────────────────── */
const BookingVerificationModal = ({ booking, onFulfill, onCancel, fulfilling }) => {
  return (
    <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validated Pass</p>
            <h2 className="text-base font-black text-gray-900 leading-none">#{booking.internalId || booking._id?.slice(-6)}</h2>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                <PersonRoundedIcon sx={{ fontSize: 20 }} />
             </div>
             <div>
                <h3 className="text-sm font-bold text-gray-900">{booking.customerName || 'Guest Customer'}</h3>
                <p className="text-[11px] text-gray-400 font-medium">Identity Verified</p>
             </div>
          </div>
          
          <div className="bg-[#F8F5FF] rounded-xl p-4 border border-gray-100">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Service Details</h4>
             <div className="space-y-2">
                {booking.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>{it.qty} × {it.product?.name || 'Product'}</span>
                    <span className="text-gray-900">₹{(it.qty * (it.product?.offerPrice || it.product?.price || 0)).toLocaleString()}</span>
                  </div>
                ))}
             </div>
             <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs font-black text-gray-900 uppercase">Collect From Customer</span>
                <span className="text-xl font-black text-[#3D7A4F]">₹{(booking.totals?.final || 0).toLocaleString()}</span>
             </div>
          </div>
        </div>

        <div className="p-5 bg-gray-50 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all">Cancel</button>
          <button 
            onClick={() => onFulfill(booking)}
            disabled={fulfilling}
            className="flex-[2] py-3 bg-[#3D7A4F] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#3D7A4F]/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
          >
            {fulfilling ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <QrCodeScannerRoundedIcon sx={{ fontSize: 18 }} />}
            Complete Fulfillment
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Main Scanner Page ─────────────────────────────────────────────────────── */
const ScannerEntry = ({ merchant }) => {
  const [passId, setPassId] = useState('');
  const [error, setError] = useState('');
  const [scannedBooking, setScannedBooking] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);

  useEffect(() => { return () => stopCamera(); }, []);

  const startCamera = async () => {
    setCameraError('');
    // Step 1: Set camera active to render the container in the DOM
    setCameraActive(true);
    
    // Step 2: Small delay to let React finish rendering the new DOM element
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scannerId = 'qr-scanner-region';
        const scannerContainer = document.getElementById(scannerId);
        
        if (!scannerContainer) {
          setCameraError('Scanner window failed to open. Please try again.');
          setCameraActive(false);
          return;
        }

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 15, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          async (decodedText) => {
            await stopCamera();
            handleQrScanned(decodedText);
          }
        );
      } catch (err) {
        console.error('Camera Start Error:', err);
        // Fallback for desktop/single-camera devices
        try {
           const { Html5Qrcode } = await import('html5-qrcode');
           const html5QrCode = new Html5Qrcode('qr-scanner-region');
           html5QrCodeRef.current = html5QrCode;
           await html5QrCode.start({ facingMode: "user" }, { fps: 15, qrbox: 250 }, async (text) => {
              await stopCamera();
              handleQrScanned(text);
           });
        } catch (retryErr) {
           setCameraError('Camera not found or permission denied.');
           setCameraActive(false);
        }
      }
    }, 200);
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {}
    setCameraActive(false);
  };

  const handleQrScanned = async (qrToken) => {
    setError(''); setSuccessMsg('');
    try {
      setSearching(true);
      const response = await bookingAPI.previewQR(qrToken);
      if (response && response.success) {
        if ('vibrate' in navigator) navigator.vibrate(200);
        setScannedBooking(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid QR code.');
    } finally { setSearching(false); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!passId.trim()) return;
    setError(''); setSuccessMsg(''); setSearching(true);
    try {
      const response = await bookingAPI.lookupByPassId(passId.trim().toUpperCase());
      if (response && response.success) {
        setScannedBooking(response.data);
        setPassId('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Pass ID not found.');
    } finally { setSearching(false); }
  };

  const handleFulfill = async (booking) => {
    setFulfilling(true);
    try {
      const res = await bookingAPI.verifyQR(booking.qrToken);
      if (res && res.success) {
        setScannedBooking(null);
        setSuccessMsg(`Booking #${booking.internalId || booking._id?.slice(-6)} fulfilled!`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) { toast.error('Verification failed'); }
    finally { setFulfilling(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F5FF] p-3 lg:p-8 -m-6 lg:-m-8">
      <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 pb-20">
        <div className="flex justify-between items-end px-1">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Scanner</p>
            </div>
            <h1 className="text-lg lg:text-2xl font-black text-gray-900 leading-tight">Booking Verification</h1>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase hidden sm:block">Fizzy Hairs • Counter 01</p>
        </div>

        <AnimatePresence>
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-green-50 text-[#3D7A4F] p-3.5 rounded-xl border border-green-100 flex items-center gap-3 font-bold shadow-sm text-xs">
              <CheckCircleRoundedIcon sx={{ fontSize: 20 }} /> {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Mobile-Optimized Scanner View */}
          <div className="bg-gray-950 rounded-2xl p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl min-h-[360px] lg:min-h-[420px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 p-4">
               <QrCodeScannerRoundedIcon className="text-white/5" sx={{ fontSize: 120 }} />
            </div>
            
            {cameraActive ? (
              <div className="relative z-10 w-full max-w-[260px]">
                <div id="qr-scanner-region" className="rounded-xl overflow-hidden border-2 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-black" />
                <button onClick={stopCamera} className="mt-6 w-full bg-red-500/10 hover:bg-red-500/20 py-3.5 rounded-xl text-red-400 font-bold text-xs border border-red-500/20 transition-all active:scale-95">
                  Stop Camera
                </button>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-44 h-44 rounded-2xl border border-white/5 flex flex-col items-center justify-center mb-8 bg-white/[0.03] relative group">
                   <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl shadow-[0_0_15px_rgba(61,122,79,0.5)]" />
                   <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl shadow-[0_0_15px_rgba(61,122,79,0.5)]" />
                   <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl shadow-[0_0_15px_rgba(61,122,79,0.5)]" />
                   <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl shadow-[0_0_15px_rgba(61,122,79,0.5)]" />
                   
                   <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-white/10">
                      <QrCodeScannerRoundedIcon sx={{ fontSize: 64 }} />
                   </motion.div>
                   <p className="mt-4 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Ready to scan</p>
                </div>
                <button 
                  onClick={startCamera} 
                  className="bg-[#3D7A4F] text-white px-10 py-4 rounded-xl font-bold text-sm shadow-[0_10px_20px_rgba(61,122,79,0.3),inset_0_-2px_4px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                   <VideocamRoundedIcon sx={{ fontSize: 20 }} />
                   Scan QR Now
                </button>
              </div>
            )}

            {searching && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center">
                 <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Verifying Pass...</p>
                 </div>
              </div>
            )}
          </div>

          {/* Manual Entry Section */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
             <div className="absolute -bottom-10 -right-10 opacity-[0.03]">
                <SearchRoundedIcon sx={{ fontSize: 200 }} />
             </div>
             <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05),0_4px_10px_rgba(0,0,0,0.05)]">
                <SearchRoundedIcon sx={{ fontSize: 22 }} />
             </div>
             <h2 className="text-lg font-black text-gray-900 mb-1">Manual Entry</h2>
             <p className="text-[11px] text-gray-400 font-medium mb-6 leading-relaxed">Enter the 6-digit ID if the QR is damaged.</p>

             <form onSubmit={handleSearch} className="space-y-4 relative z-10">
                <input 
                  type="text" value={passId} onChange={(e) => setPassId(e.target.value)}
                  placeholder="B-00000"
                  className="w-full bg-gray-50 border border-gray-100 text-center uppercase tracking-[0.2em] font-mono font-black text-xl py-4 rounded-xl focus:bg-white focus:border-primary/30 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
                <button 
                  type="submit" disabled={!passId.trim() || searching}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-[0.98] shadow-[inset_0_-2px_4px_rgba(255,255,255,0.1)]"
                >
                  Lookup Pass ID
                </button>
             </form>

             {error && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2 text-[10px] font-bold text-red-600">
                   <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} /> {error}
                </div>
             )}

             <div className="mt-6 flex gap-3 p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/30">
                <InfoOutlinedIcon sx={{ fontSize: 14 }} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider leading-relaxed">Payment must be collected before fulfilling</p>
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {scannedBooking && (
          <BookingVerificationModal 
            booking={scannedBooking} 
            onFulfill={handleFulfill}
            onCancel={() => setScannedBooking(null)}
            fulfilling={fulfilling}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScannerEntry;
