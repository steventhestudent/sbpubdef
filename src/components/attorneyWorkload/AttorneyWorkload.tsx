import * as React from "react";
import * as Utils from "@utils";
import styles from "@webparts/attorneyWorkload/components/AttorneyWorkload.module.scss";
import {
	IAttorney,
	ILocationData,
} from "@webparts/attorneyWorkload/components/IAttorneyWorkloadProps";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

interface ICaseRaw {
	CaseID: string;
	CaseStatus: string;
	AttorneyID: number;
	CaseTypeID: number;
}

interface IAttorneyRaw {
	AttorneyID: number;
	Name: string;
	Location: string;
}

interface ICaseTypeRaw {
	CaseTypeID: number;
	Name: string;
}

interface ISharePointData {
	attorneys: IAttorneyRaw[];
	caseTypes: ICaseTypeRaw[];
	cases: ICaseRaw[];
}

export function AttorneyWorkload({
	userGroupNames,
	pnpWrapper,
	sourceRole,
}: RoleBasedViewProps): JSX.Element {
	const [locations, setLocations] = React.useState<ILocationData[]>([]);

	const load = (): void => {
		Utils.loadJSON<ISharePointData>(
			"https://csproject25.sharepoint.com/sites/PD-Intranet/Shared%20Documents/Intranet%20Form%20Database/Attorneys/Workload/attorneyWorkload.json",
			(data) => {
				if (data === undefined) return setLocations([]);
				const locationsMap = new Map<
					string,
					Map<
						string,
						Map<string, { CaseID: string; CaseStatus: string }[]>
					>
				>();

				data.attorneys.forEach((att) => {
					const attorneyCases = data.cases.filter(
						(c) => c.AttorneyID === att.AttorneyID,
					);

					attorneyCases.forEach((c) => {
						const caseTypeRecord = data.caseTypes.find(
							(ct) => ct.CaseTypeID === c.CaseTypeID,
						);
						const caseTypeName = caseTypeRecord?.Name ?? "Unknown";

						if (!locationsMap.has(att.Location)) {
							locationsMap.set(att.Location, new Map());
						}

						const caseTypesMap = locationsMap.get(att.Location)!;

						if (!caseTypesMap.has(caseTypeName)) {
							caseTypesMap.set(caseTypeName, new Map());
						}

						const attorneysMap = caseTypesMap.get(caseTypeName)!;

						if (!attorneysMap.has(att.Name)) {
							attorneysMap.set(att.Name, []);
						}

						attorneysMap.get(att.Name)!.push({
							CaseID: c.CaseID,
							CaseStatus: c.CaseStatus,
						});
					});
				});

				// Convert map to array structure for the component
				setLocations(
					Array.from(locationsMap.entries()).map(
						([locationName, caseTypesMap]) => ({
							name: locationName,
							caseTypes: Array.from(caseTypesMap.entries()).map(
								([caseTypeName, attorneysMap]) => ({
									type: caseTypeName,
									attorneys: Array.from(
										attorneysMap.entries(),
									).map(([attorneyName, cases]) => ({
										name: attorneyName,
										cases,
									})),
								}),
							),
						}),
					),
				);
				console.log("DATA LOADED:", locations);
			},
		);
	};

	React.useEffect(() => {
		// pnpWrapper.loadCachedThenFresh(load);
		load();
	}, []);

	const [searchText, setSearchText] = React.useState("");
	const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
		new Set(),
	);

	const handleSearchChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setSearchText(e.target.value);
	};

	const toggleExpand = (id: string): void => {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}

		setExpandedItems(newExpanded);
	};

	React.useEffect(() => {
		setExpandedItems(new Set());
	}, [searchText]);

	const getExpandedParents = React.useMemo(() => {
		if (!searchText) return new Set<string>();
		const lower = searchText.toLowerCase();
		const expanded = new Set<string>();

		locations.forEach((location) => {
			const locationId = `location-${location.name}`;
			const locationMatches = location.name.toLowerCase().includes(lower);
			if (locationMatches) expanded.add(locationId);

			location.caseTypes.forEach((ct) => {
				const ctId = `${locationId}-type-${ct.type}`;
				const ctMatches = ct.type.toLowerCase().includes(lower);
				if (ctMatches) {
					expanded.add(locationId);
					expanded.add(ctId);
				}

				ct.attorneys.forEach((att) => {
					const attId = `${ctId}-att-${att.name}`;
					const attMatches = att.name.toLowerCase().includes(lower);
					if (attMatches) {
						expanded.add(locationId);
						expanded.add(ctId);
						expanded.add(attId);
					}

					const caseMatches = att.cases.some(
						(c) =>
							c.CaseID.toLowerCase().includes(lower) ||
							c.CaseStatus.toLowerCase().includes(lower),
					);
					if (caseMatches) {
						expanded.add(locationId);
						expanded.add(ctId);
						expanded.add(attId);
					}
				});
			});
		});

		return expanded;
	}, [locations, searchText]);

	const isDropdownOpen = (id: string): boolean => {
		if (searchText) {
			return expandedItems.has(id) || getExpandedParents.has(id);
		}
		return expandedItems.has(id);
	};

	const getVisibleCases = (att: IAttorney): typeof att.cases => {
		if (!searchText) return att.cases;
		const lower = searchText.toLowerCase();
		const matchingCases = att.cases.filter(
			(c) =>
				c.CaseID.toLowerCase().includes(lower) ||
				c.CaseStatus.toLowerCase().includes(lower),
		);
		return matchingCases.length > 0 ? matchingCases : att.cases;
	};

	const getAttorneyCaseCount = (att: IAttorney): number =>
		getVisibleCases(att).length;

	const getCaseTypeCaseCount = (
		caseType: (typeof locations)[0]["caseTypes"][0],
	): number =>
		caseType.attorneys.reduce(
			(total, att) => total + getVisibleCases(att).length,
			0,
		);

	const getLocationCaseCount = (location: (typeof locations)[0]): number =>
		location.caseTypes.reduce(
			(total, ct) => total + getCaseTypeCaseCount(ct),
			0,
		);

	const filteredLocations = React.useMemo(() => {
		if (!searchText) return locations;
		const lower = searchText.toLowerCase();

		return locations
			.map((location) => {
				const locationMatches = location.name
					.toLowerCase()
					.includes(lower);

				const caseTypes = location.caseTypes
					.map((ct) => {
						const ctMatches = ct.type.toLowerCase().includes(lower);

						const attorneys = ct.attorneys
							.map((att) => {
								const attMatches =
									att.name.toLowerCase().includes(lower) ||
									att.cases.some(
										(c) =>
											c.CaseID.toLowerCase().includes(
												lower,
											) ||
											c.CaseStatus.toLowerCase().includes(
												lower,
											),
									);
								return attMatches ||
									ctMatches ||
									locationMatches
									? { ...att }
									: null;
							})
							.filter((att): att is IAttorney => att !== null);

						return ctMatches ||
							attorneys.length > 0 ||
							locationMatches
							? { ...ct, attorneys }
							: null;
					})
					.filter(
						(ct): ct is (typeof location.caseTypes)[0] =>
							ct !== null,
					);

				return locationMatches || caseTypes.length > 0
					? { ...location, caseTypes }
					: null;
			})
			.filter(
				(location): location is (typeof locations)[0] =>
					location !== null,
			);
	}, [locations, searchText]);
	return (
		<>
			<div className={styles.searchContainer}>
				<input
					className={styles.searchInput}
					type="text"
					placeholder="Search by location, case type, attorney, case number, or status..."
					value={searchText}
					onChange={handleSearchChange}
				/>
			</div>

			<div className={styles.locationsContainer}>
				{filteredLocations.length ? (
					filteredLocations.map((location) => {
						const locationId = `location-${location.name}`;
						const isLocationOpen = isDropdownOpen(locationId);

						return (
							<div
								key={locationId}
								className={styles.locationCard}
							>
								<button
									className={styles.expandButton}
									onClick={() => toggleExpand(locationId)}
								>
									<span>
										{isLocationOpen ? "▼" : "▶"}{" "}
										{location.name}{" "}
										<span className={styles.caseCount}>
											({getLocationCaseCount(location)})
										</span>
									</span>
								</button>

								{isLocationOpen &&
									location.caseTypes.map((ct) => {
										const ctId = `${locationId}-type-${ct.type}`;
										const isCtOpen = isDropdownOpen(ctId);

										return (
											<div
												key={ctId}
												className={styles.caseTypeCard}
											>
												<button
													className={
														styles.expandButton
													}
													onClick={() =>
														toggleExpand(ctId)
													}
												>
													<span>
														{isCtOpen ? "▼" : "▶"}{" "}
														{ct.type}{" "}
														<span
															className={
																styles.caseCount
															}
														>
															(
															{getCaseTypeCaseCount(
																ct,
															)}
															)
														</span>
													</span>
												</button>

												{isCtOpen &&
													ct.attorneys.map((att) => {
														const attId = `${ctId}-att-${att.name}`;
														const isAttOpen =
															isDropdownOpen(
																attId,
															);

														return (
															<div
																key={attId}
																className={
																	styles.attorneyCard
																}
															>
																<button
																	className={
																		styles.expandButton
																	}
																	onClick={() =>
																		toggleExpand(
																			attId,
																		)
																	}
																>
																	<span>
																		{isAttOpen
																			? "▼"
																			: "▶"}{" "}
																		{
																			att.name
																		}{" "}
																		<span
																			className={
																				styles.caseCount
																			}
																		>
																			(
																			{getAttorneyCaseCount(
																				att,
																			)}
																			)
																		</span>
																	</span>
																</button>

																{isAttOpen && (
																	<div
																		className={
																			styles.casesContainer
																		}
																	>
																		{getVisibleCases(
																			att,
																		).map(
																			(
																				c,
																			) => (
																				<div
																					key={
																						c.CaseID
																					}
																					className={
																						styles.caseNumber
																					}
																				>
																					<strong>
																						{
																							c.CaseID
																						}
																					</strong>{" "}
																					—{" "}
																					{
																						c.CaseStatus
																					}
																				</div>
																			),
																		)}
																	</div>
																)}
															</div>
														);
													})}
											</div>
										);
									})}
							</div>
						);
					})
				) : (
					<div className={styles.noResults}>
						No results found for &quot;{searchText}&quot;
					</div>
				)}
			</div>
		</>
	);
}
