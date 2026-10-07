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
  notes: string;
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
  title: z.string().trim().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Date must be a valid calendar date."),
  duration: z.number().int().min(15).max(300),
  exerciseIds: z.array(z.string()).max(50).refine((ids) => new Set(ids).size === ids.length, "Exercises cannot be duplicated.").default([]),
  notes: z.string().trim().max(2000).default(""),
});
export const teamInput = z.object({
  name: z.string().trim().min(2).max(80),
  ageGroup: z.string().trim().min(1).max(40),
});
export const joinRequestInput = z.object({ clubId: z.string().min(1) });
export const decisionInput = z.object({ status: z.enum(["approved", "rejected"]) });
export const clubInput = z.object({ name: z.string().trim().min(2).max(100) });
export const roleInput = z.object({ role: z.enum(["ClubAdmin", "Coach", "Viewer"]) });
