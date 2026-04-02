import {
	CardCarousel,
	ICardItem,
} from "@components/urgencyPortal/CardCarousel";
import { EmbedPopup } from "@components/urgencyPortal/EmbedPopup";
import * as React from "react";
import {
	IUrgencyPortalWebPartProps,
	IParsedItemWithUrl,
	IPowerBiLinkConfig,
} from "@webparts/urgencyPortal/components/IUrgencyPortalWebPartProps";
import { getItemKey, parseLink } from "@utils/powerbi";

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

export function UrgencyPortal({
	links,
	context,
	visibleCount,
	carouselMode,
}: IUrgencyPortalWebPartProps) {
	const [popupItem, setPopupItem] = React.useState<
		IParsedItemWithUrl | undefined
	>(undefined);

	const { items, errors } = React.useMemo(
		(): { items: IParsedItemWithUrl[]; errors: string[] } =>
			parseAll(links),
		[links],
	);

	const cardItems: ICardItem[] = React.useMemo(
		() =>
			items.map((item: IParsedItemWithUrl) => ({
				key: getItemKey(item),
				title: item.title,
				thumbnailUrl: item.thumbnailUrl,
			})),
		[items],
	);

	const onCardClick = React.useCallback(
		(cardItem: ICardItem) => {
			const found = items.find(
				(i: IParsedItemWithUrl) => getItemKey(i) === cardItem.key,
			);
			if (found) setPopupItem(found);
		},
		[items],
	);

	const closePopup = React.useCallback(() => {
		setPopupItem(undefined);
	}, []);

	return (
		<div
			style={{
				fontFamily: "Segoe UI, Arial, sans-serif",
				marginTop: 8,
			}}
		>
			<div style={{ paddingLeft: 5, paddingRight: 5 }}>
				{items.length > 0 ? (
					<CardCarousel
						items={cardItems}
						visibleCount={visibleCount ?? 3}
						autoScrollMs={8000}
						carouselMode={carouselMode}
						onCardClick={onCardClick}
					/>
				) : (
					<p style={{ color: "#888" }}>
						No Power BI links configured. Edit the web part to add
						links.
					</p>
				)}
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

			{popupItem && (
				<EmbedPopup
					selection={popupItem}
					allItems={items}
					context={context}
					onSelect={setPopupItem}
					onClose={closePopup}
				/>
			)}
		</div>
	);
}
