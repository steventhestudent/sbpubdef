import * as React from "react";
import { CarouselMode } from "@webparts/urgencyPortal/components/IUrgencyPortalWebPartProps";

export interface ICardItem {
	key: string;
	title: string;
	thumbnailUrl?: string;
}

export interface ICardCarouselProps {
	items: ICardItem[];
	visibleCount?: number;
	autoScrollMs?: number;
	carouselMode?: CarouselMode;
	onCardClick: (item: ICardItem) => void;
}

function ChevronLeftIcon(): JSX.Element {
	return (
		<svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M15 18l-6-6 6-6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function ChevronRightIcon(): JSX.Element {
	return (
		<svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M9 6l6 6-6 6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function ChevronUpIcon(): JSX.Element {
	return (
		<svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M18 15l-6-6-6 6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function ChevronDownIcon(): JSX.Element {
	return (
		<svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M6 9l6 6 6-6"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

const GAP = 12;
const SLIDE_DURATION_MS = 400;
const BUFFER = 2;
const VERTICAL_BREAKPOINT = 320;

function mod(n: number, m: number): number {
	return ((n % m) + m) % m;
}

export function CardCarousel(props: ICardCarouselProps): JSX.Element {
	const { items, onCardClick } = props;
	const visibleCount = props.visibleCount ?? 3;
	const autoScrollMs = props.autoScrollMs ?? 8000;
	const carouselMode = props.carouselMode ?? "auto";

	const [offset, setOffset] = React.useState(0);
	const [slideShift, setSlideShift] = React.useState(0);
	const [isAnimating, setIsAnimating] = React.useState(false);
	const [isPaused, setIsPaused] = React.useState(false);
	const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

	const outerRef = React.useRef<HTMLDivElement>(null);
	const [autoDetectedVertical, setAutoDetectedVertical] =
		React.useState(false);

	React.useEffect(() => {
		if (carouselMode !== "auto") return;
		const el = outerRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setAutoDetectedVertical(
					entry.contentRect.width < VERTICAL_BREAKPOINT,
				);
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [carouselMode]);

	const isVertical =
		carouselMode === "vertical" ||
		(carouselMode === "auto" && autoDetectedVertical);

	React.useEffect(() => {
		if (items.length === 0) {
			setOffset(0);
			return;
		}
		setOffset((prev) => mod(prev, items.length));
	}, [items.length]);

	React.useEffect(() => {
		if (isPaused || items.length <= visibleCount) return;

		timerRef.current = setInterval(() => {
			if (!isAnimating) {
				slideTo("right");
			}
		}, autoScrollMs);

		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isPaused, autoScrollMs, items.length, visibleCount, isAnimating]);

	const effectiveVisible = visibleCount;

	const windowSize = Math.min(items.length, effectiveVisible + 2 * BUFFER);

	const extraCards = windowSize - Math.min(effectiveVisible, items.length);
	const effectiveBuffer =
		items.length <= effectiveVisible
			? 0
			: Math.min(BUFFER, Math.floor(extraCards / 2));

	const windowedItems = React.useMemo(() => {
		if (items.length === 0) return [];
		const arr: ICardItem[] = [];
		const start = offset - effectiveBuffer;
		for (let i = 0; i < windowSize; i++) {
			arr.push(items[mod(start + i, items.length)]);
		}
		return arr;
	}, [items, offset, windowSize, effectiveBuffer]);

	React.useEffect(() => {
		if (items.length === 0) return;
		const preloadOffsets = [-(BUFFER + 1), BUFFER + visibleCount];
		preloadOffsets.forEach((off) => {
			const idx = mod(offset + off, items.length);
			const url = items[idx]?.thumbnailUrl;
			if (url) {
				const img = new Image();
				img.src = url;
			}
		});
	}, [offset, items, visibleCount]);

	const visibleStartInWindow = effectiveBuffer;

	const cardWidthCalc = `calc((100% - ${GAP * (visibleCount - 1)}px) / ${visibleCount})`;

	const baseTranslateCalc =
		visibleStartInWindow > 0
			? `calc(-${visibleStartInWindow} * (${cardWidthCalc} + ${GAP}px))`
			: "0px";

	const shiftCalc =
		slideShift !== 0
			? ` - ${slideShift} * (${cardWidthCalc} + ${GAP}px)`
			: "";

	const transformValue = `translateX(calc(${baseTranslateCalc}${shiftCalc}))`;

	const [animateShift, setAnimateShift] = React.useState(true);

	function slideTo(direction: "left" | "right"): void {
		if (isAnimating || items.length <= effectiveVisible) return;

		const delta = direction === "right" ? 1 : -1;
		setIsAnimating(true);

		if (direction === "right") {
			setAnimateShift(true);
			setSlideShift(delta);

			setTimeout(() => {
				setAnimateShift(false);
				setOffset((prev) => mod(prev + delta, items.length));
				setSlideShift(0);
				setIsAnimating(false);
			}, SLIDE_DURATION_MS);
		} else {
			setAnimateShift(false);
			setOffset((prev) => mod(prev + delta, items.length));
			setSlideShift(-delta);

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setAnimateShift(true);
					setSlideShift(0);

					setTimeout(() => {
						setIsAnimating(false);
					}, SLIDE_DURATION_MS);
				});
			});
		}
	}

	const goLeft = (): void => slideTo("left");
	const goRight = (): void => slideTo("right");

	if (items.length === 0) return <div ref={outerRef} />;

	const navBtnStyle: React.CSSProperties = {
		all: "unset",
		boxSizing: "border-box",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: 32,
		height: 32,
		borderRadius: "50%",
		border: "1px solid #ccc",
		backgroundColor: "white",
		cursor: "pointer",
		flexShrink: 0,
	};

	const disabledNavStyle: React.CSSProperties = {
		...navBtnStyle,
		opacity: 0.35,
		cursor: "default",
	};

	const navDisabled = isAnimating || items.length <= effectiveVisible;

	function renderCard(
		item: ICardItem,
		key: string,
		flexStyle: React.CSSProperties,
	): JSX.Element {
		return (
			<button
				key={key}
				type="button"
				onClick={() => onCardClick(item)}
				style={{
					all: "unset",
					boxSizing: "border-box",
					cursor: "pointer",
					borderRadius: 8,
					overflow: "hidden",
					border: "1px solid #ddd",
					display: "flex",
					flexDirection: "column",
					backgroundColor: "#f5f5f5",
					transition: "box-shadow 0.15s ease",
					minWidth: 0,
					...flexStyle,
				}}
				onMouseEnter={(e) => {
					(e.currentTarget as HTMLElement).style.boxShadow =
						"0 2px 8px rgba(0,0,0,0.15)";
				}}
				onMouseLeave={(e) => {
					(e.currentTarget as HTMLElement).style.boxShadow = "none";
				}}
			>
				{/* Thumbnail area */}
				<div
					style={{
						width: "100%",
						aspectRatio: "16/9",
						backgroundColor: "#e8e8e8",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						overflow: "hidden",
					}}
				>
					{item.thumbnailUrl ? (
						<img
							src={item.thumbnailUrl}
							alt={item.title}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
						/>
					) : (
						<svg
							width={40}
							height={40}
							viewBox="0 0 24 24"
							style={{ color: "#bbb" }}
							aria-hidden="true"
						>
							<path
								fill="currentColor"
								d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v2h-4V7zm0 4h4v2h-4v-2zM7 13h4v4H7v-4zm6 2h4v2h-4v-2z"
							/>
						</svg>
					)}
				</div>

				{/* Title bar */}
				<div
					style={{
						backgroundColor: "white",
						padding: "8px 10px",
						borderTop: "1px solid #eee",
						fontWeight: 600,
						fontSize: 13,
						color: "#333",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						textAlign: "left",
					}}
				>
					{item.title}
				</div>
			</button>
		);
	}

	if (isVertical) {
		const vCardHeightCalc = `calc(100cqi * 9 / 16 + 35px)`;
		const vCardStepCalc = `(${vCardHeightCalc} + ${GAP}px)`;

		const vViewportHeightCalc = `calc(${visibleCount} * ${vCardHeightCalc} + ${GAP * (visibleCount - 1)}px)`;

		const vBaseTranslateCalc =
			visibleStartInWindow > 0
				? `calc(-${visibleStartInWindow} * ${vCardStepCalc})`
				: "0px";

		const vShiftCalc =
			slideShift !== 0 ? ` - ${slideShift} * ${vCardStepCalc}` : "";

		const vTransformValue = `translateY(calc(${vBaseTranslateCalc}${vShiftCalc}))`;

		return (
			<div
				ref={outerRef}
				style={{
					width: "100%",
					maxWidth: "100%",
					overflow: "hidden",
					paddingBottom: 12,
					containerType: "inline-size",
				}}
			>
				<div
					onMouseEnter={() => setIsPaused(true)}
					onMouseLeave={() => setIsPaused(false)}
				>
					{/* Navigation row */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: 6,
							marginBottom: 8,
						}}
					>
						<button
							type="button"
							aria-label="Previous"
							onClick={goLeft}
							disabled={navDisabled}
							style={navDisabled ? disabledNavStyle : navBtnStyle}
						>
							<ChevronUpIcon />
						</button>
						<button
							type="button"
							aria-label="Next"
							onClick={goRight}
							disabled={navDisabled}
							style={navDisabled ? disabledNavStyle : navBtnStyle}
						>
							<ChevronDownIcon />
						</button>
					</div>

					{/* Vertical sliding viewport — clip to exactly visibleCount cards */}
					<div
						style={{
							overflow: "hidden",
							height: vViewportHeightCalc,
						}}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: GAP,
								transform: vTransformValue,
								transition: animateShift
									? `transform ${SLIDE_DURATION_MS}ms ease-in-out`
									: "none",
								willChange:
									slideShift !== 0 ? "transform" : undefined,
							}}
						>
							{windowedItems.map((item, i) =>
								renderCard(item, `${item.key}__w${i}`, {
									flex: `0 0 ${vCardHeightCalc}`,
									width: "100%",
								}),
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={outerRef}
			style={{
				width: "100%",
				maxWidth: "100%",
				overflowX: "hidden",
				paddingBottom: 12,
			}}
		>
			<div
				onMouseEnter={() => setIsPaused(true)}
				onMouseLeave={() => setIsPaused(false)}
			>
				{/* Navigation row */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "flex-end",
						gap: 6,
						marginBottom: 8,
					}}
				>
					<button
						type="button"
						aria-label="Previous"
						onClick={goLeft}
						disabled={navDisabled}
						style={navDisabled ? disabledNavStyle : navBtnStyle}
					>
						<ChevronLeftIcon />
					</button>
					<button
						type="button"
						aria-label="Next"
						onClick={goRight}
						disabled={navDisabled}
						style={navDisabled ? disabledNavStyle : navBtnStyle}
					>
						<ChevronRightIcon />
					</button>
				</div>

				{/* Sliding viewport */}
				<div style={{ overflow: "hidden" }}>
					<div
						style={{
							display: "flex",
							gap: GAP,
							transform: transformValue,
							transition: animateShift
								? `transform ${SLIDE_DURATION_MS}ms ease-in-out`
								: "none",
							willChange:
								slideShift !== 0 ? "transform" : undefined,
						}}
					>
						{windowedItems.map((item, i) =>
							renderCard(item, `${item.key}__w${i}`, {
								flex: `0 0 ${cardWidthCalc}`,
							}),
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
