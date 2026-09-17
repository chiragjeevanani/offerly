import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { initSocket } from "./config/socket.js";

import connectDB from "./config/db.js";
import { initFirebase } from "./config/firebase.js";
import { seedDefaultAdmin } from "./modules/admin/utils/adminSeeder.js";
import { seedCategories } from "./seeders/categorySeeder.js";
import { initCronJobs } from "./scripts/cronJobs.js";
import app from "./app.js";

dotenv.config();

const httpServer = createServer(app);
const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedDefaultAdmin();
  await seedCategories();

  // Must run after dotenv.config() above — the credential is read from env
  // at call time, not at import time.
  initFirebase();

  initCronJobs();
  initSocket(httpServer);

  httpServer.listen(port, () => {
    console.log(`Offerly backend running on port ${port} with Socket.io`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

export default app;
