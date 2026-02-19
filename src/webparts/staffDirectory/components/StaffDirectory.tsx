import * as React from "react";

import type { IStaffDirectoryProps } from "./IStaffDirectoryProps";

import { Collapsible } from "@components/Collapsible";
import { PNPWrapper } from "@utils/PNPWrapper";
import { StaffDirectoryApi } from "@api/staffDirectory";
import type { PDStaffDirectoryItem } from "@type/PDStaffDirectory";
import * as Utils from "@utils";

type StaffDirectoryComponentItem = PDStaffDirectoryItem;

export const StaffDirectory: React.FC<IStaffDirectoryProps> = (props) => {
	const defaultItems: StaffDirectoryComponentItem[] = [
		{
			titleName: "No Staff (0 results)",
		},
	];
	const [staff, setStaff] = React.useState(defaultItems);

	const pnpWrapper = new PNPWrapper(props.context, {
		siteUrls: ["/sites/PD-Intranet", "/sites/Tech-Team", "/sites/HR"],
		cache: "true",
	});
	const staffDirectoryApi = new StaffDirectoryApi(pnpWrapper);

	const load: () => Promise<void> = async () => {
		const rows = await staffDirectoryApi.get(12); // strategy auto
		const mapped = (rows || []).map((item: PDStaffDirectoryItem) => ({
			name: item.name,
			username: item.username,
			ext: item.ext,
			workCell: item.workCell,
			personalCell: item.personalCell,
			titleName: item.titleName,
		}));
		setStaff(mapped.length ? mapped : defaultItems);
	};

	React.useEffect(() => {
		Utils.loadCachedThenFresh(load);
	}, []);

	/*
		search term
	*/
	const [searchTerm, setSearchTerm] = React.useState("");
	function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
		setSearchTerm(e.target.value);
	}

	/*
		filters
	 */
	function matchesSearch(
		member: StaffDirectoryComponentItem,
		term: string,
	): boolean {
		const lower = term.toLowerCase();

		return (
			Object.keys(member) as (keyof StaffDirectoryComponentItem)[]
		).some((key) => {
			const value = member[key];
			return value?.toLowerCase().includes(lower);
		});
	}
	const filteredStaff = searchTerm
		? staff.filter((member) => matchesSearch(member, searchTerm))
		: staff;

	return (
		<Collapsible
			instanceId={props.context.instanceId}
			title="Staff Directory"
		>
			<div className="p-2">
				{/* Search Input */}
				<form role="search" className="mx-auto max-w-lg">
					<label
						className="block text-sm font-medium text-slate-700"
						htmlFor="staff-search"
					>
						Search staff
					</label>
					<input
						id="staff-search"
						type="search"
						placeholder="Search any field…"
						value={searchTerm}
						onChange={handleSearchChange}
						className="mt-1 w-full rounded-md border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-[var(--pd-muted)]"
					/>
					<button
						type="button"
						className="rounded-md border-slate-300 px-3 text-sm text-white font-bold absolute right-[1.5em] mt-[0.9em] opacity-60 hover:opacity-100"
						aria-label="Run search"
					>
						🔍
					</button>
				</form>

				{/* status text */}
				<p className="mt-2 text-xs text-slate-500">
					{staff.length < 2
						? "Loading directory…"
						: `Showing ${filteredStaff.length} of ${staff.length} matches.`}
				</p>

				{/* Staff List */}
				<div className="mt-2 max-h-[300px] overflow-y-auto rounded-md border border-slate-400">
					<ul className="divide-y divide-slate-300">
						{filteredStaff.length === 0 ? (
							<li className="py-3 text-sm text-slate-600 text-center">
								No matching staff found.
							</li>
						) : (
							filteredStaff.slice(0, 3).map((member) => {
								const initials = member.name
									? member.name
											.split(" ")
											.map((n) => n[0])
											.join("")
											.substring(0, 2)
											.toUpperCase()
									: "?";

								return (
									<li
										key={member.username}
										className="flex items-center px-1 py-3"
									>
										<div className="flex items-center gap-2">
											<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
												{initials}
											</span>
											<div>
												<p className="text-sm font-medium text-slate-800">
													{member.name}
												</p>
												<p className="text-xs text-slate-600">
													{member.titleName}
												</p>
												<p className="text-xs text-slate-600">
													EXT: {member.ext || "—"}
												</p>
												<p className="text-xs text-slate-600">
													Work:{" "}
													{member.workCell || "—"}
												</p>
												<p className="text-xs text-slate-600">
													Cell:{" "}
													{member.personalCell || "—"}
												</p>
											</div>
										</div>
									</li>
								);
							})
						)}
					</ul>
				</div>
			</div>
		</Collapsible>
	);
};
