Features — The Site of Many Things
Last updated: April 2026
Every feature on this list either deepens something already unique, or is itself unique.
Generic tools that exist on more established sites are not scheduled until we have a defensible reason to build them that no one else can match.

Initiative Tracker
Status: Live
What makes it unique: Built for players and DM simultaneously at the same table. No other free tool does this.
Live (MVP complete)

Add/remove combatants
Auto-sort by initiative
Track round number
Highlight active and next combatant
Conditions and effects
Magical clean UI
Desktop optimized

Phase 1 (Sprints 5–6)

Mobile layout pass
Tablet layout pass
Effect durations with expiry alerts
Status icons for conditions
Mid-fight combatant additions
Export encounter summary (simple text copy)

Phase 2 — Saved Setups (Sprint 7+, requires user accounts)

Save and reload session setups per logged-in user

Live Shared Sessions (Sprint 9)

Anyone can create a session and receive a shareable code or link
Anyone can join using the code — no account required, just a display name
Account holders get their name pre-populated on join
All participants see the same initiative tracker view in real time
Session ends when the creator closes it or all participants disconnect
This is the word-of-mouth feature

Combat Manager (Sprint 10 — DM layer on top of live session)

DM-only view sitting on top of an active shared session
HP, conditions, and notes per combatant — invisible to players
Players continue seeing the standard initiative tracker view
Session creator is automatically the DM
Requires live shared session infrastructure from Sprint 9

Future

Portraits per combatant
Saved monster groups
Dice rolling
"Your turn!" push alerts
Character sheet sync (long term)


Spell Searcher
Status: Live
What makes it unique: Most complete 5e spell database publicly available. Multi-class exclusion filtering (class NOT IN) that no other free tool offers. 569 spells across 15 source books.
Live (MVP complete)

Full spell database — SRD and non-SRD spells
Complex filtering: AND, OR, NOT logic
Class NOT IN filtering
Level, school, components, range, source, concentration filters
Compact list with expandable spell detail
Copy spell text button
Magical UI

Spellbooks Phase 1 (Sprint 6)

"Add to Spellbook" button on every spell
localStorage persistence — intentionally limited
/spellbook route showing locally saved spells
When user tries to save: modal prompt — "Create a free account to save your spellbooks"
This is the account conversion hook, not a complete feature

Spellbooks Phase 2 (Sprints 7–8, requires user accounts)

Cloud-synced spellbooks for logged-in users
Free tier: one saved spellbook
Ko-fi members: multiple saved spellbooks
On first login: offer to migrate locally saved spells to account
Cloud sync is the first real Ko-fi member perk

Future

Filter presets
Custom tags on spells
Homebrew spell entry
Spell comparison view
AI recommendations (deferred — API cost)
Marketplace (long term)

Ongoing — Spell Data Quality

569 spells require a full manual QC pass against physical/digital books we own
QC order: PHB first, then remaining sources alphabetically within each source
Spot-fix script for correcting individual fields without touching the full record
New source books checked every 3 sprints — added via spreadsheet bulk import or CLI


User Accounts
Status: Not started
Scheduled: Sprint 7
Why it exists: Unlocks spellbook cloud sync, Ko-fi membership recognition, live session identity, and everything downstream.
Sprint 7 scope

Email/password signup and login
Google OAuth — both options available from day one
Auth state managed in React context
Protected route wrapper component
Basic profile page: username, email, Ko-fi supporter status
Backend: user table, session tokens, FastAPI auth endpoints

Ko-fi Integration (Sprint 8)

Ko-fi webhook fires automatically when someone becomes a supporter
Backend matches their Ko-fi email to their account and sets supporter flag
Fully automatic — no manual steps for the user
Supporter badge on profile page
Supporter perks: multiple saved spellbooks, future gated features


Combat Manager
Status: Planning
Scheduled: Sprint 10
Requires: Live shared session infrastructure (Sprint 9)
MVP Spec: See mvp-spec.md
The Combat Manager is a DM-only layer on top of an active shared initiative session.
Without the live session infrastructure it is just a local HP tracker — not worth building standalone since better alternatives already exist.
Sprint 10 MVP scope

DM-only view accessible from an active shared session
HP tracking with quick damage/heal buttons
Condition add/remove
Notes per combatant (DM-only, invisible to players)
Round and turn tracking linked to the live session
Clean DM-focused layout separate from the player-facing tracker view
Route: /combat

Answered design decisions

Combat Manager and Initiative Tracker share live session state — linked, not separate tools
Players see the initiative tracker view only; Combat Manager is DM-only
Session creator is automatically the DM

Future

Save/load encounters
Monster stat block panel
Loot and reward generator
Link to Spell Searcher for caster turns


Encounter and Combat Generator
Status: Backlog
Scheduled: Sprint 11
Requires: Combat Manager (Sprint 10)
Without the Combat Manager this is just another encounter builder. It only becomes unique when it feeds directly into a live combat session.
Sprint 11 MVP scope (full spec required before coding begins)

Generate encounter suggestions that push directly into the Combat Manager
Party size and level inputs
Difficulty selection
Monster suggestions from OGL list
One-click load into active session

Future

Full monster database with filtering
Smart synergy suggestions
Rewards and loot generation
NPC integration
Environment effects


Deferred — AI-Powered Generators
NPC Generator, Magic Item Generator, Quest Generator are not scheduled until revenue can absorb API costs.
Not cut — deferred to Phase 3.
When they arrive they will be gated behind Ko-fi tiers for unlimited use.

Deferred — Campaign Manager
Requires Combat Manager and live session infrastructure first. Not scheduled until Stage 2 revenue.

Deferred — Mobile Apps, VTT Integrations, Marketplace
Stage 3 and Stage 4 scope only.