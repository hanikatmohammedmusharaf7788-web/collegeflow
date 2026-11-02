import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { csvCell } from "../src/csv.js";
import Admin from "../server/models/Admin.js";
import Student from "../server/models/Student.js";
import authRoutes from "../server/routes/auth.js";
import { isCampusFlowApiRunning } from "../server/utils/apiProbe.js";
import { requireAuth, requireRole } from "../server/middleware/auth.js";
import { signInLimiter } from "../server/middleware/rateLimit.js";

process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters";

async function withServer(app, run) {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("CSV cells preserve normal data and escape quotes", () => {
  assert.equal(csvCell("CampusFlow"), '"CampusFlow"');
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell(null), '""');
});

test("CSV cells neutralize spreadsheet formulas, including whitespace-prefixed ones", () => {
  for (const value of ["=1+1", "+1+1", "-1+1", "@SUM(A1:A2)", " \t=1+1"]) {
    assert.equal(csvCell(value), `"\'${value}"`);
  }
});

test("authentication middleware rejects missing and invalid tokens", async () => {
  const app = express();
  app.get("/", requireAuth, (_req, res) => res.sendStatus(200));

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(baseUrl)).status, 401);
    assert.equal((await fetch(baseUrl, {
      headers: { Authorization: "Bearer invalid-token" },
    })).status, 401);
  });
});

test("authentication middleware enforces the token role", async () => {
  const app = express();
  app.get("/", requireAuth, requireRole("admin"), (_req, res) => res.sendStatus(200));
  const studentToken = jwt.sign({ userId: "student-id", role: "student" }, process.env.JWT_SECRET);
  const adminToken = jwt.sign({ userId: "admin-id", role: "admin" }, process.env.JWT_SECRET);
  const originalStudentFindById = Student.findById;
  const originalAdminFindById = Admin.findById;
  Student.findById = () => ({ select: async () => ({ tokenVersion: 0 }) });
  Admin.findById = () => ({ select: async () => ({ tokenVersion: 0 }) });

  try {
    await withServer(app, async (baseUrl) => {
      assert.equal((await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${studentToken}` },
      })).status, 403);
      assert.equal((await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })).status, 200);
    });
  } finally {
    Student.findById = originalStudentFindById;
    Admin.findById = originalAdminFindById;
  }
});

test("authentication rejects tokens for deleted accounts", async () => {
  const app = express();
  app.get("/", requireAuth, (_req, res) => res.sendStatus(200));
  const token = jwt.sign({ userId: "deleted-admin", role: "admin", tokenVersion: 0 }, process.env.JWT_SECRET);
  const originalAdminFindById = Admin.findById;
  Admin.findById = () => ({ select: async () => null });

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 401);
    });
  } finally {
    Admin.findById = originalAdminFindById;
  }
});

test("authentication rejects tokens revoked by a password change", async () => {
  const app = express();
  app.get("/", requireAuth, (_req, res) => res.sendStatus(200));
  const token = jwt.sign({ userId: "admin-id", role: "admin", tokenVersion: 0 }, process.env.JWT_SECRET);
  const originalAdminFindById = Admin.findById;
  Admin.findById = () => ({ select: async () => ({ tokenVersion: 1 }) });

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 401);
    });
  } finally {
    Admin.findById = originalAdminFindById;
  }
});

test("sign-in rate limiter blocks requests after the configured threshold", async () => {
  const app = express();
  app.get("/", signInLimiter, (_req, res) => res.sendStatus(200));

  await withServer(app, async (baseUrl) => {
    const responses = await Promise.all(
      Array.from({ length: 11 }, () => fetch(baseUrl)),
    );
    assert.equal(responses.filter((response) => response.status === 429).length, 1);
  });
});

test("startup probe recognizes an already-running connected CampusFlow API", async () => {
  const app = express();
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "connected" });
  });

  await withServer(app, async (baseUrl) => {
    const port = new URL(baseUrl).port;
    assert.equal(await isCampusFlowApiRunning(port), true);
  });
});

test("startup probe treats a closed API port as available", async () => {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve, reject) => {
    probe.close((error) => error ? reject(error) : resolve());
  });

  assert.equal(await isCampusFlowApiRunning(port), false);
});

test("password recovery OTP verification exchanges a valid code for a single-use reset token", async () => {
  const email = "student@college.edu";
  const code = "481205";
  const hash = createHmac("sha256", process.env.JWT_SECRET)
    .update(`student:${email}:${code}`)
    .digest("hex");
  const account = { _id: "student-id", email, passwordResetOtpHash: hash };
  const originalFindOne = Student.findOne;
  const originalFindOneAndUpdate = Student.findOneAndUpdate;
  let updateAttempts = 0;
  let updateFilter;
  let updateChanges;
  Student.findOne = () => ({ select: async () => account });
  Student.findOneAndUpdate = async (filter, changes) => {
    updateAttempts += 1;
    updateFilter = filter;
    updateChanges = changes;
    return updateAttempts === 1 ? account : null;
  };
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/student/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json();
      assert.equal(response.status, 200);
      assert.match(result.token, /^[a-f0-9]{64}$/);
      assert.equal(updateFilter.passwordResetOtpHash, hash);
      assert.ok(updateFilter.passwordResetOtpExpiresAt.$gt instanceof Date);
      assert.equal(updateChanges.$unset.passwordResetOtpHash, 1);
      assert.equal(updateChanges.$unset.passwordResetOtpExpiresAt, 1);

      const replay = await fetch(`${baseUrl}/api/auth/student/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      assert.equal(replay.status, 400);
    });
  } finally {
    Student.findOne = originalFindOne;
    Student.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("admin email reset applies a strong password and revokes existing sessions", async () => {
  const token = "admin-reset-token";
  const originalFindOneAndUpdate = Admin.findOneAndUpdate;
  let updateFilter;
  let updateChanges;
  Admin.findOneAndUpdate = async (filter, changes) => {
    updateFilter = filter;
    updateChanges = changes;
    return { _id: "admin-id" };
  };
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "SecureAdmin1!" }),
      });
      assert.equal(response.status, 200);
      assert.equal(updateFilter.passwordResetTokenHash, createHash("sha256").update(token).digest("hex"));
      assert.ok(updateFilter.passwordResetExpiresAt.$gt instanceof Date);
      assert.notEqual(updateChanges.$set.password, "SecureAdmin1!");
      assert.equal(updateChanges.$inc.tokenVersion, 1);
      assert.equal((await response.json()).message, "Your password has been reset. You can now sign in.");
    });
  } finally {
    Admin.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("student recovery lookup accepts Student ID and returns only the masked email destination", async () => {
  const originalFindOne = Student.findOne;
  let lookup;
  Student.findOne = (query) => {
    lookup = query;
    return { select: async () => ({ email: "hanik23@college.edu" }) };
  };
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/auth/student/recovery-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "STU2025001" }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(lookup, { studentId: "STU2025001" });
      assert.deepEqual(await response.json(), {
        email: "h*****23@college.edu",
      });
    });
  } finally {
    Student.findOne = originalFindOne;
  }
});
