import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SlideOver from '../components/SlideOver';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CityZoneMap from '../components/CityZoneMap';
import { adminAPI } from '../../../api/admin.api';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import toast from 'react-hot-toast';

const CityManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [formData, setFormData] = useState({ name: '', zones: [], coordinates: undefined });

  const { data: cities = [], isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['adminCities'],
    queryFn: async () => {
      const res = await adminAPI.getCities();
      return res.data || res.cities || [];
    }
  });

  const filteredCities = cities.filter(city => 
    city.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setSelectedCity(null);
    setFormData({ name: '', zones: [], coordinates: undefined });
    setIsSlideOverOpen(true);
  };

  const handleEdit = (city) => {
    setSelectedCity(city);
    setFormData({ ...city });
    setIsSlideOverOpen(true);
  };

  const handleDeleteClick = (e, city) => {
    e.stopPropagation();
    setSelectedCity(city);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('City name is required');
      return;
    }

    const zones = (formData.zones || [])
      .map((zone) => ({ ...zone, name: zone.name.trim() }))
      .filter((zone) => zone.name);
    const zoneNames = zones.map((zone) => zone.name.toLowerCase());
    if (new Set(zoneNames).size !== zoneNames.length) {
      toast.error('Zone names must be unique within a city');
      return;
    }

    try {
      await adminAPI.saveCity({ ...formData, zones, id: selectedCity?._id || selectedCity?.id });
      toast.success(selectedCity ? 'Region updated' : 'Region added');
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminCities']);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save region');
    }
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteCity(selectedCity._id || selectedCity.id);
      toast.success('Region deleted');
      setIsDeleteModalOpen(false);
      setIsSlideOverOpen(false);
      queryClient.invalidateQueries(['adminCities']);
    } catch (error) {
      toast.error('Failed to delete region');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background p-4 lg:p-8 -m-6 lg:-m-8 font-sans text-gray-800 lg:rounded-tl-[32px]">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Operational Regions</h1>
            <p className="text-[12px] text-gray-500">Manage city deployment and operational zones</p>
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
              Add City
            </button>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div className="relative flex-1 max-w-md w-full">
            <SearchRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input 
              type="text" 
              placeholder="Search regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[12px] py-2 pl-11 pr-4 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5EB929]/10 focus:border-[#5EB929]/30 transition-all shadow-sm"
            />
          </div>
          
          <div className="hidden lg:block text-right">
             <p className="text-[11px] font-medium text-gray-400">{cities.length} Active Operational Regions</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-500 font-medium text-xs">Loading Regions...</p>
          </div>
        ) : filteredCities.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {filteredCities.map(city => (
              <div 
                key={city._id || city.id}
                onClick={() => handleEdit(city)}
                className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm active:scale-[0.98] transition-all relative flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <LocationCityRoundedIcon sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-gray-800 leading-tight">{city.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{city.zones?.length || 0} Zones • 100% Operational</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[9px] font-bold uppercase tracking-wider">
                    Active
                  </span>
                  <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <MapRoundedIcon className="text-gray-200 mb-4" sx={{ fontSize: 64 }} />
            <h3 className="text-lg font-semibold text-gray-400">Region Registry Empty</h3>
            <p className="text-sm text-gray-400 mt-1">Add a new city to expand operations</p>
          </div>
        )}
      </div>

      {/* Edit/Add SlideOver */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title={selectedCity ? "Edit Region" : "New Region Registry"}
        subtitle={selectedCity ? `REF: ${selectedCity._id.substring(0, 12)}` : "Deploy Offerly to a new city"}
        widthClass="max-w-3xl"
      >
        <form onSubmit={handleSave} className="flex flex-col h-full font-sans">
          <div className="flex-1 overflow-y-auto space-y-5 pb-32 pr-1 no-scrollbar">
            
            {/* Header Preview */}
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-gray-100 text-indigo-600">
                <LocationCityRoundedIcon sx={{ fontSize: 40 }} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-800">{formData.name || 'City Name'}</h3>
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-widest mt-1">Operational Oversight</p>
            </div>

            {/* Core Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Official City Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Guwahati"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Operational Zones</label>
                <CityZoneMap
                  coordinates={formData.coordinates}
                  onCoordinatesChange={(coordinates) => setFormData({ ...formData, coordinates })}
                  zones={formData.zones || []}
                  onZonesChange={(zones) => setFormData({ ...formData, zones })}
                />
                <p className="mt-1.5 text-[10px] text-gray-400 px-1 italic">Draw hexagonal zones on the map — merchants pin their exact operating area inside one, and it restricts which offers a customer in that area can see.</p>
              </div>
            </div>

            {selectedCity && (
              <button 
                type="button"
                onClick={(e) => handleDeleteClick(e, selectedCity)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
              >
                <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                Decommission Region
              </button>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-20">
            <button 
              type="submit"
              className="flex-1 bg-[#5EB929] text-white py-3.5 rounded-xl font-semibold text-[14px] shadow-lg shadow-[#5EB929]/10 hover:bg-[#2d5a3a] transition-all"
            >
              {selectedCity ? 'Update Registry' : 'Deploy Region'}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={`Decommission ${selectedCity?.name}?`}
        message="This will remove the city from registration lists. Merchants already in this city will not be deleted, but no new merchants can join from this region."
      />
    </div>
  );
};

export default CityManagement;
