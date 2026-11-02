# CampusFlow College Portal

A responsive college ERP portal built with React, Tailwind CSS, Express, and MongoDB. Role-based sign-in opens the student portal, faculty workspace, or administrator console. Admin tools cover campus dashboards, student and faculty directories, academic catalogs, attendance, leave approvals, reports, and settings.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection URI

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and set `MONGODB_URI`, a unique random `JWT_SECRET` of at least 32 characters, a private `FACULTY_INVITE_CODE`, and `ADMIN_EMAIL`/`ADMIN_PASSWORD` for the first administrator. `ADMIN_NAME` is optional. To enable student and faculty password recovery by email link or OTP, set `SMTP_USER` to the sending Gmail address, `SMTP_PASSWORD` to a Google App Password for that account, and `SMTP_FROM` to the sender address. Set `SUPPORT_EMAIL` to the campus support address for the optional direct-email link; submitted support requests are stored in CampusFlow and routed to the Admin or Faculty portal. Gmail host and port default to `smtp.gmail.com` and `465`; override `SMTP_HOST`/`SMTP_PORT` if using another provider. Set `CLIENT_URL` to the web app origin used in reset links. Never use your normal Gmail password or commit `.env`. Students choose a unique password when registering; administrators set a unique initial password when creating a student account. Make sure MongoDB is running and reachable at the URI you configured.
3. Start both the API and web app:

   ```sh
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173), or the next available port Vite selects if that port is already in use. The dev server falls back to another free port instead of exiting, and you can keep `CLIENT_URL` pointed at `http://localhost:<same port>` for password-reset links. Choose Student or Faculty to sign in or register, or Admin to sign in with the configured admin credentials.

To test on a phone connected to the same Wi‑Fi, use the computer's LAN address (for example, `http://10.74.141.196:5173`) instead of `localhost`, update `CLIENT_URL` in `.env` to that address, and keep `VITE_API_URL=/api` so the phone uses Vite's API proxy. Restart `npm run dev` after changing `.env`. If the page does not load, check that both devices are on the same network and that Windows Firewall allows Node.js on private networks. If the API or front-end port is already occupied, set `PORT` and/or `VITE_PORT` in `.env` to unused values and keep `CLIENT_URL` on the same host and port as the front-end before restarting.

Faculty account registration requires the private `FACULTY_INVITE_CODE`; only share it with authorized faculty. Faculty records and academic management APIs are scoped to the signed-in faculty role and department. Administrators manage teaching assignments from **Manage Faculty**; faculty can view their assigned subjects and enter marks or attendance only for those assignments.

On first API startup, the server creates the initial administrator account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if that email does not already exist. Admin accounts are not publicly self-registerable; authenticated administrators can add accounts from **Manage Admins**.

Existing student accounts that predate unique-password setup are required to reset their password on their next login. Configure SMTP so they can receive the single-use reset link.

Student-submitted browser coordinates are not treated as proof of attendance. Assigned faculty issue a short-lived class check-in code from **Faculty Portal → Student Attendance**; students enter that code under **Student Portal → Attendance**. Codes expire after 10 minutes and are restricted to the assigned department, year, section, and subject.

The Express API listens on port `5000` by default. Set `CLIENT_URL` when the Vite client runs at a different origin. To point the client at another API URL, set `VITE_API_URL` (for example, `http://localhost:5000/api`).

The Vite development server proxies `/api` requests to the Express server. If the browser reports that it cannot connect to the API, check that `npm run dev` started the API and that MongoDB is available; the API exits at startup when the required environment variables are missing or MongoDB cannot connect.

## Deploy to Vercel

Import the repository into Vercel and keep the project root at this repository's root. The Vercel configuration builds the Vite app from `dist`, while the `api` functions route `/api` and `/api/*` requests through the Express backend. The frontend uses the same-origin `/api` URL by default; do not set `VITE_API_URL` to localhost for a deployment.

Add these environment variables in the Vercel project settings for each deployment environment:

- `MONGODB_URI`: a reachable MongoDB Atlas connection string; allow Vercel's network access in Atlas.
- `JWT_SECRET`: a unique random value of at least 32 characters.
- `FACULTY_INVITE_CODE`: a private faculty registration code.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: credentials for the initial administrator; `ADMIN_NAME` is optional.
- `CLIENT_URL`: the deployed app's full HTTPS origin, used in password-reset links. If omitted, the Vercel production URL or deployment URL is used.
- `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` if password-reset email is required. `SMTP_HOST`, `SMTP_PORT`, and `SUPPORT_EMAIL` are optional according to the email setup above.

