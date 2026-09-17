import { createPushHandlers } from "../../user/controllers/pushController.js";
import Merchant from "../models/Merchant.js";

// Same four handlers as the customer side, bound to the Merchant collection.
// `req.user` IS the Merchant document for a merchant request (the auth
// middleware picks the collection off the JWT role), so `req.user._id` is the
// merchant id directly — no extra lookup.
const handlers = createPushHandlers(Merchant);

export const registerMerchantPushToken = handlers.register;
export const unregisterMerchantPushToken = handlers.unregister;
export const getMyMerchantPushTokens = handlers.list;
export const sendMerchantTestPush = handlers.test;
