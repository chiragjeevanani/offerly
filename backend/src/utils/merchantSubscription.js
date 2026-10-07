import MerchantSubscription from "../modules/payment/models/MerchantSubscription.js";

// A merchant is publicly visible / claimable only while their core membership is
// running. Advertisement purchases are separate MerchantSubscription rows and
// never count. A null endDate is a legacy Lifetime row and stays active.
const activeQuery = (now = new Date()) => ({
  status: "active",
  planType: { $ne: "advertisement" },
  $or: [{ endDate: null }, { endDate: { $gt: now } }],
});

/** Subset of `merchantIds` that currently hold an active membership, as a Set of id strings. */
export const getActiveMerchantIdSet = async (merchantIds) => {
  const ids = (merchantIds || []).filter(Boolean);
  if (!ids.length) return new Set();
  const active = await MerchantSubscription.distinct("merchantId", {
    ...activeQuery(),
    merchantId: { $in: ids },
  });
  return new Set(active.map(String));
};

/** Every merchant id with an active membership (for queries that have no id list to narrow). */
export const getAllActiveMerchantIds = () =>
  MerchantSubscription.distinct("merchantId", activeQuery());

export const hasActiveMerchantSubscription = async (merchantId) => {
  if (!merchantId) return false;
  return Boolean(await MerchantSubscription.exists({ ...activeQuery(), merchantId }));
};

/** Filters merchant docs/lean objects (anything with `_id`) down to the subscribed ones. */
export const filterActiveMerchants = async (merchants) => {
  const active = await getActiveMerchantIdSet(merchants.map((m) => m._id));
  return merchants.filter((m) => active.has(String(m._id)));
};
