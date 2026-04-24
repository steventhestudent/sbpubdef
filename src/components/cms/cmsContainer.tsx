import * as React from "react";
import { CMSHeader } from "@components/cms/CMSHeader";
import { SectionCard } from "@components/cms/SectionCard";
import { TabButton } from "@components/cms/TabButton";
import { BulkActionsBar } from "@components/cms/BulkActionsBar";
import { MultiSitePicker } from "@components/cms/MultiSitePicker";

import { AnnouncementsManager } from "@components/cms/SectionCards/AnnouncementsManager";
import { AssignmentsManager } from "@components/cms/SectionCards/AssignmentsManager";
import { AssignmentCatalogManager } from "@components/cms/SectionCards/AssignmentCatalogManager";
import { BannerManager } from "@components/cms/SectionCards/BannerManager";
import { EventsManager } from "@components/cms/SectionCards/EventsManager";
import { FormsManager } from "@components/cms/SectionCards/FormsManager";
import { SubmissionsManager } from "@components/cms/SectionCards/SubmissionsManager";

import { AuditLog } from "@components/cms/SectionCards/AuditLog";
import { HelpDrawer } from "@components/cms/HelpDrawer";
import { NewPDContentDrawer } from "@components/cms/NewPDContentDrawer";
import { PNPWrapper } from "@utils/PNPWrapper";
import { AnnouncementsApi } from "@api/announcements";

