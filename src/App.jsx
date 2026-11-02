import { Children, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Download,
  FileText, GraduationCap, KeyRound, LayoutDashboard, LogOut, Mail, Menu, Moon, MoreHorizontal,
  Eye, EyeOff, Megaphone, Search, Settings, ShieldCheck, Sparkles, Star, Sun, Upload, UserRound, X,
} from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "./api.js";
import { csvCell } from "./csv.js";
import SupportPage from "./SupportPage.jsx";
import FacultyPortal from "./FacultyPortal.jsx";
import AnnouncementsPage, { AnnouncementPreview } from "./AnnouncementsPage.jsx";

const AttendanceChart = lazy(() => import("./AttendanceChart.jsx"));
const AdminPortal = lazy(() => import("./AdminPortal.jsx"));

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "My Profile", icon: UserRound },
  { name: "Attendance", icon: Activity },
  { name: "Marks", icon: GraduationCap },
  { name: "Semester Review", icon: Star },
  { name: "Announcements", icon: Megaphone },
  { name: "Timetable", icon: CalendarDays },
  { name: "Leave Application", icon: FileText },
  { name: "Notifications", icon: Bell },
  { name: "Help & Support", icon: CircleHelp },
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("campusflow-token");
  const role = localStorage.getItem("campusflow-role") || "student";
  const handleAuth = (result, selectedRole) => {
    const account = result.user || result.student;
    const accountRole = result.role || account?.role || selectedRole;
    localStorage.setItem("campusflow-token", result.token);
    localStorage.setItem("campusflow-student", JSON.stringify(account));
    localStorage.setItem("campusflow-role", accountRole);
    navigate(accountRole === "admin" ? "/admin" : accountRole === "faculty" ? "/faculty" : "/student");
  };
  const logout = (notice = "", role = "") => {
    const logoutNotice = typeof notice === "string" ? notice : "";
    localStorage.removeItem("campusflow-token");
    localStorage.removeItem("campusflow-student");
    localStorage.removeItem("campusflow-role");
    navigate(role ? `/?role=${role}` : "/", { state: logoutNotice ? { notice: logoutNotice } : undefined });
  };
  return (
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/verify-otp" element={<VerifyOtpScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/" element={token ? <Navigate to={role === "admin" ? "/admin" : role === "faculty" ? "/faculty" : "/student"} replace /> : <AuthScreen onAuth={handleAuth} />} />
      <Route path="/student/*" element={token && role === "student" ? <StudentPortal onLogout={logout} /> : <Navigate to="/" replace state={{ from: location.pathname }} />} />
      <Route path="/faculty/*" element={token && role === "faculty" ? <FacultyPortal onLogout={logout} /> : <Navigate to="/" replace state={{ from: location.pathname }} />} />
      <Route path="/admin/*" element={token && role === "admin" ? <Suspense fallback={<div className="loading-state"><span className="loading-spinner" />Opening admin workspace…</div>}><AdminPortal onLogout={logout} /></Suspense> : <Navigate to="/" replace state={{ from: location.pathname }} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function StudentPortal({ onLogout }) {
  const [student, setStudent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campusflow-student") || "null"); } catch { return null; }
  });
  const [page, setPage] = useState("Dashboard");
  const [dark, setDark] = useState(() => localStorage.getItem("campusflow-dark") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("campusflow-dark", String(dark));
  }, [dark]);

  useEffect(() => {
    const navigate = (event) => setPage(event.detail);
    const shortcuts = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("portal-nav", navigate);
    window.addEventListener("keydown", shortcuts);
    return () => {
      window.removeEventListener("portal-nav", navigate);
      window.removeEventListener("keydown", shortcuts);
    };
  }, []);

  const logout = () => {
    onLogout();
  };

  return (
    <div className="app-shell">
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar glass-panel ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={21} strokeWidth={2.3} /></div>
          <span>campus<span className="brand-light">flow</span></span>
        </div>
        <div className="workspace-switch">
          <div className="college-badge">H</div>
          <div className="workspace-copy"><strong>Hanikat's College of Engineering &amp; Technology (HCET)</strong><small>Student workspace</small><small className="college-tagline">Innovating Minds, Building Futures.</small></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <div className="nav-caption">MENU</div>
        <nav className="side-nav">
          {navigation.map(({ name, icon: Icon }) => (
            <button key={name} className={`nav-item ${page === name ? "active" : ""}`} onClick={() => { setPage(name); setMobileOpen(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{name}</span>
              {name === "Notifications" && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>
        <div className="nav-caption tools-caption">PREFERENCES</div>
        <button className={`nav-item ${page === "Settings" ? "active" : ""}`} onClick={() => { setPage("Settings"); setMobileOpen(false); }}><Settings size={18} /><span>Settings</span></button>
        <div className="sidebar-bottom">
          <button className="help-card" onClick={() => { setPage("Help & Support"); setMobileOpen(false); }}>
            <div className="help-icon"><CircleHelp size={17} /></div>
            <div><strong>Need a hand?</strong><span>Visit the help center</span></div>
            <ArrowRight size={15} />
          </button>
          <button className="profile-mini" onClick={() => setPage("My Profile")}>
            <Avatar student={student} />
            <span className="profile-mini-copy"><strong>{student?.name || "Student"}</strong><small>{student?.studentId || "Student account"}</small></span>
            <MoreHorizontal size={17} className="muted-icon" />
          </button>
          <button className="logout-link" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{page}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input ref={searchRef} placeholder="Search anything..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
            <button className="icon-button theme-button" aria-label="Toggle dark mode" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={19} /> : <Moon size={18} />}</button>
            <button className="icon-button notification-button" aria-label="Open notifications" onClick={() => setPage("Notifications")}><Bell size={19} /><i /></button>
            <button className="top-profile" onClick={() => setPage("My Profile")}><Avatar student={student} /><span>{student?.name?.split(" ")[0] || "Student"}</span><ChevronDown size={14} /></button>
          </div>
        </header>
        <section className="page-content">
          {notice && <div className="toast-message"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={15} /></button></div>}
          <PortalPage page={page} student={student} onProfileUpdate={setStudent} onNotice={setNotice} onLogout={onLogout} search={search} />
        </section>
      </main>
    </div>
  );
}

function Avatar({ student, large = false }) {
  if (student?.photo) return <img className={`avatar ${large ? "avatar-large" : ""}`} src={student.photo} alt="" />;
  const initials = (student?.name || "Student").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <span className={`avatar avatar-initials ${large ? "avatar-large" : ""}`}>{initials}</span>;
}

function AuthScreen({ onAuth }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState(["student", "faculty", "admin"].includes(searchParams.get("role")) ? searchParams.get("role") : "student");
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({ name: "", studentId: "", facultyId: "", department: "Computer Science", inviteCode: "", email: "", password: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(() => location.state?.notice || "");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (register && role !== "admin" && form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const endpoint = role === "admin"
        ? "/admin/login"
        : role === "faculty"
          ? `/auth/faculty/${register ? "register" : "login"}`
          : `/auth/${register ? "register" : "login"}`;
      const payload = { ...form };
      delete payload.confirmPassword;
      const { data } = await api.post(endpoint, payload);
      onAuth(data, role);
    } catch (requestError) {
      if (requestError.response?.data?.code === "PASSWORD_CHANGE_REQUIRED") {
        navigate(`/forgot-password?role=${role}`, { state: { email: form.email } });
      } else {
        setError(errorMessage(requestError));
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-screen">
      <div className="auth-backdrop auth-orb-one" /><div className="auth-backdrop auth-orb-two" />
      <section className="auth-card glass-panel">
        <div className="brand auth-brand"><div className="brand-mark"><GraduationCap size={21} /></div><span>campus<span className="brand-light">flow</span></span></div>
        <div className="auth-heading"><span className="eyebrow"><Sparkles size={14} /> YOUR CAMPUS, CONNECTED</span><h1>{register ? "Your next chapter starts here." : "Welcome back."}</h1><p>{register ? `Create your ${role} account to get started.` : `Sign in to your ${role} portal.`}</p></div>
        <div className="auth-role-switch" role="group" aria-label="Choose portal">
          <button type="button" className={role === "student" ? "selected" : ""} onClick={() => { setRole("student"); setError(""); }}>Student</button>
          <button type="button" className={role === "faculty" ? "selected" : ""} onClick={() => { setRole("faculty"); setError(""); }}>Faculty</button>
          <button type="button" className={role === "admin" ? "selected" : ""} onClick={() => { setRole("admin"); setRegister(false); setError(""); }}>Admin</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          {register && role !== "admin" && <>
            <label>Full name<input required autoComplete="name" placeholder={role === "faculty" ? "e.g. Jordan Lee" : "e.g. Alex Morgan"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>{role === "faculty" ? "Faculty ID" : "Student ID"}<input required placeholder={role === "faculty" ? "e.g. FAC2025001" : "e.g. STU2025001"} value={role === "faculty" ? form.facultyId : form.studentId} onChange={(e) => setForm({ ...form, [role === "faculty" ? "facultyId" : "studentId"]: e.target.value })} /></label>
            {role === "faculty" && <>
              <label>Department<input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
              <label>Faculty invitation code<input type="password" required autoComplete="off" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} placeholder="Provided by your college" /></label>
            </>}
          </>}
          <label>College email<input type="email" required autoComplete="email" placeholder="you@college.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <PasswordField label="Password" required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "At least 8 characters" : "Enter your password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {register && role !== "admin" && <PasswordField label="Confirm password" required minLength={8} autoComplete="new-password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />}
          {error && <p className="form-error">{error}</p>}
          {success && <p className="auth-success" role="status">{success}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait..." : register ? `Create ${role} account` : `Sign in to your ${role} portal`}<ArrowRight size={17} /></button>
        </form>
        {!register && <p className="auth-switch"><button type="button" onClick={() => navigate(`/forgot-password?role=${role}`)}>Forgot password?</button></p>}
        {role !== "admin" && <p className="auth-switch">{register ? "Already have an account?" : "New to CampusFlow?"} <button type="button" onClick={() => { setRegister(!register); setError(""); setSuccess(""); }}> {register ? "Sign in" : "Create an account"}</button></p>}
        <div className="auth-foot"><ShieldCheck size={15} /> Secure {role} access · Your data stays private</div>
      </section>
      <div className="auth-side-note"><span className="auth-decoration">“</span><p>Innovating Minds, Building Futures.</p><small>HANIKAT'S COLLEGE OF ENGINEERING &amp; TECHNOLOGY</small></div>
    </div>
  );
}

function RecoveryLayout({ children }) {
  return (
    <main className="recovery-screen">
      <section className="recovery-card">
        <div className="recovery-brand">
          <span className="recovery-brand-mark"><GraduationCap size={22} /></span>
          <span>campus<span>flow</span></span>
        </div>
        <div className="recovery-content page-transition">{children}</div>
        <footer className="recovery-footer"><ShieldCheck size={16} /> Secure account access <span aria-hidden="true">•</span> Your data stays private</footer>
      </section>
    </main>
  );
}

function ForgotPasswordScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = ["student", "faculty", "admin"].includes(searchParams.get("role")) ? searchParams.get("role") : "student";
  const [identifier, setIdentifier] = useState(location.state?.identifier || location.state?.email || "");
  const [options, setOptions] = useState(location.state?.options || null);
  const [method, setMethod] = useState("email-otp");
  const [stage, setStage] = useState(location.state?.stage || "identifier");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    if (stage !== "sent" || resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((remaining) => remaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, resendIn]);

  const lookupAccount = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/student/recovery-options", { identifier });
      setOptions(data);
      setMethod("email-otp");
      setStage("method");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/student/send-otp", { identifier });
      navigate("/verify-otp", { state: { identifier, role, destination: options.email, options } });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const sendResetLink = async () => {
    setError("");
    setBusy(true);
    try {
      const request = role === "admin" ? { email: identifier } : { identifier };
      await api.post(`/auth/${role}/forgot-password`, request);
      if (role === "admin") setOptions({ email: maskRecoveryEmailForDisplay(identifier) });
      setStage("sent");
      setResendIn(60);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const continueFromMethod = async (event) => {
    event.preventDefault();
    if (method === "email-otp") {
      await sendOtp();
    } else {
      await sendResetLink();
    }
  };

  const resendLink = async () => {
    setError("");
    setBusy(true);
    try {
      const request = role === "admin" ? { email: identifier } : { identifier };
      await api.post(`/auth/${role}/forgot-password`, request);
      setResendIn(60);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (stage === "sent") {
    return (
      <RecoveryLayout>
        <div className="recovery-illustration recovery-email-art"><Mail size={23} strokeWidth={1.8} /><span><Check size={12} /></span></div>
        <div className="recovery-heading">
          <h1>Check your email</h1>
          <p>We've sent a password reset link to</p>
          <strong className="recovery-masked-email">{options?.email}</strong>
        </div>
        {error && <p className="recovery-error" role="alert">{error}</p>}
        <div className="recovery-actions">
          <a className="recovery-primary" href="https://mail.google.com" target="_blank" rel="noreferrer">Open Email <ArrowRight size={17} /></a>
          <button className="recovery-text-button" type="button" onClick={resendLink} disabled={busy || resendIn > 0}>
            {busy ? <span className="recovery-spinner" /> : null}
            {resendIn > 0 ? `Resend Link (${resendIn}s)` : "Resend Link"}
          </button>
          {role !== "admin" && <button className="recovery-text-button" type="button" onClick={() => { setError(""); setStage("method"); }}>Use another recovery method</button>}
          {role === "admin" && <button className="recovery-text-button" type="button" onClick={() => navigate("/?role=admin")}>Back to Admin Sign In</button>}
        </div>
      </RecoveryLayout>
    );
  }

  if (stage === "identifier") {
    return (
      <RecoveryLayout>
        <div className="recovery-heading">
          <h1>{role === "admin" ? "Reset Admin Password" : "Forgot Password"}</h1>
          <p>{role === "admin" ? "Enter your registered administrator email to receive a secure password reset link." : "Enter your registered College Email or Student ID to recover your account."}</p>
        </div>
        <form className="recovery-form" onSubmit={role === "admin" ? (event) => { event.preventDefault(); sendResetLink(); } : lookupAccount}>
          <label className="recovery-label">{role === "admin" ? "Administrator email" : "College Email or Student ID"}
            <input required type={role === "admin" ? "email" : "text"} autoComplete="username" placeholder={role === "admin" ? "admin@college.edu" : "College Email or Student ID"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
          </label>
          {error && <p className="recovery-error" role="alert">{error}</p>}
          <button className="recovery-primary recovery-submit" type="submit" disabled={busy}>{busy ? <><span className="recovery-spinner" /> Sending...</> : <>{role === "admin" ? "Send Reset Link" : "Continue"} <ArrowRight size={17} /></>}</button>
        </form>
        <p className="recovery-signin">Remember your password? <button type="button" onClick={() => navigate(`/?role=${role}`)}>Sign In</button></p>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout>
      <div className="recovery-heading">
        <button className="recovery-back" type="button" onClick={() => { setError(""); setStage("identifier"); }}><ArrowLeft size={16} /> Back</button>
        <h1>Choose Recovery Method</h1>
        <p>We found your account. Choose how you'd like to verify your identity.</p>
        </div>
        <form className="recovery-form" onSubmit={continueFromMethod}>
          <div className="recovery-method-options" role="radiogroup" aria-label="Choose a recovery method">
            <label className={`recovery-method-option ${method === "email-otp" ? "selected" : ""}`}>
              <input type="radio" name="recovery-method" value="email-otp" checked={method === "email-otp"} onChange={() => setMethod("email-otp")} />
              <span className="recovery-method-option-copy"><strong>Send OTP to College Email</strong><span>{options?.email}</span></span>
          </label>
          <label className={`recovery-method-option ${method === "link" ? "selected" : ""}`}>
            <input type="radio" name="recovery-method" value="link" checked={method === "link"} onChange={() => setMethod("link")} />
            <span className="recovery-method-option-copy"><strong>Send Password Reset Link</strong><span>{options?.email}</span></span>
          </label>
        </div>
        {error && <p className="recovery-error" role="alert">{error}</p>}
        <button className="recovery-primary recovery-submit" type="submit" disabled={busy}>
          {busy ? <><span className="recovery-spinner" /> Sending...</> : <>Continue <ArrowRight size={17} /></>}
        </button>
        <button className="recovery-text-button recovery-back-signin" type="button" onClick={() => { setError(""); setStage("identifier"); }}>Back</button>
      </form>
    </RecoveryLayout>
  );
}

function maskRecoveryEmailForDisplay(email) {
  const [localPart, domain] = email.trim().toLowerCase().split("@");
  if (!localPart || !domain) return email;
  const suffix = localPart.length > 2 ? localPart.slice(-2) : "";
  return `${localPart[0]}*****${suffix}@${domain}`;
}

function VerifyOtpScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const identifier = location.state?.identifier || "";
  const role = "student";
  const destination = location.state?.destination || "";
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(600);
  const [resendIn, setResendIn] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef([]);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = window.setTimeout(() => setRemaining((time) => time - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((time) => time - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const updateCode = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code.padEnd(6, " ").slice(0, 6)];
    next[index] = digit || " ";
    const normalized = next.join("").trimEnd();
    setCode(normalized);
    setError("");
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (remaining <= 0) {
      setError("This code has expired. Request a new OTP to continue.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/student/verify-otp", { identifier, code });
      sessionStorage.setItem("campusflow-reset-token", data.token);
      navigate(`/reset-password?role=${role}&source=otp`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/student/send-otp", { identifier });
      setCode("");
      setRemaining(600);
      setResendIn(60);
      inputs.current[0]?.focus();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const useAnotherMethod = () => navigate("/forgot-password", {
    state: { identifier, role, options: location.state?.options, stage: "method" },
  });

  if (!identifier || !destination) {
    return <RecoveryLayout><div className="recovery-heading"><h1>Start recovery again</h1><p>Enter your registered College Email or Student ID to continue.</p></div><button className="recovery-primary recovery-submit" type="button" onClick={() => navigate("/forgot-password")}>Back to recovery <ArrowRight size={17} /></button></RecoveryLayout>;
  }

  return (
    <RecoveryLayout>
      <div className="recovery-heading">
        <h1>Verify Email OTP</h1>
        <p>Enter the 6-digit code sent to</p>
        <strong className="recovery-masked-email">{destination}</strong>
      </div>
      <form className="recovery-form" onSubmit={submit}>
        <div className="recovery-otp" aria-label="One-time password">
          {Array.from({ length: 6 }, (_, index) => (
            <input key={index} ref={(element) => { inputs.current[index] = element; }} aria-label={`Digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} value={code[index] || ""} onChange={(event) => updateCode(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !code[index] && index > 0) inputs.current[index - 1]?.focus(); }} onPaste={(event) => { if (index === 0) { event.preventDefault(); const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); setCode(pasted); inputs.current[Math.min(pasted.length, 5)]?.focus(); } }} />
          ))}
        </div>
        <p className="recovery-countdown">{remaining > 0 ? <>Code expires in <strong>{formatRecoveryTime(remaining)}</strong></> : <strong>Code expired</strong>}</p>
        {error && <p className="recovery-error" role="alert">{error}</p>}
        <button className="recovery-primary recovery-submit" type="submit" disabled={busy || code.length !== 6}><span>{busy ? <><span className="recovery-spinner" /> Verifying...</> : "Verify"}</span></button>
      </form>
      <div className="recovery-otp-links">
        <button type="button" disabled={busy || resendIn > 0} onClick={resend}>{resendIn > 0 ? `Resend OTP (${resendIn}s)` : "Resend OTP"}</button>
        <button type="button" disabled={busy} onClick={useAnotherMethod}>Use another recovery method</button>
      </div>
    </RecoveryLayout>
  );
}

function formatRecoveryTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function PasswordField({ label, value, onChange, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <label>{label}<span className="auth-password-input">
      <input {...inputProps} type={visible ? "text" : "password"} value={value} onChange={onChange} />
      <button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span></label>
  );
}

function ResetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const token = location.state?.token
    || (searchParams.get("source") === "otp" ? sessionStorage.getItem("campusflow-reset-token") : "")
    || searchParams.get("token")
    || "";
  const role = ["student", "faculty", "admin"].includes(searchParams.get("role")) ? searchParams.get("role") : "faculty";
  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = requirements.filter((requirement) => requirement.met).length;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (strength !== requirements.length) {
      setError("Choose a password that meets all the requirements.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/auth/${role}/reset-password`, { token, password });
      sessionStorage.removeItem("campusflow-reset-token");
      setComplete(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (complete) {
    return (
      <RecoveryLayout>
        <div className="recovery-illustration recovery-success-art"><CheckCircle2 size={28} strokeWidth={1.8} /></div>
        <div className="recovery-heading">
          <h1>Password Updated Successfully</h1>
          <p>Your password has been changed successfully.</p>
        </div>
        <div className="recovery-actions">
          <button className="recovery-primary" type="button" onClick={() => navigate(`/?role=${role}`)}>Go to Login <ArrowRight size={17} /></button>
          <button className="recovery-text-button" type="button" onClick={() => navigate("/")}>Back to Home</button>
        </div>
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout>
      <div className="recovery-heading">
        <span className="recovery-kicker"><KeyRound size={15} /> ACCOUNT SECURITY</span>
        <h1>Create New Password</h1>
        <p>Create a strong password to secure your CampusFlow account.</p>
      </div>
      <form onSubmit={submit} className="recovery-form">
        <PasswordField label="New Password" required minLength={8} autoComplete="new-password" placeholder="Enter your new password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <div className="recovery-strength" aria-label={`Password strength: ${strength} of 5 requirements`}>
          <div className="recovery-strength-bars">{requirements.map((requirement, index) => <span key={requirement.label} className={index < strength ? "filled" : ""} />)}</div>
          <small>{password ? strength < 3 ? "Weak" : strength < 5 ? "Good" : "Strong" : "Password strength"}</small>
        </div>
        <PasswordField label="Confirm Password" required minLength={8} autoComplete="new-password" placeholder="Re-enter your new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <ul className="recovery-requirements">
          {requirements.map((requirement) => <li key={requirement.label} className={requirement.met ? "met" : ""}><Check size={14} /> {requirement.label}</li>)}
        </ul>
        {error && <p className="recovery-error" role="alert">{error}</p>}
        {!token && <p className="recovery-error" role="alert">This reset link is missing its token. Request a new link to continue.</p>}
        <button className="recovery-primary recovery-submit" type="submit" disabled={busy || !token}>{busy ? <><span className="recovery-spinner" /> Updating...</> : <>Reset Password <ArrowRight size={17} /></>}</button>
      </form>
      <button className="recovery-text-button recovery-back-signin" type="button" onClick={() => navigate("/")}>Back to Sign In</button>
    </RecoveryLayout>
  );
}

function PortalPage({ page, student, onProfileUpdate, onNotice, onLogout, search }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/dashboard");
      setData(response.data);
      onProfileUpdate(response.data.profile);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [onProfileUpdate]);

  useEffect(() => { refresh(); }, [refresh]);
  if (loading) return <div className="loading-state"><span className="loading-spinner" />Loading your campus…</div>;
  if (error) return <div className="error-panel"><div className="empty-icon"><CircleHelp size={21} /></div><h2>We couldn’t load your portal</h2><p>{error}</p><button className="primary-button" onClick={refresh}>Try again <ArrowRight size={16} /></button></div>;

  const props = { data, student, onNotice, search, refresh, role: "student" };
  switch (page) {
    case "Help & Support": return <SupportPage role={props.role} />;
    case "My Profile": return <ProfilePage {...props} onProfileUpdate={onProfileUpdate} />;
    case "Attendance": return <AttendancePage {...props} />;
    case "Marks": return <MarksPage {...props} />;
    case "Semester Review": return <SemesterReviewPage student={student} onNotice={onNotice} />;
    case "Announcements": return <AnnouncementsPage role="student" search={search} />;
    case "Timetable": return <TimetablePage {...props} />;
    case "Leave Application": return <LeavePage {...props} />;
    case "Notifications": return <NotificationsPage {...props} />;
    case "Settings": return <SettingsPage {...props} onLogout={onLogout} />;
    default: return <Dashboard {...props} />;
  }
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function Dashboard({ data, student, search }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const hours = useMemo(() => data.timetable.filter((item) => item.day === today).sort((a, b) => a.startTime.localeCompare(b.startTime)), [data.timetable, today]);
  const trendData = data.attendance.map((item) => ({
    subject: item.subject.replace(" ", "\n"),
    attendance: item.present + item.absent ? Math.round((item.present / (item.present + item.absent)) * 100) : 0,
  })).filter((item) => matchesQuery(item.subject, search));
  const marks = data.marks.filter((item) => matchesQuery(item.subject, search)).slice(0, 4);
  const visibleHours = hours.filter((item) => matchesQuery(`${item.subject} ${item.instructor} ${item.room}`, search));
  return (
    <>
      <PageHeading eyebrow={new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()} title={`${greeting}, ${student?.name?.split(" ")[0] || "there"} 👋`} subtitle="Here's what's happening with your studies today." action={<span className="outline-button"><CalendarDays size={16} /> {student?.semester || "Current semester"}</span>} />
      <div className="welcome-banner">
        <div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14} /> YOUR WEEK AT A GLANCE</span><h2>Small steps make<br />a brilliant semester.</h2><p>You’re building great momentum. Keep showing up — it adds up.</p><button className="banner-button" onClick={() => window.dispatchEvent(new CustomEvent("portal-nav", { detail: "Attendance" }))}>View your progress <ArrowRight size={15} /></button></div>
        <div className="welcome-visual"><div className="visual-sun" /><div className="visual-shape shape-back" /><div className="visual-shape shape-front" /><div className="visual-book"><BookOpen size={27} /></div><span className="floating-note note-one"><span>✦</span> Keep it up!</span><span className="floating-note note-two">A+ progress</span></div>
      </div>
      <div className="stat-grid">
        <StatCard label="Attendance" value={`${data.stats.attendance}%`} sub="Across all subjects" icon={Activity} tone="blue" />
        <StatCard label="Current CGPA" value={data.stats.cgpa.toFixed(1)} sub="Out of 10.0" icon={GraduationCap} tone="violet" />
        <StatCard label="Enrolled subjects" value={String(data.stats.subjects).padStart(2, "0")} sub="This semester" icon={BookOpen} tone="mint" />
        <StatCard label="Leave requests" value={String(data.stats.leaves).padStart(2, "0")} sub="Awaiting approval" icon={FileText} tone="peach" />
      </div>
      <div className="dashboard-grid">
        <section className="content-card classes-card">
          <CardTitle title="Today’s classes" subtitle={`${today} · Your upcoming schedule`} action="Full timetable" />
          {visibleHours.length ? <div className="class-list">{visibleHours.map((item, index) => <div className="class-row" key={item._id}><div className={`class-time ${["blue", "violet", "mint"][index % 3]}`}><span>{formatTime(item.startTime)}</span><i /></div><div className={`class-icon tone-${["blue", "violet", "mint"][index % 3]}`}><BookOpen size={17} /></div><div className="class-info"><strong>{item.subject}</strong><span>{item.instructor || "Faculty"} · {item.room || "Campus"}</span></div><span className="class-duration">{item.startTime} – {item.endTime}</span></div>)}</div> : <EmptyState label={search ? "No matching classes." : "No classes scheduled today. Enjoy the extra breathing room."} />}
        </section>
        <section className="content-card attendance-card">
          <CardTitle title="Attendance overview" subtitle="Your subject-wise progress" action="Details" />
          {trendData.length ? <div className="chart-wrap"><Suspense fallback={<div className="chart-loading" />}><AttendanceChart data={trendData} /></Suspense></div> : <EmptyState label="Attendance records will appear here." />}
          <div className="chart-legend"><span><i />Attendance</span><strong>{data.stats.attendance}% <small>overall</small></strong></div>
        </section>
        <section className="content-card marks-card">
          <CardTitle title="Recent marks" subtitle="Your latest academic results" action="All marks" />
          {marks.length ? <div className="marks-list">{marks.map((item, i) => <div className="mark-row" key={item._id}><span className={`subject-dot dot-${i % 4}`} /><strong>{item.subject}</strong><span className="mark-total">{item.internal + item.external}<small> / 100</small></span><span className={`grade-badge grade-${i % 3}`}>{item.grade}</span></div>)}</div> : <EmptyState label="Your marks will show up here." />}
        </section>
        <section className="content-card announcements-card">
          <CardTitle title="Campus announcements" subtitle="Updates addressed to you" action="" />
          <AnnouncementPreview onOpen={() => window.dispatchEvent(new CustomEvent("portal-nav", { detail: "Announcements" }))} />
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone }) {
  return <article className="stat-card content-card"><div className={`stat-icon tone-${tone}`}><Icon size={19} /></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-sub">{sub}</span></article>;
}

function CardTitle({ title, subtitle, action }) {
  const targets = { "Full timetable": "Timetable", Details: "Attendance", "All marks": "Marks", "View all": "Notifications" };
  return <div className="card-title"><div><h3>{title}</h3><p>{subtitle}</p></div>{targets[action] && <button onClick={() => window.dispatchEvent(new CustomEvent("portal-nav", { detail: targets[action] }))}>{action}<ArrowRight size={13} /></button>}</div>;
}

function EmptyState({ label }) { return <div className="inline-empty">{label}</div>; }
function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}
function DataTable({ headers, children, empty, columns }) {
  const isEmpty = Children.count(children) === 0;
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty && isEmpty && <EmptyState label={empty} />}{columns && children && <div className="table-mobile">{children}</div>}</div>;
}

function AttendancePage({ data, search, refresh, onNotice }) {
  const [subject, setSubject] = useState(data.attendance[0]?.subject || "");
  const [checkInCode, setCheckInCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const attendance = data.attendance.filter((item) => matchesQuery(`${item.subject} ${item.code}`, search));
  const markAttendance = async () => {
    setCheckInError("");
    setCheckInMessage("");
    if (!subject) { setCheckInError("There are no enrolled subjects available for attendance."); return; }
    if (!checkInCode.trim()) { setCheckInError("Enter the attendance code provided by your instructor."); return; }
    setCheckingIn(true);
    try {
      const { data: result } = await api.post("/attendance/code-checkin", {
        subject,
        code: checkInCode,
      });
      setCheckInMessage(result.message);
      setCheckInCode("");
      onNotice(result.message);
      await refresh();
    } catch (error) {
      setCheckInError(errorMessage(error));
    } finally {
      setCheckingIn(false);
    }
  };
  const exportAttendance = () => downloadCsv("attendance-report.csv", ["Subject", "Code", "Present", "Absent", "Total classes", "Attendance"], attendance.map((item) => {
    const total = item.present + item.absent;
    return [item.subject, item.code, item.present, item.absent, total, `${total ? Math.round((item.present / total) * 100) : 0}%`];
  }));
  return <><PageHeading eyebrow="YOUR ACADEMIC SNAPSHOT" title="Attendance" subtitle="Stay on track and keep your attendance above the 75% requirement." action={<button className="outline-button" onClick={exportAttendance}><Download size={15} /> Export report</button>} />
    <div className="overview-strip content-card"><div className="overview-number"><span>OVERALL ATTENDANCE</span><strong>{data.stats.attendance}<small>%</small></strong><p><span className="green-dot" /> You’re in a good place. Keep it going!</p></div><div className="overview-divider" /><div className="overview-metric"><span>Subjects on track</span><strong>{data.attendance.filter((item) => item.present / Math.max(item.present + item.absent, 1) >= 0.75).length}<small> / {data.attendance.length}</small></strong></div><div className="overview-metric"><span>Classes attended</span><strong>{data.attendance.reduce((sum, item) => sum + item.present, 0)}<small> classes</small></strong></div><div className="overview-metric"><span>Minimum required</span><strong>75<small>%</small></strong></div></div>
    <section className="content-card location-checkin-card"><div className="location-checkin-copy"><span className="location-checkin-icon"><ShieldCheck size={18} /></span><div><strong>Check in with your instructor's code</strong><p>Choose the class and enter the short-lived code displayed by your assigned instructor.</p></div></div><div className="location-checkin-controls"><label>Subject<select value={subject} onChange={(event) => setSubject(event.target.value)} disabled={!data.attendance.length}><option value="">{data.attendance.length ? "Choose subject" : "No assigned subjects"}</option>{data.attendance.map((item) => <option key={item._id || item.subject} value={item.subject}>{item.subject}</option>)}</select></label><label>8-character code<input required autoComplete="off" maxLength={8} value={checkInCode} onChange={(event) => setCheckInCode(event.target.value.toUpperCase().slice(0, 8))} placeholder="Enter instructor code" /></label><button className="primary-button" onClick={markAttendance} disabled={checkingIn || !subject || checkInCode.length !== 8}>{checkingIn ? "Checking in…" : "Mark attendance"}</button></div>{!data.attendance.length && <div className="location-checkin-message error" role="status">No subjects are assigned to your class ({data.profile.department}, {data.profile.year}, Section {data.profile.section}). Ask your administrator to assign a faculty subject to this exact class.</div>}{(checkInError || checkInMessage) && <div className={`location-checkin-message ${checkInError ? "error" : "success"}`} role={checkInError ? "alert" : "status"}>{checkInError || checkInMessage}</div>}<small className="location-privacy-note">Your instructor's code expires after 10 minutes and only works for its assigned class.</small></section>
    <section className="content-card page-card"><CardTitle title="Subject-wise attendance" subtitle="Your attendance, updated class by class" action="" />
      <DataTable headers={["SUBJECT", "PRESENT", "ABSENT", "TOTAL CLASSES", "ATTENDANCE", "STATUS"]} empty={search ? "No matching subjects." : "No attendance records available yet."}>
        {attendance.map((item) => { const total = item.present + item.absent; const percent = total ? Math.round((item.present / total) * 100) : 0; return <tr key={item._id}><td><div className="table-subject"><i style={{ background: item.color }} /><span><strong>{item.subject}</strong><small>{item.code}</small></span></div></td><td>{item.present}</td><td>{item.absent}</td><td>{total}</td><td><div className="progress-cell"><div className="progress-track"><i style={{ width: `${percent}%`, background: item.color }} /></div><strong>{percent}%</strong></div></td><td><span className={`status-pill ${percent >= 75 ? "status-good" : "status-warning"}`}>{percent >= 75 ? "On track" : "Needs attention"}</span></td></tr>; })}
      </DataTable>
    </section>
    <div className="attendance-tip"><span className="tip-sparkle"><Sparkles size={17} /></span><div><strong>A little reminder</strong><p>Students need at least 75% attendance in each subject to be eligible for end-semester examinations.</p></div></div>
  </>;
}

function MarksPage({ data, search }) {
  const averageGpa = data.stats.cgpa;
  const marks = data.marks.filter((item) => matchesQuery(item.subject, search));
  const exportMarks = () => downloadCsv("student-transcript.csv", ["Subject", "Internal", "External", "Total", "Grade", "GPA"], marks.map((item) => [item.subject, item.internal, item.external, item.internal + item.external, item.grade, item.gpa]));
  return <><PageHeading eyebrow="YOUR ACADEMIC SNAPSHOT" title="Marks & grades" subtitle="A clear picture of the hard work you’re putting in." action={<button className="outline-button" onClick={exportMarks}><Download size={15} /> Download transcript</button>} />
    <div className="marks-summary-grid"><div className="gpa-card"><span className="gpa-kicker"><Sparkles size={14} /> SEMESTER GPA</span><strong>{averageGpa.toFixed(1)}<small> / 10</small></strong><p>Looking good — your effort is paying off.</p><div className="gpa-decoration">✳</div></div><div className="content-card summary-card"><span className="stat-icon tone-blue"><GraduationCap size={19} /></span><span className="stat-label">Subjects graded</span><strong className="summary-number">{data.marks.length}<small> subjects</small></strong><span className="stat-sub">This semester</span></div><div className="content-card summary-card"><span className="stat-icon tone-mint"><Activity size={19} /></span><span className="stat-label">Average marks</span><strong className="summary-number">{data.averageMarks}<small> / 100</small></strong><span className="stat-sub">Across all subjects</span></div></div>
    <section className="content-card page-card"><CardTitle title="Semester results" subtitle="Internal and external assessment scores" action="" />
      <DataTable headers={["SUBJECT", "INTERNAL", "EXTERNAL", "TOTAL", "GRADE", "GPA"]} empty={search ? "No matching subjects." : "No marks have been published yet."}>{marks.map((item, index) => <tr key={item._id}><td><div className="table-subject"><i className={`subject-dot dot-${index % 4}`} /><span><strong>{item.subject}</strong><small>Semester assessment</small></span></div></td><td>{item.internal}<small className="denominator"> / 40</small></td><td>{item.external}<small className="denominator"> / 60</small></td><td><strong>{item.internal + item.external}</strong><small className="denominator"> / 100</small></td><td><span className={`grade-badge grade-${index % 3}`}>{item.grade}</span></td><td><strong>{Number(item.gpa).toFixed(1)}</strong></td></tr>)}</DataTable>
    </section>
  </>;
}

function SemesterReviewPage({ student, onNotice }) {
  const [semester, setSemester] = useState("");
  const [reviews, setReviews] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");
  const categories = [
    ["clarity", "Teaching clarity"],
    ["subjectKnowledge", "Subject knowledge"],
    ["engagement", "Class engagement"],
    ["support", "Student support"],
  ];
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/faculty-reviews");
      setSemester(data.semester);
      setReviews(data.reviews);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (assignment) => {
    const key = `${assignment.facultyId}:${assignment.subject}`;
    const values = ratings[key] || {};
    if (!categories.every(([field]) => Number.isInteger(values[field]))) {
      setError("Please rate all four teaching categories before submitting.");
      return;
    }
    setSubmitting(key);
    setError("");
    try {
      const { data } = await api.post("/faculty-reviews", {
        facultyId: assignment.facultyId,
        subject: assignment.subject,
        ratings: values,
        comment: comments[key] || "",
      });
      onNotice(data.message);
      await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSubmitting(""); }
  };
  return <>
    <PageHeading eyebrow="STUDENT VOICE" title="Semester teaching review" subtitle={`Rate each area from 1 (needs improvement) to 5 (excellent) and share feedback${semester ? ` for ${semester}` : ""}. Reviews are visible to Admin only; your roll number is shown to Admin, not your name.`} />
    {error && <div className="error-panel review-page-error" role="alert"><p>{error}</p><button className="primary-button" onClick={load}>Try again <ArrowRight size={15} /></button></div>}
    {loading ? <div className="loading-state"><span className="loading-spinner" />Loading your assigned subjects…</div>
      : reviews.length ? <div className="faculty-review-grid">{reviews.map((assignment) => {
        const key = `${assignment.facultyId}:${assignment.subject}`;
        const selectedRatings = ratings[key] || {};
        return <article className="content-card faculty-review-card" key={key}>
          <div className="faculty-review-heading"><div><span className="eyebrow">{assignment.subjectCode || "SUBJECT"}</span><h2>{assignment.subject}</h2><p>{assignment.facultyName}</p></div>{assignment.submitted && <span className="status-pill status-good">Submitted</span>}</div>
          {assignment.submitted ? <div className="faculty-review-submitted"><Check size={16} /><span>Thank you. Your review was submitted for {semester || "this semester"}.</span></div> : <>
            <div className="faculty-review-ratings">{categories.map(([field, label]) => <div className="faculty-review-rating" key={field}><strong>{label}</strong><div role="group" aria-label={label}>{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={value <= (selectedRatings[field] || 0) ? "selected" : ""} aria-label={`${label}: ${value} out of 5`} aria-pressed={selectedRatings[field] === value} onClick={() => setRatings((current) => ({ ...current, [key]: { ...current[key], [field]: value } }))}><Star size={18} fill="currentColor" /></button>)}</div></div>)}</div>
            <label className="faculty-review-comment">Additional feedback (optional)<textarea maxLength={1000} rows={3} value={comments[key] || ""} onChange={(event) => setComments((current) => ({ ...current, [key]: event.target.value }))} placeholder="Share constructive feedback about this subject's teaching." /><small>{(comments[key] || "").length}/1000</small></label>
            <button className="primary-button faculty-review-submit" type="button" disabled={submitting === key} onClick={() => submit(assignment)}>{submitting === key ? "Submitting…" : "Submit review"}<ArrowRight size={15} /></button>
          </>}
        </article>;
      })}</div>
        : <section className="content-card faculty-review-empty"><Star size={24} /><h2>No assigned subjects found</h2><p>Your faculty subject assignments for {student?.year || "your year"}, section {student?.section || "—"}, will appear here when available.</p></section>}
  </>;
}

function TimetablePage({ data, search, student }) {
  const [day, setDay] = useState(new Intl.DateTimeFormat("en", { weekday: "long" }).format(new Date()));
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  const weekLabel = `${new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(weekStart)} – ${new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(weekEnd)}`;
  const lessons = data.timetable.filter((item) => item.day === day && matchesQuery(`${item.subject} ${item.instructor} ${item.room}`, search)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return <><PageHeading eyebrow="MAKE TIME FOR WHAT MATTERS" title="Timetable" subtitle="Your class schedule, all in one place." action={<span className="outline-button"><CalendarDays size={15} /> {student?.semester || "Current semester"}</span>} />
    <section className="content-card page-card timetable-card"><div className="week-heading"><div><h3>Weekly schedule</h3><p>{student?.semester || "Current semester"} · {weekLabel}</p></div></div><div className="day-tabs">{days.map((item) => <button key={item} className={day === item ? "selected" : ""} onClick={() => setDay(item)}>{item}<small>{item.slice(0, 3)}</small></button>)}</div>
      <div className="schedule-list">{lessons.length ? lessons.map((item, i) => <div className="schedule-row" key={item._id}><div className="schedule-time"><strong>{formatTime(item.startTime)}</strong><span>{formatTime(item.endTime)}</span></div><div className={`schedule-line line-${i % 3}`} /><div className={`schedule-block block-${i % 3}`}><div><span className="schedule-tag">LECTURE</span><h4>{item.subject}</h4><p>{item.instructor || "Faculty"} · {item.room || "Campus"}</p></div><span className="schedule-room"><BookOpen size={14} />{item.room || "Campus"}</span></div></div>) : <div className="empty-state"><span className="empty-icon"><CalendarDays size={22} /></span><h3>A lighter day</h3><p>No classes are scheduled for {day}. Take a breath or catch up on your reading.</p></div>}</div>
    </section></>;
}

function LeavePage({ data, refresh, onNotice, search }) {
  const [form, setForm] = useState({ from: "", to: "", reason: "", attachment: "" });
  const [attachmentName, setAttachmentName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api.post("/leaves", form);
      setForm({ from: "", to: "", reason: "", attachment: "" });
      setAttachmentName("");
      await refresh();
      onNotice("Your leave application has been submitted.");
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  };
  return <><PageHeading eyebrow="A LITTLE TIME AWAY" title="Leave application" subtitle="Submit a request and keep track of its status." />
    <div className="leave-layout"><section className="content-card leave-form-card"><CardTitle title="Request leave" subtitle="Tell us a little about your time away" action="" /><form className="leave-form" onSubmit={submit}><div className="form-row"><label>From<input type="date" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label><label>To<input type="date" required min={form.from} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label></div><label>Reason for leave<textarea required rows="4" placeholder="Share a brief reason for your leave…" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label><div className="upload-field"><span>Supporting document <small>(optional)</small></span><label className="upload-box"><Upload size={18} /><span>{attachmentName || "Choose a file to attach"}</span><small>PDF, JPG or PNG · max 5MB</small><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setError("Please choose a file smaller than 5MB."); e.target.value = ""; return; } setError(""); const reader = new FileReader(); reader.onload = () => { setForm((current) => ({ ...current, attachment: String(reader.result || "") })); setAttachmentName(file.name); }; reader.onerror = () => setError("We couldn't read that file. Please try again."); reader.readAsDataURL(file); }} /></label></div>{error && <p className="form-error">{error}</p>}<button className="primary-button submit-leave" disabled={busy}>{busy ? "Submitting…" : "Submit application"}<ArrowRight size={16} /></button></form></section>
      <aside className="leave-side"><section className="leave-guidance"><div className="guidance-icon"><ShieldCheck size={19} /></div><h3>Before you submit</h3><p>Apply at least 3 days in advance for planned leave. Your faculty advisor will review your request.</p><div className="guidance-rule" /><span><Check size={14} /> Keep your dates accurate</span><span><Check size={14} /> Attach supporting documents if needed</span></section><section className="leave-balance content-card"><span>YOUR REQUESTS</span><strong>{data.leaves.length}<small> total</small></strong><p>{data.leaves.filter((item) => item.status === "Pending").length} awaiting a decision</p></section></aside>
    </div>
    <section className="content-card page-card leave-history"><CardTitle title="Your applications" subtitle="Recent leave requests and their status" action="" /><DataTable headers={["DATES", "REASON", "SUBMITTED", "STATUS"]} empty={search ? "No matching applications." : "You haven't submitted any leave applications yet."}>{data.leaves.filter((item) => matchesQuery(item.reason, search)).map((item) => <tr key={item._id}><td><strong>{new Date(item.from).toLocaleDateString("en", { month: "short", day: "numeric" })} – {new Date(item.to).toLocaleDateString("en", { month: "short", day: "numeric" })}</strong></td><td>{item.reason}</td><td>{new Date(item.appliedAt || item.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</td><td><span className={`status-pill ${item.status === "Approved" ? "status-good" : item.status === "Rejected" ? "status-bad" : "status-warning"}`}>{item.status}</span></td></tr>)}</DataTable></section>
  </>;
}

function ProfilePage({ student, onProfileUpdate, onNotice }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: student.name || "", email: student.email || "", studentId: student.studentId || "", department: student.department || "", year: student.year || "", semester: student.semester || "", mobile: student.mobile || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { data } = await api.put("/profile", { name: form.name, mobile: form.mobile });
      onProfileUpdate(data);
      localStorage.setItem("campusflow-student", JSON.stringify(data));
      setEditing(false); onNotice("Your profile has been updated.");
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  };
  return <><PageHeading eyebrow="WHO YOU ARE" title="My profile" subtitle="Your student details, all together." action={<button className="primary-button" onClick={() => setEditing((value) => !value)}>{editing ? <X size={16} /> : <UserRound size={16} />}{editing ? "Cancel editing" : "Edit profile"}</button>} />
    <section className="profile-hero content-card"><div className="profile-banner" /><div className="profile-hero-info"><Avatar student={student} large /><div><h2>{student.name}</h2><p>{student.studentId} <span>·</span> {student.department}</p></div><span className="verified-pill"><ShieldCheck size={14} /> Active student</span></div></section>
    <section className="content-card profile-details"><CardTitle title="Personal information" subtitle="Your official student record" action="" />
      {editing ? <form className="profile-edit-form" onSubmit={save}><label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email address<input disabled value={form.email} /></label><label>Student ID<input disabled value={form.studentId} /></label><label>Mobile number<input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+1 (555) 000-0000" /></label><label>Department<input disabled value={form.department} /></label><label>Year<input disabled value={form.year} /></label><label>Semester<input disabled value={form.semester} /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save changes"}<Check size={15} /></button></form> :
      <div className="detail-grid"><Detail label="Full name" value={student.name} /><Detail label="Email address" value={student.email} /><Detail label="Student ID" value={student.studentId} /><Detail label="Mobile number" value={student.mobile || "Not added yet"} /><Detail label="Department" value={student.department} /><Detail label="Academic year" value={student.year} /><Detail label="Current semester" value={student.semester} /><Detail label="College" value="Hanikat's College of Engineering & Technology (HCET)" /></div>}
    </section>
  </>;
}

function Detail({ label, value }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }

function NotificationsPage({ data, refresh, onNotice, search }) {
  const notifications = data.notifications.filter((item) => matchesQuery(`${item.title} ${item.message}`, search));
  const markRead = async (item) => {
    try { await api.put(`/notifications/${item._id}`, { read: true }); await refresh(); onNotice("Notification marked as read."); }
    catch (error) { onNotice(errorMessage(error)); }
  };
  return <><PageHeading eyebrow="STAY IN THE LOOP" title="Notifications" subtitle="The latest updates from your campus." action={<button className="outline-button" onClick={async () => { try { await Promise.all(data.notifications.filter((item) => !item.read).map((item) => api.put(`/notifications/${item._id}`, { read: true }))); await refresh(); } catch (error) { onNotice(errorMessage(error)); } }}><Check size={15} /> Mark all as read</button>} />
    <section className="content-card notification-list-card">
      <CardTitle title="Your updates" subtitle={`${data.notifications.filter((item) => !item.read).length} unread notifications`} action="" />
      {notifications.length ? notifications.map((item) => (
        <article className={`notification-row ${!item.read ? "unread" : ""}`} key={item._id}>
          <div className={`announcement-icon ${item.type === "success" ? "mint" : "lavender"}`}><Bell size={17} /></div>
          <div className="notification-copy">
            <div><strong>{item.title}</strong>{!item.read && <i className="unread-dot" />}</div>
            <p>{item.message}</p>
            <small>{new Date(item.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
          </div>
          {!item.read && <button className="mark-read" onClick={() => markRead(item)}>Mark read</button>}
        </article>
      )) : <EmptyState label={search ? "No matching notifications." : "You're all caught up. New updates will appear here."} />}
    </section>
  </>;
}

function SettingsPage({ onNotice, onLogout }) {
  const [emailUpdates, setEmailUpdates] = useState(() => localStorage.getItem("campusflow-student-email-updates") !== "false");
  const [weeklyDigest, setWeeklyDigest] = useState(() => localStorage.getItem("campusflow-student-weekly-digest") === "true");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  useEffect(() => { localStorage.setItem("campusflow-student-email-updates", String(emailUpdates)); }, [emailUpdates]);
  useEffect(() => { localStorage.setItem("campusflow-student-weekly-digest", String(weeklyDigest)); }, [weeklyDigest]);
  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await api.put("/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onLogout("Your password has been changed. Please sign in again.");
    } catch (requestError) {
      setPasswordError(errorMessage(requestError));
    } finally {
      setPasswordBusy(false);
    }
  };
  return <><PageHeading eyebrow="MAKE IT YOURS" title="Settings" subtitle="A few little preferences for your CampusFlow experience." />
    <section className="content-card settings-card"><CardTitle title="Notifications & preferences" subtitle="Choose how and when we reach out" action="" /><div className="settings-option"><div><strong>Email updates</strong><p>Get important academic announcements by email.</p></div><Toggle value={emailUpdates} onChange={() => { setEmailUpdates((v) => !v); onNotice("Email preferences updated."); }} /></div><div className="settings-option"><div><strong>Weekly digest</strong><p>A gentle Sunday recap of your upcoming week.</p></div><Toggle value={weeklyDigest} onChange={() => { setWeeklyDigest((v) => !v); onNotice("Weekly digest preferences updated."); }} /></div><div className="settings-option"><div><strong>Privacy & security</strong><p>Your academic information is only visible to you.</p></div><span className="verified-pill"><ShieldCheck size={14} /> Protected</span></div></section>
    <section className="content-card settings-card"><CardTitle title="Change password" subtitle="Use the shared college password the first time, then choose your own." action="" /><form className="password-change-form" onSubmit={changePassword}><label>Current password<input type="password" required autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label><label>New password<input type="password" required minLength={8} autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label><label>Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>{passwordError && <p className="form-error">{passwordError}</p>}<button className="primary-button" disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update password"}<Check size={15} /></button></form></section>
    <div className="settings-note"><CircleHelp size={17} /><span>Need help with your account?</span><button onClick={() => window.dispatchEvent(new CustomEvent("portal-nav", { detail: "Help & Support" }))}>Contact student support <ArrowRight size={14} /></button></div>
  </>;
}

function Toggle({ value, onChange }) { return <button role="switch" aria-checked={value} className={`toggle ${value ? "toggle-on" : ""}`} onClick={onChange}><i /></button>; }
function matchesQuery(value, query) { return String(value || "").toLowerCase().includes(query.trim().toLowerCase()); }
function downloadCsv(filename, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default App;
