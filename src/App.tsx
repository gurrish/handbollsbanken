import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp,
  Clock3, Copy, Dumbbell, Filter, LayoutDashboard, Library, LogOut, Menu, Printer,
  Pencil, Plus, Search, Share2, Shield, Sparkles, Users, X,
} from "lucide-react";
import DiagramEditor from "./components/DiagramEditor";
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea } from "./components/ui";
import { api, loadBootstrap, saveExercise, savePlan, saveTemplate } from "./lib/api";
import { LanguageSelect, localize, translateText, useLocale } from "./lib/i18n";
import type { Bootstrap, Exercise, Role, TrainingPlan, TrainingTemplate } from "./types";

type Page = "overview" | "library" | "planner" | "admin";
const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "library", label: "Exercise library", icon: Library },
  { id: "planner", label: "Training planner", icon: CalendarDays },
  { id: "admin", label: "Club administration", icon: Users },
];
const demoCategories = ["Attack", "Passing", "Shooting", "Defense", "Warm-up", "Footwork"];
const ageGroups = [
  { value: "HBS", label: "HBS (6–8)" },
  { value: "U9", label: "U9" },
  { value: "U10", label: "U10" },
  { value: "U12", label: "U12" },
  { value: "U14", label: "U14" },
  { value: "U16", label: "U16" },
  { value: "U18", label: "U18" },
  { value: "Senior", label: "Senior" },
];
const roleLabel: Record<Role, string> = { GlobalAdmin: "Global admin", ClubAdmin: "Club administrator", Coach: "Coach", Viewer: "Viewer" };

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions, locale: "sv" | "en" = "sv") {
  if (!value) return "Date to be decided";
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", options || { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export default function App() {
  const { locale } = useLocale();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [page, setPage] = useState<Page>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("training") || params.has("template") ? "planner" : params.has("exercise") ? "library" : "overview";
  });
  const [sharedTrainingId, setSharedTrainingId] = useState(() => new URLSearchParams(window.location.search).get("training"));
  const [sharedExerciseId, setSharedExerciseId] = useState(() => new URLSearchParams(window.location.search).get("exercise"));
  const [sharedTemplateId, setSharedTemplateId] = useState(() => new URLSearchParams(window.location.search).get("template"));
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
  const [templateModal, setTemplateModal] = useState<TrainingTemplate | null | false>(false);
  const [scheduleTemplate, setScheduleTemplate] = useState<TrainingTemplate | false>(false);
  const [editingTrainingId, setEditingTrainingId] = useState<string | null>(null);
  const [teamModal, setTeamModal] = useState<Bootstrap["teams"][number] | false>(false);
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
  const sharedTraining = data?.plans.find((plan) => plan.id === sharedTrainingId);
  const sharedExercise = data?.exercises.find((exercise) => exercise.id === sharedExerciseId);
  const sharedTemplate = data?.templates.find((template) => template.id === sharedTemplateId);
  const pageTitle = sharedTrainingId ? sharedTraining?.title || "Shared training"
    : sharedTemplateId ? sharedTemplate?.title || "Training template"
      : sharedExerciseId ? sharedExercise?.title || "Shared exercise"
      : navItems.find((item) => item.id === page)?.label || "Overview";
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
  const clearSharedLink = (replace = true) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("training");
    url.searchParams.delete("exercise");
    url.searchParams.delete("template");
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setSharedTrainingId(null);
    setSharedExerciseId(null);
    setSharedTemplateId(null);
  };
  const changePage = (value: Page) => {
    if (sharedTrainingId || sharedExerciseId || sharedTemplateId) clearSharedLink();
    setPage(value);
    setMobileOpen(false);
  };
  const openTraining = (id: string, edit = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set("training", id);
    url.searchParams.delete("exercise");
    url.searchParams.delete("template");
    window.history.pushState({}, "", url);
    setSharedTrainingId(id);
    setSharedExerciseId(null);
    setSharedTemplateId(null);
    setEditingTrainingId(edit ? id : null);
    setMobileOpen(false);
  };
  const openTemplate = (id: string, edit = false) => {
    const url = new URL(window.location.href);
    url.searchParams.set("template", id);
    url.searchParams.delete("training");
    url.searchParams.delete("exercise");
    window.history.pushState({}, "", url);
    setSharedTemplateId(id);
    setSharedTrainingId(null);
    setSharedExerciseId(null);
    setEditingTrainingId(edit ? id : null);
    setMobileOpen(false);
  };
  const openExercise = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("exercise", id);
    url.searchParams.delete("training");
    url.searchParams.delete("template");
    window.history.pushState({}, "", url);
    setSharedExerciseId(id);
    setSharedTrainingId(null);
    setSharedTemplateId(null);
    setPage("library");
    setMobileOpen(false);
  };
  const copyTrainingLink = async (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("training", id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage("Training link copied. Only signed-in club members can open it.");
    } catch {
      setError("Could not copy the link. Check clipboard permissions and try again.");
    }
  };
  const copyExerciseLink = async (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("exercise", id);
    url.searchParams.delete("training");
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage("Exercise link copied. Only signed-in club members can open it.");
    } catch {
      setError("Could not copy the link. Check clipboard permissions and try again.");
    }
  };
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const trainingId = params.get("training");
      const exerciseId = params.get("exercise");
      const templateId = params.get("template");
      setSharedTrainingId(trainingId);
      setSharedExerciseId(exerciseId);
      setSharedTemplateId(templateId);
      if (trainingId || templateId) setPage("planner");
      else if (exerciseId) setPage("library");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (loading) return localize(<div className="app-loading"><div className="loading-mark">H</div><span>Getting your court ready…</span></div>);
  if (!import.meta.env.DEV && !signedIn) {
    return <SignInPage onLogin={(provider) => {
      const returnUrl = new URL(window.location.href);
      if (returnUrl.pathname.startsWith("/.auth/")) {
        returnUrl.pathname = "/";
        returnUrl.search = "";
        returnUrl.hash = "";
      }
      window.location.href = `/.auth/login/${provider}?post_login_redirect_uri=${encodeURIComponent(returnUrl.toString())}`;
    }} />;
  }
  if (!data) return <ErrorScreen error={error} onRetry={() => { setLoading(true); void refresh(); }} />;
  if (!data.user.clubId && !isGlobalAdmin) {
    return localize((
      <main className="onboarding">
        <header className="onboarding-head"><Brand /><LanguageSelect /><button className="profile-button" onClick={logout}><LogOut size={16} /> Sign out</button></header>
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
          <div className="profile-note"><span>Signed in as {data.user.email}</span><ProfileEditor name={data.user.name} email={data.user.email} saving={saving} onSave={(name) => act(() => api("users/me/profile", { method: "PATCH", body: JSON.stringify({ name }) }), "Display name updated.")} /></div>
        </div>
        <p className="onboarding-foot">MADE FOR THE LOVE OF HANDBALL <span>·</span> {new Date().getFullYear()}</p>
        {message && <Toast message={message} />}
      </main>
    ));
  }

  return localize((
    <div className="app-shell">
      {mobileOpen && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Brand /><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="club-switcher">
          <div className="club-avatar">{club?.name.slice(0, 1) || "H"}</div>
          <div className="club-switcher-copy"><strong data-no-translate={Boolean(club)}>{club?.name || "Global workspace"}</strong><span>{club ? "Club workspace" : "Global admin"}</span></div>
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
          <a className="sidebar-help" href="https://github.com/gurrish/handbollsbanken/issues/new" target="_blank" rel="noopener noreferrer"><div className="help-icon"><CircleHelp size={18} /></div><div><strong>Experience issues?</strong><span>Report a bug</span></div><ArrowUpRight size={15} /></a>
          <div className="user-profile">
            <div className="user-avatar">{data.user.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><strong data-no-translate>{data.user.name}</strong><span>{data.user.roles.map((role) => roleLabel[role]).join(", ")}</span><ProfileEditor name={data.user.name} email={data.user.email} saving={saving} onSave={(name) => act(() => api("users/me/profile", { method: "PATCH", body: JSON.stringify({ name }) }), "Display name updated.")} /></div>
            <button className="logout-icon" aria-label="Sign out" onClick={(event) => { event.stopPropagation(); logout(); }}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <LanguageSelect />
            <span className="today-label">{new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span>
            <div className="topbar-avatar">{data.user.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="page-content">
          {error && <ErrorBanner message={error} onClose={() => setError("")} />}
          {sharedTrainingId ? <TrainingDetailPage
            plan={sharedTraining}
            data={data}
            exerciseById={exerciseById}
            canEdit={canEdit}
            saving={saving}
            startEditing={editingTrainingId === sharedTrainingId}
            onBack={() => { clearSharedLink(); setPage("planner"); }}
            onShare={() => { if (sharedTraining) void copyTrainingLink(sharedTraining.id); }}
            onSave={async (value) => {
              if (!sharedTraining || !("teamId" in value)) return false;
              return act(() => savePlan(value, sharedTraining.id), "Session updated.");
            }}
          /> : sharedTemplateId ? <TrainingDetailPage
            template={sharedTemplate}
            data={data}
            exerciseById={exerciseById}
            canEdit={canEdit}
            saving={saving}
            startEditing={editingTrainingId === sharedTemplateId}
            onBack={() => { clearSharedLink(); setPage("planner"); }}
            onSchedule={() => { if (sharedTemplate) setScheduleTemplate(sharedTemplate); }}
            onSave={async (value) => {
              if (!sharedTemplate || "teamId" in value) return false;
              return act(() => saveTemplate(value, sharedTemplate.id), "Template updated.");
            }}
          /> : sharedExerciseId ? <ExerciseDetailPage
            exercise={sharedExercise}
            canEdit={canEdit}
            onBack={() => { clearSharedLink(); setPage("library"); }}
            onShare={() => { if (sharedExercise) void copyExerciseLink(sharedExercise.id); }}
            onEdit={() => { if (sharedExercise) setExerciseModal(sharedExercise); }}
            onSaveDiagram={async (diagramJson) => {
              if (!sharedExercise) return;
              await saveExercise({ ...sharedExercise, diagramJson }, sharedExercise.id);
              await refresh();
              setMessage("Diagram saved to exercise.");
            }}
          /> : !sharedTrainingId && !sharedTemplateId && !sharedExerciseId && page === "overview" && <Overview data={data} clubName={club?.name || "your club"} onNavigate={changePage} />}
          {!sharedTrainingId && !sharedTemplateId && !sharedExerciseId && page === "library" && <LibraryPage
            exercises={filteredExercises} total={data.exercises.length} query={query} setQuery={setQuery}
            ageFilter={ageFilter} setAgeFilter={setAgeFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            complexityFilter={complexityFilter} setComplexityFilter={setComplexityFilter} canEdit={canEdit}
            onCreate={() => setExerciseModal(null)} onOpen={openExercise} onEdit={(exercise) => setExerciseModal(exercise)}
            onDelete={(exercise) => { if (window.confirm(translateText(`Delete “${exercise.title}”? This cannot be undone.`))) void act(() => api(`exercises/${exercise.id}`, { method: "DELETE" }), "Exercise deleted."); }}
          />}
          {!sharedTrainingId && !sharedTemplateId && !sharedExerciseId && page === "planner" && <PlannerPage data={data} exerciseById={exerciseById} canEdit={canEdit} saving={saving} onTeamsChange={(teamIds) => act(() => api("users/me/teams", { method: "PATCH", body: JSON.stringify({ teamIds }) }), "Team preferences saved.")} onCreate={() => setPlanModal(null)} onCreateTemplate={() => setTemplateModal(null)} onEdit={(plan) => openTraining(plan.id, true)} onOpen={openTraining} onShare={(id) => void copyTrainingLink(id)} onSchedule={(template) => setScheduleTemplate(template)} onOpenTemplate={openTemplate} onEditTemplate={(template) => openTemplate(template.id, true)} onDeleteTemplate={(template) => { if (window.confirm(translateText(`Delete “${template.title}”?`))) void act(() => api(`templates/${template.id}`, { method: "DELETE" }), "Template deleted."); }} onDelete={(plan) => { if (window.confirm(translateText(`Delete “${plan.title}”?`))) void act(() => api(`plans/${plan.id}`, { method: "DELETE" }), "Session deleted."); }} />}
          {!sharedTrainingId && !sharedTemplateId && !sharedExerciseId && page === "admin" && <AdminPage data={data} isGlobalAdmin={isGlobalAdmin} saving={saving} onCreateClub={() => void act(() => api("clubs", { method: "POST", body: JSON.stringify({ name: clubName }) }), "Club created.")} onRenameClub={(club) => { const name = window.prompt(translateText("Rename club"), club.name)?.trim(); if (name && name !== club.name) void act(() => api(`clubs/${club.id}`, { method: "PUT", body: JSON.stringify({ name }) }), "Club name updated."); }} onClubName={setClubName} clubName={clubName} onCreateTeam={() => void act(() => api("teams", { method: "POST", body: JSON.stringify({ name: teamName, ageGroup: teamAge }) }), "Team created.")} onEditTeam={(team) => setTeamModal(team)} onTeamName={setTeamName} teamName={teamName} teamAge={teamAge} onTeamAge={setTeamAge} onDecision={(request, status) => void act(() => api(`join-requests/${request.id}`, { method: "PATCH", body: JSON.stringify({ status }) }), status === "approved" ? "Coach approved." : "Request declined.")} onRoleChange={(userId, role) => void act(() => api(`users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }), "Role updated.")} />}
        </div>
      </main>
      {exerciseModal !== false && <ExerciseForm exercise={exerciseModal || undefined} canEdit={canEdit} saving={saving} onClose={() => setExerciseModal(false)} onSave={async (value) => {
        if (await act(() => saveExercise(value, exerciseModal?.id), exerciseModal ? "Exercise updated." : "Exercise added.")) setExerciseModal(false);
      }} />}
      {planModal !== false && <PlanForm plan={planModal || undefined} teams={data.teams} exercises={data.exercises} saving={saving} onClose={() => setPlanModal(false)} onSave={async (value) => {
        if ("teamId" in value && "date" in value && await act(() => savePlan(value, planModal?.id), planModal ? "Session updated." : "Training session saved.")) setPlanModal(false);
      }} />}
      {templateModal !== false && <PlanForm mode="template" template={templateModal || undefined} teams={data.teams} exercises={data.exercises} saving={saving} onClose={() => setTemplateModal(false)} onSave={async (value) => {
        if (!("teamId" in value) && await act(() => saveTemplate(value, templateModal?.id), templateModal ? "Template updated." : "Template created.")) setTemplateModal(false);
      }} />}
      {scheduleTemplate && <ScheduleTemplateForm template={scheduleTemplate} teams={data.teams} saving={saving} onClose={() => setScheduleTemplate(false)} onSave={async ({ teamId, date }) => {
        const { id: _id, clubId: _clubId, ageGroup: _ageGroup, ...content } = scheduleTemplate;
        if (await act(() => savePlan({ ...content, teamId, date }), "Training session saved.")) setScheduleTemplate(false);
      }} />}
      {teamModal !== false && <TeamForm team={teamModal} saving={saving} onClose={() => setTeamModal(false)} onSave={async (value) => {
        const saved = await act(() => api(`teams/${teamModal.id}`, { method: "PUT", body: JSON.stringify(value) }), "Team updated.");
        if (saved) setTeamModal(false);
        return saved;
      }} />}
      {message && <Toast message={message} />}
    </div>
  ));
}

function Brand() {
  return localize(<div className="brand"><div className="brand-mark"><span>H</span><i /></div><div className="brand-word">handboll<span>sbänken</span><small>THE COACH’S CORNER</small></div></div>);
}

function SignInPage({ onLogin }: { onLogin: (provider: "aad") => void }) {
  return localize(<main className="sign-in">
    <div className="sign-in-language"><LanguageSelect /></div>
    <div className="sign-in-art"><div className="sign-in-brand"><Brand /></div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-ball"><span /></div><div className="art-copy"><span>THE COURT IS YOURS</span><h1>Good sessions<br />start with a<br /><em>good plan.</em></h1><p>One home for your team’s drills, ideas and training plans.</p><div className="art-foot"><span>01 — PLAN</span><span>02 — PRACTICE</span><span>03 — PLAY</span></div></div></div>
    <div className="sign-in-panel"><div className="sign-in-mobile-brand"><Brand /></div><div className="sign-in-box"><div className="welcome-dot"><Sparkles size={16} /></div><p className="eyebrow">WELCOME TO HANDBOLLSBÄNKEN</p><h2>Make every practice<br />a little better.</h2><p className="sign-in-subtitle">Sign in with your account to plan, share and get your team on the same page.</p><div className="login-buttons"><Button className="login-button" variant="secondary" onClick={() => onLogin("aad")}><span className="microsoft-icon"><i /><i /><i /><i /></span>Continue with Microsoft</Button></div><p className="sign-in-terms">By signing in, you agree to keep your team’s training data within your club.</p></div><span className="sign-in-copyright">© {new Date().getFullYear()} Handbollsbanken · Built for the love of the game</span></div>
  </main>);
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return localize(<main className="error-screen"><div className="error-card"><div className="loading-mark">H</div><h2>We couldn’t load your workspace</h2><p>{error || "Check your connection and try again."}</p><Button onClick={onRetry}>Try again</Button></div></main>);
}
function ErrorBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return localize(<div className="error-banner"><span>{message}</span>{onClose && <button onClick={onClose} aria-label="Dismiss"><X size={16} /></button>}</div>);
}
function Toast({ message }: { message: string }) { return localize(<div className="toast"><Check size={16} />{message}</div>); }

function ProfileEditor({ name, email, saving, onSave }: { name: string; email: string; saving: boolean; onSave: (name: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  return localize(<>
    <button className="profile-edit" type="button" onClick={() => { setDisplayName(name); setOpen(true); }}><Pencil size={12} /> Edit display name</button>
    {open && <Modal title="Edit display name" onClose={() => setOpen(false)}>
      <form className="modal-form" onSubmit={async (event) => {
        event.preventDefault();
        if (await onSave(displayName.trim())) setOpen(false);
      }}>
        <p className="modal-lead">Choose the name other club members will see. Your sign-in email will not change.</p>
        <Field label="Display name"><Input autoFocus required minLength={2} maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
        <Field label="Sign-in email"><Input value={email} readOnly /></Field>
        <div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || displayName.trim().length < 2}>{saving ? "Saving…" : "Save display name"}</Button></div>
      </form>
    </Modal>}
  </>);
}

function Overview({ data, clubName, onNavigate }: { data: Bootstrap; clubName: string; onNavigate: (page: Page) => void }) {
  const upcoming = [...data.plans].filter((plan) => plan.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const pending = data.requests.filter((item) => item.status === "pending").length;
  return localize(<div className="overview-page">
    <div className="welcome-banner"><div className="welcome-content"><div className="eyebrow"><Sparkles size={14} /> YOUR COACHING SPACE</div><h1>Good to see you, <span data-no-translate>{data.user.name.split(" ")[0]}</span><span className="wave">✳</span></h1><p>A fresh week is a good time to get your team moving.</p><Button onClick={() => onNavigate("planner")}><Plus size={16} /> Plan a session</Button></div><div className="welcome-art"><div className="welcome-court"><div className="court-line court-middle" /><div className="court-circle" /><div className="court-ball">H</div><span className="court-player player-one" /><span className="court-player player-two" /><span className="court-player player-three" /></div><div className="art-spark spark-a">✳</div><div className="art-spark spark-b">✦</div></div></div>
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
        <Card className="quick-card"><div className="quick-heading"><span className="section-kicker">QUICK START</span><h3>What are we working on?</h3><p>Jump straight into the good stuff.</p></div><button className="quick-link" onClick={() => onNavigate("library")}><div className="quick-icon quick-blue"><Library size={18} /></div><span><strong>Find an exercise</strong><small>Explore your club’s library</small></span><ArrowUpRight size={16} /></button></Card>
        <Card className="coach-tip"><div className="tip-graphic"><Sparkles size={18} /></div><div><span className="section-kicker">A LITTLE REMINDER</span><p>“Great teams are built one good repetition at a time.”</p><span className="tip-byline">Take it one drill at a time.</span></div></Card>
        {pending > 0 && <button className="pending-banner" onClick={() => onNavigate("admin")}><div className="pending-badge">{pending}</div><span><strong>{pending > 1 ? "Coach requests to review" : "Coach request to review"}</strong><small>Your club is waiting on you</small></span><ArrowUpRight size={16} /></button>}
      </div>
    </div>
  </div>);
}
function StatCard({ icon: Icon, tone, value, label, detail }: { icon: typeof CalendarDays; tone: string; value: string; label: string; detail: string }) {
  return localize(<Card className="stat-card"><div className={`stat-icon stat-${tone}`}><Icon size={18} /></div><strong className="stat-value">{value}</strong><span className="stat-label">{label}</span><span className="stat-detail">{detail}</span></Card>);
}
function SessionRow({ plan, data }: { plan: TrainingPlan; data: Bootstrap }) {
  const { locale } = useLocale();
  const team = data.teams.find((item) => item.id === plan.teamId);
  return localize(<div className="session-row"><div className="date-tile"><strong>{new Date(`${plan.date.slice(0, 10)}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", { month: "short" }).format(new Date(`${plan.date.slice(0, 10)}T12:00:00`))}</span></div><div className="session-main"><strong data-no-translate>{plan.title}</strong><span><span data-no-translate={Boolean(team)}>{team?.name || "Team"}</span> · {plan.exerciseIds.length} exercises</span></div><span className="session-duration"><Clock3 size={14} />{plan.duration} min</span><ArrowUpRight size={16} className="session-arrow" /></div>);
}
function EmptyState({ icon: Icon, title, text, action, onClick }: { icon: typeof CalendarDays; title: string; text: string; action: string; onClick: () => void }) {
  return localize(<div className="empty-state"><div className="empty-icon"><Icon size={21} /></div><h4>{title}</h4><p>{text}</p><Button variant="secondary" onClick={onClick}><Plus size={15} />{action}</Button></div>);
}

function LibraryPage(props: {
  exercises: Exercise[]; total: number; query: string; setQuery: (value: string) => void;
  ageFilter: string; setAgeFilter: (value: string) => void; categoryFilter: string; setCategoryFilter: (value: string) => void;
  complexityFilter: string; setComplexityFilter: (value: string) => void; canEdit: boolean;
  onCreate: () => void; onOpen: (id: string) => void; onEdit: (exercise: Exercise) => void; onDelete: (exercise: Exercise) => void;
}) {
  const ages = [...new Set(props.exercises.map((exercise) => exercise.ageGroup))];
  const categories = [...new Set([...demoCategories, ...props.exercises.map((exercise) => exercise.category)])];
  return localize(<div className="content-page">
    <div className="page-intro"><div><span className="section-kicker">THE CLUB PLAYBOOK</span><h1>Exercise library<span className="title-count">{props.total}</span></h1><p>Good ideas are worth keeping. Find a drill, make it yours, and get the team moving.</p></div>{props.canEdit && <Button onClick={props.onCreate}><Plus size={16} /> Add exercise</Button>}</div>
    <Card className="library-toolbar"><div className="search-box"><Search size={17} /><Input placeholder="Search exercises, skills or tags…" value={props.query} onChange={(event) => props.setQuery(event.target.value)} /></div><div className="filter-label"><Filter size={14} />FILTER BY</div>
      <Select aria-label="Filter by age group" value={props.ageFilter} onChange={(event) => props.setAgeFilter(event.target.value)}><option>All ages</option>{ages.map((value) => <option key={value}>{value}</option>)}</Select>
      <Select aria-label="Filter by category" value={props.categoryFilter} onChange={(event) => props.setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</Select>
      <Select aria-label="Filter by complexity" value={props.complexityFilter} onChange={(event) => props.setComplexityFilter(event.target.value)}><option>All levels</option>{["Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</Select>
    </Card>
    {props.exercises.length ? <div className="exercise-grid">{props.exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} canEdit={props.canEdit} onOpen={() => props.onOpen(exercise.id)} onEdit={() => props.onEdit(exercise)} onDelete={() => props.onDelete(exercise)} />)}</div> : <Card><EmptyState icon={Library} title={props.total ? "No drills match those filters" : "Start your club’s playbook"} text={props.total ? "Try widening your search or filters." : "Add your first exercise so coaches can build it into a session."} action={props.total ? "Clear filters" : "Add an exercise"} onClick={props.total ? () => { props.setQuery(""); props.setAgeFilter("All ages"); props.setCategoryFilter("All categories"); props.setComplexityFilter("All levels"); } : props.onCreate} /></Card>}
    <div className="results-note">SHOWING {props.exercises.length} OF {props.total} EXERCISES <span>·</span> SHARED WITH YOUR CLUB</div>
  </div>);
}
function ExerciseCard({ exercise, canEdit, onOpen, onEdit, onDelete }: { exercise: Exercise; canEdit: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  return localize(<Card className="exercise-card"><div className="exercise-card-body"><div className="exercise-meta"><Badge>{exercise.ageGroup}</Badge><span className={`complexity-dot complexity-${exercise.complexity.toLowerCase()}`} /> <span>{exercise.complexity}</span><span className="exercise-category">{exercise.category}</span></div><h3 data-no-translate>{exercise.title}</h3><p data-no-translate={Boolean(exercise.description)}>{exercise.description || "A club drill, ready to take to the court."}</p><div className="exercise-tags">{exercise.tags.slice(0, 3).map((tag) => <span key={tag} data-no-translate>#{tag}</span>)}</div><div className="exercise-card-foot card-actions"><Button onClick={onOpen} variant="secondary" className="exercise-open">View exercise <ArrowUpRight size={15} /></Button>{canEdit && <div className="exercise-actions"><Button variant="ghost" onClick={onEdit}>Edit</Button><Button variant="ghost" onClick={onDelete}>Delete</Button></div>}</div></div></Card>);
}

function ExerciseForm({ exercise, canEdit, saving, onClose, onSave }: { exercise?: Exercise; canEdit: boolean; saving: boolean; onClose: () => void; onSave: (data: Omit<Exercise, "id" | "clubId" | "createdBy">) => Promise<void> }) {
  const [title, setTitle] = useState(exercise?.title || "");
  const [description, setDescription] = useState(exercise?.description || "");
  const [ageGroup, setAgeGroup] = useState(exercise?.ageGroup || "U14");
  const [category, setCategory] = useState(exercise?.category || "Passing");
  const [complexity, setComplexity] = useState(exercise?.complexity || "Intermediate");
  const [tags, setTags] = useState(exercise?.tags.join(", ") || "");
  return localize(<Modal title={!canEdit ? "Exercise details" : exercise ? "Edit exercise" : "Add an exercise"} onClose={onClose} wide><form className="modal-form" onSubmit={(event) => {
    event.preventDefault();
    if (!canEdit) return;
    void onSave({ title, description, ageGroup, category, complexity, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), diagramJson: exercise?.diagramJson || "[]" });
  }}><p className="modal-lead">{canEdit ? "Build a drill your whole club can put to use." : "A drill shared with your club."}</p><Field label="Exercise name"><Input autoFocus required minLength={2} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Three-lane passing" disabled={!canEdit} /></Field><Field label="What’s the idea?"><Textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the setup, movement and coaching points…" disabled={!canEdit} /></Field><div className="form-row"><Field label="Age group"><Select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)} disabled={!canEdit}>{ageGroups.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}<option>All ages</option></Select></Field><Field label="Category"><Select value={category} onChange={(event) => setCategory(event.target.value)} disabled={!canEdit}>{demoCategories.map((value) => <option key={value}>{value}</option>)}</Select></Field></div><div className="form-row"><Field label="Complexity"><Select value={complexity} onChange={(event) => setComplexity(event.target.value)} disabled={!canEdit}>{["Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Tags" hint="Separate tags with commas"><Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="e.g. passing, speed" disabled={!canEdit} /></Field></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>{canEdit ? "Cancel" : "Close"}</Button>{canEdit && <Button type="submit" disabled={saving}>{saving ? "Saving…" : exercise ? "Save changes" : "Add to library"} <ArrowUpRight size={15} /></Button>}</div></form></Modal>);
}

function ExerciseDetailPage({ exercise, canEdit, onBack, onShare, onEdit, onSaveDiagram }: {
  exercise?: Exercise; canEdit: boolean; onBack: () => void; onShare: () => void; onEdit: () => void;
  onSaveDiagram: (diagramJson: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return localize(<div className="content-page exercise-detail">
    <div className="page-intro exercise-detail-heading">
      <div><span className="section-kicker">SHARED EXERCISE · CLUB MEMBERS</span><h1 data-no-translate={Boolean(exercise)}>{exercise?.title || "Exercise unavailable"}</h1><p>{exercise ? `${exercise.category} · ${exercise.ageGroup} · ${exercise.complexity}` : "This exercise may have been removed, or you may not have access to its club."}</p></div>
      <div className="training-detail-actions exercise-detail-controls"><Button variant="secondary" onClick={onBack}><ArrowLeft size={15} /> Exercise library</Button>{exercise && <>{canEdit && <Button variant="secondary" onClick={onEdit}><Pencil size={15} /> Edit details</Button>}<Button variant="secondary" onClick={onShare}><Copy size={15} /> Copy link</Button><Button onClick={() => window.print()}><Printer size={15} /> Export PDF</Button></>}</div>
    </div>
    {exercise && <div className="exercise-print-content">
      <Card className="exercise-detail-card">
        <div className="exercise-detail-meta"><Badge>{exercise.ageGroup}</Badge><Badge tone="green">{exercise.complexity}</Badge><span>{exercise.category}</span></div>
        <h2 data-no-translate>{exercise.title}</h2>
        <p className="exercise-detail-description" data-no-translate>{exercise.description || "A club drill, ready to take to the court."}</p>
        {exercise.tags.length > 0 && <div className="exercise-tags">{exercise.tags.map((tag) => <span key={tag} data-no-translate>#{tag}</span>)}</div>}
      </Card>
      <Card className="diagram-card exercise-diagram-card">
        <div className="diagram-titlebar"><div><div className="diagram-eyebrow"><span className="green-pip" /> COURT SKETCH <span>·</span> SAVES WITH EXERCISE</div><h2>Exercise diagram</h2></div></div>
        {!canEdit && <p className="read-only-note">You have view-only access to diagrams.</p>}
        {error && <ErrorBanner message={error} onClose={() => setError("")} />}
        <div className={!canEdit ? "diagram-readonly" : ""}><DiagramEditor key={exercise.id} value={exercise.diagramJson} onSave={async (value) => {
          if (!canEdit) return;
          setSaving(true);
          setError("");
          try {
            await onSaveDiagram(value);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Diagram could not be saved.");
          } finally {
            setSaving(false);
          }
        }} /></div>
        {saving && <div className="saving-indicator"><span className="status-dot" />Saving your diagram…</div>}
        <div className="diagram-legend"><span><i className="legend-player" /> Player</span><span><i className="legend-gk" /> Goalkeeper</span><span><i className="legend-pass" /> Pass</span><span><i className="legend-move" /> Movement</span></div>
      </Card>
    </div>}
    {exercise && <p className="training-sharing-note">This link is for signed-in members with access to this club. It won’t make the exercise public.</p>}
  </div>);
}

function TrainingDetailPage({ plan, template, data, exerciseById, canEdit, saving, startEditing, onBack, onShare, onSchedule, onSave }: { plan?: TrainingPlan; template?: TrainingTemplate; data: Bootstrap; exerciseById: Map<string, Exercise>; canEdit: boolean; saving: boolean; startEditing: boolean; onBack: () => void; onShare?: () => void; onSchedule?: () => void; onSave: (value: PlanFormValue) => Promise<boolean> }) {
  const { locale } = useLocale();
  const [editing, setEditing] = useState(startEditing);
  useEffect(() => setEditing(startEditing), [startEditing]);
  const training = plan || template;
  const team = plan && data.teams.find((item) => item.id === plan.teamId);
  const exercises = training?.exerciseIds.map((id) => ({
    id,
    exercise: exerciseById.get(id),
    custom: training.customExercises?.find((item) => item.id === id),
  })) || [];
  return localize(<div className="content-page training-detail">
    <div className="page-intro">
      <div><span className="section-kicker">{template ? "TRAINING TEMPLATE" : "SHARED TRAINING · CLUB MEMBERS"}</span><h1>{training?.title || "Training unavailable"}</h1><p>{plan ? `${dateLabel(plan.date, undefined, locale)} · ${team?.name || "Team"} · ${plan.duration} min` : template ? `Training template · ${template.duration} min` : "This training may have been removed, or you may not have access to its club."}</p></div>
      <div className="training-detail-actions training-detail-controls"><Button variant="secondary" onClick={onBack}><ArrowLeft size={15} />{template ? "Training templates" : "Training planner"}</Button>{training && <>{canEdit && <Button variant="secondary" onClick={() => setEditing((value) => !value)}><Pencil size={15} />{editing ? "Cancel edit" : template ? "Edit template" : "Edit training"}</Button>}{template && canEdit && <Button onClick={onSchedule}><CalendarDays size={14} /> Add to calendar</Button>}{onShare && <Button variant="secondary" onClick={onShare}><Copy size={15} /> Copy link</Button>}<Button onClick={() => window.print()}><Printer size={15} /> Export PDF</Button></>}</div>
    </div>
    {training && (editing && canEdit
      ? <PlanForm mode={template ? "template" : "plan"} inline plan={plan} template={template} teams={data.teams} exercises={data.exercises} saving={saving} onClose={() => setEditing(false)} onSave={async (value) => {
        if (await onSave(value)) setEditing(false);
      }} />
      : <div className="training-print-content">
        <Card className="training-detail-card">
          <div className="training-detail-meta">{plan && <><Badge>{team?.ageGroup || "Team"}</Badge><span data-no-translate={Boolean(team)}>{team?.name || "Team"}</span><span><CalendarDays size={14} />{dateLabel(plan.date, undefined, locale)}</span></>}{template && <Badge tone={template.ageGroup ? "blue" : "amber"}>{template.ageGroup || "Age group needed"}</Badge>}<span><Clock3 size={14} />{training.duration} min</span></div>
          <PlanTimeline plan={training} exerciseById={exerciseById} />
          {training.notes && <div className="training-coach-notes"><span className="section-kicker">COACH’S NOTES</span><p data-no-translate>{training.notes}</p></div>}
        </Card>
        <div className="training-exercises">
          <div className="section-heading"><div><span className="section-kicker">SESSION FLOW</span><h2>{exercises.length} exercises</h2></div></div>
          {exercises.length ? exercises.map(({ id, exercise, custom }, index) => <Card className="training-exercise" key={id}><span className="order-index">{String(index + 1).padStart(2, "0")}</span><div className="training-exercise-copy"><strong data-no-translate>{exercise?.title || custom?.title || "Exercise"}</strong><p data-no-translate>{exercise?.description || (custom ? "Free-text exercise." : "No exercise notes.")}</p>{exercise && <div className="exercise-tags">{exercise.tags.map((tag) => <span key={tag} data-no-translate>#{tag}</span>)}</div>}{hasDiagram(exercise) && <div className="training-exercise-diagram"><DiagramEditor key={`${id}-diagram`} value={exercise.diagramJson} readOnly /></div>}</div><Badge>{exerciseMinutes(training, id, index)} min</Badge></Card>) : <Card className="training-exercise"><p>This session has no exercises yet.</p></Card>}
        </div>
        {plan && <p className="training-sharing-note">This link is for signed-in members with access to this club. It won’t make the training public.</p>}
      </div>)}
  </div>);
}

function PlannerPage({ data, exerciseById, canEdit, saving, onTeamsChange, onCreate, onCreateTemplate, onEdit, onOpen, onShare, onSchedule, onOpenTemplate, onEditTemplate, onDeleteTemplate, onDelete }: { data: Bootstrap; exerciseById: Map<string, Exercise>; canEdit: boolean; saving: boolean; onTeamsChange: (teamIds: string[]) => Promise<boolean>; onCreate: () => void; onCreateTemplate: () => void; onEdit: (plan: TrainingPlan) => void; onOpen: (id: string) => void; onShare: (id: string) => void; onSchedule: (template: TrainingTemplate) => void; onOpenTemplate: (id: string, edit?: boolean) => void; onEditTemplate: (template: TrainingTemplate) => void; onDeleteTemplate: (template: TrainingTemplate) => void; onDelete: (plan: TrainingPlan) => void }) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => data.user.interestedTeamIds ?? data.teams.map((team) => team.id));
  useEffect(() => {
    setSelectedTeamIds(data.user.interestedTeamIds ?? data.teams.map((team) => team.id));
  }, [data.user.interestedTeamIds, data.teams]);
  const sorted = [...data.plans]
    .filter((plan) => selectedTeamIds.includes(plan.teamId))
    .sort((a, b) => a.date.localeCompare(b.date));
  const selectedAgeGroups = new Set(data.teams.filter((team) => selectedTeamIds.includes(team.id)).map((team) => team.ageGroup));
  const visibleTemplates = data.templates.filter((template) => {
    if (!template.ageGroup) return canEdit;
    const ageGroup = template.ageGroup;
    return ageGroup === "All ages" || selectedAgeGroups.has(ageGroup);
  });
  return localize(<div className="content-page">
    <div className="page-intro"><div><span className="section-kicker">MAKE TIME FOR THE GOOD STUFF</span><h1>Training planner</h1><p>Build a practice that flows — from first whistle to final stretch.</p></div>{canEdit && <div className="planner-actions"><Button variant="secondary" onClick={onCreateTemplate}><Plus size={16} /> Create training template</Button><Button onClick={onCreate}><Plus size={16} /> Plan a session</Button></div>}</div>
    <Card className="team-filter">
      <div><strong>Teams I’m interested in</strong><span>Only trainings for selected teams are shown.</span></div>
      <div className="team-filter-options">{data.teams.map((team) => <label key={team.id}><input type="checkbox" checked={selectedTeamIds.includes(team.id)} onChange={(event) => setSelectedTeamIds((current) => event.target.checked ? [...current, team.id] : current.filter((id) => id !== team.id))} /><span data-no-translate>{team.name}</span><small>{team.ageGroup}</small></label>)}</div>
      <Button variant="secondary" disabled={saving || !data.teams.length || (data.user.interestedTeamIds ?? data.teams.map((team) => team.id)).join("|") === selectedTeamIds.join("|")} onClick={() => void onTeamsChange(selectedTeamIds)}>{saving ? "Saving…" : "Save team selection"}</Button>
    </Card>
    {data.templates.length > 0 && <section className="template-section"><div className="section-heading"><div><span className="section-kicker">READY-TO-USE PRACTICES</span><h2>Training templates</h2></div><span className="muted-small">For selected teams</span></div>{visibleTemplates.length ? <div className="template-list">{visibleTemplates.map((template) => <TemplateCard key={template.id} template={template} exerciseById={exerciseById} canEdit={canEdit} onOpen={() => onOpenTemplate(template.id)} onSchedule={() => onSchedule(template)} onEdit={() => onEditTemplate(template)} onDelete={() => onDeleteTemplate(template)} />)}</div> : <Card className="template-empty"><p>No training templates match the selected teams’ age groups.</p></Card>}</section>}
    <div className="planner-summary"><div><div className="summary-icon"><CalendarDays size={18} /></div><span><strong>{sorted.length} sessions</strong><small>for selected teams</small></span></div><div><div className="summary-icon green-summary"><Clock3 size={18} /></div><span><strong>{sorted.reduce((total, plan) => total + plan.duration, 0)} min</strong><small>court time scheduled</small></span></div><div><div className="summary-icon peach-summary"><Users size={18} /></div><span><strong>{selectedTeamIds.length} teams</strong><small>selected</small></span></div></div>
    {sorted.length ? <div className="plan-list">{sorted.map((plan, index) => <PlanCard key={plan.id} plan={plan} data={data} exerciseById={exerciseById} canEdit={canEdit} index={index} onEdit={() => onEdit(plan)} onOpen={() => onOpen(plan.id)} onShare={() => onShare(plan.id)} onDelete={() => onDelete(plan)} />)}</div> : <Card><EmptyState icon={CalendarDays} title={selectedTeamIds.length ? "No sessions on the calendar" : "No teams selected"} text={selectedTeamIds.length ? "Put together a practice and make the most of your court time." : "Select one or more teams above to see their planned trainings."} action={selectedTeamIds.length ? "Plan your first session" : "Choose teams"} onClick={selectedTeamIds.length ? onCreate : () => document.querySelector(".team-filter")?.scrollIntoView({ behavior: "smooth", block: "center" })} /></Card>}
  </div>);
}
function PlanCard({ plan, data, exerciseById, canEdit, index, onEdit, onOpen, onShare, onDelete }: { plan: TrainingPlan; data: Bootstrap; exerciseById: Map<string, Exercise>; canEdit: boolean; index: number; onEdit: () => void; onOpen: () => void; onShare: () => void; onDelete: () => void }) {
  const { locale } = useLocale();
  const team = data.teams.find((item) => item.id === plan.teamId);
  return localize(<Card className="plan-card"><div className="plan-date"><span>{dateLabel(plan.date, { month: "short" }, locale).toUpperCase()}</span><strong>{new Date(`${plan.date.slice(0, 10)}T12:00:00`).getDate()}</strong><small>{dateLabel(plan.date, { weekday: "short" }, locale)}</small></div><div className="plan-main"><div className="plan-heading"><div><div className="plan-teamline"><Badge tone={index % 2 ? "green" : "blue"}>{team?.ageGroup || "Team"}</Badge><span data-no-translate={Boolean(team)}>{team?.name || "Team"}</span></div><h3 data-no-translate>{plan.title}</h3></div><span className="plan-time"><Clock3 size={14} />{plan.duration} min</span></div><PlanTimeline plan={plan} exerciseById={exerciseById} />{plan.notes && <p className="plan-notes" data-no-translate>{plan.notes}</p>}</div><div className="plan-actions card-actions"><Button variant="secondary" onClick={onOpen}>Open</Button><Button variant="secondary" onClick={onShare}><Share2 size={14} /> Share</Button>{canEdit && <><Button variant="ghost" onClick={onEdit}>Edit</Button><Button variant="ghost" onClick={onDelete}>Delete</Button></>}</div></Card>);
}
function TemplateCard({ template, exerciseById, canEdit, onOpen, onSchedule, onEdit, onDelete }: { template: TrainingTemplate; exerciseById: Map<string, Exercise>; canEdit: boolean; onOpen: () => void; onSchedule: () => void; onEdit: () => void; onDelete: () => void }) {
  return localize(<Card className="template-card"><div className="template-card-heading"><strong data-no-translate>{template.title}</strong><div className="template-badges"><Badge tone={template.ageGroup ? "blue" : "amber"}>{template.ageGroup || "Age group needed"}</Badge><Badge tone="gray">{template.duration} min</Badge></div></div><PlanTimeline plan={template} exerciseById={exerciseById} /><div className="template-actions card-actions"><Button variant="secondary" onClick={onOpen}>Open</Button>{canEdit && <><Button onClick={onSchedule}><CalendarDays size={14} /> Add to calendar</Button><Button variant="ghost" onClick={onEdit}>Edit</Button><Button variant="ghost" onClick={onDelete}>Delete</Button></>}</div></Card>);
}
function PlanTimeline({ plan, exerciseById }: { plan: Pick<TrainingPlan, "exerciseIds" | "duration" | "exerciseDurations"> & { customExercises?: TrainingPlan["customExercises"] }; exerciseById: Map<string, Exercise> }) {
  let elapsed = 0;
  const segments = plan.exerciseIds.map((id, index) => {
    const start = elapsed;
    const duration = exerciseMinutes(plan, id, index);
    elapsed += duration;
    return { id, index, start, end: elapsed, duration, name: exerciseById.get(id)?.title || plan.customExercises?.find((item) => item.id === id)?.title || "Exercise" };
  });
  const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
  return localize(<div className="plan-timeline">
    <div className="timeline-bar">{segments.length ? segments.map((segment) => <span key={`${segment.id}-${segment.index}`} className={`timeline-segment timeline-tone-${segment.index % 4}`} style={{ width: `${segment.duration / plan.duration * 100}%` }} title={`${segment.name}: ${segment.duration} min`} />) : <span className="timeline-empty-segment" />}</div>
    {segments.length ? <div className="timeline-labels">{segments.map((segment) => <div className="timeline-label" key={`${segment.id}-${segment.index}`}><span>{clock(segment.start)}–{clock(segment.end)}</span><strong>{segment.name}</strong></div>)}</div> : <span className="timeline-empty-label">Add exercises to map out your session flow.</span>}
  </div>);
}
function exerciseMinutes(plan: Pick<TrainingPlan, "duration" | "exerciseIds" | "exerciseDurations"> | undefined, id: string, index: number) {
  if (!plan) return 0;
  const savedDuration = plan.exerciseDurations?.[id];
  if (savedDuration !== undefined) return savedDuration;
  const count = plan.exerciseIds.length;
  if (!count) return 0;
  return Math.floor(plan.duration / count) + (index < plan.duration % count ? 1 : 0);
}
function hasDiagram(exercise: Exercise | undefined): exercise is Exercise {
  if (!exercise) return false;
  try {
    const diagram: unknown = JSON.parse(exercise.diagramJson);
    return Array.isArray(diagram) && diagram.length > 0;
  } catch {
    return false;
  }
}
type PlanFormValue = Omit<TrainingPlan, "id" | "clubId"> | Omit<TrainingTemplate, "id" | "clubId">;
function PlanForm({ mode = "plan", plan, template, teams = [], exercises, saving, inline = false, onClose, onSave }: { mode?: "plan" | "template"; plan?: TrainingPlan; template?: TrainingTemplate; teams?: Bootstrap["teams"]; exercises: Exercise[]; saving: boolean; inline?: boolean; onClose: () => void; onSave: (value: PlanFormValue) => Promise<void> }) {
  const source = plan || template;
  const [title, setTitle] = useState(source?.title || "");
  const [ageGroup, setAgeGroup] = useState(template?.ageGroup || "");
  const [teamId, setTeamId] = useState(plan?.teamId || teams[0]?.id || "");
  const [date, setDate] = useState(plan?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(source?.duration || 90);
  const [notes, setNotes] = useState(source?.notes || "");
  const [exerciseIds, setExerciseIds] = useState<string[]>(source?.exerciseIds || []);
  const [customExercises, setCustomExercises] = useState(source?.customExercises || []);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [exerciseDurations, setExerciseDurations] = useState<Record<string, number>>(() => {
    if (source?.exerciseDurations) return source.exerciseDurations;
    const ids = source?.exerciseIds || [];
    return Object.fromEntries(ids.map((id, index) => [id, exerciseMinutes(source, id, index)]));
  });
  const availableAgeGroups = [...new Set([...ageGroups.map(({ value }) => value), ...teams.map((team) => team.ageGroup), ...(template?.ageGroup ? [template.ageGroup] : [])])];
  const sessionDuration = exerciseIds.length
    ? exerciseIds.reduce((total, id) => total + (exerciseDurations[id] || 0), 0)
    : duration;
  const ordered = exerciseIds.map((id) => {
    const exercise = exercises.find((item) => item.id === id);
    if (exercise) return { id, title: exercise.title, detail: `${exercise.category} · ${exercise.ageGroup}` };
    const custom = customExercises.find((item) => item.id === id);
    return custom ? { id, title: custom.title, detail: "Free-text exercise" } : null;
  }).filter((item): item is { id: string; title: string; detail: string } => item !== null);
  const addExercise = (id: string) => {
    if (!id || exerciseIds.includes(id) || exerciseIds.length >= 50) return;
    setExerciseIds((current) => [...current, id]);
    setExerciseDurations((current) => ({ ...current, [id]: 15 }));
    setExerciseSearch("");
  };
  const removeExercise = (id: string) => {
    setExerciseIds((current) => current.filter((item) => item !== id));
    setCustomExercises((current) => current.filter((item) => item.id !== id));
    setExerciseDurations((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  const move = (id: string, direction: -1 | 1) => setExerciseIds((current) => {
    const index = current.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const result = [...current]; [result[index], result[target]] = [result[target], result[index]]; return result;
  });
  const addCustomExercise = () => {
    const value = customTitle.trim();
    if (!value || value.length > 100 || exerciseIds.length >= 50) return;
    const id = `custom-${crypto.randomUUID()}`;
    setCustomExercises((current) => [...current, { id, title: value }]);
    setExerciseIds((current) => [...current, id]);
    setExerciseDurations((current) => ({ ...current, [id]: 15 }));
    setCustomTitle("");
  };
  const form = <form className={`modal-form ${inline ? "inline-plan-form" : ""}`} onSubmit={(event) => {
    event.preventDefault();
    const content = { title, duration: sessionDuration, exerciseIds, customExercises, exerciseDurations: exerciseIds.length ? exerciseDurations : undefined, notes };
    if (mode === "plan") void onSave({ ...content, teamId, date });
    else void onSave({ ...content, ageGroup });
  }}>
    <p className="modal-lead">{mode === "template" ? "Save a training template and schedule copies for any team and date." : "Build or adjust this session here, then save it to the calendar."}</p>
    <Field label="Session name"><Input required minLength={2} maxLength={100} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Fast breaks & finishing" /></Field>
    {mode === "plan" && <div className="form-row">
      <Field label="Team"><Select required value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choose team…</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.ageGroup}</option>)}</Select></Field>
      <Field label="Date"><Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></Field>
      <Field label="Total duration (minutes)"><Input type="number" min={15} max={300} step={5} required readOnly={exerciseIds.length > 0} value={sessionDuration} onChange={(event) => setDuration(Number(event.target.value))} /></Field>
    </div>}
    {mode === "template" && <><Field label="Age group"><Select required value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}><option value="">Choose an age group…</option>{availableAgeGroups.filter((value) => value !== "All ages").map((value) => <option key={value} value={value}>{ageGroups.find((item) => item.value === value)?.label || value}</option>)}<option>All ages</option></Select></Field><Field label="Total duration (minutes)"><Input type="number" min={15} max={300} step={5} required readOnly={exerciseIds.length > 0} value={sessionDuration} onChange={(event) => setDuration(Number(event.target.value))} /></Field></>}
    <div className="form-field">
      <label className="field-label" htmlFor="plan-exercise-search">Add exercise from library</label>
      <Input id="plan-exercise-search" type="search" value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder="Search exercises…" disabled={exerciseIds.length >= 50} />
      <Select id="plan-exercise-picker" value="" aria-label="Choose a matching exercise" disabled={exerciseIds.length >= 50 || exercises.every((exercise) => exerciseIds.includes(exercise.id))} onChange={(event) => addExercise(event.target.value)}>
        <option value="">{exercises.some((exercise) => !exerciseIds.includes(exercise.id)) ? "Choose an exercise…" : "All exercises added"}</option>
        {exercises.filter((exercise) => !exerciseIds.includes(exercise.id) && `${exercise.title} ${exercise.category} ${exercise.description} ${exercise.tags.join(" ")}`.toLowerCase().includes(exerciseSearch.trim().toLowerCase())).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title} · {exercise.category}</option>)}
      </Select>
    </div>
    <div className="form-field">
      <label className="field-label" htmlFor="custom-exercise-title">Add free-text exercise</label>
      <div className="custom-exercise-input"><Input id="custom-exercise-title" value={customTitle} maxLength={100} onChange={(event) => setCustomTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomExercise(); } }} placeholder="Type an exercise name" disabled={exerciseIds.length >= 50} /><Button type="button" variant="secondary" disabled={!customTitle.trim() || exerciseIds.length >= 50} onClick={addCustomExercise}><Plus size={15} /> Add text</Button></div>
    </div>
    {ordered.length > 0 && <div className="order-list">
      <span className="field-label">SESSION FLOW · SET DURATION AND REORDER</span>
      {ordered.map((exercise, index) => <div className="order-row" key={exercise.id}>
        <span className="order-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="order-exercise"><strong data-no-translate>{exercise.title}</strong><small>{exercise.detail}</small></span>
        <label className="exercise-minutes"><Input aria-label={`${exercise.title} duration in minutes`} type="number" min={1} max={300} required value={exerciseDurations[exercise.id] || ""} onChange={(event) => setExerciseDurations((current) => ({ ...current, [exercise.id]: Number(event.target.value) }))} /><span>min</span></label>
        <button type="button" disabled={index === 0} aria-label="Move exercise up" onClick={() => move(exercise.id, -1)}><ArrowUp size={15} /></button>
        <button type="button" disabled={index === ordered.length - 1} aria-label="Move exercise down" onClick={() => move(exercise.id, 1)}><ArrowDown size={15} /></button>
        <button type="button" aria-label={`Remove ${exercise.title}`} onClick={() => removeExercise(exercise.id)}><X size={15} /></button>
      </div>)}
      {(sessionDuration < 15 || sessionDuration > 300) && <p className="form-error">The total exercise time must be between 15 and 300 minutes.</p>}
    </div>}
    <Field label="Coach’s notes"><Textarea rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Focus points, equipment, or anything to remember…" /></Field>
    <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>{inline ? "Cancel edit" : "Cancel"}</Button><Button type="submit" disabled={saving || (mode === "plan" && !teams.length) || sessionDuration < 15 || sessionDuration > 300}>{saving ? "Saving…" : mode === "template" ? (template ? "Save template" : "Create template") : plan ? "Save changes" : "Save session"} <ArrowUpRight size={15} /></Button></div>
    {mode === "plan" && !teams.length && <p className="form-error">Ask a club admin to add a team before scheduling a session.</p>}
  </form>;
  return localize(inline ? <Card className="training-editor-card">{form}</Card> : <Modal title={mode === "template" ? (template ? "Edit training template" : "Create training template") : plan ? "Edit training session" : "Plan a session"} onClose={onClose} wide>{form}</Modal>);
}

function ScheduleTemplateForm({ template, teams, saving, onClose, onSave }: { template: TrainingTemplate; teams: Bootstrap["teams"]; saving: boolean; onClose: () => void; onSave: (value: { teamId: string; date: string }) => Promise<void> }) {
  const [teamId, setTeamId] = useState(teams[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return localize(<Modal title="Add training template to calendar" onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); void onSave({ teamId, date }); }}>
    <p className="modal-lead"><strong data-no-translate>{template.title}</strong> · {template.duration} min. This creates a scheduled copy; the training template stays unchanged.</p>
    <Field label="Team"><Select required value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Choose team…</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.ageGroup}</option>)}</Select></Field>
    <Field label="Date"><Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></Field>
    <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || !teams.length}>{saving ? "Saving…" : "Add to calendar"} <CalendarDays size={15} /></Button></div>
    {!teams.length && <p className="form-error">Ask a club admin to add a team before scheduling a session.</p>}
  </form></Modal>);
}

function TeamForm({ team, saving, onClose, onSave }: { team: Bootstrap["teams"][number]; saving: boolean; onClose: () => void; onSave: (value: { name: string; ageGroup: string }) => Promise<boolean> }) {
  const [name, setName] = useState(team.name);
  const [ageGroup, setAgeGroup] = useState(team.ageGroup);
  return localize(<Modal title="Edit team" onClose={onClose}>
    <form className="modal-form" onSubmit={async (event) => {
      event.preventDefault();
      await onSave({ name: name.trim(), ageGroup });
    }}>
      <Field label="Team name"><Input autoFocus required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Age group"><Select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>{ageGroups.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</Select></Field>
      <div className="modal-actions"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || name.trim().length < 2}>{saving ? "Saving…" : "Save team"}</Button></div>
    </form>
  </Modal>);
}

function AdminPage(props: {
  data: Bootstrap; isGlobalAdmin: boolean; saving: boolean; clubName: string; onClubName: (value: string) => void;
  onCreateClub: () => void; onRenameClub: (club: Bootstrap["clubs"][number]) => void;
  teamName: string; onTeamName: (value: string) => void; teamAge: string; onTeamAge: (value: string) => void;
  onCreateTeam: () => void; onEditTeam: (team: Bootstrap["teams"][number]) => void; onDecision: (request: Bootstrap["requests"][number], status: "approved" | "rejected") => void;
  onRoleChange: (userId: string, role: Role) => void;
}) {
  const { locale } = useLocale();
  const pending = props.data.requests.filter((request) => request.status === "pending");
  return localize(<div className="content-page"><div className="page-intro"><div><span className="section-kicker">KEEP YOUR CLUB IN GOOD SHAPE</span><h1>Club administration</h1><p>Welcome the right people in, keep your teams organised, and let the good sessions happen.</p></div><Badge tone="violet"><Shield size={12} />{props.isGlobalAdmin ? "Global admin" : "Club admin"}</Badge></div>
    {props.isGlobalAdmin && <Card className="admin-create-card"><div className="admin-card-intro"><div className="admin-icon global-admin-icon"><Shield size={18} /></div><div><h3>Your clubs</h3><p>Create and grow your club spaces.</p></div></div><form className="inline-create" onSubmit={(event) => { event.preventDefault(); if (props.clubName.trim()) props.onCreateClub(); }}><Input value={props.clubName} onChange={(event) => props.onClubName(event.target.value)} placeholder="New club name" required minLength={2} maxLength={100} /><Button disabled={props.saving}><Plus size={15} /> Add club</Button></form>{props.data.clubs.length > 0 && <div className="club-chips">{props.data.clubs.map((club) => <span key={club.id}><i /><strong data-no-translate>{club.name}</strong><button onClick={() => props.onRenameClub(club)} aria-label={`Rename ${club.name}`}>Rename</button></span>)}</div>}</Card>}
    <Card className="admin-section"><div className="card-heading"><div><span className="section-kicker">GOOD PEOPLE, GREAT TEAMS</span><h3>Membership requests <span className="inline-count">{pending.length}</span></h3></div></div>{pending.length ? <div className="request-list">{pending.map((request) => <div className="request-row" key={request.id}><div className="request-avatar">{request.userName.slice(0, 1).toUpperCase()}</div><div className="request-copy"><strong data-no-translate>{request.userName}</strong><span><span data-no-translate>{request.email}</span> · {props.data.clubs.find((club) => club.id === request.clubId)?.name || "Club"}</span></div><span className="request-date">{dateLabel(request.createdDate, undefined, locale)}</span><Button variant="secondary" onClick={() => props.onDecision(request, "rejected")}>Decline</Button><Button onClick={() => props.onDecision(request, "approved")}><Check size={14} /> Approve</Button></div>)}</div> : <div className="admin-empty"><div className="empty-icon"><Check size={20} /></div><div><strong>All caught up.</strong><span>There are no membership requests waiting for review.</span></div></div>}</Card>
    {!props.isGlobalAdmin && <Card className="admin-create-card"><div className="admin-card-intro"><div className="admin-icon"><Users size={18} /></div><div><h3>Your teams</h3><p>Keep the right group on the right plan.</p></div></div><form className="inline-create" onSubmit={(event) => { event.preventDefault(); if (props.teamName.trim()) props.onCreateTeam(); }}><Input value={props.teamName} onChange={(event) => props.onTeamName(event.target.value)} placeholder="Team name, e.g. Girls U14" required minLength={2} maxLength={80} /><Select value={props.teamAge} onChange={(event) => props.onTeamAge(event.target.value)}>{ageGroups.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</Select><Button disabled={props.saving}><Plus size={15} /> Add team</Button></form>{props.data.teams.length > 0 ? <div className="team-table">{props.data.teams.map((team) => <div key={team.id}><div className="team-dot" /><strong data-no-translate>{team.name}</strong><Badge>{team.ageGroup}</Badge><button className="team-edit" type="button" onClick={() => props.onEditTeam(team)}>Edit</button></div>)}</div> : <p className="empty-inline">Your first team can start here.</p>}</Card>}
    <Card className="admin-section"><div className="card-heading"><div><span className="section-kicker">THE PEOPLE BEHIND THE PLAYS</span><h3>Club members <span className="inline-count">{props.data.users.length}</span></h3></div></div>{props.data.users.length ? <div className="members-table"><div className="members-head"><span>MEMBER</span><span>STATUS</span><span>ROLE</span></div>        {props.data.users.map((user) => <div className="member-row" key={user.id}><div className="member-person"><div className="request-avatar">{user.name.slice(0, 1).toUpperCase()}</div><span><strong data-no-translate>{user.name}</strong><small data-no-translate>{user.email}</small></span></div><Badge tone={user.status === "approved" ? "green" : "amber"}>{user.status}</Badge>{user.roles.includes("GlobalAdmin") ? <Badge tone="violet">Global admin</Badge> : <Select disabled={!props.isGlobalAdmin && user.id === props.data.user.id} aria-label={`Role for ${user.name}`} value={user.roles[0]} onChange={(event) => props.onRoleChange(user.id, event.target.value as Role)}><option value="ClubAdmin">Club admin</option><option value="Coach">Coach</option><option value="Viewer">Viewer</option></Select>}</div>)}</div> : <div className="admin-empty"><div className="empty-icon"><Users size={20} /></div><div><strong>Your club’s circle will grow here.</strong><span>Approved coaches and viewers will show up in this list.</span></div></div>}</Card>
  </div>);
}
