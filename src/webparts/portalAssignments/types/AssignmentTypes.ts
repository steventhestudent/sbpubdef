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
  quizPassingScore?: number;
  contentVersion?: string | number;
};

export type AssignmentStepItem = {
  id: number;
  assignmentCatalogId: number;
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
  /** When list column INTERNALCOLUMN_FINALEMBEDCOMPLETED exists and is selected */
  finalEmbedCompleted?: boolean;
  /** Set by backend when quiz attempt passes for this assignment */
  quizPassed?: boolean;
  quizScorePercent?: number;
};

export type QuizQuestionType = "MultipleChoice" | "OpenAnswer";

export type AssignmentQuizQuestion = {
  id: number;
  assignmentCatalogId: number;
  questionOrder: number;
  questionText: string;
  questionType: QuizQuestionType;
  choicesText?: string;
  correctAnswer?: string;
  explanation?: string;
  active?: boolean;
};

export type QuizAttemptResult = {
  scorePercent: number;
  passed: boolean;
  submittedOn: string;
};

