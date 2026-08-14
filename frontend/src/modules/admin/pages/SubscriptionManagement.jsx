import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../../api/admin.api';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import toast from 'react-hot-toast';
import SlideOver from '../components/SlideOver';

const TabButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 text-[12px] font-medium transition-all duration-300 rounded-[10px] flex items-center gap-2 ${
      isActive 
        ? 'bg-[#5EB929] text-white shadow-md' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-white/80'
    }`}
  >
    {label}
  </button>
);

const SubscriptionManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('merchant'); // 'merchant', 'advertisement'
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    price: 0, 
    duration: 'Monthly', 
    maxProducts: 5, 
    maxOffers: 5,
    features: [], 
    applicableCities: [],
    status: 'active',
    planType: 'merchant' 
  });

  const { data: citiesList = [] } = useQuery({
    queryKey: ['adminCities'],
    queryFn: async () => {
      const res = await adminAPI.getCities();
      return res.data || res.cities || [];
    }
  });

  const { data: plans = [], isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: async () => {
      const res = await adminAPI.getPlans();
      const loadedPlans = res.data?.plans || res.plans || res.data || [];
      return loadedPlans.sort((a, b) => a.price - b.price);
    }
  });

  const filteredPlans = plans.filter(p => 
    activeTab === 'merchant' ? (p.planType === 'merchant' || !p.planType) : (p.planType === 'advertisement')
  );

  const handleAdd = () => {
    setSelectedPlan(null);
    setFormData({ 
      name: '', 
      price: 0, 
      duration: 'Monthly', 
      maxProducts: 5, 
      maxOffers: 5,
      features: [{ id: 'f1', text: '' }], 
      applicableCities: [],
      status: 'active',
      planType: activeTab
    });
    setIsSlideOverOpen(true);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setFormData({ 
      ...plan, 
      applicableCities: plan.applicableCities || [],
      planType: plan.planType || 'merchant',
      features: plan.features?.length > 0 ? plan.features.map((f, i) => ({ id: `f${i}`, text: f })) : [{ id: 'f1', text: '' }]
    });
    setIsSlideOverOpen(true);
  };

  const handleDeleteClick = (plan) => {
    setSelectedPlan(plan);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      id: selectedPlan?._id || selectedPlan?.id,
      features: formData.features.map(f => f.text).filter(t => t.trim() !== '')
    };

    try {
      await adminAPI.savePlan(payload);
      toast.success(selectedPlan ? 'Plan updated successfully' : 'Plan added successfully');
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminPlans']);
    } catch (error) {
      toast.error('Failed to save plan');
    }
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deletePlan(selectedPlan._id || selectedPlan.id);
      toast.success('Plan deleted');
      setIsDeleteModalOpen(false);
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminPlans']);
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };



  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1.5">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800 tracking-tight">Plan Architecture</h1>
            <p className="text-[12px] text-gray-500 tracking-tight">Configure subscription tiers and ad packages</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[10px] border border-gray-100 transition-all text-[12px] font-medium shadow-sm active:scale-95 disabled:opacity-50"
              disabled={isFetching}
            >
              <RefreshRoundedIcon sx={{ fontSize: 16 }} className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Syncing...' : 'Sync'}
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 bg-[#5EB929] hover:bg-[#2d5a3a] text-white px-4 py-2 rounded-[10px] transition-all text-[12px] font-medium shadow-md shadow-[#5EB929]/10 active:scale-95"
            >
              <AddRoundedIcon sx={{ fontSize: 18 }} />
              Create Plan
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-1.5 bg-white/50 p-1 rounded-[12px] border border-gray-100 overflow-x-auto no-scrollbar">
            <TabButton label="Merchant Tiers" isActive={activeTab === 'merchant'} onClick={() => setActiveTab('merchant')} />
            <TabButton label="Ad Packages" isActive={activeTab === 'advertisement'} onClick={() => setActiveTab('advertisement')} />
          </div>
          
          <div className="hidden lg:block text-right">
             <p className="text-[10px] font-medium text-gray-400">Showing {filteredPlans.length} active configurations</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs tracking-widest uppercase">Loading Architecture...</p>
          </div>
        ) : filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlans.map(plan => (
              <div 
                key={plan._id || plan.id}
                onClick={() => handleEdit(plan)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#5EB929]/20 transition-all duration-300 relative overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Status Strip */}
                <div className={`h-1 w-full ${plan.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#5EB929] border border-gray-100">
                      <WorkspacePremiumRoundedIcon sx={{ fontSize: 20 }} />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      plan.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {plan.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-gray-800 mb-1">{plan.name}</h4>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(!plan.applicableCities || plan.applicableCities.length === 0) ? (
                      <span className="text-[9px] font-bold uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">Global</span>
                    ) : (
                      plan.applicableCities.map(city => (
                        <span key={city} className="text-[9px] font-bold uppercase text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{city}</span>
                      ))
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-gray-900">₹{plan.price}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">/{plan.duration}</span>
                  </div>

                  {/* Limits - Slim Style */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50/50 rounded-xl p-2 border border-gray-50 flex flex-col items-center text-center">
                       <Inventory2RoundedIcon sx={{ fontSize: 14 }} className="text-gray-400 mb-1" />
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Products</p>
                       <p className="text-[11px] font-bold text-gray-700">{plan.maxProducts === 999 ? 'Unlimited' : plan.maxProducts}</p>
                    </div>
                    <div className="bg-gray-50/50 rounded-xl p-2 border border-gray-50 flex flex-col items-center text-center">
                       <LocalOfferRoundedIcon sx={{ fontSize: 14 }} className="text-gray-400 mb-1" />
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Offers</p>
                       <p className="text-[11px] font-bold text-gray-700">{plan.maxOffers === 999 ? 'Unlimited' : plan.maxOffers}</p>
                    </div>
                  </div>

                  {/* Features List - Compact */}
                  {plan.features?.length > 0 && (
                    <div className="mt-auto pt-3 border-t border-gray-50">
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 3).map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                            <CheckCircleRoundedIcon sx={{ fontSize: 12 }} className="text-green-500 shrink-0" />
                            <span className="truncate">{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-[10px] text-primary font-bold pl-5">+{plan.features.length - 3} More Features</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Edit Indicator */}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <EditRoundedIcon sx={{ fontSize: 14 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <WorkspacePremiumRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">No Plans Configured</h3>
            <p className="text-sm text-gray-400 mt-1">Add your first subscription tier to get started</p>
          </div>
        )}
      </div>

      {/* Edit/Add SlideOver */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title={selectedPlan ? "Edit Configuration" : "New Tier Setup"}
        subtitle={selectedPlan ? `REF: ${selectedPlan._id.substring(0, 12)}` : "Deploy a new subscription tier"}
        widthClass="max-w-md"
      >
        <form onSubmit={handleSave} className="flex flex-col h-full font-sans">
          <div className="flex-1 overflow-y-auto space-y-5 pb-32 pr-1 no-scrollbar">
            
            {/* Plan Identity Section */}
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 text-[#5EB929]">
                <WorkspacePremiumRoundedIcon sx={{ fontSize: 40 }} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-800">{formData.name || 'Tier Name'}</h3>
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-widest mt-1">{formData.planType} Configuration</p>
            </div>

            {/* Core Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Plan Title</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Professional Hub"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Applicable Cities</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, applicableCities: []})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                      formData.applicableCities.length === 0 ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-400 border-gray-100'
                    }`}
                  >
                    Global (All Cities)
                  </button>
                  {citiesList.map(city => (
                    <button
                      key={city._id || city.id}
                      type="button"
                      onClick={() => {
                        const newCities = formData.applicableCities.includes(city.name)
                          ? formData.applicableCities.filter(c => c !== city.name)
                          : [...formData.applicableCities, city.name];
                        setFormData({...formData, applicableCities: newCities});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        formData.applicableCities.includes(city.name) ? 'bg-[#5EB929] text-white border-[#5EB929]' : 'bg-white text-gray-400 border-gray-100'
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-gray-400 px-1 italic">Selecting cities will restrict this plan to those locations only.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Price (₹)</label>
                  <input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Billing Cycle</label>
                  <select 
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Lifetime">Lifetime</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Product SKU Limit</label>
                  <div className="relative">
                    <input 
                      type="number"
                      disabled={formData.maxProducts === 999}
                      value={formData.maxProducts === 999 ? '' : formData.maxProducts}
                      onChange={(e) => setFormData({...formData, maxProducts: parseInt(e.target.value) || 0})}
                      placeholder="∞"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <div className="mt-2 flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         checked={formData.maxProducts === 999}
                         onChange={(e) => setFormData({...formData, maxProducts: e.target.checked ? 999 : 5})}
                         className="rounded text-primary focus:ring-primary"
                       />
                       <span className="text-[10px] font-bold text-gray-500 uppercase">Unlimited SKU</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Offer Limit</label>
                  <div className="relative">
                    <input 
                      type="number"
                      disabled={formData.maxOffers === 999}
                      value={formData.maxOffers === 999 ? '' : formData.maxOffers}
                      onChange={(e) => setFormData({...formData, maxOffers: parseInt(e.target.value) || 0})}
                      placeholder="∞"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <div className="mt-2 flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         checked={formData.maxOffers === 999}
                         onChange={(e) => setFormData({...formData, maxOffers: e.target.checked ? 999 : 5})}
                         className="rounded text-primary focus:ring-primary"
                       />
                       <span className="text-[10px] font-bold text-gray-500 uppercase">Unlimited Offers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Management */}
              <div>
                 <div className="flex justify-between items-center mb-2 px-1">
                   <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">In-App Features</label>
                   <button 
                     type="button" 
                     onClick={() => setFormData({ ...formData, features: [...formData.features, { id: Date.now().toString(), text: '' }] })}
                     className="text-[10px] font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg border border-primary/20 transition-all"
                   >
                     + Add Feature
                   </button>
                 </div>
                 
                 <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={feature.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={feature.text}
                          placeholder="e.g. Priority Display"
                          onChange={(e) => {
                            const newFeatures = [...formData.features];
                            newFeatures[index].text = e.target.value;
                            setFormData({ ...formData, features: newFeatures });
                          }}
                           className="w-full bg-white border border-gray-100 rounded-xl py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                        />
                        <button 
                          type="button" 
                          onClick={() => setFormData({ ...formData, features: formData.features.filter((f) => f.id !== feature.id) })}
                          className="text-gray-300 hover:text-red-500 p-2 transition-colors"
                        >
                          <CloseRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    ))}
                    {formData.features.length === 0 && (
                      <p className="text-[11px] text-gray-400 italic text-center py-4 bg-white rounded-xl border border-dashed border-gray-100">No features listed for this tier.</p>
                    )}
                 </div>
              </div>
            </div>

            {selectedPlan && (
              <button 
                type="button"
                onClick={() => handleDeleteClick(selectedPlan)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
              >
                <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                Archive Configuration
              </button>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
            <button 
              type="submit"
              className="flex-1 bg-[#5EB929] text-white py-3.5 rounded-xl font-semibold text-[14px] shadow-lg shadow-[#5EB929]/10 hover:bg-[#2d5a3a] transition-all"
            >
              {selectedPlan ? 'Update Configuration' : 'Deploy Tier'}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DeleteRoundedIcon className="text-red-500" sx={{ fontSize: 28 }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Archive Tier?</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">Existing subscribers will not be affected, but this plan will be hidden from all new merchant registrations immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold text-sm">Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