After setting the variables, redeploy so the build and serverless functions receive them. Verify the backend at `/api/health`; a healthy response reports `"status": "ok"` and `"database": "connected"`. Vercel functions may scale independently, so the in-memory rate limiter is not shared across instances; use a shared rate-limit store for production traffic.

If another healthy CampusFlow API is already listening on `PORT`, a second server startup detects it and skips opening another MongoDB connection or binding the same port. Start `npm run dev` once; when the portal is already running, open its printed URL instead of starting another copy.

Sign-in, registration, and password-reset endpoints have per-IP rate limits. The default limiter uses in-process memory; configure a shared rate-limit store before deploying multiple API instances.

## API overview

- `POST /api/auth/register` creates a student account using the password chosen at registration; `POST /api/auth/login` issues student JWTs.
- `POST /api/attendance/code-checkin` records a student check-in using a valid instructor-issued class code.
- `POST /api/faculty/attendance/check-in-code` issues an 8-character attendance code for an assigned class; codes expire after 10 minutes.
- Admins manage assignments with `GET/POST /api/admin/faculty/:id/subjects` and `DELETE /api/admin/faculty/:id/subjects/:subjectId`.
- `POST /api/auth/faculty/register` and `POST /api/auth/faculty/login` issue faculty JWTs.
- `POST /api/auth/student/recovery-options` accepts a registered student email or Student ID and returns the masked college email used for email OTP and password reset links.
- `POST /api/auth/student/forgot-password` accepts a registered student email or Student ID and emails a one-hour, single-use password reset link; `POST /api/auth/student/reset-password` applies the new password.
- `POST /api/auth/faculty/forgot-password` emails faculty a one-hour, single-use password reset link; `POST /api/auth/faculty/reset-password` applies the new password.
- `POST /api/auth/admin/forgot-password` emails administrators a one-hour, single-use password reset link; `POST /api/auth/admin/reset-password` applies the new password.
- `POST /api/auth/student/send-otp` accepts a registered student email or Student ID; faculty OTP requests accept email. Recovery codes expire after 10 minutes; the corresponding `/verify-otp` endpoints exchange a valid code for a 15-minute, single-use password reset token.
- Authenticated students and faculty can submit support requests through `POST /api/support`. Requests are stored in CampusFlow and routed to the Admin, the assigned class teacher, or the designated department HOD; `GET /api/support/contact` returns the configured support inbox for optional direct email.
- Admins can broadcast announcements to all students and faculty; faculty can send announcements to one of their assigned classes or to their department HOD. Authenticated users retrieve announcements addressed to them with `GET /api/announcements`; Admin and Faculty send announcements with `POST /api/announcements`.
- Students can submit one teaching review per assigned faculty/subject for their current semester through `POST /api/faculty-reviews`; reviews are visible only in the Admin portal at `/admin/faculty-reviews`. The Admin review list identifies students by roll number only.
- `POST /api/admin/login` issues administrator JWTs. All other `/api/admin` endpoints require an admin JWT.
- `/api/admin` provides dashboard summaries, CRUD operations for students, faculty, academic catalogs, and admins, separate student/faculty attendance and leave modules, reports, and college settings. `POST /api/admin/faculty/hod` assigns the HOD using `{ "facultyId": "..." }`; this replaces the current HOD in that faculty member's department.
- Student and faculty routes require `Authorization: Bearer <token>` and enforce their respective JWT roles.
- `GET /api/dashboard` returns the signed-in student's overview data.
- `GET`/`PUT /api/profile` reads and updates profile fields.
- `PUT /api/profile/password` changes the signed-in student's password after verifying the current password.
- Attendance, marks, timetable, leaves, and notifications each support `GET`, `POST`, `PUT /:itemId`, and `DELETE /:itemId` under `/api`.
- Faculty APIs live under `/api/faculty`: dashboard, profile, students, attendance, marks, leaves, subjects, and notifications.
- Faculty attendance is filtered by class and date; attendance and mark writes are restricted to the faculty member's department and assigned subjects.
- `GET /api/health` checks API availability.
