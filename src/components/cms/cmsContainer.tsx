import * as React from "react";
import { CMSHeader } from "@components/cms/CMSHeader";
import { SectionCard } from "@components/cms/SectionCard";
import { TabButton } from "@components/cms/TabButton";
import { BulkActionsBar } from "@components/cms/BulkActionsBar";
import { MultiSitePicker } from "@components/cms/MultiSitePicker";
import { AnnouncementsManager } from "@components/cms/AnnouncementsManager";
import { EventsManager } from "@components/cms/EventsManager";
import { FormsManager } from "@components/cms/FormsManager";
import { TrainingsManager } from "@components/cms/TrainingsManager";
import { SubmissionsManager } from "@components/cms/SubmissionsManager";
import { AuditLog } from "@components/cms/AuditLog";
import { ContentTable } from "@components/cms/ContentTable";
import { HelpDrawer } from "@components/cms/HelpDrawer";
import { mockRows } from "@components/cms/MockRows";
import { NewPDAnnouncementDrawer } from "@components/cms/NewPDAnnouncementDrawer";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AnnouncementsApi } from "@api/announcements";

type TabKey =
	| "announcements"
	| "events"
	| "forms"
	| "trainings"
	| "submissions"
	| "publish-queue"
	| "audit";

export function PublishQueue({ sites }: { sites: string[] }): JSX.Element {
	const items = mockRows("QUE", 3, { includeStatus: true });
	return <ContentTable kind="Queued" items={items} sites={sites} query="" />;
}

/**
 * CMS.aspx Dashboard — Attorney-Facing Content Management
 * -------------------------------------------------------
 * One Web Part, composed of many lean components (imported from "@components/*").
 * This template shows realistic UI scaffolding with Tailwind, accessible markup,
 * empty hooks for future data (REST/Graph/SP), and placeholder state.
 *
 * Notes
 * - Keep this as a single Web Part to avoid cluttering the editor. The sub-views
 *   are broken into components you can physically place in /src/webparts/sbpubdef-sol/components
 *   and import as: import { AnnouncementsManager } from "@components/AnnouncementsManager"
 * - The data layer is currently mocked. Wire to multiple site collections later.
 * - Tailwind classes only; no additional libraries required.
 */

