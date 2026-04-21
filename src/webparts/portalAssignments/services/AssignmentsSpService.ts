import "@pnp/sp/items";
import "@pnp/sp/lists";
import type { PNPWrapper } from "@utils/PNPWrapper";
import type {
  AssignmentCatalogItem,
  AssignmentStepItem,
  UserAssignmentItem,
} from "../types/AssignmentTypes";

type ListNameConfig = {
  assignments: string;
  catalog: string;
  steps: string;
};

function toYesNo(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "yes" || s === "1") return true;
    if (s === "false" || s === "no" || s === "0") return false;
  }
  return undefined;
}

function safeNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeEmbedUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(raw)].map((s) => s.trim()).filter(Boolean);
}

function getProp<T>(r: Record<string, unknown>, key: string): T | undefined {
  return r[key] as T | undefined;
}

function getFirstDefined<T>(...vals: Array<T | undefined>): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

export class AssignmentsSpService {
  private pnp: PNPWrapper;
  private lists: ListNameConfig;

  constructor(pnpWrapper: PNPWrapper, lists?: Partial<ListNameConfig>) {
    this.pnp = pnpWrapper;
    // Dev-friendly: default to ENV but allow overrides and fallbacks
    this.lists = {
      assignments: lists?.assignments || ENV.LIST_ASSIGNMENTS || "Assignments",
      catalog: lists?.catalog || ENV.LIST_ASSIGNMENTCATALOG || "AssignmentCatalog",
      steps: lists?.steps || ENV.LIST_ASSIGNMENTSTEPS || "AssignmentSteps",
    };
  }

  private web(): ReturnType<PNPWrapper["web"]> {
    return this.pnp.web(); // current web
  }

  public async getMyAssignments(email: string, limit = 200): Promise<UserAssignmentItem[]> {
    const list = this.web().lists.getByTitle(this.lists.assignments);

    // Column names are not yet normalized in dev; select broadly and map defensively.
    const rows: Array<Record<string, unknown>> = await list.items
      .select(
        "Id",
        "Title",
        "AssignmentCatalogId",
        "AssignmentCatalogIdId",
        "AssignmentKeySnapshot",
        "EmployeeEmail",
        "DueDate",
        "Status",
        ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS || "AssignmentStatus",
        "CurrentStepOrder",
        "MaxStepOrderViewed",
        "PercentComplete",
        "LastOpenedOn",
        "CompletedOn",
        "FinalEmbedCompleted",
      )
      .filter(`EmployeeEmail eq '${email.replace(/'/g, "''")}'`)
      .orderBy("DueDate", true)
      .top(limit)();

    return (rows || []).map((r) => {
      const status =
        getFirstDefined<string>(
          getProp<string>(r, "Status"),
          ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS ? getProp<string>(r, ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS) : undefined,
          getProp<string>(r, "AssignmentStatus"),
        ) ?? undefined;

      const catalogId = safeNumber(
        getFirstDefined<unknown>(
          getProp<unknown>(r, "AssignmentCatalogIdId"),
          getProp<unknown>(r, "AssignmentCatalogId"),
        ),
      );
      return {
        id: getProp<number>(r, "Id") ?? 0,
        title: getProp<string>(r, "Title") ?? "(untitled)",
        assignmentCatalogId: catalogId,
        assignmentKeySnapshot: getProp<string>(r, "AssignmentKeySnapshot"),
        employeeEmail: getProp<string>(r, "EmployeeEmail"),
        dueDate: getProp<string>(r, "DueDate"),
        status: status,
        currentStepOrder: safeNumber(getProp<unknown>(r, "CurrentStepOrder")),
        maxStepOrderViewed: safeNumber(getProp<unknown>(r, "MaxStepOrderViewed")),
        percentComplete: safeNumber(getProp<unknown>(r, "PercentComplete")),
        lastOpenedOn: getProp<string>(r, "LastOpenedOn"),
        completedOn: getProp<string>(r, "CompletedOn"),
        finalEmbedCompleted: toYesNo(getProp<unknown>(r, "FinalEmbedCompleted")),
      };
    });
  }

