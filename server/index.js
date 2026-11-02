import dotenv from "dotenv";

dotenv.config();

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

const app = express();
const clientPort = process.env.VITE_PORT || "5173";

const allowedClientOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  `http://localhost:${clientPort}`,
  `http://127.0.0.1:${clientPort}`,
  process.env.CLIENT_URL || "http://localhost:5173",
]);

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

// Check environment variables
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env");
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must contain at least 32 characters. Use a unique, randomly generated secret.");
  process.exit(1);
}

// Health Check
app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api", portalRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

// Error Handler
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
      process.exit(1);
    }
    if (existingApi) {
      console.log(`ℹ️ CampusFlow API is already running on port ${PORT}; skipping duplicate startup.`);
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected");

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
  } catch (err) {
    console.error("❌ MongoDB Connection Failed");
    console.error(err.message);
    process.exit(1);
  }
}

startServer();