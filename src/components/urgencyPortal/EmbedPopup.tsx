import * as React from "react";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import * as pbi from "powerbi-client";
import * as ReactDom from "react-dom";

import { type IParsedItemWithUrl } from "@webparts/urgencyPortal/components/IUrgencyPortalWebPartProps";

import {
	type PBIEventResponseType,
	getPowerBiToken,
	powerbiService,
	getItemKey,
	getReportInfo,
	normalizePageName,
	normalizeBookmarkName,
} from "@utils/powerbi";

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

function CloseIcon(props: { size?: number }): JSX.Element {
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
				d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4Z"
			/>
		</svg>
	);
}

// ── Popup Modal for embedding Power BI on card click ──

export function EmbedPopup(props: {
	selection: IParsedItemWithUrl;
	allItems: IParsedItemWithUrl[];
	context: WebPartContext;
	onSelect: (item: IParsedItemWithUrl) => void;
	onClose: () => void;
}): JSX.Element {
	const { selection, allItems, context, onSelect, onClose } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const bookmarkAppliedRef = React.useRef(false);
	const [isLoading, setIsLoading] = React.useState(true);
	const [error, setError] = React.useState<string | undefined>(undefined);
	const [openInNewTabUrl, setOpenInNewTabUrl] = React.useState<
		string | undefined
	>(undefined);

	// Close on Escape
	React.useEffect(() => {
		const onKeyDown = (e: KeyboardEvent): void => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	// Embed the report/visual
	React.useEffect(() => {
		let cancelled = false;
		bookmarkAppliedRef.current = false;

		const run = async (): Promise<void> => {
			if (!containerRef.current) return;

			setIsLoading(true);
			setError(undefined);
			setOpenInNewTabUrl(undefined);

			try {
				const token: string = await getPowerBiToken(context);
				const reportInfo = await getReportInfo(
					token,
					selection.reportId,
				);

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

					setOpenInNewTabUrl(
						buildEmbedNewTabUrl(reportInfo.embedUrl),
					);

					const onLoaded = (): void => {
						if (cancelled) return;

						const desiredDisplay: string = (
							selection.bookmarkName || ""
						).trim();
						const desiredNorm: string =
							normalizeBookmarkName(desiredDisplay);

						report.bookmarksManager
							.getBookmarks()
							.then((bookmarks: pbi.models.IReportBookmark[]) => {
								const match:
									| pbi.models.IReportBookmark
									| undefined = desiredNorm
									? bookmarks.find(
											(b: pbi.models.IReportBookmark) => {
												const n: string =
													normalizeBookmarkName(
														b.name,
													);
												const d: string =
													normalizeBookmarkName(
														b.displayName,
													);
												return (
													n === desiredNorm ||
													d === desiredNorm
												);
											},
										)
									: undefined;

								const bookmarkGuid: string | undefined = match
									? match.name
									: undefined;

								const fullscreenUrl: string =
									buildServiceFullscreenUrl(
										reportInfo.webUrl,
										selection.pageName,
										bookmarkGuid,
									);
								setOpenInNewTabUrl(fullscreenUrl);

								if (!desiredNorm) return undefined;
								if (bookmarkAppliedRef.current)
									return undefined;

								bookmarkAppliedRef.current = true;

								if (match)
									return report.bookmarksManager.apply(
										match.name,
									);
								return undefined;
							})
							.catch((): void => undefined);
					};

					const onRendered = (): void => {
						if (!cancelled) setIsLoading(false);
					};

					const onError = (
						event: pbi.service.ICustomEvent<unknown>,
					): void => {
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

				// Visual embed
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

				const onError = (
					event: pbi.service.ICustomEvent<unknown>,
				): void => {
					const detail = event.detail as PBIEventResponseType;
					const message: string =
						detail?.message ??
						detail?.error?.message ??
						"Power BI error";
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
			if (containerRef.current)
				powerbiService.reset(containerRef.current);
		};
	}, [selection, context]);

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

	return ReactDom.createPortal(
		<div
			role="dialog"
			aria-modal="true"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 2147483646,
				background: "rgba(0,0,0,0.55)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 24,
			}}
			onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				style={{
					background: "white",
					borderRadius: 10,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					width: "90vw",
					maxWidth: 1200,
					height: "85vh",
					maxHeight: 800,
					boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
				}}
			>
				{/* Header bar */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 16px",
						borderBottom: "1px solid #ddd",
						gap: 12,
						flexShrink: 0,
					}}
				>
					<select
						value={getItemKey(selection)}
						onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
							const found = allItems.find(
								(i: IParsedItemWithUrl) =>
									getItemKey(i) === e.target.value,
							);
							if (found) onSelect(found);
						}}
						style={{
							fontWeight: 600,
							fontSize: 15,
							border: "1px solid #ccc",
							borderRadius: 6,
							padding: "4px 8px",
							maxWidth: "60%",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							cursor: "pointer",
						}}
					>
						{allItems.map((item: IParsedItemWithUrl) => (
							<option
								key={getItemKey(item)}
								value={getItemKey(item)}
							>
								{item.title}
							</option>
						))}
					</select>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
						}}
					>
						{isLoading && (
							<span style={{ color: "#888", fontSize: 13 }}>
								Loading...
							</span>
						)}

						{openInNewTabUrl && (
							<a
								href={openInNewTabUrl}
								target="_blank"
								rel="noopener noreferrer"
								style={{
									color: "#0f6cbd",
									textDecoration: "underline",
									fontSize: 13,
								}}
							>
								Open in new tab
							</a>
						)}

						<button
							type="button"
							aria-label="Close"
							onClick={onClose}
							style={iconButtonStyle}
						>
							<CloseIcon />
						</button>
					</div>
				</div>

				{/* Error */}
				{error && (
					<p
						style={{
							color: "darkred",
							whiteSpace: "pre-wrap",
							padding: "8px 16px",
							margin: 0,
							flexShrink: 0,
						}}
					>
						{error}
					</p>
				)}

				{/* Embed container */}
				<div
					ref={containerRef}
					style={{
						flex: "1 1 auto",
						minHeight: 0,
						width: "100%",
					}}
				/>
			</div>
		</div>,
		document.body,
	);
}
