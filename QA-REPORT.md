# CampusFlow SQA and Production Readiness Report

**Assessment date:** 2026-10-26  
**Scope:** Source, configuration, installed dependencies, local application startup, targeted API behavior, and the browser-visible login/recovery screens.  
**Environment:** Windows; Vite on port 5176, Express on port 5001, MongoDB connected.

## Executive summary

The production frontend builds successfully, the API connected to MongoDB during the assessment, and the local portal and password-recovery flow responded. Ten confirmed issues were fixed, including the CORS mismatch, a vulnerable production parser version, a weak local JWT secret, missing authentication rate limits, unsafe CSV exports, session revocation after account deletion or password change, and duplicate API startup collisions.

This is **not a full production sign-off**. Seven risks remain, particularly unverified account identity, exposed environment credentials that need rotation at their providers, moderate development-tool advisories, unbounded admin data reads, and incomplete automated coverage. Only seven automated tests exist after this assessment; CRUD, attendance, role-specific dashboards, SMTP delivery, and database writes were not exercised against live account data.

## Findings register

### Fixed findings

#### QA-01 — Configured frontend origins were rejected

- **Severity / category:** Medium — API / Security
- **File / function / lines:** [server/index.js](./server/index.js), CORS origin configuration, lines 20–39.
- **Root cause:** The allowlist did not include localhost and loopback origins on the configured Vite port.
- **Impact:** Browser API requests from the current frontend could fail with a CORS error.
- **Correction:** Allow the configured Vite port on localhost and 127.0.0.1, retain the explicit `CLIENT_URL`, and stop stripping `Origin` in the dev proxy.
- **Best practice:** Keep CORS allowlists explicit and avoid proxy workarounds that bypass origin checks.
- **Verification:** Local and configured LAN origins returned 200; the stale screenshot origin received a generic 403.

#### QA-02 — API errors leaked exception messages and used misleading statuses

- **Severity / category:** Medium — Backend / API
- **File / function / lines:** [server/index.js](./server/index.js), error middleware, lines 81–102.
- **Root cause:** Internal exception text was returned to clients, while CORS denials were treated as internal errors.
- **Impact:** Error responses could disclose implementation details and mislead clients or monitors.
- **Correction:** CORS denials return 403; malformed JSON returns 400; unexpected failures return a generic 500. A JSON API fallback was added.
- **Best practice:** Keep diagnostic details in server logs and return stable, non-sensitive client messages.
- **Verification:** A disallowed origin returned HTTP 403 with a generic response.

#### QA-03 — Health endpoint did not reflect database readiness

- **Severity / category:** Medium — Backend / Operations
- **File / function / lines:** [server/index.js](./server/index.js), `GET /api/health`, lines 58–64.
- **Root cause:** The route always returned HTTP 200, even when MongoDB was disconnected.
- **Impact:** A readiness monitor could route traffic to an unavailable API.
- **Correction:** Health returns 503 when MongoDB is disconnected and 200 only when connected.
- **Best practice:** Readiness checks should include required dependencies.
- **Verification:** Live health returned 200 with `database: connected`.

#### QA-04 — Vulnerable production request-parser dependency

- **Severity / category:** High — Security / Dependencies
- **File / function / lines:** [package-lock.json](./package-lock.json), `body-parser` resolved dependency, line 1617.
- **Root cause:** The lockfile resolved a parser version affected by a denial-of-service advisory.
- **Impact:** Affected compressed request bodies could consume excessive resources.
- **Correction:** Updated the lockfile to `body-parser` 1.20.9 through the compatible dependency update.
- **Best practice:** Keep lockfiles patched and audit transitive dependencies.
- **Verification:** `npm audit --omit=dev` reports zero vulnerabilities.

#### QA-05 — JWT signing key was short and did not have a startup minimum

- **Severity / category:** High — Security / Authentication
- **File / function / lines:** [server/index.js](./server/index.js), environment validation, lines 53–57; [.env](./.env), `JWT_SECRET` entry.
- **Root cause:** The local key was shorter than the recommended minimum, and startup accepted it.
- **Impact:** A weak or disclosed key increases the risk of forged tokens.
- **Correction:** Replaced the local value with a cryptographically random 256-bit secret and require at least 32 characters at startup. The value is not included in this report.
- **Best practice:** Use a unique, random secret per deployment and store it in a secret manager.
- **Verification:** The API restarted successfully with the new key. Existing sessions were invalidated and require sign-in again.

