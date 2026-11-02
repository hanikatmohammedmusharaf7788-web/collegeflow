import dotenv from "dotenv";

dotenv.config();

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Admin from "./models/Admin.js";
import Student from "./models/Student.js";
import authRoutes from "./routes/auth.js";
import portalRoutes from "./routes/portal.js";
import facultyRoutes from "./routes/faculty.js";
import adminRoutes from "./routes/admin.js";
import supportRoutes from "./routes/support.js";
import announcementRoutes from "./routes/announcements.js";
import { isCampusFlowApiRunning } from "./utils/apiProbe.js";
import { getAllowedClientOrigins } from "./utils/clientUrl.js";

const app = express();
const clientPort = process.env.VITE_PORT || "5173";
const allowedClientOrigins = getAllowedClientOrigins(clientPort);
let initializationPromise;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedClientOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error("Origin is not allowed by CORS.");
      error.code = "CORS_ORIGIN_DENIED";
      callback(error);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "8mb" }));

async function initializeBackend() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required.");
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await Student.updateMany(
    { mustChangePassword: { $exists: false } },
    { $set: { mustChangePassword: true } },
  );

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const admin = await Admin.findOne({ email });

    if (!admin) {
      await Admin.create({
        name: process.env.ADMIN_NAME || "Campus Administrator",
        email,
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      });
      console.log("✅ Default Admin Created");
    }
  }
}

mongoose.connection.on("disconnected", () => {
  initializationPromise = undefined;
});

async function ensureBackendInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeBackend().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }
  await initializationPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureBackendInitialized();
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api", portalRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === "CORS_ORIGIN_DENIED") {
    return res.status(403).json({ message: "This origin is not allowed." });
  }

  if (err.code === 11000) {
    return res
      .status(409)
      .json({ message: "Email or Student ID already exists." });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
    ? err.status
    : 500;
  const message = status === 500
    ? "Internal Server Error"
    : err.type === "entity.parse.failed"
      ? "Request body is invalid JSON."
      : err.message || "Request failed.";
  res.status(status).json({ message });
});

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    let existingApi;
    try {
      existingApi = await isCampusFlowApiRunning(PORT);
    } catch (error) {
      console.error("❌ Could not check whether the API is already running.");
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    if (existingApi) {
      console.log(`ℹ️ CampusFlow API is already running on port ${PORT}; skipping duplicate startup.`);
      return;
    }

    await ensureBackendInitialized();
    console.log("✅ MongoDB Connected");

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      if (process.env.CLIENT_URL) {
        console.log(`🌐 Client URL configured: ${process.env.CLIENT_URL}`);
      }
    });
    server.once("error", async (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Another process started the API at the same time.`);
      } else {
        console.error("❌ API server failed to listen.");
        console.error(error.message);
      }
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error("❌ Could not close the MongoDB connection after the server failed.");
        console.error(disconnectError.message);
      }
      process.exitCode = 1;
    });
  } catch (error) {
    console.error("❌ Backend initialization failed.");
    console.error(error.message);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  startServer();
}

export default app;
