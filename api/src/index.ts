import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { createHash, randomUUID } from "node:crypto";
import { clubInput, decisionInput, displayNameInput, exerciseInput, interestedTeamsInput, joinRequestInput, planInput, roleInput, teamInput, templateInput, type Club, type Exercise, type JoinRequest, type Role, type Team, type TrainingPlan, type TrainingTemplate, type User } from "./domain.js";
import { getRepository, type Repository } from "./repository.js";

interface Identity {
  id: string;
  name: string;
  email: string;
}
class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
function identity(request: HttpRequest): Identity {
  const encoded = request.headers.get("x-ms-client-principal");
  if (!encoded && process.env.DEV_AUTH === "true" && process.env.NODE_ENV !== "production") {
    const email = (request.headers.get("x-dev-user-email") || process.env.DEV_AUTH_EMAIL || "coach@local.test").trim().toLowerCase();
    const name = request.headers.get("x-dev-user-name") || (email === process.env.DEV_AUTH_EMAIL ? process.env.DEV_AUTH_NAME : undefined) || email.split("@")[0];
    return { id: `local-${createHash("sha256").update(email).digest("hex").slice(0, 24)}`, name, email };
  }
  if (!encoded) throw new HttpError(401, "Sign in to continue.");
  let principal: { userId?: string; userDetails?: string; claims?: { typ: string; val: string }[] };
  try {
    principal = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new HttpError(401, "Invalid sign-in session.");
  }
  const emailClaim = principal.claims?.find((claim) => /email|preferred_username/i.test(claim.typ))?.val;
  const email = (emailClaim || principal.userDetails || "").toLowerCase();
  if (!principal.userId || !email) throw new HttpError(401, "Your sign-in profile is missing an email address.");
  return { id: principal.userId, name: principal.userDetails || email, email };
}
function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
async function body<T>(request: HttpRequest, schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }): Promise<T> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, result.error?.issues.map((issue) => issue.message).join("; ") || "Invalid request.");
  return result.data as T;
}
async function getCurrentUser(repo: Repository, actor: Identity): Promise<User> {
  let user = await repo.get<User>("Users", "users", actor.id);
  if (!user) {
    const globalAdmins = (process.env.GLOBAL_ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
    user = {
      id: actor.id, name: actor.name, email: actor.email, clubId: null,
      roles: globalAdmins.includes(actor.email) ? ["GlobalAdmin"] : ["Viewer"], status: "pending",
    };
    await repo.upsert("Users", "users", user);
  } else if (user.email !== actor.email) {
    user = { ...user, email: actor.email };
    await repo.upsert("Users", "users", user);
  }
  return user;
}
async function seedDevelopmentData(repo: Repository): Promise<void> {
  if (process.env.DEV_SEED_DEMO_DATA !== "true" || process.env.STORAGE_MODE !== "memory" || process.env.NODE_ENV === "production") return;
  if ((await repo.list<Club>("Clubs")).length > 0) return;
  const clubId = "demo-club";
  const today = new Date();
  const sessionDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString().slice(0, 10);
  const club: Club = { id: clubId, name: "Lakeside Handball Club", createdDate: today.toISOString() };
  const team = { id: "demo-u14", clubId, name: "Girls U14", ageGroup: "U14" };
  const exercises: Exercise[] = [
    {
      id: "demo-fast-break", clubId, title: "Three-lane fast break",
      description: "Build speed through the middle lane, then finish wide. Reset quickly and rotate roles.",
      ageGroup: "U14", complexity: "Intermediate", category: "Attack", tags: ["fast-break", "passing", "transition"],
      diagramJson: JSON.stringify([
        { id: "seed-p1", type: "player", x: 120, y: 120, width: 36, height: 36 },
        { id: "seed-p2", type: "player", x: 250, y: 215, width: 36, height: 36 },
        { id: "seed-gk", type: "keeper", x: 455, y: 170, width: 38, height: 38 },
        { id: "seed-goal", type: "goal", x: 535, y: 145, width: 48, height: 80 },
        { id: "seed-pass", type: "pass", x: 140, y: 140, width: 120, height: 70 },
      ]),
      createdBy: "local-demo",
    },
    {
      id: "demo-shooting", clubId, title: "Catch, turn & shoot",
      description: "Receive on the move, turn toward goal and attack the open space.",
      ageGroup: "U14", complexity: "Beginner", category: "Shooting", tags: ["shooting", "footwork"],
      diagramJson: "[]", createdBy: "local-demo",
    },
  ];
  await repo.upsert("Clubs", "clubs", club);
  await repo.upsert("Teams", clubId, team);
  await Promise.all(exercises.map(async (exercise) => {
    await repo.upsert("Exercises", clubId, exercise);
    await repo.saveDiagram(clubId, exercise.id, exercise.diagramJson);
  }));
  await repo.upsert("TrainingPlans", clubId, {
    id: "demo-session", clubId, teamId: team.id, title: "Fast breaks & finishing",
    date: sessionDate, duration: 90, exerciseIds: exercises.map((exercise) => exercise.id),
    notes: "Finish with a team challenge: first group to score five wins.",
  });
  const defaultEmail = (process.env.DEV_AUTH_EMAIL || "coach@local.test").trim().toLowerCase();
  const defaultId = `local-${createHash("sha256").update(defaultEmail).digest("hex").slice(0, 24)}`;
  await repo.upsert<User>("Users", "users", {
    id: defaultId, name: process.env.DEV_AUTH_NAME || "Demo Coach", email: defaultEmail,
    clubId, roles: ["GlobalAdmin", "ClubAdmin"], status: "approved",
  });
}
function hasRole(user: User, ...allowed: Role[]): boolean {
  return user.roles.includes("GlobalAdmin") || allowed.some((role) => user.roles.includes(role));
}
function requireRole(user: User, ...allowed: Role[]): void {
  if (!hasRole(user, ...allowed)) throw new HttpError(403, "You don't have permission to do that.");
}
function requireClub(user: User): string {
  if (!user.clubId || user.status !== "approved") throw new HttpError(403, "Your club membership is not approved.");
  return user.clubId;
}
function ownsClub(user: User, clubId: string): void {
  if (!hasRole(user, "GlobalAdmin") && user.clubId !== clubId) throw new HttpError(403, "You don't have access to this club.");
}
async function listExercises(repo: Repository, clubId: string): Promise<Exercise[]> {
  const exercises = await repo.list<Exercise>("Exercises", clubId);
  return Promise.all(exercises.map(async (exercise) => ({
    ...exercise,
    diagramJson: await repo.readDiagram(clubId, exercise.id),
  })));
}

export async function handle(request: HttpRequest, context: InvocationContext): Promise<Response> {
  try {
    const actor = identity(request);
    const repo = getRepository();
    await seedDevelopmentData(repo);
    const user = await getCurrentUser(repo, actor);
    const { pathname } = new URL(request.url);
    const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
    const [resource, id, action] = parts;
    const method = request.method.toUpperCase();

    if (resource === "bootstrap" && method === "GET") {
      const clubs = await repo.list<Club>("Clubs");
      const allRequests = await repo.list<JoinRequest>("JoinRequests");
      const requests = hasRole(user, "GlobalAdmin")
        ? allRequests
        : user.clubId && hasRole(user, "ClubAdmin")
          ? allRequests.filter((item) => item.clubId === user.clubId)
          : allRequests.filter((item) => item.userId === user.id);
      const [teams, exercises, plans, templates] = user.clubId && user.status === "approved"
        ? await Promise.all([
            repo.list("Teams", user.clubId), listExercises(repo, user.clubId),
            repo.list<TrainingPlan>("TrainingPlans", user.clubId), repo.list<TrainingTemplate>("TrainingTemplates", user.clubId),
          ])
        : [[], [], [], []];
      const users = hasRole(user, "GlobalAdmin") || (user.clubId && user.status === "approved" && hasRole(user, "ClubAdmin"))
        ? await repo.list<User>("Users", "users")
        : [];
      return json({
        user, clubs, teams, exercises, plans, templates, requests,
        users: hasRole(user, "GlobalAdmin") ? users : users.filter((item) => item.clubId === user.clubId),
      });
    }
    if (resource === "users" && id === "me" && action === "profile" && method === "PATCH") {
      const input = await body(request, displayNameInput);
      const updated = { ...user, name: input.name };
      await repo.upsert("Users", "users", updated);
      if (updated.clubId) {
        const requests = await repo.list<JoinRequest>("JoinRequests", updated.clubId);
        await Promise.all(requests.filter((item) => item.userId === updated.id && item.userName !== updated.name)
          .map((item) => repo.upsert("JoinRequests", item.clubId, { ...item, userName: updated.name })));
      }
      return json(updated);
    }
    if (resource === "users" && id === "me" && action === "teams" && method === "PATCH") {
      const input = await body(request, interestedTeamsInput);
      const clubId = requireClub(user);
      const teams = await repo.list<Team>("Teams", clubId);
      if (input.teamIds.some((teamId) => !teams.some((team) => team.id === teamId))) {
        throw new HttpError(400, "Choose teams from your club.");
      }
      const updated = { ...user, interestedTeamIds: input.teamIds };
      await repo.upsert("Users", "users", updated);
      return json(updated);
    }
    if (resource === "join-requests" && method === "POST") {
      const data = await body(request, joinRequestInput);
      if (user.status === "approved") throw new HttpError(409, "You already belong to a club.");
      const club = await repo.get<Club>("Clubs", "clubs", data.clubId);
      if (!club) throw new HttpError(404, "Club not found.");
      const priorRequest = (await repo.list<JoinRequest>("JoinRequests")).find((item) => item.userId === user.id && item.status === "pending");
      if (priorRequest && priorRequest.clubId !== data.clubId) throw new HttpError(409, "You already have a request waiting for another club.");
      if (priorRequest) return json(priorRequest);
      const existing = (await repo.list<JoinRequest>("JoinRequests", data.clubId)).find((item) => item.userId === user.id);
      const joinRequest: JoinRequest = {
        id: existing?.id ?? randomUUID(), userId: user.id, clubId: data.clubId, status: "pending",
        createdDate: existing?.createdDate ?? new Date().toISOString(), userName: user.name, email: user.email,
      };
      await repo.upsert("JoinRequests", data.clubId, joinRequest);
      await repo.upsert("Users", "users", { ...user, clubId: data.clubId, status: "pending" });
      return json(joinRequest, 201);
    }
    if (resource === "join-requests" && id && method === "PATCH") {
      requireRole(user, "ClubAdmin");
      const input = await body(request, decisionInput);
      const requestItem = hasRole(user, "GlobalAdmin")
        ? (await repo.list<JoinRequest>("JoinRequests")).find((item) => item.id === id)
        : await repo.get<JoinRequest>("JoinRequests", user.clubId!, id);
      if (!requestItem) throw new HttpError(404, "Join request not found.");
      ownsClub(user, requestItem.clubId);
      const updated = { ...requestItem, status: input.status };
      await repo.upsert("JoinRequests", requestItem.clubId, updated);
      const target = await repo.get<User>("Users", "users", requestItem.userId);
      if (target) {
        const nextUser: User = input.status === "approved"
          ? { ...target, clubId: requestItem.clubId, status: "approved", roles: target.roles.includes("GlobalAdmin") ? target.roles : ["Coach"] }
          : { ...target, clubId: null, status: "rejected" };
        await repo.upsert("Users", "users", nextUser);
      }
      return json(updated);
    }
    if (resource === "clubs" && method === "POST") {
      requireRole(user, "GlobalAdmin");
      const data = await body(request, clubInput);
      const duplicate = (await repo.list<Club>("Clubs")).some((club) => club.name.toLowerCase() === data.name.toLowerCase());
      if (duplicate) throw new HttpError(409, "A club with that name already exists.");
      const club: Club = { id: randomUUID(), name: data.name, createdDate: new Date().toISOString() };
      await repo.upsert("Clubs", "clubs", club);
      return json(club, 201);
    }
    if (resource === "clubs" && id && method === "PUT") {
      requireRole(user, "GlobalAdmin");
      const data = await body(request, clubInput);
      const current = await repo.get<Club>("Clubs", "clubs", id);
      if (!current) throw new HttpError(404, "Club not found.");
      const duplicate = (await repo.list<Club>("Clubs")).some((club) => club.id !== id && club.name.toLowerCase() === data.name.toLowerCase());
      if (duplicate) throw new HttpError(409, "A club with that name already exists.");
      const updated = { ...current, name: data.name };
      await repo.upsert("Clubs", "clubs", updated);
      return json(updated);
    }
    if (resource === "teams" && method === "POST") {
      requireRole(user, "ClubAdmin");
      const data = await body(request, teamInput);
      const team = { id: randomUUID(), clubId: requireClub(user), ...data };
      await repo.upsert("Teams", team.clubId, team);
      return json(team, 201);
    }
    if (resource === "teams" && id && method === "PUT") {
      requireRole(user, "ClubAdmin");
      const clubId = requireClub(user);
      const current = await repo.get<Team>("Teams", clubId, id);
      if (!current) throw new HttpError(404, "Team not found.");
      const updated = { ...current, ...await body(request, teamInput) };
      await repo.upsert("Teams", clubId, updated);
      return json(updated);
    }
    if (resource === "exercises" && method === "GET") {
      const clubId = requireClub(user);
      return json(await repo.list<Exercise>("Exercises", clubId));
    }
    if (resource === "exercises" && method === "POST") {
      requireRole(user, "ClubAdmin", "Coach");
      const data = await body(request, exerciseInput);
      const exercise: Exercise = { id: randomUUID(), clubId: requireClub(user), createdBy: user.id, ...data };
      await repo.upsert("Exercises", exercise.clubId, exercise);
      await repo.saveDiagram(exercise.clubId, exercise.id, exercise.diagramJson);
      return json(exercise, 201);
    }
    if (resource === "exercises" && id && method === "PUT") {
      requireRole(user, "ClubAdmin", "Coach");
      const clubId = requireClub(user);
      const current = await repo.get<Exercise>("Exercises", clubId, id);
      if (!current) throw new HttpError(404, "Exercise not found.");
      const updated = { ...current, ...await body(request, exerciseInput) };
      await repo.upsert("Exercises", clubId, updated);
      await repo.saveDiagram(clubId, updated.id, updated.diagramJson);
      return json(updated);
    }
    if (resource === "exercises" && id && method === "DELETE") {
      requireRole(user, "ClubAdmin", "Coach");
      const clubId = requireClub(user);
      await repo.delete("Exercises", clubId, id);
      await repo.deleteDiagram(clubId, id);
      return json({ ok: true });
    }
    if (resource === "plans" && method === "GET") {
      const clubId = requireClub(user);
      return json(await repo.list<TrainingPlan>("TrainingPlans", clubId));
    }
    if (resource === "plans" && method === "POST") {
      requireRole(user, "ClubAdmin", "Coach");
      const data = await body(request, planInput);
      const clubId = requireClub(user);
      const team = await repo.get("Teams", clubId, data.teamId);
      if (!team) throw new HttpError(400, "Choose a team from your club.");
      const clubExercises = await repo.list<Exercise>("Exercises", clubId);
      const allowedExerciseIds = new Set([...clubExercises.map((exercise) => exercise.id), ...data.customExercises.map((exercise) => exercise.id)]);
      if (data.exerciseIds.some((exerciseId) => !allowedExerciseIds.has(exerciseId))) {
        throw new HttpError(400, "Training plans can only use exercises from your club.");
      }
      const plan: TrainingPlan = { id: randomUUID(), clubId, ...data };
      await repo.upsert("TrainingPlans", clubId, plan);
      return json(plan, 201);
    }
    if (resource === "plans" && id && method === "PUT") {
      requireRole(user, "ClubAdmin", "Coach");
      const clubId = requireClub(user);
      const current = await repo.get<TrainingPlan>("TrainingPlans", clubId, id);
      if (!current) throw new HttpError(404, "Training plan not found.");
      const data = await body(request, planInput);
      const [team, clubExercises] = await Promise.all([
        repo.get("Teams", clubId, data.teamId),
        repo.list<Exercise>("Exercises", clubId),
      ]);
      if (!team) throw new HttpError(400, "Choose a team from your club.");
      const allowedExerciseIds = new Set([...clubExercises.map((exercise) => exercise.id), ...data.customExercises.map((exercise) => exercise.id)]);
      if (data.exerciseIds.some((exerciseId) => !allowedExerciseIds.has(exerciseId))) {
        throw new HttpError(400, "Training plans can only use exercises from your club.");
      }
      const updated = { ...current, ...data };
      await repo.upsert("TrainingPlans", clubId, updated);
      return json(updated);
    }
    if (resource === "plans" && id && method === "DELETE") {
      requireRole(user, "ClubAdmin", "Coach");
      await repo.delete("TrainingPlans", requireClub(user), id);
      return json({ ok: true });
    }
    if (resource === "templates" && method === "GET") {
      return json(await repo.list<TrainingTemplate>("TrainingTemplates", requireClub(user)));
    }
    if (resource === "templates" && method === "POST") {
      requireRole(user, "ClubAdmin", "Coach");
      const data = await body(request, templateInput);
      const clubId = requireClub(user);
      const clubExercises = await repo.list<Exercise>("Exercises", clubId);
      const allowedExerciseIds = new Set([...clubExercises.map((exercise) => exercise.id), ...data.customExercises.map((exercise) => exercise.id)]);
      if (data.exerciseIds.some((exerciseId) => !allowedExerciseIds.has(exerciseId))) {
        throw new HttpError(400, "Training templates can only use exercises from your club.");
      }
      const template: TrainingTemplate = { id: randomUUID(), clubId, ...data };
      await repo.upsert("TrainingTemplates", clubId, template);
      return json(template, 201);
    }
    if (resource === "templates" && id && method === "PUT") {
      requireRole(user, "ClubAdmin", "Coach");
      const clubId = requireClub(user);
      const current = await repo.get<TrainingTemplate>("TrainingTemplates", clubId, id);
      if (!current) throw new HttpError(404, "Training template not found.");
      const data = await body(request, templateInput);
      const clubExercises = await repo.list<Exercise>("Exercises", clubId);
      const allowedExerciseIds = new Set([...clubExercises.map((exercise) => exercise.id), ...data.customExercises.map((exercise) => exercise.id)]);
      if (data.exerciseIds.some((exerciseId) => !allowedExerciseIds.has(exerciseId))) {
        throw new HttpError(400, "Training templates can only use exercises from your club.");
      }
      const updated = { ...current, ...data };
      await repo.upsert("TrainingTemplates", clubId, updated);
      return json(updated);
    }
    if (resource === "templates" && id && method === "DELETE") {
      requireRole(user, "ClubAdmin", "Coach");
      await repo.delete("TrainingTemplates", requireClub(user), id);
      return json({ ok: true });
    }
    if (resource === "users" && id && action === "role" && method === "PATCH") {
      requireRole(user, "ClubAdmin", "GlobalAdmin");
      const data = await body(request, roleInput);
      const target = await repo.get<User>("Users", "users", id);
      if (!target || (!hasRole(user, "GlobalAdmin") && target.clubId !== user.clubId)) throw new HttpError(404, "Club user not found.");
      const updated = { ...target, roles: [data.role] };
      await repo.upsert("Users", "users", updated);
      return json(updated);
    }
    context.warn("Unknown API route", { method, pathname });
    throw new HttpError(404, "API endpoint not found.");
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    context.error("Request failed", error);
    return json({ error: "The request could not be completed." }, 500);
  }
}

app.http("api", { route: "{*path}", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], authLevel: "anonymous", handler: handle });
