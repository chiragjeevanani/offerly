import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import { rewardsAPI } from '../../../api/rewards.api';
import SlideOver from '../components/SlideOver';

const RewardsManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'rewards' | 'cards'

  // Modal / SlideOver states
  const [isMilestoneSlideOpen, setIsMilestoneSlideOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    level: '',
    name: '',
    description: '',
    badgeIcon: 'medal',
    rewardPool: [],
    isActive: true,
  });

  const [isRewardSlideOpen, setIsRewardSlideOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm, setRewardForm] = useState({
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    couponCode: '',
    expiresInDays: 30,
    isGlobal: true,
    isActive: true,
  });

  // Queries
  const { data: milestones = [], isLoading: loadingMilestones } = useQuery({
    queryKey: ['adminMilestones'],
    queryFn: async () => {
      const res = await rewardsAPI.getAdminMilestones();
      return res.milestones || [];
    },
  });

  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['adminRewards'],
    queryFn: async () => {
      const res = await rewardsAPI.getAdminRewards();
      return res.rewards || [];
    },
  });

  const { data: cardsData, isLoading: loadingCards } = useQuery({
    queryKey: ['adminCards'],
    queryFn: async () => {
      const res = await rewardsAPI.getAdminCards({ limit: 100 });
      return res || { cards: [], total: 0 };
    },
  });

  // Milestone Mutations
  const saveMilestoneMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingMilestone) {
        return rewardsAPI.updateAdminMilestone(editingMilestone._id, payload);
      }
      return rewardsAPI.createAdminMilestone(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminMilestones']);
      toast.success(editingMilestone ? 'Milestone updated!' : 'Milestone created!');
      setIsMilestoneSlideOpen(false);
      setEditingMilestone(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save milestone');
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id) => rewardsAPI.deleteAdminMilestone(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminMilestones']);
      toast.success('Milestone removed');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete milestone'),
  });

  // Reward Mutations
  const saveRewardMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingReward) {
        return rewardsAPI.updateAdminReward(editingReward._id, payload);
      }
      return rewardsAPI.createAdminReward(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRewards']);
      queryClient.invalidateQueries(['adminMilestones']);
      toast.success(editingReward ? 'Reward updated!' : 'Reward added to pool!');
      setIsRewardSlideOpen(false);
      setEditingReward(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save reward');
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id) => rewardsAPI.deleteAdminReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRewards']);
      queryClient.invalidateQueries(['adminMilestones']);
      toast.success('Reward deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete reward'),
  });

  // Handlers for Milestones
  const handleOpenMilestoneModal = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        level: milestone.level,
        name: milestone.name,
        description: milestone.description || '',
        badgeIcon: milestone.badgeIcon || 'medal',
        rewardPool: milestone.rewardPool?.map((r) => r._id || r) || [],
        isActive: milestone.isActive !== false,
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({
        level: milestones.length > 0 ? Math.max(...milestones.map((m) => m.level)) + 2 : 3,
        name: '',
        description: '',
        badgeIcon: 'medal',
        rewardPool: [],
        isActive: true,
      });
    }
    setIsMilestoneSlideOpen(true);
  };

  const handleSaveMilestone = (e) => {
    e.preventDefault();
    if (!milestoneForm.level || !milestoneForm.name) {
      toast.error('Level and name are required');
      return;
    }
    saveMilestoneMutation.mutate(milestoneForm);
  };

  // Handlers for Rewards
  const handleOpenRewardModal = (reward = null) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        title: reward.title,
        description: reward.description || '',
        discountType: reward.discountType || 'percentage',
        discountValue: reward.discountValue || 10,
        couponCode: reward.couponCode || '',
        expiresInDays: reward.expiresInDays || 30,
        isGlobal: reward.isGlobal !== false,
        isActive: reward.isActive !== false,
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        couponCode: '',
        expiresInDays: 30,
        isGlobal: true,
        isActive: true,
      });
    }
    setIsRewardSlideOpen(true);
  };

  const handleSaveReward = (e) => {
    e.preventDefault();
    if (!rewardForm.title) {
      toast.error('Reward title is required');
      return;
    }
    saveRewardMutation.mutate(rewardForm);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <EmojiEventsRoundedIcon sx={{ fontSize: 28 }} className="text-primary" />
            Claim Milestones & Rewards Hub
          </h1>
          <p className="text-sm font-normal text-gray-500 mt-1">
            Configure order claim level thresholds, random scratch card reward pools, and view member claims.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              queryClient.invalidateQueries(['adminMilestones']);
              queryClient.invalidateQueries(['adminRewards']);
              queryClient.invalidateQueries(['adminCards']);
              toast.success('Synced data');
            }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 shadow-sm transition-all"
            title="Refresh"
          >
            <RefreshRoundedIcon sx={{ fontSize: 20 }} />
          </button>

          {activeTab === 'milestones' && (
            <button
              onClick={() => handleOpenMilestoneModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md hover:bg-primary-dark transition-all"
            >
              <AddRoundedIcon sx={{ fontSize: 20 }} />
              Add Milestone Level
            </button>
          )}

          {activeTab === 'rewards' && (
            <button
              onClick={() => handleOpenRewardModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md hover:bg-primary-dark transition-all"
            >
              <AddRoundedIcon sx={{ fontSize: 20 }} />
              Add Reward to Pool
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'milestones' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />
          Claim Milestones ({milestones.length})
          {activeTab === 'milestones' && (
            <motion.div layoutId="admin-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'rewards' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <CardGiftcardRoundedIcon sx={{ fontSize: 18 }} />
          Reward Pool ({rewards.length})
          {activeTab === 'rewards' && (
            <motion.div layoutId="admin-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('cards')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'cards' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <ConfirmationNumberRoundedIcon sx={{ fontSize: 18 }} />
          Issued Scratch Cards ({cardsData?.total || 0})
          {activeTab === 'cards' && (
            <motion.div layoutId="admin-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab 1: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {loadingMilestones ? (
            <div className="p-12 text-center text-gray-400">Loading milestones...</div>
          ) : milestones.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                <EmojiEventsRoundedIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-base font-semibold text-gray-800">No Milestones Configured Yet</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Set milestones (e.g. Level 3 = 3 claimed offers) to automatically grant scratch cards to customers!
              </p>
              <button
                onClick={() => handleOpenMilestoneModal()}
                className="mt-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
              >
                Create First Milestone
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {milestones.map((m) => (
                <div
                  key={m._id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                          {m.level}
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                            Level {m.level} ({m.level} Claims)
                          </span>
                          <h3 className="text-base font-bold text-gray-900 leading-snug">{m.name}</h3>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          m.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {m.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2">
                      {m.description || 'Awarded automatically when a member completes this many offer claims.'}
                    </p>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 mb-1">Assigned Rewards Pool:</p>
                      {m.rewardPool && m.rewardPool.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {m.rewardPool.map((r, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-medium rounded-md">
                              {r.title || 'Reward'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                          Using Global Rewards Pool
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenMilestoneModal(m)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="Edit"
                    >
                      <EditRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete milestone Level ${m.level}?`)) {
                          deleteMilestoneMutation.mutate(m._id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete"
                    >
                      <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reward Pool */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {loadingRewards ? (
            <div className="p-12 text-center text-gray-400">Loading rewards...</div>
          ) : rewards.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                <CardGiftcardRoundedIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-base font-semibold text-gray-800">No Rewards in the Pool</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Add rewards like "10% off at nearby store", "Free Coffee", or "₹50 voucher" for customers to win!
              </p>
              <button
                onClick={() => handleOpenRewardModal()}
                className="mt-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
              >
                Add First Reward
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((r) => (
                <div
                  key={r._id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                          {r.discountType === 'percentage'
                            ? `${r.discountValue}% OFF`
                            : r.discountType === 'flat'
                            ? `₹${r.discountValue} OFF`
                            : r.discountType}
                        </span>
                        <h3 className="text-base font-bold text-gray-900 mt-1">{r.title}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Off'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2">{r.description || 'No description provided.'}</p>

                    <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Coupon Code:</span>
                        <span className="font-semibold text-gray-800 font-mono">{r.couponCode || '(Auto-generated)'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Validity:</span>
                        <span>{r.expiresInDays} Days after reveal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Pool Scope:</span>
                        <span>{r.isGlobal ? 'Global (All Milestones)' : 'Milestone-specific'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenRewardModal(r)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="Edit"
                    >
                      <EditRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete reward "${r.title}"?`)) {
                          deleteRewardMutation.mutate(r._id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete"
                    >
                      <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Issued Scratch Cards */}
      {activeTab === 'cards' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loadingCards ? (
            <div className="p-12 text-center text-gray-400">Loading scratch cards history...</div>
          ) : !cardsData?.cards || cardsData.cards.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <ConfirmationNumberRoundedIcon sx={{ fontSize: 32 }} className="text-gray-300 mx-auto" />
              <p className="text-sm font-medium">No scratch cards issued yet.</p>
              <p className="text-xs text-gray-400">Cards will appear here once customers reach milestone levels.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Milestone</th>
                    <th className="px-6 py-3.5">Reward Title</th>
                    <th className="px-6 py-3.5">Coupon Code</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Issued Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cardsData.cards.map((card) => (
                    <tr key={card._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>{card.userId?.name || 'Customer'}</div>
                        <div className="text-xs text-gray-400">{card.userId?.phone || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-primary/10 text-primary font-semibold text-xs rounded-full">
                          Level {card.milestoneLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {card.rewardSnapshot?.title || 'Reward'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-700">
                        {card.rewardSnapshot?.couponCode || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            card.status === 'scratched'
                              ? 'bg-emerald-50 text-emerald-600'
                              : card.status === 'unscratched'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {card.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SlideOver: Milestone Form */}
      <SlideOver
        isOpen={isMilestoneSlideOpen}
        onClose={() => setIsMilestoneSlideOpen(false)}
        title={editingMilestone ? `Edit Milestone Level ${editingMilestone.level}` : 'Create New Milestone Level'}
      >
        <form onSubmit={handleSaveMilestone} className="space-y-5 p-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Claim Level Threshold (Number of claimed offers) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={milestoneForm.level}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, level: e.target.value })}
              placeholder="e.g. 3, 5, 10"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Customer gets a scratch card upon reaching this exact count of completed claims.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Milestone Name *</label>
            <input
              type="text"
              required
              value={milestoneForm.name}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
              placeholder="e.g. Bronze Explorer, Silver Saver"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description (Optional)</label>
            <textarea
              rows="3"
              value={milestoneForm.description}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
              placeholder="e.g. Claim 3 offers to unlock a surprise scratch card discount!"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Assign Specific Rewards from Pool (Leave empty to use global pool)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50">
              {rewards.length === 0 ? (
                <p className="text-xs text-gray-400">No rewards created yet.</p>
              ) : (
                rewards.map((r) => (
                  <label key={r._id} className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={milestoneForm.rewardPool.includes(r._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMilestoneForm({
                            ...milestoneForm,
                            rewardPool: [...milestoneForm.rewardPool, r._id],
                          });
                        } else {
                          setMilestoneForm({
                            ...milestoneForm,
                            rewardPool: milestoneForm.rewardPool.filter((id) => id !== r._id),
                          });
                        }
                      }}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>{r.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveMilestone"
              checked={milestoneForm.isActive}
              onChange={(e) => setMilestoneForm({ ...milestoneForm, isActive: e.target.checked })}
              className="rounded text-primary focus:ring-primary"
            />
            <label htmlFor="isActiveMilestone" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Active (Enabled for users)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsMilestoneSlideOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMilestoneMutation.isPending}
              className="px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl shadow-md hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saveMilestoneMutation.isPending ? 'Saving...' : editingMilestone ? 'Update Milestone' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* SlideOver: Reward Form */}
      <SlideOver
        isOpen={isRewardSlideOpen}
        onClose={() => setIsRewardSlideOpen(false)}
        title={editingReward ? `Edit Reward "${editingReward.title}"` : 'Add Reward to Pool'}
      >
        <form onSubmit={handleSaveReward} className="space-y-5 p-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reward Title *</label>
            <input
              type="text"
              required
              value={rewardForm.title}
              onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
              placeholder="e.g. 10% Off in Nearby Store"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              rows="2"
              value={rewardForm.description}
              onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
              placeholder="e.g. Valid at any partner restaurant or store"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Discount Type</label>
              <select
                value={rewardForm.discountType}
                onChange={(e) => setRewardForm({ ...rewardForm, discountType: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
                <option value="freebie">Freebie Item</option>
                <option value="custom">Custom Deal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Discount Value</label>
              <input
                type="number"
                min="0"
                value={rewardForm.discountValue}
                onChange={(e) => setRewardForm({ ...rewardForm, discountValue: e.target.value })}
                placeholder="e.g. 10 or 50"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Coupon Code (Optional)</label>
              <input
                type="text"
                value={rewardForm.couponCode}
                onChange={(e) => setRewardForm({ ...rewardForm, couponCode: e.target.value.toUpperCase() })}
                placeholder="e.g. OFFERLY10"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expires in (Days)</label>
              <input
                type="number"
                min="1"
                value={rewardForm.expiresInDays}
                onChange={(e) => setRewardForm({ ...rewardForm, expiresInDays: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rewardForm.isGlobal}
                onChange={(e) => setRewardForm({ ...rewardForm, isGlobal: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Global Reward (Can be won at any milestone level)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rewardForm.isActive}
                onChange={(e) => setRewardForm({ ...rewardForm, isActive: e.target.checked })}
                className="rounded text-primary focus:ring-primary"
              />
              <span>Active in pool</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsRewardSlideOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveRewardMutation.isPending}
              className="px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl shadow-md hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saveRewardMutation.isPending ? 'Saving...' : editingReward ? 'Update Reward' : 'Add to Pool'}
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
};

export default RewardsManagement;
