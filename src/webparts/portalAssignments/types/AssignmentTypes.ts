export type AssignmentStatus = "Not Started" | "In Progress" | "Completed" | "Overdue";

export type AssignmentCatalogItem = {
  id: number;
  title: string;
  assignmentKey?: string;
  summary?: string;
  instructions?: string;
  active?: boolean;
  estimatedMinutes?: number;
  finalStepCompletionMode?: string;
  contentVersion?: string | number;
};

export type AssignmentStepItem = {
  id: number;
  assignmentCatalogId: number;
  stepKey?: string;
  stepOrder: number;
  stepTitle?: string;
  bodyHtml?: string;
  embedUrls: string[];
  requireEmbedCompletion?: boolean;
  requireStepView?: boolean;
  allowMarkCompleteHere?: boolean;
  estimatedMinutes?: number;
};

export type UserAssignmentItem = {
  id: number;
  title: string;
  assignmentCatalogId?: number;
  employeeEmail?: string;
  reason?: string;
  dueDate?: string;
  status?: AssignmentStatus | string;
  currentStepOrder?: number;
  percentComplete?: number;
  lastOpenedOn?: string;
  completedOn?: string;
};

