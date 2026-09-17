import { isPushEnabled, getPushDisabledReason } from "../../../config/firebase.js";
import {
  PUSH_PLATFORMS,
  isValidPlatform,
  normalizePlatform,
  registerToken,
  removeToken,
} from "../services/pushService.js";
import { sendPushToUser } from "../services/pushService.js";

// Never hand a full FCM token back to a client — it's a send credential for
// that device. Enough of a fingerprint to identify the row, nothing more.
const maskToken = (token = "") =>
  token.length <= 12 ? "•".repeat(token.length) : `${token.slice(0, 6)}…${token.slice(-4)}`;

export const registerPushToken = async (req, res) => {
  const { token, platform } = req.body || {};

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "token is required" });
  }

  if (!isValidPlatform(platform)) {
    return res.status(400).json({
      message: `platform must be one of: ${PUSH_PLATFORMS.join(", ")}`,
    });
  }

  try {
    const saved = await registerToken(req.user._id, { token, platform });

    return res.status(200).json({
      message: "Push token registered",
      platform: saved.platform,
      pushEnabled: isPushEnabled(),
    });
  } catch (error) {
    console.error("[FCM] registerPushToken failed:", error.message);
    return res.status(500).json({ message: "Failed to register push token" });
  }
};

export const unregisterPushToken = async (req, res) => {
  // Sent on logout, which for `navigator.sendBeacon` style calls may arrive as
  // a query param rather than a JSON body.
  const token = req.body?.token || req.query?.token;

  if (!token) {
    return res.status(400).json({ message: "token is required" });
  }

  try {
    const { removed } = await removeToken(req.user._id, token);
    return res.status(200).json({ message: removed ? "Push token removed" : "Token not found" });
  } catch (error) {
    console.error("[FCM] unregisterPushToken failed:", error.message);
    return res.status(500).json({ message: "Failed to remove push token" });
  }
};

export const getMyPushTokens = async (req, res) => {
  const fcmTokens = req.user.fcmTokens || {};

  const devices = PUSH_PLATFORMS.flatMap((platform) =>
    (fcmTokens[platform] || []).map((entry) => ({
      platform,
      token: maskToken(entry.token),
      lastSeenAt: entry.lastSeenAt || null,
    })),
  );

  return res.status(200).json({
    devices,
    counts: PUSH_PLATFORMS.reduce((acc, platform) => {
      acc[platform] = (fcmTokens[platform] || []).length;
      return acc;
    }, {}),
    pushEnabled: isPushEnabled(),
    ...(isPushEnabled() ? {} : { disabledReason: getPushDisabledReason() }),
  });
};

/**
 * Fire a test push at the caller's own devices. Deliberately scoped to
 * `req.user` so this can't be used to spam anyone else.
 */
export const sendTestPush = async (req, res) => {
  if (!isPushEnabled()) {
    return res.status(503).json({
      message: "Push is not configured on this server",
      disabledReason: getPushDisabledReason(),
    });
  }

  if (!isValidPlatform(req.body?.platform)) {
    return res.status(400).json({
      message: `platform must be one of: ${PUSH_PLATFORMS.join(", ")}`,
    });
  }

  const platform = req.body?.platform ? [normalizePlatform(req.body.platform)] : PUSH_PLATFORMS;

  const result = await sendPushToUser(req.user._id, {
    title: "Offerly test notification",
    body: "Push notifications are working on this device 🎉",
    type: "general",
    data: { type: "test" },
    link: "/notifications",
    platforms: platform,
  });

  return res.status(200).json({ message: "Test push dispatched", result });
};
