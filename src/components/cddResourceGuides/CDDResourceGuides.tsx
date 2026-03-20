import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

interface ICddDocument {
    name: string;
    url: string;
    tags?: string[];
}

interface ICddCategory {
    name: string;
    documents?: ICddDocument[];
    subcategories?: ICddCategory[];
}

export function CDDResourceGuides({
    pnpWrapper
}: RoleBasedViewProps): JSX.Element {

    const [searchText, setSearchText] = React.useState("");
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
    const [categories, setCategories] = React.useState<ICddCategory[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [selectedDocs, setSelectedDocs] = React.useState<Set<string>>(new Set());

    const toggleSelect = (url: string): void => {
        const newSet = new Set(selectedDocs);
        newSet.has(url) ? newSet.delete(url) : newSet.add(url);
        setSelectedDocs(newSet);
    };

    const clearSelection = (): void => {
        setSelectedDocs(new Set());
    };

    const toggleExpand = (id: string): void => {
        const newExpanded = new Set(expandedItems);
        newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
        setExpandedItems(newExpanded);
    };

    const isOpen = (id: string): boolean => expandedItems.has(id);

    React.useEffect(() => {

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

                const folderResponse = await fetch(
                    `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${baseFolder}')/Folders`,
                    { headers: { Accept: "application/json;odata=nometadata" } }
                );

                const folderData = await folderResponse.json();
                const results: ICddCategory[] = [];

                for (const folder of folderData.value) {

                    if (folder.Name === "Forms") continue;

                    const filesResponse = await fetch(
                        `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${folder.ServerRelativeUrl}')/Files?$expand=ListItemAllFields`,
                        { headers: { Accept: "application/json;odata=nometadata" } }
                    );

                    const fileData = await filesResponse.json();

                    const documents: ICddDocument[] = await Promise.all(
                        fileData.value.map(async (file: any) => {

                            let url = file.ServerRelativeUrl;

                            if (file.Name.toLowerCase().endsWith(".url")) {
                                try {
                                    const res = await fetch(
                                        `${webUrl}/_api/web/GetFileByServerRelativeUrl('${file.ServerRelativeUrl}')/$value`
                                    );
                                    const text = await res.text();
                                    const match = text.match(/URL=(.*)/i);
                                    if (match && match[1]) url = match[1].trim();
                                } catch {
                                    console.warn("Failed to read .url file", file.Name);
                                }
                            }

                            const rawTags = file.ListItemAllFields?.Tags || "";
                            const tags = rawTags.toLowerCase().split(/[,\s]+/).filter(Boolean);

                            return {
                                name: cleanName(file.Name),
                                url,
                                tags
                            };
                        })
                    );

                    const subfolderResponse = await fetch(
                        `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${folder.ServerRelativeUrl}')/Folders`,
                        { headers: { Accept: "application/json;odata=nometadata" } }
                    );

                    const subfolderData = await subfolderResponse.json();
                    const subcategories: ICddCategory[] = [];

                    for (const sub of subfolderData.value) {

                        if (sub.Name === "Forms") continue;

                        const subFilesResponse = await fetch(
                            `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${sub.ServerRelativeUrl}')/Files?$expand=ListItemAllFields`,
                            { headers: { Accept: "application/json;odata=nometadata" } }
                        );

                        const subFileData = await subFilesResponse.json();

                        const subDocuments: ICddDocument[] = await Promise.all(
                            subFileData.value.map(async (file: any) => {

                                let url = file.ServerRelativeUrl;

                                if (file.Name.toLowerCase().endsWith(".url")) {
                                    try {
                                        const res = await fetch(
                                            `${webUrl}/_api/web/GetFileByServerRelativeUrl('${file.ServerRelativeUrl}')/$value`
                                        );
                                        const text = await res.text();
                                        const match = text.match(/URL=(.*)/i);
                                        if (match && match[1]) url = match[1].trim();
                                    } catch {
                                        console.warn("Failed to read .url file", file.Name);
                                    }
                                }

                                const rawTags = file.ListItemAllFields?.Tags || "";
                                const tags = rawTags.toLowerCase().split(/[,\s]+/).filter(Boolean);

                                return {
                                    name: cleanName(file.Name),
                                    url,
                                    tags
                                };
                            })
                        );

                        subcategories.push({
                            name: sub.Name,
                            documents: subDocuments
                        });
                    }

                    subcategories.sort((a, b) => a.name.localeCompare(b.name));

                    results.push({
                        name: folder.Name,
                        documents,
                        subcategories
                    });
                }

                results.sort((a, b) => a.name.localeCompare(b.name));
                setCategories(results);

            } catch (err) {
                console.error("Error loading CDD resources:", err);
            }

            setLoading(false);
        };

        loadResources();

    }, []);

    const search = searchText.toLowerCase();

    const matchesSearch = (doc: ICddDocument): boolean => {

        if (!search) return true;

        const terms = search.split(" ").filter(Boolean);

        return terms.every(term => {

            const inName = doc.name.toLowerCase().includes(term);

            const inTags = doc.tags?.some(tag =>
                tag.includes(term)
            );

            return inName || inTags;
        });
    };


    React.useEffect(() => {
        if (!search) {
            setExpandedItems(new Set());
            return;
        }

        const newExpanded = new Set<string>();

        categories.forEach(category => {
            const catId = `cat-${category.name}`;

            const hasDocMatch =
                category.documents?.some(doc => matchesSearch(doc)) ||
                category.subcategories?.some(sub =>
                    sub.documents?.some(doc => matchesSearch(doc))
                );

            const hasSubcategoryMatch =
                category.subcategories?.some(sub =>
                    sub.name.toLowerCase().includes(search)
                );

            const shouldExpand = hasDocMatch || hasSubcategoryMatch;

            if (shouldExpand) {
                newExpanded.add(catId);

                category.subcategories?.forEach(sub => {
                    const subId = `${catId}-${sub.name}`;

                    const subHasMatch =
                        sub.name.toLowerCase().includes(search) ||
                        sub.documents?.some(doc => matchesSearch(doc));

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

            <input
                className="w-full rounded border p-2 mb-3"
                type="text"
                placeholder="Search resources..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
            />

            {categories.map((category) => {

                const catId = `cat-${category.name}`;
                const catOpen = isOpen(catId);

                const showCategory =
                    !search ||
                    category.name.toLowerCase().includes(search) ||
                    category.documents?.some(doc => matchesSearch(doc)) ||
                    category.subcategories?.some(
                        sub =>
                            sub.name.toLowerCase().includes(search) ||
                            sub.documents?.some(doc => matchesSearch(doc))
                    );

                if (!showCategory) return null;

                return (
                    <div key={catId} className="mb-2">

                        <button
                            className="font-semibold cursor-pointer"
                            onClick={() => toggleExpand(catId)}
                        >
                            {catOpen ? "▼" : "▶"} {category.name}
                        </button>

                        {catOpen && (
                            <div className="ml-4 mt-1">

                                {category.documents?.map((doc) => {

                                    if (
                                        search &&
                                        !category.name.toLowerCase().includes(search) &&
                                        !matchesSearch(doc)
                                    ) return null;

                                    return (
                                        <div key={doc.url} className="flex items-center gap-2 py-1">

                                            <input
                                                type="checkbox"
                                                checked={selectedDocs.has(doc.url)}
                                                onChange={() => toggleSelect(doc.url)}
                                            />

                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-800 hover:text-blue-600 hover:underline cursor-pointer"
                                            >
                                                {doc.name}
                                            </a>

                                        </div>
                                    );
                                })}

                                {category.subcategories?.map((sub) => {

                                    const subId = `${catId}-${sub.name}`;
                                    const subOpen = isOpen(subId);

                                    const showSub =
                                        !search ||
                                        category.name.toLowerCase().includes(search) ||
                                        sub.name.toLowerCase().includes(search) ||
                                        sub.documents?.some(doc => matchesSearch(doc));

                                    if (!showSub) return null;

                                    return (
                                        <div key={subId} className="mt-1">

                                            <button
                                                className="font-medium cursor-pointer"
                                                onClick={() => toggleExpand(subId)}
                                            >
                                                {subOpen ? "▼" : "▶"} {sub.name}
                                            </button>

                                            {subOpen && (
                                                <div className="ml-4 mt-1">

                                                    {sub.documents?.map((doc) => {

                                                        if (
                                                            search &&
                                                            !sub.name.toLowerCase().includes(search) &&
                                                            !matchesSearch(doc)
                                                        ) return null;

                                                        return (
                                                            <div key={doc.url} className="flex items-center gap-2 py-1">

                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedDocs.has(doc.url)}
                                                                    onChange={() => toggleSelect(doc.url)}
                                                                />

                                                                <a
                                                                    href={doc.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-gray-800 hover:text-blue-600 hover:underline cursor-pointer"
                                                                >
                                                                    {doc.name}
                                                                </a>

                                                            </div>
                                                        );
                                                    })}

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

            {selectedDocs.size > 0 && (
                <div className="mt-4 pt-3 border-t flex justify-between items-center">

                    <span className="text-gray-600 text-sm">
                        {selectedDocs.size} selected
                    </span>

                    <div className="flex gap-2">

                        <button
                            className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-100"
                            onClick={clearSelection}
                        >
                            Clear
                        </button>

                        <button
                            className="px-4 py-1 bg-blue-600 text-white rounded"
                        >
                            Send
                        </button>

                    </div>

                </div>
            )}

        </section>
    );
}