import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A small menu at a screen point — the right-click menu, and what a card's ⋮
// opens. Follows the ARIA menu pattern: focus starts on the first item,
// arrow keys / Home / End move, Enter or Space picks, Esc or Tab closes (and
// focus goes back where it came from), and a press anywhere else or a
// scroll closes it too.
//
// items: { id, label, onSelect, disabled?, danger?, hint? } entries, plus
// { separator: true } and { heading: "…" } rows.

const VIEWPORT_MARGIN = 8;

export default function ContextMenu({ x, y, items, label, onClose }) {
	const menuRef = useRef(null);
	const [position, setPosition] = useState({ left: x, top: y });
	const returnFocusRef = useRef(typeof document !== "undefined" ? document.activeElement : null);

	// Keep the whole menu on screen.
	useLayoutEffect(() => {
		const menu = menuRef.current;
		if (!menu) {
			return;
		}
		const { width, height } = menu.getBoundingClientRect();
		setPosition({
			left: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - width - VIEWPORT_MARGIN)),
			top: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - height - VIEWPORT_MARGIN)),
		});
	}, [x, y]);

	const enabledItems = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || [])];

	useEffect(() => {
		enabledItems()[0]?.focus();
	}, []);

	useEffect(() => {
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
	}, [onClose]);

	const closeAndRestoreFocus = () => {
		onClose();
		returnFocusRef.current?.focus?.();
	};

	const onKeyDown = (event) => {
		const list = enabledItems();
		const index = list.indexOf(document.activeElement);
		const move = (next) => {
			event.preventDefault();
			list[(next + list.length) % list.length]?.focus();
		};
		if (event.key === "ArrowDown") move(index + 1);
		else if (event.key === "ArrowUp") move(index - 1);
		else if (event.key === "Home") move(0);
		else if (event.key === "End") move(list.length - 1);
		else if (event.key === "Escape" || event.key === "Tab") {
			event.preventDefault();
			event.stopPropagation();
			closeAndRestoreFocus();
		}
		// Every key stays inside the menu: nothing here should reach the
		// canvas's own shortcuts (Delete, arrows…).
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
				return (
					<button
						key={item.id}
						type="button"
						role="menuitem"
						className={`cs-menu-item${item.danger ? " cs-menu-item--danger" : ""}`}
						aria-disabled={item.disabled ? "true" : undefined}
						tabIndex={-1}
						onClick={() => {
							if (item.disabled) {
								return;
							}
							onClose();
							item.onSelect();
						}}
					>
						<span>{item.label}</span>
						{item.hint ? <span className="cs-menu-hint">{item.hint}</span> : null}
					</button>
				);
			})}
		</div>
	);
}
