import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../../customer/context/AppContext';
import { mockCategories } from '../../customer/data/mockData';
import { merchantAPI } from '../../../api/merchant.api';
import { adminAPI } from '../../../api/admin.api';
import { categoryAPI } from '../../../api/category.api';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import toast from 'react-hot-toast';

const StoreRegistration = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef(null);
  const [cities, setCities] = useState([]);
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);

  // Check if merchant already registered
  useEffect(() => {
    checkExistingMerchant();
    loadCitiesAndPlans();
  }, []);

  const checkExistingMerchant = async () => {
    try {
      const response = await merchantAPI.getById('me');
      if (response.merchant) {
        const m = response.merchant;
        
        // If already submitted, keep them on status page
        if (m.onboardingStep === 'submitted') {
          navigate('/merchant/status');
          return;
        }

        // Resume from last step
        setFormData(prev => ({
          ...prev,
          ...m,
          documents: m.documents || [],
          businessHours: m.businessHours || prev.businessHours,
          bankDetails: m.bankDetails || prev.bankDetails
        }));

        // Map onboardingStep to currentStep
        if (m.onboardingStep === 'initial') setCurrentStep(1);
        else if (m.onboardingStep === 'otp_verified') setCurrentStep(1);
        else if (m.onboardingStep === 'kyb_uploaded') setCurrentStep(4); // KYB was Step 3
        else if (m.onboardingStep === 'bank_details_completed') setCurrentStep(5);
      }
    } catch (error) {
      console.log('No existing merchant found or error:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadCitiesAndPlans = async () => {
    try {
      const [citiesRes, plansRes, categoriesRes] = await Promise.all([
        adminAPI.getCities(),
        adminAPI.getPlans(),
        categoryAPI.getAll().catch(() => null)
      ]);

      setCities(citiesRes?.data || []);
      setPlans(plansRes?.data || []);
      
      // Set categories from backend or fallback to mockCategories
      if (categoriesRes?.categories) {
        setCategories(categoriesRes.categories);
      } else {
        // Fallback to mockCategories
        setCategories(mockCategories.map(cat => ({
          _id: cat.id,
          name: cat.label,
        })));
      }
    } catch (error) {
      console.error('Failed to load cities/plans:', error);
      toast.error('Failed to load platform data. Please refresh.');
      // Fallback categories
      setCategories(mockCategories.map(cat => ({
        _id: cat.id,
        name: cat.label,
      })));
    }
  };

  const [formData, setFormData] = useState({
    storeName: '',
    category: '',
    description: '',
    logo: '',
    coverImage: '',
    city: 'Golaghat',
    locality: '',
    address: '',
    phone: user?.phone || '',
    subscriptionPlanId: '', 
    documents: [],
    businessHours: {
      Monday: { open: '09:00', close: '21:00', isClosed: false },
      Tuesday: { open: '09:00', close: '21:00', isClosed: false },
      Wednesday: { open: '09:00', close: '21:00', isClosed: false },
      Thursday: { open: '09:00', close: '21:00', isClosed: false },
      Friday: { open: '09:00', close: '21:00', isClosed: false },
      Saturday: { open: '09:00', close: '22:00', isClosed: false },
      Sunday: { open: '10:00', close: '20:00', isClosed: true },
    },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      upiId: '',
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'city') {
      setFormData({ ...formData, [name]: value, locality: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if adding these files would exceed 5 documents
    if (formData.documents.length + files.length > 5) {
      toast.error('You can upload maximum 5 documents');
      return;
    }

    const validFiles = [];
    for (const file of files) {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }

      // Validate file type
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid format`);
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        validFiles.push({
          name: file.name,
          type: file.type,
          data: reader.result
        });

        // Update state when all files are processed
        if (validFiles.length === files.filter(f =>
          f.size <= 5 * 1024 * 1024 &&
          validTypes.includes(f.type)
        ).length) {
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, ...validFiles]
          }));
          toast.success(`${validFiles.length} document(s) uploaded successfully`);
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    e.target.value = '';
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
    toast.success('Document removed');
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.storeName || !formData.category) {
        toast.error('Please fill in all required fields');
        return false;
      }
      return true;
    }
    if (step === 3) {
      const requiredDocs = ['PAN', 'GST', 'Bank Proof'];
      const missing = requiredDocs.filter(label => !formData.documents.find(d => d.label === label));
      if (missing.length > 0) {
        toast.error(`Please upload: ${missing.join(', ')}`);
        return false;
      }
      return true;
    }
    if (step === 5) {
      const { bankDetails, subscriptionPlanId } = formData;
      if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName) {
        toast.error('Please fill in required bank details');
        return false;
      }
      // Indian IFSC: 4 letters, 0, then 6 alphanumeric
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(bankDetails.ifscCode)) {
        toast.error('Invalid IFSC Code format');
        return false;
      }
      if (!subscriptionPlanId) {
        toast.error('Please select a subscription plan');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      setLoading(true);
      try {
        // Save progress to backend at each major milestone
        if (currentStep === 2) {
          // Saving initial profile info
          await merchantAPI.updateOnboarding('profile', {
            storeName: formData.storeName,
            category: formData.category,
            city: formData.city,
            locality: formData.locality,
            address: formData.address,
            description: formData.description,
            logo: formData.logo,
            coverImage: formData.coverImage
          });
        } else if (currentStep === 3) {
          await merchantAPI.updateOnboarding('kyb', { documents: formData.documents });
        }
        
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        toast.error('Failed to save progress. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5)) return;

    setLoading(true);
    try {
      await merchantAPI.updateOnboarding('profile', {
        ...formData,
        bankDetails: formData.bankDetails,
        businessHours: formData.businessHours,
        subscriptionPlanId: formData.subscriptionPlanId
      });
      
      toast.success('Application Submitted Successfully!');
      navigate('/merchant/status');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking existing merchant
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary/5 to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary/5 to-gray-50 flex items-center justify-center p-4 py-8 md:py-12">
      <div className="max-w-2xl w-full">
        {/* Enhanced Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-br from-primary via-[#5EB929] to-[#2d5a3a] rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-2xl"></div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2 drop-shadow-lg">
                  🏪 Register Your Store
                </h1>
                <p className="text-white/90 font-medium text-sm md:text-base flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  Tell us about your business to get started
                </p>
              </div>
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                className="hidden md:block bg-white/20 backdrop-blur-sm p-4 rounded-2xl"
              >
                <StorefrontRoundedIcon className="text-white" sx={{ fontSize: 40 }} />
              </motion.div>
            </div>

            {/* Integrated Progress Indicator */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-[10px] md:text-sm transition-all ${currentStep === step
                        ? 'bg-white text-primary scale-110 shadow-lg'
                        : currentStep > step
                          ? 'bg-white/80 text-primary'
                          : 'bg-white/30 text-white'
                      }`}>
                      {currentStep > step ? '✓' : step}
                    </div>
                    {step < 5 && (
                      <div className={`w-4 md:w-8 h-1 mx-0.5 rounded-full transition-all ${currentStep > step ? 'bg-white' : 'bg-white/30'
                        }`} />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs md:text-sm font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full whitespace-nowrap ml-2">
                Phase {currentStep}/5
              </span>
            </div>
          </div>

          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0 h-4">
            <svg viewBox="0 0 1200 20" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,10 Q300,0 600,10 T1200,10 L1200,20 L0,20 Z" fill="white" opacity="0.1" />
            </svg>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100 space-y-6 md:space-y-8"
        >
          {/* Step 1: Store Details */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* General Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-widest pl-1 mb-2 block">Store Name *</label>
                  <div className="relative">
                    <BusinessRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
                    <input
                      type="text"
                      name="storeName"
                      value={formData.storeName}
                      onChange={handleChange}
                      placeholder="e.g. Royal Restaurant & Cafe"
                      className="w-full bg-white border-2 border-gray-400 rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all hover:border-gray-500 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-widest pl-1 mb-2 block">Category *</label>
                  <div className="relative">
                    <CategoryRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10" sx={{ fontSize: 20 }} />
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 rounded-2xl py-4 pl-12 pr-10 text-gray-900 font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer hover:border-primary/50"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233D7A4F'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.5rem'
                      }}
                    >
                      {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-widest pl-1 mb-2 block">Contact Number</label>
                  <div className="relative">
                    <PhoneRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      readOnly
                      className="w-full bg-gray-100 border-2 border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-gray-500 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* Step 2: Address Details */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <LocationOnRoundedIcon sx={{ fontSize: 16 }} /> Location Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block">City</label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-white border-2 border-gray-400 rounded-2xl py-4 px-4 pr-10 text-gray-900 font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer hover:border-gray-500"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1.5rem'
                    }}
                  >
                    {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-widest text-[10px]">Locality / Zone *</label>
                  <div className="relative">
                    <select
                      name="locality"
                      value={formData.locality}
                      onChange={handleChange}
                      className="w-full bg-white border-2 border-gray-400 rounded-2xl py-4 px-4 pr-10 text-gray-900 font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:border-gray-500 transition-all"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.5rem'
                      }}
                    >
                      <option value="">Select Zone</option>
                      {cities.find(c => c.name === formData.city)?.zones?.map(zone => (
                        <option key={zone._id || zone.id} value={zone.name}>{zone.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">Full Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Include landmark, floor number, etc."
                  className="w-full bg-white border-2 border-gray-400 rounded-2xl py-4 px-4 text-gray-800 font-bold focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none hover:border-gray-500 transition-all placeholder:text-gray-500"
                ></textarea>
              </div>
            </motion.div>
          )}

          {/* Step 3: KYB Documents */}
          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <DescriptionRoundedIcon sx={{ fontSize: 16 }} /> Business Verification (KYB)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['PAN', 'GST', 'Trade License', 'Bank Proof'].map((label) => {
                  const doc = formData.documents.find(d => d.label === label);
                  return (
                    <div key={label} className="p-4 border-2 border-gray-100 rounded-2xl bg-gray-50/50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label} *</p>
                      {doc ? (
                        <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-primary/20">
                           <div className="flex items-center gap-2 overflow-hidden">
                             <CheckCircleRoundedIcon className="text-primary" sx={{fontSize: 16}} />
                             <span className="text-xs font-bold text-gray-700 truncate">{doc.name}</span>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => setFormData(prev => ({ ...prev, documents: prev.documents.filter(d => d.label !== label)}))}
                             className="p-1 hover:text-red-500 transition-colors"
                           >
                             <CloseRoundedIcon sx={{fontSize: 14}} />
                           </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-4 bg-white hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData(prev => ({
                                  ...prev,
                                  documents: [...prev.documents, { name: file.name, type: file.type, data: reader.result, label }]
                                }));
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                          <CloudUploadRoundedIcon className="text-gray-300 mb-1" sx={{fontSize: 24}} />
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Upload {label}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 4: Business Hours */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <AccessTimeRoundedIcon sx={{ fontSize: 16 }} /> Store Operating Hours
              </h3>
              
              <div className="space-y-3">
                {Object.keys(formData.businessHours).map((day) => (
                  <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl bg-gray-50/30 gap-3">
                    <span className="text-sm font-bold text-gray-700 w-24">{day}</span>
                    <div className="flex items-center gap-4">
                       {!formData.businessHours[day].isClosed ? (
                         <div className="flex items-center gap-2">
                           <input 
                             type="time" 
                             value={formData.businessHours[day].open}
                             onChange={(e) => setFormData(prev => ({
                               ...prev,
                               businessHours: { ...prev.businessHours, [day]: { ...prev.businessHours[day], open: e.target.value }}
                             }))}
                             className="bg-white border rounded-lg px-2 py-1 text-xs font-bold"
                           />
                           <span className="text-gray-400 text-xs">-</span>
                           <input 
                             type="time" 
                             value={formData.businessHours[day].close}
                             onChange={(e) => setFormData(prev => ({
                               ...prev,
                               businessHours: { ...prev.businessHours, [day]: { ...prev.businessHours[day], close: e.target.value }}
                             }))}
                             className="bg-white border rounded-lg px-2 py-1 text-xs font-bold"
                           />
                         </div>
                       ) : (
                         <span className="text-xs font-bold text-red-500 uppercase tracking-widest px-4">Closed</span>
                       )}
                       
                       <button
                         type="button"
                         onClick={() => setFormData(prev => ({
                           ...prev,
                           businessHours: { ...prev.businessHours, [day]: { ...prev.businessHours[day], isClosed: !prev.businessHours[day].isClosed }}
                         }))}
                         className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all ${
                           formData.businessHours[day].isClosed ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-200'
                         }`}
                       >
                         {formData.businessHours[day].isClosed ? 'Open' : 'Close Day'}
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 5: Bank Details & Plan */}
          {currentStep === 5 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <AccountBalanceRoundedIcon sx={{ fontSize: 16 }} /> Payout & Bank Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                   <label className="text-xs font-bold text-gray-600 mb-2 block px-1 uppercase tracking-widest text-[10px]">Account Holder Name *</label>
                   <div className="relative">
                     <BadgeRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{fontSize: 18}} />
                     <input 
                       type="text" 
                       value={formData.bankDetails.accountHolderName}
                       onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountHolderName: e.target.value }}))}
                       className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold outline-none focus:border-primary transition-all"
                       placeholder="As per bank records"
                     />
                   </div>
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-600 mb-2 block px-1 uppercase tracking-widest text-[10px]">Bank Name</label>
                   <input 
                     type="text" 
                     value={formData.bankDetails.bankName}
                     onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, bankName: e.target.value }}))}
                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold outline-none focus:border-primary transition-all"
                     placeholder="e.g. HDFC Bank"
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-600 mb-2 block px-1 uppercase tracking-widest text-[10px]">Account Number *</label>
                   <input 
                     type="text" 
                     value={formData.bankDetails.accountNumber}
                     onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, accountNumber: e.target.value.replace(/\D/g, '') }}))}
                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold outline-none focus:border-primary transition-all tracking-widest"
                     placeholder="0000 0000 0000"
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-600 mb-2 block px-1 uppercase tracking-widest text-[10px]">IFSC Code *</label>
                   <input 
                     type="text" 
                     value={formData.bankDetails.ifscCode}
                     onChange={(e) => setFormData(prev => ({ ...prev, bankDetails: { ...prev.bankDetails, ifscCode: e.target.value.toUpperCase() }}))}
                     className="w-full bg-white border-2 border-gray-100 rounded-2xl py-3.5 px-4 text-sm font-bold outline-none focus:border-primary transition-all tracking-widest uppercase"
                     placeholder="HDFC0001234"
                     maxLength={11}
                   />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Finalize Subscription Plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {plans.filter(p => 
                    (p.planType === 'merchant' || !p.planType) && 
                    (!p.applicableCities || p.applicableCities.length === 0 || p.applicableCities.includes(formData.city))
                  ).map((plan) => (
                    <label 
                      key={plan.id}
                      className={`cursor-pointer border-2 rounded-2xl p-4 transition-all ${
                        formData.subscriptionPlanId === plan.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-gray-100'
                      }`}
                    >
                      <input type="radio" className="hidden" name="plan" value={plan.id} onChange={() => setFormData(prev => ({...prev, subscriptionPlanId: plan.id}))} />
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase text-gray-900">{plan.name}</span>
                        {formData.subscriptionPlanId === plan.id && <CheckCircleRoundedIcon className="text-primary" sx={{fontSize: 16}} />}
                      </div>
                      <p className="text-lg font-bold text-primary">₹{plan.price} <span className="text-[10px] text-gray-400 font-bold">/ {plan.duration}</span></p>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 Footer buttons (Original content removed or adapted to Step 5) */}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 md:py-5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest text-sm md:text-base"
              >
                Back
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 btn-merchant py-4 md:py-5 text-sm md:text-base disabled:opacity-50"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Next Step'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-merchant py-4 md:py-5 text-sm md:text-base disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Submit Registration'
                )}
              </button>
            )}
          </div>
        </motion.form>
      </div>
    </div>
  );
};

export default StoreRegistration;
