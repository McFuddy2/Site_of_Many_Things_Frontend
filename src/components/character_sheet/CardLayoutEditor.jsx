import { useState } from "react";
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
import { ModuleView } from "./CharacterSheetCard";
import { useCharacterSheet } from "./CharacterSheetContext";

// Per-card layout editing (the mockup's "Edit Layout" flow). All changes happen
// on a draft copy of this page's module order; card data is never touched, so
// removing a module here only hides it on this page. Confirm commits the draft
// through the reducer; Exit without Saving simply drops it.

function SortableModuleTile({ moduleId, module, onRemove }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: moduleId });
	const style = { transform: CSS.Transform.toString(transform), transition };
	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`cs-layout-module-wrap${isDragging ? " cs-layout-module-wrap--dragging" : ""}`}
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
		</div>
	);
}

export default function CardLayoutEditor({ pageId, layout, card, onClose }) {
	const { dispatch } = useCharacterSheet();
	const [draftOrder, setDraftOrder] = useState(layout.moduleOrder);
	const [history, setHistory] = useState([]);
	const [future, setFuture] = useState([]);

	const sensors = useSensors(
		// The distance constraint keeps plain clicks (like the remove "x") from
		// starting a drag.
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const applyChange = (nextOrder) => {
		setHistory((stack) => [...stack, draftOrder]);
		setFuture([]);
		setDraftOrder(nextOrder);
	};

	const handleDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = draftOrder.indexOf(active.id);
		const newIndex = draftOrder.indexOf(over.id);
		if (oldIndex === -1 || newIndex === -1) {
			return;
		}
		applyChange(arrayMove(draftOrder, oldIndex, newIndex));
	};

	const handleRemove = (moduleId) => {
		applyChange(draftOrder.filter((id) => id !== moduleId));
	};

	const handleUndo = () => {
		if (!history.length) {
			return;
		}
		const previous = history[history.length - 1];
		setHistory(history.slice(0, -1));
		setFuture([draftOrder, ...future]);
		setDraftOrder(previous);
	};

	const handleRedo = () => {
		if (!future.length) {
			return;
		}
		const [next, ...rest] = future;
		setFuture(rest);
		setHistory([...history, draftOrder]);
		setDraftOrder(next);
	};

	const handleConfirm = () => {
		dispatch({ type: "setLayoutModuleOrder", pageId, layoutId: layout.id, moduleOrder: draftOrder });
		onClose();
	};

	return (
		<section className="cs-card cs-card--editing">
			<header className="cs-card-header">
				<span>{card.title}</span>
				<span className="cs-card-header-note">Editing Layout</span>
			</header>
			<div className="cs-card-body">
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext items={draftOrder} strategy={rectSortingStrategy}>
						{draftOrder.map((moduleId) =>
							card.modules[moduleId] ? (
								<SortableModuleTile
									key={moduleId}
									moduleId={moduleId}
									module={card.modules[moduleId]}
									onRemove={handleRemove}
								/>
							) : null
						)}
					</SortableContext>
				</DndContext>
				{draftOrder.length === 0 && (
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