type TabKey =
	| "announcements"
	| "assignments"
	| "assignmentCatalog"
	| "banner"
	| "audit"
	| "events"
	| "forms"
	| "submissions";

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
	// kept for other parts of CMS that load announcements
	const announcementsApi = new AnnouncementsApi(pnpWrapper);

	function clearSelection(): void {
		setSelectedIds([]);
		setSelectionMode(false);
	}

	function onSelectAll(ids: string[], select: boolean): void {
		if (!ids.length) return;
		setSelectedIds((prev) => {
			if (select) {
				const set = new Set(prev);
				for (const id of ids) set.add(id);
				return Array.from(set);
			}
			const remove = new Set(ids);
			return prev.filter((x) => !remove.has(x));
		});
	}

	async function deleteSelected(): Promise<void> {
		if (!selectedIds.length) return;
		if (!confirm(`Delete ${selectedIds.length} selected item(s)?`)) return;

		const ids = selectedIds
			.map((s) => Number(s))
			.filter((n) => Number.isFinite(n) && n > 0);

		async function resolveListTitle(title: string): Promise<string> {
			const key = title.trim();
			const web = pnpWrapper.web();
			try {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				await web.lists.getByTitle(key).select("Id")();
				return key;
			} catch {
				// fall through
			}
			const all: Array<{ Title: string }> = await web.lists.select("Title")();

			const normalizeTitle = (s: string): string =>
				s.replace(/\s+/g, "").trim().toLowerCase();

			const primaryCandidates = [
				key,
				key.replace(/([a-zA-Z])(\d+)/g, "$1 $2"),
			].filter(Boolean);
			const strippedFallback = key.replace(/\d+$/, "");

			for (const c of primaryCandidates) {
				const exact = all.find(
					(l) => String(l.Title).toLowerCase() === c.toLowerCase(),
				);
				if (exact?.Title) return exact.Title;
			}

			for (const n of primaryCandidates.map(normalizeTitle)) {
				const hit = all.find((l) => normalizeTitle(String(l.Title)) === n);
				if (hit?.Title) return hit.Title;
			}

			if (strippedFallback) {
				const exactStripped = all.find(
					(l) =>
						String(l.Title).toLowerCase() === strippedFallback.toLowerCase(),
				);
				if (exactStripped?.Title) return exactStripped.Title;
				const strippedNorm = normalizeTitle(strippedFallback);
				const starts = all.find((l) =>
					normalizeTitle(String(l.Title)).startsWith(strippedNorm),
				);
				if (starts?.Title) return starts.Title;
			}

			return key;
		}

		try {
			const web = pnpWrapper.web();

			if (activeTab === "assignments") {
				const listTitle = await resolveListTitle(
					ENV.LIST_ASSIGNMENTS || "Assignments1",
				);
				await Promise.allSettled(
					ids.map((id) =>
						web.lists.getByTitle(listTitle).items.getById(id).delete(),
					),
				);
			} else if (activeTab === "assignmentCatalog") {
				await Promise.allSettled(
					ids.map((id) =>
						web.lists
							.getByTitle(ENV.LIST_ASSIGNMENTCATALOG)
							.items.getById(id)
							.delete(),
					),
				);
			} else if (activeTab === "submissions") {
				await Promise.allSettled(
					ids.map((id) =>
						web.lists
							.getByTitle(ENV.LIST_ASSIGNMENTQUIZATTEMPTS)
							.items.getById(id)
							.delete(),
					),
				);
			} else if (activeTab === "events") {
				await Promise.allSettled(
					ids.map((id) =>
						web.lists.getByTitle("Events").items.getById(id).delete(),
					),
				);
			} else if (activeTab === "banner") {
				const listTitle = ENV.LIST_SITESETTINGS || "SiteSettings";
				await Promise.allSettled(
					ids.map((id) =>
						web.lists.getByTitle(listTitle).items.getById(id).delete(),
					),
				);
			} else {
				alert("Delete is not implemented for this section yet.");
				return;
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			alert(msg || "Delete failed.");
			return;
		}

		clearSelection();
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
							className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
						onDelete={() => {
							deleteSelected().catch(() => {});
						}}
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
						id="assignments"
						title="Assignments"
						active={activeTab === "assignments"}
						onClick={() => setActiveTab("assignments")}
					/>
					<TabButton
						id="assignmentCatalog"
						title="Assignment Catalog"
						active={activeTab === "assignmentCatalog"}
						onClick={() => setActiveTab("assignmentCatalog")}
					/>
					<TabButton
						id="audit"
						title="Audit Log"
						active={activeTab === "audit"}
						onClick={() => setActiveTab("audit")}
					/>
					<TabButton
						id="banner"
						title="Banner"
						active={activeTab === "banner"}
						onClick={() => setActiveTab("banner")}
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
						id="submissions"
						title="User Submissions"
						active={activeTab === "submissions"}
						onClick={() => setActiveTab("submissions")}
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
								onSelectAll={onSelectAll}
								announcementsApi={announcementsApi}
							/>
						</SectionCard>
					)}

					{activeTab === "assignments" && (
						<SectionCard title="Assignments (List Items)">
							<AssignmentsManager
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
								onSelectAll={onSelectAll}
								pnpWrapper={pnpWrapper}
							/>
						</SectionCard>
					)}

					{activeTab === "assignmentCatalog" && (
						<SectionCard title="Assignment Catalog">
							<AssignmentCatalogManager
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
								onSelectAll={onSelectAll}
								pnpWrapper={pnpWrapper}
							/>
						</SectionCard>
					)}

					{activeTab === "audit" && (
						<SectionCard title="Audit Log">
							<AuditLog />
						</SectionCard>
					)}

					{activeTab === "banner" && (
						<SectionCard title="Banner (Site Settings)">
							<BannerManager
								pnpWrapper={pnpWrapper}
								selectionMode={selectionMode}
								selectedIds={selectedIds}
								onToggleSelect={(id) =>
									setSelectedIds((prev) =>
										prev.includes(id)
											? prev.filter((x) => x !== id)
											: [...prev, id],
									)
								}
								onSelectAll={onSelectAll}
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
								onSelectAll={onSelectAll}
								pnpWrapper={pnpWrapper}
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
								onSelectAll={onSelectAll}
							/>
						</SectionCard>
					)}

					{activeTab === "submissions" && (
						<SectionCard title="User Form Submissions">
							<SubmissionsManager
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
								onSelectAll={onSelectAll}
								pnpWrapper={pnpWrapper}
							/>
						</SectionCard>
					)}
				</div>
			</section>
			<HelpDrawer open={showHelp} onClose={() => setShowHelp(false)} />
			<NewPDContentDrawer
				open={showNewAnn}
				onClose={() => setShowNewAnn(false)}
				onOpenHelp={() => setShowHelp(true)}
				pnpWrapper={pnpWrapper}
			/>
		</div>
	);
};
