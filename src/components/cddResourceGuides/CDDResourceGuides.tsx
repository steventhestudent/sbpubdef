import * as React from "react";
import RoleBasedViewProps from "@type/RoleBasedViewProps";

interface ICddDocument {
    name: string;
    url: string;
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

    const toggleExpand = (id: string): void => {
        const newExpanded = new Set(expandedItems);

        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);

        setExpandedItems(newExpanded);
    };

    const isOpen = (id: string): boolean => expandedItems.has(id);

    React.useEffect(() => {

        const loadResources = async (): Promise<void> => {

            const baseFolder =
                "/sites/PD-Intranet/Shared Documents/Intranet Form Database/CDD";

            try {

                const webUrl = pnpWrapper.ctx.pageContext.web.absoluteUrl;

                const folderResponse = await fetch(
                    `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${baseFolder}')/Folders`,
                    {
                        headers: { Accept: "application/json;odata=nometadata" }
                    }
                );

                const folderData = await folderResponse.json();

                const results: ICddCategory[] = [];

                for (const folder of folderData.value) {

                    if (folder.Name === "Forms") continue;

                    const filesResponse = await fetch(
                        `${webUrl}/_api/web/GetFolderByServerRelativeUrl('${folder.ServerRelativeUrl}')/Files`,
                        {
                            headers: { Accept: "application/json;odata=nometadata" }
                        }
                    );

                    const fileData = await filesResponse.json();

                    const documents: ICddDocument[] = await Promise.all(
                        fileData.value.map(async (file: any) => {

                            let url = file.ServerRelativeUrl;

                            // Detect SharePoint .url shortcut files
                            if (file.Name.toLowerCase().endsWith(".url")) {

                                try {
                                    const res = await fetch(
                                        `${webUrl}/_api/web/GetFileByServerRelativeUrl('${file.ServerRelativeUrl}')/$value`
                                    );
                                    const text = await res.text();

                                    // Extract the real website URL
                                    const match = text.match(/URL=(.*)/i);

                                    if (match && match[1]) {
                                        url = match[1].trim();
                                    }

                                } catch (err) {
                                    console.warn("Failed to read .url file", file.Name);
                                }
                            }

                            return {
                                name: file.Name.replace(".url", ""),
                                url
                            };
                        })
                    );

                    results.push({
                        name: folder.Name,
                        documents
                    });
                }

                /*
                ============================================================
                TEMPORARY CATEGORIES
                These are hardcoded because the folders do not exist yet in
                the SharePoint CDD document library.
        
                Once these folders are added in SharePoint, this section
                should be removed and the webpart will load them dynamically.
                ============================================================
                */

                // TEMPORARY: General Forms category
                results.push({
                    name: "General Forms",
                    documents: []
                });

                // TEMPORARY: Community Resources with subcategories
                results.push({
                    name: "Community Resources",
                    subcategories: [
                        {
                            name: "Housing",
                            documents: []
                        },
                        {
                            name: "Treatment",
                            documents: []
                        }
                    ]
                });

                setCategories(results);

            } catch (err) {
                console.error("Error loading CDD resources:", err);
            }

            setLoading(false);
        };

        loadResources();

    }, []);

    const search = searchText.toLowerCase();

    const matchesSearch = (text: string): boolean =>
        text.toLowerCase().includes(search);

    if (loading) {
        return <div className="p-4">Loading resources...</div>;
    }

    return (
        <section className="p-4 text-sm">

            {/* SEARCH BAR */}
            <input
                className="w-full rounded border p-2 mb-3"
                type="text"
                placeholder="Search resources..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
            />

            {/* CATEGORY LIST */}
            {categories.map((category) => {

                const catId = `cat-${category.name}`;
                const catOpen =
                    isOpen(catId) ||
                    (search &&
                        (
                            category.documents?.some(doc => matchesSearch(doc.name)) ||
                            category.subcategories?.some(
                                sub =>
                                    matchesSearch(sub.name) ||
                                    sub.documents?.some(doc => matchesSearch(doc.name))
                            )
                        )
                    );

                const showCategory =
                    !search ||
                    matchesSearch(category.name) ||
                    category.documents?.some(doc => matchesSearch(doc.name)) ||
                    category.subcategories?.some(
                        sub =>
                            matchesSearch(sub.name) ||
                            sub.documents?.some(doc => matchesSearch(doc.name))
                    );

                if (!showCategory) return null;

                return (
                    <div key={catId} className="mb-2">

                        {/* CATEGORY BUTTON */}
                        <button
                            className="font-semibold cursor-pointer"
                            onClick={() => toggleExpand(catId)}
                        >
                            {catOpen ? "▼" : "▶"} {category.name}
                        </button>

                        {catOpen && (

                            <div className="ml-4 mt-1">

                                {/* DOCUMENTS */}
                                {category.documents?.map((doc) => {

                                    if (
                                        search &&
                                        !matchesSearch(category.name) &&
                                        !matchesSearch(doc.name)
                                    ) return null;

                                    return (
                                        <a
                                            key={doc.url}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block py-1 text-blue-600 hover:underline"
                                        >
                                            {doc.name}
                                        </a>
                                    );
                                })}

                                {/* SUBCATEGORIES */}
                                {category.subcategories?.map((sub) => {

                                    const subId = `${catId}-${sub.name}`;
                                    const subOpen =
                                        isOpen(subId) ||
                                        (search &&
                                            (
                                                matchesSearch(sub.name) ||
                                                sub.documents?.some(doc => matchesSearch(doc.name))
                                            )
                                        );

                                    const showSub =
                                        !search ||
                                        matchesSearch(category.name) ||
                                        matchesSearch(sub.name) ||
                                        sub.documents?.some(doc => matchesSearch(doc.name));

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
                                                            !matchesSearch(category.name) &&
                                                            !matchesSearch(doc.name)
                                                        ) return null;

                                                        return (
                                                            <a
                                                                key={doc.url}
                                                                href={doc.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block py-1 text-blue-600 hover:underline"
                                                            >
                                                                {doc.name}
                                                            </a>
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

        </section>
    );
}