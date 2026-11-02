import { rateLimit } from "express-rate-limit";

function createLimiter(limit, windowMs, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

export const signInLimiter = createLimiter(
  10,
  15 * 60 * 1000,
  "Too many sign-in attempts. Try again later.",
);

export const accountCreationLimiter = createLimiter(
  5,
  60 * 60 * 1000,
  "Too many account creation attempts. Try again later.",
);

export const passwordResetRequestLimiter = createLimiter(
  5,
  15 * 60 * 1000,
  "Too many password reset requests. Try again later.",
);

export const passwordResetLimiter = createLimiter(
  10,
  15 * 60 * 1000,
  "Too many password reset attempts. Try again later.",
);

export const passwordResetOtpLimiter = createLimiter(
  5,
  15 * 60 * 1000,
  "Too many verification attempts. Request a new code and try again later.",
);
