import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SparklesIcon from '@mui/icons-material/AutoAwesomeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import toast from 'react-hot-toast';
import { rewardsAPI } from '../../../../api/rewards.api';
import PageTransition from '../../components/ui/PageTransition';
import ScratchCardModal from '../../components/rewards/ScratchCardModal';

const RewardsHub = () => {
  const queryClient = useQueryClient();
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const { data: progressData, isLoading: loadingProgress } = useQuery({
    queryKey: ['myRewardsProgress'],
    queryFn: async () => {
      const res = await rewardsAPI.getMyProgress();
      return res;
    },
  });

  const { data: cardsData, isLoading: loadingCards } = useQuery({
    queryKey: ['myScratchCards'],
    queryFn: async () => {
      const res = await rewardsAPI.getMyCards();
      return res.cards || [];
    },
  });

  // Mutation to scratch card
  const scratchMutation = useMutation({
    mutationFn: (cardId) => rewardsAPI.scratchCard(cardId),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['myRewardsProgress']);
      queryClient.invalidateQueries(['myScratchCards']);
      if (data?.card) {
        setSelectedCard(data.card);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to scratch card');
    },
  });

  const handleOpenCard = (card) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCardScratched = (cardId) => {
    scratchMutation.mutate(cardId);
  };

  const totalClaimed = progressData?.totalClaimedOffers || 0;
  const nextMilestone = progressData?.nextMilestone;
  const progressPercent = progressData?.progressPercent || 0;
  const claimsNeeded = progressData?.claimsNeededForNext || 0;
  const roadmap = progressData?.roadmap || [];
  const cards = cardsData || [];

  return (
    <PageTransition>
      <div className="px-4 md:px-6 py-4 space-y-6 pb-12 bg-background min-h-screen">
        {/* HERO STATUS CARD */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl bg-gradient-to-br from-[#2E6312] via-[#489A1B] to-[#5EB929] p-6 text-white shadow-xl shadow-primary/20 overflow-hidden"
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-xl" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5">
                  <SparklesIcon sx={{ fontSize: 14 }} />
                  Level {totalClaimed} Member
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                <EmojiEventsRoundedIcon sx={{ fontSize: 24 }} className="text-white" />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Completed Claims</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-0.5">
                {totalClaimed} <span className="text-lg font-medium text-white/80">Offers Claimed</span>
              </h2>
            </div>

            {/* Next Milestone Progress Bar */}
            <div className="pt-2 border-t border-white/15 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>
                  {nextMilestone
                    ? `Next Target: Level ${nextMilestone.level} (${nextMilestone.name})`
                    : '🎉 All Milestones Achieved!'}
                </span>
                <span>{nextMilestone ? `${claimsNeeded} more claims needed` : '100%'}</span>
              </div>
              <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="bg-white h-full rounded-full shadow-sm"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECTION 1: MY SCRATCH CARDS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ConfirmationNumberRoundedIcon sx={{ fontSize: 20 }} className="text-primary" />
              My Scratch Cards ({cards.length})
            </h3>
            {cards.some((c) => c.status === 'unscratched') && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                New Card Ready!
              </span>
            )}
          </div>

          {loadingCards ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading cards...</div>
          ) : cards.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 text-center border border-gray-100 shadow-sm space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
                <CardGiftcardRoundedIcon sx={{ fontSize: 26 }} />
              </div>
              <h4 className="text-sm font-bold text-gray-800">No Scratch Cards Yet</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Claim {claimsNeeded > 0 ? `${claimsNeeded} more offers` : 'offers'} at nearby partner stores to earn your first reward scratch card!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {cards.map((card) => {
                const isUnscratched = card.status === 'unscratched';
                const reward = card.rewardSnapshot || {};

                return (
                  <motion.div
                    key={card._id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenCard(card)}
                    className={`relative rounded-2xl p-4 cursor-pointer shadow-sm transition-all border ${
                      isUnscratched
                        ? 'bg-gradient-to-br from-amber-400 via-primary to-[#2E6312] text-white border-primary shadow-md'
                        : 'bg-white text-gray-800 border-gray-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isUnscratched
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        Level {card.milestoneLevel} Card
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isUnscratched ? 'text-white/90' : 'text-gray-400'
                        }`}
                      >
                        {isUnscratched ? '✨ Tap to Scratch' : 'Revealed'}
                      </span>
                    </div>

                    <div className="my-3 space-y-1">
                      {isUnscratched ? (
                        <>
                          <h4 className="text-base font-extrabold text-white">Surprise Reward</h4>
                          <p className="text-xs text-white/80">Tap & scratch to reveal coupon code!</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                            <LocalOfferRoundedIcon sx={{ fontSize: 14 }} />
                            <span>
                              {reward.discountType === 'percentage'
                                ? `${reward.discountValue}% OFF`
                                : reward.discountType === 'flat'
                                ? `₹${reward.discountValue} OFF`
                                : reward.discountType}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{reward.title}</h4>
                          <p className="text-[11px] font-mono font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md inline-block border border-gray-100">
                            Code: {reward.couponCode || 'CLAIMED'}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[10px]">
                      <span className={isUnscratched ? 'text-white/80' : 'text-gray-400'}>
                        {new Date(card.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`font-semibold flex items-center gap-0.5 ${isUnscratched ? 'text-white' : 'text-primary'}`}>
                        View Details <ChevronRightRoundedIcon sx={{ fontSize: 14 }} />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: MILESTONE ROADMAP */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <EmojiEventsRoundedIcon sx={{ fontSize: 20 }} className="text-primary" />
              Claim Milestones Roadmap
            </h3>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            {roadmap.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No milestones configured yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-100">
                {roadmap.map((m) => {
                  const isUnlocked = totalClaimed >= m.level;

                  return (
                    <div key={m._id} className="relative flex items-start gap-4">
                      {/* Status Icon Indicator */}
                      <div
                        className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          isUnlocked
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        {isUnlocked ? (
                          <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <LockRoundedIcon sx={{ fontSize: 13 }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isUnlocked ? 'text-primary' : 'text-gray-400'
                            }`}
                          >
                            Level {m.level} ({m.level} Claims)
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isUnlocked ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {isUnlocked ? 'Unlocked 🎉' : `${m.level - totalClaimed} claims to unlock`}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900 mt-0.5">{m.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {m.description || `Claim ${m.level} offers on Offerly to unlock this milestone's scratch card reward.`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: HOW IT WORKS */}
        <section className="bg-gradient-to-r from-primary-50/60 to-emerald-50/60 border border-primary/20 rounded-3xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon sx={{ fontSize: 16 }} className="text-primary" />
            How Claim Milestones Work
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-gray-100 space-y-1">
              <span className="font-bold text-primary text-sm">1. Claim Deals</span>
              <p>Explore offers and claim free digital passes to redeem at local stores.</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-gray-100 space-y-1">
              <span className="font-bold text-primary text-sm">2. Level Up</span>
              <p>Every verified store redemption automatically raises your member level.</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-gray-100 space-y-1">
              <span className="font-bold text-primary text-sm">3. Scratch & Win</span>
              <p>Hit milestone targets (e.g. 3 claims) to earn surprise scratch cards!</p>
            </div>
          </div>
        </section>

        {/* SCRATCH CARD MODAL */}
        <ScratchCardModal
          isOpen={isModalOpen}
          card={selectedCard}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCard(null);
          }}
          onScratched={handleCardScratched}
        />
      </div>
    </PageTransition>
  );
};

export default RewardsHub;
