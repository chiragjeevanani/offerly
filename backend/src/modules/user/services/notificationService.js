import { emitMerchantNotification, emitUserNotification } from "../../../config/socket.js";
import MerchantNotification from "../../merchant/models/MerchantNotification.js";
import Notification from "../models/Notification.js";
import { sendPushToMerchant, sendPushToUser } from "./pushService.js";

/**
 * One call site for "tell this person something".
 *
 * Fans out to all three channels an account can receive on:
 *   1. a persisted notification doc → the in-app bell / notifications page
 *   2. a socket event               → live update while the app is open
 *   3. an FCM push                  → reaches them when the app is closed
 *
 * Each channel is independent and failures are swallowed — these run inside
 * redemption, approval and reward flows that must not fail because a push
 * couldn't be delivered.
 */
const notify = async (
  { Model, ownerField, emit, ownerId, sendPush },
  {
    title,
    body,
    type = "general",
    data = {},
    // Sockets can carry a whole document; FCM caps a message at 4KB and
    // stringifies every value, so anything bulky goes here and `data` stays
    // small enough to push.
    socketData = null,
    link = "",
    persist = true,
    push = true,
  } = {},
) => {
  const id = String(ownerId);
  const result = { persisted: false, socket: false, push: null };

  if (persist) {
    try {
      await Model.create({ [ownerField]: id, title, body, type, data });
      result.persisted = true;
    } catch (error) {
      console.error("[Notify] Failed to persist notification:", error.message);
    }
  }

  try {
    const socketPayload = socketData ?? data;
    // Emitted both nested and spread onto the root, because existing listeners
    // read it both ways: Bookings.jsx uses `notification.data.customerName`,
    // QrScreen.jsx uses `notification.redemptionId` at the root.
    emit(id, { type, title, body, data: socketPayload, ...socketPayload });
    result.socket = true;
  } catch (error) {
    console.error("[Notify] Socket emit failed (non-blocking):", error.message);
  }

  if (push) {
    result.push = await sendPush(id, { title, body, data: { type, ...data }, link });
  }

  return result;
};

/**
 * @param {string} userId
 * @param {object} payload title, body, type, data, link, persist, push
 */
export const notifyUser = (userId, payload) =>
  notify(
    {
      Model: Notification,
      // The two notification models key their owner differently.
      ownerField: "userId",
      emit: emitUserNotification,
      ownerId: userId,
      sendPush: sendPushToUser,
    },
    payload,
  );

/**
 * MerchantNotification.type is a strict enum — an unlisted value throws and
 * the notification silently never persists, so keep call sites to:
 * offer_approved | subscription_expiry | ad_status | payment | store_status |
 * merchant_application | general
 *
 * @param {string} merchantId
 * @param {object} payload title, body, type, data, link, persist, push
 */
export const notifyMerchant = (merchantId, payload) =>
  notify(
    {
      Model: MerchantNotification,
      ownerField: "merchantId",
      emit: emitMerchantNotification,
      ownerId: merchantId,
      sendPush: sendPushToMerchant,
    },
    payload,
  );

export default notifyUser;