export const CMSContainer: ({
	pnpWrapper,
}: {
	pnpWrapper: PNPWrapper;
}) => JSX.Element = ({ pnpWrapper }) => {
	const [activeTab, setActiveTab] = React.useState<TabKey>("announcements");
	const [sites, setSites] = React.useState<string[]>(["/sites/PD-Intranet"]);
	const [query, setQuery] = React.useState("");
	const [showHelp, setShowHelp] = React.useState(false);
	const [selectionMode, setSelectionMode] = React.useState<boolean>(false);
	const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
	const [showNewAnn, setShowNewAnn] = React.useState(false);
	const announcementsApi = new AnnouncementsApi(pnpWrapper);

	function clearSelection(): void {
		setSelectedIds([]);
		setSelectionMode(false);
	}

	return (
		<div className="mx-auto max-w-[1200px] p-4">
			<CMSHeader
				onOpenHelp={() => setShowHelp(true)}
				onNewAnnouncement={() => setShowNewAnn(true)}
			/>
			<section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
					<MultiSitePicker value={sites} onChange={setSites} />
					<div className="flex items-center gap-2">
						<input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search titles, owners, tags…"
							className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
							aria-label="Search content"
						/>
						<button
							className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
							onClick={() => setSelectionMode((v) => !v)}
							aria-pressed={selectionMode}
						>
							{selectionMode ? "Exit select" : "Select"}
						</button>
					</div>
				</div>

				{selectionMode && (
					<BulkActionsBar
						count={selectedIds.length}
						onClear={clearSelection}
						onPublish={() => alert("Publish (placeholder)")}
						onUnpublish={() => alert("Unpublish (placeholder)")}
						onDelete={() =>
							confirm("Delete selected? (placeholder)") &&
							clearSelection()
						}
					/>
				)}

				<nav
					className="flex flex-wrap gap-2 px-4 pt-3"
					aria-label="Primary"
				>
					<TabButton
						id="announcements"
						title="Announcements"
						active={activeTab === "announcements"}
						onClick={() => setActiveTab("announcements")}
					/>
					<TabButton
						id="events"
						title="Events"
						active={activeTab === "events"}
						onClick={() => setActiveTab("events")}
					/>
					<TabButton
						id="forms"
						title="Forms"
						active={activeTab === "forms"}
						onClick={() => setActiveTab("forms")}
					/>
					<TabButton
						id="trainings"
						title="Training"
						active={activeTab === "trainings"}
						onClick={() => setActiveTab("trainings")}
					/>
					<TabButton
						id="submissions"
						title="User Submissions"
						active={activeTab === "submissions"}
						onClick={() => setActiveTab("submissions")}
					/>
					<TabButton
						id="publish-queue"
						title="Publish Queue"
						active={activeTab === "publish-queue"}
						onClick={() => setActiveTab("publish-queue")}
					/>
					<TabButton
						id="audit"
						title="Audit Log"
						active={activeTab === "audit"}
						onClick={() => setActiveTab("audit")}
					/>
				</nav>

				<div className="p-4">
					{activeTab === "announcements" && (
						<SectionCard title="PD Announcement (Site Pages)">
							<AnnouncementsManager
								sites={sites}
								query={query}
								selectionMode={selectionMode}
								selectedIds={selectedIds}
								onToggleSelect={(id) =>
									setSelectedIds((prev) =>
										prev.includes(id)
											? prev.filter((x) => x !== id)
											: [...prev, id],
									)
								}
								announcementsApi={announcementsApi}
							/>
						</SectionCard>
					)}

					{activeTab === "events" && (
						<SectionCard title="PD Event (Event-based)">
							<EventsManager
								sites={sites}
								query={query}
								selectionMode={selectionMode}
								selectedIds={selectedIds}
								onToggleSelect={(id) =>
									setSelectedIds((prev) =>
										prev.includes(id)
											? prev.filter((x) => x !== id)
											: [...prev, id],
									)
								}
							/>
						</SectionCard>
					)}

					{activeTab === "forms" && (
						<SectionCard title="PD Form (List Items)">
							<FormsManager
								sites={sites}
								query={query}
								selectionMode={selectionMode}
								selectedIds={selectedIds}
								onToggleSelect={(id) =>
									setSelectedIds((prev) =>
										prev.includes(id)
											? prev.filter((x) => x !== id)
											: [...prev, id],
									)
								}
							/>
						</SectionCard>
					)}

					{activeTab === "trainings" && (
						<SectionCard title="Training (Events / Pages)">
							<TrainingsManager sites={sites} query={query} />
						</SectionCard>
					)}

					{activeTab === "submissions" && (
						<SectionCard title="User Form Submissions">
							<SubmissionsManager sites={sites} query={query} />
						</SectionCard>
					)}

					{activeTab === "publish-queue" && (
						<SectionCard title="Publish Queue">
							<PublishQueue sites={sites} />
						</SectionCard>
					)}

					{activeTab === "audit" && (
						<SectionCard title="Audit Log">
							<AuditLog />
						</SectionCard>
					)}
				</div>
			</section>
			<HelpDrawer open={showHelp} onClose={() => setShowHelp(false)} />
			<NewPDAnnouncementDrawer
				open={showNewAnn}
				onClose={() => setShowNewAnn(false)}
				onOpenHelp={() => setShowHelp(true)}
				onSubmit={(payload) => {
					// payload will be { title, department, html }
					function stripToText(html: string, maxLen = 240): string {
						const div = document.createElement("div");
						div.innerHTML = html;
						// remove <img>, <video>, etc.
						div.querySelectorAll(
							"img,video,source,iframe,script,style",
						).forEach((el) => el.remove());
						const text =
							div.textContent?.replace(/\s+/g, " ").trim() ?? "";
						return text.length > maxLen
							? text.slice(0, maxLen - 1) + "…"
							: text;
					}
					payload.html = stripToText(payload.html); // to do: use images & styles (compatible w/ sharpeoint email news webparts)
					setTimeout(
						async () => await announcementsApi.create(payload),
					);
					setShowNewAnn(false);
				}}
			/>
		</div>
	);
};
