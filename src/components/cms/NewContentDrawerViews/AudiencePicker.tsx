import * as React from "react";
import "@pnp/sp/site-users/web";

import { PNPWrapper } from "@utils/PNPWrapper";
import { ENV_ROLE_DISPLAY } from "@utils/rolebased/ENV";
import ENV_ROLE from "@utils/rolebased/ENV/ENV_ROLE";
import type { AudienceEntry } from "./types";

type Suggestion =
	| { kind: "role"; roleKey: string; label: string }
	| { kind: "user"; email: string; label: string };

type RoleSuggestion = Extract<Suggestion, { kind: "role" }>;

function norm(s: string): string {
	return s.trim().toLowerCase();
}

function uniqBy<T>(arr: T[], key: (v: T) => string): T[] {
	const seen = new Set<string>();
	const out: T[] = [];
	for (const v of arr) {
		const k = key(v);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(v);
	}
	return out;
}

export function AudiencePicker({
	pnpWrapper,
	value,
	onChange,
	label = "Audience",
	placeholder = "role or person…",
}: {
	pnpWrapper: PNPWrapper;
	value: AudienceEntry[];
	onChange: (next: AudienceEntry[]) => void;
	label?: string;
	placeholder?: string;
}): JSX.Element {
	const [query, setQuery] = React.useState("");
	const [activeIdx, setActiveIdx] = React.useState(0);
	const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
	const [loading, setLoading] = React.useState(false);

	const selectedKeys = React.useMemo(() => {
		return new Set(
			value.map((v) =>
				v.kind === "role" ? `role:${v.roleKey}` : `user:${v.email}`,
			),
		);
	}, [value]);

	const roleSuggestions = React.useMemo((): RoleSuggestion[] => {
		const q = norm(query);
		if (q.length < 2) return [];
		const roleKeys = ENV.ROLESELECT_ORDER.split(" ");
		return roleKeys
			.map((rk) => ({ rk, label: ENV_ROLE_DISPLAY(rk) }))
			.filter(({ rk, label }) => {
				if (!rk) return false;
				const hay = `${rk} ${label} ${ENV_ROLE(rk)}`;
				return norm(hay).includes(q);
			})
			.slice(0, 8)
			.map(({ rk, label }) => ({
				kind: "role" as const,
				roleKey: rk,
				label,
			}));
	}, [query]);

	React.useEffect(() => {
		let cancelled = false;
		const q = norm(query);
		if (q.length < 2) {
			setSuggestions(roleSuggestions);
			return;
		}
		setLoading(true);

		(async () => {
			const web = pnpWrapper.web();
			// Site users search is "good enough" and doesn't require Graph scopes.
			// If it fails (permissions/feature), we'll still show role suggestions.
			let users: Suggestion[] = [];
			try {
				const safe = q.replace(/'/g, "''");
				const rows: Array<{
					Email?: string;
					Title?: string;
					LoginName?: string;
				}> = await (
					web as unknown as {
						siteUsers: {
							select: (...fields: string[]) => {
								filter: (f: string) => {
									top: (
										n: number,
									) => () => Promise<
										Array<{
											Email?: string;
											Title?: string;
											LoginName?: string;
										}>
									>;
								};
							};
						};
					}
				).siteUsers
					.select("Email", "Title", "LoginName")
					.filter(
						`substringof('${safe}',Title) or substringof('${safe}',Email) or substringof('${safe}',LoginName)`,
					)
					.top(10)();
				users = (rows || [])
					.map((u) => {
						const email = (u.Email || "").trim();
						const title = (u.Title || "").trim();
						if (!email) return undefined;
						return {
							kind: "user" as const,
							email,
							label: title ? `${title} (${email})` : email,
						};
					})
					.filter(Boolean) as Suggestion[];
			} catch {
				users = [];
			}

			const combined = uniqBy(
				[...roleSuggestions, ...users].filter((s) => {
					const key =
						s.kind === "role"
							? `role:${s.roleKey}`
							: `user:${s.email}`;
					return !selectedKeys.has(key);
				}),
				(s) =>
					s.kind === "role" ? `role:${s.roleKey}` : `user:${s.email}`,
			);

			if (cancelled) return;
			setSuggestions(combined);
			setActiveIdx(0);
			setLoading(false);
		})().catch(() => {
			if (cancelled) return;
			setSuggestions(
				roleSuggestions.filter(
					(s) => !selectedKeys.has(`role:${s.roleKey}`),
				),
			);
			setLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [query, pnpWrapper, roleSuggestions, selectedKeys]);

	function add(entry: Suggestion): void {
		const next: AudienceEntry =
			entry.kind === "role"
				? { kind: "role", roleKey: entry.roleKey, label: entry.label }
				: { kind: "user", email: entry.email, label: entry.label };
		const key =
			next.kind === "role"
				? `role:${next.roleKey}`
				: `user:${next.email}`;
		if (selectedKeys.has(key)) return;
		onChange([...value, next]);
		setQuery("");
		setSuggestions(
			roleSuggestions.filter(
				(s) => !selectedKeys.has(`role:${s.roleKey}`),
			),
		);
		setActiveIdx(0);
	}

	function removeAt(i: number): void {
		onChange(value.filter((_, idx) => idx !== i));
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
		if (e.key === "Backspace" && query === "" && value.length) {
			removeAt(value.length - 1);
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIdx((i) =>
				Math.min(i + 1, Math.max(0, suggestions.length - 1)),
			);
			return;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIdx((i) => Math.max(0, i - 1));
			return;
		}
		if (e.key === "Enter" || e.key === "Tab") {
			if (!suggestions.length) return;
			e.preventDefault();
			add(
				suggestions[
					Math.max(0, Math.min(activeIdx, suggestions.length - 1))
				],
			);
		}
	}

	return (
		<div>
			<label
				className="block text-sm font-medium text-slate-700"
				htmlFor="audience"
			>
				{label}
			</label>

			<div className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-2">
				<div className="flex flex-wrap gap-2">
					{value.map((v, i) => (
						<span
							key={
								v.kind === "role"
									? `role:${v.roleKey}`
									: `user:${v.email}`
							}
							className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
						>
							<span className="max-w-[240px] truncate">
								{v.kind === "role"
									? `Dept: ${v.label}`
									: v.label}
							</span>
							<button
								type="button"
								className="rounded-full px-1 text-slate-500 hover:text-slate-800"
								onClick={() => removeAt(i)}
								aria-label="Remove"
							>
								×
							</button>
						</span>
					))}

					<input
						id="audience"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onKeyDown}
						placeholder={placeholder}
						className="min-w-[12rem] flex-1 border-0 px-1 py-1 text-sm outline-none"
					/>
				</div>

				{(loading || suggestions.length > 0) && (
					<div className="mt-2 rounded-md border border-slate-200 bg-white">
						{loading && (
							<div className="px-3 py-2 text-xs text-slate-500">
								Searching…
							</div>
						)}
						{suggestions.map((s, idx) => (
							<button
								type="button"
								key={
									s.kind === "role"
										? `role:${s.roleKey}`
										: `user:${s.email}`
								}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => add(s)}
								className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
									idx === activeIdx ? "bg-slate-50" : ""
								}`}
							>
								<span className="truncate">
									{s.kind === "role"
										? `Dept: ${s.label}`
										: s.label}
								</span>
								<span className="ml-3 text-xs text-slate-500">
									{idx === activeIdx ? "Tab to add" : ""}
								</span>
							</button>
						))}
						{!loading && suggestions.length === 0 && (
							<div className="px-3 py-2 text-xs text-slate-500">
								No matches.
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
