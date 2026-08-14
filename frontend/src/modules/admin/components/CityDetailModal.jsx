import AdminModal from './AdminModal';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import { motion } from 'framer-motion';

const CityDetailModal = ({ isOpen, onClose, city }) => {
  if (!city) return null;

  const totalMerchants = city.zones?.reduce((sum, z) => sum + (z.merchantCount || 0), 0) || 0;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${city.name} Oversight`}
      footer={
        <button 
          onClick={onClose}
          className="bg-gray-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all"
        >
          Close Oversight
        </button>
      }
    >
      <div className="space-y-8">
        {/* City Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#3D7A4F]/5 rounded-2xl p-4 border border-[#3D7A4F]/10">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Total Markets</span>
            <div className="flex items-center gap-2">
              <MapRoundedIcon className="text-[#3D7A4F]" sx={{ fontSize: 20 }} />
              <span className="text-2xl font-black text-gray-900">{city.zones?.length || 0}</span>
              <span className="text-xs font-bold text-gray-500">Zones</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Operational Density</span>
            <div className="flex items-center gap-2">
              <BusinessCenterRoundedIcon className="text-blue-600" sx={{ fontSize: 20 }} />
              <span className="text-2xl font-black text-gray-900">{totalMerchants}</span>
              <span className="text-xs font-bold text-gray-500">Merchants</span>
            </div>
          </div>
        </div>

        {/* Zones Grid */}
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Detailed Zone Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {city.zones && city.zones.length > 0 ? (
              city.zones.map((zone, index) => (
                <motion.div
                  key={zone.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#3D7A4F]/10 group-hover:text-[#3D7A4F] transition-colors">
                      <span className="text-xs font-black">{index + 1}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">{zone.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg">
                    <BusinessCenterRoundedIcon sx={{ fontSize: 14 }} className="text-gray-400" />
                    <span className="text-xs font-black text-gray-600">{zone.merchantCount || 0}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-sm font-bold text-gray-400">No zones defined for this city yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend/Info */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
           <p className="text-xs font-semibold text-amber-700 leading-relaxed">
             <span className="font-black uppercase mr-2">Note:</span> 
             Merchant counts are updated in real-time as new partners register and select their respective operational zones.
           </p>
        </div>
      </div>
    </AdminModal>
  );
};

export default CityDetailModal;
