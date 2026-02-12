import * as React from "react";
import * as pbi from "powerbi-client";
import { IUrgencyPortalProps, IPowerBiLinkConfig, IPowerBiParsedLink } from "./IUrgencyPortalProps";
import { Collapsible } from "@components/Collapsible";

const powerbiService = new pbi.service.Service(
  pbi.factories.hpmFactory,
  pbi.factories.wpmpFactory,
  pbi.factories.routerFactory
);

async function getPowerBiToken(context: IUrgencyPortalProps["context"]): Promise<string> {
  const provider = await context.aadTokenProviderFactory.getTokenProvider();
  return provider.getToken("https://analysis.windows.net/powerbi/api");
}

async function getEmbedUrl(accessToken: string, reportId: string): Promise<string> {
  const response = await fetch(`https://api.powerbi.com/v1.0/myorg/reports/${reportId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to get report (${response.status}). ${body}`);
  }

  const json: { embedUrl: string } = await response.json();
  return json.embedUrl;
}

interface IParsedItemWithUrl extends IPowerBiParsedLink {
  originalUrl: string;
}

function parseLink(cfg: IPowerBiLinkConfig): { item?: IParsedItemWithUrl; error?: string } {
  const title = (cfg.title || "").trim();
  const urlText = (cfg.url || "").trim();

  if (!title) return { error: "Missing title" };
  if (!urlText) return { error: `Missing URL for "${title}"` };
  if (cfg.kind !== "report" && cfg.kind !== "visual") return { error: `Invalid kind for "${title}"` };

  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    return { error: `Invalid URL for "${title}"` };
  }

  const path = url.pathname || "";
  const isReportEmbed = path.toLowerCase() === "/reportembed";

  if (cfg.kind === "report") {
    if (isReportEmbed) {
      const reportId = url.searchParams.get("reportId") || "";
      if (!reportId) return { error: `reportEmbed URL missing reportId for "${title}"` };
      return { item: { title, kind: "report", reportId, originalUrl: urlText } };
    }

    const parts = path.split("/").filter(Boolean);
    const idx = parts.indexOf("reports");
    if (idx >= 0 && parts[idx + 1]) {
      const reportId = parts[idx + 1];
      const pageName = parts[idx + 2];
      return { item: { title, kind: "report", reportId, pageName, originalUrl: urlText } };
    }

    return { error: `Unsupported report URL for "${title}"` };
  }

  const parts = path.split("/").filter(Boolean);
  const idx = parts.indexOf("reports");
  if (idx < 0 || !parts[idx + 1] || !parts[idx + 2]) {
    return { error: `Visual URL must be /reports/{reportId}/{pageName} for "${title}"` };
  }

  const reportId = parts[idx + 1];
  const pageName = parts[idx + 2];
  const visualName = url.searchParams.get("visual") || "";
  if (!visualName) return { error: `Visual URL missing visual=... for "${title}"` };

  return { item: { title, kind: "visual", reportId, pageName, visualName, originalUrl: urlText } };
}

function parseAll(links: IPowerBiLinkConfig[]): { items: IParsedItemWithUrl[]; errors: string[] } {
  const items: IParsedItemWithUrl[] = [];
  const errors: string[] = [];

  (links || []).forEach((cfg) => {
    const res = parseLink(cfg);
    if (res.error) errors.push(res.error);
    if (res.item) items.push(res.item);
  });

  return { items, errors };
}

function getItemKey(item: IParsedItemWithUrl): string {
  const kind = item.kind;
  const reportId = item.reportId;
  const pageName = item.pageName || "";
  const visualName = item.visualName || "";
  return `${kind}|${reportId}|${pageName}|${visualName}`;
}

