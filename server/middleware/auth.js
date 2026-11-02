import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";

const accountModels = { admin: Admin, faculty: Faculty, student: Student };

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required." });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Your session is invalid or expired. Please sign in again." });
  }

  const role = payload.role || "student";
  const userId = payload.userId || payload.studentId;
  const Account = accountModels[role];
  if (!Account || !userId) {
    return res.status(401).json({ message: "Your session is invalid or expired. Please sign in again." });
  }

  try {
    const account = await Account.findById(userId).select("tokenVersion");
    const tokenVersion = Number.isInteger(payload.tokenVersion) ? payload.tokenVersion : 0;
    if (!account || tokenVersion !== (account.tokenVersion || 0)) {
      return res.status(401).json({ message: "Your session is invalid or expired. Please sign in again." });
    }
    req.userId = userId;
    req.studentId = userId;
    req.role = role;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role) return res.status(403).json({ message: "You do not have permission to access this resource." });
    next();
  };
}

export default requireAuth;
