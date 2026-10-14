import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SentimentDissatisfiedRoundedIcon from '@mui/icons-material/SentimentDissatisfiedRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { offerAPI } from '../../../../api/offer.api';
import { merchantAPI } from '../../../../api/merchant.api';
import OfferCard from '../../components/ui/OfferCard';
import StoreCard from '../../components/ui/StoreCard';
import PageTransition from '../../components/ui/PageTransition';
import { useApp } from '../../context/AppContext';

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('q') || '';
  const { user, selectedCity } = useApp();
  // The picker starts blank on a fresh load - fall back to the profile city then too.
  const cityFilter = (selectedCity && selectedCity !== 'Select City' ? selectedCity : user?.city) || undefined;

  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState([]);
  const [stores, setStores] = useState([]);
  // The term the results on screen belong to (results lag typing by the debounce).
  const [searchedTerm, setSearchedTerm] = useState('');
  const [allOffers, setAllOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recent] = useState(['Royal Restaurant', 'Gym', 'Fashion', 'Cafe']);

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        if (term) {
          if (!cityFilter) {
            setResults([]);
            setStores([]);
            setSearchedTerm(term);
          } else {
            // Offers (title/description, or any offer of a matching store) and
            // matching stores, side by side.
            const [offerRes, storeRes] = await Promise.all([
              offerAPI.getAll({ search: term, status: 'active', city: cityFilter, limit: 60 }),
              merchantAPI.getAll({ q: term, city: cityFilter, limit: 10 }).catch(() => ({ merchants: [] })),
            ]);
            if (cancelled) return;
            setResults(offerRes.offers || []);
            setStores(storeRes.merchants || []);
            setSearchedTerm(term);
          }
        } else {
          if (cityFilter) {
            const res = await offerAPI.getAll({ status: 'active', city: cityFilter, limit: 6 });
            if (cancelled) return;
            setAllOffers(res.offers || []);
          } else {
            setAllOffers([]);
          }
          setResults([]);
          setStores([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        if (!cancelled && term) {
          setResults([]);
          setStores([]);
          setSearchedTerm(term);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    // Wait for a pause in typing instead of searching on every keystroke.
    const timer = setTimeout(fetchResults, term ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, cityFilter]);

  // Each matching store with its offers (taken from the offer results, which
  // include every active offer of a store whose name matches).
  const storeResults = useMemo(
    () =>
      stores.map((store) => {
        const id = String(store._id || store.id);
        const storeOffers = results.filter(
          (o) => String(o.merchant?._id || o.merchantId?._id || o.merchantId) === id
        );
        return { store, offers: storeOffers };
      }),
    [stores, results]
  );
  const matchCount = results.length + stores.length;
  const resultsPending = isLoading || searchedTerm !== query.trim();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-4 py-4 pb-24 space-y-4 overflow-x-clip max-w-full">
        
        {/* Unified Search Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-3 pb-3 -mx-4 px-4 border-b border-gray-100/80 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-gray-900 shadow-sm border border-gray-100 active:scale-95 transition-all flex-shrink-0"
            >
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#5EB929]/30 transition-all">
              <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929] flex-shrink-0" />
              <input
                type="text"
                placeholder="FOOD, SALONS, CAFES..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="flex-1 min-w-0 w-full bg-transparent text-[16px] md:text-base font-bold text-gray-900 placeholder:text-gray-400 outline-none uppercase tracking-tight"
                style={{ fontSize: '16px' }}
              />
              {query && (
                <button 
                  onClick={() => setQuery('')} 
                  className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest bg-[#5EB929]/5 px-2.5 py-1.5 rounded-lg flex-shrink-0"
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
                  {resultsPending ? '...' : `${matchCount} Match`}
                </span>
              </div>

              {resultsPending ? (
                <div className="space-y-3 pt-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-50" />
                   ))}
                </div>
              ) : matchCount === 0 ? (
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
                <div className="space-y-6">
                  {/* Offers */}
                  {results.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <LocalOfferRoundedIcon sx={{ fontSize: 14 }} className="text-[#5EB929]" />
                        Offers ({results.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {results.map((offer, idx) => (
                          <motion.div
                            key={offer._id || offer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx, 8) * 0.05 }}
                          >
                            <OfferCard offer={offer} variant="list" viewSource="search" />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Stores, each with its offers */}
                  {storeResults.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <StorefrontRoundedIcon sx={{ fontSize: 14 }} className="text-[#5EB929]" />
                        Stores ({storeResults.length})
                      </h3>
                      <div className="space-y-4">
                        {storeResults.map(({ store, offers }, idx) => (
                          <motion.div
                            key={store._id || store.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx, 6) * 0.05 }}
                            className="space-y-2"
                          >
                            <StoreCard merchant={store} variant="row" offerCount={store.offerCount || offers.length} />
                            {offers.length > 0 ? (
                              <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-1 pl-1 -mr-4 pr-4">
                                {offers.map((offer) => (
                                  <div key={offer._id || offer.id} className="w-[140px] flex-shrink-0 snap-start">
                                    <OfferCard offer={offer} variant="grid" viewSource="search" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-gray-400 px-2">No live offers right now - tap the store to see its menu.</p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
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