export default function UrgencyPortal(props: IUrgencyPortalProps): JSX.Element {
  const [selectedKey, setSelectedKey] = React.useState<string>("");
  const [selection, setSelection] = React.useState<IParsedItemWithUrl | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [openInNewTabUrl, setOpenInNewTabUrl] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const { items, errors } = React.useMemo(() => parseAll(props.links), [props.links]);

  React.useEffect(() => {
    if (!selectedKey) {
      setSelection(null);
      setIsLoading(false);
      setError(null);
      setOpenInNewTabUrl(null);
      if (containerRef.current) powerbiService.reset(containerRef.current);
      return;
    }

    const found = items.find((i) => getItemKey(i) === selectedKey) || null;
    setSelection(found);
    setError(null);
  }, [selectedKey, items]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (!selection) return;
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);
      setOpenInNewTabUrl(null);

      try {
        const token = await getPowerBiToken(props.context);
        const embedUrl = await getEmbedUrl(token, selection.reportId);

        if (cancelled || !containerRef.current) return;

        const hasQuery = embedUrl.indexOf("?") >= 0;
        const urlWithAutoAuth = `${embedUrl}${hasQuery ? "&" : "?"}autoAuth=true`;
        setOpenInNewTabUrl(urlWithAutoAuth);

        powerbiService.reset(containerRef.current);

        if (selection.kind === "report") {
          const config: pbi.IReportEmbedConfiguration = {
            type: "report",
            id: selection.reportId,
            embedUrl,
            accessToken: token,
            tokenType: pbi.models.TokenType.Aad,
            pageName: selection.pageName,
            settings: {
              navContentPaneEnabled: false,
              panes: { filters: { visible: false } }
            }
          };

          const report = powerbiService.embed(containerRef.current, config) as pbi.Report;

          report.off("loaded");
          report.on("loaded", () => {
            if (!cancelled) setIsLoading(false);
          });

          report.off("error");
          report.on("error", (event: pbi.service.ICustomEvent<unknown>) => {
            const detail = event.detail as { message?: string; error?: { message?: string } } | undefined;
            const message = detail?.message ?? detail?.error?.message ?? "Unknown Power BI error";
            if (!cancelled) {
              setError(message);
              setIsLoading(false);
            }
          });

          return;
        }

        const pageName = selection.pageName;
        const visualName = selection.visualName;

        if (!pageName || !visualName) {
          setError("Visual requires pageName and visualName");
          setIsLoading(false);
          return;
        }

        const config: pbi.IVisualEmbedConfiguration = {
          type: "visual",
          id: selection.reportId,
          embedUrl,
          accessToken: token,
          tokenType: pbi.models.TokenType.Aad,
          pageName,
          visualName,
          settings: {
            panes: {
              filters: { visible: false },
              pageNavigation: { visible: false }
            }
          }
        };

        const visual = powerbiService.embed(containerRef.current, config) as pbi.Visual;

        visual.off("loaded");
        visual.on("loaded", () => {
          if (!cancelled) setIsLoading(false);
        });

        visual.off("error");
        visual.on("error", (event: pbi.service.ICustomEvent<unknown>) => {
          const detail = event.detail as { message?: string; error?: { message?: string } } | undefined;
          const message = detail?.message ?? detail?.error?.message ?? "Power BI error";
          if (!cancelled) {
            setError(message);
            setIsLoading(false);
          }
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setIsLoading(false);
        }
      }
    };

    run().catch((e) => {
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
    fontFamily: "Segoe UI, Arial, sans-serif"
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    font: "inherit"
  };

  return (
    <Collapsible
      instanceId={props.context.instanceId}
      title="PowerBI - Urgency Portal"
    >
      <div
        style={{
          ...wrapperStyle,
          marginTop: 8
        }}
      >
        <div
          style={{
            paddingLeft: 5,
            paddingRight: 5
          }}
        >
          <select
            style={selectStyle}
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.currentTarget.value)}
            disabled={items.length === 0}
          >
            <option value="">-- Select --</option>
            {items.map((item) => {
              const key = getItemKey(item);
              return (
                <option key={key} value={key}>
                  {item.title}
                </option>
              );
            })}
          </select>

          {selection && (
            <a
              href={openInNewTabUrl || selection.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                marginTop: 10,
                fontSize: 16,
                fontWeight: 600,
                color: "#0f6cbd",
                textDecoration: "underline"
              }}
            >
              {selection.title}
            </a>
          )}
        </div>

        {errors.length > 0 && (
          <p style={{ color: "darkred", whiteSpace: "pre-wrap", marginTop: 10 }}>
            {errors.join("\n")}
          </p>
        )}

        {isLoading && <p>Loading…</p>}

        {error && (
          <p style={{ color: "darkred", whiteSpace: "pre-wrap" }}>
            {error}
          </p>
        )}

        {selection && (
          <div
            ref={containerRef}
            style={{
              height: "650px",
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: 6,
              marginTop: 12
            }}
          />
        )}
      </div>
    </Collapsible>
  );
}
