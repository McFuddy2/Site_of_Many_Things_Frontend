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
import { useCharacterSheet } from "./CharacterSheetContext";

// Per-card layout editing (the mockup's "Edit Layout" flow). All changes —
// reordering, removing, and resizing modules — happen on a draft copy of this
// page's arrangement; card data is never touched. Confirm commits the draft
// through the reducer; Exit without Saving simply drops it.

export const MODULE_MIN_WIDTH = 64;

// Edge handle for width resizing. Stops pointer events so dnd-kit never
// mistakes a resize for a drag; double-click resets the width to auto.
export function ResizeHandle({ onStart, onMove, onEnd, onReset }) {
	const handlePointerDown = (event) => {
		event.stopPropagation();
		event.preventDefault();
		const startX = event.clientX;
		onStart();
		const handleMove = (moveEvent) => onMove(moveEvent.clientX - startX);
		const handleUp = () => {
			document.removeEventListener("pointermove", handleMove);
			document.removeEventListener("pointerup", handleUp);
			if (onEnd) {
				onEnd();
			}
		};
		document.addEventListener("pointermove", handleMove);
		document.addEventListener("pointerup", handleUp);
	};
	return (
		<div
			className="cs-resize-handle"
			title="Drag to resize — double-click to reset"
			onPointerDown={handlePointerDown}
			onDoubleClick={(event) => {
				event.stopPropagation();
				if (onReset) {
					onReset();
				}
			}}
		/>
	);
}

function SortableModuleTile({ moduleId, module, width, onRemove, onResizeStart, onResize, onResizeReset }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: moduleId });
	const localRef = useRef(null);
	const slot = moduleSlotProps(module, width);
	const style = { ...(slot.style || {}), transform: CSS.Transform.toString(transform), transition };
	return (
		<div
			ref={(node) => {
				setNodeRef(node);
				localRef.current = node;
			}}
			style={style}
			className={`cs-layout-module-wrap ${slot.className}${isDragging ? " cs-layout-module-wrap--dragging" : ""}`}
			{...attributes}
			{...listeners}
		>
			<button
				type="button"
				className="cs-layout-remove-x"
				aria-label={`Remove ${module.label} from this layout`}
				onPointerDown={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
				onClick={() => onRemove(moduleId)}
			>
				x
			</button>
			<div className="cs-layout-module-content">
				<ModuleView module={module} />
			</div>
			<ResizeHandle
				onStart={() => onResizeStart(moduleId, localRef.current ? localRef.current.offsetWidth : MODULE_MIN_WIDTH)}
				onMove={(deltaX) => onResize(moduleId, deltaX)}
				onReset={() => onResizeReset(moduleId)}
			/>
		</div>
	);
}

export default function CardLayoutEditor({ pageId, layout, card, onClose }) {
	const { dispatch } = useCharacterSheet();
	const [draft, setDraft] = useState({
		order: layout.moduleOrder,
		sizes: layout.moduleSizes || {},
	});
	const [history, setHistory] = useState([]);
	const [future, setFuture] = useState([]);
	const resizeRef = useRef(null);

	const sensors = useSensors(
		// The distance constraint keeps plain clicks (like the remove "x") from
		// starting a drag.
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	// Every discrete change (drop, remove, resize gesture, reset) snapshots the
	// draft into history first, so Undo/Redo walk whole gestures, not pixels.
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

	const handleRemove = (moduleId) => {
		applyChange({ ...draft, order: draft.order.filter((id) => id !== moduleId) });
	};

	const handleResizeStart = (moduleId, startWidth) => {
		pushHistory(draft);
		resizeRef.current = { moduleId, startWidth };
	};

	const handleResize = (moduleId, deltaX) => {
		const start = resizeRef.current;
		if (!start || start.moduleId !== moduleId) {
			return;
		}
		const width = Math.max(MODULE_MIN_WIDTH, Math.round(start.startWidth + deltaX));
		setDraft((current) => ({ ...current, sizes: { ...current.sizes, [moduleId]: width } }));
	};

	const handleResizeReset = (moduleId) => {
		applyChange({
			...draft,
			sizes: Object.fromEntries(Object.entries(draft.sizes).filter(([id]) => id !== moduleId)),
		});
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
		dispatch({
			type: "setCardArrangement",
			pageId,
			layoutId: layout.id,
			moduleOrder: draft.order,
			moduleSizes: draft.sizes,
		});
		onClose();
	};

	// Honor the layout's card width so the editing grid wraps exactly like the
	// read-only card does.
	const cardSized = typeof layout.cardWidth === "number";
	return (
		<section
			className={`cs-card cs-card--editing${cardSized ? " cs-card--sized" : ""}`}
			style={cardSized ? { width: layout.cardWidth } : undefined}
		>
			<header className="cs-card-header">
				<span>{card.title}</span>
				<span className="cs-card-header-note">Editing Layout</span>
			</header>
			<div className="cs-card-body">
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={draft.order} strategy={rectSortingStrategy}>
						{draft.order.map((moduleId) =>
							card.modules[moduleId] ? (
								<SortableModuleTile
									key={moduleId}
									moduleId={moduleId}
									module={card.modules[moduleId]}
									width={draft.sizes[moduleId]}
									onRemove={handleRemove}
									onResizeStart={handleResizeStart}
									onResize={handleResize}
									onResizeReset={handleResizeReset}
								/>
							) : null
						)}
					</SortableContext>
				</DndContext>
				{draft.order.length === 0 && (
					<p className="cs-empty">Every module is removed from this layout. Undo to bring them back.</p>
				)}
			</div>
			<footer className="cs-layout-controls">
				<div className="cs-layout-controls-group">
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
			</footer>
		</section>
	);
}
