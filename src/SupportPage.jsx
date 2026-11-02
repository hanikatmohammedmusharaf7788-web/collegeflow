import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, CircleHelp, Mail, RefreshCw } from "lucide-react";
import api, { errorMessage } from "./api.js";

const issueTypes = {
  student: ["Sign-in or password", "Attendance or check-in", "Marks or grades", "Courses or timetable", "Leave request", "Technical issue", "Other"],
  faculty: ["Sign-in or password", "Student attendance", "Student records", "Subjects or classes", "Marks or grades", "Technical issue", "Other"],
};

export default function SupportPage({ role }) {
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [classTeachers, setClassTeachers] = useState([]);
  const [destination, setDestination] = useState("admin");
  const [facultyId, setFacultyId] = useState("");
  const [subject, setSubject] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingContact, setLoadingContact] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const { data } = await api.get("/support/mine");
      setMyRequests(data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/support/contact")
      .then(({ data }) => {
        if (!active) return;
        setSupportEmail(data.email);
        setClassTeachers(data.classTeachers || []);
      })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoadingContact(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/support", { issueType, description, destination, facultyId, subject });
      setSuccess(data.message);
      setDescription("");
      setIssueType("");
      setFacultyId("");
      setSubject("");
      await loadRequests();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <PageHeading role={role} />
    <section className="support-card">
      <div className="support-intro"><span><CircleHelp size={19} /></span><div><h2>Tell us how we can help</h2><p>Choose a topic and where to send it. Your request will appear in the recipient’s CampusFlow portal.</p></div></div>
      <form className="support-form" onSubmit={submit}>
        <label>Send this request to
          <select required value={destination} onChange={(event) => { setDestination(event.target.value); setFacultyId(""); setSubject(""); }}>
            <option value="admin">Admin portal</option>
            <option value="higher-management">Higher management (Admin portal)</option>
            {role === "student" && <><option value="class-teacher">Class teacher (Faculty portal)</option><option value="hod">HOD (Faculty portal)</option></>}
          </select>
        </label>
        {destination === "class-teacher" && <>
          <label>Subject
            <select required value={subject} onChange={(event) => { setSubject(event.target.value); setFacultyId(""); }}>
              <option value="">Choose your subject</option>
              {[...new Set(classTeachers.flatMap((teacher) => teacher.subjects))].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Class teacher
            <select required value={facultyId} onChange={(event) => setFacultyId(event.target.value)}>
              <option value="">Choose the assigned teacher</option>
              {classTeachers.filter((teacher) => teacher.subjects.includes(subject)).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
            {!loadingContact && classTeachers.length === 0 && <small>No teacher assignments were found for your enrolled subjects.</small>}
          </label>
        </>}
        <label>What do you need help with?
          <select required value={issueType} onChange={(event) => setIssueType(event.target.value)}>
            <option value="">Choose a topic</option>
            {issueTypes[role].map((topic) => <option key={topic}>{topic}</option>)}
          </select>
        </label>
        <label>Describe the issue
          <textarea required minLength={10} maxLength={3000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Include what you were trying to do and what happened." />
          <small>{description.length}/3000 characters (minimum 10)</small>
        </label>
        {error && <p className="support-error" role="alert">{error}</p>}
        {success && <p className="support-success" role="status"><CheckCircle2 size={16} />{success}</p>}
        <button className="primary-button" disabled={submitting || (destination === "class-teacher" && loadingContact)}>
          {submitting ? "Sending request…" : "Submit support request"}<ArrowRight size={16} />
        </button>
      </form>
    </section>
    <section className="support-card support-my-requests">
      <div className="support-intro"><span><RefreshCw size={18} /></span><div><h2>My support requests</h2><p>Track requests you’ve submitted and see their status.</p></div><button className="support-refresh" type="button" onClick={loadRequests} aria-label="Refresh requests"><RefreshCw size={14} /></button></div>
      {loadingRequests ? <p className="support-hint">Loading your requests…</p> : myRequests.length ? <div className="support-request-list">{myRequests.map((request) => <article className="support-request-row" key={request._id}><div><strong>{request.issueType}</strong><p>{request.description}</p><small>To: {destinationLabel(request.destination)} · {new Date(request.createdAt).toLocaleString()}</small></div><StatusBadge status={request.status} /></article>)}</div> : <p className="support-hint">You haven’t submitted any requests yet.</p>}
    </section>
    <section className="support-email-card">
      <span><Mail size={17} /></span>
      <div><strong>Prefer email?</strong><p>You can contact campus support directly instead.</p></div>
      {supportEmail
        ? <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(`CampusFlow ${role} support`)}`}>Email support <ArrowRight size={14} /></a>
        : <span className="support-email-unavailable">{loadingContact ? "Loading…" : "Email unavailable"}</span>}
    </section>
  </>;
}

export function SupportInbox({ role, search = "" }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/support/inbox");
      setRequests(data);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const updateStatus = async (request, status) => {
    try {
      await api.patch(`/support/${request._id}/status`, { status });
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };
  const visible = requests.filter((request) => `${request.requesterName} ${request.requesterEmail} ${request.requesterIdentifier} ${request.issueType} ${request.description} ${destinationLabel(request.destination)}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <>
    <div className="page-heading"><div><span className="eyebrow">CAMPUS SUPPORT</span><h1>Support inbox</h1><p>{role === "admin" ? "Review and manage requests sent to campus administration." : "Review requests routed to your faculty account or department."}</p></div><button className="outline-button" onClick={load}><RefreshCw size={14} /> Refresh</button></div>
    <section className="support-card">
      {error && <p className="support-error" role="alert">{error}</p>}
      {loading ? <p className="support-hint">Loading support requests…</p> : visible.length ? <div className="support-request-list">{visible.map((request) => <article className="support-inbox-item" key={request._id}>
        <div className="support-request-heading"><div><span className="support-request-route">{destinationLabel(request.destination)} · {request.requesterRole}</span><h2>{request.issueType}</h2></div><StatusBadge status={request.status} /></div>
        <p className="support-request-description">{request.description}</p>
        {request.subject && <small className="support-request-meta">Subject: {request.subject}</small>}
        <div className="support-request-footer"><span>{request.requesterName} · {request.requesterIdentifier} · <a href={`mailto:${request.requesterEmail}`}>{request.requesterEmail}</a></span><time>{new Date(request.createdAt).toLocaleString()}</time></div>
        <label className="support-status-control">Status<select value={request.status} onChange={(event) => updateStatus(request, event.target.value)}><option>Open</option><option>In progress</option><option>Resolved</option></select></label>
      </article>)}</div> : <p className="support-hint">{search ? "No requests match your search." : "There are no support requests yet."}</p>}
    </section>
  </>;
}

function destinationLabel(destination) {
  return ({
    admin: "Admin portal",
    "class-teacher": "Class teacher",
    hod: "HOD",
    "higher-management": "Higher management",
  })[destination] || "Support";
}

function StatusBadge({ status }) {
  return <span className={`support-status support-status-${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>;
}

function PageHeading({ role }) {
  return <div className="page-heading"><div><span className="eyebrow">CAMPUS SUPPORT</span><h1>Help & Support</h1><p>Get help with your {role} portal.</p></div></div>;
}
