import { getPushDisabledReason, isPushEnabled } from "../../../config/firebase.js";
import Merchant from "../../merchant/models/Merchant.js";
import User from "../models/User.js";
import {
  PUSH_PLATFORMS,
  isValidPlatform,
  normalizePlatform,
  registerToken,
  removeToken,
  sendPush,
} from "../services/pushService.js";

// Never hand a full FCM token back to a client — it's a send credential for
// that device. Enough of a fingerprint to identify the row, nothing more.
const maskToken = (token = "") =>
  token.length <= 12 ? "•".repeat(token.length) : `${token.slice(0, 6)}…${token.slice(-4)}`;

const platformError = () => ({ message: `platform must be one of: ${PUSH_PLATFORMS.join(", ")}` });

/**
 * Builds the four push-token handlers for one persona.
 *
 * Customer and merchant behave identically here — only the collection the
 * token is written to differs — so the logic lives once and each module binds
 * it to its own model. `req.user` is already the right document either way:
 * the auth middleware resolves it from the JWT role.
 */
export const createPushHandlers = (Model) => ({
  register: async (req, res) => {
    const { token, platform } = req.body || {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "token is required" });
    }

    if (!isValidPlatform(platform)) {
      return res.status(400).json(platformError());
    }

    try {
      const saved = await registerToken(Model, req.user._id, { token, platform });

      return res.status(200).json({
        message: "Push token registered",
        platform: saved.platform,
        pushEnabled: isPushEnabled(),
      });
    } catch (error) {
      console.error("[FCM] registerPushToken failed:", error.message);
      return res.status(500).json({ message: "Failed to register push token" });
    }
  },

  unregister: async (req, res) => {
    // Sent on logout, which for `navigator.sendBeacon` style calls may arrive
    // as a query param rather than a JSON body.
    const token = req.body?.token || req.query?.token;

    if (!token) {
      return res.status(400).json({ message: "token is required" });
    }

    try {
      const { removed } = await removeToken(Model, req.user._id, token);
      return res.status(200).json({ message: removed ? "Push token removed" : "Token not found" });
    } catch (error) {
      console.error("[FCM] unregisterPushToken failed:", error.message);
      return res.status(500).json({ message: "Failed to remove push token" });
    }
  },

  list: async (req, res) => {
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
  },

  /**
   * Fire a test push at the caller's own devices. Deliberately scoped to
   * `req.user` so this can't be used to spam anyone else.
   */
  test: async (req, res) => {
    if (!isPushEnabled()) {
      return res.status(503).json({
        message: "Push is not configured on this server",
        disabledReason: getPushDisabledReason(),
      });
    }

    if (!isValidPlatform(req.body?.platform)) {
      return res.status(400).json(platformError());
    }

    const platforms = req.body?.platform ? [normalizePlatform(req.body.platform)] : PUSH_PLATFORMS;

    const result = await sendPush(Model, req.user._id, {
      title: "Offerly test notification",
      body: "Push notifications are working on this device 🎉",
      data: { type: "test" },
      link: Model === Merchant ? "/merchant/notifications" : "/notifications",
      platforms,
    });

    return res.status(200).json({ message: "Test push dispatched", result });
  },
});

const customerHandlers = createPushHandlers(User);

export const registerPushToken = customerHandlers.register;
export const unregisterPushToken = customerHandlers.unregister;
export const getMyPushTokens = customerHandlers.list;
export const sendTestPush = customerHandlers.test;
