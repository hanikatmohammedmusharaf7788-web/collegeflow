import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowRight, Bell, BookOpen, CalendarDays, Check,
  ChevronDown, ChevronRight, CircleHelp, ClipboardList, Download, FileText,
  GraduationCap, LayoutDashboard, LogOut, Megaphone, Menu, Moon, Plus, Search, Settings,
  ShieldCheck, SlidersHorizontal, Star, Sun, UserRound, Users, X, Pencil, Trash2, Eye, EyeOff, Upload,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api, { errorMessage } from "./api.js";
import { csvCell } from "./csv.js";
import { SupportInbox } from "./SupportPage.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";

const sections = [
  { title: "OVERVIEW", items: [{ label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true }] },
  { title: "USER MANAGEMENT", items: [
    { label: "Manage Students", path: "/admin/students", icon: GraduationCap },
    { label: "Manage Faculty", path: "/admin/faculty", icon: Users },
    { label: "Manage Admins", path: "/admin/admins", icon: ShieldCheck },
  ] },
  { title: "ACADEMICS", items: [
    { label: "Manage Courses", path: "/admin/courses", icon: BookOpen },
    { label: "Manage Departments", path: "/admin/departments", icon: ClipboardList },
    { label: "Manage Subjects", path: "/admin/subjects", icon: FileText },
  ] },
  { title: "CAMPUS OPERATIONS", items: [
    { label: "Support Requests", path: "/admin/support", icon: CircleHelp },
    { label: "Announcements", path: "/admin/announcements", icon: Megaphone },
    { label: "Faculty Reviews", path: "/admin/faculty-reviews", icon: Star },
    { label: "Student Attendance", path: "/admin/attendance/students", icon: CalendarDays },
    { label: "Faculty Attendance", path: "/admin/attendance/faculty", icon: Activity },
    { label: "Student Leave Requests", path: "/admin/leaves/students", icon: FileText },
    { label: "Faculty Leave Requests", path: "/admin/leaves/faculty", icon: FileText },
    { label: "Reports", path: "/admin/reports", icon: Download },
  ] },
];