#### QA-06 — Public authentication endpoints lacked rate limits

- **Severity / category:** High — Security / API
- **File / function / lines:** [server/middleware/rateLimit.js](./server/middleware/rateLimit.js), lines 1–35; [server/routes/auth.js](./server/routes/auth.js), auth endpoints; [server/routes/admin.js](./server/routes/admin.js), admin sign-in.
- **Root cause:** Sign-in, registration, and password reset could be repeatedly attempted.
- **Impact:** Increased exposure to credential guessing, account-creation abuse, and reset-email abuse.
- **Correction:** Added per-IP limits: 10 sign-ins per 15 minutes, 5 account creations per hour, 5 reset requests per 15 minutes, and 10 reset completions per 15 minutes.
- **Best practice:** Use a shared rate-limit store when running multiple API instances.
- **Verification:** An isolated HTTP test confirmed request 11 is rejected with 429.

#### QA-07 — CSV exports could trigger spreadsheet formulas

- **Severity / category:** Medium — Security / Frontend
- **File / function / lines:** [src/csv.js](./src/csv.js), `csvCell`, line 1; [src/App.jsx](./src/App.jsx), attendance CSV export, line 661; [src/AdminPortal.jsx](./src/AdminPortal.jsx), directory CSV export, line 708.
- **Root cause:** CSV quoting escaped delimiters but did not neutralize formula-leading cell values.
- **Impact:** Exported data opened in spreadsheet software could be interpreted as a formula.
- **Correction:** Shared CSV escaping prefixes formula-leading values and escapes embedded quotes.
- **Best practice:** Treat spreadsheet exports as executable formats and neutralize untrusted cell contents.
- **Verification:** Automated checks cover formula prefixes, leading whitespace, quotes, ordinary values, and nulls.

#### QA-08 — Fresh-install environment template was incomplete

- **Severity / category:** Low — Operations / Documentation
- **File / function / lines:** [.env.example](./.env.example), lines 1–19; [README.md](./README.md), setup instructions.
- **Root cause:** Setup instructions named required variables not present in the example.
- **Impact:** Fresh setups could fail or have incomplete reset-email configuration.
- **Correction:** Added the required database, JWT, invite, admin, client URL, mail, and support keys without copying local credentials.
- **Best practice:** Keep templates complete but free of real secrets.
- **Verification:** Compared the template against startup and mail configuration requirements.

#### QA-09 — Deleted accounts and password changes did not revoke existing JWTs

- **Severity / category:** High — Security / Broken access control
- **File / function / lines:** [server/middleware/auth.js](./server/middleware/auth.js), `requireAuth`, lines 6–37; [server/models/Admin.js](./server/models/Admin.js), [server/models/Faculty.js](./server/models/Faculty.js), and [server/models/Student.js](./server/models/Student.js), `tokenVersion` fields; [server/routes/admin.js](./server/routes/admin.js), admin password update; [server/routes/auth.js](./server/routes/auth.js), password reset; [server/routes/portal.js](./server/routes/portal.js), student password update.
- **Root cause:** JWT signature and role were checked without verifying that the account still existed or that a password change had invalidated the token.
- **Impact:** A deleted admin could continue using protected routes for the remainder of the seven-day token lifetime.
- **Correction:** Protected requests now load the account and compare the JWT token version. Password changes and resets increment the stored version; deleted accounts no longer authenticate. Student password changes return the user to sign-in with a clear notice.
- **Best practice:** Enforce account state and revocation centrally in authentication middleware.
- **Verification:** Automated tests cover deleted-account rejection and token-version mismatch rejection. API authorization smoke checks still return 401 without a valid account token.

#### QA-17 — Starting another development copy caused an unhandled port collision

- **Severity / category:** Medium — Backend / Developer experience
- **File / function / lines:** [server/index.js](./server/index.js), `startServer`, lines 106–151; [server/utils/apiProbe.js](./server/utils/apiProbe.js), lines 1–16.
- **Root cause:** Every server startup connected to MongoDB and attempted to listen on the configured port without first detecting an already-running CampusFlow API. The `EADDRINUSE` event was unhandled.
- **Impact:** Starting another `npm run dev` while the existing API was active produced a stack trace and left the duplicate server process failed, even though the original API continued serving requests.
- **Correction:** The API now probes the configured local health endpoint before connecting to MongoDB and skips duplicate startup when a healthy CampusFlow API is present. A listener error handler also reports a clear port collision and closes the MongoDB connection.
- **Best practice:** Run one development stack and reuse its printed URL; provide explicit handling for races during server bind.
- **Verification:** Automated tests cover healthy-server detection and free-port detection. Starting a second server against the live healthy API logs a skip message without opening another listener.

