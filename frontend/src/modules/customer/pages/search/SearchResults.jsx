import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import { offerAPI } from '../../../../api/offer.api';
import OfferCard from '../../components/ui/OfferCard';
import PageTransition from '../../components/ui/PageTransition';
import { useApp } from '../../context/AppContext';

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('q') || '';
  const { user, selectedCity } = useApp();
  const cityFilter = selectedCity !== 'Select City' ? selectedCity : (user?.city || undefined);

  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState([]);
  const [allOffers, setAllOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recent] = useState(['Royal Restaurant', 'Gym', 'Fashion', 'Cafe']);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        if (query.trim()) {
          if (!cityFilter) {
            setResults([]);
          } else {
            const res = await offerAPI.getAll({ search: query, status: 'active', city: cityFilter });
            setResults(res.offers || []);
          }
        } else {
          if (cityFilter) {
            const res = await offerAPI.getAll({ status: 'active', city: cityFilter, limit: 6 });
            setAllOffers(res.offers || []);
          } else {
            setAllOffers([]);
          }
          setResults([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, [query, cityFilter]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4">
        
        {/* Sharp Header & Search */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 active:scale-95 transition-all"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#5EB929]/30 transition-all">
              <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" />
              <input
                type="text"
                placeholder="FOOD, SALONS, CAFES..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-[13px] font-bold text-gray-900 placeholder:text-gray-400 outline-none uppercase tracking-tight"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')} 
                  className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest bg-[#5EB929]/5 px-2.5 py-1.5 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="pt-2">
          {!query ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Recent Searches */}
              <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <HistoryRoundedIcon sx={{ fontSize: 14 }} className="text-gray-400" />
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Searches</h3>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="bg-white border border-gray-50 rounded-xl px-4 py-2 text-[11px] font-bold text-gray-900 shadow-sm active:scale-95 transition-all uppercase tracking-tight"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </section>

              {/* Browse All */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5EB929]" />
                      Browse Everything
                   </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {!cityFilter && (
                    <div className="bg-white p-8 rounded-3xl text-center border border-gray-50 shadow-sm col-span-full">
                       <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Select city to load offers</p>
                    </div>
                  )}
                  {allOffers.map((offer, idx) => (
                    <motion.div
                      key={offer._id || offer.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <OfferCard offer={offer} variant="list" viewSource="search" />
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                   <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Search result for</p>
                   <p className="text-[11px] text-gray-900 font-bold mt-1 uppercase tracking-tight">"{query}"</p>
                </div>
                <span className="text-[9px] font-bold text-[#5EB929] bg-[#5EB929]/10 px-2 py-1 rounded-lg uppercase tracking-widest">
                  {results.length} Match
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3 pt-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-50" />
                   ))}
                </div>
              ) : results.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-24 text-center px-8"
                >
                  <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-gray-200/50 border border-gray-50">
                    <SentimentDissatisfiedRoundedIcon sx={{ fontSize: 32 }} className="text-gray-300" />
                  </div>
                  <h3 className="text-[14px] font-bold text-gray-900 uppercase tracking-tight leading-none mb-2">No Match Found</h3>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    We couldn't find anything matching your search. Try adjusting your keywords or city.
                  </p>
                  <button 
                    onClick={() => setQuery('')}
                    className="mt-8 text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-white border border-gray-100 px-8 py-3 rounded-2xl shadow-sm active:scale-95 transition-all"
                  >
                    Clear Search
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((offer, idx) => (
                    <motion.div
                      key={offer._id || offer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <OfferCard offer={offer} variant="list" viewSource="search" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default SearchResults;
