import { useRef, useState } from "react";
import {
	DndContext,
	closestCenter,
	PointerSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	rectSortingStrategy,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ModuleView, moduleSlotProps } from "./CharacterSheetCard";
import { ResizeHandle } from "./CardLayoutEditor";
import { useCharacterSheet } from "./CharacterSheetContext";

// Page-level "Arrange Cards" mode: drag whole cards to reorder them on the
// active page and resize their widths, with the same draft + undo/redo +
// Confirm / Exit without Saving pattern as the per-card layout editor.
// Card values are display-only while arranging.

const CARD_MIN_WIDTH = 180;

function ArrangeCardTile({ layout, card, width, onResizeStart, onResize, onResizeReset }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layout.id });
	const localRef = useRef(null);
	const sized = typeof width === "number";
	const style = {
		...(sized ? { width } : {}),
		transform: CSS.Transform.toString(transform),
		transition,
	};
	return (
		<div
			ref={(node) => {
				setNodeRef(node);
				localRef.current = node;
			}}
			style={style}
			className={`cs-arrange-card-wrap${isDragging ? " cs-arrange-card-wrap--dragging" : ""}`}
			{...attributes}
			{...listeners}
		>
			<section className={`cs-card${sized ? " cs-card--sized" : ""} cs-arrange-card`}>
				<header className="cs-card-header">
					<span>{card.title}</span>
					<span className="cs-card-header-note">Drag to move</span>
				</header>
				<div className="cs-card-body cs-arrange-card-body">
					{layout.moduleOrder.map((moduleId) => {
						const module = card.modules[moduleId];
						if (!module) {
							return null;
						}
						const slot = moduleSlotProps(module, layout.moduleSizes?.[moduleId]);
						return (
							<div key={moduleId} className={slot.className} style={slot.style}>
								<ModuleView module={module} />
							</div>
						);
					})}
				</div>
			</section>
			<ResizeHandle
				onStart={() => onResizeStart(layout.id, localRef.current ? localRef.current.offsetWidth : CARD_MIN_WIDTH)}
				onMove={(deltaX) => onResize(layout.id, deltaX)}
				onReset={() => onResizeReset(layout.id)}
			/>
		</div>
	);
}

export default function PageArrangeEditor({ page, onClose }) {
	const { sheet, dispatch } = useCharacterSheet();
	const [draft, setDraft] = useState({
		order: page.cardLayouts.map((layout) => layout.id),
		// null width = auto; numbers are px
		widths: Object.fromEntries(
			page.cardLayouts.map((layout) => [layout.id, typeof layout.cardWidth === "number" ? layout.cardWidth : null])
		),
	});
	const [history, setHistory] = useState([]);
	const [future, setFuture] = useState([]);
	const resizeRef = useRef(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const pushHistory = (fromDraft) => {
		setHistory((stack) => [...stack, fromDraft]);
		setFuture([]);
	};

	const applyChange = (nextDraft) => {
		pushHistory(draft);
		setDraft(nextDraft);
	};

	const handleDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = draft.order.indexOf(active.id);
		const newIndex = draft.order.indexOf(over.id);
		if (oldIndex === -1 || newIndex === -1) {
			return;
		}
		applyChange({ ...draft, order: arrayMove(draft.order, oldIndex, newIndex) });
	};

	const handleResizeStart = (layoutId, startWidth) => {
		pushHistory(draft);
		resizeRef.current = { layoutId, startWidth };
	};

	const handleResize = (layoutId, deltaX) => {
		const start = resizeRef.current;
		if (!start || start.layoutId !== layoutId) {
			return;
		}
		const width = Math.max(CARD_MIN_WIDTH, Math.round(start.startWidth + deltaX));
		setDraft((current) => ({ ...current, widths: { ...current.widths, [layoutId]: width } }));
	};

	const handleResizeReset = (layoutId) => {
		applyChange({ ...draft, widths: { ...draft.widths, [layoutId]: null } });
	};

	const handleUndo = () => {
		if (!history.length) {
			return;
		}
		const previous = history[history.length - 1];
		setHistory(history.slice(0, -1));
		setFuture([draft, ...future]);
		setDraft(previous);
	};

	const handleRedo = () => {
		if (!future.length) {
			return;
		}
		const [next, ...rest] = future;
		setFuture(rest);
		setHistory([...history, draft]);
		setDraft(next);
	};

	const handleConfirm = () => {
		dispatch({ type: "setPageArrangement", pageId: page.id, layoutOrder: draft.order, cardWidths: draft.widths });
		onClose();
	};

	const layoutsById = new Map(page.cardLayouts.map((layout) => [layout.id, layout]));

	return (
		<div className="cs-arrange">
			<div className="cs-layout-controls cs-arrange-controls">
				<div className="cs-layout-controls-group">
					<span className="cs-arrange-title">Arranging {page.name}</span>
					<button type="button" className="cs-layout-btn" onClick={handleUndo} disabled={!history.length}>
						Undo
					</button>
					<button type="button" className="cs-layout-btn" onClick={handleRedo} disabled={!future.length}>
						Redo
					</button>
				</div>
				<div className="cs-layout-controls-group">
					<button type="button" className="cs-layout-btn cs-layout-btn--confirm" onClick={handleConfirm}>
						Confirm Layout
					</button>
					<button type="button" className="cs-layout-btn cs-layout-btn--exit" onClick={onClose}>
						Exit without Saving
					</button>
				</div>
			</div>
			<div className="cs-canvas">
				{draft.order.length === 0 ? (
					<p className="cs-empty">This page has no cards to arrange.</p>
				) : (
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
						<SortableContext items={draft.order} strategy={rectSortingStrategy}>
							{draft.order.map((layoutId) => {
								const layout = layoutsById.get(layoutId);
								const card = layout ? sheet.cards[layout.cardId] : null;
								return layout && card ? (
									<ArrangeCardTile
										key={layoutId}
										layout={layout}
										card={card}
										width={draft.widths[layoutId]}
										onResizeStart={handleResizeStart}
										onResize={handleResize}
										onResizeReset={handleResizeReset}
									/>
								) : null;
							})}
						</SortableContext>
					</DndContext>
				)}
			</div>
		</div>
	);
}
