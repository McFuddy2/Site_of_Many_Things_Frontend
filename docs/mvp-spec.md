MVP Specification — The Site of Many Things
Last updated: April 2026
This document is used BEFORE building each new tool.
Fill it in, confirm it with the team, then begin development.
A shared definition of done prevents scope creep and wasted work.
Completed tools (Initiative Tracker, Spell Searcher) do not need specs retroactively.
This template applies to all future tools starting with Combat Manager.

How to Use This File
When a new tool is ready to enter development:

Copy the template below
Fill in every section
Review with Glenn and Jess before any code is written
Add the completed spec as a new section in this file
Reference it during the sprint to stay on scope


MVP Spec Template
# MVP Spec — [Tool Name]
Sprint: [Sprint number]
Owner: [Who is leading this tool]
Status: [Planning / In Progress / Complete]

---

## What It Does (One Paragraph)
Describe what this tool does and who it is for.
Be specific. Avoid vague phrases like "helps DMs manage things."

## What It Does NOT Do (MVP Scope Boundary)
List explicitly what is out of scope for the MVP.
This is as important as what is in scope.

## User Story
As a [DM / player], I want to [do a specific thing] so that [specific outcome at the table].

## Core Features (Must Ship)
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

## Explicitly Out of Scope for MVP
- Feature X (Phase 1)
- Feature Y (future)

## Data Requirements
What data does this tool need?
- Frontend only (localStorage)?
- Needs backend API?
- Needs database table?

## Route
/[route-name]

## Definition of Done
This MVP is complete when:
- [ ] All core features work end to end
- [ ] No broken states (empty, loading, error all handled)
- [ ] Works on tablet and desktop
- [ ] Matches site branding
- [ ] Linked from site navigation
- [ ] Posted on Reddit for feedback

## Phase 1 (After MVP — Not This Sprint)
Features we want but are explicitly deferring:
-
-

## Open Questions
Questions that must be answered before or during development:
-
-

MVP Spec — Combat Manager
Sprint: 10
Owner: Jess/Caleb (frontend) / Glenn (backend)
Status: Planning

What It Does
A DM-only combat view that sits on top of an active live shared initiative session.
The DM sees all combatants, their HP, conditions, and notes — information that players do not see.
Players connected to the same session continue seeing the standard initiative tracker view.
The Combat Manager is only accessible from within an active shared session created in Sprint 9.
What It Does NOT Do
Does not replace the initiative tracker.
Does not require its own separate session — it layers on top of the live session infrastructure built in Sprint 9.
Does not include dice rolling, portraits, or monster stat lookups in the MVP.
Does not require saving encounters to the database in the MVP.
User Story
As a DM running a live combat session, I want a focused view of all combatants and their HP, conditions, and personal notes so that I can manage the fight efficiently without players seeing information they should not.
Core Features (Must Ship)

 DM-only view accessible from an active shared session
 List all combatants with HP, AC, notes and conditions visible
 Track current turn and round (linked to live session state)
 Quick HP adjustment — damage and heal buttons per combatant
 Condition add/remove per combatant
 Notes field per combatant — visible to DM only, not synced to players
 Clean DM-focused layout separate from the player-facing tracker view
 Group vs individual tracking (for mobs)
 Link to/from initiative tracker


Explicitly Out of Scope for MVP

Monster stat block lookup
Dice rolling
Portraits
Saving encounters to database
Loot and reward generator
Encounter history

Data Requirements
Shares live session state with the initiative tracker via the WebSocket/session infrastructure built in Sprint 9.
DM notes are local to the DM's session only — not stored in the database in MVP.
No new database tables required for MVP.
Route
/combat
Answered Design Decisions
How do Combat Manager and Initiative Tracker share state?
They share live session state via the same session infrastructure. They are linked tools, not separate tools. The Combat Manager reads from and writes to the same active session the initiative tracker is running.
Is the Combat Manager DM-only or do players get a read-only view?
DM-only in the MVP. Players see the standard initiative tracker view. The DM distinction comes entirely from being the session creator. There is no player-facing Combat Manager view in the MVP.
Who is the DM?
The person who created the session is automatically the DM and has access to the Combat Manager view.
Definition of Done

 All core features work end to end
 No broken states (empty, loading, error all handled)
 Works on tablet and desktop
 Matches site branding
 Linked from initiative tracker
 DM notes not visible to players confirmed via testing
 Posted on Reddit for feedback

Phase 1 (Deferred)

Save/load encounters to database
Monster stat block panel
add monsters to the postgres database (need to build schema)
Loot and reward generator
Link to Spell Searcher for caster turns
Encounter history per campaign

Open Questions
None remaining — all design decisions answered above.

Next Spec Needed: Encounter and Combat Generator (Sprint 11)
Fill in before Sprint 11 planning begins.