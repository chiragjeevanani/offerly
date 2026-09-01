import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

import { categoryAPI } from '../../../../api/category.api';
import { offerAPI } from '../../../../api/offer.api';
import { cityAPI } from '../../../../api/city.api';
import { CategoryChip } from '../../components/ui/CategoryChip';
import OfferCard from '../../components/ui/OfferCard';
import PageTransition from '../../components/ui/PageTransition';
import { useApp } from '../../context/AppContext';

/**
 * Custom hook for debounced value
 */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const Explore = () => {
  const { user, selectedCity, selectedCategory, setSelectedCategory, userLocation } = useApp();
  const [viewMode, setViewMode] = useState('grid');
  const [searchText, setSearchText] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [page, setPage] = useState(1);
  const cityFilter = selectedCity !== 'Select City' ? selectedCity : (user?.city || undefined);
  
  // Use debounced search text to trigger queries to avoid network flood
  const debouncedSearch = useDebounce(searchText, 500);

  // 1. Fetch Categories and Cities (Static-ish data)
  const { data: basics } = useQuery({
    queryKey: ['basics'],
    queryFn: async () => {
      const [catRes, cityRes] = await Promise.all([
        categoryAPI.getAll(),
        cityAPI.getAll()
      ]);
      return {
        categories: ['All', ...catRes.categories.map(c => c.name)],
        allCities: cityRes.cities || []
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour stale time for categories/cities
  });

  const categories = basics?.categories || ['All'];
  const allCities = basics?.allCities || [];

  // 2. Fetch Offers based on filters
  const { data, isLoading: isOffersLoading } = useQuery({
    queryKey: ['offers', cityFilter || 'no-city', selectedCategory, selectedZone, debouncedSearch, page, userLocation?.lat],
    queryFn: async () => {
      if (!cityFilter) {
        return { offers: [], totalPages: 1 };
      }

      const params = {
        status: 'active',
        city: cityFilter,
        zone: selectedZone || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: debouncedSearch.trim() || undefined,
        page,
        limit: 30, // 10 rows * 3 cards
        sortBy: 'distance',
        userLat: userLocation?.lat,
        userLng: userLocation?.lng
      };
      const response = await offerAPI.getAll(params);
      return { 
        offers: response.offers || [], 
        totalPages: response.totalPages || 1,
        total: response.total || 0
      };
    },
    keepPreviousData: true,
  });

  const offers = data?.offers || [];
  const totalPages = data?.totalPages || 1;

  // 3. Derived states (Memoized to prevent lag during typing)
  const trendingOffers = useMemo(() => offers.filter((o) => o.isTrending), [offers]);
  const newOffers = useMemo(() => offers.filter((o) => o.isNew), [offers]);
  
  const currentCityZones = useMemo(() => {
    const cityName = cityFilter || selectedCity;
    const cityObj = allCities.find(c => c.name === cityName);
    return (cityObj?.zones || []).filter((zone) => (zone.status || 'active') === 'active');
  }, [allCities, cityFilter, selectedCity]);

  // Reset zone filter if it stops belonging to the current city (city switch).
  useEffect(() => {
    if (selectedZone && !currentCityZones.some((z) => (z._id || z.id) === selectedZone)) {
      setSelectedZone(null);
    }
  }, [currentCityZones, selectedZone]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-3 space-y-3 pb-24">
        
        {/* Slim Search bar */}
        <div className="sticky top-0 z-20 -mx-4 px-4 pb-2 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus-within:border-[#5EB929]/30 transition-all">
            <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search services or offers..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 bg-transparent text-[13px] font-bold text-gray-800 placeholder:text-gray-400 outline-none"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="text-[10px] text-[#5EB929] font-bold uppercase tracking-widest bg-[#5EB929]/5 px-2 py-1 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category chips - High Density */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                selectedCategory === cat 
                  ? 'bg-[#5EB929] text-white shadow-lg shadow-[#5EB929]/20' 
                  : 'bg-white text-gray-400 border border-gray-100 hover:border-[#5EB929]/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Active zone filter pill */}
        {selectedZone && (
          <div className="flex items-center gap-2 px-0.5">
            <span className="inline-flex items-center gap-1.5 bg-[#5EB929]/10 text-[#5EB929] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              {currentCityZones.find((z) => (z._id || z.id) === selectedZone)?.name || 'Zone'}
              <button onClick={() => setSelectedZone(null)} className="text-[#5EB929]/60 hover:text-[#5EB929]">✕</button>
            </span>
          </div>
        )}

        {/* View toggle + count - Sharp Typography */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex flex-col">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Discovery Results</p>
            <p className="text-[11px] text-gray-800 font-bold mt-0.5">
              {isOffersLoading ? 'FETCHING...' : `${offers.length} DEALS IN ${cityFilter?.toUpperCase() || 'OFFERLY'}`}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#5EB929] text-white' : 'text-gray-300'}`}
            >
              <ViewListRoundedIcon sx={{ fontSize: 16 }} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#5EB929] text-white' : 'text-gray-300'}`}
            >
              <GridViewRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Loader Skeletons */}
        {isOffersLoading && !offers.length && (
          <div className="space-y-3 pt-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        )}

        {/* Content sections */}
        {(!isOffersLoading || (offers.length > 0)) && (
          <div className="space-y-6">
            {/* Trending section */}
            {trendingOffers.length > 0 && !searchText && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#5EB929] shadow-[0_0_8px_#5EB929]" />
                  <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">Trending Near You</h2>
                </div>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                  {trendingOffers.map((offer) => (
                    <OfferCard key={offer._id || offer.id} offer={offer} viewSource="feed" variant={viewMode === 'grid' ? 'grid' : 'list'} />
                  ))}
                </div>
              </section>
            )}

            {/* New section */}
            {newOffers.length > 0 && !searchText && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">New Arrivals</h2>
                </div>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                  {newOffers.map((offer) => (
                    <OfferCard key={offer._id || offer.id} offer={offer} viewSource="feed" variant={viewMode === 'grid' ? 'grid' : 'list'} />
                  ))}
                </div>
              </section>
            )}

            {/* General Results / Search Results */}
            {((searchText || (trendingOffers.length === 0 && newOffers.length === 0)) && offers.length > 0) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">
                    {searchText ? 'Search Results' : 'Recommended'}
                  </h2>
                </div>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                  {offers.map((offer) => (
                    <OfferCard key={offer._id || offer.id} offer={offer} viewSource="feed" variant={viewMode === 'grid' ? 'grid' : 'list'} />
                  ))}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-8 pb-4">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                    >
                      Previous
                    </button>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest border border-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Empty State */}
            {offers.length === 0 && !isOffersLoading && (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                  <SearchRoundedIcon sx={{ fontSize: 32 }} className="text-gray-200" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-tight">No deals found</h3>
                <p className="text-[11px] text-gray-400 font-medium px-8 mt-1">
                  Try different keywords or check another city for the best offers.
                </p>
                <button 
                  onClick={() => { setSearchText(''); setSelectedCategory('All'); }}
                  className="mt-6 text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-white border border-gray-100 px-6 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Browse by area - Slim Strip Design */}
        {!searchText && !selectedZone && !isOffersLoading && currentCityZones.length > 0 && (
          <section className="pt-2">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">Browse Areas</h2>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              {currentCityZones.map((zone) => (
                <motion.button
                  key={zone._id || zone.id}
                  whileTap={{ backgroundColor: 'rgba(94, 185, 41,0.02)' }}
                  className="w-full flex items-center justify-between px-4 py-3.5 group"
                  onClick={() => setSelectedZone(zone._id || zone.id)}
                >
                  <div className="flex flex-col items-start transition-transform group-hover:translate-x-1">
                    <span className="text-[13px] font-bold text-gray-800">{zone.name}</span>
                    <span className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest mt-0.5">{zone.merchantCount || 0} PARTNERS</span>
                  </div>
                  <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-gray-200 group-hover:text-[#5EB929] transition-colors" />
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
};

export default Explore;
