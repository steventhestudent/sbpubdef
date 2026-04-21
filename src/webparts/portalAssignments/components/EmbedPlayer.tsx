import * as React from "react";

type Props = {
  url: string;
  title?: string;
  onCompleted?: () => void;
};

function isYouTube(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("youtube.com") ||
      u.hostname === "youtu.be" ||
      u.hostname.includes("youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

function toYouTubeEmbedUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1` : undefined;
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1`;
      const parts = u.pathname.split("/").filter(Boolean);
      const maybe = parts[0] === "embed" && parts[1] ? parts[1] : undefined;
      return maybe ? `https://www.youtube-nocookie.com/embed/${maybe}?enablejsapi=1` : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

let youTubeApiLoadPromise: Promise<void> | undefined;
function ensureYouTubeApi(): Promise<void> {
  const w = window as unknown as {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (youTubeApiLoadPromise) return youTubeApiLoadPromise;

  youTubeApiLoadPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (existing) {
      const check = (): void => {
        const ww = window as unknown as { YT?: { Player?: unknown } };
        if (ww.YT && ww.YT.Player) resolve();
        else setTimeout(check, 50);
      };
      check();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    const prior = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = (): void => {
      if (typeof prior === "function") prior();
      resolve();
    };
  });

  return youTubeApiLoadPromise;
}

export function EmbedPlayer({ url, title, onCompleted }: Props): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [completed, setCompleted] = React.useState(false);

  React.useEffect(() => {
    setCompleted(false);
  }, [url]);

  // HTML5 video: reliable onEnded
  if (isDirectVideo(url)) {
    return (
      <div className="w-full">
        <video
          className="w-full rounded-lg border border-slate-200 bg-black"
          controls
          onEnded={() => {
            if (completed) return;
            setCompleted(true);
            onCompleted?.();
          }}
        >
          <source src={url} />
        </video>
        <div className="mt-1 text-xs text-slate-500">{title ?? "Video"}</div>
      </div>
    );
  }

  // YouTube: lightweight ended detection via IFrame API
  if (isYouTube(url)) {
    const embedUrl = toYouTubeEmbedUrl(url) ?? url;

    React.useEffect(() => {
      let player: { destroy?: () => void } | undefined;
      let cancelled = false;

      (async (): Promise<void> => {
        if (!containerRef.current) return;
        await ensureYouTubeApi();
        if (cancelled) return;

        const w = window as unknown as {
          YT?: {
            Player?: new (
              el: HTMLElement,
              opts: {
                events?: {
                  onStateChange?: (ev: { data?: number }) => void;
                };
              },
            ) => { destroy?: () => void };
          };
        };
        const el = containerRef.current.querySelector<HTMLDivElement>("[data-youtube-host]");
        if (!el) return;
        if (!w.YT?.Player) return;

        player = new w.YT.Player(el, {
          events: {
            onStateChange: (ev: { data?: number }) => {
              // 0 == ended
              if (ev?.data === 0) {
                if (completed) return;
                setCompleted(true);
                onCompleted?.();
              }
            },
          },
        });
      })().catch(() => undefined);

      return () => {
        cancelled = true;
        try {
          player?.destroy?.();
        } catch {
          // ignore
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [embedUrl]);

    return (
      <div className="w-full" ref={containerRef}>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black">
          <div className="w-full h-full" data-youtube-host>
            <iframe
              className="w-full h-full"
              src={embedUrl}
              title={title ?? "YouTube"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500">{title ?? "YouTube"}</div>
      </div>
    );
  }

  // Fallback: no reliable completion signal. Keep it viewable, but don't auto-complete.
  return (
    <div className="w-full">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <iframe
          className="w-full h-full"
          src={url}
          title={title ?? "Embed"}
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="mt-1 text-xs text-slate-500">{title ?? "Embed"}</div>
    </div>
  );
}

