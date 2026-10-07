import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp,
  Clock3, Dumbbell, Filter, LayoutDashboard, Library, LogOut, Menu,
  Plus, Search, Shield, Sparkles, Users, X,
} from "lucide-react";
import DiagramEditor from "./components/DiagramEditor";
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea } from "./components/ui";
import { api, loadBootstrap, saveExercise, savePlan } from "./lib/api";
import type { Bootstrap, Exercise, Role, TrainingPlan } from "./types";

type Page = "overview" | "library" | "planner" | "diagram" | "admin";
const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "library", label: "Exercise library", icon: Library },
  { id: "planner", label: "Training planner", icon: CalendarDays },
  { id: "diagram", label: "Diagram editor", icon: Activity },
  { id: "admin", label: "Club admin", icon: Users },
];
const demoCategories = ["Attack", "Passing", "Shooting", "Defense", "Warm-up", "Footwork"];
const roleLabel: Record<Role, string> = { GlobalAdmin: "Global admin", ClubAdmin: "Club admin", Coach: "Coach", Viewer: "Viewer" };

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Date to be decided";
  return new Intl.DateTimeFormat("en-GB", options || { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export default function App() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(import.meta.env.DEV);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState("All ages");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [complexityFilter, setComplexityFilter] = useState("All levels");
  const [exerciseModal, setExerciseModal] = useState<Exercise | null | false>(false);
  const [planModal, setPlanModal] = useState<TrainingPlan | null | false>(false);
  const [diagramExerciseId, setDiagramExerciseId] = useState("");
  const [clubName, setClubName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamAge, setTeamAge] = useState("U14");
  const [selectedClub, setSelectedClub] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError("");
      const result = await loadBootstrap();
      setData(result);
      setSelectedClub((current) => current || result.clubs[0]?.id || "");
      setDiagramExerciseId((current) => current || result.exercises[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your club.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (import.meta.env.DEV) void refresh();
    else {
      fetch("/.auth/me").then((response) => response.json()).then((payload: { clientPrincipal?: { userId?: string } | null }) => {
        const isSignedIn = Boolean(payload?.clientPrincipal?.userId);
        setSignedIn(isSignedIn);
        if (isSignedIn) void refresh();
        else setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [refresh]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const isAdmin = Boolean(data?.user.roles.some((role) => role === "ClubAdmin" || role === "GlobalAdmin"));
  const isGlobalAdmin = Boolean(data?.user.roles.includes("GlobalAdmin"));
  const canEdit = Boolean(data?.user.roles.some((role) => ["GlobalAdmin", "ClubAdmin", "Coach"].includes(role)));
  const exerciseById = useMemo(() => new Map(data?.exercises.map((exercise) => [exercise.id, exercise]) || []), [data?.exercises]);
  const filteredExercises = useMemo(() => (data?.exercises || []).filter((exercise) => {
    const textMatch = `${exercise.title} ${exercise.description} ${exercise.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    return textMatch && (ageFilter === "All ages" || exercise.ageGroup === ageFilter)
      && (categoryFilter === "All categories" || exercise.category === categoryFilter)
      && (complexityFilter === "All levels" || exercise.complexity === complexityFilter);
  }), [data?.exercises, query, ageFilter, categoryFilter, complexityFilter]);
  const pageTitle = navItems.find((item) => item.id === page)?.label || "Overview";
  const club = data?.clubs.find((item) => item.id === data.user.clubId);

  const act = async (action: () => Promise<unknown>, success?: string): Promise<boolean> => {
    try {
      setSaving(true);
      setError("");
      await action();
      if (success) setMessage(success);
      await refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const logout = () => { window.location.href = "/.auth/logout"; };
  const changePage = (value: Page) => { setPage(value); setMobileOpen(false); };

  if (loading) return <div className="app-loading"><div className="loading-mark">H</div><span>Getting your court ready…</span></div>;
  if (!import.meta.env.DEV && !signedIn) {
    return <SignInPage onLogin={(provider) => { window.location.href = `/.auth/login/${provider}`; }} />;
  }
  if (!data) return <ErrorScreen error={error} onRetry={() => { setLoading(true); void refresh(); }} />;
  if (!data.user.clubId && !isGlobalAdmin) {
    return (
      <main className="onboarding">
        <header className="onboarding-head"><Brand /><button className="profile-button" onClick={logout}><LogOut size={16} /> Sign out</button></header>
        <div className="onboarding-content">
          <div className="eyebrow"><Sparkles size={15} /> YOUR NEXT MOVE</div>
          <h1>Find your handball<br />community.</h1>
          <p className="lead">Choose your club and request access. A club admin will review your request before you can start planning.</p>
          {error && <ErrorBanner message={error} />}
          <Card className="join-card">
            {data.user.status === "pending" && data.requests.length > 0 ? (
              <div className="pending-state"><div className="pending-icon"><Clock3 size={22} /></div><h2>Request sent</h2><p>Your request to join <strong>{data.clubs.find((item) => item.id === data.requests[0].clubId)?.name || "your club"}</strong> is waiting for approval.</p><Button variant="secondary" onClick={logout}>Sign out</Button></div>
            ) : data.user.status === "rejected" ? (
              <div className="pending-state"><div className="pending-icon rejected"><X size={22} /></div><h2>Request not approved</h2><p>Your previous request was declined. You can request access to another club.</p></div>
            ) : null}
            {(!data.requests.some((item) => item.status === "pending") || data.user.status === "rejected") && (
              <form className="join-form" onSubmit={(event) => {
                event.preventDefault();
                if (selectedClub) void act(() => api("join-requests", { method: "POST", body: JSON.stringify({ clubId: selectedClub }) }), "Request sent to your club admin.");
              }}>
                <Field label="Choose your club">
                  <Select value={selectedClub} onChange={(event) => setSelectedClub(event.target.value)} required>
                    <option value="">Select a club…</option>{data.clubs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                </Field>
                {!data.clubs.length && <p className="field-hint">No clubs have been added yet. Ask your Global Admin to create one.</p>}
                <Button type="submit" disabled={!selectedClub || saving} className="full-button">{saving ? "Sending…" : "Request to join"} <ArrowUpRight size={16} /></Button>
              </form>
            )}
          </Card>
          <div className="profile-note">Signed in as {data.user.email}</div>
        </div>
        <p className="onboarding-foot">MADE FOR THE LOVE OF HANDBALL <span>·</span> {new Date().getFullYear()}</p>
        {message && <Toast message={message} />}
      </main>
    );
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Brand /><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="club-switcher">
          <div className="club-avatar">{club?.name.slice(0, 1) || "H"}</div>
          <div className="club-switcher-copy"><strong>{club?.name || "Global workspace"}</strong><span>{club ? "Club workspace" : "Global admin"}</span></div>
          <ChevronDown size={15} className="club-chevron" />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav className="main-nav">
          {navItems.filter((item) => item.id !== "admin" || isAdmin).map(({ id, label, icon: Icon }) =>
            <button key={id} className={`nav-link ${page === id ? "nav-active" : ""}`} onClick={() => changePage(id)}>
              <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
              {id === "admin" && data.requests.filter((item) => item.status === "pending").length > 0 && <span className="nav-count">{data.requests.filter((item) => item.status === "pending").length}</span>}
            </button>,
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={18} /></div><div><strong>Need a hand?</strong><span>We’re here to help</span></div><ArrowUpRight size={15} /></div>
          <div className="user-profile">
            <div className="user-avatar">{data.user.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><strong>{data.user.name}</strong><span>{data.user.roles.map((role) => roleLabel[role]).join(", ")}</span></div>
            <button className="logout-icon" aria-label="Sign out" onClick={(event) => { event.stopPropagation(); logout(); }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <span className="today-label">{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span>
            <div className="topbar-avatar">{data.user.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="page-content">
          {error && <ErrorBanner message={error} onClose={() => setError("")} />}
          {page === "overview" && <Overview data={data} clubName={club?.name || "your club"} onNavigate={changePage} />}
          {page === "library" && <LibraryPage
            exercises={filteredExercises} total={data.exercises.length} query={query} setQuery={setQuery}
            ageFilter={ageFilter} setAgeFilter={setAgeFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            complexityFilter={complexityFilter} setComplexityFilter={setComplexityFilter} canEdit={canEdit}
            onCreate={() => setExerciseModal(null)} onEdit={(exercise) => setExerciseModal(exercise)}
            onDelete={(exercise) => { if (window.confirm(`Delete “${exercise.title}”? This cannot be undone.`)) void act(() => api(`exercises/${exercise.id}`, { method: "DELETE" }), "Exercise deleted."); }}
          />}
          {page === "planner" && <PlannerPage data={data} exerciseById={exerciseById} canEdit={canEdit} onCreate={() => setPlanModal(null)} onEdit={(plan) => setPlanModal(plan)} onDelete={(plan) => { if (window.confirm(`Delete “${plan.title}”?`)) void act(() => api(`plans/${plan.id}`, { method: "DELETE" }), "Session deleted."); }} />}
          {page === "diagram" && <DiagramPage exercises={data.exercises} selectedId={diagramExerciseId} setSelectedId={setDiagramExerciseId} canEdit={canEdit} onNavigate={changePage} onSave={async (diagramJson) => {
            const exercise = exerciseById.get(diagramExerciseId);
            if (!exercise) throw new Error("Choose an exercise first.");
            await saveExercise({ ...exercise, diagramJson }, exercise.id);
            await refresh();
            setMessage("Diagram saved to exercise.");
          }} />}
          {page === "admin" && <AdminPage data={data} isGlobalAdmin={isGlobalAdmin} saving={saving} onCreateClub={() => void act(() => api("clubs", { method: "POST", body: JSON.stringify({ name: clubName }) }), "Club created.")} onRenameClub={(club) => { const name = window.prompt("Rename club", club.name)?.trim(); if (name && name !== club.name) void act(() => api(`clubs/${club.id}`, { method: "PUT", body: JSON.stringify({ name }) }), "Club name updated."); }} onClubName={setClubName} clubName={clubName} onCreateTeam={() => void act(() => api("teams", { method: "POST", body: JSON.stringify({ name: teamName, ageGroup: teamAge }) }), "Team created.")} onTeamName={setTeamName} teamName={teamName} teamAge={teamAge} onTeamAge={setTeamAge} onDecision={(request, status) => void act(() => api(`join-requests/${request.id}`, { method: "PATCH", body: JSON.stringify({ status }) }), status === "approved" ? "Coach approved." : "Request declined.")} onRoleChange={(userId, role) => void act(() => api(`users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }), "Role updated.")} />}
        </div>
      </main>
      {exerciseModal !== false && <ExerciseForm exercise={exerciseModal || undefined} canEdit={canEdit} saving={saving} onClose={() => setExerciseModal(false)} onSave={async (value) => {
        if (await act(() => saveExercise(value, exerciseModal?.id), exerciseModal ? "Exercise updated." : "Exercise added.")) setExerciseModal(false);
      }} />}
      {planModal !== false && <PlanForm plan={planModal || undefined} teams={data.teams} exercises={data.exercises} saving={saving} onClose={() => setPlanModal(false)} onSave={async (value) => {
        if (await act(() => savePlan(value, planModal?.id), planModal ? "Session updated." : "Training session saved.")) setPlanModal(false);
      }} />}
      {message && <Toast message={message} />}
    </div>
  );
}

function Brand() {
  return <div className="brand"><div className="brand-mark"><span>H</span><i /></div><div className="brand-word">handboll<span>sbänken</span><small>THE COACH’S CORNER</small></div></div>;
}

function SignInPage({ onLogin }: { onLogin: (provider: "aad" | "google") => void }) {
  return <main className="sign-in">
    <div className="sign-in-art"><div className="sign-in-brand"><Brand /></div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-ball"><span /></div><div className="art-copy"><span>THE COURT IS YOURS</span><h1>Good sessions<br />start with a<br /><em>good plan.</em></h1><p>One home for your team’s drills, ideas and training plans.</p><div className="art-foot"><span>01 — PLAN</span><span>02 — PRACTICE</span><span>03 — PLAY</span></div></div></div>
    <div className="sign-in-panel"><div className="sign-in-mobile-brand"><Brand /></div><div className="sign-in-box"><div className="welcome-dot"><Sparkles size={16} /></div><p className="eyebrow">WELCOME TO HANDBOLLSBÄNKEN</p><h2>Make every practice<br />a little better.</h2><p className="sign-in-subtitle">Sign in with your account to plan, share and get your team on the same page.</p><div className="login-buttons"><Button className="login-button" variant="secondary" onClick={() => onLogin("aad")}><span className="microsoft-icon"><i /><i /><i /><i /></span>Continue with Microsoft</Button><Button className="login-button" variant="secondary" onClick={() => onLogin("google")}><GoogleMark />Continue with Google</Button></div><p className="sign-in-terms">By signing in, you agree to keep your team’s training data within your club.</p></div><span className="sign-in-copyright">© {new Date().getFullYear()} Handbollsbanken · Built for the love of the game</span></div>
  </main>;
}
function GoogleMark() { return <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="scale(.85) translate(4 5)" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.72 5.99c4.51-4.17 7.06-10.31 7.06-17.64z" transform="scale(.85) translate(4 5)" /><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.59.27-3.12.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z" transform="scale(.85) translate(4 5)" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.72-5.99c-2.14 1.45-4.89 2.3-8.19 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" transform="scale(.85) translate(4 5)" /></svg>; }

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return <main className="error-screen"><div className="error-card"><div className="loading-mark">H</div><h2>We couldn’t load your workspace</h2><p>{error || "Check your connection and try again."}</p><Button onClick={onRetry}>Try again</Button></div></main>;
}
function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return <div className="error-banner"><span>{message}</span>{onClose && <button onClick={onClose} aria-label="Dismiss"><X size={16} /></button>}</div>;
}
function Toast({ message }: { message: string }) { return <div className="toast"><Check size={16} />{message}</div>; }

function Overview({ data, clubName, onNavigate }: { data: Bootstrap; clubName: string; onNavigate: (page: Page) => void }) {
  const upcoming = [...data.plans].filter((plan) => plan.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const pending = data.requests.filter((item) => item.status === "pending").length;
  return <div className="overview-page">
    <div className="welcome-banner"><div className="welcome-content"><div className="eyebrow"><Sparkles size={14} /> YOUR COACHING SPACE</div><h1>Good to see you, {data.user.name.split(" ")[0]}<span className="wave">✳</span></h1><p>A fresh week is a good time to get your team moving.</p><Button onClick={() => onNavigate("planner")}><Plus size={16} /> Plan a session</Button></div><div className="welcome-art"><div className="welcome-court"><div className="court-line court-middle" /><div className="court-circle" /><div className="court-ball">H</div><span className="court-player player-one" /><span className="court-player player-two" /><span className="court-player player-three" /></div><div className="art-spark spark-a">✳</div><div className="art-spark spark-b">✦</div></div></div>
    <div className="section-heading stats-heading"><div><span className="section-kicker">YOUR CLUB AT A GLANCE</span><h2>Practice, in good shape.</h2></div><span className="muted-small">A little progress every session</span></div>
    <div className="stats-grid">
      <StatCard icon={CalendarDays} tone="blue" value={data.plans.length.toString().padStart(2, "0")} label="Sessions planned" detail="Across your teams" />
      <StatCard icon={Dumbbell} tone="green" value={data.exercises.length.toString().padStart(2, "0")} label="Exercises in library" detail="Ready for the court" />
      <StatCard icon={Users} tone="peach" value={data.teams.length.toString().padStart(2, "0")} label="Active teams" detail={clubName} />
      <StatCard icon={Activity} tone="violet" value={`${data.exercises.length ? Math.min(100, Math.round(data.exercises.length / 20 * 100)) : 0}%`} label="Library built" detail="Keep adding your favourites" />
    </div>
    <div className="overview-grid">
      <Card className="upcoming-card"><div className="card-heading"><div><span className="section-kicker">UP NEXT</span><h3>Your upcoming sessions</h3></div><button className="text-action" onClick={() => onNavigate("planner")}>View planner <ArrowUpRight size={14} /></button></div>
        {upcoming.length ? <div className="session-list">{upcoming.map((plan) => <SessionRow key={plan.id} plan={plan} data={data} />)}</div> : <EmptyState icon={CalendarDays} title="Your court is open" text="Create your first session and get the team moving." action="Plan a session" onClick={() => onNavigate("planner")} />}
      </Card>
      <div className="overview-right">
        <Card className="quick-card"><div className="quick-heading"><span className="section-kicker">QUICK START</span><h3>What are we working on?</h3><p>Jump straight into the good stuff.</p></div><button className="quick-link" onClick={() => onNavigate("library")}><div className="quick-icon quick-blue"><Library size={18} /></div><span><strong>Find an exercise</strong><small>Explore your club’s library</small></span><ArrowUpRight size={16} /></button><button className="quick-link" onClick={() => onNavigate("diagram")}><div className="quick-icon quick-green"><Activity size={18} /></div><span><strong>Sketch a play</strong><small>Show the team your idea</small></span><ArrowUpRight size={16} /></button></Card>
        <Card className="coach-tip"><div className="tip-graphic"><Sparkles size={18} /></div><div><span className="section-kicker">A LITTLE REMINDER</span><p>“Great teams are built one good repetition at a time.”</p><span className="tip-byline">Take it one drill at a time.</span></div></Card>
        {pending > 0 && <button className="pending-banner" onClick={() => onNavigate("admin")}><div className="pending-badge">{pending}</div><span><strong>Coach request{pending > 1 ? "s" : ""} to review</strong><small>Your club is waiting on you</small></span><ArrowUpRight size={16} /></button>}
      </div>
    </div>
  </div>;
}
function StatCard({ icon: Icon, tone, value, label, detail }: { icon: typeof CalendarDays; tone: string; value: string; label: string; detail: string }) {
  return <Card className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={18} /></div><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span><span className="stat-detail">{detail}</span></Card>;
}
function SessionRow({ plan, data }: { plan: TrainingPlan; data: Bootstrap }) {
  const team = data.teams.find((item) => item.id === plan.teamId);
  return <div className="session-row"><div className="date-tile"><strong>{new Date(`${plan.date.slice(0, 10)}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${plan.date.slice(0, 10)}T12:00:00`))}</span></div><div className="session-main"><strong>{plan.title}</strong><span>{team?.name || "Team"} · {plan.exerciseIds.length} exercises</span></div><span className="session-duration"><Clock3 size={14} />{plan.duration} min</span><ArrowUpRight size={16} className="session-arrow" /></div>;
}
function EmptyState({ icon: Icon, title, text, action, onClick }: { icon: typeof CalendarDays; title: string; text: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={21} /></div><h4>{title}</h4><p>{text}</p><Button variant="secondary" onClick={onClick}><Plus size={15} />{action}</Button></div>;
}

function LibraryPage(props: {
  exercises: Exercise[]; total: number; query: string; setQuery: (value: string) => void;
  ageFilter: string; setAgeFilter: (value: string) => void; categoryFilter: string; setCategoryFilter: (value: string) => void;
  complexityFilter: string; setComplexityFilter: (value: string) => void; canEdit: boolean;
  onCreate: () => void; onEdit: (exercise: Exercise) => void; onDelete: (exercise: Exercise) => void;
}) {
  const ages = [...new Set(props.exercises.map((exercise) => exercise.ageGroup))];
  const categories = [...new Set([...demoCategories, ...props.exercises.map((exercise) => exercise.category)])];
  return <div className="content-page">
    <div className="page-intro"><div><span className="section-kicker">THE CLUB PLAYBOOK</span><h1>Exercise library<span className="title-count">{props.total}</span></h1><p>Good ideas are worth keeping. Find a drill, make it yours, and get the team moving.</p></div>{props.canEdit && <Button onClick={props.onCreate}><Plus size={16} /> Add exercise</Button>}</div>
    <Card className="library-toolbar"><div className="search-box"><Search size={17} /><Input placeholder="Search exercises, skills or tags…" value={props.query} onChange={(event) => props.setQuery(event.target.value)} /></div><div className="filter-label"><Filter size={14} />FILTER BY</div>
      <Select aria-label="Filter by age group" value={props.ageFilter} onChange={(event) => props.setAgeFilter(event.target.value)}><option>All ages</option>{ages.map((value) => <option key={value}>{value}</option>)}</Select>
      <Select aria-label="Filter by category" value={props.categoryFilter} onChange={(event) => props.setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</Select>
      <Select aria-label="Filter by complexity" value={props.complexityFilter} onChange={(event) => props.setComplexityFilter(event.target.value)}><option>All levels</option>{["Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</Select>
    </Card>
    {props.exercises.length ? <div className="exercise-grid">{props.exercises.map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} variant={index % 4} canEdit={props.canEdit} onEdit={() => props.onEdit(exercise)} onDelete={() => props.onDelete(exercise)} />)}</div> : <Card><EmptyState icon={Library} title={props.total ? "No drills match those filters" : "Start your club’s playbook"} text={props.total ? "Try widening your search or filters." : "Add your first exercise so coaches can build it into a session."} action={props.total ? "Clear filters" : "Add an exercise"} onClick={props.total ? () => { props.setQuery(""); props.setAgeFilter("All ages"); props.setCategoryFilter("All categories"); props.setComplexityFilter("All levels"); } : props.onCreate} /></Card>}
    <div className="results-note">SHOWING {props.exercises.length} OF {props.total} EXERCISES <span>·</span> SHARED WITH YOUR CLUB</div>
  </div>;
}
function ExerciseCard({ exercise, variant, canEdit, onEdit, onDelete }: { exercise: Exercise; variant: number; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  return <Card className="exercise-card"><div className={`exercise-art art-${variant}`}><span className="art-tag">{exercise.category}</span><ExerciseVisual variant={variant} /><div className="art-number">{String(variant + 1).padStart(2, "0")}</div></div><div className="exercise-card-body"><div className="exercise-meta"><Badge tone={variant === 1 ? "green" : variant === 3 ? "violet" : "blue"}>{exercise.ageGroup}</Badge><span className={`complexity-dot complexity-${exercise.complexity.toLowerCase()}`} /> <span>{exercise.complexity}</span></div><h3>{exercise.title}</h3><p>{exercise.description || "A club drill, ready to take to the court."}</p><div className="exercise-tags">{exercise.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="exercise-card-foot"><button onClick={onEdit} className="exercise-open">View exercise <ArrowUpRight size={15} /></button>{canEdit && <div className="exercise-actions"><button onClick={onEdit}>Edit</button><button onClick={onDelete}>Delete</button></div>}</div></div></Card>;
}
function ExerciseVisual({ variant }: { variant: number }) {
  return <div className={`visual-play visual-${variant}`}><span className="visual-circle vc-1">P</span><span className="visual-circle vc-2">P</span><span className="visual-circle vc-3">P</span><span className="visual-cone" /><span className="visual-ball" /><span className="visual-route route-one" /><span className="visual-route route-two" /></div>;
}

function ExerciseForm({ exercise, canEdit, saving, onClose, onSave }: { exercise?: Exercise; canEdit: boolean; saving: boolean; onClose: () => void; onSave: (data: Omit<Exercise, "id" | "clubId" | "createdBy">) => Promise<void> }) {
  const [title, setTitle] = useState(exercise?.title || "");
  const [description, setDescription] = useState(exercise?.description || "");
  const [ageGroup, setAgeGroup] = useState(exercise?.ageGroup || "U14");
  const [category, setCategory] = useState(exercise?.category || "Passing");
  const [complexity, setComplexity] = useState(exercise?.complexity || "Intermediate");
  const [tags, setTags] = useState(exercise?.tags.join(", ") || "");
  return <Modal title={!canEdit ? "Exercise details" : exercise ? "Edit exercise" : "Add an exercise"} onClose={onClose} wide><form className="modal-form" onSubmit={(event) => {
    event.preventDefault();
    if (!canEdit) return;
    void onSave({ title, description, ageGroup, category, complexity, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), diagramJson: exercise?.diagramJson || "[]" });
  }}><p className="modal-lead">{canEdit ? "Build a drill your whole club can put to use." : "A drill shared with your club."}</p><Field label="Exercise name"><Input autoFocus required minLength={2} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Three-lane passing" disabled={!canEdit} /></Field><Field label="What’s the idea?"><Textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the setup, movement and coaching points…" disabled={!canEdit} /></Field><div className="form-row"><Field label="Age group"><Select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)} disabled={!canEdit}>{["U10", "U12", "U14", "U16", "U18", "Senior", "All ages"].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value)} disabled={!canEdit}>{demoCategories.map((value) => <option key={value}>{value}</option>)}</Select></Field></div><div className="form-row"><Field label="Complexity"><Select value={complexity} onChange={(event) => setComplexity(event.target.value)} disabled={!canEdit}>{["Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Tags" hint="Separate tags with commas"><Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="e.g. passing, speed" disabled={!canEdit} /></Field></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>{canEdit ? "Cancel" : "Close"}</Button>{canEdit && <Button type="submit" disabled={saving}>{saving ? "Saving…" : exercise ? "Save changes" : "Add to library"} <ArrowUpRight size={15} /></Button>}</div></form></Modal>;
}

function PlannerPage({ data, exerciseById, canEdit, onCreate, onEdit, onDelete }: { data: Bootstrap; exerciseById: Map<string, Exercise>; canEdit: boolean; onCreate: () => void; onEdit: (plan: TrainingPlan) => void; onDelete: (plan: TrainingPlan) => void }) {
  const sorted = [...data.plans].sort((a, b) => a.date.localeCompare(b.date));
  return <div className="content-page">
    <div className="page-intro"><div><span className="section-kicker">MAKE TIME FOR THE GOOD STUFF</span><h1>Training planner</h1><p>Build a practice that flows — from first whistle to final stretch.</p></div>{canEdit && <Button onClick={onCreate}><Plus size={16} /> Plan a session</Button>}</div>
    <div className="planner-summary"><div><div className="summary-icon"><CalendarDays size={18} /></div><span><strong>{data.plans.length} sessions</strong><small>planned for your club</small></span></div><div><div className="summary-icon green-summary"><Clock3 size={18} /></div><span><strong>{data.plans.reduce((total, plan) => total + plan.duration, 0)} min</strong><small>court time scheduled</small></span></div><div><div className="summary-icon peach-summary"><Users size={18} /></div><span><strong>{data.teams.length} teams</strong><small>ready to get moving</small></span></div></div>
    {sorted.length ? <div className="plan-list">{sorted.map((plan, index) => <PlanCard key={plan.id} plan={plan} data={data} exerciseById={exerciseById} canEdit={canEdit} index={index} onEdit={() => onEdit(plan)} onDelete={() => onDelete(plan)} />)}</div> : <Card><EmptyState icon={CalendarDays} title="No sessions on the calendar" text="Put together a practice and make the most of your court time." action="Plan your first session" onClick={onCreate} /></Card>}
  </div>;
}
function PlanCard({ plan, data, exerciseById, canEdit, index, onEdit, onDelete }: { plan: TrainingPlan; data: Bootstrap; exerciseById: Map<string, Exercise>; canEdit: boolean; index: number; onEdit: () => void; onDelete: () => void }) {
  const team = data.teams.find((item) => item.id === plan.teamId);
  return <Card className="plan-card"><div className="plan-date"><span>{dateLabel(plan.date, { month: "short" }).toUpperCase()}</span><strong>{new Date(`${plan.date.slice(0, 10)}T12:00:00`).getDate()}</strong><small>{dateLabel(plan.date, { weekday: "short" })}</small></div><div className="plan-main"><div className="plan-heading"><div><div className="plan-teamline"><Badge tone={index % 2 ? "green" : "blue"}>{team?.ageGroup || "Team"}</Badge><span>{team?.name || "Team"}</span></div><h3>{plan.title}</h3></div><span className="plan-time"><Clock3 size={14} />{plan.duration} min</span></div><PlanTimeline plan={plan} exerciseById={exerciseById} />{plan.notes && <p className="plan-notes">{plan.notes}</p>}</div>{canEdit && <div className="plan-actions"><button onClick={onEdit}>Edit</button><button onClick={onDelete}>Delete</button></div>}</Card>;
}
function PlanTimeline({ plan, exerciseById }: { plan: TrainingPlan; exerciseById: Map<string, Exercise> }) {
  const count = plan.exerciseIds.length;
  let elapsed = 0;
  const baseMinutes = count ? Math.floor(plan.duration / count) : 0;
  const extraMinutes = count ? plan.duration % count : 0;
  const segments = plan.exerciseIds.map((id, index) => {
    const start = elapsed;
    const duration = baseMinutes + (index < extraMinutes ? 1 : 0);
    elapsed += duration;
    return { id, index, start, end: elapsed, duration, name: exerciseById.get(id)?.title || "Exercise" };
  });
  const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  return <div className="plan-timeline">
    <div className="timeline-bar">{segments.length ? segments.map((segment) => <span key={`${segment.id}-${segment.index}`} className={`timeline-segment timeline-tone-${segment.index % 4}`} style={{ width: `${segment.duration / plan.duration * 100}%` }} title={`${segment.name}: ${segment.duration} min`} />) : <span className="timeline-empty-segment" />}</div>
    {segments.length ? <div className="timeline-labels">{segments.map((segment) => <div className="timeline-label" key={`${segment.id}-${segment.index}`}><span>{clock(segment.start)}–{clock(segment.end)}</span><strong>{segment.name}</strong></div>)}</div> : <span className="timeline-empty-label">Add exercises to map out your session flow.</span>}
  </div>;
}
function PlanForm({ plan, teams, exercises, saving, onClose, onSave }: { plan?: TrainingPlan; teams: Bootstrap["teams"]; exercises: Exercise[]; saving: boolean; onClose: () => void; onSave: (value: Omit<TrainingPlan, "id" | "clubId">) => Promise<void> }) {
  const [title, setTitle] = useState(plan?.title || "");
  const [teamId, setTeamId] = useState(plan?.teamId || teams[0]?.id || "");
  const [date, setDate] = useState(plan?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(plan?.duration || 90);
  const [notes, setNotes] = useState(plan?.notes || "");
  const [exerciseIds, setExerciseIds] = useState<string[]>(plan?.exerciseIds || []);
  const ordered = exerciseIds.map((id) => exercises.find((item) => item.id === id)).filter((item): item is Exercise => Boolean(item));
  const move = (id: string, direction: -1 | 1) => setExerciseIds((current) => {
    const index = current.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const result = [...current]; [result[index], result[target]] = [result[target], result[index]]; return result;
  });
  return <Modal title={plan ? "Edit training session" : "Plan a session"} onClose={onClose} wide><form className="modal-form" onSubmit={(event) => {
    event.preventDefault();
    void onSave({ title, teamId, date, duration: Number(duration), exerciseIds, notes });
  }}><p className="modal-lead">Make a plan, save it as a draft, and come back to fine-tune it.</p><Field label="Session name"><Input required minLength={2} maxLength={100} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Fast breaks & finishing" /></Field><div className="form-row"><Field label="Team"><Select required value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choose team…</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.ageGroup}</option>)}</Select></Field><Field label="Date"><Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></Field><Field label="Duration (minutes)"><Input type="number" min={15} max={300} step={5} required value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></Field></div><div className="form-field"><span className="field-label">Add exercises <span className="optional-label">· OPTIONAL</span></span><div className="exercise-picker">{exercises.length ? exercises.map((exercise) => <label key={exercise.id} className={`exercise-option ${exerciseIds.includes(exercise.id) ? "exercise-option-selected" : ""}`}><input type="checkbox" checked={exerciseIds.includes(exercise.id)} onChange={(event) => setExerciseIds((current) => event.target.checked ? [...current, exercise.id] : current.filter((id) => id !== exercise.id))} /><span className="option-check">{exerciseIds.includes(exercise.id) && <Check size={12} />}</span><span><strong>{exercise.title}</strong><small>{exercise.category} · {exercise.ageGroup}</small></span></label>) : <p className="field-hint">Add exercises in your club library first.</p>}</div></div>{ordered.length > 0 && <div className="order-list"><span className="field-label">SESSION FLOW · MOVE TO REORDER</span>{ordered.map((exercise, index) => <div className="order-row" key={`${exercise.id}-${index}`}><span className="order-index">{String(index + 1).padStart(2, "0")}</span><span>{exercise.title}</span><button type="button" disabled={index === 0} aria-label="Move exercise up" onClick={() => move(exercise.id, -1)}><ArrowUp size={15} /></button><button type="button" disabled={index === ordered.length - 1} aria-label="Move exercise down" onClick={() => move(exercise.id, 1)}><ArrowDown size={15} /></button></div>)}</div>}<Field label="Coach’s notes"><Textarea rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Focus points, equipment, or anything to remember…" /></Field><div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || !teams.length}>{saving ? "Saving…" : plan ? "Save changes" : "Save session"} <ArrowUpRight size={15} /></Button></div>{!teams.length && <p className="form-error">Ask a club admin to add a team before scheduling a session.</p>}</form></Modal>;
}

function DiagramPage({ exercises, selectedId, setSelectedId, canEdit, onNavigate, onSave }: { exercises: Exercise[]; selectedId: string; setSelectedId: (value: string) => void; canEdit: boolean; onNavigate: (page: Page) => void; onSave: (value: string) => Promise<void> }) {
  const selected = exercises.find((item) => item.id === selectedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return <div className="content-page diagram-page"><div className="page-intro"><div><span className="section-kicker">DRAW IT. SHOW IT. PLAY IT.</span><h1>Diagram editor</h1><p>Give a great idea a shape. Sketch a movement, drag your markers and save it to a drill.</p></div><div className="diagram-status"><span className="status-dot" />{selected ? "SAVING TO EXERCISE" : "PICK AN EXERCISE"}</div></div>
    {!exercises.length ?     <Card><EmptyState icon={Activity} title="Add a drill to get started" text="Your court is ready when you are. Create an exercise and bring it to life here." action="Open exercise library" onClick={() => onNavigate("library")} /></Card> :
      <Card className="diagram-card"><div className="diagram-titlebar"><div><div className="diagram-eyebrow"><span className="green-pip" /> COURT SKETCH <span>·</span> SAVES WITH EXERCISE</div><h2>Sketch a play</h2></div><Field label="EXERCISE"><Select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title}</option>)}</Select></Field></div>{!canEdit && <p className="read-only-note">You have view-only access to diagrams.</p>}{error && <ErrorBanner message={error} onClose={() => setError("")} />}<div className={!canEdit ? "diagram-readonly" : ""}><DiagramEditor key={selected?.id || "none"} value={selected?.diagramJson || "[]"} onSave={async (value) => { if (!canEdit) return; setSaving(true); setError(""); try { await onSave(value); } catch (cause) { setError(cause instanceof Error ? cause.message : "Diagram could not be saved."); } finally { setSaving(false); } }} /></div>{saving && <div className="saving-indicator"><span className="status-dot" />Saving your diagram…</div>}<div className="diagram-legend"><span><i className="legend-player" /> Player</span><span><i className="legend-gk" /> Goalkeeper</span><span><i className="legend-pass" /> Pass</span><span><i className="legend-move" /> Movement</span><span className="legend-hint">A clear picture makes a better play.</span></div></Card>}
    <div className="diagram-tip"><Sparkles size={16} /><p><strong>Keep it simple.</strong> A few well-placed markers make a play easier to understand.</p></div>
  </div>;
}

function AdminPage(props: {
  data: Bootstrap; isGlobalAdmin: boolean; saving: boolean; clubName: string; onClubName: (value: string) => void;
  onCreateClub: () => void; onRenameClub: (club: Bootstrap["clubs"][number]) => void;
  teamName: string; onTeamName: (value: string) => void; teamAge: string; onTeamAge: (value: string) => void;
  onCreateTeam: () => void; onDecision: (request: Bootstrap["requests"][number], status: "approved" | "rejected") => void;
  onRoleChange: (userId: string, role: Role) => void;
}) {
  const pending = props.data.requests.filter((request) => request.status === "pending");
  return <div className="content-page"><div className="page-intro"><div><span className="section-kicker">KEEP YOUR CLUB IN GOOD SHAPE</span><h1>Club admin</h1><p>Welcome the right people in, keep your teams organised, and let the good sessions happen.</p></div><Badge tone="violet"><Shield size={12} />{props.isGlobalAdmin ? "Global admin" : "Club admin"}</Badge></div>
    {props.isGlobalAdmin && <Card className="admin-create-card"><div className="admin-card-intro"><div className="admin-icon global-admin-icon"><Shield size={18} /></div><div><h3>Your clubs</h3><p>Create and grow your club spaces.</p></div></div><form className="inline-create" onSubmit={(event) => { event.preventDefault(); if (props.clubName.trim()) props.onCreateClub(); }}><Input value={props.clubName} onChange={(event) => props.onClubName(event.target.value)} placeholder="New club name" required minLength={2} maxLength={100} /><Button disabled={props.saving}><Plus size={15} /> Add club</Button></form>{props.data.clubs.length > 0 && <div className="club-chips">{props.data.clubs.map((club) => <span key={club.id}><i />{club.name}<button onClick={() => props.onRenameClub(club)} aria-label={`Rename ${club.name}`}>Rename</button></span>)}</div>}</Card>}
    <Card className="admin-section"><div className="card-heading"><div><span className="section-kicker">GOOD PEOPLE, GREAT TEAMS</span><h3>Membership requests <span className="inline-count">{pending.length}</span></h3></div></div>{pending.length ? <div className="request-list">{pending.map((request) => <div className="request-row" key={request.id}><div className="request-avatar">{request.userName.slice(0, 1).toUpperCase()}</div><div className="request-copy"><strong>{request.userName}</strong><span>{request.email} · {props.data.clubs.find((club) => club.id === request.clubId)?.name || "Club"}</span></div><span className="request-date">{dateLabel(request.createdDate)}</span><Button variant="secondary" onClick={() => props.onDecision(request, "rejected")}>Decline</Button><Button onClick={() => props.onDecision(request, "approved")}><Check size={14} /> Approve</Button></div>)}</div> : <div className="admin-empty"><div className="empty-icon"><Check size={20} /></div><div><strong>All caught up.</strong><span>There are no membership requests waiting for review.</span></div></div>}</Card>
    {!props.isGlobalAdmin && <Card className="admin-create-card"><div className="admin-card-intro"><div className="admin-icon"><Users size={18} /></div><div><h3>Your teams</h3><p>Keep the right group on the right plan.</p></div></div><form className="inline-create" onSubmit={(event) => { event.preventDefault(); if (props.teamName.trim()) props.onCreateTeam(); }}><Input value={props.teamName} onChange={(event) => props.onTeamName(event.target.value)} placeholder="Team name, e.g. Girls U14" required minLength={2} maxLength={80} /><Select value={props.teamAge} onChange={(event) => props.onTeamAge(event.target.value)}>{["U10", "U12", "U14", "U16", "U18", "Senior"].map((age) => <option key={age}>{age}</option>)}</Select><Button disabled={props.saving}><Plus size={15} /> Add team</Button></form>{props.data.teams.length > 0 ? <div className="team-table">{props.data.teams.map((team) => <div key={team.id}><div className="team-dot" /><strong>{team.name}</strong><Badge>{team.ageGroup}</Badge></div>)}</div> : <p className="empty-inline">Your first team can start here.</p>}</Card>}
    <Card className="admin-section"><div className="card-heading"><div><span className="section-kicker">THE PEOPLE BEHIND THE PLAYS</span><h3>Club members <span className="inline-count">{props.data.users.length}</span></h3></div></div>{props.data.users.length ? <div className="members-table"><div className="members-head"><span>MEMBER</span><span>STATUS</span><span>ROLE</span></div>        {props.data.users.map((user) => <div className="member-row" key={user.id}><div className="member-person"><div className="request-avatar">{user.name.slice(0, 1).toUpperCase()}</div><span><strong>{user.name}</strong><small>{user.email}</small></span></div><Badge tone={user.status === "approved" ? "green" : "amber"}>{user.status}</Badge>{user.roles.includes("GlobalAdmin") ? <Badge tone="violet">Global admin</Badge> : <Select disabled={!props.isGlobalAdmin && user.id === props.data.user.id} aria-label={`Role for ${user.name}`} value={user.roles[0]} onChange={(event) => props.onRoleChange(user.id, event.target.value as Role)}><option value="ClubAdmin">Club admin</option><option value="Coach">Coach</option><option value="Viewer">Viewer</option></Select>}</div>)}</div> : <div className="admin-empty"><div className="empty-icon"><Users size={20} /></div><div><strong>Your club’s circle will grow here.</strong><span>Approved coaches and viewers will show up in this list.</span></div></div>}</Card>
  </div>;
}
