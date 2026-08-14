import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { servicePlanAPI } from '../../../api/servicePlan.api';

const ServicePlanSelector = ({ 
  selectedPlanId, 
  onSelect, 
  onCreateNew 
}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await servicePlanAPI.getAll();
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Load plans error:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    onCreateNew();
  };

  const selectedPlan = plans.find(p => p._id === selectedPlanId);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400 font-medium">Loading service plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="merchant-label">Select Service Plan *</label>

      {/* Existing Plans Dropdown */}
      {!showCreateForm && (
        <div className="space-y-3">
          <select
            value={selectedPlanId || ''}
            onChange={(e) => {
              if (e.target.value === 'create_new') {
                handleCreateNew();
              } else {
                onSelect(e.target.value);
              }
            }}
            className="merchant-input"
          >
            <option value="">Select existing plan...</option>
            {plans.map((plan) => (
              <option key={plan._id} value={plan._id}>
                {plan.name} - ₹{plan.basePrice}/{plan.duration}
              </option>
            ))}
            <option value="create_new" className="font-bold text-primary">
              + Create New Plan
            </option>
          </select>

          {/* Create New Button (Alternative) */}
          {plans.length === 0 && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-primary hover:text-primary transition-colors"
            >
              <AddRoundedIcon sx={{ fontSize: 20 }} />
              <span className="font-bold text-sm uppercase tracking-wider">Create Your First Plan</span>
            </button>
          )}
        </div>
      )}

      {/* Selected Plan Display */}
      {selectedPlan && !showCreateForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-primary/20 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircleRoundedIcon className="text-primary" sx={{ fontSize: 20 }} />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Selected Plan</span>
          </div>

          <div className="flex items-start gap-4">
            {/* Plan Icon */}
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-white shadow-md">
              <SpaRoundedIcon sx={{ fontSize: 32 }} className="text-primary" />
            </div>

            {/* Plan Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-lg leading-tight">
                {selectedPlan.name}
              </h4>
              
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xl font-mono font-bold text-gray-900">
                  ₹{selectedPlan.basePrice}
                </span>
                {selectedPlan.duration && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                    <span>{selectedPlan.duration}</span>
                  </div>
                )}
              </div>

              {selectedPlan.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {selectedPlan.description}
                </p>
              )}

              {selectedPlan.inclusions && selectedPlan.inclusions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedPlan.inclusions.slice(0, 3).map((item, idx) => (
                    <span 
                      key={idx}
                      className="text-xs bg-white text-gray-600 px-2 py-1 rounded-md border border-gray-200"
                    >
                      ✓ {item}
                    </span>
                  ))}
                  {selectedPlan.inclusions.length > 3 && (
                    <span className="text-xs text-gray-400 px-2 py-1">
                      +{selectedPlan.inclusions.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Change Button */}
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="px-4 py-2 bg-white text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors border border-gray-200"
            >
              Change
            </button>
          </div>
        </motion.div>
      )}

      {/* Create New Plan Indicator */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <AddRoundedIcon className="text-blue-600" sx={{ fontSize: 24 }} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-blue-900">Creating New Service Plan</h4>
              <p className="text-sm text-blue-600 mt-0.5">Fill in the details below</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                onSelect(null);
              }}
              className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ServicePlanSelector;
