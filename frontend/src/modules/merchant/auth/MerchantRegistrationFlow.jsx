import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { merchantAPI } from '../../../api/merchant.api';
import ProgressBar from '../../../components/auth/ProgressBar';
import BusinessDetailsStep from './steps/BusinessDetailsStep';
import KYBDocumentsStep from './steps/KYBDocumentsStep';
import LocationHoursStep from './steps/LocationHoursStep';
import RegistrationSuccess from './steps/RegistrationSuccess';

const MerchantRegistrationFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(2); // Start from step 2 (business details)
  const [loading, setLoading] = useState(false);
  const [merchantData, setMerchantData] = useState(null);

  // Step 2: Business Details
  const [businessData, setBusinessData] = useState({
    storeName: '',
    category: '',
    storeType: 'product_based',
    description: '',
    businessEmail: '',
    businessPhone: '',
    logo: '',
    photos: []
  });

  // Step 3: KYB Documents
  const [kybData, setKybData] = useState({
    documents: [],
    gstNumber: ''
  });

  // Step 4: Location & Hours
  const [locationData, setLocationData] = useState({
    address: '',
    city: '',
    zone: '',
    state: '',
    pincode: '',
    latitude: null,
    longitude: null,
    businessHours: {
      monday: { open: '09:00', close: '18:00', isClosed: false },
      tuesday: { open: '09:00', close: '18:00', isClosed: false },
      wednesday: { open: '09:00', close: '18:00', isClosed: false },
      thursday: { open: '09:00', close: '18:00', isClosed: false },
      friday: { open: '09:00', close: '18:00', isClosed: false },
      saturday: { open: '09:00', close: '18:00', isClosed: false },
      sunday: { open: '09:00', close: '18:00', isClosed: false }
    }
  });

  // Check merchant status on mount
  useEffect(() => {
    checkMerchantStatus();
  }, []);

  const checkMerchantStatus = async () => {
    try {
      const response = await merchantAPI.getById('me');
      const merchant = response.data?.merchant || response.merchant;
      
      if (merchant) {
        setMerchantData(merchant);
        
        // Determine current step based on onboardingStep
        if (merchant.onboardingStep >= 4) {
          setCurrentStep(5); // Show success page
        } else if (merchant.onboardingStep === 3) {
          setCurrentStep(4); // Location & Hours
        } else if (merchant.onboardingStep === 2) {
          setCurrentStep(3); // KYB Documents
        } else {
          setCurrentStep(2); // Business Details
        }
      }
    } catch (error) {
      console.error('Error checking merchant status:', error);
    }
  };

  const handleBusinessDetailsSubmit = async (data) => {
    setLoading(true);
    try {
      console.log('=== SUBMITTING BUSINESS DETAILS ===');
      console.log('Data to submit:', data);
      console.log('Auth token:', localStorage.getItem('authToken'));
      
      const response = await merchantAPI.updateBusinessDetails(data);
      console.log('Business details response:', response);
      
      // Check if response exists and has success property
      if (response && response.success) {
        console.log('Success! Moving to step 3');
        setBusinessData(data);
        setMerchantData(response.merchant);
        toast.success('Business details saved successfully!');
        setCurrentStep(3);
      } else {
        // Handle case where response doesn't have expected structure
        console.log('Response does not have success property:', response);
        toast.error(response?.message || 'Failed to save business details');
      }
    } catch (error) {
      console.error('Business details error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save business details';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKYBSubmit = async (data) => {
    setLoading(true);
    try {
      console.log('=== SUBMITTING KYB DOCUMENTS ===');
      console.log('Documents to submit:', data.documents);
      
      // Validate documents before submission
      if (!data.documents || data.documents.length === 0) {
        toast.error('Please upload all required documents');
        setLoading(false);
        return;
      }

      // Check if all documents have valid URLs
      const invalidDocs = data.documents.filter(doc => !doc.url || doc.url.trim() === '');
      if (invalidDocs.length > 0) {
        console.error('Documents without URLs:', invalidDocs);
        toast.error('Some documents are missing URLs. Please re-upload them.');
        setLoading(false);
        return;
      }

      const response = await merchantAPI.updateKYBDocuments(data);
      console.log('KYB documents response:', response);
      
      if (response.success) {
        setKybData(data);
        setMerchantData(response.merchant);
        toast.success('Documents uploaded successfully!');
        setCurrentStep(4);
      } else {
        toast.error(response.message || 'Failed to upload documents');
      }
    } catch (error) {
      console.error('KYB documents error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload documents';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await merchantAPI.updateLocationHours(data);
      
      if (response.success) {
        setLocationData(data);
        setMerchantData(response.merchant);
        toast.success('Registration completed successfully!');
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Location hours error:', error);
      toast.error(error.response?.data?.message || 'Failed to save location and hours');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 2) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 2:
        return (
          <BusinessDetailsStep
            data={businessData}
            onSubmit={handleBusinessDetailsSubmit}
            onBack={() => navigate('/merchant/login')}
            loading={loading}
          />
        );
      case 3:
        return (
          <KYBDocumentsStep
            data={kybData}
            category={businessData.category}
            onSubmit={handleKYBSubmit}
            onBack={handleBack}
            loading={loading}
          />
        );
      case 4:
        return (
          <LocationHoursStep
            data={locationData}
            onSubmit={handleLocationSubmit}
            onBack={handleBack}
            loading={loading}
          />
        );
      case 5:
        return <RegistrationSuccess merchant={merchantData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        {currentStep < 5 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <div className="w-10 h-10 bg-primary-700/10 rounded-xl flex items-center justify-center">
                <span className="text-primary-700 font-bold text-lg">O</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  OFFERLY<span className="text-primary-700">BIZ</span>
                </h1>
                <p className="text-xs text-gray-500">Merchant Registration</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep - 1} of 3
                </span>
                <span className="text-sm text-gray-500">
                  {currentStep === 2 && 'Business Details'}
                  {currentStep === 3 && 'KYB Documents'}
                  {currentStep === 4 && 'Location & Hours'}
                </span>
              </div>
              <ProgressBar currentStep={currentStep - 1} totalSteps={3} />
            </div>
          </div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MerchantRegistrationFlow;
