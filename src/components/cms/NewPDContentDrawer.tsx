import * as React from "react";
import { AadHttpClient } from "@microsoft/sp-http";
import RoleFormField from "@utils/rolebased/RoleFormField";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AnnouncementsApi } from "@api/announcements";
import {
	ProcedureChecklistIngestApi,
	type IngestProgressReport,
} from "@api/ProcedureChecklist";
import { ProcedureChecklistIngestProgressBar } from "@components/procedureChecklist/ProcedureChecklistIngestProgressBar";
import { offices } from "@webparts/officeInformation/components/Offices";
import {
	AssignmentView,
	type AssignmentFormState,
} from "./NewContentDrawerViews/AssignmentView";
import {
	BannerView,
	type BannerFormState,
} from "./NewContentDrawerViews/BannerView";
import {
	AssignmentCatalogView,
	type AssignmentCatalogFormState,
} from "./NewContentDrawerViews/AssignmentCatalogView";
import type {
	AudienceEntry,
	ContentTypeKey,
} from "./NewContentDrawerViews/types";

export function NewPDContentDrawer({
	open,
	onClose,
	onOpenHelp,
	pnpWrapper,
	defaultContentType = "announcement",
}: {
	open: boolean;
	onClose: () => void;
	onOpenHelp: () => void;
	pnpWrapper: PNPWrapper;
	defaultContentType?: ContentTypeKey;
}): JSX.Element {
	const CONTENT_TYPE_LS_KEY = "cms.newContentDrawer.contentType";

	function getStoredContentType(): ContentTypeKey | undefined {
		try {
			const raw = localStorage.getItem(CONTENT_TYPE_LS_KEY) || "";
			const v = raw.trim() as ContentTypeKey;
			return v === "announcement" ||
				v === "procedureChecklist" ||
				v === "pdEvent" ||
				v === "assignment" ||
				v === "banner" ||
				v === "assignmentCatalog"
				? v
				: undefined;
		} catch {
			return undefined;
		}
	}

	const announcementsApi = React.useMemo(
		() => new AnnouncementsApi(pnpWrapper),
		[pnpWrapper],
	);

	const [contentType, setContentType] = React.useState<ContentTypeKey>(
		() => getStoredContentType() || defaultContentType,
	);
	const [busy, setBusy] = React.useState(false);

	// Shared
	const [department, setDepartment] = React.useState("EVERYONE");

	// Announcement
	const [annTitle, setAnnTitle] = React.useState("");
	const editorRef = React.useRef<HTMLDivElement>(null);

	// Procedure checklist
	const [pcTitle, setPcTitle] = React.useState("");
	const [pcPurpose, setPcPurpose] = React.useState("");
	const [pcCategory, setPcCategory] = React.useState("");
	const [pcEffectiveDate, setPcEffectiveDate] = React.useState("");
	const [pcPdf, setPcPdf] = React.useState<File | undefined>(undefined);
	const [pcIngest, setPcIngest] = React.useState<{
		active: boolean;
		percent: number;
		phase: IngestProgressReport["phase"];
		error: string | null;
	}>({
		active: false,
		percent: 0,
		phase: "reading",
		error: null,
	});

	// PD Event
	const [evTitle, setEvTitle] = React.useState("");
	const [evStart, setEvStart] = React.useState("");
	const [evEnd, setEvEnd] = React.useState("");
	const [evLocation, setEvLocation] = React.useState("");
	const [evAllDay, setEvAllDay] = React.useState(false);
	const officeLocationOptions = React.useMemo(() => {
		return (offices || [])
			.map((o) => {
				const name = (o.name || "").trim();
				const addr = (o.lines || []).join(", ").trim();
				return addr ? `${name} — ${addr}` : name;
			})
			.filter(Boolean);
	}, []);

	// Assignment
	const [assignmentForm, setAssignmentForm] =
		React.useState<AssignmentFormState>({
			title: "",
			assignmentCatalogId: undefined,
			assignmentCatalogTitle: "",
			assignmentCatalogKey: "",
			audience: [],
			reason: "",
			assignedDate: "",
			dueDate: "",
			createCalendarEvent: false,
			sendEmail: false,
		});

	// Banner
	const [bannerForm, setBannerForm] = React.useState<BannerFormState>({
		showBanner: true,
		bannerMessageHtml: "",
	});
	const [bannerItemId, setBannerItemId] = React.useState<number | undefined>(
		undefined,
	);

	// Assignment Catalog (view-only for now)
	const [assignmentCatalogForm, setAssignmentCatalogForm] =
		React.useState<AssignmentCatalogFormState>({
			title: "",
			assignmentKey: "",
			assignmentType: "",
			category: "",
			summary: "",
			instructions: "",
			active: true,
			targetRolesText: "",
			dueDaysAfterAssigned: undefined,
			createCalendarEvent: false,
			sendAssignmentEmail: false,
			displayOrder: undefined,
			estimatedMinutes: undefined,
			finalStepCompletionMode: "",
			contentVersion: "",
			quizPassingScore: undefined,
		});

	React.useEffect(() => {
		if (!open) return;
		setBusy(false);
		setContentType(getStoredContentType() || defaultContentType);
		setDepartment("EVERYONE");

		const today = new Date();
		const todayYmd = today.toISOString().slice(0, 10);
		const due = new Date(today);
		due.setMonth(due.getMonth() + 2);
		const dueYmd = due.toISOString().slice(0, 10);

		setAnnTitle("");
		if (editorRef.current) editorRef.current.innerHTML = "";

		setPcTitle("");
		setPcPurpose("");
		setPcCategory("");
		setPcEffectiveDate(todayYmd);
		setPcPdf(undefined);

		setEvTitle("");
		setEvStart("");
		setEvEnd("");
		setEvLocation("");
		setEvAllDay(false);

		setAssignmentForm({
			title: "",
			assignmentCatalogId: undefined,
			assignmentCatalogTitle: "",
			assignmentCatalogKey: "",
			audience: [],
			reason: "",
			assignedDate: todayYmd,
			dueDate: dueYmd,
			createCalendarEvent: false,
			sendEmail: false,
		});

		setBannerForm({ showBanner: true, bannerMessageHtml: "" });
		setBannerItemId(undefined);
		setAssignmentCatalogForm({
			title: "",
			assignmentKey: "",
			assignmentType: "",
			category: "",
			summary: "",
			instructions: "",
			active: true,
			targetRolesText: "",
			dueDaysAfterAssigned: undefined,
			createCalendarEvent: false,
			sendAssignmentEmail: false,
			displayOrder: undefined,
			estimatedMinutes: undefined,
			finalStepCompletionMode: "",
			contentVersion: "",
			quizPassingScore: undefined,
		});
	}, [open, defaultContentType]);

	React.useEffect(() => {
		if (!open) return;
		if (contentType !== "banner") return;
		(async () => {
			try {
				const rows = (await pnpWrapper
					.web()
					.lists.getByTitle(ENV.LIST_SITESETTINGS)
					.items.select("Id", "BannerMessage", "ShowBanner")
					.orderBy("Id", false)
					.top(1)()) as Array<Record<string, unknown>>;
				const r = rows?.[0];
				setBannerItemId(
					typeof r?.Id === "number"
						? r.Id
						: Number(r?.Id) || undefined,
				);
				setBannerForm({
					bannerMessageHtml:
						typeof r?.BannerMessage === "string"
							? r.BannerMessage
							: "",
					showBanner:
						typeof r?.ShowBanner === "boolean"
							? r.ShowBanner
							: r?.ShowBanner !== false,
				});
			} catch {
				// ignore (stay on defaults)
			}
		})().catch(() => {});
	}, [open, contentType]);

	React.useEffect(() => {
		try {
			localStorage.setItem(CONTENT_TYPE_LS_KEY, contentType);
		} catch {
			// ignore
		}
	}, [contentType]);

	React.useEffect(() => {
		setPcIngest({
			active: false,
			percent: 0,
			phase: "reading",
			error: null,
		});
	}, [open, contentType]);

	function stripToText(html: string, maxLen = 240): string {
		const div = document.createElement("div");
		div.innerHTML = html;
		div.querySelectorAll("img,video,source,iframe,script,style").forEach(
			(el) => el.remove(),
		);
		const text = div.textContent?.replace(/\s+/g, " ").trim() ?? "";
		return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
	}

	function exec(cmd: string, value?: string): void {
		try {
			document.execCommand(cmd, false, value);
		} catch {
			/* noop */
		}
	}

	async function submitAnnouncement(): Promise<void> {
		const title = annTitle.trim();
		const html = editorRef.current?.innerHTML || "";
		if (!title) throw new Error("Please enter a title.");
		await announcementsApi.create({
			title,
			department,
			html: stripToText(html),
		});
	}

	async function submitProcedureChecklist(): Promise<void> {
		if (!pcTitle.trim()) throw new Error("Please enter a title.");
		if (!pcPdf) throw new Error("Please choose a PDF file.");

		setPcIngest({
			active: true,
			percent: 0,
			phase: "reading",
			error: null,
		});
		const ingest = new ProcedureChecklistIngestApi(pnpWrapper.ctx);
		try {
			await ingest.ingestCreate({
				file: pcPdf,
				category: pcCategory.trim() || "Uncategorized",
				title: pcTitle.trim(),
				purpose: pcPurpose.trim(),
				effectiveDate: pcEffectiveDate.trim() || undefined,
				fastStart: true,
				onProgress: (r: IngestProgressReport) => {
					setPcIngest((prev) => ({
						...prev,
						active: true,
						percent: r.percent,
						phase: r.phase,
						error: null,
					}));
				},
			});
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setPcIngest((u) => ({
				...u,
				active: false,
				error: msg,
			}));
			throw err;
		}
	}

	async function submitPdEvent(): Promise<void> {
		if (!evTitle.trim()) throw new Error("Please enter a title.");
		if (!evStart) throw new Error("Please choose a start date/time.");

		const web = pnpWrapper.web();
		const list = web.lists.getByTitle("Events");

		let deptProp: string | undefined;
		try {
			const fld = await list.fields
				.getByInternalNameOrTitle("PDDepartment")
				.select("InternalName", "EntityPropertyName")();
			deptProp = fld.EntityPropertyName || fld.InternalName;
		} catch {
			deptProp = undefined;
		}

		const payload: Record<string, unknown> = {
			Title: evTitle.trim(),
			EventDate: evStart,
			EndDate: evEnd || evStart,
			Location: evLocation.trim(),
			fAllDayEvent: evAllDay,
		};
		if (deptProp && department) payload[deptProp] = department;

		await list.items.add(payload);
	}

	async function submitAssignment(): Promise<void> {
		const title = assignmentForm.title.trim();
		if (!title) throw new Error("Please enter a title.");
		const catalogId = assignmentForm.assignmentCatalogId;
		if (!Number.isFinite(catalogId))
			throw new Error("Please choose an AssignmentCatalog item.");
		if (!assignmentForm.audience.length)
			throw new Error(
				"Please choose an audience (department or person).",
			);

		const web = pnpWrapper.web();
		const nowIso = new Date().toISOString();
		const assignedIso = assignmentForm.assignedDate
			? new Date(assignmentForm.assignedDate).toISOString()
			: nowIso;
		const dueIso = assignmentForm.dueDate
			? new Date(assignmentForm.dueDate).toISOString()
			: undefined;

		let assignedById: number | undefined = undefined;
		try {
			const meEmail = (
				pnpWrapper.ctx.pageContext.user.email || ""
			).trim();
			if (meEmail) {
				const ensured = await (
					web as unknown as {
						ensureUser: (email: string) => Promise<{ Id?: number }>;
					}
				).ensureUser(meEmail);
				assignedById =
					typeof ensured?.Id === "number" ? ensured.Id : undefined;
			}
		} catch {
			assignedById = undefined;
		}

		const createForUser = async (
			u: Extract<AudienceEntry, { kind: "user" }>,
		): Promise<{ email: string; assignmentId?: number }> => {
			const addRes = await web.lists
				.getByTitle(ENV.LIST_ASSIGNMENTS)
				.items.add({
					Title: title,
					AssignmentCatalogIdId: catalogId,
					EmployeeEmail: u.email,
					Reason: assignmentForm.reason.trim() || undefined,
					AssignedById: assignedById,
					AssignedDate: assignedIso,
					DueDate: dueIso,
					Statuc: "Not Started",
					CalendarEventCreated: assignmentForm.createCalendarEvent,
					AssignmentEmailSent: assignmentForm.sendEmail,
				});
			const assignmentId =
				typeof (addRes as unknown as { Id?: number }).Id === "number"
					? (addRes as unknown as { Id: number }).Id
					: typeof (addRes as unknown as { data?: { Id?: number } })
								.data?.Id === "number"
						? (addRes as unknown as { data: { Id: number } }).data
								.Id
						: undefined;
			return { email: u.email, assignmentId };
		};

		const createForRole = async (
			r: Extract<AudienceEntry, { kind: "role" }>,
		): Promise<void> => {
			await web.lists.getByTitle(ENV.LIST_ASSIGNMENTS).items.add({
				Title: title,
				AssignmentCatalogIdId: catalogId,
				Reason: [
					assignmentForm.reason.trim(),
					assignmentForm.reason.trim() ? "" : undefined,
					`Audience: Dept=${r.roleKey} (${r.label})`,
				]
					.filter(Boolean)
					.join("\n"),
				AssignedById: assignedById,
				AssignedDate: assignedIso,
				DueDate: dueIso,
				Statuc: "Not Started",
				CalendarEventCreated: assignmentForm.createCalendarEvent,
				AssignmentEmailSent: assignmentForm.sendEmail,
			});
		};

		const createdForUsers: Array<{ email: string; assignmentId?: number }> =
			[];
		const roleAudience: Array<Extract<AudienceEntry, { kind: "role" }>> =
			[];

		for (const a of assignmentForm.audience) {
			if (a.kind === "user") createdForUsers.push(await createForUser(a));
			else {
				roleAudience.push(a);
				await createForRole(a);
			}
		}

		if (assignmentForm.createCalendarEvent) {
			const base = (ENV.FUNCTION_BASE_URL || "").replace(/\/$/, "");
			if (!base) throw new Error("ENV.FUNCTION_BASE_URL is not set.");
			const appId = (ENV.FUNCTION_API_APP_ID || "").trim();
			if (!appId) throw new Error("ENV.FUNCTION_API_APP_ID is not set.");

			const events = createdForUsers
				.filter(
					(c) =>
						typeof c.assignmentId === "number" &&
						Number.isFinite(c.assignmentId) &&
						!!c.email,
				)
				.map((c) => {
					const href = `${window.location.origin}${pnpWrapper.ctx.pageContext.web.serverRelativeUrl}/Lists/${encodeURIComponent(
						ENV.LIST_ASSIGNMENTS,
					)}/DispForm.aspx?ID=${c.assignmentId}`;
					return {
						assigneeEmail: c.email,
						assignmentItemId: c.assignmentId,
						catalogId,
						title,
						dueDate: assignmentForm.dueDate,
						assignmentUrl: href,
					};
				});

			if (events.length === 0) {
				alert(
					"Create Calendar Event is enabled, but no individual people were selected (only departments). Calendar events were not created.",
				);
			} else {
				const url = `${base}/api/CreateAssignmentCalendarEvent`;
				const client: AadHttpClient =
					await pnpWrapper.ctx.aadHttpClientFactory.getClient(appId);
				const response = await client.post(
					url,
					AadHttpClient.configurations.v1,
					{
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ events }),
					},
				);
				if (!response.ok) {
					const errText = await response.text().catch(() => "");
					throw new Error(
						`Failed to create calendar events via function (${response.status}) ${errText}`,
					);
				}
			}
		}

		if (assignmentForm.sendEmail) {
			const base = (ENV.FUNCTION_BASE_URL || "").replace(/\/$/, "");
			if (!base) throw new Error("ENV.FUNCTION_BASE_URL is not set.");
			const appId = (ENV.FUNCTION_API_APP_ID || "").trim();
			if (!appId) throw new Error("ENV.FUNCTION_API_APP_ID is not set.");

			const toEmails = createdForUsers
				.map((c) => c.email)
				.filter(Boolean);
			if (!toEmails.length) {
				alert(
					"Send Email is enabled, but no individual people were selected (only departments). Emails were not sent.",
				);
				return;
			}

			const url = `${base}/api/SendEmail`;
			const client: AadHttpClient =
				await pnpWrapper.ctx.aadHttpClientFactory.getClient(appId);

			const due = assignmentForm.dueDate
				? `Due: ${assignmentForm.dueDate}`
				: "";
			const reason = assignmentForm.reason?.trim()
				? assignmentForm.reason.trim()
				: "";
			const cat =
				assignmentForm.assignmentCatalogTitle?.trim() ||
				assignmentForm.assignmentCatalogKey?.trim() ||
				`Catalog #${catalogId}`;

			const deptNote = roleAudience.length
				? `<div style="margin-top:8px; color:#64748b; font-size:12px;">Note: Department audience selected (${roleAudience
						.map((r) => r.label)
						.join(
							", ",
						)}). Bulk member expansion is not yet enabled in CMS, so only individually-selected people received this email.</div>`
				: "";

			const itemLinks = createdForUsers
				.filter(
					(c) =>
						typeof c.assignmentId === "number" &&
						Number.isFinite(c.assignmentId),
				)
				.map((c) => {
					const href = `${window.location.origin}${pnpWrapper.ctx.pageContext.web.serverRelativeUrl}/Lists/${encodeURIComponent(ENV.LIST_ASSIGNMENTS)}/DispForm.aspx?ID=${c.assignmentId}`;
					return `<li><a href="${href}">Assignment item #${c.assignmentId}</a> (${c.email})</li>`;
				})
				.join("");

			const body = [
				`<div style="font-family:Segoe UI, Arial, sans-serif; font-size:14px;">`,
				`<div><b>New assignment:</b> ${title}</div>`,
				`<div><b>Catalog:</b> ${cat}</div>`,
				due ? `<div><b>${due}</b></div>` : "",
				reason
					? `<div style="margin-top:8px;"><b>Reason:</b><br/>${reason}</div>`
					: "",
				itemLinks
					? `<div style="margin-top:10px;"><b>Links</b><ul>${itemLinks}</ul></div>`
					: "",
				deptNote,
				`</div>`,
			]
				.filter(Boolean)
				.join("");

			const payload = {
				to_email: toEmails,
				subject: `New assignment: ${title}`,
				body,
				content_type: "HTML",
			};

			const response = await client.post(
				url,
				AadHttpClient.configurations.v1,
				{
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);
			if (!response.ok) {
				const errText = await response.text().catch(() => "");
				throw new Error(
					`Failed to send email via function (${response.status}) ${errText}`,
				);
			}
		}
	}

	async function submitBanner(): Promise<void> {
		const web = pnpWrapper.web();
		const payload = {
			Title: "SiteSettings",
			BannerMessage: bannerForm.bannerMessageHtml,
			ShowBanner: bannerForm.showBanner,
		};
		if (bannerItemId) {
			await web.lists
				.getByTitle(ENV.LIST_SITESETTINGS)
				.items.getById(bannerItemId)
				.update(payload);
		} else {
			const res = await web.lists
				.getByTitle(ENV.LIST_SITESETTINGS)
				.items.add(payload);
			const newId =
				typeof (res as unknown as { Id?: number }).Id === "number"
					? (res as unknown as { Id: number }).Id
					: typeof (res as unknown as { data?: { Id?: number } }).data
								?.Id === "number"
						? (res as unknown as { data: { Id: number } }).data.Id
						: undefined;
			setBannerItemId(newId);
		}
	}

	function handleSubmit(): void {
		if (busy) return;
		setBusy(true);
		(async () => {
			if (contentType === "announcement") await submitAnnouncement();
			else if (contentType === "procedureChecklist") {
				await submitProcedureChecklist();
				await new Promise((resolve) => setTimeout(resolve, 2000));
				setPcIngest((u) => ({ ...u, active: false }));
			} else if (contentType === "pdEvent") await submitPdEvent();
			else if (contentType === "assignment") await submitAssignment();
			else if (contentType === "banner") await submitBanner();
			else if (contentType === "assignmentCatalog")
				throw new Error(
					"Assignment Catalog submission is not implemented yet (it will eventually write to multiple lists).",
				);
			onClose();
		})().catch((err: unknown) => {
			const msg = err instanceof Error ? err.message : String(err);
			if (contentType !== "procedureChecklist") {
				alert(msg);
			}
			setBusy(false);
		});
	}

	if (!open) return <></>;

	return (
		<div className="fixed inset-0 z-40">
			<div
				className="absolute inset-0 bg-black/30"
				onClick={busy ? () => {} : onClose}
				aria-hidden="true"
			/>

			<aside className="absolute top-0 right-0 h-full w-[36rem] overflow-y-auto bg-white shadow-2xl">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h2 className="text-base font-semibold text-slate-800">
						New PD Content
					</h2>
					<div className="flex items-center gap-2">
						<button
							className="rounded-md border border-slate-300 px-2 py-1 text-sm"
							onClick={onOpenHelp}
						>
							Help
						</button>
						<button
							className="rounded-md border border-slate-300 px-2 py-1 text-sm"
							onClick={onClose}
							disabled={busy}
						>
							Close
						</button>
					</div>
				</header>

				<div className="space-y-4 p-4">
					<div>
						<label
							className="block text-sm font-medium text-slate-700"
							htmlFor="pd-content-type"
						>
							Content type
						</label>
						<select
							id="pd-content-type"
							value={contentType}
							onChange={(e) =>
								setContentType(e.target.value as ContentTypeKey)
							}
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						>
							<option value="announcement">Announcement</option>
							<option value="assignment">Assignment</option>
							<option value="assignmentCatalog">
								Assignment Catalog
							</option>
							<option value="banner">Banner</option>
							<option value="pdEvent">Event</option>
							<option value="procedureChecklist">
								Procedure Checklist
							</option>
						</select>
					</div>

					{contentType === "announcement" && (
						<>
							<RoleFormField
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
							/>
							<div>
								<label
									className="block text-sm font-medium text-slate-700"
									htmlFor="ann-title"
								>
									Title
								</label>
								<input
									id="ann-title"
									value={annTitle}
									onChange={(e) =>
										setAnnTitle(e.target.value)
									}
									placeholder="Announcement title"
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
								/>
							</div>

							<div className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
								<button
									type="button"
									className="rounded border border-slate-300 px-2 py-1"
									onClick={() => exec("bold")}
								>
									<b>B</b>
								</button>
								<button
									type="button"
									className="rounded border border-slate-300 px-2 py-1"
									onClick={() => exec("italic")}
								>
									<i>I</i>
								</button>
								<button
									type="button"
									className="rounded border border-slate-300 px-2 py-1"
									onClick={() => exec("underline")}
								>
									<u>U</u>
								</button>
								<button
									type="button"
									className="rounded border border-slate-300 px-2 py-1"
									onClick={() => {
										const url = prompt("Image URL");
										if (url) exec("insertImage", url);
									}}
								>
									Image
								</button>
								<button
									type="button"
									className="rounded border border-slate-300 px-2 py-1"
									onClick={() => {
										const url = prompt("Link URL");
										if (url) exec("createLink", url);
									}}
								>
									Link
								</button>
							</div>

							<div
								ref={editorRef}
								role="textbox"
								aria-multiline="true"
								contentEditable={true}
								className="min-h-[220px] w-full rounded-md border border-slate-300 p-3 text-sm focus:outline-none"
								suppressContentEditableWarning
							/>
						</>
					)}

					{contentType === "procedureChecklist" && (
						<>
							<div>
								<label
									className="block text-sm font-medium text-slate-700"
									htmlFor="pc-title"
								>
									Title
								</label>
								<input
									id="pc-title"
									value={pcTitle}
									onChange={(e) => setPcTitle(e.target.value)}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label
									className="block text-sm font-medium text-slate-700"
									htmlFor="pc-purpose"
								>
									Purpose
								</label>
								<input
									id="pc-purpose"
									value={pcPurpose}
									onChange={(e) =>
										setPcPurpose(e.target.value)
									}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label
									className="block text-sm font-medium text-slate-700"
									htmlFor="pc-category"
								>
									Category
								</label>
								<input
									id="pc-category"
									value={pcCategory}
									onChange={(e) =>
										setPcCategory(e.target.value)
									}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="block text-sm font-medium text-slate-700"
										htmlFor="pc-effective"
									>
										Effective date
									</label>
									<input
										id="pc-effective"
										type="date"
										value={pcEffectiveDate}
										onChange={(e) =>
											setPcEffectiveDate(e.target.value)
										}
										className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
									/>
								</div>
								<div>
									<label
										className="block text-sm font-medium text-slate-700"
										htmlFor="pc-pdf"
									>
										<span className="inline-flex items-center gap-2">
											<span>PDF</span>
											<span
												aria-hidden="true"
												className="inline-flex h-5 w-5 items-center justify-center rounded bg-red-50 text-red-700"
												title="PDF document"
											>
												📄
											</span>
										</span>
									</label>
									<input
										id="pc-pdf"
										type="file"
										accept="application/pdf"
										onChange={(e) =>
											setPcPdf(
												e.target.files?.[0] ??
													undefined,
											)
										}
										className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
									/>
									{pcPdf ? (
										<div className="mt-1 text-xs text-slate-600">
											Selected:{" "}
											<span className="font-medium">
												{pcPdf.name}
											</span>
										</div>
									) : (
										<div className="mt-1 text-xs text-slate-500">
											Choose a PDF to upload.
										</div>
									)}
									<ProcedureChecklistIngestProgressBar
										visible={pcIngest.active}
										percent={pcIngest.percent}
										phase={pcIngest.phase}
										error={pcIngest.error}
										onDismissError={() =>
											setPcIngest((u) => ({
												...u,
												error: null,
											}))
										}
									/>
								</div>
							</div>
						</>
					)}

					{contentType === "assignmentCatalog" && (
						<>
							<div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
								This is a draft view only. Submission will
								eventually write to multiple lists
								(`AssignmentCatalog`, `AssignmentSteps`,
								`AssignmentQuizQuestions`).
							</div>
							<AssignmentCatalogView
								value={assignmentCatalogForm}
								onChange={setAssignmentCatalogForm}
							/>
						</>
					)}

					{contentType === "banner" && (
						<>
							<BannerView
								value={bannerForm}
								onChange={setBannerForm}
							/>
							<div className="text-xs text-slate-500">
								Saves to `{ENV.LIST_SITESETTINGS}`.
							</div>
						</>
					)}

					{contentType === "pdEvent" && (
						<>
							<RoleFormField
								value={department}
								onChange={(e) => setDepartment(e.target.value)}
							/>
							<div>
								<label
									className="block text-sm font-medium text-slate-700"
									htmlFor="ev-title"
								>
									Title
								</label>
								<input
									id="ev-title"
									value={evTitle}
									onChange={(e) => setEvTitle(e.target.value)}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label
										className="block text-sm font-medium text-slate-700"
										htmlFor="ev-start"
									>
										Start
									</label>
									<input
										id="ev-start"
										type="datetime-local"
										value={evStart}
										onChange={(e) =>
											setEvStart(e.target.value)
										}
										className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
									/>
								</div>
								<div>
									<label
										className="block text-sm font-medium text-slate-700"
										htmlFor="ev-end"
									>
										End
									</label>
									<input
										id="ev-end"
										type="datetime-local"
										value={evEnd}
										onChange={(e) =>
											setEvEnd(e.target.value)
										}
										className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
									/>
								</div>
							</div>
							<div>
								<label
									className="block text-sm font-medium text-slate-700"
									htmlFor="ev-location"
								>
									Location
								</label>
								<input
									id="ev-location"
									value={evLocation}
									onChange={(e) =>
										setEvLocation(e.target.value)
									}
									list="ev-location-options"
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
								<datalist id="ev-location-options">
									{officeLocationOptions.map((opt) => (
										<option key={opt} value={opt} />
									))}
								</datalist>
							</div>
							<label
								className="flex items-center gap-2 text-sm text-slate-700"
								htmlFor="ev-allday"
							>
								<input
									id="ev-allday"
									type="checkbox"
									checked={evAllDay}
									onChange={(e) =>
										setEvAllDay(e.target.checked)
									}
									className="h-4 w-4 rounded border-slate-300"
								/>
								<span>All day</span>
							</label>
						</>
					)}

					{contentType === "assignment" && (
						<AssignmentView
							pnpWrapper={pnpWrapper}
							value={assignmentForm}
							onChange={setAssignmentForm}
						/>
					)}

					<div className="flex items-center justify-end gap-2 pt-2">
						<button
							className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
							onClick={onClose}
							disabled={busy}
						>
							Cancel
						</button>
						<button
							className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
							onClick={handleSubmit}
							disabled={
								busy || contentType === "assignmentCatalog"
							}
						>
							{contentType === "banner" ? "Save" : "Create"}
						</button>
					</div>
				</div>
			</aside>
		</div>
	);
}
