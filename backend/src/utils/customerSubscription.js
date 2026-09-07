import CustomerSubscription from "../modules/payment/models/CustomerSubscription.js";
import CustomerSubscriptionSettings from "../modules/admin/models/CustomerSubscriptionSettings.js";

export const getCustomerSubscriptionSettings = async () => {
  const settings = await CustomerSubscriptionSettings.findOne();
  return settings || CustomerSubscriptionSettings.create({});
};

export const getActiveCustomerSubscription = (userId) =>
  CustomerSubscription.findOne({
    userId,
    status: "active",
    $or: [{ endDate: null }, { endDate: { $gt: new Date() } }],
  }).sort({ createdAt: -1 });

export const getCustomerSubscriptionStatus = async (userId) => {
  const settings = await getCustomerSubscriptionSettings();
  const subscription = await getActiveCustomerSubscription(userId);

  return {
    enabled: Boolean(settings?.enabled),
    isSubscribed: Boolean(subscription),
    subscription,
  };
};

// Monthly/Yearly renew on a normal cycle; Lifetime is modeled as a very far
// endDate (not null) - a null endDate reads as the Unix epoch on the client
// (`new Date(null) < now`), which would make a lifetime plan look expired.
export const computeSubscriptionEndDate = (duration, from = new Date()) => {
  const endDate = new Date(from);

  if (duration === "Yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else if (duration === "Lifetime") {
    endDate.setFullYear(endDate.getFullYear() + 100);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate;
};
