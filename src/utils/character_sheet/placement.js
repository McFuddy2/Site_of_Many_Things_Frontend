// Push-away placement: what happens to everything else when a card or module
// is dropped, resized or grows on top of its neighbours. Nothing is ever
// overlapped, hidden or deleted — the things in the way move by the smallest
// distance that clears them, preferring down, or sideways when there's free
// room there, cascading into whatever they then land on. Things that were
// pushed stay where they were pushed (nothing packs back up afterwards).
//
// Pure and deterministic: same input, same output, so a drag's live preview
// and its commit always agree. All rects are { x, y, w, h } in grid units.

import { rectsOverlap, fitCardSize, boundingSize } from "./grid.js";
import { CARD_CHROME_W } from "./layoutConstants.js";

const readingOrder = (a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// `rects` maps id -> rect; ids in `fixedIds` stay exactly where they are and
// everything else is pushed clear of them (and of each other). Sideways
// pushes stay within [0, maxCols); pushing down is always possible, so it's
// the fallback that guarantees a result.
export function resolvePush(rects, fixedIds, { maxCols = Infinity } = {}) {
	const fixed = new Set(fixedIds);
	const result = {};
	const settled = [];
	for (const id of Object.keys(rects)) {
		if (fixed.has(id)) {
			result[id] = rects[id];
			settled.push(rects[id]);
		}
	}
	const movable = Object.keys(rects)
		.filter((id) => !fixed.has(id))
		.map((id) => ({ id, rect: rects[id] }))
		.sort(readingOrder);
	const pending = new Map(movable.map((entry) => [entry.id, entry.rect]));

	for (const { id, rect: original } of movable) {
		pending.delete(id);
		// Free room means nothing is there at all — not something settled, and
		// not something still waiting its turn.
		const isFree = (candidate) =>
			!settled.some((other) => rectsOverlap(candidate, other)) &&
			![...pending.values()].some((other) => rectsOverlap(candidate, other));

		let rect = original;
		for (let guard = 0; guard < 1000; guard += 1) {
			const hits = settled.filter((other) => rectsOverlap(rect, other));
			if (!hits.length) {
				break;
			}
			const downY = Math.max(...hits.map((other) => other.y + other.h));
			const options = [{ rect: { ...rect, y: downY }, cost: downY - rect.y, rank: 0 }];
			const rightX = Math.max(...hits.map((other) => other.x + other.w));
			if (rightX + rect.w <= maxCols) {
				options.push({ rect: { ...rect, x: rightX }, cost: rightX - rect.x, rank: 1 });
			}
			const leftX = Math.min(...hits.map((other) => other.x)) - rect.w;
			if (leftX >= 0) {
				options.push({ rect: { ...rect, x: leftX }, cost: rect.x - leftX, rank: 2 });
			}
			const usable = options.filter((option) => option.rank === 0 || isFree(option.rect));
			usable.sort((a, b) => a.cost - b.cost || a.rank - b.rank);
			rect = usable[0].rect;
		}
		result[id] = rect;
		settled.push(rect);
	}
	return result;
}

const rectOf = (layout) => ({ x: layout.x, y: layout.y, w: layout.w, h: layout.h });

const sameRect = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

// How far right cards may be pushed sideways on a page: the visible width,
// or the page's existing extent if that's already wider.
export function pageColumnLimit(layouts, visibleCols = 0) {
	return Math.max(visibleCols, boundingSize(layouts.map(rectOf)).cols);
}

// Which of the changed rects get to stay exactly put. Normally all of them;
// but if they now overlap each other (aligning two stacked items to the same
// top, say), only `anchorId` holds and the rest are pushed clear like
// everything else — nothing may overlap, alignment included.
function fixedFor(changed, anchorId) {
	const ids = Object.keys(changed);
	const list = ids.map((id) => changed[id]);
	const clash = list.some((a, i) => list.some((b, j) => i < j && rectsOverlap(a, b)));
	return clash && anchorId ? [anchorId] : ids;
}

// Cards on a page after some of them change: `changed` maps layout id -> its
// new rect; returns every layout id -> rect.
export function planCardChange(layouts, changed, { maxCols = Infinity, anchorId = null } = {}) {
	const rects = Object.fromEntries(layouts.map((layout) => [layout.id, rectOf(layout)]));
	Object.assign(rects, changed);
	return resolvePush(rects, fixedFor(changed, anchorId), { maxCols });
}

// Modules in one card after some of them change. Modules never leave the
// card's width (so they're only pushed sideways within it); if pushes run
// past the bottom, the card grows taller rather than clipping, and if the
// card grew, the cards around it on the page are pushed in turn.
// Returns { moduleRects, cardRect, pageRects }.
export function planModuleChange(card, layout, changed, pageLayouts, { maxCols = Infinity, anchorId = null } = {}) {
	const cols = layout.w - CARD_CHROME_W;
	const current = {};
	for (const moduleId of layout.moduleOrder) {
		if (layout.moduleRects[moduleId]) {
			current[moduleId] = layout.moduleRects[moduleId];
		}
	}
	const moduleRects = resolvePush({ ...current, ...changed }, fixedFor(changed, anchorId), { maxCols: cols });
	const fit = fitCardSize(card.title, moduleRects);
	const cardRect = { ...rectOf(layout), w: Math.max(layout.w, fit.w), h: Math.max(layout.h, fit.h) };
	const pageRects = sameRect(cardRect, rectOf(layout))
		? Object.fromEntries(pageLayouts.map((other) => [other.id, rectOf(other)]))
		: planCardChange(pageLayouts, { [layout.id]: cardRect }, { maxCols });
	return { moduleRects, cardRect, pageRects };
}

// ---------- Align and distribute ----------
//
// Both return only the rects that change (id -> rect), in whole units —
// centre alignment rounds to the nearest cell. Callers resolve pushes on the
// result like any other change (see planCardChange / planModuleChange).

export const ALIGN_MODES = ["left", "hcenter", "right", "top", "vmiddle", "bottom"];

export function alignRects(rects, ids, mode) {
	const items = ids.map((id) => [id, rects[id]]).filter(([, rect]) => rect);
	if (items.length < 2) {
		return {};
	}
	const list = items.map(([, rect]) => rect);
	const left = Math.min(...list.map((r) => r.x));
	const right = Math.max(...list.map((r) => r.x + r.w));
	const top = Math.min(...list.map((r) => r.y));
	const bottom = Math.max(...list.map((r) => r.y + r.h));
	const place = {
		left: () => ({ x: left }),
		right: (r) => ({ x: right - r.w }),
		hcenter: (r) => ({ x: Math.round((left + right) / 2 - r.w / 2) }),
		top: () => ({ y: top }),
		bottom: (r) => ({ y: bottom - r.h }),
		vmiddle: (r) => ({ y: Math.round((top + bottom) / 2 - r.h / 2) }),
	}[mode];
	const changed = {};
	for (const [id, rect] of items) {
		const next = { ...rect, ...place(rect) };
		if (next.x !== rect.x || next.y !== rect.y) {
			changed[id] = next;
		}
	}
	return changed;
}

// Even gaps between three or more items along one axis; the first and last
// stay where they are.
export function distributeRects(rects, ids, axis) {
	const pos = axis === "horizontal" ? "x" : "y";
	const size = axis === "horizontal" ? "w" : "h";
	const items = ids
		.map((id) => [id, rects[id]])
		.filter(([, rect]) => rect)
		.sort((a, b) => a[1][pos] - b[1][pos]);
	if (items.length < 3) {
		return {};
	}
	const first = items[0][1];
	const last = items[items.length - 1][1];
	const span = last[pos] + last[size] - first[pos];
	const total = items.reduce((sum, [, rect]) => sum + rect[size], 0);
	const gap = (span - total) / (items.length - 1);
	const changed = {};
	let cursor = first[pos];
	items.forEach(([id, rect], index) => {
		const target = index === items.length - 1 ? rect[pos] : Math.round(cursor);
		if (target !== rect[pos]) {
			changed[id] = { ...rect, [pos]: target };
		}
		cursor += rect[size] + gap;
	});
	return changed;
}
