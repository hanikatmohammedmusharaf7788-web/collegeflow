import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell, Megaphone, Send } from "lucide-react";
import api, { errorMessage } from "./api.js";

function announcementTarget(item) {
  if (item.audience === "everyone") return "Students and faculty";
  if (item.audience === "hod") return "Department HOD";
  return `${item.subject} · ${item.year}, Section ${item.section}`;
}

export function AnnouncementPreview({ onOpen }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get("/announcements").then(({ data }) => {
      if (active) {
        setItems(data.slice(0, 2));
        setError("");
      }
    }).catch((requestError) => {
      if (active) setError(errorMessage(requestError));
    });
    return () => { active = false; };
  }, []);
  return <>
    <div className="student-announcement-preview">
      {error ? <p className="student-announcement-empty" role="alert">{error}</p>
        : items.length ? items.map((item) => <article className="student-announcement-item" key={item._id}><span className="announcement-icon lavender"><Bell size={16} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{item.senderName} · {new Date(item.createdAt).toLocaleDateString()}</small></div></article>)
          : <p className="student-announcement-empty">Official college and class announcements will appear here.</p>}
    </div>
    <button className="student-announcements-link" onClick={onOpen}>View all announcements <ArrowRight size={14} /></button>
  </>;
}

export default function AnnouncementsPage({ role, search = "", onNotice }) {
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState(role === "admin" ? "everyone" : "class");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/announcements");
      setItems(data);
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (role !== "faculty") return undefined;
    let active = true;
    api.get("/faculty/subjects").then(({ data }) => {
      if (active) {
        setSubjects(data);
        setSubjectId((current) => current || data[0]?._id || "");
      }
    }).catch((requestError) => {
      if (active) setError(errorMessage(requestError));
    });
    return () => { active = false; };
  }, [role]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const { data } = await api.post("/announcements", { title, message, audience, subjectId });
      setTitle("");
      setMessage("");
      onNotice?.(data.message);
      await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setSending(false); }
  };

  const visibleItems = items.filter((item) => `${item.title} ${item.message} ${item.senderName} ${item.subject} ${item.department}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="page-heading"><div><span className="eyebrow">CAMPUS UPDATES</span><h1>Announcements</h1><p>{role === "student" ? "Official updates from your college and faculty." : role === "admin" ? "Send a campus-wide announcement to students and faculty." : "Send an update to one of your classes or your department HOD."}</p></div></div>
    {role !== "student" && <section className="content-card announcement-composer">
      <div className="announcement-composer-title"><span><Megaphone size={18} /></span><div><h2>Write an announcement</h2><p>{role === "admin" ? "This announcement will be visible to all students and faculty." : "Choose an assigned class or send a message to your department HOD."}</p></div></div>
      <form onSubmit={submit} className="announcement-form">
        <label>Title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Announcement title" /></label>
        {role === "faculty" && <>
          <label>Send to<select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="class">An assigned class</option><option value="hod">Department HOD</option></select></label>
          {audience === "class" && <label>Assigned subject / class<select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Choose a class</option>{subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name} · {subject.year}, Section {subject.section}</option>)}</select></label>}
          {audience === "hod" && <p className="announcement-recipient-note">The current HOD for your department will receive this announcement in their Faculty Portal.</p>}
        </>}
        <label>Message<textarea required maxLength={3000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your announcement..." /><small>{message.length}/3000</small></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button announcement-send-button" disabled={sending || (role === "faculty" && audience === "class" && !subjectId)}>{sending ? "Sending…" : "Send announcement"}<Send size={15} /></button>
      </form>
    </section>}
    {error && role === "student" && <div className="error-panel announcement-error" role="alert"><p>{error}</p><button className="primary-button" onClick={load}>Try again <ArrowRight size={15} /></button></div>}
    <section className="content-card announcement-list-card">
      <div className="card-title"><div><h2>Recent announcements</h2><p>{role === "admin" ? "All published announcements" : "Announcements sent to you"}</p></div><button className="outline-button" type="button" onClick={load}>Refresh</button></div>
      {loading ? <div className="announcement-loading">Loading announcements…</div> : visibleItems.length ? <div className="announcement-list">{visibleItems.map((item) => <article className="announcement-list-item" key={item._id}><span className="announcement-icon lavender"><Bell size={17} /></span><div className="announcement-list-copy"><div className="announcement-list-heading"><h3>{item.title}</h3><time>{new Date(item.createdAt).toLocaleString()}</time></div><p>{item.message}</p><small>From {item.senderName} ({item.senderRole}) · To {announcementTarget(item)}{item.department && item.audience === "hod" ? ` · ${item.department}` : ""}</small></div></article>)}</div>
        : <div className="announcement-empty"><Megaphone size={22} /><p>{search ? "No announcements match your search." : "No announcements yet."}</p></div>}
    </section>
  </>;
}
