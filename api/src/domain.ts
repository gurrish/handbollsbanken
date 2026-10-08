import { z } from "zod";

export const roles = ["GlobalAdmin", "ClubAdmin", "Coach", "Viewer"] as const;
export type Role = (typeof roles)[number];
export type Status = "pending" | "approved" | "rejected";

const diagramItems = z.array(z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["player", "keeper", "cone", "goal", "ball", "arrow", "pass", "movement", "text"]),
  x: z.number().finite().min(-1000).max(10000),
  y: z.number().finite().min(-1000).max(10000),
  width: z.number().finite().positive().max(10000),
  height: z.number().finite().positive().max(10000),
  rotation: z.number().finite().min(-3600).max(3600).optional(),
  text: z.string().max(200).optional(),
}).strict()).max(200);

export interface Club {
  id: string;
  name: string;
  createdDate: string;
}
export interface Team {
  id: string;
  clubId: string;
  name: string;
  ageGroup: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  clubId: string | null;
  roles: Role[];
  status: Status;
  interestedTeamIds?: string[];
}
export interface JoinRequest {
  id: string;
  userId: string;
  clubId: string;
  status: Status;
  createdDate: string;
  userName: string;
  email: string;
}
export interface Exercise {
  id: string;
  clubId: string;
  title: string;
  description: string;
  ageGroup: string;
  complexity: string;
  category: string;
  tags: string[];
  diagramJson: string;
  createdBy: string;
}
export interface TrainingPlan {
  id: string;
  clubId: string;
  teamId: string;
  title: string;
  date: string;
  duration: number;
  exerciseIds: string[];
  customExercises?: CustomExercise[];
  exerciseDurations?: Record<string, number>;
  notes: string;
}
export interface CustomExercise {
  id: string;
  title: string;
}
export interface TrainingTemplate {
  id: string;
  clubId: string;
  title: string;
  duration: number;
  exerciseIds: string[];
  customExercises?: CustomExercise[];
  exerciseDurations?: Record<string, number>;
  notes: string;
}

const customExerciseInput = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(100),
}).strict();
const trainingContentFields = {
  title: z.string().trim().min(2).max(100),
  duration: z.number().int().min(15).max(300),
  exerciseIds: z.array(z.string().min(1).max(80)).max(50).refine((ids) => new Set(ids).size === ids.length, "Exercises cannot be duplicated.").default([]),
  customExercises: z.array(customExerciseInput).max(50).default([]),
  exerciseDurations: z.record(z.string().min(1).max(80), z.number().int().min(1).max(300)).optional(),
  notes: z.string().trim().max(2000).default(""),
};
function validateTrainingContent(
  content: { exerciseIds: string[]; customExercises: CustomExercise[]; exerciseDurations?: Record<string, number>; duration: number },
  context: z.RefinementCtx,
) {
  const customIds = content.customExercises.map((exercise) => exercise.id);
  if (new Set(customIds).size !== customIds.length) {
    context.addIssue({ code: "custom", path: ["customExercises"], message: "Custom exercises cannot be duplicated." });
  }
  if (customIds.some((id) => !content.exerciseIds.includes(id))) {
    context.addIssue({ code: "custom", path: ["customExercises"], message: "Every custom exercise must be included in the session." });
  }
  if (content.exerciseDurations) {
    const durationIds = Object.keys(content.exerciseDurations);
    if (durationIds.length !== content.exerciseIds.length || content.exerciseIds.some((id) => content.exerciseDurations?.[id] === undefined)) {
      context.addIssue({ code: "custom", path: ["exerciseDurations"], message: "Set a duration for every selected exercise." });
    } else if (content.exerciseIds.length && Object.values(content.exerciseDurations).reduce((total, minutes) => total + minutes, 0) !== content.duration) {
      context.addIssue({ code: "custom", path: ["duration"], message: "Session duration must equal the total exercise duration." });
    }
  }
}
export const exerciseInput = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).default(""),
  ageGroup: z.string().trim().min(1).max(40),
  complexity: z.enum(["Beginner", "Intermediate", "Advanced"]),
  category: z.string().trim().min(1).max(60),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  diagramJson: z.string().max(100_000).refine((value) => {
    try {
      return diagramItems.safeParse(JSON.parse(value)).success;
    } catch {
      return false;
    }
  }, "Diagram must be a valid JSON array with at most 200 items.").default("[]"),
});
export const planInput = z.object({
  teamId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Date must be a valid calendar date."),
  ...trainingContentFields,
}).superRefine(validateTrainingContent);
export const templateInput = z.object(trainingContentFields).superRefine(validateTrainingContent);
export const teamInput = z.object({
  name: z.string().trim().min(2).max(80),
  ageGroup: z.string().trim().min(1).max(40),
});
export const joinRequestInput = z.object({ clubId: z.string().min(1) });
export const decisionInput = z.object({ status: z.enum(["approved", "rejected"]) });
export const clubInput = z.object({ name: z.string().trim().min(2).max(100) });
export const roleInput = z.object({ role: z.enum(["ClubAdmin", "Coach", "Viewer"]) });
export const displayNameInput = z.object({ name: z.string().trim().min(2).max(80) });
export const interestedTeamsInput = z.object({
  teamIds: z.array(z.string().min(1).max(100)).max(100).refine((ids) => new Set(ids).size === ids.length, "Teams cannot be duplicated."),
});
