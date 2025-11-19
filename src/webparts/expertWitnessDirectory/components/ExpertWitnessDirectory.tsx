import * as React from "react";
import type { IExpertWitnessDirectoryProps } from "./IExpertWitnessDirectoryProps";
import { Collapsible } from "@components/Collapsible";
import ExpertWitnessService, {
  IExpert,
} from "../../../services/ExpertWitnessService";

const MAX_VISIBLE = 4;

const ExpertWitnessDirectory: React.FC<IExpertWitnessDirectoryProps> = (
  props,
) => {
  const [experts, setExperts] = React.useState<IExpert[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      try {
        const data = await ExpertWitnessService.getExperts(
          props.context,
        );
        if (!active) return;
        setExperts(data);
      } catch (e: unknown) {
        if (!active) return;
        console.error("Failed to load experts", e);
        setError("Could not load Expert Directory.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [props.context]);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return experts;

    return experts.filter((expert) => {
      const haystack = [
        expert.name,
        expert.phone ?? "",
        expert.email ?? "",
        expert.department ?? "",
        ...(expert.expertise || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [search, experts]);

  // Only ever show up to MAX_VISIBLE
  const visibleExperts = React.useMemo(
    () => filtered.slice(0, MAX_VISIBLE),
    [filtered],
  );

  return (
    <Collapsible
      instanceId={props.instanceId}
      title="Expert Witness Directory"
    >
      <div className="p-4">
        {/* Search form */}
        <form
          role="search"
          className="mx-auto max-w-lg"
          onSubmit={(e) => e.preventDefault()}
        >
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="expert-search"
          >
            Search experts
          </label>
          <div className="mt-1 flex">
            <input
              id="expert-search"
              type="search"
              placeholder="Name, field, location…"
              className="w-full rounded-l-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-r-md border border-l-0 border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Search
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Showing up to {MAX_VISIBLE} matches. Refine search to narrow
            results.
          </p>
        </form>

        {/* Status messages */}
        {loading && (
          <p className="mt-4 text-sm text-slate-500">
            Loading Expert Directory…
          </p>
        )}

        {error && !loading && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            No experts match that search.
          </p>
        )}

        {/* Expert cards */}
        {!loading && !error && visibleExperts.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {visibleExperts.map((expert) => (
              <li
                key={expert.id}
                className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {expert.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {expert.expertise && expert.expertise.length > 0
                        ? expert.expertise.join(" • ")
                        : "Expert"}
                      {expert.department
                        ? ` • ${expert.department}`
                        : ""}
                    </p>
                  </div>
                  {/* status badge */}
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Available
                  </span>
                </div>

                {expert.phone && (
                  <p className="mt-1 text-xs text-slate-600">
                    Phone: {expert.phone}
                  </p>
                )}
                {expert.email && (
                  <p className="text-xs text-slate-600">
                    Email:{" "}
                    <a
                      href={`mailto:${expert.email}`}
                      className="text-blue-700 hover:underline"
                    >
                      {expert.email}
                    </a>
                  </p>
                )}

                <div className="mt-2 flex gap-3 text-sm">
                  {/* TODO: wire these to real profile if available */}
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                  >
                    Request CV
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Collapsible>
  );
};

export default ExpertWitnessDirectory;
