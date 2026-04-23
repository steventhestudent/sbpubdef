import * as React from "react";
import {
	COMPLIANCE_DEMO_HEADLINE,
	COMPLIANCE_DEMO_RESOURCES,
} from "@data/portalResourcesCompliance.mock";
import { IT_DEMO_BANNER, IT_DEMO_TILES } from "@data/portalResourcesIT.mock";
import { HR_DEMO_INTRO, HR_DEMO_LINKS } from "@data/portalResourcesHR.mock";
import {
	GUEST_DEMO_LINKS,
	GUEST_DEMO_NOTE,
} from "@data/portalResourcesGuest.mock";

function openHref(href: string): void {
	window.open(href, "_blank", "noopener,noreferrer");
}

export function ComplianceResourcesPanel(): JSX.Element {
	return (
		<div className="m-4 space-y-4 border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-3 text-slate-900 shadow-sm">
			<div className="border-l-4 border-slate-500 pl-3">
				<p className="text-sm leading-relaxed text-slate-700">
					{COMPLIANCE_DEMO_HEADLINE}
				</p>
			</div>
			<ul className="grid gap-3 sm:grid-cols-2">
				{COMPLIANCE_DEMO_RESOURCES.map((r) => (
					<li key={r.id}>
						<button
							type="button"
							onClick={() => openHref(r.href)}
							className="flex h-full w-full flex-col rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-slate-400 hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none"
						>
							<span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
								{r.tag}
							</span>
							<span className="mt-1 font-medium text-slate-900">
								{r.title}
							</span>
							<span className="mt-1 text-xs text-slate-600">
								{r.summary}
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

const statusStyles: Record<
	"operational" | "maintenance" | "planned",
	string
> = {
	operational: "bg-emerald-100 text-emerald-900 ring-emerald-600/30",
	maintenance: "bg-orange-100 text-orange-950 ring-orange-600/30",
	planned: "bg-sky-100 text-sky-950 ring-sky-600/30",
};

const statusLabel: Record<
	"operational" | "maintenance" | "planned",
	string
> = {
	operational: "Operational",
	maintenance: "Maintenance window",
	planned: "Planned change",
};

export function ITResourcesPanel({ cmsHref }: { cmsHref: string }): JSX.Element {
	return (
		<div className="m-4 space-y-4 rounded-lg border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<p className="max-w-2xl text-sm leading-relaxed text-slate-600">
					{IT_DEMO_BANNER}
				</p>
				<a
					href={cmsHref}
					className="shrink-0 rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
				>
					CMS
				</a>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				{IT_DEMO_TILES.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => openHref(t.href)}
						className="flex flex-col rounded-md border border-slate-200 bg-slate-50/80 px-3 py-3 text-left text-sm transition hover:border-slate-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
					>
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium text-slate-900">
								{t.title}
							</span>
							<span
								className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusStyles[t.status]}`}
							>
								{statusLabel[t.status]}
							</span>
						</div>
						<span className="mt-2 text-xs leading-relaxed text-slate-600">
							{t.blurb}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

const hrIconGlyph: Record<
	"people" | "heart" | "calendar" | "doc",
	string
> = {
	people: "◎",
	heart: "♥",
	calendar: "▦",
	doc: "▤",
};

export function HRResourcesPanel(): JSX.Element {
	return (
		<div className="m-4 overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-indigo-50/60">
			<div className="border-b border-rose-100 bg-white/70 px-4 py-3">
				<p className="text-sm text-slate-700">{HR_DEMO_INTRO}</p>
			</div>
			<ol className="divide-y divide-rose-100">
				{HR_DEMO_LINKS.map((link, i) => (
					<li key={link.id}>
						<button
							type="button"
							onClick={() => openHref(link.href)}
							className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-rose-50/90 focus-visible:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-inset focus-visible:outline-none"
						>
							<span
								className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg text-rose-800"
								aria-hidden
							>
								{hrIconGlyph[link.icon]}
							</span>
							<span className="min-w-0">
								<span className="block text-xs font-medium text-rose-700/80">
									{String(i + 1).padStart(2, "0")} — Quick link
								</span>
								<span className="mt-0.5 block font-medium text-slate-900">
									{link.label}
								</span>
								<span className="mt-1 block text-xs leading-relaxed text-slate-600">
									{link.description}
								</span>
							</span>
						</button>
					</li>
				))}
			</ol>
		</div>
	);
}

export function GuestResourcesPanel(): JSX.Element {
	return (
		<div className="mx-4 my-3 rounded border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
			<p className="text-xs text-slate-500">{GUEST_DEMO_NOTE}</p>
			<ul className="mt-3 space-y-2">
				{GUEST_DEMO_LINKS.map((l) => (
					<li key={l.id}>
						<button
							type="button"
							onClick={() => openHref(l.href)}
							className="w-full rounded border border-transparent px-1 py-1 text-left font-medium text-blue-800 underline-offset-2 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
						>
							{l.title}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
