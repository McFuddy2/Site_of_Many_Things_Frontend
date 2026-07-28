import { RESIZE_HANDLES } from "../../../utils/character_sheet/snapping";

// The rendering half of the free-form canvas: it draws whatever the consumer
// gives it at each rect from useLayoutCanvas, plus the selection handles,
// alignment guides and marquee. All behaviour lives in the hook — this file is
// deliberately just markup, so a consumer that wants a different chrome can
// use the hook directly and skip this component.

// 4 corners + 4 edge midpoints. Corner handles drive width and height
// together, edge handles drive only their own dimension; each carries its own
// cursor (see RESIZE_HANDLES).
export function ResizeHandles({ id, getHandleProps }) {
	return RESIZE_HANDLES.map((handle) => (
		<div
			key={handle.id}
			className={`cs-handle cs-handle--${handle.id}`}
			aria-hidden="true"
			{...getHandleProps(id, handle.id)}
		/>
	));
}

// Thin magenta lines showing what the dragged rect is currently aligned to.
// They're derived fresh from every frame's snap result, so they appear and
// disappear with the alignment rather than sticking around.
export function AlignmentGuides({ guides }) {
	return guides.map((guide) => (
		<div
			key={`${guide.orientation}-${guide.position}-${guide.start}`}
			className={`cs-guide cs-guide--${guide.orientation}`}
			style={
				guide.orientation === "vertical"
					? { left: guide.position, top: guide.start, height: guide.end - guide.start }
					: { top: guide.position, left: guide.start, width: guide.end - guide.start }
			}
		/>
	));
}

export default function LayoutCanvas({
	canvas,
	items,
	renderItem,
	renderItemOverlay,
	className = "",
	style,
	itemClassName = "",
	showHandles = true,
}) {
	const { rects, selection, activeId, guides, marquee, selectionBounds, getCanvasProps, getItemProps, getHandleProps } = canvas;
	// Handles are only drawn for a lone selection; a multi-selection gets an
	// outline per member plus one dashed box around the group instead.
	const singleSelection = selection.length === 1;

	return (
		<div className={`cs-canvas ${className}`.trim()} style={style} {...getCanvasProps()}>
			{items.map((id) => {
				const rect = rects[id];
				if (!rect) {
					return null;
				}
				const selected = selection.includes(id);
				const active = activeId === id;
				const itemClasses = [
					"cs-canvas-item",
					itemClassName,
					selected ? "cs-canvas-item--selected" : "",
					active ? "cs-canvas-item--active" : "",
				]
					.filter(Boolean)
					.join(" ");
				return (
					<div
						key={id}
						className={itemClasses}
						style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
						{...getItemProps(id)}
					>
						{renderItem(id, { rect, selected, active })}
						{renderItemOverlay ? renderItemOverlay(id, { rect, selected, active }) : null}
						{showHandles && selected && singleSelection ? <ResizeHandles id={id} getHandleProps={getHandleProps} /> : null}
					</div>
				);
			})}

			{selection.length > 1 && selectionBounds ? (
				<div
					className="cs-group-bounds"
					style={{
						left: selectionBounds.x,
						top: selectionBounds.y,
						width: selectionBounds.width,
						height: selectionBounds.height,
					}}
				/>
			) : null}

			<AlignmentGuides guides={guides} />

			{marquee ? (
				<div
					className="cs-marquee"
					style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
				/>
			) : null}
		</div>
	);
}
