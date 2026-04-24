/**
 * =============================================================================
 * CDDResourceGuides Webpart
 * =============================================================================
 *
 * Overview:
 * ---------
 * This React-based SPFx webpart dynamically retrieves and displays documents
 * and resource links from a SharePoint document library for the Community
 * Defender Division (CDD).
 *
 * The webpart organizes content into a hierarchical structure:
 * - Categories (top-level folders)
 * - Subcategories (nested folders)
 * - Documents (files and external links)
 *
 * Data is fetched directly from SharePoint using REST API calls and rendered
 * dynamically in the UI.
 *
 * -----------------------------------------------------------------------------
 * Key Features:
 * -----------------------------------------------------------------------------
 *
 * 1. Dynamic Data Loading
 *    - Retrieves folders and files from SharePoint document library
 *    - Supports nested folder structure (categories + subcategories)
 *    - Automatically reflects updates made in SharePoint (no code changes needed)
 *
 * 2. Document Handling
 *    - Supports both SharePoint files (.pdf) and external links (.url)
 *    - .url files are parsed to extract actual external URLs
 *    - Uses SharePoint "Label" column (if available) for display names
 *    - Falls back to cleaned file name if no label is provided
 *
 * 3. Search Functionality
 *    - Supports multi-word search (e.g., "homeless spanish")
 *    - Matches against:
 *        • Document names
 *        • Metadata tags (SharePoint "Tags" column)
 *        • Category and subcategory names
 *    - Automatically expands relevant sections when matches are found
 *
 * 4. Expand / Collapse UI
 *    - Users can manually expand/collapse categories and subcategories
 *    - During search:
 *        • Expands only when deeper matches exist (documents/subcategories)
 *        • Avoids auto-expanding on category-only matches for better UX
 *
 * 5. Multi-Select + Actions
 *    - Users can select multiple documents via checkboxes
 *    - Bottom action bar appears when selections are made
 *    - Supports:
 *        • Clear selection
 *        • Send (email)
 *
 * 6. Email Sharing (mailto)
 *    - Generates an email using the user's default email client
 *    - Includes selected document links in the email body
 *    - Converts SharePoint relative paths into full URLs
 *
 *    IMPORTANT LIMITATIONS:
 *    ----------------------
 *    - Email is generated using "mailto:", which has inherent limitations:
 *        • Links may appear as plain text in Outlook Desktop
 *        • HTML formatting (clickable <a> links) is not reliably supported
 *        • File attachments are NOT supported (links only)
 *
 *    - This behavior is dependent on the email client and cannot be fully controlled
 *      from the browser.
 *
 *    - For production-level email features (attachments, formatting),
 *      integration with Power Automate or Microsoft Graph API is recommended.
 *
 * -----------------------------------------------------------------------------
 * SharePoint Requirements:
 * -----------------------------------------------------------------------------
 *
 * 1. Document Library Structure
 *    - Base folder:
 *      /Documents/Intranet Form Database/CDD
 *
 *    - Expected structure:
 *        CDD/
 *          ├── Category Folder/
 *          │     ├── Files
 *          │     └── Subfolder/
 *          │           └── Files
 *
 * 2. Optional Metadata Columns
 *    - Label (Single line of text)
 *        → Used as display name instead of file name
 *
 *    - Tags (Multiple lines of text)
 *        → Used to improve search results
 *        → Example: "north spanish"
 *
 * 3. Supported File Types
 *    - .pdf → standard documents
 *    - .url → external links (must contain URL=... inside file)
 *
 * -----------------------------------------------------------------------------
 * Notes for Future Developers (Santa Barbara Team):
 * -----------------------------------------------------------------------------
 *
 * - This webpart is fully dynamic and driven by SharePoint content.
 * - No hardcoded categories or documents exist in the code.
 *
 * - To add/update content:
 *      → Simply upload files or create folders in the SharePoint library
 *
 * - To improve search:
 *      → Add relevant keywords in the "Tags" column
 *
 * - To improve display names:
 *      → Use the "Label" column instead of renaming files
 *
 * - Email functionality is intentionally simple for compatibility reasons.
 *      → For advanced email workflows, consider Power Automate integration
 *
 * - URLs are dynamically constructed using SharePoint context to ensure
 *   compatibility across environments (dev, test, production).
 *
 * =============================================================================
 */
import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

/**
 * Represents a single document or external resource.
 * - name: Display name (Label if exists, otherwise cleaned file name)
 * - url: Either SharePoint file path or external link
 * - tags: Optional metadata used for search
 */
interface ICddDocument {
	name: string;
	url: string;
	tags?: string[];
}

/**
 * Represents a category (folder) which may contain:
 * - documents directly
 * - nested subcategories (subfolders)
 */
