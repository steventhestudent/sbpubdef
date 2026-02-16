import * as React from "react";
import type { IAttorneyWorkloadProps } from "./IAttorneyWorkloadProps";

export default function AttorneyWorkload(
	props: IAttorneyWorkloadProps,
): JSX.Element {
	const { counties } = props;
	const [searchText, setSearchText] = React.useState("");
	const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
		new Set(),
	);

	// --- Collapse all dropdowns whenever a new search is entered ---
	const handleSearchChange: (
		e: React.ChangeEvent<HTMLInputElement>,
	) => void = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchText(e.target.value);
		setExpandedItems(new Set()); // collapse all
	};

	const toggleExpand: (id: string) => void = (id: string) => {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(id)) newExpanded.delete(id);
		else newExpanded.add(id);
		setExpandedItems(newExpanded);
	};

	// --- Filter logic ---
	const filteredCounties = React.useMemo(() => {
		if (!searchText) return counties;

		const lowerSearch = searchText.toLowerCase();

		return counties
			.map((county) => {
				if (county.name.toLowerCase().includes(lowerSearch)) {
					return county;
				}

				const caseTypes = county.caseTypes
					.map((ct) => {
						if (ct.type.toLowerCase().includes(lowerSearch))
							return ct;

						const attorneys = ct.attorneys
							.map((att) => {
								if (
									att.name.toLowerCase().includes(lowerSearch)
								)
									return att;

								const cases = att.cases.filter((c) =>
									c.number
										.toLowerCase()
										.includes(lowerSearch),
								);
								return { ...att, cases };
							})
							.filter((att) => att.cases.length > 0);

						return { ...ct, attorneys };
					})
					.filter((ct) => ct.attorneys.length > 0);

				return { ...county, caseTypes };
			})
			.filter((county) => county.caseTypes.length > 0);
	}, [counties, searchText]);

	return (
		<section
			className=""
			style={{
				maxWidth: "500px",
				border: "1px solid #ccc",
				borderRadius: "4px",
			}}
		>
			{/* Title */}
			<div
				style={{
					padding: "8px",
					borderBottom: "1px solid #eee",
					backgroundColor: "#f9f9f9",
				}}
			>
				<h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
					Attorney Workload
				</h2>
			</div>

			{/* Search */}
			<div style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
				<input
					type="text"
					placeholder="Search by county, case type, attorney, or case number..."
					value={searchText}
					onChange={handleSearchChange}
					style={{
						width: "100%",
						padding: "6px",
						boxSizing: "border-box",
					}}
				/>
			</div>

			{/* Counties */}
			<div style={{ maxHeight: "400px", overflowY: "auto" }}>
				{filteredCounties.length ? (
					filteredCounties.map((county) => {
						const countyId = `county-${county.name}`;
						const isCountyOpen = expandedItems.has(countyId);

						return (
							<div
								key={county.name}
								style={{ borderBottom: "1px solid #eee" }}
							>
								<button
									onClick={() => toggleExpand(countyId)}
									style={{
										width: "100%",
										textAlign: "left",
										padding: "8px",
										background: "none",
										border: "none",
										cursor: "pointer",
									}}
								>
									{isCountyOpen ? "▼" : "▶"} {county.name}
								</button>

								{isCountyOpen &&
									county.caseTypes.map((ct) => {
										const ctId = `${countyId}-type-${ct.type}`;
										const isCtOpen =
											expandedItems.has(ctId);

										return (
											<div
												key={ct.type}
												style={{ marginLeft: "16px" }}
											>
												<button
													onClick={() =>
														toggleExpand(ctId)
													}
													style={{
														width: "100%",
														textAlign: "left",
														padding: "6px",
														background: "none",
														border: "none",
														cursor: "pointer",
													}}
												>
													{isCtOpen ? "▼" : "▶"}{" "}
													{ct.type}
												</button>

												{isCtOpen &&
													ct.attorneys.map((att) => {
														const attId = `${ctId}-att-${att.name}`;
														const isAttOpen =
															expandedItems.has(
																attId,
															);

														return (
															<div
																key={att.name}
																style={{
																	marginLeft:
																		"16px",
																}}
															>
																<button
																	onClick={() =>
																		toggleExpand(
																			attId,
																		)
																	}
																	style={{
																		width: "100%",
																		textAlign:
																			"left",
																		padding:
																			"4px",
																		background:
																			"none",
																		border: "none",
																		cursor: "pointer",
																	}}
																>
																	{isAttOpen
																		? "▼"
																		: "▶"}{" "}
																	{att.name}
																</button>

																{isAttOpen && (
																	<div
																		style={{
																			marginLeft:
																				"16px",
																			display:
																				"flex",
																			gap: "4px",
																			flexWrap:
																				"wrap",
																			paddingBottom:
																				"8px",
																		}}
																	>
																		{att.cases.map(
																			(
																				c,
																			) => (
																				<div
																					key={
																						c.number
																					}
																					style={{
																						padding:
																							"2px 6px",
																						backgroundColor:
																							"#e0e0e0",
																						color: "#333",
																						borderRadius:
																							"4px",
																						fontSize:
																							"11px",
																					}}
																				>
																					{
																						c.number
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
					<div style={{ padding: "12px" }}>
						No results found for &quot;{searchText}&quot;
					</div>
				)}
			</div>
		</section>
	);
}
