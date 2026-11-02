import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, FileText, GraduationCap, LayoutDashboard, LogOut,
  Menu, MoreHorizontal, Search, Settings, ShieldCheck, SlidersHorizontal,
  UserRound, Users, X, Bell, ClipboardCheck, CircleX, Megaphone, Sparkles, Trash2, Pencil,
} from "lucide-react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api, { errorMessage } from "./api.js";
import SupportPage, { SupportInbox } from "./SupportPage.jsx";
import AnnouncementsPage, { AnnouncementPreview } from "./AnnouncementsPage.jsx";

const navItems = [
  { label: "Dashboard", path: "/faculty", icon: LayoutDashboard, end: true },
  { label: "My Profile", path: "/faculty/profile", icon: UserRound },
  { label: "Students", path: "/faculty/students", icon: Users },
  { label: "Student Attendance", path: "/faculty/attendance", icon: ClipboardCheck },
  { label: "Student Marks", path: "/faculty/marks", icon: GraduationCap },
  { label: "Leave Requests", path: "/faculty/leaves", icon: FileText },
  { label: "Subjects", path: "/faculty/subjects", icon: BookOpen },
  { label: "Notifications", path: "/faculty/notifications", icon: Bell },
  { label: "Announcements", path: "/faculty/announcements", icon: Megaphone },
  { label: "Support Inbox", path: "/faculty/support-inbox", icon: CircleHelp },
];

const academicYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initials(name = "Faculty") {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function FacultyPortal({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campusflow-student") || "null"); } catch { return null; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(() => localStorage.getItem("campusflow-dark") === "true");
  const [notice, setNotice] = useState("");
  const [noticeKey, setNoticeKey] = useState(0);
  const page = navItems.find((item) => item.path === location.pathname)?.label || (location.pathname === "/faculty/support" ? "Help & Support" : "Settings");
  const showNotice = useCallback((message) => {
    setNotice(message);
    setNoticeKey((value) => value + 1);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("campusflow-dark", String(dark));
  }, [dark]);

  useEffect(() => {
    document.title = "CampusFlow — Faculty Portal";
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice, noticeKey]);

  useEffect(() => {
    let active = true;
    api.get("/faculty/profile").then(({ data }) => {
      if (!active) return;
      setProfile(data);
      localStorage.setItem("campusflow-student", JSON.stringify(data));
    }).catch((error) => showNotice(errorMessage(error)));
    return () => { active = false; };
  }, [showNotice]);

  return (
    <div className="faculty-shell">
      {mobileOpen && <button className="faculty-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`faculty-sidebar ${mobileOpen ? "faculty-sidebar-open" : ""}`}>
        <Link className="faculty-brand" to="/faculty"><span className="faculty-brand-mark"><GraduationCap size={21} /></span><span>campus<span>flow</span></span></Link>
        <div className="faculty-campus"><div className="faculty-campus-mark">H</div><div><strong>Hanikat's College of Engineering &amp; Technology (HCET)</strong><small>Faculty workspace</small><small className="college-tagline">Innovating Minds, Building Futures.</small></div><ChevronDown size={15} /></div>
        <div className="faculty-nav-title">WORKSPACE</div>
        <nav className="faculty-nav">
          {navItems.map(({ label, path, icon: Icon, end }) => <NavLink key={path} to={path} end={end} className={({ isActive }) => `faculty-nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "Notifications" && <i className="faculty-nav-dot" />}</NavLink>)}
        </nav>
        <div className="faculty-nav-title faculty-preferences-title">PREFERENCES</div>
        <NavLink to="/faculty/settings" className={({ isActive }) => `faculty-nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Settings size={18} /><span>Settings</span></NavLink>
        <div className="faculty-sidebar-bottom">
          <Link className="faculty-help" to="/faculty/support"><span><CircleHelp size={17} /></span><div><strong>Need a hand?</strong><small>Visit the help center</small></div><ArrowRight size={14} /></Link>
          <button className="faculty-user-mini" onClick={() => navigate("/faculty/profile")}><FacultyAvatar profile={profile} /><span><strong>{profile?.name || "Faculty member"}</strong><small>{profile?.isHod ? "Head of Department (HOD)" : profile?.facultyId || "Faculty account"}</small></span><MoreHorizontal size={17} /></button>
          <button className="faculty-signout" onClick={onLogout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="faculty-main">
        <header className="faculty-topbar">
          <button className="faculty-icon-button faculty-mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="faculty-breadcrumb"><span>Faculty workspace</span><i>/</i><strong>{page}</strong></div>
          <div className="faculty-topbar-right">
            <label className="faculty-search"><Search size={16} /><input placeholder="Search students, subjects..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
            <button className="faculty-icon-button" aria-label="Notifications" onClick={() => navigate("/faculty/notifications")}><Bell size={18} /><i /></button>
            <button className="faculty-top-profile" onClick={() => navigate("/faculty/profile")}><FacultyAvatar profile={profile} /><span>{profile?.name?.split(" ")[0] || "Faculty"}</span><ChevronDown size={14} /></button>
          </div>
        </header>
        <section className="faculty-content">
          {notice && <div className="faculty-toast" role="status"><CheckCircle2 size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={15} /></button></div>}
          <Routes>
            <Route index element={<FacultyDashboard profile={profile} search={search} showNotice={showNotice} />} />
            <Route path="profile" element={<FacultyProfile profile={profile} onUpdate={setProfile} showNotice={showNotice} />} />
            <Route path="students" element={<StudentsPage search={search} />} />
            <Route path="attendance" element={<AttendancePage search={search} showNotice={showNotice} />} />
            <Route path="marks" element={<MarksPage search={search} showNotice={showNotice} />} />
            <Route path="leaves" element={<LeavesPage search={search} showNotice={showNotice} />} />
            <Route path="subjects" element={<SubjectsPage showNotice={showNotice} />} />
            <Route path="notifications" element={<FacultyNotifications showNotice={showNotice} />} />
            <Route path="announcements" element={<AnnouncementsPage role="faculty" search={search} onNotice={showNotice} />} />
            <Route path="support" element={<SupportPage role="faculty" />} />
            <Route path="support-inbox" element={<SupportInbox role="faculty" search={search} />} />
            <Route path="settings" element={<FacultySettings dark={dark} setDark={setDark} showNotice={showNotice} />} />
            <Route path="*" element={<FacultyDashboard profile={profile} search={search} showNotice={showNotice} />} />
          </Routes>
        </section>
      </main>
    </div>
  );
}

function FacultyAvatar({ profile, large = false }) {
  if (profile?.photo) return <img className={`faculty-avatar ${large ? "faculty-avatar-large" : ""}`} src={profile.photo} alt="" />;
  return <span className={`faculty-avatar faculty-avatar-initials ${large ? "faculty-avatar-large" : ""}`}>{initials(profile?.name)}</span>;
}

function FacultyHeading({ eyebrow, title, subtitle, action }) {
  return <div className="faculty-heading"><div><span className="faculty-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function FacultyCardTitle({ title, subtitle, action }) {
  return <div className="faculty-card-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function FacultyDashboard({ profile, search, showNotice }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/faculty/dashboard");
      setDashboard(data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel error={error} onRetry={loadDashboard} />;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const subjectMatches = dashboard.schedule.filter((item) => matches(`${item.name} ${item.code} ${item.room}`, search));
  const activityMatches = dashboard.activities.filter((item) => matches(`${item.name} ${item.rollNumber} ${item.action}`, search));
  return <>
    <FacultyHeading eyebrow={new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()} title={`${greeting}, ${profile?.name?.split(" ")[0] || "Professor"} 👋`} subtitle="Here’s a clear view of what needs your attention today." action={<span className="faculty-date-chip"><CalendarDays size={15} /> {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())}</span>} />
    <section className="faculty-welcome">
      <div className="faculty-welcome-copy"><span><Sparkles size={14} /> YOUR FACULTY OVERVIEW</span><h2>Make every class<br />count this week.</h2><p>Your students are making progress. Here’s what’s on your agenda.</p><button onClick={() => navigate("/faculty/attendance")}>Take attendance <ArrowRight size={15} /></button></div>
      <div className="faculty-welcome-art"><div className="faculty-art-circle" /><div className="faculty-art-arch" /><div className="faculty-art-book"><BookOpen size={25} /></div><span className="faculty-art-tag">A great day to teach ✦</span></div>
    </section>
    <div className="faculty-stat-grid">
      <FacultyStat label="Total students" value={dashboard.stats.students} note={`In ${profile?.department || "your department"}`} icon={Users} tone="green" />
      <FacultyStat label="Assigned subjects" value={dashboard.stats.subjects} note="Across this semester" icon={BookOpen} tone="blue" />
      <FacultyStat label="Pending attendance" value={dashboard.stats.pendingAttendance} note="Needs your review today" icon={ClipboardCheck} tone="amber" highlight={dashboard.stats.pendingAttendance > 0} />
      <FacultyStat label="Pending leave requests" value={dashboard.stats.pendingLeaves} note="Awaiting your decision" icon={FileText} tone="violet" highlight={dashboard.stats.pendingLeaves > 0} />
    </div>
    <div className="faculty-dashboard-grid">
      <section className="faculty-card faculty-schedule-card"><FacultyCardTitle title="Today's schedule" subtitle="Your classes for today" action={<button className="faculty-text-action" onClick={() => navigate("/faculty/subjects")}>All subjects <ArrowRight size={13} /></button>} />
        {subjectMatches.length ? <div className="faculty-schedule-list">{subjectMatches.map((item, index) => <div className="faculty-schedule-item" key={item._id}><div className="faculty-schedule-time"><strong>{timeLabel(item.startTime)}</strong><span>{timeLabel(item.endTime)}</span></div><div className={`faculty-schedule-marker marker-${index % 3}`} /><div className={`faculty-schedule-detail schedule-tone-${index % 3}`}><div><span className="faculty-class-code">{item.code} · {item.year} · Section {item.section}</span><strong>{item.name}</strong><small><Users size={13} /> {item.room} <i>·</i> {item.days.join(", ")}</small></div><span className="faculty-class-duration"><Clock3 size={13} /> {timeLabel(item.startTime)}</span></div></div>)}</div> : <FacultyEmpty title="A little breathing room" body="No classes are scheduled for today. Use the time to catch up or plan ahead." />}
      </section>
      <section className="faculty-card faculty-actions-card"><FacultyCardTitle title="Quick actions" subtitle="Common tasks, one click away" />
        <div className="faculty-quick-actions"><QuickAction icon={ClipboardCheck} label="Take attendance" detail="Mark today's roll" tone="green" onClick={() => navigate("/faculty/attendance")} /><QuickAction icon={GraduationCap} label="Enter student marks" detail="Update assessments" tone="blue" onClick={() => navigate("/faculty/marks")} /><QuickAction icon={FileText} label="Review leave requests" detail={`${dashboard.stats.pendingLeaves} waiting for you`} tone="amber" onClick={() => navigate("/faculty/leaves")} /><QuickAction icon={Users} label="Browse students" detail="View your roster" tone="violet" onClick={() => navigate("/faculty/students")} /></div>
      </section>
      <section className="faculty-card faculty-activity-card"><FacultyCardTitle title="Recent student activity" subtitle="The latest updates across your classes" action={<button className="faculty-text-action" onClick={() => navigate("/faculty/attendance")}>View all <ArrowRight size={13} /></button>} />
        {activityMatches.length ? <div className="faculty-activity-list">{activityMatches.map((item) => <div className="faculty-activity-row" key={item.id}><span className="faculty-student-monogram">{initials(item.name)}</span><div><strong>{item.name}</strong><small>{item.rollNumber} <i>·</i> {item.action}</small></div><time>{relativeTime(item.time)}</time></div>)}</div> : <FacultyEmpty title="Your activity feed is ready" body="Student updates will appear here as attendance and marks are recorded." />}
      </section>
      <section className="faculty-card faculty-announcements-card"><FacultyCardTitle title="Campus announcements" subtitle="Updates for you and your classes" action={<button className="faculty-text-action" onClick={() => navigate("/faculty/announcements")}>Send or view <ArrowRight size={13} /></button>} />
        <AnnouncementPreview onOpen={() => navigate("/faculty/announcements")} />
      </section>
    </div>
  </>;
}

function FacultyStat({ label, value, note, icon: Icon, tone, highlight }) {
  return <article className="faculty-stat-card"><div className={`faculty-stat-icon stat-tone-${tone}`}><Icon size={18} /></div>{highlight && Number(value) > 0 && <span className="faculty-stat-alert">Needs review</span>}<span className="faculty-stat-label">{label}</span><strong>{String(value).padStart(2, "0")}</strong><small>{note}</small></article>;
}

function QuickAction({ icon: Icon, label, detail, tone, onClick }) {
  return <button className="faculty-quick-action" onClick={onClick}><span className={`faculty-quick-icon stat-tone-${tone}`}><Icon size={17} /></span><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight size={15} /></button>;
}

function LoadingPanel() { return <div className="faculty-loading"><span className="faculty-spinner" />Loading your workspace…</div>; }
function ErrorPanel({ error, onRetry }) { return <div className="faculty-card faculty-error"><CircleHelp size={24} /><h2>We couldn't load this page</h2><p>{error}</p><button className="faculty-button" onClick={onRetry}>Try again <ArrowRight size={15} /></button></div>; }
function FacultyEmpty({ title, body }) { return <div className="faculty-empty"><span><CalendarDays size={20} /></span><strong>{title}</strong><p>{body}</p></div>; }
function matches(text, query) { return String(text || "").toLowerCase().includes(query.trim().toLowerCase()); }
function timeLabel(value) { if (!value) return "—"; const [hour, minute] = value.split(":").map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`; }
function relativeTime(value) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 1) return "Just now"; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }

function FacultyFilters({ filters, setFilters, subjects, department, classLocked = false }) {
  return <div className="faculty-filters">
    <label>Department<select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}><option>{department || "Computer Science"}</option></select></label>
    <label>Year<select disabled={classLocked} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}><option value="">All years</option>{academicYears.map((year) => <option key={year}>{year}</option>)}</select></label>
    <label>Section<select disabled={classLocked} value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}><option value="">All sections</option>{["A", "B", "C", "D"].map((section) => <option key={section}>{section}</option>)}</select></label>
    <label>Subject<select value={filters.subject} onChange={(e) => {
      const selected = subjects.find((subject) => subject.name === e.target.value);
      setFilters({ ...filters, subject: e.target.value, ...(classLocked ? { year: selected?.year || "", section: selected?.section || "" } : {}) });
    }}><option value="">All subjects</option>{subjects.map((subject) => <option key={subject._id} value={subject.name}>{subject.name}</option>)}</select></label>
  </div>;
}

function AttendancePage({ search, showNotice }) {
  const [subjects, setSubjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const [filters, setFilters] = useState({ department: "", year: "", section: "", subject: "", date: todayString() });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuingCode, setIssuingCode] = useState(false);
  const [issuedCode, setIssuedCode] = useState(null);
  const [reviewingStudentId, setReviewingStudentId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/faculty/subjects"), api.get("/faculty/profile")]).then(([subjectResponse, profileResponse]) => {
      if (!active) return;
      setSubjects(subjectResponse.data);
      setProfile(profileResponse.data);
      const selectedSubject = subjectResponse.data.find((item) => item.name === filters.subject) || subjectResponse.data[0];
      setFilters((value) => ({ ...value, department: profileResponse.data.department, subject: selectedSubject?.name || "", year: selectedSubject?.year || "", section: selectedSubject?.section || "" }));
    }).catch((requestError) => {
      if (!active) return;
      setError(errorMessage(requestError));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const loadRecords = useCallback(async () => {
    if (!filters.department) return;
    if (!filters.subject) {
      setRecords([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/faculty/attendance", { params: { year: filters.year, section: filters.section, subject: filters.subject, date: filters.date } });
      setRecords(data);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, [filters.department, filters.date, filters.section, filters.subject, filters.year]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  const visibleRecords = records.filter((record) => matches(`${record.name} ${record.rollNumber} ${record.subject}`, search));
  const updateRecord = (id, field, value) => setRecords((items) => items.map((item) => (item.studentId === id ? { ...item, [field]: value } : item)));
  const review = async (record, status) => {
    if (status === "Approved" && (!record.checkIn || !record.checkOut)) {
      showNotice("Enter both check-in and check-out times before approving attendance.");
      return;
    }
    if (!record.id) {
      updateRecord(record.studentId, "status", status);
      return;
    }
    setReviewingStudentId(record.studentId);
    try {
      await api.put(`/faculty/attendance/${record.id}/review`, {
        status,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
      });
      updateRecord(record.studentId, "status", status);
      showNotice(`Attendance ${status.toLowerCase()}.`);
    } catch (requestError) { showNotice(errorMessage(requestError)); }
    finally { setReviewingStudentId(""); }
  };
  const saveAttendance = async () => {
    if (!filters.subject) { showNotice("Choose an assigned subject before saving attendance."); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/faculty/attendance/save", { subject: filters.subject, date: filters.date, records: records.map(({ studentId, checkIn, checkOut, status }) => ({ studentId, checkIn, checkOut, status })) });
      showNotice(`${data.saved} attendance records saved.`);
      await loadRecords();
    } catch (requestError) { showNotice(errorMessage(requestError)); }
    finally { setSaving(false); }
  };
  const issueCheckinCode = async () => {
    if (!filters.subject) { showNotice("Choose an assigned subject before issuing a check-in code."); return; }
    setIssuingCode(true);
    try {
      const { data } = await api.post("/faculty/attendance/check-in-code", { subject: filters.subject });
      setIssuedCode(data);
    } catch (requestError) { showNotice(errorMessage(requestError)); }
    finally { setIssuingCode(false); }
  };
  const pendingCount = visibleRecords.filter((item) => item.status === "Pending").length;
  return <>
    <FacultyHeading eyebrow="STUDENT RECORDS" title="Student attendance" subtitle="Review, update, and save attendance for your assigned classes." action={<div className="faculty-attendance-actions"><button className="faculty-outline-button" onClick={() => window.print()}><ArrowDownToLine size={15} /> Export report</button><button className="faculty-button faculty-button-green" onClick={issueCheckinCode} disabled={issuingCode || !filters.subject}>{issuingCode ? "Generating…" : "Generate check-in code"}</button></div>} />
    <section className="faculty-filter-card">
      <div className="faculty-filter-heading"><span><SlidersHorizontal size={16} /> Filter your class</span><small>{loading ? "Loading students…" : error ? "Unable to load students" : `${visibleRecords.length} students`}</small></div>
      <FacultyFilters filters={filters} setFilters={setFilters} subjects={subjects} department={profile?.department} classLocked />
      <label className="faculty-date-filter">Date<input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></label>
    </section>
    {issuedCode?.subject === filters.subject && <div className="faculty-checkin-code" role="status"><span>Share this code with {filters.year} · Section {filters.section}; it expires at {new Date(issuedCode.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.</span><strong>{issuedCode.code}</strong></div>}
    <section className="faculty-card faculty-table-card"><FacultyCardTitle title="Attendance register" subtitle={`${filters.subject || "All subjects"} · ${filters.date}`} action={<span className="faculty-pending-chip"><i /> {pendingCount} pending</span>} />
      {error ? <InlineError error={error} /> : loading ? <LoadingRows /> : !filters.subject ? <FacultyEmpty title="No assigned subjects" body="Ask an administrator to assign a subject to your faculty account." /> : <div className="faculty-table-wrap"><table className="faculty-table"><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>CHECK IN</th><th>CHECK OUT</th><th>STATUS</th><th>REVIEW</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.studentId}><td><strong className="faculty-roll">{record.rollNumber}</strong></td><td><div className="faculty-student-cell"><span className="faculty-student-monogram">{initials(record.name)}</span><strong>{record.name}</strong></div></td><td><input className="faculty-time-input" aria-label={`Check in ${record.name}`} type="time" value={record.checkIn} onChange={(e) => updateRecord(record.studentId, "checkIn", e.target.value)} /></td><td><input className="faculty-time-input" aria-label={`Check out ${record.name}`} type="time" value={record.checkOut} onChange={(e) => updateRecord(record.studentId, "checkOut", e.target.value)} /></td><td><StatusPill status={record.status} /></td><td>{record.status === "Pending" ? <div className="faculty-row-actions"><button className="faculty-row-approve" aria-label={`Approve attendance ${record.name}`} title={record.checkIn && record.checkOut ? "Approve attendance" : "Enter check-in and check-out times to approve"} disabled={!record.checkIn || !record.checkOut || reviewingStudentId === record.studentId} onClick={() => review(record, "Approved")}><Check size={14} /></button><button className="faculty-row-reject" aria-label={`Reject attendance ${record.name}`} title="Reject attendance" disabled={reviewingStudentId === record.studentId} onClick={() => review(record, "Rejected")}><X size={14} /></button></div> : <span className="faculty-reviewed-label">{record.status}</span>}</td></tr>)}</tbody></table>{visibleRecords.length === 0 && <FacultyEmpty title={search ? "No students match your search" : "No students in this class yet"} body={search ? "Try another name or roll number." : `No students currently match ${filters.department}, ${filters.year}, Section ${filters.section}. Check that their profiles use these class details.`} />}</div>}
      <div className="faculty-table-footer"><span><CheckCircle2 size={14} /> {visibleRecords.length - pendingCount} reviewed · {pendingCount} awaiting review</span><button className="faculty-button faculty-button-green" onClick={saveAttendance} disabled={saving || loading}>{saving ? "Saving…" : "Save attendance"}<Check size={15} /></button></div>
    </section>
  </>;
}

function StatusPill({ status }) {
  const tone = ["Approved", "Present"].includes(status) ? "green" : status === "Rejected" || status === "Absent" ? "red" : "amber";
  return <span className={`faculty-status-pill status-${tone}`}><i />{status}</span>;
}

function StudentsPage({ search }) {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ department: "", year: "", section: "" });
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/faculty/profile").then(({ data }) => { setDepartment(data.department); setFilters((current) => ({ ...current, department: data.department })); }).catch((e) => setError(errorMessage(e))); }, []);
  const load = useCallback(() => {
    if (!department) return;
    setLoading(true);
    api.get("/faculty/students", { params: { year: filters.year, section: filters.section } }).then(({ data }) => setStudents(data)).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [department, filters.section, filters.year]);
  useEffect(() => { load(); }, [load]);
  const visible = students.filter((student) => matches(`${student.name} ${student.rollNumber} ${student.email}`, search));
  return <>
    <FacultyHeading eyebrow="YOUR CLASS ROSTER" title="Students" subtitle="Browse students in your department and review their academic details." action={<span className="faculty-total-chip"><Users size={15} /> {students.length} enrolled</span>} />
    <section className="faculty-filter-card"><div className="faculty-filter-heading"><span><SlidersHorizontal size={16} /> Narrow your roster</span></div><FacultyFilters filters={{ ...filters, subject: "" }} setFilters={setFilters} subjects={[]} department={department} /></section>
    <section className="faculty-card faculty-table-card"><FacultyCardTitle title="Student directory" subtitle="Student profiles in your department" action={<span className="faculty-subtle-label">{visible.length} RESULTS</span>} />
      {error ? <InlineError error={error} /> : loading ? <LoadingRows /> : <div className="faculty-table-wrap"><table className="faculty-table"><thead><tr><th>ROLL NUMBER</th><th>STUDENT</th><th>DEPARTMENT</th><th>YEAR / SECTION</th><th>CONTACT</th><th>SUBJECTS</th></tr></thead><tbody>{visible.map((student) => <tr key={student.id}><td><strong className="faculty-roll">{student.rollNumber}</strong></td><td><div className="faculty-student-cell"><span className="faculty-student-monogram">{initials(student.name)}</span><strong>{student.name}</strong></div></td><td>{student.department}</td><td>{student.year} · {student.section}</td><td>{student.email}</td><td><span className="faculty-muted-cell">Student account</span></td></tr>)}</tbody></table>{visible.length === 0 && <FacultyEmpty title={search ? "No students match your search" : "Your student directory is ready"} body={search ? "Try a different name or roll number." : "Students who register in your department will appear here."} />}</div>}
    </section>
  </>;
}

function MarksPage({ search, showNotice }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marks, setMarks] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ studentId: "", subject: "", internal: "", external: "" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [studentResponse, subjectResponse, markResponse] = await Promise.all([
        api.get("/faculty/students", { params: { search: query } }),
        api.get("/faculty/subjects"),
        api.get("/faculty/marks", { params: { search: query } }),
      ]);
      setStudents(studentResponse.data); setSubjects(subjectResponse.data); setMarks(markResponse.data);
      setForm((current) => ({
        ...current,
        studentId: studentResponse.data.some((student) => student.id === current.studentId) ? current.studentId : studentResponse.data[0]?.id || "",
        subject: current.subject || subjectResponse.data[0]?.name || "",
      }));
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { const timer = window.setTimeout(load, 200); return () => window.clearTimeout(timer); }, [load]);
  const visibleMarks = marks.filter((item) => matches(`${item.studentName} ${item.rollNumber} ${item.subject}`, search));

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) await api.put(`/faculty/marks/${editing.studentId}/${editing.id}`, { internal: Number(form.internal), external: Number(form.external) });
      else await api.post("/faculty/marks", { ...form, internal: Number(form.internal), external: Number(form.external) });
      setEditing(null); setForm((current) => ({ ...current, internal: "", external: "" }));
      showNotice(editing ? "Student marks updated." : "Student marks saved.");
      await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSaving(false); }
  };
  const editMark = (mark) => {
    setEditing(mark);
    setForm({ studentId: mark.studentId, subject: mark.subject, internal: String(mark.internal), external: String(mark.external) });
  };
  const deleteMark = async (mark) => {
    if (!window.confirm(`Delete ${mark.subject} marks for ${mark.studentName}?`)) return;
    try { await api.delete(`/faculty/marks/${mark.studentId}/${mark.id}`); showNotice("Marks record deleted."); await load(); }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  return <>
    <FacultyHeading eyebrow="ACADEMIC PERFORMANCE" title="Student marks" subtitle="Enter, review, and update assessment scores." />
    <section className="faculty-card faculty-marks-form-card"><FacultyCardTitle title={editing ? "Update student marks" : "Enter marks"} subtitle="Internal assessment is out of 40; external assessment is out of 60." action={editing && <button className="faculty-text-action" onClick={() => { setEditing(null); setForm((current) => ({ ...current, internal: "", external: "" })); }}>Cancel edit <X size={13} /></button>} />
      <form className="faculty-marks-form" onSubmit={submit}>
        <label className="faculty-student-search-field"><span>Search student</span><div><Search size={15} /><input value={query} placeholder="Name or roll number…" onChange={(e) => setQuery(e.target.value)} /></div></label>
        <label><span>Student</span><select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}><option value="">Select a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.rollNumber} · {student.name}</option>)}</select></label>
        <label><span>Subject</span><select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}><option value="">Select a subject</option>{subjects.map((subject) => <option key={subject._id} value={subject.name}>{subject.name}</option>)}</select></label>
        <label><span>Internal <small>/ 40</small></span><input type="number" required min="0" max="40" value={form.internal} onChange={(e) => setForm({ ...form, internal: e.target.value })} placeholder="0–40" /></label>
        <label><span>External <small>/ 60</small></span><input type="number" required min="0" max="60" value={form.external} onChange={(e) => setForm({ ...form, external: e.target.value })} placeholder="0–60" /></label>
        <button className="faculty-button faculty-button-green" disabled={saving || loading || students.length === 0}>{saving ? "Saving…" : editing ? "Update marks" : "Save marks"}<Check size={15} /></button>
      </form>
      {error && <InlineError error={error} />}
    </section>
    <section className="faculty-card faculty-table-card"><FacultyCardTitle title="Assessment records" subtitle="Scores for students in your department" action={<span className="faculty-subtle-label">{visibleMarks.length} RECORDS</span>} />
      {loading ? <LoadingRows /> : <div className="faculty-table-wrap"><table className="faculty-table"><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>SUBJECT</th><th>INTERNAL</th><th>EXTERNAL</th><th>TOTAL</th><th>GRADE</th><th>ACTIONS</th></tr></thead><tbody>{visibleMarks.map((mark) => <tr key={mark.id}><td><strong>{mark.studentName}</strong></td><td><strong className="faculty-roll">{mark.rollNumber}</strong></td><td>{mark.subject}</td><td>{mark.internal}<span className="faculty-denominator"> / 40</span></td><td>{mark.external}<span className="faculty-denominator"> / 60</span></td><td><strong>{mark.total}</strong><span className="faculty-denominator"> / 100</span></td><td><span className={`faculty-grade grade-${gradeTone(mark.grade)}`}>{mark.grade}</span></td><td><div className="faculty-row-actions"><button className="faculty-row-edit" aria-label={`Update marks for ${mark.studentName}`} onClick={() => editMark(mark)}><Pencil size={14} /></button><button className="faculty-row-reject" aria-label={`Delete marks for ${mark.studentName}`} onClick={() => deleteMark(mark)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{visibleMarks.length === 0 && <FacultyEmpty title="No marks to show yet" body="No assessment records have been saved yet. Use the form above to enter the first set of marks." />}</div>}
    </section>
  </>;
}

function gradeTone(grade) { if (grade === "O" || grade === "A+" || grade === "A") return "green"; if (grade === "F") return "red"; return "amber"; }

function LeavesPage({ search, showNotice }) {
  const [leaves, setLeaves] = useState([]);
  const [status, setStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const load = useCallback(() => {
    setLoading(true);
    api.get("/faculty/leaves").then(({ data }) => setLeaves(data)).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = leaves.filter((item) => (!status || item.status === status) && matches(`${item.studentName} ${item.rollNumber} ${item.reason}`, search));
  const pendingCount = leaves.filter((item) => item.status === "Pending").length;
  const decide = async (leave, decision) => {
    try {
      await api.put(`/faculty/leaves/${leave.studentId}/${leave.id}`, { status: decision });
      showNotice(`Leave request ${decision.toLowerCase()}.`);
      await load();
    } catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  return <>
    <FacultyHeading eyebrow="STUDENT SUPPORT" title="Leave requests" subtitle="Review student applications and record your decision." action={<button className="faculty-outline-button" onClick={() => setStatus("")}><SlidersHorizontal size={15} /> {status || "All requests"}</button>} />
    <div className="faculty-leave-tabs">{["Pending", "Approved", "Rejected", ""].map((value) => <button key={value || "all"} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value || "All requests"}{value === "Pending" && <span>{pendingCount}</span>}</button>)}</div>
    <section className="faculty-card faculty-table-card"><FacultyCardTitle title="Leave applications" subtitle="Student requests from your department" action={<span className="faculty-subtle-label">{filtered.length} REQUESTS</span>} />
      {error ? <InlineError error={error} /> : loading ? <LoadingRows /> : <div className="faculty-table-wrap"><table className="faculty-table"><thead><tr><th>STUDENT NAME</th><th>ROLL NUMBER</th><th>LEAVE DATE</th><th>REASON</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((leave) => <tr key={leave.id}><td><div className="faculty-student-cell"><span className="faculty-student-monogram">{initials(leave.studentName)}</span><strong>{leave.studentName}</strong></div></td><td><strong className="faculty-roll">{leave.rollNumber}</strong></td><td>{dateRange(leave.from, leave.to)}</td><td><span className="faculty-reason-cell">{leave.reason}</span></td><td><StatusPill status={leave.status} /></td><td><div className="faculty-leave-actions"><button className="faculty-view-button" onClick={() => setSelected(leave)}>View details</button>{leave.status === "Pending" && <><button className="faculty-row-approve" aria-label={`Approve leave for ${leave.studentName}`} onClick={() => decide(leave, "Approved")}><Check size={14} /></button><button className="faculty-row-reject" aria-label={`Reject leave for ${leave.studentName}`} onClick={() => decide(leave, "Rejected")}><X size={14} /></button></>}</div></td></tr>)}</tbody></table>{filtered.length === 0 && <FacultyEmpty title={status === "Pending" ? "All caught up" : "No leave requests found"} body={status === "Pending" ? "New student requests will appear here for your review." : "Try another status filter or search term."} />}</div>}
    </section>
    {selected && <LeaveDetails leave={selected} onClose={() => setSelected(null)} />}
  </>;
}

function LeaveDetails({ leave, onClose }) {
  return <div className="faculty-modal-backdrop" role="presentation" onClick={onClose}><section className="faculty-modal" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title" onClick={(event) => event.stopPropagation()}><button className="faculty-modal-close" aria-label="Close details" onClick={onClose}><X size={17} /></button><span className="faculty-modal-icon"><FileText size={19} /></span><span className="faculty-eyebrow">LEAVE APPLICATION</span><h2 id="leave-modal-title">{leave.studentName}</h2><p className="faculty-modal-subtitle">{leave.rollNumber}</p><div className="faculty-modal-details"><div><span>Leave date</span><strong>{dateRange(leave.from, leave.to)}</strong></div><div><span>Submitted</span><strong>{new Date(leave.appliedAt).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</strong></div><div><span>Status</span><StatusPill status={leave.status} /></div><div><span>Reason</span><strong>{leave.reason}</strong></div></div>{leave.attachment && <a className="faculty-button faculty-attachment-link" href={leave.attachment} target="_blank" rel="noreferrer">View attachment <ArrowRight size={14} /></a>}</section></div>;
}

function dateRange(from, to) {
  const options = { month: "short", day: "numeric", year: "numeric" };
  const localDate = (value) => {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en", options);
  };
  const start = localDate(from);
  const end = localDate(to);
  return start === end ? start : `${start} – ${end}`;
}

function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true); api.get("/faculty/subjects").then(({ data }) => setSubjects(data)).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  return <>
    <FacultyHeading eyebrow="TEACHING & LEARNING" title="Assigned subjects" subtitle="View your administrator-approved teaching assignments and class schedules." />
    {error ? <InlineError error={error} /> : loading ? <LoadingRows /> : subjects.length ? <div className="faculty-subject-grid">{subjects.map((subject, index) => <article className="faculty-card faculty-subject-card" key={subject._id}><div className="faculty-subject-card-top"><span className={`faculty-subject-icon subject-icon-${index % 4}`}><BookOpen size={19} /></span></div><span className="faculty-subject-code">{subject.code} · {subject.year} · Section {subject.section}</span><h2>{subject.name}</h2><div className="faculty-subject-meta"><span><CalendarDays size={14} /> {subject.days.join(", ")}</span><span><Clock3 size={14} /> {timeLabel(subject.startTime)} – {timeLabel(subject.endTime)}</span><span><BookOpen size={14} /> {subject.room}</span></div></article>)}</div> : <FacultyEmpty title="No assigned subjects yet" body="Contact an administrator to have your teaching assignments added." />}
  </>;
}

function FacultyProfile({ profile, onUpdate, showNotice }) {
  const [form, setForm] = useState({ name: profile?.name || "", title: profile?.title || "Faculty", email: profile?.email || "", facultyId: profile?.facultyId || "", department: profile?.department || "", mobile: profile?.mobile || "" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setForm({ name: profile?.name || "", title: profile?.title || "Faculty", email: profile?.email || "", facultyId: profile?.facultyId || "", department: profile?.department || "", mobile: profile?.mobile || "" });
  }, [profile]);
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try { const { data } = await api.put("/faculty/profile", { name: form.name, title: form.title, mobile: form.mobile }); onUpdate(data); localStorage.setItem("campusflow-student", JSON.stringify(data)); setEditing(false); showNotice("Your faculty profile has been updated."); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSaving(false); }
  };
  return <>
    <FacultyHeading eyebrow="YOUR FACULTY RECORD" title="My profile" subtitle="Manage your faculty information and contact details." action={<button className="faculty-button faculty-button-green" onClick={() => setEditing((value) => !value)}>{editing ? <X size={15} /> : <Pencil size={15} />}{editing ? "Cancel editing" : "Edit profile"}</button>} />
    <section className="faculty-card faculty-profile-hero"><div className="faculty-profile-cover" /><div className="faculty-profile-main"><FacultyAvatar profile={profile} large /><div><h2>{profile?.name}</h2><p>{profile?.title || "Faculty"} <i>·</i> {profile?.department}</p></div><span className={profile?.isHod ? "faculty-verified faculty-hod-badge" : "faculty-verified"}>{profile?.isHod ? <><ShieldCheck size={14} /> Head of Department (HOD)</> : <><ShieldCheck size={14} /> Faculty account</>}</span></div></section>
    <section className="faculty-card faculty-profile-details"><FacultyCardTitle title="Professional information" subtitle="Your faculty account details" />{editing ? <form className="faculty-profile-form" onSubmit={submit}><label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>College email<input disabled value={form.email} /></label><label>Faculty ID<input disabled value={form.facultyId} /></label><label>Job title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Department<input disabled value={form.department} /></label><label>Mobile number<input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+1 (555) 000-0000" /></label>{error && <InlineError error={error} />}<button className="faculty-button faculty-button-green" disabled={saving}>{saving ? "Saving…" : "Save profile"}<Check size={15} /></button></form> : <div className="faculty-profile-grid"><ProfileDetail label="Full name" value={profile?.name} /><ProfileDetail label="College email" value={profile?.email} /><ProfileDetail label="Faculty ID" value={profile?.facultyId} /><ProfileDetail label="Job title" value={profile?.title || "Faculty"} /><ProfileDetail label="Department" value={profile?.department} /><ProfileDetail label="Mobile number" value={profile?.mobile || "Not added yet"} /></div>}</section>
  </>;
}

function ProfileDetail({ label, value }) { return <div><span>{label}</span><strong>{value || "—"}</strong></div>; }

function FacultyNotifications({ showNotice }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    api.get("/faculty/dashboard").then(({ data }) => setNotifications(data.notifications || [])).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const markRead = async (item) => {
    try { await api.put(`/faculty/notifications/${item._id}/read`); showNotice("Notification marked as read."); load(); }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  return <>
    <FacultyHeading eyebrow="CAMPUS UPDATES" title="Notifications" subtitle="Important messages and reminders for your faculty account." action={<span className="faculty-total-chip"><Bell size={15} /> {notifications.filter((item) => !item.read).length} unread</span>} />
    <section className="faculty-card faculty-notification-card"><FacultyCardTitle title="Your updates" subtitle="Recent notifications from your department and campus." />{error ? <InlineError error={error} /> : loading ? <LoadingRows /> : notifications.length ? notifications.map((item) => <article className={`faculty-notification ${item.read ? "" : "unread"}`} key={item._id}><span className="faculty-announcement-icon announcement-tone-0"><Bell size={17} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>{!item.read && <button onClick={() => markRead(item)}>Mark read</button>}</article>) : <FacultyEmpty title="You're all caught up" body="New campus notifications will appear here." />}</section>
  </>;
}

function FacultySettings({ dark, setDark, showNotice }) {
  const [emailUpdates, setEmailUpdates] = useState(() => localStorage.getItem("campusflow-faculty-email-updates") !== "false");
  const [weeklyDigest, setWeeklyDigest] = useState(() => localStorage.getItem("campusflow-faculty-weekly-digest") === "true");
  const navigate = useNavigate();
  useEffect(() => { localStorage.setItem("campusflow-faculty-email-updates", String(emailUpdates)); }, [emailUpdates]);
  useEffect(() => { localStorage.setItem("campusflow-faculty-weekly-digest", String(weeklyDigest)); }, [weeklyDigest]);
  return <>
    <FacultyHeading eyebrow="YOUR WORKSPACE" title="Settings" subtitle="Choose the preferences that work best for you." />
    <section className="faculty-card faculty-settings-card"><FacultyCardTitle title="Appearance" subtitle="Make your workspace comfortable." /><PreferenceRow title="Dark mode" detail="Use a darker color palette for your portal." value={dark} onChange={() => { setDark((value) => !value); showNotice("Appearance preference updated."); }} /><FacultyCardTitle title="Notifications" subtitle="Choose which updates you'd like to receive." /><PreferenceRow title="Email notifications" detail="Important academic and student updates by email." value={emailUpdates} onChange={() => { setEmailUpdates((value) => !value); showNotice("Email notification preferences saved."); }} /><PreferenceRow title="Weekly faculty digest" detail="A short summary of your upcoming teaching week." value={weeklyDigest} onChange={() => { setWeeklyDigest((value) => !value); showNotice("Weekly digest preferences saved."); }} /></section>
    <div className="faculty-support-note"><CircleHelp size={17} /><span>Need help with your account?</span><button type="button" onClick={() => navigate("/faculty/support")}>Contact college support <ArrowRight size={14} /></button></div>
  </>;
}

function PreferenceRow({ title, detail, value, onChange }) {
  return <div className="faculty-preference-row"><div><strong>{title}</strong><p>{detail}</p></div><button className={`faculty-toggle ${value ? "on" : ""}`} role="switch" aria-checked={value} onClick={onChange}><i /></button></div>;
}

function InlineError({ error }) { return <div className="faculty-inline-error"><CircleX size={15} />{error}</div>; }
function LoadingRows() { return <div className="faculty-loading-rows"><span className="faculty-spinner" />Loading records…</div>; }

export default FacultyPortal;
