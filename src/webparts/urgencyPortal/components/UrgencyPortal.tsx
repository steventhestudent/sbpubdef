import * as React from "react";
import * as ReactDom from "react-dom";
import * as pbi from "powerbi-client";
import {
  IUrgencyPortalProps,
  IPowerBiLinkConfig,
  IPowerBiParsedLink,
} from "./IUrgencyPortalProps";
import { Collapsible } from "@components/Collapsible";

type PBIEventResponseType =
  | { message?: string; error?: { message?: string } }
  | undefined;

const powerbiService = new pbi.service.Service(
  pbi.factories.hpmFactory,
  pbi.factories.wpmpFactory,
  pbi.factories.routerFactory,
);

async function getPowerBiToken(
  context: IUrgencyPortalProps["context"],
): Promise<string> {
  const provider = await context.aadTokenProviderFactory.getTokenProvider();
  return provider.getToken("https://analysis.windows.net/powerbi/api");
}

async function getReportInfo(
  accessToken: string,
  reportId: string,
): Promise<{ embedUrl: string; webUrl: string }> {
  const response: Response = await fetch(
    `https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const body: string = await response.text().catch((): string => "");
    throw new Error(`Failed to get report (${response.status}). ${body}`);
  }

  const json = (await response.json()) as { embedUrl: string; webUrl: string };
  return { embedUrl: json.embedUrl, webUrl: json.webUrl };
}

interface IParsedItemWithUrl extends IPowerBiParsedLink {
  originalUrl: string;
}

type IServiceWithResize = {
  resize: (element: HTMLElement) => void;
};

function isServiceWithResize(value: unknown): value is IServiceWithResize {
  if (!value || typeof value !== "object") return false;
  const v = value as { resize?: unknown };
  return typeof v.resize === "function";
}

function normalizeBookmarkName(bookmarkName?: string): string {
  return (bookmarkName || "").trim().toLowerCase();
}

function normalizePageName(pageName?: string): string {
  return (pageName || "").trim();
}

function parseLink(cfg: IPowerBiLinkConfig): {
  item?: IParsedItemWithUrl;
  error?: string;
} {
  const title: string = (cfg.title || "").trim();
  const urlText: string = (cfg.url || "").trim();

  if (!title) return { error: "Missing title" };
  if (!urlText) return { error: `Missing URL for "${title}"` };
  if (cfg.kind !== "report" && cfg.kind !== "visual") {
    return { error: `Invalid kind for "${title}"` };
  }

  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return { error: `Invalid URL for "${title}"` };
  }

  const bookmarkNameRaw: string = (cfg.bookmarkName || "").trim();
  const bookmarkName: string | undefined = bookmarkNameRaw
    ? bookmarkNameRaw
    : undefined;

  const cfgPageName: string = normalizePageName(cfg.pageName);
  const pageNameFromCfg: string | undefined = cfgPageName
    ? cfgPageName
    : undefined;

  const path: string = url.pathname || "";
  const isReportEmbed: boolean = path.toLowerCase() === "/reportembed";

  if (cfg.kind === "report") {
    if (isReportEmbed) {
      const reportId: string = url.searchParams.get("reportId") || "";
      if (!reportId) {
        return { error: `reportEmbed URL missing reportId for "${title}"` };
      }

      return {
        item: {
          title,
          kind: "report",
          reportId,
          pageName: pageNameFromCfg,
          bookmarkName,
          originalUrl: urlText,
        },
      };
    }

    const parts: string[] = path.split("/").filter(Boolean);
    const idx: number = parts.indexOf("reports");
    if (idx >= 0 && parts[idx + 1]) {
      const reportId: string = parts[idx + 1];
      const pageNameFromUrl: string | undefined = parts[idx + 2]
        ? parts[idx + 2]
        : undefined;

      return {
        item: {
          title,
          kind: "report",
          reportId,
          pageName: pageNameFromUrl || pageNameFromCfg,
          bookmarkName,
          originalUrl: urlText,
        },
      };
    }

    return { error: `Unsupported report URL for "${title}"` };
  }

  const parts: string[] = path.split("/").filter(Boolean);
  const idx: number = parts.indexOf("reports");
  if (idx < 0 || !parts[idx + 1] || !parts[idx + 2]) {
    return {
      error: `Visual URL must be /reports/{reportId}/{pageName} for "${title}"`,
    };
  }

  const reportId: string = parts[idx + 1];
  const pageName: string = parts[idx + 2];
  const visualName: string = url.searchParams.get("visual") || "";
  if (!visualName) {
    return { error: `Visual URL missing visual=... for "${title}"` };
  }

  return {
    item: {
      title,
      kind: "visual",
      reportId,
      pageName,
      visualName,
      bookmarkName,
      originalUrl: urlText,
    },
  };
}

function parseAll(links: IPowerBiLinkConfig[]): {
  items: IParsedItemWithUrl[];
  errors: string[];
} {
  const items: IParsedItemWithUrl[] = [];
  const errors: string[] = [];

  (links || []).forEach((cfg: IPowerBiLinkConfig) => {
    const res = parseLink(cfg);
    if (res.error) errors.push(res.error);
    if (res.item) items.push(res.item);
  });

  return { items, errors };
}

function getItemKey(item: IParsedItemWithUrl): string {
  const url: string = (item.originalUrl || "").trim();
  const page: string = normalizePageName(item.pageName);
  const bookmark: string = normalizeBookmarkName(item.bookmarkName);

  const parts: string[] = [url];
  if (page) parts.push(`page:${page}`);
  if (bookmark) parts.push(`bookmark:${bookmark}`);

  return parts.join("||");
}

function resolveDefaultKey(
  configuredRaw: string,
  items: IParsedItemWithUrl[],
): string {
  const configured: string = (configuredRaw || "").trim();
  if (!configured) return "";

  const exact: IParsedItemWithUrl | undefined = items.find(
    (i: IParsedItemWithUrl) => getItemKey(i) === configured,
  );
  if (exact) return getItemKey(exact);

  const byUrl: IParsedItemWithUrl | undefined = items.find(
    (i: IParsedItemWithUrl) => (i.originalUrl || "").trim() === configured,
  );
  if (byUrl) return getItemKey(byUrl);

  return "";
}

function hasKey(items: IParsedItemWithUrl[], key: string): boolean {
  return items.some((i: IParsedItemWithUrl) => getItemKey(i) === key);
}

function reconcileSelectedKey(
  items: IParsedItemWithUrl[],
  selectedKey: string,
  selection: IParsedItemWithUrl | undefined,
): string {
  const key: string = (selectedKey || "").trim();
  if (!key) return "";
  if (hasKey(items, key)) return key;
  if (!selection) return "";

  const match: IParsedItemWithUrl | undefined = items.find(
    (i: IParsedItemWithUrl) =>
      (i.originalUrl || "").trim() === (selection.originalUrl || "").trim() &&
      normalizePageName(i.pageName) === normalizePageName(selection.pageName) &&
      (i.title || "").trim() === (selection.title || "").trim(),
  );

  if (match) return getItemKey(match);

  return "";
}

function stripQuery(url: string): string {
  const idx: number = url.indexOf("?");
  if (idx < 0) return url;
  return url.slice(0, idx);
}

function buildServiceFullscreenUrl(
  webUrl: string,
  pageName: string | undefined,
  bookmarkGuid: string | undefined,
): string {
  const base: string = stripQuery((webUrl || "").trim());
  const page: string = normalizePageName(pageName);
  const path: string = page ? `${base}/${encodeURIComponent(page)}` : base;

  const params: URLSearchParams = new URLSearchParams();
  params.set("experience", "power-bi");
  if (bookmarkGuid) params.set("bookmarkGuid", bookmarkGuid);

  return `${path}?${params.toString()}`;
}

function buildEmbedNewTabUrl(embedUrl: string): string {
  const base: string = (embedUrl || "").trim();
  const hasQuery: boolean = base.indexOf("?") >= 0;
  return `${base}${hasQuery ? "&" : "?"}autoAuth=true`;
}

function FullscreenIcon(props: { size?: number }): JSX.Element {
  const size: number = props.size ?? 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      role="img"
      style={{ display: "block", pointerEvents: "none" }}
    >
      <path
        fill="currentColor"
        d="M7 7h3V5H5v5h2V7Zm7-2v2h3v3h2V5h-5ZM7 14H5v5h5v-2H7v-3Zm12 0h-2v3h-3v2h5v-5Z"
      />
    </svg>
  );
}

function ExitFullscreenIcon(props: { size?: number }): JSX.Element {
  const size: number = props.size ?? 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      role="img"
      style={{ display: "block", pointerEvents: "none" }}
    >
      <path
        fill="currentColor"
        d="M7 7h3V5H5v5h2V7Zm7-2v2h3v3h2V5h-5ZM7 14H5v5h5v-2H7v-3Zm12 0h-2v3h-3v2h5v-5Z"
      />
    </svg>
  );
}

export default function UrgencyPortal(props: IUrgencyPortalProps): JSX.Element {
  const [selectedKey, setSelectedKey] = React.useState<string>(
    (props.defaultUrl || "").trim(),
  );
  const [selection, setSelection] = React.useState<
    IParsedItemWithUrl | undefined
  >(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [openInNewTabUrl, setOpenInNewTabUrl] = React.useState<
    string | undefined
  >(undefined);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const bookmarkAppliedForKeyRef = React.useRef<string>("");

  const { items, errors } = React.useMemo(
    (): { items: IParsedItemWithUrl[]; errors: string[] } =>
      parseAll(props.links),
    [props.links],
  );

  const openFullscreen = React.useCallback((): void => {
    if (selection) setIsFullscreen(true);
  }, [selection]);

  React.useEffect(() => {
    const nextKey: string = resolveDefaultKey(props.defaultUrl || "", items);
    if (nextKey) {
      setSelectedKey(nextKey);
      return;
    }

    const configured: string = (props.defaultUrl || "").trim();
    if (configured) {
      setSelectedKey("");
    }
  }, [props.defaultUrl, items]);

  React.useEffect(() => {
    const active: boolean = Boolean(selectedKey);
    if (!active) {
      setSelection(undefined);
      setIsLoading(false);
      setError(undefined);
      setOpenInNewTabUrl(undefined);
      bookmarkAppliedForKeyRef.current = "";
      setIsFullscreen(false);
      if (containerRef.current) powerbiService.reset(containerRef.current);
      return;
    }

    const found: IParsedItemWithUrl | undefined = items.find(
      (i: IParsedItemWithUrl) => getItemKey(i) === selectedKey,
    );

    setSelection(found);
    setError(undefined);
  }, [selectedKey, items]);

  React.useEffect(() => {
    const nextKey: string = reconcileSelectedKey(items, selectedKey, selection);
    if (nextKey !== selectedKey) setSelectedKey(nextKey);
  }, [items, selectedKey, selection]);

  React.useEffect(() => {
    bookmarkAppliedForKeyRef.current = "";
  }, [selection?.originalUrl, selection?.pageName, selection?.bookmarkName]);

  React.useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setIsFullscreen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(() => {
      try {
        if (isServiceWithResize(powerbiService)) {
          powerbiService.resize(container);
        }
      } catch {
        return;
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [isFullscreen]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (!selection) return;
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(undefined);
      setOpenInNewTabUrl(undefined);

      try {
        const token: string = await getPowerBiToken(props.context);
        const reportInfo: { embedUrl: string; webUrl: string } =
          await getReportInfo(token, selection.reportId);

        if (cancelled || !containerRef.current) return;

        powerbiService.reset(containerRef.current);

        if (selection.kind === "report") {
          const config: pbi.IReportEmbedConfiguration = {
            type: "report",
            id: selection.reportId,
            embedUrl: reportInfo.embedUrl,
            accessToken: token,
            tokenType: pbi.models.TokenType.Aad,
            pageName: selection.pageName,
            settings: {
              navContentPaneEnabled: false,
              panes: { filters: { visible: false } },
            },
          };

          const report = powerbiService.embed(
            containerRef.current,
            config,
          ) as pbi.Report;

          const selectionKey: string = getItemKey(selection);
          setOpenInNewTabUrl(buildEmbedNewTabUrl(reportInfo.embedUrl));

          const onLoaded = (): void => {
            if (cancelled) return;

            const desiredDisplay: string = (selection.bookmarkName || "").trim();
            const desiredNorm: string = normalizeBookmarkName(desiredDisplay);

            report.bookmarksManager
              .getBookmarks()
              .then((bookmarks: pbi.models.IReportBookmark[]) => {
                const match: pbi.models.IReportBookmark | undefined =
                  desiredNorm
                    ? bookmarks.find((b: pbi.models.IReportBookmark) => {
                        const n: string = normalizeBookmarkName(b.name);
                        const d: string = normalizeBookmarkName(b.displayName);
                        return n === desiredNorm || d === desiredNorm;
                      })
                    : undefined;

                const bookmarkGuid: string | undefined = match
                  ? match.name
                  : undefined;

                const fullscreenUrl: string = buildServiceFullscreenUrl(
                  reportInfo.webUrl,
                  selection.pageName,
                  bookmarkGuid,
                );
                setOpenInNewTabUrl(fullscreenUrl);

                if (!desiredNorm) return undefined;
                if (bookmarkAppliedForKeyRef.current === selectionKey) return undefined;

                bookmarkAppliedForKeyRef.current = selectionKey;

                if (match) return report.bookmarksManager.apply(match.name);
                return undefined;
              })
              .catch((): void => undefined);
          };

          const onRendered = (): void => {
            if (!cancelled) setIsLoading(false);
          };

          const onError = (event: pbi.service.ICustomEvent<unknown>): void => {
            const detail = event.detail as PBIEventResponseType;
            const message: string =
              detail?.message ??
              detail?.error?.message ??
              "Unknown Power BI error";
            if (!cancelled) {
              setError(message);
              setIsLoading(false);
            }
          };

          report.off("loaded");
          report.on("loaded", onLoaded);

          report.off("rendered");
          report.on("rendered", onRendered);

          report.off("error");
          report.on("error", onError);

          return;
        }

        const pageName: string | undefined = selection.pageName;
        const visualName: string | undefined = selection.visualName;

        if (!pageName || !visualName) {
          setError("Visual requires pageName and visualName");
          setIsLoading(false);
          return;
        }

        setOpenInNewTabUrl(buildEmbedNewTabUrl(reportInfo.embedUrl));

        const config: pbi.IVisualEmbedConfiguration = {
          type: "visual",
          id: selection.reportId,
          embedUrl: reportInfo.embedUrl,
          accessToken: token,
          tokenType: pbi.models.TokenType.Aad,
          pageName,
          visualName,
          settings: {
            panes: {
              filters: { visible: false },
              pageNavigation: { visible: false },
            },
          },
        };

        const visual = powerbiService.embed(
          containerRef.current,
          config,
        ) as pbi.Visual;

        const onRendered = (): void => {
          if (!cancelled) setIsLoading(false);
        };

        const onError = (event: pbi.service.ICustomEvent<unknown>): void => {
          const detail = event.detail as PBIEventResponseType;
          const message: string =
            detail?.message ?? detail?.error?.message ?? "Power BI error";
          if (!cancelled) {
            setError(message);
            setIsLoading(false);
          }
        };

        visual.off("rendered");
        visual.on("rendered", onRendered);

        visual.off("error");
        visual.on("error", onError);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setIsLoading(false);
        }
      }
    };

    run().catch((e: unknown) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (containerRef.current) powerbiService.reset(containerRef.current);
    };
  }, [selection, props.context]);

  const wrapperStyle: React.CSSProperties = {
    fontFamily: "Segoe UI, Arial, sans-serif",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    font: "inherit",
    flex: "0 0 auto",
  };

  const iconButtonStyle: React.CSSProperties = {
    all: "unset",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 6,
    border: "1px solid #ccc",
    backgroundColor: "white",
    cursor: "pointer",
    padding: 0,
    lineHeight: 0,
    fontSize: 0,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  };

  const overlay =
    isFullscreen && selection
      ? ReactDom.createPortal(
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483646,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              flexDirection: "column",
            }}
            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
              if (e.target === e.currentTarget) setIsFullscreen(false);
            }}
          >
            <div
              style={{
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderBottom: "1px solid #ddd",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {selection.title}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {openInNewTabUrl && (
                  <a
                    href={openInNewTabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0f6cbd", textDecoration: "underline" }}
                  >
                    Open in new tab
                  </a>
                )}

                <button
                  type="button"
                  aria-label="Exit fullscreen"
                  onClick={() => setIsFullscreen(false)}
                  style={iconButtonStyle}
                >
                  <ExitFullscreenIcon />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <Collapsible
      instanceId={props.context.instanceId}
      title="PowerBI - Urgency Portal"
    >
      <div style={{ ...wrapperStyle, marginTop: 8 }}>
        <div style={{ paddingLeft: 5, paddingRight: 5 }}>
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <select
              style={selectStyle}
              value={selectedKey}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedKey(e.currentTarget.value)
              }
              disabled={items.length === 0}
            >
              <option value="">-- Select --</option>
              {items.map((item: IParsedItemWithUrl) => {
                const key: string = getItemKey(item);
                return (
                  <option key={key} value={key}>
                    {item.title}
                  </option>
                );
              })}
            </select>

            <div style={{ flex: "1 1 auto", minWidth: 0 }} />

            {selection && (
              <button
                type="button"
                aria-label="Fullscreen"
                onClick={openFullscreen}
                style={iconButtonStyle}
              >
                <FullscreenIcon />
              </button>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <p
            style={{
              color: "darkred",
              whiteSpace: "pre-wrap",
              marginTop: 10,
              paddingLeft: 5,
              paddingRight: 5,
            }}
          >
            {errors.join("\n")}
          </p>
        )}

        {isLoading && (
          <p style={{ paddingLeft: 5, paddingRight: 5 }}>Loading…</p>
        )}

        {error && (
          <p
            style={{
              color: "darkred",
              whiteSpace: "pre-wrap",
              paddingLeft: 5,
              paddingRight: 5,
            }}
          >
            {error}
          </p>
        )}

        {selection && (
          <div style={{ paddingLeft: 5, paddingRight: 5 }}>
            <div style={{ marginTop: 12 }}>
              <div
                ref={containerRef}
                style={
                  isFullscreen
                    ? {
                        position: "fixed",
                        top: 45,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 2147483647,
                        width: "100%",
                        height: "calc(100vh - 45px)",
                        border: "none",
                        borderRadius: 0,
                      }
                    : {
                        height: "650px",
                        width: "100%",
                        border: "1px solid #ddd",
                        borderRadius: 6,
                      }
                }
              />
            </div>
          </div>
        )}

        {overlay}
      </div>
    </Collapsible>
  );
}