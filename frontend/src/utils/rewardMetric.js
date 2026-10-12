// How customers level up in Claim Milestones - mirrors RewardsSettings.metric
// on the backend. Used by both the admin rules screen and the customer hub.

export const REWARD_METRICS = [
  {
    value: 'claims',
    label: 'Completed claims',
    hint: 'Each claim redeemed in a store counts as 1.',
    unit: 'claims',
  },
  {
    value: 'spent',
    label: 'Amount spent (₹)',
    hint: 'Bill value of redeemed claims, before wallet credits are applied.',
    unit: '₹ spent',
  },
  {
    value: 'saved',
    label: 'Amount saved (₹)',
    hint: 'Total discount customers received on redeemed claims.',
    unit: '₹ saved',
  },
  {
    value: 'stores',
    label: 'Different stores visited',
    hint: 'Each new store a customer redeems at counts as 1.',
    unit: 'stores',
  },
];

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// "3 claims", "₹5,000 spent", "₹450 saved", "1 store"
export const formatMetric = (metric, value) => {
  const n = Number(value || 0);
  switch (metric) {
    case 'spent':
      return `${rupees(n)} spent`;
    case 'saved':
      return `${rupees(n)} saved`;
    case 'stores':
      return `${n} ${n === 1 ? 'store' : 'stores'}`;
    default:
      return `${n} ${n === 1 ? 'claim' : 'claims'}`;
  }
};

// What's still needed: "2 more claims", "₹1,200 more spending", "1 more store"
export const formatRemaining = (metric, value) => {
  const n = Number(value || 0);
  switch (metric) {
    case 'spent':
      return `${rupees(n)} more spending`;
    case 'saved':
      return `${rupees(n)} more savings`;
    case 'stores':
      return `${n} more ${n === 1 ? 'store' : 'stores'}`;
    default:
      return `${n} more ${n === 1 ? 'claim' : 'claims'}`;
  }
};

export const isRupeeMetric = (metric) => metric === 'spent' || metric === 'saved';
