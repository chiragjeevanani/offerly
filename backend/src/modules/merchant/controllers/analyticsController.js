import Redemption from "../../booking/models/Redemption.js";
import User from "../../user/models/User.js";
import Merchant from "../models/Merchant.js";
import Offer from "../models/Offer.js";
import OfferView from "../models/OfferView.js";
import {
  AGE_BANDS,
  COMPLETED_STATUSES,
  REPORT_TIMEZONE,
  UNKNOWN_BUCKET,
  addDays,
  ageBandFor,
  buildDailySeries,
  localDayGroup,
  normalizeGender,
  percentChange,
  resolveAge,
  resolveMonthRange,
  startOfLocalDay,
} from "../../../utils/analytics.js";

const getMerchantForOwner = async (userId) => {
  if (!userId) return null;
  return Merchant.findOne({ $or: [{ _id: userId }, { ownerId: userId }] });
};

const asNumber = (value) => Number(value || 0);

/**
 * Customers whose *first ever* redemption at this merchant falls inside [start, end).
 *
 * This is the definition of "acquired" the plan settled on: genuinely new to this
 * store, not merely active. It has to be computed against the customer's whole
 * history, so the grouping runs unbounded and the window filter is applied after.
 */
const acquisitionPipeline = (merchantId, start, end, { daily = false } = {}) => {
  const pipeline = [
    { $match: { merchantId, customerId: { $ne: null }, status: { $in: COMPLETED_STATUSES } } },
    { $group: { _id: "$customerId", firstAt: { $min: "$createdAt" } } },
    { $match: { firstAt: { $gte: start, $lt: end } } },
  ];

  if (daily) {
    pipeline.push(
      { $group: { _id: localDayGroup("$firstAt"), acquired: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    );
  } else {
    pipeline.push({ $count: "acquired" });
  }

  return pipeline;
};

// @desc    Today's headline numbers for the merchant dashboard
// @route   GET /api/merchants/me/analytics/today
// @access  Private (merchant)
export const getTodayAnalytics = async (req, res) => {
  const merchant = await getMerchantForOwner(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  // Local calendar days, not rolling 24h windows - "today" has to mean what the
  // merchant means by today.
  const todayStart = startOfLocalDay();
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const windowFor = (start, end) => ({ createdAt: { $gte: start, $lt: end } });

  const redemptionSummary = async (start, end) => {
    const [row] = await Redemption.aggregate([
      {
        $match: {
          merchantId: merchant._id,
          status: { $in: COMPLETED_STATUSES },
          ...windowFor(start, end),
        },
      },
      {
        $group: {
          _id: null,
          redemptions: { $sum: 1 },
          sales: { $sum: { $toDouble: { $ifNull: ["$totals.final", 0] } } },
          discount: { $sum: { $toDouble: { $ifNull: ["$totals.discount", 0] } } },
          billValue: { $sum: { $toDouble: { $ifNull: ["$totals.original", 0] } } },
        },
      },
    ]);

    return {
      redemptions: asNumber(row?.redemptions),
      sales: Math.round(asNumber(row?.sales)),
      discount: Math.round(asNumber(row?.discount)),
      billValue: Math.round(asNumber(row?.billValue)),
    };
  };

  const viewSummary = async (start, end) => {
    const [row] = await OfferView.aggregate([
      { $match: { merchantId: merchant._id, ...windowFor(start, end) } },
      { $group: { _id: null, views: { $sum: 1 }, viewers: { $addToSet: "$viewerKey" } } },
      { $project: { views: 1, uniqueViewers: { $size: "$viewers" } } },
    ]);

    return { views: asNumber(row?.views), uniqueViewers: asNumber(row?.uniqueViewers) };
  };

  const acquiredCount = async (start, end) => {
    const [row] = await Redemption.aggregate(
      acquisitionPipeline(merchant._id, start, end),
    );
    return asNumber(row?.acquired);
  };

  const [today, yesterday, todayViews, yesterdayViews, todayAcquired, yesterdayAcquired] =
    await Promise.all([
      redemptionSummary(todayStart, tomorrowStart),
      redemptionSummary(yesterdayStart, todayStart),
      viewSummary(todayStart, tomorrowStart),
      viewSummary(yesterdayStart, todayStart),
      acquiredCount(todayStart, tomorrowStart),
      acquiredCount(yesterdayStart, todayStart),
    ]);

  return res.status(200).json({
    timezone: REPORT_TIMEZONE,
    date: todayStart,
    today: {
      customersAcquired: todayAcquired,
      redemptions: today.redemptions,
      sales: today.sales,
      discountGiven: today.discount,
      views: todayViews.views,
      uniqueViewers: todayViews.uniqueViewers,
    },
    yesterday: {
      customersAcquired: yesterdayAcquired,
      redemptions: yesterday.redemptions,
      sales: yesterday.sales,
      discountGiven: yesterday.discount,
      views: yesterdayViews.views,
      uniqueViewers: yesterdayViews.uniqueViewers,
    },
    change: {
      customersAcquired: percentChange(todayAcquired, yesterdayAcquired),
      redemptions: percentChange(today.redemptions, yesterday.redemptions),
      sales: percentChange(today.sales, yesterday.sales),
      views: percentChange(todayViews.views, yesterdayViews.views),
    },
  });
};

// @desc    Full monthly insights report
// @route   GET /api/merchants/me/analytics/monthly?month=YYYY-MM
// @access  Private (merchant)
export const getMonthlyAnalytics = async (req, res) => {
  const merchant = await getMerchantForOwner(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const range = resolveMonthRange(req.query.month);
  const { start, end, previousStart, previousEnd } = range;

  const completedInRange = (from, to) => ({
    merchantId: merchant._id,
    status: { $in: COMPLETED_STATUSES },
    createdAt: { $gte: from, $lt: to },
  });

  const [
    revenueRow,
    previousRevenueRow,
    dailyRevenueRows,
    dailyAcquisitionRows,
    acquiredRow,
    previousAcquiredRow,
    visitRows,
    offerRows,
    viewRows,
    peakRows,
    customerIdRows,
  ] = await Promise.all([
    // Revenue + volume for the month
    Redemption.aggregate([
      { $match: completedInRange(start, end) },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $toDouble: { $ifNull: ["$totals.final", 0] } } },
          discount: { $sum: { $toDouble: { $ifNull: ["$totals.discount", 0] } } },
          redemptions: { $sum: 1 },
          customers: { $addToSet: "$customerId" },
        },
      },
      {
        $project: {
          revenue: 1,
          discount: 1,
          redemptions: 1,
          activeCustomers: { $size: "$customers" },
        },
      },
    ]),
    // Same shape for the previous month, for the comparison chips
    Redemption.aggregate([
      { $match: completedInRange(previousStart, previousEnd) },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $toDouble: { $ifNull: ["$totals.final", 0] } } },
          redemptions: { $sum: 1 },
        },
      },
    ]),
    // Daily revenue series
    Redemption.aggregate([
      { $match: completedInRange(start, end) },
      {
        $group: {
          _id: localDayGroup("$createdAt"),
          revenue: { $sum: { $toDouble: { $ifNull: ["$totals.final", 0] } } },
          redemptions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Redemption.aggregate(acquisitionPipeline(merchant._id, start, end, { daily: true })),
    Redemption.aggregate(acquisitionPipeline(merchant._id, start, end)),
    Redemption.aggregate(acquisitionPipeline(merchant._id, previousStart, previousEnd)),
    // Visit counts per customer within the month, for the repeat-customer split
    Redemption.aggregate([
      { $match: completedInRange(start, end) },
      { $match: { customerId: { $ne: null } } },
      { $group: { _id: "$customerId", visits: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: { $sum: { $cond: [{ $gte: ["$visits", 2] }, 1, 0] } },
          totalVisits: { $sum: "$visits" },
        },
      },
    ]),
    // Per-offer redemptions and revenue
    Redemption.aggregate([
      { $match: { ...completedInRange(start, end), offerId: { $ne: null } } },
      {
        $group: {
          _id: "$offerId",
          redemptions: { $sum: 1 },
          revenue: { $sum: { $toDouble: { $ifNull: ["$totals.final", 0] } } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 50 },
    ]),
    // Per-offer views, joined to the above in JS
    OfferView.aggregate([
      { $match: { merchantId: merchant._id, createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$offerId",
          views: { $sum: 1 },
          viewers: { $addToSet: "$viewerKey" },
        },
      },
      { $project: { views: 1, uniqueViewers: { $size: "$viewers" } } },
    ]),
    // Hour x weekday matrix, bucketed in the reporting timezone
    Redemption.aggregate([
      { $match: completedInRange(start, end) },
      {
        $group: {
          _id: {
            weekday: { $dayOfWeek: { date: "$createdAt", timezone: REPORT_TIMEZONE } },
            hour: { $hour: { date: "$createdAt", timezone: REPORT_TIMEZONE } },
          },
          redemptions: { $sum: 1 },
          revenue: { $sum: { $toDouble: { $ifNull: ["$totals.final", 0] } } },
        },
      },
    ]),
    // Distinct customers in the month, for the demographics lookup
    Redemption.aggregate([
      { $match: completedInRange(start, end) },
      { $match: { customerId: { $ne: null } } },
      { $group: { _id: "$customerId" } },
    ]),
  ]);

  const summary = revenueRow[0] || {};
  const previousSummary = previousRevenueRow[0] || {};
  const visits = visitRows[0] || {};
  const acquired = asNumber(acquiredRow[0]?.acquired);
  const previousAcquired = asNumber(previousAcquiredRow[0]?.acquired);

  const revenue = Math.round(asNumber(summary.revenue));
  const redemptions = asNumber(summary.redemptions);
  const previousRevenue = Math.round(asNumber(previousSummary.revenue));

  // ---- Offer performance -------------------------------------------------
  const viewsByOffer = new Map(viewRows.map((row) => [String(row._id), row]));
  const offerIds = new Set([
    ...offerRows.map((row) => String(row._id)),
    ...viewRows.map((row) => String(row._id)),
  ]);

  const offerDocs = await Offer.find({ _id: { $in: [...offerIds] } })
    .select("_id title image customImage useCustomImage status discountType discountValue")
    .lean();

  const offerMeta = new Map(offerDocs.map((offer) => [String(offer._id), offer]));
  const redemptionsByOffer = new Map(offerRows.map((row) => [String(row._id), row]));

  const offerPerformance = [...offerIds]
    .map((id) => {
      const meta = offerMeta.get(id);
      const perf = redemptionsByOffer.get(id);
      const viewStats = viewsByOffer.get(id);

      const offerViews = asNumber(viewStats?.views);
      const offerRedemptions = asNumber(perf?.redemptions);

      return {
        id,
        title: meta?.title || "Deleted offer",
        image: meta?.useCustomImage ? meta?.customImage || meta?.image : meta?.image,
        status: meta?.status || "unknown",
        discountType: meta?.discountType || null,
        discountValue: meta?.discountValue ?? null,
        views: offerViews,
        uniqueViewers: asNumber(viewStats?.uniqueViewers),
        redemptions: offerRedemptions,
        revenue: Math.round(asNumber(perf?.revenue)),
        // Null rather than 0 when there is nothing to divide by, so the UI can show
        // a dash instead of implying a 0% conversion that was never measured.
        conversionRate: offerViews > 0
          ? Math.round((offerRedemptions / offerViews) * 1000) / 10
          : null,
      };
    })
    .sort((left, right) => right.revenue - left.revenue || right.redemptions - left.redemptions);

  // ---- Peak periods ------------------------------------------------------
  // $dayOfWeek is 1=Sunday..7=Saturday.
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const matrix = weekdayLabels.map((label) => ({
    weekday: label,
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, redemptions: 0, revenue: 0 })),
  }));

  let peakCell = null;
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, redemptions: 0, revenue: 0 }));
  const byWeekday = weekdayLabels.map((label) => ({ weekday: label, redemptions: 0, revenue: 0 }));

  for (const row of peakRows) {
    const weekdayIndex = (row._id.weekday || 1) - 1;
    const hour = row._id.hour || 0;
    const cell = matrix[weekdayIndex]?.hours[hour];
    if (!cell) continue;

    cell.redemptions = row.redemptions;
    cell.revenue = Math.round(asNumber(row.revenue));

    byHour[hour].redemptions += row.redemptions;
    byHour[hour].revenue += Math.round(asNumber(row.revenue));
    byWeekday[weekdayIndex].redemptions += row.redemptions;
    byWeekday[weekdayIndex].revenue += Math.round(asNumber(row.revenue));

    if (!peakCell || row.redemptions > peakCell.redemptions) {
      peakCell = {
        weekday: weekdayLabels[weekdayIndex],
        hour,
        redemptions: row.redemptions,
      };
    }
  }

  const busiestHour = byHour.reduce(
    (best, entry) => (entry.redemptions > best.redemptions ? entry : best),
    byHour[0],
  );
  const busiestDay = byWeekday.reduce(
    (best, entry) => (entry.redemptions > best.redemptions ? entry : best),
    byWeekday[0],
  );

  // ---- Demographics ------------------------------------------------------
  const customerIds = customerIdRows.map((row) => row._id);
  const customers = customerIds.length
    ? await User.find({ _id: { $in: customerIds } })
        .select("gender age dob city")
        .lean()
    : [];

  const tally = (entries) => {
    const counts = new Map();
    for (const entry of entries) {
      counts.set(entry, (counts.get(entry) || 0) + 1);
    }
    return counts;
  };

  const toBreakdown = (counts, total, order = null) => {
    const rows = [...counts.entries()].map(([label, count]) => ({
      label,
      count,
      share: total ? Math.round((count / total) * 1000) / 10 : 0,
    }));

    if (order) {
      rows.sort((a, b) => {
        const ai = order.indexOf(a.label);
        const bi = order.indexOf(b.label);
        return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi);
      });
    } else {
      rows.sort((a, b) => b.count - a.count);
    }

    return rows;
  };

  const totalCustomers = customers.length;
  const genderCounts = tally(customers.map((c) => normalizeGender(c.gender)));
  const ageCounts = tally(customers.map((c) => ageBandFor(resolveAge(c))));
  const cityCounts = tally(
    customers.map((c) => (String(c.city || "").trim() ? c.city.trim() : UNKNOWN_BUCKET)),
  );

  // Coverage is reported alongside every breakdown. These fields are optional on the
  // User model, so a chart without this number would be read as fact when it isn't.
  const coverage = (counts) =>
    totalCustomers
      ? Math.round(((totalCustomers - (counts.get(UNKNOWN_BUCKET) || 0)) / totalCustomers) * 1000) / 10
      : 0;

  return res.status(200).json({
    timezone: REPORT_TIMEZONE,
    month: { key: range.key, label: range.label, start, end },

    summary: {
      revenue,
      previousRevenue,
      revenueChange: percentChange(revenue, previousRevenue),
      redemptions,
      redemptionsChange: percentChange(redemptions, asNumber(previousSummary.redemptions)),
      discountGiven: Math.round(asNumber(summary.discount)),
      averageOrderValue: redemptions ? Math.round(revenue / redemptions) : 0,
      activeCustomers: asNumber(summary.activeCustomers),
    },

    acquisition: {
      acquired,
      previousAcquired,
      change: percentChange(acquired, previousAcquired),
      daily: buildDailySeries(start, end, dailyAcquisitionRows, ["acquired"]),
    },

    repeatCustomers: {
      total: asNumber(visits.totalCustomers),
      repeat: asNumber(visits.repeatCustomers),
      oneTime: asNumber(visits.totalCustomers) - asNumber(visits.repeatCustomers),
      repeatRate: visits.totalCustomers
        ? Math.round((asNumber(visits.repeatCustomers) / asNumber(visits.totalCustomers)) * 1000) / 10
        : 0,
      averageVisits: visits.totalCustomers
        ? Math.round((asNumber(visits.totalVisits) / asNumber(visits.totalCustomers)) * 10) / 10
        : 0,
    },

    revenueSeries: buildDailySeries(start, end, dailyRevenueRows, ["revenue", "redemptions"]),

    offerPerformance,
    bestOffers: offerPerformance.slice(0, 5),

    peakPeriods: {
      matrix,
      byHour,
      byWeekday,
      busiestHour: busiestHour?.redemptions ? busiestHour : null,
      busiestDay: busiestDay?.redemptions ? busiestDay : null,
      peakSlot: peakCell,
    },

    demographics: {
      totalCustomers,
      gender: {
        coverage: coverage(genderCounts),
        breakdown: toBreakdown(genderCounts, totalCustomers, [
          "Female",
          "Male",
          "Other",
          UNKNOWN_BUCKET,
        ]),
      },
      age: {
        coverage: coverage(ageCounts),
        breakdown: toBreakdown(ageCounts, totalCustomers, [
          ...AGE_BANDS.map((band) => band.label),
          UNKNOWN_BUCKET,
        ]),
      },
      city: {
        coverage: coverage(cityCounts),
        breakdown: toBreakdown(cityCounts, totalCustomers).slice(0, 8),
      },
    },
  });
};
