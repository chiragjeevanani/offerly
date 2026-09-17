import { getMessaging } from "../../../config/firebase.js";
import User from "../models/User.js";

// Tokens are stored per platform on the User doc (`fcmTokens.web`,
// `fcmTokens.app`). Everything in here goes through these two helpers so the
// "which array?" decision lives in exactly one place.

// The only two buckets that exist. `web` is the browser; `app` is any native
// shell, Android or iOS alike — we deliberately don't split those, since a
// token is a token and the OS is Firebase's problem, not ours.
export const PUSH_PLATFORMS = ["web", "app"];

export const DEFAULT_PLATFORM = "web";

/**
 * True for the two accepted values, plus omitted (which defaults to web).
 *
 * Callers validate with this before registering so an unexpected value gets a
 * 400 instead of being silently filed under `web` — an Android token landing
 * in the web array would only surface much later as a push that never arrives.
 */
export const isValidPlatform = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  PUSH_PLATFORMS.includes(String(value).trim().toLowerCase());

export const normalizePlatform = (value) => {
  const platform = String(value ?? "").trim().toLowerCase();
  return PUSH_PLATFORMS.includes(platform) ? platform : DEFAULT_PLATFORM;
};

const arrayPath = (platform) => `fcmTokens.${normalizePlatform(platform)}`;

/**
 * Attach an FCM token to a user's platform array.
 *
 * A device can move between accounts (shared phone, logout/login as someone
 * else) and FCM will happily keep delivering to the old owner's topic, so we
 * first strip the token from every other user before adding it here.
 */
export const registerToken = async (userId, { token, platform }) => {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    throw new Error("token is required");
  }

  const resolvedPlatform = normalizePlatform(platform);
  const path = arrayPath(resolvedPlatform);

  // Drop this token from anywhere it currently lives, including this user, so
  // the write below is idempotent and can't create duplicates.
  await User.updateMany(
    {
      $or: [
        { "fcmTokens.web.token": cleanToken },
        { "fcmTokens.app.token": cleanToken },
      ],
    },
    {
      $pull: {
        "fcmTokens.web": { token: cleanToken },
        "fcmTokens.app": { token: cleanToken },
      },
    },
  );

  await User.updateOne(
    { _id: userId },
    {
      $push: {
        [path]: {
          token: cleanToken,
          lastSeenAt: new Date(),
        },
      },
    },
  );

  return { platform: resolvedPlatform, token: cleanToken };
};

/** Remove a token from a single user (logout on one device). */
export const removeToken = async (userId, token) => {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    return { removed: false };
  }

  const result = await User.updateOne(
    { _id: userId },
    {
      $pull: {
        "fcmTokens.web": { token: cleanToken },
        "fcmTokens.app": { token: cleanToken },
      },
    },
  );

  return { removed: (result.modifiedCount || 0) > 0 };
};

/** Remove a token from every user — used when FCM tells us it's dead. */
const purgeToken = async (token) =>
  User.updateMany(
    {
      $or: [
        { "fcmTokens.web.token": token },
        { "fcmTokens.app.token": token },
      ],
    },
    {
      $pull: {
        "fcmTokens.web": { token },
        "fcmTokens.app": { token },
      },
    },
  );

export const getUserTokens = async (userId, platforms = PUSH_PLATFORMS) => {
  const user = await User.findById(userId).select("fcmTokens").lean();

  if (!user?.fcmTokens) {
    return [];
  }

  return platforms
    .map(normalizePlatform)
    .flatMap((platform) => user.fcmTokens[platform] || [])
    .map((entry) => entry?.token)
    .filter(Boolean);
};

// FCM returns these when a token will never work again — anything else
// (quota, internal, unavailable) is transient and the token is kept.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Send a push to every device a user has registered.
 *
 * Never throws: push is a best-effort side channel on top of the socket +
 * persisted notification, so a Firebase outage must not fail the redemption
 * or reward write that triggered it.
 */
export const sendPushToUser = async (
  userId,
  { title, body, data = {}, platforms = PUSH_PLATFORMS, link = "" } = {},
) => {
  try {
    const messaging = getMessaging();

    if (!messaging) {
      return { sent: 0, failed: 0, skipped: "push-disabled" };
    }

    const tokens = await getUserTokens(userId, platforms);

    if (tokens.length === 0) {
      return { sent: 0, failed: 0, skipped: "no-tokens" };
    }

    // FCM data payloads must be flat strings — anything nested or numeric gets
    // rejected at send time, so coerce here rather than at every call site.
    const stringData = Object.entries({ ...data, link })
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .reduce((acc, [key, value]) => {
        acc[key] = typeof value === "string" ? value : JSON.stringify(value);
        return acc;
      }, {});

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "offerly_default",
        },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
      webpush: {
        notification: {
          icon: "/offerly-logo-ring.png",
          badge: "/offerly-logo-ring.png",
        },
        fcmOptions: link ? { link } : undefined,
      },
    });

    // Prune tokens FCM has permanently rejected, otherwise every future send
    // to this user pays for them again.
    const deadTokens = response.responses
      .map((result, index) => (!result.success && DEAD_TOKEN_CODES.has(result.error?.code) ? tokens[index] : null))
      .filter(Boolean);

    if (deadTokens.length > 0) {
      await Promise.all(deadTokens.map((token) => purgeToken(token)));
      console.log(`[FCM] Pruned ${deadTokens.length} dead token(s) for user ${userId}`);
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
      pruned: deadTokens.length,
    };
  } catch (error) {
    console.error("[FCM] sendPushToUser failed (non-blocking):", error.message);
    return { sent: 0, failed: 0, error: error.message };
  }
};
