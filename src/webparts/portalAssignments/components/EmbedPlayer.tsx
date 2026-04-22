import * as React from "react";

type Props = {
  url: string;
  title?: string;
  onCompleted?: () => void;
};

const YT_STATE_ENDED = 0;
const YT_STATE_PLAYING = 1;
const YT_STATE_PAUSED = 2;

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

function toYouTubeVideoId(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      return id || undefined;
    }
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      const id = u.searchParams.get("v");
      if (id) return id;
      const parts = u.pathname.split("/").filter(Boolean);
      const maybe = parts[0] === "embed" && parts[1] ? parts[1] : undefined;
      return maybe || undefined;
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
  const [, setCompleted] = React.useState(false);
  const completedRef = React.useRef(false);

  React.useEffect(() => {
    setCompleted(false);
    completedRef.current = false;
  }, [url]);

  // HTML5 video: reliable onEnded
  if (isDirectVideo(url)) {
    return (
      <div className="w-full">
        <video
          className="w-full rounded-lg border border-slate-200 bg-black"
          controls
          onEnded={() => {
            if (completedRef.current) return;
            setCompleted(true);
            completedRef.current = true;
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
    const videoId = toYouTubeVideoId(url);
    const hostId = React.useMemo(
      () => `yt-${Math.random().toString(36).slice(2)}`,
      [],
    );

    React.useEffect(() => {
      let player:
        | {
            destroy?: () => void;
            getDuration?: () => number;
            getCurrentTime?: () => number;
          }
        | undefined;
      let cancelled = false;
      let tick: number | undefined;
      let lastT = 0;
      let playedSeconds = 0;

      const stopTick = (): void => {
        if (tick) {
          window.clearInterval(tick);
          tick = undefined;
        }
      };

      const complete = (): void => {
        if (completedRef.current) return;
        completedRef.current = true;
        setCompleted(true);
        onCompleted?.();
      };

      (async (): Promise<void> => {
        if (!containerRef.current) return;
        if (!videoId) return;
        await ensureYouTubeApi();
        if (cancelled) return;

        const w = window as unknown as {
          YT?: {
            Player?: new (
              el: HTMLElement | string,
              opts: {
                height?: string;
                width?: string;
                host?: string;
                videoId?: string;
                playerVars?: Record<string, unknown>;
                events?: {
                  onStateChange?: (ev: { data?: number }) => void;
                };
              },
            ) => { destroy?: () => void };
          };
        };
        if (!w.YT?.Player) return;

        player = new w.YT.Player(hostId, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          playerVars: {
            origin: window.location.origin,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
          },
          events: {
            onStateChange: (ev: { data?: number }) => {
              if (cancelled) return;
              if (ev?.data === YT_STATE_ENDED) {
                stopTick();
                complete();
                return;
              }

              if (ev?.data === YT_STATE_PLAYING) {
                stopTick();
                lastT = player?.getCurrentTime?.() ?? 0;
                tick = window.setInterval(() => {
                  const cur = player?.getCurrentTime?.() ?? 0;
                  const dt = Math.max(0, cur - lastT);
                  // Ignore giant jumps caused by seeking.
                  if (dt <= 2.5) playedSeconds += dt;
                  lastT = cur;

                  const dur = player?.getDuration?.() ?? 0;
                  if (dur > 0) {
                    // "Good enough" threshold to avoid never-firing ended events.
                    const threshold = Math.max(1, dur * 0.95);
                    if (playedSeconds >= threshold) {
                      stopTick();
                      complete();
                    }
                  }
                }, 500);
                return;
              }

              if (ev?.data === YT_STATE_PAUSED) {
                stopTick();
              }
            },
          },
        });
      })().catch(() => undefined);

      return () => {
        cancelled = true;
        stopTick();
        try {
          player?.destroy?.();
        } catch {
          // ignore
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostId, videoId]);

    return (
      <div className="w-full" ref={containerRef}>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black">
          <div className="w-full h-full" id={hostId} />
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