  public async getAssignmentById(id: number): Promise<UserAssignmentItem | undefined> {
    const list = this.web().lists.getByTitle(this.lists.assignments);
    const r: Record<string, unknown> = await list.items.getById(id).select(
      "Id",
      "Title",
      "AssignmentCatalogId",
      "AssignmentCatalogIdId",
      "AssignmentKeySnapshot",
      "EmployeeEmail",
      "DueDate",
      "Status",
      ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS || "AssignmentStatus",
      "CurrentStepOrder",
      "MaxStepOrderViewed",
      "PercentComplete",
      "LastOpenedOn",
      "CompletedOn",
      "FinalEmbedCompleted",
    )();

    const status =
      getFirstDefined<string>(
        getProp<string>(r, "Status"),
        ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS ? getProp<string>(r, ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS) : undefined,
        getProp<string>(r, "AssignmentStatus"),
      ) ?? undefined;

    const catalogId = safeNumber(
      getFirstDefined<unknown>(
        getProp<unknown>(r, "AssignmentCatalogIdId"),
        getProp<unknown>(r, "AssignmentCatalogId"),
      ),
    );
    return {
      id: getProp<number>(r, "Id") ?? 0,
      title: getProp<string>(r, "Title") ?? "(untitled)",
      assignmentCatalogId: catalogId,
      assignmentKeySnapshot: getProp<string>(r, "AssignmentKeySnapshot"),
      employeeEmail: getProp<string>(r, "EmployeeEmail"),
      dueDate: getProp<string>(r, "DueDate"),
      status: status,
      currentStepOrder: safeNumber(getProp<unknown>(r, "CurrentStepOrder")),
      maxStepOrderViewed: safeNumber(getProp<unknown>(r, "MaxStepOrderViewed")),
      percentComplete: safeNumber(getProp<unknown>(r, "PercentComplete")),
      lastOpenedOn: getProp<string>(r, "LastOpenedOn"),
      completedOn: getProp<string>(r, "CompletedOn"),
      finalEmbedCompleted: toYesNo(getProp<unknown>(r, "FinalEmbedCompleted")),
    };
  }

  public async getCatalogItemById(id: number): Promise<AssignmentCatalogItem | undefined> {
    const list = this.web().lists.getByTitle(this.lists.catalog);
    const r: Record<string, unknown> = await list.items
      .getById(id)
      .select(
        "Id",
        "Title",
        "AssignmentKey",
        "Summary",
        "Instructions",
        "InstructionsHtml",
        "Active",
        "EstimatedMinutes",
        "FinalStepCompletionMode",
        ENV.INTERNALCOLUMN_CONTENTVERSION || "ContentVersion",
      )();

    return {
      id: getProp<number>(r, "Id") ?? 0,
      title: getProp<string>(r, "Title") ?? "(untitled)",
      assignmentKey: getProp<string>(r, "AssignmentKey"),
      summary: getProp<string>(r, "Summary"),
      instructions: getFirstDefined<string>(
        getProp<string>(r, "InstructionsHtml"),
        getProp<string>(r, "Instructions"),
      ),
      active: toYesNo(getProp<unknown>(r, "Active")),
      estimatedMinutes: safeNumber(getProp<unknown>(r, "EstimatedMinutes")),
      finalStepCompletionMode: getProp<string>(r, "FinalStepCompletionMode"),
      contentVersion:
        (ENV.INTERNALCOLUMN_CONTENTVERSION
          ? getProp<string | number>(r, ENV.INTERNALCOLUMN_CONTENTVERSION)
          : undefined) ?? getProp<string | number>(r, "ContentVersion"),
    };
  }

  public async getStepsForCatalog(catalogId: number, limit = 200): Promise<AssignmentStepItem[]> {
    const list = this.web().lists.getByTitle(this.lists.steps);
    const rows: Array<Record<string, unknown>> = await list.items
      .select(
        "Id",
        "Title",
        "AssignmentCatalogId",
        "AssignmentCatalogIdId",
        "StepKey",
        "StepOrder",
        "StepTitle",
        "BodyHtml",
        "EmbedUrl",
        "EmbedUrls",
        "RequireEmbedCompletion",
        "RequireStepView",
        "AllowMarkCompleteHere",
        "EstimatedMinutes",
      )
      .filter(`AssignmentCatalogIdId eq ${catalogId}`)
      .orderBy("StepOrder", true)
      .top(limit)();

    return (rows || []).map((r) => {
      const stepOrder = safeNumber(getProp<unknown>(r, "StepOrder")) ?? 0;
      return {
        id: getProp<number>(r, "Id") ?? 0,
        assignmentCatalogId: catalogId,
        stepKey: getProp<string>(r, "StepKey"),
        stepOrder,
        stepTitle: getFirstDefined<string>(getProp<string>(r, "StepTitle"), getProp<string>(r, "Title")),
        bodyHtml: getProp<string>(r, "BodyHtml"),
        embedUrls: normalizeEmbedUrls(getFirstDefined<unknown>(getProp<unknown>(r, "EmbedUrls"), getProp<unknown>(r, "EmbedUrl"))),
        requireEmbedCompletion: toYesNo(getProp<unknown>(r, "RequireEmbedCompletion")),
        requireStepView: toYesNo(getProp<unknown>(r, "RequireStepView")),
        allowMarkCompleteHere: toYesNo(getProp<unknown>(r, "AllowMarkCompleteHere")),
        estimatedMinutes: safeNumber(getProp<unknown>(r, "EstimatedMinutes")),
      };
    });
  }

  public async updateAssignment(
    id: number,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const list = this.web().lists.getByTitle(this.lists.assignments);
    await list.items.getById(id).update(fields);
  }
}

