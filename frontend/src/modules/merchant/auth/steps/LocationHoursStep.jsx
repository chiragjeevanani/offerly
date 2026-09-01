import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import { cityAPI } from '../../../../api/city.api';
import toast from 'react-hot-toast';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const defaultBusinessHours = {
  monday: { open: '09:00', close: '18:00', isClosed: false },
  tuesday: { open: '09:00', close: '18:00', isClosed: false },
  wednesday: { open: '09:00', close: '18:00', isClosed: false },
  thursday: { open: '09:00', close: '18:00', isClosed: false },
  friday: { open: '09:00', close: '18:00', isClosed: false },
  saturday: { open: '09:00', close: '18:00', isClosed: false },
  sunday: { open: '09:00', close: '18:00', isClosed: false },
};

const normalizeBusinessHours = (hours = {}) =>
  days.reduce((acc, day) => {
    const incoming = hours?.[day] || {};
    acc[day] = {
      open: incoming.open ?? defaultBusinessHours[day].open,
      close: incoming.close ?? defaultBusinessHours[day].close,
      isClosed: typeof incoming.isClosed === 'boolean' ? incoming.isClosed : defaultBusinessHours[day].isClosed,
    };
    return acc;
  }, {});

const LocationHoursStep = ({ data, onSubmit, onBack, loading }) => {
  const [formData, setFormData] = useState({
    address: data.address || '',
    city: data.city || '',
    zone: data.zone || '',
    state: data.state || '',
    pincode: data.pincode || '',
    latitude: data.latitude || null,
    longitude: data.longitude || null,
    businessHours: normalizeBusinessHours(data.businessHours)
  });

  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await cityAPI.getAll();
        const realCities = (response.cities || []).filter(
          (c) => c._id && !String(c._id).startsWith('merchant-city-')
        );
        setCities(realCities);
      } catch (error) {
        toast.error('Failed to load cities');
      }
    };
    fetchCities();
  }, []);

  const selectedCityZones = useMemo(() => {
    const city = cities.find((c) => c.name === formData.city);
    return (city?.zones || []).filter((zone) => (zone.status || 'active') === 'active');
  }, [cities, formData.city]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const handleCityChange = (e) => {
    const { value } = e.target;
    setFormData({ ...formData, city: value, zone: '' });
    if (errors.city) setErrors({ ...errors, city: '' });
  };

  const handleUseLocation = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({ ...prev, latitude, longitude }));
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            if (data.address) {
               const detectedCity = data.address.city || data.address.town || data.address.village || '';
               setFormData(prev => ({
                 ...prev,
                 city: cities.some((c) => c.name === detectedCity) ? detectedCity : prev.city,
                 zone: '',
                 state: data.address.state || '',
                 pincode: data.address.postcode || ''
               }));
            }
          } catch (e) {}
          setLocationLoading(false);
          toast.success('Location synchronized');
        },
        () => {
          setLocationLoading(false);
          toast.error('Location access denied');
        }
      );
    }
  };

  const toggleDayClosed = (day) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], isClosed: !prev.businessHours[day].isClosed }
      }
    }));
  };

  const handleHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: { ...prev.businessHours[day], [field]: value }
      }
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.address.trim()) newErrors.address = 'Full address required';
    if (!formData.city) newErrors.city = 'City required';
    if (selectedCityZones.length > 0 && !formData.zone) newErrors.zone = 'Zone required';
    if (!formData.pincode) newErrors.pincode = 'Pincode required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
    else toast.error('Check entries');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-gray-200/50 border border-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EB929]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 space-y-8">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-gray-900 font-bold text-xl tracking-tight">Location & Hours</h2>
            <p className="text-gray-400 text-[10px] font-bold tracking-tight uppercase px-1">Synchronize physical presence protocol</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Geo Hub */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <MapRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 18 }} />
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Physical coordinates</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-400">Full Address</label>
                    <button type="button" onClick={handleUseLocation} disabled={locationLoading} className="text-[9px] font-bold text-[#5EB929] flex items-center gap-1.5 bg-[#5EB929]/5 px-2.5 py-1.5 rounded-xl transition-all">
                      {locationLoading ? <div className="w-2.5 h-2.5 border border-[#5EB929]/40 border-t-[#5EB929] rounded-full animate-spin" /> : <MyLocationRoundedIcon sx={{ fontSize: 12 }} />}
                      {locationLoading ? 'Locating...' : 'Auto-detect'}
                    </button>
                  </div>
                  <div className="relative group">
                    <LocationOnRoundedIcon className="absolute left-4 top-4 text-gray-300 group-focus-within:text-[#5EB929] transition-colors" sx={{ fontSize: 18 }} />
                    <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="Building, Street, Landmark..." className="w-full pl-11 pr-4 py-3.5 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all resize-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">City</label>
                    <select name="city" value={formData.city} onChange={handleCityChange} className="w-full h-12 px-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all appearance-none cursor-pointer">
                      <option value="">Select City</option>
                      {cities.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">State</label>
                    <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="w-full h-12 px-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Pincode</label>
                    <input name="pincode" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '').slice(0,6)})} placeholder="000000" className="w-full h-12 px-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all" />
                  </div>
                </div>

                {selectedCityZones.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 px-1">Zone</label>
                    <select name="zone" value={formData.zone} onChange={handleChange} className="w-full h-12 px-4 bg-background rounded-2xl border border-gray-50 text-sm font-bold outline-none focus:bg-white focus:border-[#5EB929]/30 transition-all appearance-none cursor-pointer">
                      <option value="">Select Zone</option>
                      {selectedCityZones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
                    </select>
                    <p className="text-[9px] font-bold text-gray-300 px-1">Your offers will only be shown to customers browsing this zone.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hours Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <AccessTimeRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 18 }} />
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Business hours</h3>
              </div>
              
              <div className="bg-background rounded-[2rem] p-4 md:p-6 border border-gray-50 space-y-3">
                {days.map((day) => (
                  <div key={day} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" onClick={() => toggleDayClosed(day)}
                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${formData.businessHours[day].isClosed ? 'border-gray-200 bg-white' : 'border-[#5EB929] bg-[#5EB929]'}`}
                      >
                         {!formData.businessHours[day].isClosed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>
                      <span className={`text-[11px] font-bold uppercase tracking-tight w-20 ${formData.businessHours[day].isClosed ? 'text-gray-300' : 'text-gray-700'}`}>{day}</span>
                    </div>

                    <div className="flex items-center gap-2">
                       {formData.businessHours[day].isClosed ? (
                         <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-4">Locked / Closed</span>
                       ) : (
                         <div className="flex items-center gap-1.5">
                            <input type="time" value={formData.businessHours[day].open} onChange={(e) => handleHoursChange(day, 'open', e.target.value)} className="bg-white border border-gray-100 rounded-xl px-2.5 py-1.5 text-[10px] font-bold outline-none focus:border-[#5EB929]/30 transition-all" />
                            <span className="text-[10px] font-bold text-gray-300">to</span>
                            <input type="time" value={formData.businessHours[day].close} onChange={(e) => handleHoursChange(day, 'close', e.target.value)} className="bg-white border border-gray-100 rounded-xl px-2.5 py-1.5 text-[10px] font-bold outline-none focus:border-[#5EB929]/30 transition-all" />
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-4 pt-6 border-t border-gray-50">
               <motion.button 
                 type="button" whileTap={{ scale: 0.98 }} onClick={onBack}
                 className="flex-1 h-14 bg-gray-50 text-gray-400 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-2 border border-gray-100"
               >
                 <ArrowBackRoundedIcon sx={{ fontSize: 16 }} /> Back
               </motion.button>
               <motion.button 
                 type="submit" whileTap={{ scale: 0.98 }} disabled={loading}
                 className="flex-[2] h-14 bg-[#5EB929] text-white rounded-2xl font-bold text-[12px] shadow-lg shadow-[#5EB929]/20 flex items-center justify-center gap-2"
               >
                 {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Finalize Deployment <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} /></>}
               </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LocationHoursStep;
