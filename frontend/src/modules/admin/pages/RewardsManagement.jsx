import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import toast from 'react-hot-toast';
import { rewardsAPI } from '../../../api/rewards.api';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SlideOver from '../components/SlideOver';
import RewardsRulesPanel from '../components/RewardsRulesPanel';
import { REWARD_METRICS, formatMetric } from '../../../utils/rewardMetric';

const BADGE_OPTIONS = [
  { value: 'medal', label: '🏅 Medal' },
  { value: 'trophy', label: '🏆 Trophy' },
  { value: 'star', label: '⭐ Star' },
  { value: 'crown', label: '👑 Crown' },
  { value: 'gift', label: '🎁 Gift' },
];

const RewardsManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'rules' | 'cards'

  // Modal / SlideOver states
  const [isMilestoneSlideOpen, setIsMilestoneSlideOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    level: '',
    threshold: '',
    name: '',
    description: '',
    badgeIcon: 'medal',
    rewardCredits: 50,
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

  const { data: cardsData, isLoading: loadingCards } = useQuery({
    queryKey: ['adminCards'],
    queryFn: async () => {
      const res = await rewardsAPI.getAdminCards({ limit: 100 });
      return res || { cards: [], total: 0 };
    },
  });

  const { data: rewardsSettings } = useQuery({
    queryKey: ['rewardsSettings'],
    queryFn: () => rewardsAPI.getSettings(),
  });
  const rewardsEnabled = rewardsSettings?.enabled === true;

  // Full rules - shared with RewardsRulesPanel; here only for the metric unit
  const { data: adminSettings } = useQuery({
    queryKey: ['adminRewardsSettings'],
    queryFn: async () => (await rewardsAPI.getAdminSettings()).settings,
  });
  const metric = adminSettings?.metric || 'claims';
  const metricUnit = REWARD_METRICS.find((m) => m.value === metric)?.unit || 'claims';

  const toggleRewardsMutation = useMutation({
    mutationFn: (enabled) => rewardsAPI.updateAdminSettings({ enabled }),
    onSuccess: (_res, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['rewardsSettings'] });
      toast.success(enabled ? 'Milestones & Rewards are now visible to customers' : 'Milestones & Rewards hidden from customers');
    },
    onError: () => toast.error('Failed to update rewards setting'),
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

  // Card Mutations
  const deleteCardMutation = useMutation({
    mutationFn: (id) => rewardsAPI.deleteAdminCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminCards']);
      toast.success('Scratch card deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete scratch card'),
  });

  // Handlers for Milestones
  const handleOpenMilestoneModal = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        level: milestone.level,
        threshold: milestone.target ?? milestone.threshold ?? milestone.level,
        name: milestone.name,
        description: milestone.description || '',
        badgeIcon: milestone.badgeIcon || 'medal',
        rewardCredits: milestone.rewardCredits || 0,
        isActive: milestone.isActive !== false,
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({
        level: milestones.length > 0 ? Math.max(...milestones.map((m) => m.level)) + 1 : 1,
        threshold: '',
        name: '',
        description: '',
        badgeIcon: 'medal',
        rewardCredits: 50,
        isActive: true,
      });
    }
    setIsMilestoneSlideOpen(true);
  };

  const handleSaveMilestone = (e) => {
    e.preventDefault();
    if (!milestoneForm.level || !milestoneForm.threshold || !milestoneForm.name) {
      toast.error('Level, target and name are required');
      return;
    }
    saveMilestoneMutation.mutate(milestoneForm);
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
            Set how many claims each level needs and how many wallet credits customers win at it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              queryClient.invalidateQueries(['adminMilestones']);
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

        </div>
      </div>

      {/* Global feature toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#5EB929]/10 flex items-center justify-center text-[#5EB929] shrink-0">
          <EmojiEventsRoundedIcon sx={{ fontSize: 20 }} />
        </div>
        <div className="flex-1">
          <p className="text-[12px] font-bold text-gray-800">Show Claim Milestones & Rewards to customers</p>
          <p className="text-[10px] text-gray-400">
            {rewardsEnabled
              ? 'On — customers see the rewards banner, menu items and earn scratch cards on completed claims.'
              : 'Off — all milestone & reward UI is hidden from the customer app and no new scratch cards are issued.'}
          </p>
        </div>
        <button
          type="button"
          disabled={!rewardsSettings || toggleRewardsMutation.isPending}
          onClick={() => toggleRewardsMutation.mutate(!rewardsEnabled)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${rewardsEnabled ? 'bg-[#5EB929]' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${rewardsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
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
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === 'rules' ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <TuneRoundedIcon sx={{ fontSize: 18 }} />
          Rules & Settings
          {activeTab === 'rules' && (
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

      {/* Tab 2: Rules & Settings */}
      {activeTab === 'rules' && <RewardsRulesPanel levelCount={milestones.length} />}

      {/* Tab 1: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
            Customers level up by <span className="font-semibold text-gray-800">{metricUnit}</span>.{' '}
            <button type="button" onClick={() => setActiveTab('rules')} className="font-semibold text-primary hover:underline">
              Change this and other rules
            </button>
          </p>
          {loadingMilestones ? (
            <div className="p-12 text-center text-gray-400">Loading milestones...</div>
          ) : milestones.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                <EmojiEventsRoundedIcon sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-base font-semibold text-gray-800">No Milestones Configured Yet</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Set levels (e.g. Level 1 = {formatMetric(metric, metric === 'spent' || metric === 'saved' ? 1000 : 3)}) and
                what customers win at each one.
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
                            Level {m.level} · {formatMetric(metric, m.target ?? m.level)}
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
                      {m.description || `Reached automatically at ${formatMetric(metric, m.target ?? m.level)}.`}
                    </p>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 mb-1">Customer gets:</p>
                      {m.rewardCredits > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                          <CardGiftcardRoundedIcon sx={{ fontSize: 14 }} />
                          ₹{m.rewardCredits} wallet credits
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                          No reward set - badge only, no scratch card
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
                    <th className="px-6 py-3.5">Reward</th>
                    <th className="px-6 py-3.5">Wallet Credits</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Issued Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
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
                          {card.kind === 'repeat' ? `Bonus #${card.repeatIndex}` : `Level ${card.milestoneLevel}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {card.rewardSnapshot?.title || 'Reward'}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                        {card.creditsAwarded > 0 ? (
                          <>
                            ₹{card.creditsAwarded}
                            <span className="block text-[10px] font-medium text-gray-400">
                              {card.status === 'unscratched'
                                ? 'Pays out on scratch'
                                : card.status === 'expired'
                                ? 'Card expired - not paid'
                                : card.creditsExpired
                                ? 'Unused credits expired'
                                : 'Added to wallet'}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">Legacy coupon</span>
                        )}
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
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete this scratch card for ${card.userId?.name || 'this customer'}? This cannot be undone.`)) {
                              deleteCardMutation.mutate(card._id);
                            }
                          }}
                          disabled={deleteCardMutation.isPending}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                          title="Delete scratch card"
                        >
                          <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Level Number *</label>
              <input
                type="number"
                min="1"
                required
                value={milestoneForm.level}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, level: e.target.value })}
                placeholder="e.g. 1, 2, 3"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target ({metricUnit}) *</label>
              <input
                type="number"
                min="1"
                required
                value={milestoneForm.threshold}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, threshold: e.target.value })}
                placeholder={metric === 'spent' || metric === 'saved' ? 'e.g. 2000' : 'e.g. 5'}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <p className="col-span-2 text-[11px] text-gray-400 -mt-2">
              {milestoneForm.threshold
                ? `Customers reach Level ${milestoneForm.level || '?'} at ${formatMetric(metric, milestoneForm.threshold)}.`
                : 'Higher levels need a higher target.'}{' '}
              The unit is set in Rules & Settings.
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
              Reward: Wallet Credits (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={milestoneForm.rewardCredits}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, rewardCredits: e.target.value })}
                placeholder="e.g. 50"
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Customer gets a scratch card at this level. Scratching it adds these credits to their wallet,
              which they can use on their next claim (1 credit = ₹1). Set 0 for a badge-only level with no card.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Badge</label>
            <div className="flex flex-wrap gap-2">
              {BADGE_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setMilestoneForm({ ...milestoneForm, badgeIcon: b.value })}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    milestoneForm.badgeIcon === b.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
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

    </div>
  );
};

export default RewardsManagement;
