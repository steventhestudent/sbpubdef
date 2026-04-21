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

/**
 * SharePoint "percentage" number fields are inconsistent across tenants/API layers:
 * - sometimes stored as 0..1 (Graph)
 * - sometimes stored as 0..100
 * - bad writes can stack-scale (e.g. 100 -> 10000)
 *
 * This normalizes to a UI-friendly 0..100 number.
 */
function normalizePercentCompleteFromSharePoint(raw: number | undefined): number | undefined {
  if (raw === undefined) return undefined;
  if (!Number.isFinite(raw)) return undefined;

  let n = raw;
  // Unwind accidental repeated "% scaling" (10000 -> 100, 5000 -> 50, etc.)
  while (n > 100) {
    n = n / 100;
  }

  // 0..1 (inclusive) => percent
  if (n > 0 && n <= 1) {
    return Math.round(n * 100);
  }

  return Math.round(n);
}

function percentCompleteToSharePoint(uiPercent: number | undefined): number | undefined {
  if (uiPercent === undefined) return undefined;
  if (!Number.isFinite(uiPercent)) return undefined;
  const clamped = Math.max(0, Math.min(100, uiPercent));
  return clamped / 100;
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
  private resolvedTitles = new Map<string, string>();

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

  private normalizeTitle(input: string): string {
    return input.replace(/\s+/g, "").trim().toLowerCase();
  }

  private candidateTitles(input: string): string[] {
    const raw = input.trim();
    const cands = new Set<string>();
    if (raw) cands.add(raw);

    // "Assignments1" -> "Assignments 1"
    const spacedDigits = raw.replace(/([a-zA-Z])(\d+)/g, "$1 $2");
    if (spacedDigits !== raw) cands.add(spacedDigits);

    // "Assignments1" -> "Assignments"
    const stripped = raw.replace(/\d+$/, "");
    if (stripped && stripped !== raw) cands.add(stripped);

    // also try stripping then spacing (rare)
    const strippedSpaced = stripped.replace(/([a-zA-Z])(\d+)/g, "$1 $2");
    if (strippedSpaced && strippedSpaced !== stripped) cands.add(strippedSpaced);

    return Array.from(cands);
  }

  private async resolveListTitle(title: string): Promise<string> {
    const key = title.trim();
    const cached = this.resolvedTitles.get(key);
    if (cached) return cached;

    // Fast path: assume it's correct
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      await this.web().lists.getByTitle(key).select("Id")();
      this.resolvedTitles.set(key, key);
      return key;
    } catch {
      // fall through
    }

    // Slow path: enumerate list titles and find best match
    const all: Array<{ Title: string }> = await this.web().lists
      .select("Title")();

    const candidates = this.candidateTitles(key);
    const candidateNorms = candidates.map((c) => this.normalizeTitle(c));

    // Prefer exact title match (case-insensitive) among candidates
    for (const c of candidates) {
      const exact = all.find(
        (l) =>
          String(l?.Title ?? "").trim().toLowerCase() === c.toLowerCase(),
      );
      if (exact?.Title) {
        this.resolvedTitles.set(key, exact.Title);
        return exact.Title;
      }
    }

    // Then try normalized match (removing spaces) among candidates
    for (const wantedNorm of candidateNorms) {
      const norm = all.find(
        (l) => this.normalizeTitle(String(l?.Title ?? "")) === wantedNorm,
      );
      if (norm?.Title) {
        this.resolvedTitles.set(key, norm.Title);
        return norm.Title;
      }
    }

    // Finally: if we stripped trailing digits, allow "startsWith" match (Assignments -> Assignments 2026, etc.)
    const stripped = key.replace(/\d+$/, "");
    const strippedNorm = stripped ? this.normalizeTitle(stripped) : "";
    if (strippedNorm) {
      const starts = all.find((l) =>
        this.normalizeTitle(String(l?.Title ?? "")).startsWith(strippedNorm),
      );
      if (starts?.Title) {
        this.resolvedTitles.set(key, starts.Title);
        return starts.Title;
      }
    }

    // Last resort: keep original (caller will get the real error)
    this.resolvedTitles.set(key, key);
    return key;
  }

  private async getListByTitle(
    title: string,
  ): Promise<ReturnType<ReturnType<PNPWrapper["web"]>["lists"]["getByTitle"]>> {
    const resolved = await this.resolveListTitle(title);
    return this.web().lists.getByTitle(resolved);
  }

  public statusFieldName(): string {
    // Dev-friendly: prefer internal name (e.g. "Statuc"), otherwise default "Status"
    return ENV.INTERNALCOLUMN_ASSIGNMENTSTATUS?.trim() || "Status";
  }

  public async getMyAssignments(email: string, limit = 200): Promise<UserAssignmentItem[]> {
    const list = await this.getListByTitle(this.lists.assignments);
    const statusField = this.statusFieldName();

    // Column names are not yet normalized in dev; select broadly and map defensively.
    const rows: Array<Record<string, unknown>> = await list.items
      .select(
        "Id",
        "Title",
        "AssignmentCatalogIdId",
        "EmployeeEmail",
        "Reason",
        "DueDate",
        statusField,
        "CurrentStepOrder",
        "PercentComplete",
        "LastOpenedOn",
        "CompletedOn",
      )
      .filter(`EmployeeEmail eq '${email.replace(/'/g, "''")}'`)
      .orderBy("DueDate", true)
      .top(limit)();

    return (rows || []).map((r) => {
      const status =
        getFirstDefined<string>(
          getProp<string>(r, statusField),
          getProp<string>(r, "Status"),
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
        employeeEmail: getProp<string>(r, "EmployeeEmail"),
        reason: getProp<string>(r, "Reason"),
        dueDate: getProp<string>(r, "DueDate"),
        status: status,
        currentStepOrder: safeNumber(getProp<unknown>(r, "CurrentStepOrder")),
        percentComplete: normalizePercentCompleteFromSharePoint(
          safeNumber(getProp<unknown>(r, "PercentComplete")),
        ),
        lastOpenedOn: getProp<string>(r, "LastOpenedOn"),
        completedOn: getProp<string>(r, "CompletedOn"),
      };
    });
  }

  public async getAssignmentById(id: number): Promise<UserAssignmentItem | undefined> {
    const list = await this.getListByTitle(this.lists.assignments);
    const statusField = this.statusFieldName();
    const r: Record<string, unknown> = await list.items.getById(id).select(
      "Id",
      "Title",
      "AssignmentCatalogIdId",
      "EmployeeEmail",
      "Reason",
      "DueDate",
      statusField,
      "CurrentStepOrder",
      "PercentComplete",
      "LastOpenedOn",
      "CompletedOn",
    )();

    const status =
      getFirstDefined<string>(
        getProp<string>(r, statusField),
        getProp<string>(r, "Status"),
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
      employeeEmail: getProp<string>(r, "EmployeeEmail"),
      reason: getProp<string>(r, "Reason"),
      dueDate: getProp<string>(r, "DueDate"),
      status: status,
      currentStepOrder: safeNumber(getProp<unknown>(r, "CurrentStepOrder")),
      percentComplete: normalizePercentCompleteFromSharePoint(
        safeNumber(getProp<unknown>(r, "PercentComplete")),
      ),
      lastOpenedOn: getProp<string>(r, "LastOpenedOn"),
      completedOn: getProp<string>(r, "CompletedOn"),
    };
  }

  public async getCatalogItemById(id: number): Promise<AssignmentCatalogItem | undefined> {
    const list = await this.getListByTitle(this.lists.catalog);
    const r: Record<string, unknown> = await list.items
      .getById(id)
      .select(
        "Id",
        "Title",
        "AssignmentKey",
        "Summary",
        "Instructions",
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
      instructions: getProp<string>(r, "Instructions"),
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
    const list = await this.getListByTitle(this.lists.steps);
    const rows: Array<Record<string, unknown>> = await list.items
      .select(
        "Id",
        "Title",
        "AssignmentCatalogIdId",
        "StepOrder",
        "StepTitle",
        "BodyHtml",
        "EmbedUrl",
        "RequireEmbedCompletion",
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
        stepKey: undefined,
        stepOrder,
        stepTitle: getFirstDefined<string>(getProp<string>(r, "StepTitle"), getProp<string>(r, "Title")),
        bodyHtml: getProp<string>(r, "BodyHtml"),
        embedUrls: normalizeEmbedUrls(getProp<unknown>(r, "EmbedUrl")),
        requireEmbedCompletion: toYesNo(getProp<unknown>(r, "RequireEmbedCompletion")),
        requireStepView: undefined,
        allowMarkCompleteHere: toYesNo(getProp<unknown>(r, "AllowMarkCompleteHere")),
        estimatedMinutes: safeNumber(getProp<unknown>(r, "EstimatedMinutes")),
      };
    });
  }

  public async updateAssignment(
    id: number,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const list = await this.getListByTitle(this.lists.assignments);
    const outgoing = { ...fields };
    if (Object.prototype.hasOwnProperty.call(outgoing, "PercentComplete")) {
      const raw = outgoing.PercentComplete;
      const asNum =
        typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw.trim() !== ""
            ? Number(raw)
            : NaN;
      outgoing.PercentComplete = Number.isFinite(asNum) ? percentCompleteToSharePoint(asNum) : raw;
    }
    await list.items.getById(id).update(outgoing);
  }
}

