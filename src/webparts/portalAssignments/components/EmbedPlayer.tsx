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
  // NOTE: Some tenants block the iframe_api script and also appear to suppress/alter postMessage
  // behavior for the nocookie domain. Prefer youtube.com for postMessage control.
  const base = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
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
  const [ytPlaying, setYtPlaying] = React.useState(false);
  const [ytSeconds, setYtSeconds] = React.useState(0);
  const lastInfoTsRef = React.useRef<number>(0);

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
    setYtPlaying(false);
    setYtSeconds(0);
    lastInfoTsRef.current = 0;
  }, [stopInterval, url]);

  // YouTube (no iframe_api): use postMessage listening + infoDelivery polling.
  React.useEffect(() => {
    if (!isYt || !videoId) return;
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (!iframe) {
      log("yt postMessage: iframe not found", { iframeId });
      return;
    }

    const allowedOrigins = new Set([
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
    ]);

    const send = (obj: Record<string, unknown>): void => {
      try {
        const targetOrigin = new URL(iframe.src).origin;
        iframe.contentWindow?.postMessage(JSON.stringify(obj), targetOrigin);
      } catch (e) {
        log("yt postMessage send failed", e);
      }
    };

    // Ask the player to start sending events.
    log("yt postMessage: listening");
    send({ event: "listening" });

    let cancelled = false;
    const onMsg = (ev: MessageEvent): void => {
      if (cancelled) return;
      if (!allowedOrigins.has(ev.origin)) return;
      const raw = ev.data;
      let msg: unknown = undefined;
      if (typeof raw === "string") {
        // Many YT messages are JSON strings.
        try {
          msg = JSON.parse(raw) as unknown;
        } catch {
          // If it's not JSON, still log for debugging.
          log("yt msg (string)", raw.slice(0, 200));
          return;
        }
      } else if (typeof raw === "object" && raw) {
        // Some environments deliver objects directly.
        msg = raw as unknown;
      } else {
        return;
      }

      const msgObj: Record<string, unknown> | null =
        typeof msg === "object" && msg ? (msg as Record<string, unknown>) : null;

      // Debug: show any message we get from YT origins.
      log("yt msg", msgObj ?? msg);

      if (msgObj?.event === "onStateChange") {
        const s = Number(msgObj?.info);
        // 1 playing, 2 paused, 0 ended (per iframe API)
        if (s === 1) setYtPlaying(true);
        if (s === 2) setYtPlaying(false);
        if (s === 0) {
          setYtPlaying(false);
          complete();
        }
        log("yt state", { state: s });
        return;
      }

      // infoDelivery contains currentTime/duration among other things.
      if (msgObj?.event === "infoDelivery" && msgObj?.info) {
        const info =
          typeof msgObj.info === "object" && msgObj.info
            ? (msgObj.info as Record<string, unknown>)
            : null;
        if (!info) return;
        const cur =
          typeof info.currentTime === "number"
            ? (info.currentTime as number)
            : undefined;
        const dur =
          typeof info.duration === "number" ? (info.duration as number) : undefined;
        if (cur !== undefined && cur >= 0) {
          // Infer play/pause: if currentTime advances, we're playing.
          const prev = lastTRef.current || 0;
          const dt = Math.max(0, cur - prev);
          if (dt > 0.01) {
            setYtPlaying(true);
            // Ignore giant jumps caused by seeking.
            if (dt <= 2.5) playedRef.current += dt;
          }
          lastTRef.current = cur;
          lastInfoTsRef.current = Date.now();
          setYtSeconds(cur);

          const threshold = thresholdSeconds({
            requiredSeconds,
            durationSeconds: dur,
          });
          log("yt tick", {
            playedSeconds: Math.round(playedRef.current),
            currentTime: Math.round(cur),
            duration: dur ? Math.round(dur) : undefined,
            thresholdSeconds: threshold,
          });
          if (threshold !== undefined && playedRef.current >= threshold) {
            complete();
          }
        }
      }
    };

    window.addEventListener("message", onMsg);

    // Watchdog: if we stop receiving infoDelivery, assume paused.
    stopInterval();
    intervalRef.current = window.setInterval(() => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      const last = lastInfoTsRef.current;
      if (!last) return;
      const staleMs = Date.now() - last;
      if (staleMs > 1500 && ytPlaying) {
        setYtPlaying(false);
        log("yt inferred paused (stale infoDelivery)", { staleMs });
      }
    }, 700);

    return () => {
      cancelled = true;
      stopInterval();
      window.removeEventListener("message", onMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, iframeId, isYt, log, requiredSeconds, videoId, ytPlaying]);

  // Note: YouTube accumulation is handled inside infoDelivery handler above.

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
    const remaining = threshold !== undefined ? Math.max(0, threshold - playedRef.current) : undefined;
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
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500">{title ?? "YouTube"}</div>
        {threshold !== undefined ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="text-sm">
                State:{" "}
                <span className="font-semibold">
                  {ytPlaying ? "Playing" : "Paused"}
                </span>
                {" "}• Watched:{" "}
                <span className="font-semibold">
                  {Math.round(playedRef.current)}s
                </span>
                {" "}• At: <span className="font-semibold">{Math.round(ytSeconds)}s</span>
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

