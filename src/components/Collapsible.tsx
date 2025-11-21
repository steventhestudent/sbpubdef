// src/components/Collapsible.tsx
// Reusable per‑page collapsible wrapper for React SPFx web parts

import * as React from "react";

/**
 * Builds a stable localStorage key that is unique per PAGE and per WEB PART INSTANCE.
 * By default we scope to window.location.pathname (page X vs page Y) + instanceId.
 */
function storageKey(
	instanceId: string,
	scope?: { pageKey?: string; prefix?: string },
): string {
	const pageKey =
		scope?.pageKey ??
		(typeof window !== "undefined"
			? window.location.pathname
			: "__no_window__");
	const prefix = scope?.prefix ?? "spfx:collapse";
	return `${prefix}:${pageKey}:${instanceId}`;
}

export type CollapsibleProps = {
	/** Unique identifier for the web part instance. In SPFx you can pass `this.instanceId`. */
	instanceId: string;
	/** Optional override for the page scoping key (defaults to location.pathname). */
	pageKey?: string;
	/** Initial collapsed state before we read localStorage. Default: false (expanded). */
	defaultCollapsed?: boolean;
	/** Optional title/header content. If omitted, only the chevron renders. */
	title?: React.ReactNode;
	/** Children are hidden/shown. */
	children?: React.ReactNode;
	/**
	 * If true, the header bar is clickable to toggle. Default: true
	 */
	headerClickable?: boolean;
	/** ClassName overrides */
	className?: string;
	contentClassName?: string;
	headerClassName?: string;
};

export const Collapsible: React.FC<CollapsibleProps> = ({
	instanceId,
	pageKey,
	defaultCollapsed = false,
	title,
	children,
	headerClickable = true,
	className = "",
	contentClassName = "",
	headerClassName = "",
}) => {
	const key = React.useMemo(
		() => storageKey(instanceId, { pageKey }),
		[instanceId, pageKey],
	);
	const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
	const [hydrated, setHydrated] = React.useState(false);

	// On mount, read localStorage to decide collapsed state for THIS page + instance
	React.useEffect(() => {
		try {
			const inStore =
				typeof window !== "undefined"
					? window.localStorage.getItem(key)
					: null;
			setCollapsed(!!inStore); // if key exists => collapsed
		} catch (e) {
			console.log(e); // localStorage might be blocked; keep default
		} finally {
			setHydrated(true);
		}
	}, [key]);

	const toggle = React.useCallback(() => {
		setCollapsed((prev) => {
			const next = !prev;
			try {
				if (typeof window !== "undefined") {
					if (next) {
						window.localStorage.setItem(key, "1"); // collapsing => add to localStorage
					} else {
						window.localStorage.removeItem(key); // expanding => delete from localStorage
					}
				}
			} catch (e) {
				console.log(e); // ignore storage errors
			}
			return next;
		});
	}, [key]);

	// Accessible chevron button
	const Chevron = (
		<button
			type="button"
			aria-expanded={!collapsed}
			aria-controls={`${instanceId}-content`}
			onClick={toggle}
			className="bg-[#c9cbcc] hover:bg-slate-400 active:bg-slate-600 inline-flex items-center justify-center h-8 w-8 rounded-lg transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0078D4]"
			title={collapsed ? "Expand" : "Collapse"}
		>
			{/* simple caret using border trick for crispness */}
			<span
				className={`block transition-transform ${collapsed ? "rotate-0" : "rotate-180"}`}
				aria-hidden="true"
			>
				{/* v/^ using SVG for consistent look */}
				<svg viewBox="0 0 24 24" className="h-5 w-5">
					<path
						d="M6 9l6 6 6-6"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					/>
				</svg>
			</span>
		</button>
	);

	return (
		<section
			className={`rounded-xl border border-[var(--webpart-border-color)] bg-[var(--webpart-bg-color)] shadow-sm ${className}`}
		>
			<header
				className={`bg-[var(--webpart-header-bg-color)] rounded-t-xl border-b border-slate-800 px-3 py-2 flex items-center justify-between select-none ${headerClassName}`}
			>
				<div className="flex items-center gap-2">
					{headerClickable ? (
						<button
							type="button"
							onClick={toggle}
							aria-expanded={!collapsed}
							aria-controls={`${instanceId}-content`}
							className="text-left font-medium text-gray-800 hover:opacity-80 focus:outline-none"
						>
							<h4 className="text-base font-semibold text-slate-800">
								{title}
							</h4>
						</button>
					) : (
						<div className="font-medium text-gray-800">{title}</div>
					)}
				</div>
				{Chevron}
			</header>

			{/* Content with smooth height transition */}
			<div
				id={`${instanceId}-content`}
				className={`transition-[grid-template-rows] duration-300 ease-in-out overflow-hidden ${contentClassName}`}
				style={{
					display: "grid",
					gridTemplateRows: collapsed ? "0fr" : "1fr",
				}}
				aria-hidden={collapsed}
			>
				{/* inner wrapper participates in the CSS grid height animation */}
				<div className="min-h-0">{hydrated ? children : null}</div>
			</div>
		</section>
	);
};

// ---------------------- USAGE in an SPFx React Web Part ----------------------
// In your web part's React root component render, pass the instanceId from SPFx.
// Example web part class file (simplified):

/*
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Collapsible } from './components/Collapsible';

export default class MyCoolWebPart extends BaseClientSideWebPart<{}> {
  public render(): void {
    const element = (
      <Collapsible instanceId={this.instanceId} title={"My Cool Part"}>
        <div className="prose">
          <p>Content unique to this web part instance.</p>
        </div>
      </Collapsible>
    );
    ReactDom.render(element, this.domElement);
  }
}
*/

// ---------------------- Optional: HOC wrapper ----------------------
// If you already have a React component for your web part, wrap it to get the
// collapse chrome without changing its internals.

export function withCollapsible<
	P extends { instanceId: string; title?: React.ReactNode },
>(Component: React.ComponentType<P>): (props: P) => React.ReactElement<P> {
	return function Wrapped(props: P) {
		const { instanceId, title, ...rest } = props as {
			instanceId: string;
			title?: React.ReactNode;
		};
		return (
			<Collapsible instanceId={instanceId} title={title}>
				<Component {...(rest as P)} instanceId={instanceId} />
			</Collapsible>
		);
	};
}

// ---------------------- Notes ----------------------
// • Per‑page behavior comes from the pageKey (default location.pathname). Same
//   web part instance collapsed on Page X stays collapsed only on Page X.
// • On collapse → we set a localStorage key; on expand → we remove it.
// • The chevron points up when expanded (rotated), down when collapsed.
// • Fully keyboard accessible and screen‑reader friendly.
// • Tailwind classes used throughout; feel free to tweak styles.
