import * as React from "react";
import { IAttorneyAssignmentsProps } from "./IAttorneyAssignmentsProps";

export default function AttorneyAssignments(
	props: IAttorneyAssignmentsProps,
): JSX.Element {
	const { assignments } = props;
	const [filter, setFilter] = React.useState<"my" | "all">("my");

	const filteredAssignments = React.useMemo(() => {
		if (filter === "all") return assignments;
		return assignments.filter((a) => a.isMyCase);
	}, [assignments, filter]);

	return (
		<section className="rounded-xl border border-slater-800 bg-[#e6e6e6] shadow-sm">
			<header className="flex items-center justify-between border-b border-slater-800 px-4 py-3">
				<h4 className="text-base font-semibold text-slate-800">
					Attorney Assignments
				</h4>
				<div className="flex items-center gap-2">
					<label className="sr-only" htmlFor="filter-select">
						Filter
					</label>
					<select
						id="filter-select"
						value={filter}
						onChange={(e) =>
							setFilter(e.target.value as "my" | "all")
						}
						className="rounded-md border-slate-300 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 px-2 py-1"
					>
						<option value="my">My Cases</option>
						<option value="all">All Assignments</option>
					</select>
				</div>
			</header>

			<div className="overflow-x-auto">
				{filteredAssignments.length === 0 ? (
					<p className="px-4 py-3 text-sm text-slate-500 italic">
						No assignments found.
					</p>
				) : (
					<table className="min-w-full divide-y divide-slater-800">
						<thead className="bg-slate-50">
							<tr>
								{[
									"Case #",
									"Client",
									"Court",
									"Next Hearing",
									"Status",
									"",
								].map((header) => (
									<th
										key={header}
										scope="col"
										className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
									>
										{header}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slater-800 bg-white">
							{filteredAssignments.map((item) => (
								<tr key={item.id} className="hover:bg-slate-50">
									<td className="px-4 py-3 text-sm text-slate-800">
										{item.caseNumber}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{item.client}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{item.court}
									</td>
									<td className="px-4 py-3 text-sm text-slate-700">
										{item.nextHearing
											? new Date(
													item.nextHearing,
												).toLocaleString()
											: "—"}
									</td>
									<td className="px-4 py-3 text-center">
										<span className="border border-black border-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
											{item.status || "Pending"}
										</span>
									</td>
									<td className="px-4 py-3 text-right">
										{item.link ? (
											<a
												href={item.link}
												target="_blank"
												rel="noopener noreferrer"
												data-status={item.status}
												className="text-sm text-blue-700 hover:underline    bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]
													data-[status=awaiting]:(bg-[#dbeafe] text-[#1e40af] border-[#3b82f6])
													data-[status=closed]:(bg-[#fee2e2] text-[#991b1b] border-[#ef4444])
													data-[status=pending]:(bg-[#fef3c7] text-[#92400e] border-[#fbbf24])
													data-[status=open]:(bg-[#dcfce7] text-[#14532d] border-[#22c55e])"
											>
												Open
											</a>
										) : (
											<span className="text-sm text-gray-400">
												—
											</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</section>
	);
}
