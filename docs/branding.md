# Branding Guidelines

Last updated: March 2026

---

## Brand Identity

The Site of Many Things feels like stepping into a wizard's study — organized, purposeful, and quietly magical. It is not a costume party. It is not a children's game. It is a serious tool with an arcane soul.

The brand earns its whimsy through restraint. Magic appears in the details: a glow on the active combatant, a shimmer on hover, a button label that says "Begin the Hunt" instead of "Search." Everything else is clean, readable, and fast.

---
 
## Color Palette

| Name | Usage | Value |
|---|---|---|
| Deep Purple | Page backgrounds, base surfaces | rgb(65, 42, 133) |
| Light Purple | Primary UI color, interactive elements, highlights | rgb(170, 73, 184) |
| Golden | Accents, calls to action, active states, special moments | rgb(224, 166, 58) |

### Rules
- Deep Purple is the foundation. It should dominate.
- Light Purple draws the eye to interactive elements and structure.
- Golden is used sparingly. It means something. Active turn indicator, primary CTA button, milestone moments. If everything is golden, nothing is.
- Never use all three at equal weight on the same element. Pick a dominant, use the others to support.

---

## Typography

### Display / Headings
**Quintessential** (Google Fonts)
Used for: page titles, tool names, section headers, any text that should feel arcane.
Never use for body copy or small UI labels — it loses legibility at small sizes.

### Body / UI
System font stack or a clean readable sans-serif.
Used for: spell descriptions, filter labels, form inputs, data, anything the user needs to read quickly.
Clarity beats character at small sizes.

---

## Voice & Tone

### The one-sentence description
A knowledgeable guide who happens to be a wizard — confident, informative, and quietly enchanting.

### What that means in practice
- The site knows things. It does not hedge or apologize.
- It respects the user's time. It says what it needs to say and stops.
- It has a little magic in how it says things — but only where it fits naturally. Forced whimsy is worse than no whimsy.
- It never talks down. DMs are smart. Players are smart. Treat them that way.

### Tone spectrum
Not this far → "Your mystical journey into the arcane begins HERE, brave adventurer!"
Not this far → "Filter results. Submit. Reset."
Right here → "No spells matched your filters. Try widening the search."
Right here → "Add a combatant to begin the encounter."

### The test
Read the copy aloud. Does it sound like a person who plays D&D and also knows what they're doing? Good. Does it sound like a theme park or a government form? Rewrite it.

---

## Microcopy Patterns

### Buttons
Prefer action words with a slight arcane flavor where natural.
- "Search" → "Search the Archives"
- "Add" → "Add to the Fight" (initiative) / "Add to Spellbook" (spells)
- "Clear" → "Clear Filters"
- "Copy" → "Copy to Clipboard" (plain is fine here — utility over flavor)
- "Support" → "Buy Us a Soda"

Do not force it. "Submit" is fine if nothing better fits naturally.

### Empty States
Never leave the user staring at nothing without explanation and a next step.
- Empty initiative tracker: "No combatants yet. Add someone to begin the encounter."
- Empty spell results: "The arcane library found nothing matching those filters. Try adjusting your search."
- Empty spellbook: "Your spellbook is empty. Add spells from the searcher to begin."

### Loading States
Short, calm, purposeful.
- "Searching the archives..."
- "Loading spells..."
- Not: "Please wait while we process your request."

### Error States
Honest, calm, not alarming.
- "Something went wrong loading spells. Try refreshing the page."
- Not: "ERROR: Failed to fetch. Status 500."

### Tooltips
Informative first, flavor second.
- Tell the user what the thing does before you make it sound magical.

---

## UI Principles

### Glow with intention
Glows and magical effects are earned, not sprinkled everywhere.
Use glow on: active combatant, focused inputs, primary CTAs, hover states on interactive cards.
Do not use glow on: static text, background decoration, things the user cannot interact with.

### Motion with purpose
Framer Motion animations should feel like the UI is breathing, not performing.
- Transitions: smooth, brief (150–300ms)
- Entrance animations: subtle, not dramatic
- No looping animations on idle elements unless they are extremely subtle

### Density
Tools should feel spacious but not wasteful. DMs are often reading and acting simultaneously. Give elements room to breathe. Do not cram.

### Mobile
Tools must work on a tablet at the table. A DM running a session on an iPad is the target use case for mobile optimization.

---

## Logo

Current: placeholder SVG (hub-and-spoke design, dark purple background, parchment scroll center, 8 orbit nodes).
Single-color version exists for embroidery use.
Favicon SVG produced — convert to .ico at 32x32 and 16x16 via RealFaviconGenerator when ready.
Professional logo commission is a future milestone, not current priority.

---

## What We Are Not

- Not childish or cartoonish
- Not grimdark or gothic
- Not corporate or sterile
- Not overwhelming or cluttered
- Not a clone of D&D Beyond, Roll20 or any other site