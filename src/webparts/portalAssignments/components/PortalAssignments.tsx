import * as React from "react";

import type { IPortalAssignmentsProps } from "./IPortalAssignmentsProps";

import { Collapsible } from "@components/Collapsible";
import {
	PDRoleBasedSelect,
	BlankGuestView,
} from "@components/PDRoleBasedSelect";
import type RoleBasedViewProps from "@type/RoleBasedViewProps";
import { AssignmentsSpService } from "../services/AssignmentsSpService";
import type { UserAssignmentItem } from "../types/AssignmentTypes";
import { AssignmentFlow } from "./AssignmentFlow";

function getAssignmentIdFromLocation(): number | undefined {
	// Supported:
	// - ?assignmentId=123
	// - ?a=123
	// - #assignmentId=123
	// - #a=123
	const parse = (s: string): number | undefined => {
		if (!s) return undefined;
		const m = s.match(/(?:assignmentId|a)\s*=\s*(\d+)/i);
		if (!m) return undefined;
		const n = Number(m[1]);
		return Number.isFinite(n) ? n : undefined;
	};
	return (
		parse(window.location.search) ??
		parse(window.location.hash) ??
		undefined
	);
}

function assignmentsPageUrl(ctx: IPortalAssignmentsProps["context"]): string {
	const webRel = ctx.pageContext.web.serverRelativeUrl || "";
	const base = `${window.location.origin}${webRel}`;
	return `${base.replace(/\/$/, "")}/SitePages/Assignments.aspx`;
}

function isAdmin(groups: string[]): boolean {
	const set = new Set(groups.map((g) => g.toLowerCase()));
	return (
		set.has("it") ||
		set.has("hr") ||
		set.has("complianceofficer") ||
		set.has("compliance officer")
	);
}

function MyAssignmentsView({
	userGroupNames,
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	const email = (pnpWrapper.ctx.pageContext.user.email || "").trim();
	const svc = React.useMemo(() => new AssignmentsSpService(pnpWrapper), [pnpWrapper]);

	const [items, setItems] = React.useState<UserAssignmentItem[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [err, setErr] = React.useState<string | undefined>(undefined);

	const [selectedId, setSelectedId] = React.useState<number | undefined>(() =>
		getAssignmentIdFromLocation(),
	);
	const [selected, setSelected] = React.useState<UserAssignmentItem | undefined>(
		undefined,
	);

	const pageUrl = assignmentsPageUrl(pnpWrapper.ctx);
	const admin = isAdmin(userGroupNames);

	const loadMine = React.useCallback(async () => {
		if (!email) {
			setItems([]);
			setLoading(false);
			setErr("No user email found in page context.");
			return;
		}
		setLoading(true);
		setErr(undefined);
		try {
			const rows = await svc.getMyAssignments(email, 200);
			setItems(rows);
		} catch (e: unknown) {
			const msg =
				e instanceof Error ? e.message : "Failed to load assignments.";
			setErr(msg);
		} finally {
			setLoading(false);
		}
	}, [email, svc]);

	React.useEffect(() => {
		pnpWrapper.loadCachedThenFresh(() => loadMine());
	}, [loadMine, pnpWrapper]);

	React.useEffect(() => {
		const onHash = (): void => setSelectedId(getAssignmentIdFromLocation());
		window.addEventListener("hashchange", onHash);
		return () => window.removeEventListener("hashchange", onHash);
	}, []);

	React.useEffect(() => {
		let cancelled = false;
		(async (): Promise<void> => {
			if (!selectedId) {
				setSelected(undefined);
				return;
			}
			try {
				const a = await svc.getAssignmentById(selectedId);
				if (cancelled) return;
				// Soft security: only show if it matches current user's email
				if (a && a.employeeEmail && a.employeeEmail.toLowerCase() !== email.toLowerCase()) {
					setErr("That assignment is not assigned to your account.");
					setSelected(undefined);
					return;
				}
				setSelected(a);
			} catch (e: unknown) {
				const msg =
					e instanceof Error ? e.message : "Failed to load selected assignment.";
				setErr(msg);
				setSelected(undefined);
			}
		})().catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [email, selectedId, svc]);

	if (selected) {
		return (
			<AssignmentFlow
				svc={svc}
				assignment={selected}
				onBack={() => {
					setSelectedId(undefined);
					setSelected(undefined);
					// keep URL clean on page-back
					if (window.location.hash) window.location.hash = "";
				}}
				onUpdated={(next) => {
					setSelected(next);
					setItems((prev) =>
						prev.map((p) => (p.id === next.id ? next : p)),
					);
				}}
			/>
		);
	}

	return (
		<div className="p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-base font-semibold text-slate-900">
						My Assignments
					</div>
					<div className="mt-1 text-sm text-slate-600">
						Signed in as <span className="font-medium">{email || "—"}</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<a
						className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
						href={pageUrl}
					>
						Open Assignments Page
					</a>
					{admin ? (
						<a
							className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
							href={`${window.location.origin}${pnpWrapper.ctx.pageContext.web.serverRelativeUrl}/Lists/${ENV.LIST_ASSIGNMENTS || "Assignments"}/AllItems.aspx`}
							target="_blank"
							rel="noreferrer"
						>
							View Assignments List
						</a>
					) : null}
				</div>
			</div>

			{err ? (
				<div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					{err}
				</div>
			) : null}

			{loading ? (
				<div className="mt-3 text-sm text-slate-600">Loading…</div>
			) : items.length === 0 ? (
				<div className="mt-3 text-sm text-slate-500 italic">
					No assignments found.
				</div>
			) : (
				<div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
					<table className="min-w-full divide-y divide-slate-200">
						<thead className="bg-slate-50">
							<tr>
								{["Assignment", "Due", "Status", "Progress", ""].map(
									(h) => (
										<th
											key={h}
											className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
										>
											{h}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-200">
							{items.map((a) => {
								const due = a.dueDate ? new Date(a.dueDate) : undefined;
								const dueLabel =
									due && !Number.isNaN(due.getTime())
										? due.toLocaleDateString()
										: "—";
								const progress = a.percentComplete ?? 0;
								const openHref = `${pageUrl}#assignmentId=${a.id}`;
								return (
									<tr key={a.id} className="hover:bg-slate-50">
										<td className="px-3 py-3 text-sm font-medium text-slate-900">
											{a.title}
										</td>
										<td className="px-3 py-3 text-sm text-slate-700">
											{dueLabel}
										</td>
										<td className="px-3 py-3 text-sm text-slate-700">
											{a.status ?? "—"}
										</td>
										<td className="px-3 py-3 text-sm text-slate-700">
											{progress}%
										</td>
										<td className="px-3 py-3 text-right">
											<a
												className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
												href={openHref}
											>
												Open
											</a>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export default function PortalAssignments(
	props: IPortalAssignmentsProps,
): JSX.Element {
	return (
		<Collapsible instanceId={props.context.instanceId} title="Assignments">
			<PDRoleBasedSelect
				ctx={props.context}
				views={{
					EVERYONE: BlankGuestView,
					PDINTRANET: MyAssignmentsView,
					ATTORNEY: MyAssignmentsView,
					CDD: MyAssignmentsView,
					LOP: MyAssignmentsView,
					TRIALSUPERVISOR: MyAssignmentsView,
					COMPLIANCEOFFICER: MyAssignmentsView,
					HR: MyAssignmentsView,
					IT: MyAssignmentsView,
				}}
			/>
		</Collapsible>
	);
}