const studentFields = [
  ["name", "Student name", "text"], ["studentId", "Roll number", "text"], ["email", "Email", "email"],
  ["department", "Department", "text"], ["year", "Year", "text"], ["semester", "Semester", "text"], ["mobile", "Mobile", "tel"],
];
const facultyFields = [
  ["name", "Faculty name", "text"], ["facultyId", "Faculty ID", "text"], ["email", "Email", "email"],
  ["department", "Department", "text"], ["title", "Designation", "text"], ["mobile", "Mobile", "tel"],
];
const academicFields = [["name", "Name", "text"], ["code", "Code", "text"], ["department", "Department", "text"], ["year", "Year", "text"]];
const chartColors = ["#23835a", "#4a9b73", "#70b88a", "#a5cfae", "#d6a45d"];
const classDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function initials(value = "Admin") {
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function AdminPortal({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campusflow-student") || "null"); } catch { return null; }
  });
  const [dark, setDark] = useState(() => localStorage.getItem("campusflow-dark") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeKey, setNoticeKey] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activePage = sections.flatMap((section) => section.items).find((item) => item.path === location.pathname)?.label
    || (location.pathname.includes("/attendance/") ? "Attendance" : location.pathname.includes("/leaves/") ? "Leave Management" : location.pathname === "/admin/settings" ? "Settings" : location.pathname === "/admin/support" ? "Support Requests" : "Dashboard");
  const showNotice = useCallback((message) => {
    setNotice(message);
    setNoticeKey((value) => value + 1);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("campusflow-dark", String(dark));
  }, [dark]);
  useEffect(() => {
    document.title = "CampusFlow — Admin Portal";
    return () => { document.title = "CampusFlow — Student Portal"; };
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [notice, noticeKey]);
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector(".admin-search input")?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  return <div className="admin-shell">
    {mobileOpen && <button className="admin-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`admin-sidebar ${mobileOpen ? "admin-sidebar-open" : ""}`}>
      <Link className="admin-brand" to="/admin"><span className="admin-brand-mark"><GraduationCap size={21} /></span><span>campus<span>flow</span></span></Link>
      <div className="admin-campus"><span className="admin-campus-mark">H</span><span><strong>Hanikat's College of Engineering &amp; Technology (HCET)</strong><small>Administration</small><small className="college-tagline">Innovating Minds, Building Futures.</small></span><ChevronDown size={15} /></div>
      <nav className="admin-navigation">
        {sections.map((section) => <div className="admin-nav-section" key={section.title}>
          <div className="admin-nav-title">{section.title}</div>
          {section.items.map(({ label, path, icon: Icon, end }) => <NavLink key={path} end={end} to={path} className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label.includes("Leave") && <i className="admin-nav-dot" />}</NavLink>)}
        </div>)}
      </nav>
      <div className="admin-sidebar-footer">
        <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}><Settings size={17} /><span>Settings</span></NavLink>
        <div className="admin-help"><span><CircleHelp size={17} /></span><div><strong>Need a hand?</strong><small>Visit the help center</small></div><ChevronRight size={15} /></div>
        <button className="admin-user-mini" onClick={() => navigate("/admin/settings")}><span className="admin-avatar">{initials(profile?.name)}</span><span><strong>{profile?.name || "Campus Administrator"}</strong><small>{profile?.email || "Administrator"}</small></span><ChevronDown size={14} /></button>
        <button className="admin-logout" onClick={onLogout}><LogOut size={15} /> Sign out</button>
      </div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar">
        <button className="admin-icon-button admin-mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <div className="admin-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage}</strong></div>
        <div className="admin-topbar-actions">
          <label className="admin-search"><Search size={16} /><input aria-label="Global search" placeholder="Search anything..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
          <div className="admin-notification-wrap">
            <button className="admin-icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={18} /><i /></button>
            {notificationsOpen && <div className="admin-notification-popover"><strong>You're all caught up</strong><span>New campus activity will show up here.</span></div>}
          </div>
          <button className="admin-icon-button admin-theme-toggle" aria-label="Toggle dark mode" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
          <button className="admin-profile-button" onClick={() => navigate("/admin/settings")}><span className="admin-avatar">{initials(profile?.name)}</span><span>{profile?.name?.split(" ")[0] || "Admin"}</span><ChevronDown size={14} /></button>
        </div>
      </header>
      <section className="admin-content">
        {notice && <div className="admin-toast" role="status"><Check size={16} />{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={15} /></button></div>}
        <Routes>
          <Route index element={<AdminDashboard search={search} />} />
          <Route path="students" element={<EntityPage type="students" search={search} showNotice={showNotice} />} />
          <Route path="faculty" element={<EntityPage type="faculty" search={search} showNotice={showNotice} />} />
          <Route path="admins" element={<AdminsPage search={search} showNotice={showNotice} onLogout={onLogout} currentAdminEmail={profile?.email} />} />
          <Route path="courses" element={<AcademicPage kind="Course" search={search} showNotice={showNotice} />} />
          <Route path="departments" element={<AcademicPage kind="Department" search={search} showNotice={showNotice} />} />
          <Route path="subjects" element={<AcademicPage kind="Subject" search={search} showNotice={showNotice} />} />
          <Route path="attendance/students" element={<AttendancePage type="students" search={search} />} />
          <Route path="attendance/faculty" element={<AttendancePage type="faculty" search={search} />} />
          <Route path="leaves/students" element={<LeavesPage type="students" search={search} showNotice={showNotice} />} />
          <Route path="leaves/faculty" element={<LeavesPage type="faculty" search={search} showNotice={showNotice} />} />
          <Route path="reports" element={<ReportsPage showNotice={showNotice} />} />
          <Route path="support" element={<SupportInbox role="admin" search={search} />} />
          <Route path="announcements" element={<AnnouncementsPage role="admin" search={search} onNotice={showNotice} />} />
          <Route path="faculty-reviews" element={<FacultyReviewsPage search={search} />} />
          <Route path="settings" element={<AdminSettings showNotice={showNotice} />} />
          <Route path="*" element={<AdminDashboard search={search} />} />
        </Routes>
      </section>
    </main>
  </div>;
}

function Heading({ eyebrow, title, subtitle, action }) {
  return <div className="admin-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}
function CardTitle({ title, subtitle, action }) {
  return <div className="admin-card-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}
function ErrorState({ message, retry }) {
  return <div className="admin-inline-error"><CircleHelp size={17} /><span>{message}</span>{retry && <button onClick={retry}>Try again</button>}</div>;
}
function LoadingState() { return <div className="admin-loading"><span />Loading records...</div>; }

function AdminDashboard({ search }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await api.get("/admin/dashboard"); setData(response.data); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={refresh} />;
  const stats = [
    { label: "Total students", value: data.stats.students.toLocaleString(), icon: GraduationCap, tone: "purple", note: "Registered learners", path: "/admin/students" },
    { label: "Total faculty", value: data.stats.faculty.toLocaleString(), icon: Users, tone: "blue", note: "Teaching staff", path: "/admin/faculty" },
    { label: "Departments", value: data.stats.departments.toLocaleString(), icon: ClipboardList, tone: "mint", note: "Academic departments", path: "/admin/departments" },
    { label: "Total courses", value: data.stats.courses.toLocaleString(), icon: BookOpen, tone: "orange", note: "Active courses", path: "/admin/courses" },
    { label: "Student attendance", value: `${data.stats.studentAttendance}%`, icon: CalendarDays, tone: "pink", note: "Across recorded subjects", path: "/admin/attendance/students" },
    { label: "Faculty attendance", value: `${data.stats.facultyAttendance}%`, icon: Activity, tone: "cyan", note: "Recorded attendance", path: "/admin/attendance/faculty" },
  ];
  const visibleStudents = data.recentStudents.filter((item) => `${item.name} ${item.studentId} ${item.department}`.toLowerCase().includes(search.toLowerCase()));
  const tooltip = { contentStyle: { borderRadius: 12, border: "1px solid var(--admin-line)", background: "var(--admin-surface)", color: "var(--admin-text)", fontSize: 11 } };
  return <>
    <Heading eyebrow={new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()} title="Good morning, Admin" subtitle="Here's what's happening across your campus today." action={<span className="admin-outline-button"><CalendarDays size={15} /> Campus overview</span>} />
    <div className="admin-welcome"><div><span><Activity size={14} /> CAMPUS OVERVIEW</span><h2>Every student. Every milestone.<br />All in one place.</h2><p>Keep your campus running smoothly with a clear view of the essentials.</p><a href="#admin-stats">Explore your dashboard <ArrowRight size={14} /></a></div><div className="admin-welcome-art"><div className="admin-art-orbit" /><span className="admin-art-cap"><GraduationCap size={34} /></span><span className="admin-art-note">A brighter future starts here</span></div></div>
    <div id="admin-stats" className="admin-stat-grid">{stats.map(({ label, value, icon: Icon, tone, note, path }) => <article className="admin-stat-card" key={label}><span className={`admin-stat-icon ${tone}`}><Icon size={19} /></span><span className="admin-stat-label">{label}</span><strong>{value}</strong><small>{note}</small><Link className="admin-stat-trend" to={path} aria-label={`View ${label}`} title={`View ${label}`}><ArrowRight size={12} /></Link></article>)}</div>
    <div className="admin-chart-grid">
      <section className="admin-card"><CardTitle title="Student growth" subtitle="New registrations over the last six months" action={<span className="admin-subtle-action">Last 6 months</span>} /><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.growth} margin={{ top: 8, right: 6, bottom: 0, left: -24 }}><defs><linearGradient id="adminGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7965e8" stopOpacity={0.24} /><stop offset="95%" stopColor="#7965e8" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--admin-line)" strokeDasharray="4 5" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 10 }} /><Tooltip {...tooltip} /><Area type="monotone" dataKey="students" name="Students" stroke="#7965e8" strokeWidth={2.5} fill="url(#adminGrowth)" /></AreaChart></ResponsiveContainer></div></section>
      <section className="admin-card"><CardTitle title="Department-wise students" subtitle="Enrolled students by department" /><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.departments.length ? data.departments : [{ name: "No departments", students: 1 }]} dataKey="students" nameKey="name" innerRadius={58} outerRadius={83} paddingAngle={4} stroke="none">{(data.departments.length ? data.departments : [{ name: "No departments", students: 1 }]).map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip {...tooltip} /></PieChart></ResponsiveContainer><div className="admin-pie-legend">{data.departments.slice(0, 4).map((item, index) => <span key={item.name}><i style={{ background: chartColors[index % chartColors.length] }} />{item.name}<strong>{item.students}</strong></span>)}</div></div></section>
      <section className="admin-card"><CardTitle title="Attendance analytics" subtitle="Monthly campus attendance" /><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.attendance} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}><CartesianGrid vertical={false} stroke="var(--admin-line)" strokeDasharray="4 5" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 10 }} /><YAxis domain={[70, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 10 }} /><Tooltip {...tooltip} /><Bar dataKey="students" name="Students" fill="#7965e8" radius={[4, 4, 0, 0]} /><Bar dataKey="faculty" name="Faculty" fill="#6da1f3" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="admin-card"><CardTitle title="Faculty performance" subtitle="Engagement snapshot" /><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.performance} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}><CartesianGrid horizontal={false} stroke="var(--admin-line)" strokeDasharray="4 5" /><XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 9 }} /><YAxis type="category" dataKey="name" width={62} tickLine={false} axisLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 9 }} /><Tooltip {...tooltip} /><Bar dataKey="performance" name="Performance" fill="#43bba3" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div></section>
    </div>
    <section className="admin-card admin-recent-card"><CardTitle title="Recently added students" subtitle="The latest additions to your student community" action={<Link to="/admin/students">View all <ArrowRight size={14} /></Link>} />{visibleStudents.length ? <DataTable headers={["ROLL NUMBER", "STUDENT NAME", "DEPARTMENT", "YEAR", "JOINED"]}><tbody>{visibleStudents.map((item) => <tr key={item._id}><td><strong>{item.studentId}</strong></td><td><PersonCell name={item.name} sub={item.studentId} /></td><td>{item.department}</td><td>{item.year}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></DataTable> : <div className="admin-empty">No recent student records found.</div>}</section>
  </>;
}

function FacultyReviewsPage({ search }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/faculty-reviews");
      setReviews(data);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const visible = reviews.filter((review) => `${review.reviewerRollNumber} ${review.facultyName} ${review.facultyId} ${review.subject} ${review.subjectCode} ${review.department} ${review.semester} ${review.comment}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <Heading eyebrow="TEACHING FEEDBACK" title="Faculty semester reviews" subtitle="Student teaching evaluations are visible to Admin only. Student names are not included; the roll number is shown for follow-up." />
    <section className="admin-card admin-table-card">
      <div className="admin-table-toolbar"><div><h2>Submitted reviews</h2><p>{visible.length} {visible.length === 1 ? "review" : "reviews"}</p></div></div>
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={["ROLL NUMBER", "FACULTY", "SUBJECT", "SEMESTER", "TEACHING RATINGS", "FEEDBACK", "SUBMITTED"]} empty={search ? "No matching reviews." : "No semester reviews have been submitted yet."}><tbody>{visible.map((review) => {
        const average = ((review.clarity + review.subjectKnowledge + review.engagement + review.support) / 4).toFixed(1);
        return <tr key={review.id}><td><strong>{review.reviewerRollNumber}</strong></td><td><PersonCell name={review.facultyName} sub={review.facultyId} /></td><td><strong>{review.subject}</strong><small className="admin-review-subject-code">{review.subjectCode}</small></td><td>{review.semester}<small className="admin-review-subject-code">{review.department} · {review.year} · {review.section}</small></td><td><span className="admin-review-rating"><Star size={13} fill="currentColor" />{average}/5</span><small className="admin-review-subject-code">Clarity {review.clarity} · Knowledge {review.subjectKnowledge} · Engagement {review.engagement} · Support {review.support}</small></td><td className="admin-review-comment">{review.comment || "—"}</td><td>{new Date(review.createdAt).toLocaleDateString()}</td></tr>;
      })}</tbody></DataTable>}
    </section>
  </>;
}

function EntityPage({ type, search, showNotice }) {
  const isStudent = type === "students";
  const title = isStudent ? "Manage students" : "Manage faculty";
  const fields = isStudent ? studentFields : facultyFields;
  const singular = isStudent ? "Student" : "Faculty";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [department, setDepartment] = useState("All departments");
  const [hodFacultyId, setHodFacultyId] = useState("");
  const [assigningHod, setAssigningHod] = useState(false);
  const [assignmentFacultyId, setAssignmentFacultyId] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");
  const [assignmentDepartmentFilter, setAssignmentDepartmentFilter] = useState("All departments");
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingAssignmentForm, setEditingAssignmentForm] = useState(null);
  const [assignmentEditBusy, setAssignmentEditBusy] = useState(false);
  const [assignmentEditError, setAssignmentEditError] = useState("");
  const [assignmentForm, setAssignmentForm] = useState({ name: "", code: "", year: "1st Year", section: "A", room: "Room 204", days: ["Monday", "Wednesday"], startTime: "09:00", endTime: "10:00" });
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await api.get(`/admin/${type}`); setRows(data); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, [type]);
  useEffect(() => { load(); }, [load]);
  const loadAllAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError("");
    try {
      const { data } = await api.get("/admin/faculty-subject-assignments");
      setAllAssignments(data);
    } catch (requestError) { setAssignmentsError(errorMessage(requestError)); }
    finally { setAssignmentsLoading(false); }
  }, []);
  useEffect(() => {
    if (!isStudent) loadAllAssignments();
  }, [isStudent, loadAllAssignments]);
  const departments = [...new Set(rows.map((row) => row.department).filter(Boolean))];
  const assignmentDepartments = [...new Set(allAssignments.map((assignment) => assignment.department).filter(Boolean))].sort();
  const visibleAssignments = allAssignments.filter((assignment) => assignmentDepartmentFilter === "All departments"
    || assignment.department === assignmentDepartmentFilter);
  const visible = rows.filter((row) => (department === "All departments" || row.department === department)
    && `${row.name} ${row.studentId || row.facultyId} ${row.email} ${row.department}`.toLowerCase().includes(search.toLowerCase()));
  const open = (mode, row = null) => {
    setModal({ mode, row });
    setForm(row ? { ...row, password: "" } : { department: "", year: "1st Year", semester: "Semester 1" });
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const payload = Object.fromEntries([...fields.map(([key]) => [key, form[key] || ""]), ...(form.password ? [["password", form.password]] : [])]);
      if (modal.mode === "add" && !form.password) throw new Error("Set an initial password of at least 8 characters.");
      if (modal.mode === "edit" && form.password && form.password.length < 8) throw new Error("Password must be at least 8 characters.");
      if (modal.mode === "add") await api.post(`/admin/${type}`, payload);
      else await api.put(`/admin/${type}/${modal.row._id}`, payload);
      setModal(null); showNotice(`${singular} ${modal.mode === "add" ? "added" : "updated"} successfully.`); await load();
    } catch (requestError) { showNotice(errorMessage(requestError)); }
    finally { setBusy(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}'s record? This cannot be undone.`)) return;
    try { await api.delete(`/admin/${type}/${row._id}`); showNotice(`${singular} deleted.`); await load(); }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  const assignHod = async (event) => {
    event.preventDefault();
    setAssigningHod(true);
    try {
      const { data } = await api.post("/admin/faculty/hod", { facultyId: hodFacultyId });
      setHodFacultyId("");
      showNotice(data.message);
      await load();
    } catch (requestError) { showNotice(errorMessage(requestError)); }
    finally { setAssigningHod(false); }
  };
  const removeHod = async (row) => {
    if (!window.confirm(`Remove ${row.name} as HOD of ${row.department}?`)) return;
    try {
      const { data } = await api.post("/admin/faculty/hod/remove", { facultyId: row.facultyId });
      showNotice(data.message);
      await load();
    } catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  const selectAssignmentFaculty = async (facultyId) => {
    setAssignmentFacultyId(facultyId);
    setAssignmentError("");
    setAssignedSubjects([]);
    if (!facultyId) return;
    try {
      const { data } = await api.get(`/admin/faculty/${facultyId}/subjects`);
      setAssignedSubjects(data);
    } catch (requestError) { setAssignmentError(errorMessage(requestError)); }
  };
  const assignSubject = async (event) => {
    event.preventDefault();
    setAssignmentBusy(true);
    setAssignmentError("");
    try {
      const { data } = await api.post(`/admin/faculty/${assignmentFacultyId}/subjects`, assignmentForm);
      setAssignedSubjects((current) => [...current, data]);
      setAssignmentForm({ name: "", code: "", year: "1st Year", section: "A", room: "Room 204", days: ["Monday", "Wednesday"], startTime: "09:00", endTime: "10:00" });
      await loadAllAssignments();
      showNotice(`Assigned ${data.name} to the selected faculty member.`);
    } catch (requestError) { setAssignmentError(errorMessage(requestError)); }
    finally { setAssignmentBusy(false); }
  };
  const removeSubjectAssignment = async (subject) => {
    if (!window.confirm(`Remove ${subject.name} from this faculty member's assignments?`)) return;
    try {
      const facultyId = subject.facultyId || assignmentFacultyId;
      await api.delete(`/admin/faculty/${facultyId}/subjects/${subject._id}`);
      if (facultyId === assignmentFacultyId) {
        setAssignedSubjects((current) => current.filter((item) => item._id !== subject._id));
      }
      await loadAllAssignments();
      showNotice(`${subject.name} assignment removed.`);
    } catch (requestError) { setAssignmentError(errorMessage(requestError)); }
  };
  const openAssignmentEditor = (assignment) => {
    setEditingAssignment({ facultyId: assignment.facultyId, subjectId: assignment._id });
    setEditingAssignmentForm({
      name: assignment.name,
      code: assignment.code,
      year: assignment.year,
      section: assignment.section,
      room: assignment.room || "",
      days: assignment.days || [],
      startTime: assignment.startTime,
      endTime: assignment.endTime,
    });
    setAssignmentEditError("");
  };
  const saveAssignmentEdit = async (event) => {
    event.preventDefault();
    setAssignmentEditBusy(true);
    setAssignmentEditError("");
    try {
      const { data } = await api.put(
        `/admin/faculty/${editingAssignment.facultyId}/subjects/${editingAssignment.subjectId}`,
        editingAssignmentForm,
      );
      if (editingAssignment.facultyId === assignmentFacultyId) {
        setAssignedSubjects((current) => current.map((item) => item._id === data._id ? data : item));
      }
      await loadAllAssignments();
      setEditingAssignment(null);
      setEditingAssignmentForm(null);
      showNotice(`${data.name} assignment updated.`);
    } catch (requestError) { setAssignmentEditError(errorMessage(requestError)); }
    finally { setAssignmentEditBusy(false); }
  };
  return <>
    <Heading eyebrow="USER MANAGEMENT" title={title} subtitle={`View and manage ${isStudent ? "student" : "faculty"} records for Hanikat's College of Engineering & Technology (HCET).`} action={<button className="admin-primary-button" onClick={() => open("add")}><Plus size={16} /> Add {singular}</button>} />
    {!isStudent && <section className="admin-card admin-hod-card"><CardTitle title="Department HOD assignment" subtitle="Enter a faculty ID to designate the HOD for that faculty member’s department. Assigning a new HOD replaces the current one in that department." /><form className="admin-hod-form" onSubmit={assignHod}><label>Faculty ID<input required value={hodFacultyId} onChange={(event) => setHodFacultyId(event.target.value)} placeholder="e.g. FAC2025001" /></label><button className="admin-primary-button" disabled={assigningHod || !hodFacultyId.trim()}>{assigningHod ? "Assigning…" : "Assign as HOD"}<Check size={14} /></button></form></section>}
    {!isStudent && <section className="admin-card admin-hod-card">
      <CardTitle title="Teaching subject assignments" subtitle="Only administrators can assign a faculty member to a subject and class." />
      <div className="admin-assignment-grid">
        <label>Faculty member<select required value={assignmentFacultyId} onChange={(event) => selectAssignmentFaculty(event.target.value)}><option value="">Select faculty</option>{rows.map((row) => <option key={row._id} value={row._id}>{row.name} · {row.facultyId}</option>)}</select></label>
        <form onSubmit={assignSubject}>
          <label>Subject name<input required maxLength={100} value={assignmentForm.name} onChange={(event) => setAssignmentForm({ ...assignmentForm, name: event.target.value })} /></label>
          <label>Subject code<input required maxLength={30} value={assignmentForm.code} onChange={(event) => setAssignmentForm({ ...assignmentForm, code: event.target.value })} /></label>
          <label>Year<select value={assignmentForm.year} onChange={(event) => setAssignmentForm({ ...assignmentForm, year: event.target.value })}>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => <option key={year}>{year}</option>)}</select></label>
          <label>Section<select value={assignmentForm.section} onChange={(event) => setAssignmentForm({ ...assignmentForm, section: event.target.value })}>{["A", "B", "C", "D"].map((section) => <option key={section}>{section}</option>)}</select></label>
          <label>Room<input maxLength={60} value={assignmentForm.room} onChange={(event) => setAssignmentForm({ ...assignmentForm, room: event.target.value })} /></label>
          <label>Start time<input required type="time" value={assignmentForm.startTime} onChange={(event) => setAssignmentForm({ ...assignmentForm, startTime: event.target.value })} /></label>
          <label>End time<input required type="time" value={assignmentForm.endTime} onChange={(event) => setAssignmentForm({ ...assignmentForm, endTime: event.target.value })} /></label>
          <fieldset className="admin-assignment-days"><legend>Class days</legend>{classDays.map((day) => <label key={day}><input type="checkbox" checked={assignmentForm.days.includes(day)} onChange={(event) => setAssignmentForm((current) => ({ ...current, days: event.target.checked ? [...current.days, day] : current.days.filter((item) => item !== day) }))} />{day.slice(0, 3)}</label>)}</fieldset>
          <button className="admin-primary-button" disabled={assignmentBusy || !assignmentFacultyId}>{assignmentBusy ? "Assigning…" : "Assign subject"}<Check size={14} /></button>
        </form>
      </div>
      {assignmentError && <ErrorState message={assignmentError} />}
      {assignmentFacultyId && <div className="admin-assigned-subjects">{assignedSubjects.map((subject) => <span key={subject._id}>{subject.name} · {subject.year} · Section {subject.section}<button type="button" aria-label={`Remove ${subject.name} assignment`} onClick={() => removeSubjectAssignment({ ...subject, facultyId: assignmentFacultyId })}><X size={13} /></button></span>)}</div>}
      <div className="admin-assignment-overview">
        <div className="admin-assignment-overview-toolbar">
          <h3>All assigned subjects</h3>
          <div className="admin-toolbar-controls">
            <label className="admin-filter"><SlidersHorizontal size={14} /><select aria-label="Filter subject assignments by department" value={assignmentDepartmentFilter} onChange={(event) => setAssignmentDepartmentFilter(event.target.value)}><option>All departments</option>{assignmentDepartments.map((name) => <option key={name}>{name}</option>)}</select></label>
            <button className="admin-outline-button" disabled={!visibleAssignments.length} onClick={() => exportCsv("faculty-subject-assignments.csv", visibleAssignments.map((assignment) => ({
              facultyId: assignment.facultyCode,
              facultyName: assignment.facultyName,
              department: assignment.department,
              designation: assignment.designation || "Faculty",
              subject: assignment.name,
              subjectCode: assignment.code,
              year: assignment.year,
              section: assignment.section,
              days: assignment.days.join(", "),
              startTime: assignment.startTime,
              endTime: assignment.endTime,
              room: assignment.room,
            })))}><Download size={14} /> Export</button>
          </div>
        </div>
        {assignmentsError ? <ErrorState message={assignmentsError} retry={loadAllAssignments} /> : assignmentsLoading ? <LoadingState /> : visibleAssignments.length ? <div className="admin-assignment-table-wrap">
          <table className="admin-assignment-table">
            <thead><tr><th>Faculty ID</th><th>Faculty name</th><th>Department</th><th>Designation</th><th>Assigned subject</th><th>Class</th><th>Schedule</th><th>Actions</th></tr></thead>
            <tbody>{visibleAssignments.map((assignment) => <tr key={`${assignment.facultyId}-${assignment._id}`}>
              <td>{assignment.facultyCode}</td>
              <td><strong>{assignment.facultyName}</strong></td>
              <td>{assignment.department}</td>
              <td>{assignment.designation || "Faculty"}</td>
              <td><strong>{assignment.name}</strong><small>{assignment.code}</small></td>
              <td>{assignment.year} · Section {assignment.section}</td>
              <td><strong>{assignment.days.map((day) => day.slice(0, 3)).join(", ")}</strong><small>{assignment.startTime}–{assignment.endTime} · {assignment.room}</small></td>
              <td><div className="admin-assignment-actions">
                <button type="button" aria-label={`Edit ${assignment.name} assignment`} title="Edit assignment" onClick={() => openAssignmentEditor(assignment)}><Pencil size={13} /></button>
                <button type="button" aria-label={`Remove ${assignment.name} assignment`} title="Remove assignment" onClick={() => removeSubjectAssignment(assignment)}><Trash2 size={13} /></button>
              </div></td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="admin-assignment-empty">{allAssignments.length ? "No subject assignments match this department." : "No subject assignments have been made yet."}</p>}
      </div>
      {editingAssignment && editingAssignmentForm && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !assignmentEditBusy) { setEditingAssignment(null); setEditingAssignmentForm(null); } }}>
        <section className="admin-modal admin-assignment-edit-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-edit-title">
          <button className="admin-modal-close" type="button" aria-label="Close" disabled={assignmentEditBusy} onClick={() => { setEditingAssignment(null); setEditingAssignmentForm(null); }}><X size={16} /></button>
          <span className="admin-modal-kicker">FACULTY ASSIGNMENT</span>
          <h2 id="assignment-edit-title">Edit subject assignment</h2>
          <p className="admin-assignment-edit-faculty">For {allAssignments.find((item) => item.facultyId === editingAssignment.facultyId)?.facultyName || "selected faculty"}</p>
          <form onSubmit={saveAssignmentEdit} className="admin-form-grid">
            <label>Subject name<input required maxLength={100} value={editingAssignmentForm.name} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, name: event.target.value })} /></label>
            <label>Subject code<input required maxLength={30} value={editingAssignmentForm.code} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, code: event.target.value })} /></label>
            <label>Year<select value={editingAssignmentForm.year} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, year: event.target.value })}>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => <option key={year}>{year}</option>)}</select></label>
            <label>Section<select value={editingAssignmentForm.section} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, section: event.target.value })}>{["A", "B", "C", "D"].map((section) => <option key={section}>{section}</option>)}</select></label>
            <label>Room<input maxLength={60} value={editingAssignmentForm.room} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, room: event.target.value })} /></label>
            <label>Start time<input required type="time" value={editingAssignmentForm.startTime} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, startTime: event.target.value })} /></label>
            <label>End time<input required type="time" value={editingAssignmentForm.endTime} onChange={(event) => setEditingAssignmentForm({ ...editingAssignmentForm, endTime: event.target.value })} /></label>
            <fieldset className="admin-assignment-days admin-assignment-edit-days"><legend>Class days</legend>{classDays.map((day) => <label key={day}><input type="checkbox" checked={editingAssignmentForm.days.includes(day)} onChange={(event) => setEditingAssignmentForm((current) => ({ ...current, days: event.target.checked ? [...current.days, day] : current.days.filter((item) => item !== day) }))} />{day}</label>)}</fieldset>
            {assignmentEditError && <div className="admin-form-error">{assignmentEditError}</div>}
            <div className="admin-modal-actions"><button type="button" className="admin-outline-button" disabled={assignmentEditBusy} onClick={() => { setEditingAssignment(null); setEditingAssignmentForm(null); }}>Cancel</button><button className="admin-primary-button" disabled={assignmentEditBusy}>{assignmentEditBusy ? "Saving…" : "Save changes"}<Check size={14} /></button></div>
          </form>
        </section>
      </div>}
    </section>}
    <section className="admin-card admin-table-card"><div className="admin-table-toolbar"><div><h2>{isStudent ? "Student directory" : "Faculty directory"}</h2><p>{visible.length} {visible.length === 1 ? "record" : "records"} found</p></div><div className="admin-toolbar-controls"><label className="admin-filter"><SlidersHorizontal size={14} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>All departments</option>{departments.map((name) => <option key={name}>{name}</option>)}</select></label><button className="admin-outline-button" onClick={() => exportCsv(`${type}.csv`, visible)}><Download size={14} /> Export</button></div></div>
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={isStudent ? ["ROLL NUMBER", "STUDENT NAME", "DEPARTMENT", "YEAR", "SEMESTER", "EMAIL", "MOBILE", "STATUS", "ACTIONS"] : ["FACULTY ID", "FACULTY NAME", "DEPARTMENT", "DESIGNATION", "EMAIL", "MOBILE", "ROLE", "STATUS", "ACTIONS"]} empty={`No ${isStudent ? "students" : "faculty"} found. Try adjusting your search or add a record.`}><tbody>{visible.map((row) => <tr key={row._id}><td><strong>{isStudent ? (row.rollNumber || row.studentId) : row.facultyId}</strong></td><td><PersonCell name={row.name} sub={isStudent ? "Student" : "Faculty member"} /></td><td>{row.department}</td>{isStudent ? <><td>{row.year}</td><td>{row.semester}</td></> : <td>{row.title}</td>}<td>{row.email}</td><td>{row.mobile || "—"}</td>{!isStudent && <td>{row.isHod ? <span className="admin-hod-role"><StatusBadge status="HOD" /><button className="admin-hod-remove" type="button" onClick={() => removeHod(row)}>Remove</button></span> : "Faculty"}</td>}<td><StatusBadge status="Active" /></td><td><RowActions onView={() => open("view", row)} onEdit={() => open("edit", row)} onDelete={() => remove(row)} /></td></tr>)}</tbody></DataTable>}
    </section>
    {modal && <RecordModal title={`${modal.mode === "add" ? "Add" : modal.mode === "edit" ? "Edit" : "View"} ${singular}`} fields={fields} form={form} setForm={setForm} mode={modal.mode} busy={busy} onSubmit={save} onClose={() => setModal(null)} password={modal.mode !== "view"} />}
  </>;
}

