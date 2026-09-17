import fs from "node:fs";
import path from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";

// Firebase Cloud Messaging is optional: the app boots and runs fine without it
// (sockets still deliver in-app notifications). Everything here degrades to a
// no-op when no service account is configured, so local dev and CI don't need
// Google credentials just to run the server.

let messaging = null;
let initialised = false;
let disabledReason = "";

const readServiceAccount = () => {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    // Accept both raw JSON and base64 — the private key's newlines don't
    // survive .env / PM2 / Vercel env transport as raw JSON, so base64 is the
    // safer default.
    const trimmed = inlineJson.trim();
    const raw = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    return JSON.parse(raw);
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  }

  return null;
};

export const initFirebase = () => {
  if (initialised) {
    return messaging;
  }

  initialised = true;

  try {
    const serviceAccount = readServiceAccount();

    if (!serviceAccount) {
      disabledReason =
        "no FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_PATH set";
      console.warn(`[FCM] Push notifications disabled — ${disabledReason}`);
      return null;
    }

    const existing = getApps();
    const app =
      existing.length > 0
        ? existing[0]
        : initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });

    messaging = getAdminMessaging(app);
    console.log(`[FCM] Initialised for project ${serviceAccount.project_id}`);
    return messaging;
  } catch (error) {
    disabledReason = error.message;
    console.error("[FCM] Initialisation failed — push disabled:", error.message);
    return null;
  }
};

export const getMessaging = () => {
  if (!initialised) {
    return initFirebase();
  }
  return messaging;
};

export const isPushEnabled = () => Boolean(getMessaging());

export const getPushDisabledReason = () => disabledReason;