### Open findings and deployment risks

#### QA-10 — Account registration does not prove identity or email ownership

- **Severity / category:** High — Security / Authentication
- **File / function / lines:** [server/routes/auth.js](./server/routes/auth.js), student registration around line 170 and faculty registration around line 126.
- **Root cause:** Registration checks for duplicate identifiers but does not prove that the registrant owns the email address or is entitled to the student/faculty identifier.
- **Impact:** A person may claim an unused identity and access an account under that identity.
- **Correction status:** Not changed; safe onboarding depends on whether the college requires pre-provisioned rosters or verified self-service registration.
- **Best practice:** Bind registration to a pre-provisioned roster and/or verified official email before issuing a session.
- **Verification needed:** Add integration tests for ownership checks and activation/verification tokens once the policy is selected.

#### QA-11 — Other credentials in the local environment require provider-side rotation

- **Severity / category:** High — Security / Secrets management
- **File / function / lines:** [.env](./.env), database, mail, invite-code, and administrator settings. Secret values are intentionally omitted.
- **Root cause:** The supplied environment file contains credentials beyond the JWT key.
- **Impact:** If any were exposed or reused, an unauthorized party could access connected services or accounts.
- **Correction status:** The local JWT key was rotated. Database credentials, mail-provider credentials, administrator password, and invitation code require rotation at their respective providers and should then be updated in `.env`.
- **Best practice:** Use a secret manager and treat shared credentials as exposed; never paste them into chat or commit them.
- **Verification needed:** Rotate provider values, confirm old values no longer authenticate, and verify the application with the replacements.

#### QA-12 — Moderate advisories remain in development/build dependencies

- **Severity / category:** Medium — Security / Dependencies
- **File / function / lines:** [package.json](./package.json), Tailwind 3 dependency, line 33.
- **Root cause:** The Tailwind 3/PostCSS dependency chain uses an affected selector parser. The available npm fix requires a major Tailwind 4 migration.
- **Impact:** Advisory exposure applies to the build/development toolchain; the production dependency audit is clean.
- **Correction status:** No force upgrade was applied to avoid an untested breaking migration.
- **Best practice:** Plan the Tailwind migration, validate generated CSS and responsive screens, and then remove the vulnerable chain.
- **Verification:** Full `npm audit` reports three moderate development-tree advisories; `npm audit --omit=dev` reports zero.

#### QA-13 — Rate-limit state is process-local

- **Severity / category:** Medium — Security / Deployment
- **File / function / lines:** [server/middleware/rateLimit.js](./server/middleware/rateLimit.js), `createLimiter`, line 3.
- **Root cause:** Default in-memory counters are not shared between API instances and reset on restart.
- **Impact:** Limits are weaker or inconsistent in a multi-instance deployment.
- **Correction status:** Deferred; current local development uses one API process.
- **Best practice:** Configure a shared persistent rate-limit store and explicit trusted-proxy settings before deployment.
- **Verification needed:** Test limits across multiple instances and proxy configurations.

#### QA-14 — Browser storage and idle-session policy remain architectural risks

- **Severity / category:** Medium — Security / Session management
- **File / function / lines:** [src/App.jsx](./src/App.jsx), token storage and route checks, lines 34–39; [server/routes/auth.js](./server/routes/auth.js), token expiry, lines 18 and 37.
- **Root cause:** The bearer JWT is stored in local storage and expires after seven days; there is no idle-session timeout.
- **Impact:** A successful script injection could read the token, and unattended sessions can remain active.
- **Correction status:** Password-change and account-deletion revocation is fixed; storage and idle timeout are not changed.
- **Best practice:** Evaluate HttpOnly secure cookies with CSRF protections, shorter access-token lifetimes, and an explicit idle-session policy.
- **Verification needed:** Test session expiry, logout, password reset, and browser-restoration behavior after choosing a session design.

#### QA-15 — Admin data access is unbounded

