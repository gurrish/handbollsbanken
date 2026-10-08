import type { Bootstrap, Exercise, TrainingPlan, TrainingTemplate } from "../types";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const devEmail = import.meta.env.DEV ? window.localStorage.getItem("handboll-dev-email") : null;
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(devEmail ? { "x-dev-user-email": devEmail } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const loadBootstrap = () => api<Bootstrap>("bootstrap");
export const saveExercise = (exercise: Partial<Exercise> & Pick<Exercise, "title" | "ageGroup" | "complexity" | "category">, id?: string) =>
  api<Exercise>(id ? `exercises/${id}` : "exercises", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify({ description: "", tags: [], diagramJson: "[]", ...exercise }),
  });
export const savePlan = (plan: Omit<TrainingPlan, "id" | "clubId">, id?: string) =>
  api<TrainingPlan>(id ? `plans/${id}` : "plans", { method: id ? "PUT" : "POST", body: JSON.stringify(plan) });
export const saveTemplate = (template: Omit<TrainingTemplate, "id" | "clubId">, id?: string) =>
  api<TrainingTemplate>(id ? `templates/${id}` : "templates", { method: id ? "PUT" : "POST", body: JSON.stringify(template) });
