import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import errorHandler from "./middlewares/error.js";
import adminRoutes from "./modules/admin/routes/adminRoutes.js";
import adminCategoryRoutes from "./modules/admin/routes/categoryRoutes.js";
import cityRoutes from "./modules/admin/routes/cityRoutes.js";
import planRoutes from "./modules/admin/routes/planRoutes.js";
import redemptionRoutes from "./modules/booking/routes/redemptionRoutes.js";
import cartRoutes from "./modules/booking/routes/cartRoutes.js";
import merchantRoutes from "./modules/merchant/routes/merchantRoutes.js";
import offerRoutes from "./modules/merchant/routes/offerRoutes.js";
import productRoutes from "./modules/merchant/routes/productRoutes.js";
import productCategoryRoutes from "./modules/merchant/routes/productCategoryRoutes.js";
import reviewRoutes from "./modules/merchant/routes/reviewRoutes.js";
import servicePlanRoutes from "./modules/merchant/routes/servicePlanRoutes.js";
import variantRoutes from "./modules/merchant/routes/variantRoutes.js";
import paymentRoutes from "./modules/payment/routes/paymentRoutes.js";
import authRoutes from "./modules/user/routes/authRoutes.js";
import userRoutes from "./modules/user/routes/userRoutes.js";
import rewardRoutes from "./modules/rewards/routes/rewardRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL?.split(",").map((item) => item.trim()) || true,
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "30mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(hpp());

const enableRequestLogs = process.env.ENABLE_REQUEST_LOGS === "true";
const logRequestBody = process.env.LOG_REQUEST_BODY === "true";

if (enableRequestLogs) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (logRequestBody && req.body && Object.keys(req.body).length > 0) {
      console.log("Body keys:", Object.keys(req.body));
    }
    next();
  });
}

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/merchants", merchantRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/service-plans", servicePlanRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/redemptions", redemptionRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/upload", uploadRoutes);

app.use((req, res) => {
  return res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

export default app;
