import express from "express";

import { authorize, optionalAuth, protect } from "../../../middlewares/auth.js";
import {
  createOffer,
  deleteOffer,
  getOffersFeed,
  getMyOffers,
  getOfferById,
  getOffers,
  updateOffer,
} from "../controllers/offerController.js";

const router = express.Router();

router.get("/", optionalAuth, getOffers);
router.get("/feed", optionalAuth, getOffersFeed);
router.get("/mine", protect, authorize("merchant", "admin"), getMyOffers);
router.get("/:id", optionalAuth, getOfferById);
router.post("/", protect, authorize("merchant"), createOffer);
router.put("/:id", protect, authorize("merchant"), updateOffer);
router.delete("/:id", protect, authorize("merchant"), deleteOffer);

export default router;
