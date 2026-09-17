import { emitUserNotification } from "../../../config/socket.js";
import Notification from "../models/Notification.js";
import { sendPushToUser } from "./pushService.js";

/**
 * One call site for "tell this customer something".
 *
 * Fans out to all three channels a customer can receive on:
 *   1. a persisted Notification doc  → the in-app bell / notifications page
 *   2. a socket event                → live update while the app is open
 *   3. an FCM push                   → reaches them when the app is closed
 *
 * Each channel is independent and failures are swallowed — these are called
 * from inside redemption/reward flows that must not fail because a push
 * couldn't be delivered.
 *
 * @param {string} userId
 * @param {object} payload
 * @param {string} payload.title
 * @param {string} payload.body
 * @param {string} [payload.type]     stored on the doc and sent in the socket event
 * @param {object} [payload.data]     extra fields; also spread into the socket
 *                                    payload for backwards compatibility with
 *                                    existing listeners (e.g. QrScreen reads
 *                                    `notification.redemptionId` off the root)
 * @param {string} [payload.link]     deep link opened when the push is tapped
 * @param {boolean} [payload.persist] set false for transient pings
 * @param {boolean} [payload.push]    set false to skip FCM
 */
export const notifyUser = async (
  userId,
  { title, body, type = "general", data = {}, link = "", persist = true, push = true } = {},
) => {
  const id = String(userId);
  const result = { persisted: false, socket: false, push: null };

  if (persist) {
    try {
      await Notification.create({ userId: id, title, body, type, data });
      result.persisted = true;
    } catch (error) {
      console.error("[Notify] Failed to persist notification:", error.message);
    }
  }

  try {
    emitUserNotification(id, { type, title, body, ...data });
    result.socket = true;
  } catch (error) {
    console.error("[Notify] Socket emit failed (non-blocking):", error.message);
  }

  if (push) {
    result.push = await sendPushToUser(id, { title, body, type, data: { type, ...data }, link });
  }

  return result;
};

export default notifyUser;