interface ICddCategory {
	name: string;
	documents?: ICddDocument[];
	subcategories?: ICddCategory[];
}

export function CDDResourceGuides({
	pnpWrapper,
}: RoleBasedViewProps): JSX.Element {
	// Search input state
	const [searchText, setSearchText] = React.useState("");

	// Tracks which categories/subcategories are expanded
	const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
		new Set(),
	);

	// Holds all loaded categories and documents
	const [categories, setCategories] = React.useState<ICddCategory[]>([]);

	// Loading state while fetching SharePoint data
	const [loading, setLoading] = React.useState(true);

	// Tracks selected documents for email sharing
	const [selectedDocs, setSelectedDocs] = React.useState<Set<string>>(
		new Set(),
	);

	/**
	 * Toggle selection of a document (checkbox)
	 */
	const toggleSelect = (url: string): void => {
		const newSet = new Set(selectedDocs);
		if (newSet.has(url)) newSet.delete(url);
		else newSet.add(url);
		setSelectedDocs(newSet);
	};

	/**
	 * Clears all selected documents
	 */
	const clearSelection = (): void => {
		setSelectedDocs(new Set());
	};

	/**
	 * Toggle expand/collapse for category or subcategory
	 */
	const toggleExpand = (id: string): void => {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(id)) newExpanded.delete(id);
		else newExpanded.add(id);
		setExpandedItems(newExpanded);
	};

	/**
	 * Check if a category/subcategory is currently expanded
	 */
	const isOpen = (id: string): boolean => expandedItems.has(id);

	/**
	 * Generates an email using mailto with selected document links.
	 * Note: Attachments are not supported; links are included instead.
	 * (links currently load as text, can be modified for improvement)
	 */
	const handleSend = (): void => {
		const selectedList: ICddDocument[] = [];

		// Flatten selected documents across categories + subcategories
		categories.forEach((category) => {
			category.documents?.forEach((doc) => {
				if (selectedDocs.has(doc.url)) {
					selectedList.push(doc);
				}
			});

			category.subcategories?.forEach((sub) => {
				sub.documents?.forEach((doc) => {
					if (selectedDocs.has(doc.url)) {
						selectedList.push(doc);
					}
				});
			});
		});

		if (selectedList.length === 0) return;

		const subject = encodeURIComponent("PD Intranet Resources");

		const webUrl = pnpWrapper.ctx.pageContext.web.absoluteUrl;

		// Build email body with full URLs
		const body = encodeURIComponent(
			"Here are the selected resources:\n\n" +
				selectedList
					.map((doc) => {
						const fullUrl = doc.url.startsWith("http")
							? doc.url
							: `${webUrl}${doc.url.replace(/^\/sites\/[^/]+/, "")}`;

						return `${doc.name}\n${fullUrl}`;
					})
					.join("\n\n"),
		);

		window.location.href = `mailto:?subject=${subject}&body=${body}`;
	};

	/**
	 * Load categories, subcategories, and documents from SharePoint
	 */
	React.useEffect(() => {
		/**
		 * Cleans file names:
		 * - removes extensions (.pdf, .url)
		 * - replaces underscores
		 * - normalizes spacing
		 */
		const cleanName = (name: string): string =>
			name
				.replace(/\.(pdf|url)$/i, "")
				.replace(/_/g, " ")
				.replace(/\s+/g, " ")
				.trim();

		const loadResources = async (): Promise<void> => {
			const baseFolder =
				"/sites/PD-Intranet/Shared Documents/Intranet Form Database/CDD";

			try {
				const webUrl = pnpWrapper.ctx.pageContext.web.absoluteUrl;

				// Get top-level folders (categories)
				const folderResponse = await fetch(
					`${webUrl}/_api/web/GetFolderByServerRelativeUrl('${baseFolder}')/Folders`,
					{
						headers: {
							Accept: "application/json;odata=nometadata",
						},
					},
				);

				const folderData = await folderResponse.json();
				const results: ICddCategory[] = [];

				for (const folder of folderData.value) {
					if (folder.Name === "Forms") continue;

					// Fetch files inside category
					const filesResponse = await fetch(
						`${webUrl}/_api/web/GetFolderByServerRelativeUrl('${folder.ServerRelativeUrl}')/Files?$expand=ListItemAllFields`,
						{
							headers: {
								Accept: "application/json;odata=nometadata",
							},
						},
					);

					const fileData = await filesResponse.json();

					const documents: ICddDocument[] = await Promise.all(
						fileData.value.map(
							async (
								file: {
									Name: string;
									ServerRelativeUrl: string;
									ListItemAllFields?: {
										Tags?: string;
										Label?: string;
									};
								},
							) => {
							let url = file.ServerRelativeUrl;

							/**
							 * Handle .url files (SharePoint shortcuts)
							 * Extract actual external URL from file content
							 */
							if (file.Name.toLowerCase().endsWith(".url")) {
								try {
									const res = await fetch(
										`${webUrl}/_api/web/GetFileByServerRelativeUrl('${file.ServerRelativeUrl}')/$value`,
									);
									const text = await res.text();
									const match = text.match(/URL=(.*)/i);
									if (match && match[1])
										url = match[1].trim();
								} catch {
									console.warn(
										"Failed to read .url file",
										file.Name,
									);
								}
							}

							// Extract tags for search metadata
							const rawTags = file.ListItemAllFields?.Tags || "";
							const tags = rawTags
								.toLowerCase()
								.split(/[,\s]+/)
								.filter(Boolean);
							// Use Label if available, otherwise fallback to cleaned file name
							const label = file.ListItemAllFields?.Label;

							return {
								name: label ? label : cleanName(file.Name),
								url,
								tags,
							};
						},
						),
					);

					const subfolderResponse = await fetch(
						`${webUrl}/_api/web/GetFolderByServerRelativeUrl('${folder.ServerRelativeUrl}')/Folders`,
						{
							headers: {
								Accept: "application/json;odata=nometadata",
							},
						},
					);

					// Fetch subfolders (subcategories)
					const subfolderData = await subfolderResponse.json();
					const subcategories: ICddCategory[] = [];

					for (const sub of subfolderData.value) {
						if (sub.Name === "Forms") continue;

						const subFilesResponse = await fetch(
							`${webUrl}/_api/web/GetFolderByServerRelativeUrl('${sub.ServerRelativeUrl}')/Files?$expand=ListItemAllFields`,
							{
								headers: {
									Accept: "application/json;odata=nometadata",
								},
							},
						);

						const subFileData = await subFilesResponse.json();

						const subDocuments: ICddDocument[] = await Promise.all(
							subFileData.value.map(
								async (
									file: {
										Name: string;
										ServerRelativeUrl: string;
										ListItemAllFields?: {
											Tags?: string;
											Label?: string;
										};
									},
								) => {
								let url = file.ServerRelativeUrl;

								// Same .url handling for subcategory files
								if (file.Name.toLowerCase().endsWith(".url")) {
									try {
										const res = await fetch(
											`${webUrl}/_api/web/GetFileByServerRelativeUrl('${file.ServerRelativeUrl}')/$value`,
										);
										const text = await res.text();
										const match = text.match(/URL=(.*)/i);
										if (match && match[1])
											url = match[1].trim();
									} catch {
										console.warn(
											"Failed to read .url file",
											file.Name,
										);
									}
								}

								const rawTags =
									file.ListItemAllFields?.Tags || "";
								const tags = rawTags
									.toLowerCase()
									.split(/[,\s]+/)
									.filter(Boolean);
								const label = file.ListItemAllFields?.Label;

								return {
									name: label ? label : cleanName(file.Name),
									url,
									tags,
								};
							},
							),
						);

						subcategories.push({
							name: sub.Name,
							documents: subDocuments,
						});
					}

					// Sort subcategories alphabetically
					subcategories.sort((a, b) => a.name.localeCompare(b.name));

					results.push({
						name: folder.Name,
						documents,
						subcategories,
					});
				}

				// Sort categories alphabetically
				results.sort((a, b) => a.name.localeCompare(b.name));
				setCategories(results);
			} catch (err) {
				console.error("Error loading CDD resources:", err);
			}

			setLoading(false);
		};

		setTimeout(async () => await loadResources());
	}, []);

	/**
	 * Search logic:
	 * - supports multiple terms
	 * - matches against document name and tags
	 */
	const search = searchText.toLowerCase();

	const matchesSearch = (doc: ICddDocument): boolean => {
		if (!search) return true;

		const terms = search.split(" ").filter(Boolean);

		return terms.every((term) => {
			const inName = doc.name.toLowerCase().includes(term);

			const inTags = doc.tags?.some((tag) => tag.includes(term));

			return inName || inTags;
		});
	};

	/**
	 * Auto-expand categories when search matches deeper content
	 * (documents or subcategories, NOT just category name)
	 */
	React.useEffect(() => {
		if (!search) {
			setExpandedItems(new Set());
			return;
		}

		const newExpanded = new Set<string>();

		categories.forEach((category) => {
			const catId = `cat-${category.name}`;

			const hasDocMatch =
				category.documents?.some((doc) => matchesSearch(doc)) ||
				category.subcategories?.some((sub) =>
					sub.documents?.some((doc) => matchesSearch(doc)),
				);

			const hasSubcategoryMatch = category.subcategories?.some((sub) =>
				sub.name.toLowerCase().includes(search),
			);

			const shouldExpand = hasDocMatch || hasSubcategoryMatch;

			if (shouldExpand) {
				newExpanded.add(catId);

				category.subcategories?.forEach((sub) => {
					const subId = `${catId}-${sub.name}`;

					const subHasMatch =
						sub.name.toLowerCase().includes(search) ||
						sub.documents?.some((doc) => matchesSearch(doc));

					if (subHasMatch) {
						newExpanded.add(subId);
					}
				});
			}
		});

		setExpandedItems(newExpanded);
	}, [search, categories]);

	if (loading) {
		return <div className="p-4">Loading resources...</div>;
	}

	return (
		<section className="p-4 text-sm">
			{/* Search input */}
			<input
				className="mb-3 w-full rounded border p-2"
				type="text"
				placeholder="Search resources..."
				value={searchText}
				onChange={(e) => setSearchText(e.target.value)}
			/>

			{/* Category rendering */}
			{categories.map((category) => {
				const catId = `cat-${category.name}`;
				const catOpen = isOpen(catId);

				// Determines if category should be shown based on search
				const showCategory =
					!search ||
					category.name.toLowerCase().includes(search) ||
					category.documents?.some((doc) => matchesSearch(doc)) ||
					category.subcategories?.some(
						(sub) =>
							sub.name.toLowerCase().includes(search) ||
							sub.documents?.some((doc) => matchesSearch(doc)),
					);

				if (!showCategory) return null;

				return (
					<div key={catId} className="mb-2">
						{/* Category toggle */}
						<button
							className="cursor-pointer font-semibold"
							onClick={() => toggleExpand(catId)}
						>
							{catOpen ? "▼" : "▶"} {category.name}
						</button>

						{catOpen && (
							<div className="mt-1 ml-4">
								{/* Documents under category */}
								{category.documents?.map((doc) => {
									if (
										search &&
										!category.name
											.toLowerCase()
											.includes(search) &&
										!matchesSearch(doc)
									)
										return null;

									return (
										<div
											key={doc.url}
											className="flex items-center gap-2 py-1"
										>
											<input
												type="checkbox"
												checked={selectedDocs.has(
													doc.url,
												)}
												onChange={() =>
													toggleSelect(doc.url)
												}
											/>

											<a
												href={doc.url}
												target="_blank"
												rel="noopener noreferrer"
												className="cursor-pointer text-gray-800 hover:text-blue-600 hover:underline"
											>
												{doc.name}
											</a>
										</div>
									);
								})}

								{/* Subcategories */}
								{category.subcategories?.map((sub) => {
									const subId = `${catId}-${sub.name}`;
									const subOpen = isOpen(subId);

									const showSub =
										!search ||
										category.name
											.toLowerCase()
											.includes(search) ||
										sub.name
											.toLowerCase()
											.includes(search) ||
										sub.documents?.some((doc) =>
											matchesSearch(doc),
										);

									if (!showSub) return null;

									return (
										<div key={subId} className="mt-1">
											<button
												className="cursor-pointer font-medium"
												onClick={() =>
													toggleExpand(subId)
												}
											>
												{subOpen ? "▼" : "▶"} {sub.name}
											</button>

											{subOpen && (
												<div className="mt-1 ml-4">
													{/* Documents under subcategory */}
													{sub.documents?.map(
														(doc) => {
															if (
																search &&
																!sub.name
																	.toLowerCase()
																	.includes(
																		search,
																	) &&
																!matchesSearch(
																	doc,
																)
															)
																return null;

															return (
																<div
																	key={
																		doc.url
																	}
																	className="flex items-center gap-2 py-1"
																>
																	<input
																		type="checkbox"
																		checked={selectedDocs.has(
																			doc.url,
																		)}
																		onChange={() =>
																			toggleSelect(
																				doc.url,
																			)
																		}
																	/>

																	<a
																		href={
																			doc.url
																		}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="cursor-pointer text-gray-800 hover:text-blue-600 hover:underline"
																	>
																		{
																			doc.name
																		}
																	</a>
																</div>
															);
														},
													)}
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				);
			})}

			{/* Bottom action bar (only appears when items are selected) */}
			{selectedDocs.size > 0 && (
				<div className="mt-4 flex items-center justify-between border-t pt-3">
					<span className="text-sm text-gray-600">
						{selectedDocs.size} selected
					</span>

					<div className="flex gap-2">
						<button
							className="rounded border px-3 py-1 text-gray-700 hover:bg-gray-100"
							onClick={clearSelection}
						>
							Clear
						</button>

						<button
							className="rounded bg-blue-600 px-4 py-1 text-white"
							onClick={handleSend}
						>
							Send
						</button>
					</div>
				</div>
			)}
		</section>
	);
}
