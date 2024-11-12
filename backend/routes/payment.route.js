import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createCheckoutSession,
  verifyPaymentStatus,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.post("/verify", protectRoute, verifyPaymentStatus);

export default router;
