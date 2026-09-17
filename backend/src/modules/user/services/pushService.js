import { getMessaging } from "../../../config/firebase.js";
import Merchant from "../../merchant/models/Merchant.js";
import User from "../models/User.js";

// Shared push layer for every persona that can own device tokens. It lives in
// the user module because that module already hosts the cross-persona auth
// primitives (authController issues merchant OTPs too), not because anything
// in here is customer-specific.
//
// Tokens are stored per platform on the owner document (`fcmTokens.web`,
// `fcmTokens.app`), so "which array?" is decided in exactly one place.

// The only two buckets that exist. `web` is the browser; `app` is any native
// shell, Android or iOS alike -- we deliberately don't split those, since a
// token is a token and the OS is Firebase's problem, not ours.
export const PUSH_PLATFORMS = ["web", "app"];

export const DEFAULT_PLATFORM = "web";

/**
 * True for the two accepted values, plus omitted (which defaults to web).
 *
 * Callers validate with this before registering so an unexpected value gets a
 * 400 instead of being silently filed under `web` -- an app token landing in
 * the web array would only surface much later as a push that never arrives.
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

// Customer and merchant are served by one SPA on one origin, so a device that
// signs out of one and into the other mints the *same* FCM token. Evicting it
// from every collection before registering keeps one device mapped to exactly
// one signed-in account -- otherwise a merchant would keep receiving pushes
// for the customer account that previously used that browser.
const OWNER_MODELS = [User, Merchant];

const tokenFilter = (token) => ({
  $or: [{ "fcmTokens.web.token": token }, { "fcmTokens.app.token": token }],
});

const pullToken = (token) => ({
  $pull: { "fcmTokens.web": { token }, "fcmTokens.app": { token } },
});

const purgeTokenEverywhere = (token) =>
  Promise.all(OWNER_MODELS.map((Model) => Model.updateMany(tokenFilter(token), pullToken(token))));

/**
 * Attach an FCM token to an owner's platform array.
 *
 * @param {import("mongoose").Model} Model User or Merchant
 * @param {string} ownerId
 */
export const registerToken = async (Model, ownerId, { token, platform }) => {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    throw new Error("token is required");
  }

  const resolvedPlatform = normalizePlatform(platform);

  // Drop this token from everywhere it currently lives, including this owner,
  // so the write below is idempotent and can't create duplicates.
  await purgeTokenEverywhere(cleanToken);

  await Model.updateOne(
    { _id: ownerId },
    {
      $push: {
        [arrayPath(resolvedPlatform)]: {
          token: cleanToken,
          lastSeenAt: new Date(),
        },
      },
    },
  );

  return { platform: resolvedPlatform, token: cleanToken };
};

/** Remove a token from a single owner (logout on one device). */
export const removeToken = async (Model, ownerId, token) => {
  const cleanToken = String(token || "").trim();

  if (!cleanToken) {
    return { removed: false };
  }

  const result = await Model.updateOne({ _id: ownerId }, pullToken(cleanToken));

  return { removed: (result.modifiedCount || 0) > 0 };
};

export const getOwnerTokens = async (Model, ownerId, platforms = PUSH_PLATFORMS) => {
  const owner = await Model.findById(ownerId).select("fcmTokens").lean();

  if (!owner?.fcmTokens) {
    return [];
  }

  return platforms
    .map(normalizePlatform)
    .flatMap((platform) => owner.fcmTokens[platform] || [])
    .map((entry) => entry?.token)
    .filter(Boolean);
};

// FCM returns these when a token will never work again -- anything else
// (quota, internal, unavailable) is transient and the token is kept.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Send a push to every device an owner has registered.
 *
 * Never throws: push is a best-effort side channel on top of the socket and
 * the persisted notification, so a Firebase outage must not fail the
 * redemption, approval or reward write that triggered it.
 */
export const sendPush = async (
  Model,
  ownerId,
  { title, body, data = {}, platforms = PUSH_PLATFORMS, link = "" } = {},
) => {
  try {
    const messaging = getMessaging();

    if (!messaging) {
      return { sent: 0, failed: 0, skipped: "push-disabled" };
    }

    const tokens = await getOwnerTokens(Model, ownerId, platforms);

    if (tokens.length === 0) {
      return { sent: 0, failed: 0, skipped: "no-tokens" };
    }

    // FCM data payloads must be flat strings -- anything nested or numeric
    // gets rejected at send time, so coerce here not at every call site.
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
        notification: { sound: "default", channelId: "offerly_default" },
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
    // to this owner pays for them again.
    const deadTokens = response.responses
      .map((result, index) =>
        !result.success && DEAD_TOKEN_CODES.has(result.error?.code) ? tokens[index] : null,
      )
      .filter(Boolean);

    if (deadTokens.length > 0) {
      await Promise.all(deadTokens.map((token) => purgeTokenEverywhere(token)));
      console.log(
        `[FCM] Pruned ${deadTokens.length} dead token(s) for ${Model.modelName} ${ownerId}`,
      );
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
      pruned: deadTokens.length,
    };
  } catch (error) {
    console.error("[FCM] sendPush failed (non-blocking):", error.message);
    return { sent: 0, failed: 0, error: error.message };
  }
};

// Persona-bound conveniences, so call sites don't have to import the models.
export const sendPushToUser = (userId, payload) => sendPush(User, userId, payload);
export const sendPushToMerchant = (merchantId, payload) => sendPush(Merchant, merchantId, payload);
