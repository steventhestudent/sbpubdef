import * as React from "react";
import type { IExpertWitnessDirectoryProps } from "./IExpertWitnessDirectoryProps";
import { Collapsible } from "@components/Collapsible";
import { IExpert } from "@type/PDExpertWitness";
import { ExpertWitnessApi } from "@api/expertWitness";

const MAX_VISIBLE = 4;

export const ExpertWitnessDirectory: React.FC<IExpertWitnessDirectoryProps> = (
	props,
) => {
	const [experts, setExperts] = React.useState<IExpert[]>([]);
	const [search, setSearch] = React.useState("");
	const [isLoading, setIsLoading] = React.useState<boolean>(true);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		let active = true;

		const load = async (): Promise<void> => {
			try {
				setIsLoading(true);
				setError(null);

				const data = await ExpertWitnessApi.getExperts(
					props.siteUrl,
					props.spHttpClient,
				);

				if (!active) return;

				// alphabetical by name A → Z
				const sorted = [...data].sort((a, b) =>
					(a.name ?? "").localeCompare(b.name ?? ""),
				);

				console.log("ExpertWitnessDirectory: experts state", sorted);
				setExperts(sorted);
			} catch (err) {
				console.error(
					"ExpertWitnessDirectory: failed to load experts",
					err,
				);
				if (!active) return;
				setExperts([]);
				setError("Could not load Expert Directory.");
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		// satisfy no-floating-promises
		load().catch((e) => {
			if (!active) return;
			console.error("ExpertWitnessDirectory: unhandled load error", e);
			setExperts([]);
			setError("Could not load Expert Directory.");
			setIsLoading(false);
		});

		return () => {
			active = false;
		};
	}, [props.siteUrl, props.spHttpClient]);

	const filtered = React.useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return experts;

		return experts.filter((exp) => {
			const haystack = [exp.name, exp.expertise, exp.email, exp.phone]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return haystack.includes(term);
		});
	}, [search, experts]);

	const visible = filtered.slice(0, MAX_VISIBLE);
	const directoryUrl = `${props.siteUrl}/Lists/Expert%20Directory/AllItems.aspx`;

	return (
		<Collapsible
			instanceId={props.instanceId}
			title="Expert Witness Directory"
		>
			<div className="p-4 text-sm">
				{/* search */}
				<label
					className="block text-xs font-medium text-slate-700"
					htmlFor="expert-search"
				>
					Search experts
				</label>
				<div className="mt-1 flex gap-2">
					<input
						id="expert-search"
						type="search"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--pd-muted)]"
						placeholder="Name, field, location…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<button
						type="button"
						className="rounded-md border border-slate-300 px-3 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold"
						onClick={() => setSearch((s) => s.trim())}
						aria-label="Run search"
					>
						↠
					</button>
				</div>

				{/* status text */}
				<p className="mt-2 text-xs text-slate-500">
					{isLoading
						? "Loading directory…"
						: error
							? error
							: `Showing ${filtered.length} of ${experts.length} matches.`}
				</p>

				{/* list */}
				{!isLoading && !error && (
					<>
						{filtered.length === 0 ? (
							<div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
								No experts match this search.
							</div>
						) : (
							<ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
								{visible.map((e) => (
									<li key={e.id} className="px-3 py-2">
										<div className="flex items-center justify-between gap-4">
											<div>
												<p className="text-sm text-slate-900">
													{e.name}
												</p>
												{e.expertise && (
													<p className="mt-0.5 text-xs text-slate-600">
														{e.expertise}
													</p>
												)}
												{(e.email || e.phone) && (
													<p className="mt-1 text-xs text-slate-500">
														{e.email && (
															<span>
																{e.email}
															</span>
														)}
														{e.email &&
															e.phone &&
															" • "}
														{e.phone && (
															<span>
																{e.phone}
															</span>
														)}
													</p>
												)}
											</div>
											<span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
												Available
											</span>
										</div>
									</li>
								))}
							</ul>
						)}

						<div className="mt-3 flex items-center justify-between text-xs text-slate-500">
							<span>
								{experts.length > MAX_VISIBLE && (
									<div className="mt-3 text-right">
										<span className="text-xs text-slate-500">
											Show{" "}
											<select value={MAX_VISIBLE}>
												{(function () {
													const els = [];
													for (let i = 0; i < 10; i++)
														els.push(
															<option>
																{i}
															</option>,
														);
													return els;
												})()}
											</select>
											results.
										</span>
									</div>
								)}
							</span>
							<a
								href={directoryUrl}
								target="_blank"
								rel="noreferrer"
								className="text-blue-700 hover:underline"
							>
								View full directory
							</a>
						</div>
					</>
				)}
			</div>
		</Collapsible>
	);
};

export default ExpertWitnessDirectory;