function AcademicPage({ kind, search, showNotice }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const endpoint = `/admin/academic/${kind.toLowerCase()}`;
  const fields = kind === "Department" ? academicFields.slice(0, 2) : academicFields;
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await api.get(endpoint); setRows(data); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { load(); }, [load]);
  const visible = rows.filter((row) => `${row.name} ${row.code} ${row.department}`.toLowerCase().includes(search.toLowerCase()));
  const save = async (event) => {
    event.preventDefault();
    try {
      if (modal.row) await api.put(`${endpoint}/${modal.row._id}`, form);
      else await api.post(endpoint, form);
      setModal(null); showNotice(`${kind} ${modal.row ? "updated" : "created"}.`); await load();
    } catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    try { await api.delete(`${endpoint}/${row._id}`); showNotice(`${kind} deleted.`); await load(); }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  return <>
    <Heading eyebrow="ACADEMIC MANAGEMENT" title={`Manage ${kind.toLowerCase()}s`} subtitle={`Maintain the college ${kind.toLowerCase()} directory.`} action={<button className="admin-primary-button" onClick={() => { setForm({}); setModal({}); }}><Plus size={16} /> Add {kind}</button>} />
    <section className="admin-card admin-table-card"><CardTitle title={`${kind} directory`} subtitle={`${visible.length} records`} />
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={["NAME", "CODE", ...(kind === "Department" ? [] : ["DEPARTMENT", "YEAR"]), "ADDED", "ACTIONS"]} empty={`No ${kind.toLowerCase()}s have been added yet.`}><tbody>{visible.map((row) => <tr key={row._id}><td><strong>{row.name}</strong></td><td>{row.code || "—"}</td>{kind !== "Department" && <><td>{row.department || "—"}</td><td>{row.year || "—"}</td></>}<td>{new Date(row.createdAt).toLocaleDateString()}</td><td><RowActions onEdit={() => { setForm({ name: row.name, code: row.code, department: row.department, year: row.year }); setModal({ row }); }} onDelete={() => remove(row)} /></td></tr>)}</tbody></DataTable>}
    </section>
    {modal && <RecordModal title={`${modal.row ? "Edit" : "Add"} ${kind}`} fields={fields} form={form} setForm={setForm} mode="edit" onSubmit={save} onClose={() => setModal(null)} />}
  </>;
}

