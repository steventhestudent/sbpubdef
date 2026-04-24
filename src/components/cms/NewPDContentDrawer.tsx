import * as React from "react";
import RoleFormField from "@utils/rolebased/RoleFormField";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AnnouncementsApi } from "@api/announcements";
import { AssignmentView, type AssignmentFormState } from "./NewContentDrawerViews/AssignmentView";
import type { AudienceEntry, ContentTypeKey } from "./NewContentDrawerViews/types";

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
	const announcementsApi = React.useMemo(
		() => new AnnouncementsApi(pnpWrapper),
		[pnpWrapper],
	);

	const [contentType, setContentType] =
		React.useState<ContentTypeKey>(defaultContentType);
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

	// PD Event
	const [evTitle, setEvTitle] = React.useState("");
	const [evStart, setEvStart] = React.useState("");
	const [evEnd, setEvEnd] = React.useState("");
	const [evLocation, setEvLocation] = React.useState("");
	const [evAllDay, setEvAllDay] = React.useState(false);

	// Assignment
	const [assignmentForm, setAssignmentForm] = React.useState<AssignmentFormState>({
		title: "",
		assignmentCatalogId: "",
		audience: [],
		reason: "",
		assignedDate: "",
		dueDate: "",
		createCalendarEvent: false,
		sendEmail: false,
	});

	React.useEffect(() => {
		if (!open) return;
		setBusy(false);
		setContentType(defaultContentType);
		setDepartment("EVERYONE");

		setAnnTitle("");
		if (editorRef.current) editorRef.current.innerHTML = "";

		setPcTitle("");
		setPcPurpose("");
		setPcCategory("");
		setPcEffectiveDate("");
		setPcPdf(undefined);

		setEvTitle("");
		setEvStart("");
		setEvEnd("");
		setEvLocation("");
		setEvAllDay(false);

		setAssignmentForm({
			title: "",
			assignmentCatalogId: "",
			audience: [],
			reason: "",
			assignedDate: "",
			dueDate: "",
			createCalendarEvent: false,
			sendEmail: false,
		});
	}, [open, defaultContentType]);

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

	async function uploadToUserUploads(
		file: File,
		relativeFolder: string, // ex: "resource/LOP/ProcedureChecklist"
	): Promise<{ absoluteUrl: string; serverRelativeUrl: string }> {
		const web = pnpWrapper.web();
		const webServerRel =
			pnpWrapper.ctx.pageContext.web.serverRelativeUrl || "";
		const normalizedWebServerRel = webServerRel.endsWith("/")
			? webServerRel.slice(0, -1)
			: webServerRel;
		const fileName = file.name.replace(/[\\/]/g, "-");
		const folderServerRel =
			`${normalizedWebServerRel}/user_uploads/${relativeFolder}`.replace(
				/\/+/g,
				"/",
			);

		try {
			await web.folders.addUsingPath(folderServerRel);
		} catch {
			// ignore
		}

		await web
			.getFolderByServerRelativePath(folderServerRel)
			.files.addUsingPath(fileName, file, { Overwrite: true });

		const serverRelativeUrl = `${folderServerRel}/${encodeURIComponent(fileName)}`;
		const absoluteUrl = new URL(
			serverRelativeUrl,
			window.location.origin,
		).toString();
		return { absoluteUrl, serverRelativeUrl };
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

		const { absoluteUrl } = await uploadToUserUploads(
			pcPdf,
			"resource/LOP/ProcedureChecklist",
		);

		await pnpWrapper
			.web()
			.lists.getByTitle(ENV.LIST_PROCEDURECHECKLIST)
			.items.add({
				Title: pcTitle.trim(),
				Purpose: pcPurpose.trim(),
				Category: pcCategory.trim(),
				DocumentURL: absoluteUrl,
				Filename: pcPdf.name,
				EffectiveDate: pcEffectiveDate || undefined,
			});
	}

	async function submitPdEvent(): Promise<void> {
		if (!evTitle.trim()) throw new Error("Please enter a title.");
		if (!evStart) throw new Error("Please choose a start date/time.");

		await pnpWrapper
			.web()
			.lists.getByTitle("Events")
			.items.add({
				Title: evTitle.trim(),
				EventDate: evStart,
				EndDate: evEnd || evStart,
				Location: evLocation.trim(),
				fAllDayEvent: evAllDay,
				PDDepartment: department,
			});
	}

	async function submitAssignment(): Promise<void> {
		const title = assignmentForm.title.trim();
		if (!title) throw new Error("Please enter a title.");
		const catalogId = Number(assignmentForm.assignmentCatalogId);
		if (!Number.isFinite(catalogId))
			throw new Error("AssignmentCatalogId must be a number.");
		if (!assignmentForm.audience.length)
			throw new Error("Please choose an audience (department or person).");

		const web = pnpWrapper.web();
		const listTitle = ENV.LIST_ASSIGNMENTS || "Assignments1";
		const nowIso = new Date().toISOString();

		const createForUser = async (u: Extract<AudienceEntry, { kind: "user" }>): Promise<void> => {
			let employeeId: number | undefined = undefined;
			try {
				const ensured = await (web as unknown as { ensureUser: (email: string) => Promise<{ Id?: number }> }).ensureUser(u.email);
				employeeId = typeof ensured?.Id === "number" ? ensured.Id : undefined;
			} catch {
				employeeId = undefined;
			}
			await web.lists.getByTitle(listTitle).items.add({
				Title: title,
				AssignmentCatalogId: catalogId,
				EmployeeId: employeeId,
				EmployeeEmail: u.email,
				Reason: assignmentForm.reason.trim() || undefined,
				AssignedBy: pnpWrapper.ctx.pageContext.user.displayName,
				AssignedDate: assignmentForm.assignedDate || nowIso,
				DueDate: assignmentForm.dueDate || undefined,
				Statuc: "Not Started",
				CalendarEventCreated: assignmentForm.createCalendarEvent,
				AssignmentEmailSent: assignmentForm.sendEmail,
			});
		};

		const createForRole = async (r: Extract<AudienceEntry, { kind: "role" }>): Promise<void> => {
			await web.lists.getByTitle(listTitle).items.add({
				Title: title,
				AssignmentCatalogId: catalogId,
				Reason: [
					assignmentForm.reason.trim(),
					assignmentForm.reason.trim() ? "" : undefined,
					`Audience: Dept=${r.roleKey} (${r.label})`,
				]
					.filter(Boolean)
					.join("\n"),
				AssignedBy: pnpWrapper.ctx.pageContext.user.displayName,
				AssignedDate: assignmentForm.assignedDate || nowIso,
				DueDate: assignmentForm.dueDate || undefined,
				Statuc: "Not Started",
				CalendarEventCreated: assignmentForm.createCalendarEvent,
				AssignmentEmailSent: assignmentForm.sendEmail,
			});
		};

		for (const a of assignmentForm.audience) {
			if (a.kind === "user") await createForUser(a);
			else await createForRole(a);
		}
	}

	function handleSubmit(): void {
		if (busy) return;
		setBusy(true);
		(async () => {
			if (contentType === "announcement") await submitAnnouncement();
			else if (contentType === "procedureChecklist")
				await submitProcedureChecklist();
			else if (contentType === "pdEvent") await submitPdEvent();
			else if (contentType === "assignment") await submitAssignment();
			onClose();
		})().catch((err: unknown) => {
			const msg = err instanceof Error ? err.message : String(err);
			alert(msg);
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
							<option value="procedureChecklist">
								Procedure checklist (PDF)
							</option>
							<option value="pdEvent">PD event</option>
							<option value="assignment">Assignment</option>
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
										PDF
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
								</div>
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
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
								/>
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
							disabled={busy}
						>
							Create
						</button>
					</div>
				</div>
			</aside>
		</div>
	);
}
