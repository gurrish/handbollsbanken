export type Role = "GlobalAdmin" | "ClubAdmin" | "Coach" | "Viewer";
export type Status = "pending" | "approved" | "rejected";

export interface Club { id: string; name: string; createdDate: string }
export interface Team { id: string; clubId: string; name: string; ageGroup: string }
export interface User { id: string; name: string; email: string; clubId: string | null; roles: Role[]; status: Status; interestedTeamIds?: string[] }
export interface JoinRequest {
  id: string; userId: string; clubId: string; status: Status;
  createdDate: string; userName: string; email: string
}
export interface Exercise {
  id: string; clubId: string; title: string; description: string; ageGroup: string;
  complexity: string; category: string; tags: string[]; diagramJson: string; createdBy: string
}
export interface TrainingPlan {
  id: string; clubId: string; teamId: string; title: string; date: string;
  duration: number; exerciseIds: string[]; customExercises?: CustomExercise[];
  exerciseDurations?: Record<string, number>; notes: string
}
export interface CustomExercise {
  id: string; title: string
}
export interface TrainingTemplate {
  id: string; clubId: string; title: string; ageGroup: string; duration: number; exerciseIds: string[];
  customExercises?: CustomExercise[]; exerciseDurations?: Record<string, number>; notes: string
}
export interface Bootstrap {
  user: User; clubs: Club[]; teams: Team[]; exercises: Exercise[];
  plans: TrainingPlan[]; templates: TrainingTemplate[]; requests: JoinRequest[]; users: User[]
}
export interface DiagramItem {
  id: string; type: "player" | "keeper" | "cone" | "goal" | "ball" | "arrow" | "pass" | "movement" | "text";
  x: number; y: number; width: number; height: number; rotation?: number; text?: string
}