function AttendancePage({ type, search }) {
  const students = type === "students";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [year, setYear] = useState("All years");
  const [section, setSection] = useState("All sections");
  const [date, setDate] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await api.get(`/admin/attendance/${type}`); setRows(data); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, [type]);
  useEffect(() => { load(); }, [load]);
  const departments = [...new Set(rows.map((row) => row.department).filter(Boolean))];
  const visible = rows.filter((row) => (department === "All departments" || row.department === department)
    && (!students || year === "All years" || row.year === year)
    && (!students || section === "All sections" || row.section === section)
    && (!date || (row.date && new Date(row.date).toISOString().slice(0, 10) === date))
    && `${row.name} ${row.rollNumber || row.facultyId} ${row.department}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <Heading eyebrow="CAMPUS OPERATIONS" title={`${students ? "Student" : "Faculty"} attendance`} subtitle={`Review ${students ? "student" : "faculty"} attendance records independently.`} action={<button className="admin-outline-button" onClick={() => exportCsv(`${type}-attendance.csv`, visible)}><Download size={14} /> Export</button>} />
    <section className="admin-card admin-filter-card"><div className="admin-filter-title"><SlidersHorizontal size={16} /><strong>Filter attendance</strong><span>{visible.length} records</span></div><div className="admin-filter-grid"><label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}><option>All departments</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>{students && <label>Year<select value={year} onChange={(event) => setYear(event.target.value)}><option>All years</option>{["1st Year", "2nd Year", "3rd Year", "4th Year"].map((item) => <option key={item}>{item}</option>)}</select></label>}{students && <label>Section<select value={section} onChange={(event) => setSection(event.target.value)}><option>All sections</option><option>A</option><option>B</option><option>C</option></select></label>}<label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div></section>
    <section className="admin-card admin-table-card"><CardTitle title={`${students ? "Student" : "Faculty"} attendance register`} subtitle="Attendance records from the campus system" />
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={students ? ["ROLL NUMBER", "STUDENT NAME", "DEPARTMENT", "PRESENT / ABSENT", "CHECK IN", "CHECK OUT"] : ["FACULTY ID", "FACULTY NAME", "DEPARTMENT", "DATE", "CHECK IN", "CHECK OUT", "ATTENDANCE STATUS"]} empty="No attendance records match your selected filters."><tbody>{visible.map((row) => <tr key={row.id}>{students ? <><td><strong>{row.rollNumber}</strong></td><td><PersonCell name={row.name} sub={row.subject} /></td><td>{row.department}</td><td><StatusBadge status={row.status === "Present" || row.status === "Approved" ? "Present" : "Absent"} /></td><td>{row.checkIn || "—"}</td><td>{row.checkOut || "—"}</td></> : <><td><strong>{row.facultyId}</strong></td><td><PersonCell name={row.name} sub="Faculty" /></td><td>{row.department}</td><td>{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td><td>{row.checkIn || "—"}</td><td>{row.checkOut || "—"}</td><td><StatusBadge status={row.status} /></td></>}</tr>)}</tbody></DataTable>}
    </section>
  </>;
}

function LeavesPage({ type, search, showNotice }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const { data } = await api.get(`/admin/leaves/${type}`); setRows(data); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, [type]);
  useEffect(() => { load(); }, [load]);
  const visible = rows.filter((row) => `${row.name} ${row.identifier} ${row.department} ${row.reason}`.toLowerCase().includes(search.toLowerCase()));
  const decide = async (row, status) => {
    try { await api.patch(`/admin/leaves/${type}/${row.personId}/${row.id}`, { status }); showNotice(`Leave request ${status.toLowerCase()}.`); await load(); }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  const student = type === "students";
  return <>
    <Heading eyebrow="CAMPUS OPERATIONS" title={`${student ? "Student" : "Faculty"} leave requests`} subtitle={`Review and decide ${student ? "student" : "faculty"} leave applications.`} />
    <section className="admin-card admin-table-card"><CardTitle title="Leave applications" subtitle={`${visible.filter((item) => item.status === "Pending").length} pending · ${visible.length} total`} />
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={[student ? "ROLL NUMBER" : "FACULTY ID", "NAME", "DEPARTMENT", "DATES", "REASON", "STATUS", "ACTIONS"]} empty="No leave requests found."><tbody>{visible.map((row) => <tr key={row.id}><td><strong>{row.identifier}</strong></td><td><PersonCell name={row.name} sub={student ? "Student" : "Faculty"} /></td><td>{row.department}</td><td>{new Date(row.from).toLocaleDateString()} – {new Date(row.to).toLocaleDateString()}</td><td className="admin-reason-cell">{row.reason}</td><td><StatusBadge status={row.status} /></td><td><div className="admin-row-actions"><button title="View request" aria-label="View request" onClick={() => setView(row)}><Eye size={14} /></button>{row.status === "Pending" && <><button className="approve" title="Approve" aria-label="Approve" onClick={() => decide(row, "Approved")}><Check size={14} /></button><button className="reject" title="Reject" aria-label="Reject" onClick={() => decide(row, "Rejected")}><X size={14} /></button></>}</div></td></tr>)}</tbody></DataTable>}
    </section>
    {view && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setView(null); }}><section className="admin-modal admin-view-modal"><button className="admin-modal-close" aria-label="Close" onClick={() => setView(null)}><X size={17} /></button><span className="admin-modal-kicker">LEAVE REQUEST</span><h2>{view.name}</h2><div className="admin-detail-list"><span><small>Department</small><strong>{view.department}</strong></span><span><small>Dates</small><strong>{new Date(view.from).toLocaleDateString()} – {new Date(view.to).toLocaleDateString()}</strong></span><span><small>Status</small><StatusBadge status={view.status} /></span><span><small>Reason</small><strong>{view.reason}</strong></span></div></section></div>}
  </>;
}

function AdminsPage({ search, showNotice, onLogout, currentAdminEmail }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/admin/admins"); setRows(data); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const create = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      showNotice("Passwords do not match.");
      return;
    }
    try {
      const { confirmPassword, ...admin } = form;
      await api.post("/admin/admins", admin);
      setForm({ name: "", email: "", password: "", confirmPassword: "" });
      showNotice("Administrator added.");
      await load();
    }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  const save = async (event) => {
    event.preventDefault();
    if ((form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
      showNotice("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { confirmPassword, ...admin } = form;
      await api.put(`/admin/admins/${modal.row.id}`, admin);
      const changingOwnPassword = Boolean(form.password)
        && modal.row.email.toLowerCase() === currentAdminEmail?.toLowerCase();
      if (changingOwnPassword) {
        onLogout("Your password was updated. Sign in again with your new password.", "admin");
        return;
      }
      setModal(null);
      showNotice("Administrator updated.");
      await load();
    }
    catch (requestError) { showNotice(errorMessage(requestError)); }
    finally { setBusy(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete administrator ${row.name}?`)) return;
    try { await api.delete(`/admin/admins/${row.id}`); showNotice("Administrator deleted."); await load(); }
    catch (requestError) { showNotice(errorMessage(requestError)); }
  };
  const visible = rows.filter((row) => `${row.name} ${row.email}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <Heading eyebrow="USER MANAGEMENT" title="Manage admins" subtitle="Grant trusted colleagues access to the administration workspace." />
    <div className="admin-settings-grid">
      <section className="admin-card admin-form-card">
        <CardTitle title="Add administrator" subtitle="A secure account for a campus administrator" />
        <form className="admin-inline-form" onSubmit={create}>
          <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Temporary password<span className="admin-password-input"><input required minLength="8" autoComplete="new-password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span></label>
          <label>Confirm password<span className="admin-password-input"><input required minLength="8" autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span></label>
          <button className="admin-primary-button"><Plus size={15} /> Create admin</button>
        </form>
      </section>
      <section className="admin-card admin-table-card">
        <CardTitle title="Admin accounts" subtitle={`${visible.length} administrators`} />
        {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={["ADMINISTRATOR", "EMAIL", "ROLE", "ACTIONS"]} empty="No admin accounts found."><tbody>{visible.map((item) => <tr key={item.id}><td><PersonCell name={item.name} sub="Campus administrator" /></td><td>{item.email}</td><td><StatusBadge status="Admin" /></td><td><RowActions onEdit={() => { setForm({ name: item.name, email: item.email, password: "", confirmPassword: "" }); setModal({ row: item }); }} onDelete={() => remove(item)} /></td></tr>)}</tbody></DataTable>}
      </section>
    </div>
    {modal && <RecordModal title="Edit administrator" fields={[["name", "Full name", "text"], ["email", "Email", "email"]]} form={form} setForm={setForm} mode="edit" password confirmPassword busy={busy} onSubmit={save} onClose={() => setModal(null)} />}
  </>;
}

function ReportsPage({ showNotice }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/admin/reports"); setReport(data); setError(""); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const summaryRows = useMemo(() => report ? Object.entries(report.totals).map(([metric, count]) => ({ metric: metric.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()), count })) : [], [report]);
  return <><Heading eyebrow="INSIGHTS & EXPORTS" title="Reports" subtitle="A clear snapshot of your institution's core metrics." action={report && <div className="admin-report-actions"><button className="admin-outline-button" onClick={() => window.print()}><FileText size={14} /> Export PDF</button><button className="admin-primary-button" onClick={() => { exportCsv("campus-report.csv", summaryRows); showNotice("Report exported as CSV for Excel."); }}><Download size={14} /> Export Excel</button></div>} />
    <div className="admin-report-grid">{["Student report", "Faculty report", "Attendance report"].map((title, index) => <article className="admin-card admin-report-card" key={title}><span className={`admin-report-icon report-${index}`}><FileText size={19} /></span><h2>{title}</h2><p>Review key {title.split(" ")[0].toLowerCase()} figures and download a shareable report.</p><button className="admin-outline-button" onClick={() => { if (report) exportCsv(`${title.toLowerCase().replaceAll(" ", "-")}.csv`, summaryRows); else showNotice("Load the report before exporting."); }}><ArrowDownToLine size={14} /> Download report</button></article>)}</div>
    <section className="admin-card admin-table-card"><CardTitle title="Institution summary" subtitle={report ? `Generated ${new Date(report.generatedAt).toLocaleString()}` : "Current platform totals"} />{error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState /> : <DataTable headers={["METRIC", "TOTAL"]}><tbody>{summaryRows.map((row) => <tr key={row.metric}><td>{row.metric}</td><td><strong>{row.count.toLocaleString()}</strong></td></tr>)}</tbody></DataTable>}</section>
  </>;
}

function AdminSettings({ showNotice }) {
  const [college, setCollege] = useState(() => {
    try { return JSON.parse(localStorage.getItem("campusflow-college-settings") || '{"collegeName":"Hanikat\'s College of Engineering & Technology (HCET)","email":"","phone":"","address":""}'); }
    catch { return { collegeName: "Hanikat's College of Engineering & Technology (HCET)", email: "", phone: "", address: "" }; }
  });
  const [policy, setPolicy] = useState(() => localStorage.getItem("campusflow-password-policy") || "Strong");
  useEffect(() => {
    let active = true;
    api.get("/admin/settings").then(({ data }) => {
      if (!active) return;
      setCollege({ collegeName: data.collegeName || "", email: data.email || "", phone: data.phone || "", address: data.address || "" });
      setPolicy(data.passwordPolicy || "Strong");
    }).catch((requestError) => showNotice(errorMessage(requestError)));
    return () => { active = false; };
  }, [showNotice]);
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.put("/admin/settings", { ...college, passwordPolicy: policy });
      showNotice("Settings saved.");
    } catch (requestError) { showNotice(requestError.response ? errorMessage(requestError) : requestError.message); }
  };
  const restoreSettings = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const stringFields = ["collegeName", "email", "phone", "address", "passwordPolicy"];
      if (!payload || typeof payload !== "object"
        || stringFields.some((key) => payload[key] !== undefined && typeof payload[key] !== "string")) {
        throw new Error("The settings backup has an unsupported format.");
      }
      const restored = Object.fromEntries(stringFields.filter((key) => payload[key] !== undefined).map((key) => [key, payload[key]]));
      const { data } = await api.put("/admin/settings", restored);
      setCollege({ collegeName: data.collegeName || "", email: data.email || "", phone: data.phone || "", address: data.address || "" });
      setPolicy(data.passwordPolicy || "Strong");
      showNotice("Settings restored from backup.");
    } catch (requestError) {
      showNotice(requestError instanceof SyntaxError ? "The selected backup is not valid JSON." : errorMessage(requestError));
    } finally { event.target.value = ""; }
  };
  return <><Heading eyebrow="SYSTEM PREFERENCES" title="Settings" subtitle="Configure institution details and access policies." />
    <form onSubmit={save} className="admin-settings-grid">
      <section className="admin-card admin-form-card"><CardTitle title="College information" subtitle="Your institution's public details" /><div className="admin-form-grid"><label>College name<input value={college.collegeName} onChange={(event) => setCollege({ ...college, collegeName: event.target.value })} /></label><label>Contact email<input type="email" value={college.email} onChange={(event) => setCollege({ ...college, email: event.target.value })} /></label><label>Phone number<input value={college.phone} onChange={(event) => setCollege({ ...college, phone: event.target.value })} /></label><label>Address<input value={college.address} onChange={(event) => setCollege({ ...college, address: event.target.value })} /></label></div></section>
      <section className="admin-card admin-form-card"><CardTitle title="Attendance check-in" subtitle="Short-lived instructor-issued class codes" /><p className="admin-form-hint">Browser-provided GPS coordinates cannot reliably prove that a student is physically on campus. Students now check in with a class code generated by their assigned faculty member; codes expire after 10 minutes and are scoped to the assigned class.</p></section>
      <section className="admin-card admin-form-card"><CardTitle title="Roles & permissions" subtitle="Access is enforced by your assigned account role" /><div className="admin-permission-row"><span><ShieldCheck size={17} /> Administrator</span><strong>Full access</strong></div><div className="admin-permission-row"><span><Users size={17} /> Faculty</span><strong>Assigned classes</strong></div><div className="admin-permission-row"><span><GraduationCap size={17} /> Student</span><strong>Personal records</strong></div></section>
      <section className="admin-card admin-form-card"><CardTitle title="Password policy" subtitle="Choose a minimum password strength for new accounts" /><label className="admin-setting-select">Minimum password strength<select value={policy} onChange={(event) => setPolicy(event.target.value)}><option>Basic</option><option>Strong</option><option>Very strong</option></select></label><p className="admin-form-hint">New user accounts must use passwords of at least 8 characters.</p></section>
      <section className="admin-card admin-form-card"><CardTitle title="Backup & restore" subtitle="Export directory records or restore college settings" /><p className="admin-form-hint">Directory backups include registered student and faculty details but no credentials. Settings can be backed up and restored separately.</p><div className="admin-backup-actions"><button type="button" className="admin-outline-button" onClick={async () => { try { const [students, faculty] = await Promise.all([api.get("/admin/students"), api.get("/admin/faculty")]); exportCsv("campus-directory-backup.csv", [...students.data.map((row) => ({ ...row, recordType: "Student" })), ...faculty.data.map((row) => ({ ...row, recordType: "Faculty" }))]); showNotice("Campus directory backup downloaded."); } catch (requestError) { showNotice(errorMessage(requestError)); } }}><Download size={14} /> Backup directory</button><button type="button" className="admin-outline-button" onClick={() => { const settings = { ...college, passwordPolicy: policy }; const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "campus-settings-backup.json"; anchor.click(); URL.revokeObjectURL(url); }}><Download size={14} /> Backup settings</button><label className="admin-outline-button"><Upload size={14} /> Restore settings<input type="file" accept=".json,application/json" onChange={restoreSettings} /></label></div></section>
      <button className="admin-primary-button admin-save-settings"><Check size={15} /> Save settings</button>
    </form>
  </>;
}

function RecordModal({ title, fields, form, setForm, mode, busy, onSubmit, onClose, password = false, confirmPassword = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const readOnly = mode === "view";
  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal"><button className="admin-modal-close" aria-label="Close" onClick={onClose}><X size={17} /></button><span className="admin-modal-kicker">CAMPUS DIRECTORY</span><h2>{title}</h2>{readOnly ? <div className="admin-detail-list">{fields.map(([key, label]) => <span key={key}><small>{label}</small><strong>{form[key] || "—"}</strong></span>)}</div> : <form onSubmit={onSubmit}><div className="admin-form-grid">{fields.map(([key, label, type]) => <label key={key}>{label}<input required={["name", "email", "studentId", "facultyId"].includes(key) && mode === "add"} type={type} value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}{password && <label className="admin-password-field">{mode === "add" ? "Initial password" : "New password (optional)"}<span className="admin-password-input"><input type={showPassword ? "text" : "password"} minLength="8" required={mode === "add"} value={form.password || ""} onChange={(event) => setForm({ ...form, password: event.target.value, ...(confirmPassword ? { confirmPassword: form.confirmPassword } : {}) })} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span>{mode === "add" && <small>At least 8 characters</small>}</label>}{confirmPassword && <label className="admin-password-field">Confirm new password<span className="admin-password-input"><input type={showConfirmPassword ? "text" : "password"} minLength="8" required={Boolean(form.password)} value={form.confirmPassword || ""} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /><button type="button" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></span></label>}</div><div className="admin-modal-actions"><button type="button" className="admin-outline-button" onClick={onClose}>Cancel</button><button className="admin-primary-button" disabled={busy}>{busy ? "Saving..." : "Save changes"}<Check size={14} /></button></div></form>}</section></div>;
}

function DataTable({ headers, children, empty }) {
  const childRows = children?.props?.children;
  const hasRows = Array.isArray(childRows) ? childRows.length > 0 : Boolean(childRows);
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>{children}{empty && !hasRows && <tbody><tr><td className="admin-table-empty" colSpan={headers.length}>{empty}</td></tr></tbody>}</table></div>;
}
function PersonCell({ name, sub }) {
  return <span className="admin-person"><i>{initials(name)}</i><span><strong>{name}</strong><small>{sub}</small></span></span>;
}
function StatusBadge({ status }) {
  const tone = status === "Active" || status === "Present" || status === "Approved" || status === "Admin" ? "success" : status === "Absent" || status === "Rejected" ? "danger" : "warning";
  return <span className={`admin-status ${tone}`}><i />{status}</span>;
}
function RowActions({ onView, onEdit, onDelete }) {
  return <div className="admin-row-actions">{onView && <button aria-label="View record" title="View" onClick={onView}><Eye size={14} /></button>}{onEdit && <button aria-label="Edit record" title="Edit" onClick={onEdit}><Pencil size={14} /></button>}{onDelete && <button className="reject" aria-label="Delete record" title="Delete" onClick={onDelete}><Trash2 size={14} /></button>}</div>;
}
function exportCsv(filename, rows) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]).filter((key) => !["_id", "__v", "password"].includes(key));
  const csv = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}
