import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A small menu at a screen point — the right-click menu, and what a ⋮ opens.
// Follows the ARIA menu pattern: focus starts on the first item, arrow keys /
// Home / End move, Enter or Space picks, Esc or Tab closes (and focus goes
// back where it came from), and a press anywhere else or a scroll closes it
// too.
//
// items: { id, label, onSelect, disabled?, danger?, hint? } entries, plus
// { separator: true } and { heading: "…" } rows. An item with `submenu` (a
// list of items) opens a submenu beside it — on click, hover, Enter or →;
// ← or Esc goes back.

const VIEWPORT_MARGIN = 8;

export default function ContextMenu({ x, y, items, label, onClose, nested = false, onBack = null }) {
	const menuRef = useRef(null);
	const [position, setPosition] = useState({ left: x, top: y });
	const [submenu, setSubmenu] = useState(null); // { index, x, y }
	const returnFocusRef = useRef(typeof document !== "undefined" ? document.activeElement : null);

	// Keep the whole menu on screen (a submenu that won't fit to the right of
	// its item opens to the left instead).
	useLayoutEffect(() => {
		const menu = menuRef.current;
		if (!menu) {
			return;
		}
		const { width, height } = menu.getBoundingClientRect();
		let left = x;
		if (nested && x + width > window.innerWidth - VIEWPORT_MARGIN) {
			left = (returnFocusRef.current?.getBoundingClientRect().left ?? x) - width - 2;
		}
		setPosition({
			left: Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN)),
			top: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - height - VIEWPORT_MARGIN)),
		});
	}, [x, y, nested]);

	// Only this menu's own items — not those of a submenu inside it.
	const enabledItems = () => [...(menuRef.current?.querySelectorAll(':scope > [role="menuitem"]:not([aria-disabled="true"])') || [])];

	useEffect(() => {
		enabledItems()[0]?.focus();
	}, []);

	useEffect(() => {
		if (nested) {
			return undefined;
		}
		const close = () => onClose();
		const onPointerDown = (event) => {
			if (!menuRef.current?.contains(event.target)) {
				onClose();
			}
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("resize", close);
		window.addEventListener("scroll", close, true);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("resize", close);
			window.removeEventListener("scroll", close, true);
		};
	}, [onClose, nested]);

	const closeAndRestoreFocus = () => {
		onClose();
		returnFocusRef.current?.focus?.();
	};

	const openSubmenu = (index, element) => {
		const box = element.getBoundingClientRect();
		setSubmenu({ index, x: box.right + 2, y: box.top - 4 });
	};

	const onKeyDown = (event) => {
		const list = enabledItems();
		const index = list.indexOf(document.activeElement);
		const move = (next) => {
			event.preventDefault();
			list[(next + list.length) % list.length]?.focus();
		};
		const current = document.activeElement;
		if (event.key === "ArrowDown") move(index + 1);
		else if (event.key === "ArrowUp") move(index - 1);
		else if (event.key === "Home") move(0);
		else if (event.key === "End") move(list.length - 1);
		else if (event.key === "ArrowRight" && current?.dataset.submenuIndex) {
			event.preventDefault();
			openSubmenu(Number(current.dataset.submenuIndex), current);
		} else if (nested && (event.key === "ArrowLeft" || event.key === "Escape")) {
			event.preventDefault();
			onBack?.();
		} else if (event.key === "Escape" || event.key === "Tab") {
			event.preventDefault();
			closeAndRestoreFocus();
		}
		// Every key stays inside the menu: nothing here should reach the
		// canvas's own shortcuts (Delete, arrows…) — or the menu around a submenu.
		event.stopPropagation();
	};

	return (
		<div
			ref={menuRef}
			className="cs-menu"
			role="menu"
			aria-label={label}
			style={{ left: position.left, top: position.top }}
			onKeyDown={onKeyDown}
			onContextMenu={(event) => event.preventDefault()}
		>
			{items.map((item, index) => {
				if (item.separator) {
					return <div key={`sep-${index}`} className="cs-menu-separator" role="separator" />;
				}
				if (item.heading) {
					return (
						<div key={`heading-${index}`} className="cs-menu-heading" role="presentation">
							{item.heading}
						</div>
					);
				}
				const hasSubmenu = Boolean(item.submenu?.length);
				return (
					<button
						key={item.id}
						type="button"
						role="menuitem"
						className={`cs-menu-item${item.danger ? " cs-menu-item--danger" : ""}`}
						aria-disabled={item.disabled ? "true" : undefined}
						aria-haspopup={hasSubmenu ? "menu" : undefined}
						aria-expanded={hasSubmenu ? submenu?.index === index : undefined}
						data-submenu-index={hasSubmenu ? index : undefined}
						tabIndex={-1}
						onMouseEnter={(event) => {
							if (hasSubmenu) {
								openSubmenu(index, event.currentTarget);
							} else if (submenu) {
								setSubmenu(null);
							}
						}}
						onClick={(event) => {
							if (item.disabled) {
								return;
							}
							if (hasSubmenu) {
								openSubmenu(index, event.currentTarget);
								return;
							}
							onClose();
							item.onSelect();
						}}
					>
						<span>{item.label}</span>
						{hasSubmenu ? <span className="cs-menu-hint">›</span> : item.hint ? <span className="cs-menu-hint">{item.hint}</span> : null}
					</button>
				);
			})}
			{submenu ? (
				<ContextMenu
					nested
					x={submenu.x}
					y={submenu.y}
					items={items[submenu.index].submenu}
					label={items[submenu.index].label}
					onClose={onClose}
					onBack={() => {
						const opener = menuRef.current?.querySelector(`:scope > [data-submenu-index="${submenu.index}"]`);
						setSubmenu(null);
						opener?.focus();
					}}
				/>
			) : null}
		</div>
	);
}