- **Severity / category:** Medium — Performance / Database
- **File / function / lines:** [server/routes/admin.js](./server/routes/admin.js), dashboard collection reads around lines 75–83 and attendance reads around lines 397–416.
- **Root cause:** Some dashboard and list endpoints load full collections and aggregate/filter them in application memory; server-side pagination is not consistently implemented.
- **Impact:** Latency and memory use grow with student, faculty, and attendance records.
- **Correction status:** Deferred; broad pagination changes require coordinated API and UI work.
- **Best practice:** Add pagination and database-side aggregation, then verify with representative data and explain plans.
- **Verification needed:** Benchmark large fixtures and verify indexes with the deployment database.

#### QA-16 — Feature-level automated coverage is incomplete

- **Severity / category:** Medium — Testing / QA
- **File / function / lines:** [package.json](./package.json), scripts; [tests/core-safeguards.test.js](./tests/core-safeguards.test.js).
- **Root cause:** The project had no test script or suite. This assessment added focused Node tests but did not add component or database-backed end-to-end coverage.
- **Impact:** CRUD, attendance, leave approval, role dashboards, SMTP delivery, and full navigation can regress without detection.
- **Correction:** Added `npm test` and seven tests for CSV escaping, authentication, role enforcement, token revocation, and rate limiting.
- **Best practice:** Add isolated database-backed API tests and browser E2E tests using disposable test data and a test mail transport.
- **Verification:** `npm test` passes all 7 tests; the production build passes. Live data-changing workflows were not run against the configured database.

## Security-review summary

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟠 HIGH | [server/middleware/auth.js](./server/middleware/auth.js) | 6-37 | A deleted account or a token issued before a password change could retain protected access until JWT expiry. **Fixed:** account existence and token-version checks now reject these tokens. | 9/10 |

## Test and inspection summary

- `npm test`: **9 passed, 0 failed** at report update; duplicate-start tests added afterward.
- `npm run build`: **passed**; Vite transformed 2,270 modules.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- Full `npm audit`: **3 moderate development dependency advisories** remain.
- Runtime: frontend HTTP 200; API health HTTP 200 with MongoDB connected; password recovery returned the expected generic response for an unregistered test address; unauthenticated protected endpoints returned 401.
- Browser: login and forgot-password screens rendered; invalid login showed the generic credential error; initial page had no JavaScript errors; no horizontal overflow was observed in sampled desktop/tablet/mobile browser viewports. A deliberate invalid-login request produced an expected HTTP 401 network-console event.
- Not tested against live account data: successful login, registration, reset-token consumption, admin/faculty/student CRUD, attendance writes, leave workflow, file upload/download, announcements, SMTP delivery, logout and long-lived session expiry.
- GPS/geofence check-in is not implemented as a feature; the existing design uses faculty-issued attendance codes and explicitly does not treat browser coordinates as proof.
- MongoDB schema definitions and declared indexes were inspected in source; live collection contents, index state, query plans, and transaction behavior were not independently audited.
- No package lint script, component test suite, database fixture, or E2E test harness exists.
- The directory is not a Git repository, so a repository diff/status review was unavailable.

## Category summary and scores

- **Total tracked findings:** 17
- **Fixed:** 10
- **Open risks:** 7
- **Critical:** 0
- **High:** 6 total (4 fixed, 2 open)
- **Medium:** 9 total
- **Low:** 1 total
- **UI:** No confirmed layout defect in the sampled auth views; protected pages were not visually inspected.
- **Backend/API:** CORS, error handling, health reporting, rate limiting, and session revocation were corrected.
- **Security:** Production dependency tree clean; account identity, external credential rotation, development advisories, and session-storage risks remain.
- **Performance:** No measured optimization was made; admin collection reads remain unbounded. Build output includes a 363 KB main JS chunk (111.65 KB gzip) and a 396.54 KB chart chunk (109.23 KB gzip).
- **Database:** App connected successfully. No live-data mutations, collection-level audits, or query-plan benchmarks were performed.
- **Test coverage:** Seven focused automated tests; no overall coverage percentage was collected.
- **Remaining risks:** QA-10 through QA-16 above.
- **Production readiness:** **66/100** — build and local runtime work, but unresolved identity/secret/dependency and end-to-end QA gaps prevent sign-off.
- **Overall code quality:** **70/100** — focused defensive fixes and tests are in place; scaling, test breadth, and operational configuration need further work.
