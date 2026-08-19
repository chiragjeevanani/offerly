import express from "express";
import rateLimit from "express-rate-limit";

import { authorize, optionalAuth, protect } from "../../../middlewares/auth.js";
import {
  createOffer,
  deleteOffer,
  getOffersFeed,
  getMyOffers,
  getOfferById,
  getOffers,
  recordOfferViews,
  updateOffer,
} from "../controllers/offerController.js";

const router = express.Router();

// This is the one write endpoint reachable without a token, and it is called on a
// timer by every browsing customer - so it gets its own ceiling. Generous enough that
// normal batched flushing never trips it.
const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many view events, slow down" },
});

router.get("/", optionalAuth, getOffers);
router.get("/feed", optionalAuth, getOffersFeed);
router.get("/mine", protect, authorize("merchant", "admin"), getMyOffers);
router.post("/views", viewLimiter, optionalAuth, recordOfferViews);
router.get("/:id", optionalAuth, getOfferById);
router.post("/", protect, authorize("merchant"), createOffer);
router.put("/:id", protect, authorize("merchant"), updateOffer);
router.delete("/:id", protect, authorize("merchant"), deleteOffer);

export default router;
