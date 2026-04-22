import * as React from "react";

type Props = {
  url: string;
  title?: string;
  /** Watch-time required (seconds). If omitted, uses a best-effort % of duration when available. */
  requiredSeconds?: number;
  /** If set, prints timer/debug info to console. */
  debugKey?: string;
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

function youTubeEmbedSrcForVideoId(videoId: string): string {
  const base = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
  const params = new URLSearchParams({
    enablejsapi: "1",
    origin: window.location.origin,
    rel: "0",
    modestbranding: "1",
  });
  return `${base}?${params.toString()}`;
}

function thresholdSeconds(opts: {
  requiredSeconds?: number;
  durationSeconds?: number;
}): number | undefined {
  const req =
    typeof opts.requiredSeconds === "number" && opts.requiredSeconds > 0
      ? opts.requiredSeconds
      : undefined;
  const dur =
    typeof opts.durationSeconds === "number" && opts.durationSeconds > 0
      ? opts.durationSeconds
      : undefined;

  if (req !== undefined && dur !== undefined) return Math.min(req, dur);
  if (req !== undefined) return req;
  if (dur !== undefined) return Math.max(1, dur * 0.95);
  return undefined;
}

export function EmbedPlayer({
  url,
  title,
  requiredSeconds,
  debugKey,
  onCompleted,
}: Props): JSX.Element {
  const completedRef = React.useRef(false);
  const lastTRef = React.useRef(0);
  const playedRef = React.useRef(0);
  const intervalRef = React.useRef<number | undefined>(undefined);
  const [assumedPlaying, setAssumedPlaying] = React.useState(false);
  const [assumedSeconds, setAssumedSeconds] = React.useState(0);

  const videoId = React.useMemo(() => (isYouTube(url) ? toYouTubeVideoId(url) : undefined), [url]);
  const isYt = React.useMemo(() => isYouTube(url), [url]);
  const isVid = React.useMemo(() => isDirectVideo(url), [url]);

  const iframeId = React.useMemo(() => `yt-iframe-${Math.random().toString(36).slice(2)}`, []);

  const log = React.useCallback(
    (msg: string, data?: unknown) => {
      if (!debugKey) return;
      // `console.debug` is often filtered in browsers; use `console.log` for visibility.
      // eslint-disable-next-line no-console
      console.log(`[EmbedPlayer][${debugKey}] ${msg}`, data ?? "");
    },
    [debugKey],
  );

  const complete = React.useCallback((): void => {
    if (completedRef.current) return;
    completedRef.current = true;
    log("complete", { playedSeconds: playedRef.current, requiredSeconds });
    onCompleted?.();
  }, [log, onCompleted, requiredSeconds]);

  const stopInterval = React.useCallback((): void => {
    const id = intervalRef.current;
    if (id) {
      window.clearInterval(id);
      intervalRef.current = undefined;
    }
  }, []);

  React.useEffect(() => {
    // reset per-url
    completedRef.current = false;
    lastTRef.current = 0;
    playedRef.current = 0;
    stopInterval();
    setAssumedPlaying(false);
    setAssumedSeconds(0);
  }, [stopInterval, url]);

  // Heuristic timer for YouTube (no iframe API). Toggle assumed play/pause on click.
  React.useEffect(() => {
    if (!isYt) return;
    if (!assumedPlaying) return;
    if (completedRef.current) return;

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setAssumedSeconds((prev) => prev + 1);
      const threshold = thresholdSeconds({ requiredSeconds });
      log("yt heuristic tick", {
        assumedSeconds: assumedSeconds + 1,
        thresholdSeconds: threshold,
        visible: document.visibilityState,
      });
      if (threshold !== undefined && (assumedSeconds + 1) >= threshold) {
        window.clearInterval(id);
        setAssumedPlaying(false);
        complete();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [assumedPlaying, assumedSeconds, complete, isYt, log, requiredSeconds]);

  // Direct video: accumulate playtime via onTimeUpdate.
  const onDirectTimeUpdate = React.useCallback(
    (cur: number, dur: number) => {
      const dt = Math.max(0, cur - lastTRef.current);
      if (dt <= 2.5) playedRef.current += dt;
      lastTRef.current = cur;

      const threshold = thresholdSeconds({ requiredSeconds, durationSeconds: dur });
      log("direct tick", {
        playedSeconds: Math.round(playedRef.current),
        thresholdSeconds: threshold ? Math.round(threshold) : undefined,
        durationSeconds: dur ? Math.round(dur) : undefined,
      });
      if (threshold !== undefined && playedRef.current >= threshold) complete();
    },
    [complete, log, requiredSeconds],
  );

  if (isVid) {
    return (
      <div className="w-full">
        <video
          className="w-full rounded-lg border border-slate-200 bg-black"
          controls
          onPlay={(e) => {
            lastTRef.current = e.currentTarget.currentTime ?? 0;
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            onDirectTimeUpdate(v.currentTime ?? 0, v.duration || 0);
          }}
          onEnded={(e) => {
            const v = e.currentTarget;
            onDirectTimeUpdate(v.duration || v.currentTime || 0, v.duration || 0);
          }}
        >
          <source src={url} />
        </video>
        <div className="mt-1 text-xs text-slate-500">{title ?? "Video"}</div>
      </div>
    );
  }

  if (isYt) {
    const threshold = thresholdSeconds({ requiredSeconds });
    const remaining = threshold !== undefined ? Math.max(0, threshold - assumedSeconds) : undefined;
    return (
      <div className="w-full">
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black">
          <div className="relative w-full h-full">
            {videoId ? (
              <iframe
                id={iframeId}
                className="w-full h-full"
                src={youTubeEmbedSrcForVideoId(videoId)}
                title={title ?? "YouTube"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full" />
            )}

            {/* Cross-origin iframes absorb pointer events; provide a tiny toggle control instead. */}
            {threshold !== undefined ? (
              <button
                type="button"
                className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white hover:bg-black/80"
                onClick={() => {
                  setAssumedPlaying((p) => {
                    const next = !p;
                    log("yt heuristic toggle", { assumedPlaying: next });
                    return next;
                  });
                }}
              >
                {assumedPlaying ? "Assume: Playing" : "Assume: Paused"}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500">{title ?? "YouTube"}</div>
        {threshold !== undefined ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="text-sm">
                State:{" "}
                <span className="font-semibold">
                  {assumedPlaying ? "Playing" : "Paused"}
                </span>
                {" "}• Watched:{" "}
                <span className="font-semibold">{assumedSeconds}s</span>
                {remaining !== undefined ? (
                  <>
                    {" "}• Remaining: <span className="font-semibold">{remaining}s</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Fallback: non-video embeds don't participate in watch-time gating.
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

