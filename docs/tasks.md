Tasks & Sprint Plan — The Site of Many Things
Last updated: April 2026
A structured, momentum-friendly, revenue-focused task system.
Team capacity per sprint (2 weeks):

Glenn: ~10 hrs backend + business
Jess: ~10 hrs frontend (reliable — on critical path)
Caleb: variable, never on critical path

This plan assumes:

We extend existing React initiative tracker code
We extend existing Python + PostgreSQL spell API
We prioritize fast monetization, SEO, and shippable features
We ask clarifying questions whenever requirements are unclear
When creating ClickUp tasks for each new sprint, include the Ongoing Every Sprint tasks so they are not missed


Standing Sprint Rules
These apply to every sprint without exception.
When planning a new sprint, these are built in automatically — they do not need to be discussed each time.
Every Sprint Must Include
A clearly labeled sprint review task (Business / Glenn) with the following subtasks:

Review GA: active users, sessions, engagement time — write the numbers down
Review GSC: impressions, clicks, indexed pages — write the numbers down
Update seo-strategy.md Post History table with any Reddit posts made this sprint
Update roadmap.md milestone table if any milestone was hit
Confirm all sprint tasks marked complete in ClickUp
Write one sentence summary of what the sprint accomplished
Note the last spell reviewed in QC this sprint — record source name and spell name so next sprint knows exactly where to pick up
Check if any new official 5e source has been released that needs spell ingestion — if yes, create a task for next sprint
Review Bugs list — triage any new reports, pull critical or significant ones into next sprint
Run npm audit in frontend/tools/initiative — run npm audit fix if fixes are available without breaking changes
Update sitemap.xml if any new pages or articles were added this sprint
Resolve all Bugs Triaged for THIS sprint
Update changed docs in GitHub repo and re-sync them in the Claude Project settings

Every Other Sprint (even-numbered sprints: 4, 6, 8, 10...)
Include a Buttondown newsletter task (Business / Glenn):

Review what shipped this sprint worth telling subscribers about
Write and send newsletter update via Buttondown
Keep it short, friendly, and personal — see content-voice.md

Every Task Must

Be labeled with one of these types: Frontend, Backend, DB, DevOps, Design, SEO, Business
Be assigned to Glenn (McFuddy) or left Unassigned (for Jess/Caleb to claim)
Include subtasks specific enough that anyone can pick them up without asking what they mean
Include a plain-language description of why the task matters, not just what to do

Before Each New Tool Enters Development

Fill in the MVP spec template in mvp-spec.md before writing any code
Add the completed spec as a new section in mvp-spec.md
Review with Glenn and Jess before the sprint begins

Blog / SEO Articles

Each new article must be submitted to GSC for indexing immediately after publishing
Each article must include a meta title and meta description before publishing
Each article must link naturally to at least one tool

To add a new article: create src/data/articles/your-slug.js with a named export, then import it and add it to the array in src/data/articles/index.js. Also add the new URL to public/sitemap.xml and request indexing in Google Search Console after deploying.


Phase 1 — Get Discovered (Sprints 4–6)
Goal: Go from 2 indexed pages to fully indexed. Get real humans finding the site.

Sprint 4 — Polish, Indexing, First Visibility
Primary Goal: Site discoverable. Ko-fi visible. Articles section live. QC system established.
Revenue Goal: Ko-fi link live and visible on both tool pages.
Success Metric: GSC audit complete. First article published. Bug report form updated.
Frontend — Unassigned (Jess/Caleb)

Build /articles index page and first article page at /articles/5e-spell-filter-multi-class
Add title tags, meta descriptions, and OG tags to Initiative Tracker and Spell Searcher pages
Site visual QA pass — desktop, tablet (768px), and mobile (375px) on both tools — document issues, do not fix yet
Add Ko-fi buttons to both tool pages and footer — styled with golden accent color
Add Buttondown signup embed to footer — styled to match site branding, labeled "Get notified when new tools drop"
Bonus (low priority): Copy spell text button on Spell Searcher

Backend/Business — Glenn

Google Search Console audit — document all unindexed pages, fix easy wins, request indexing for key pages
Write SEO article: "The Only 5e Spell Filter That Handles Multi-Class Exclusions" (400–600 words)
Update bug report form to capture: which tool, what they tried, what happened, frequency, browser, device, images (optional), email (optional)
Build spell spot-fix Python script — accepts spell ID and one or more field/value pairs, updates only those fields, shows before/after confirmation
Document QC process in SPELL-QC.md — source order, how to run spot-fix script, how to mark progress
Begin QC pass on PHB spells A through Z (or as far as time allows) — note last spell reviewed in sprint review
Count Heroes of Faerun spells, decide entry method (spreadsheet + bulk import or CLI), begin entry if time allows

Sprint 4 Review (Glenn)

Review GA and GSC — write numbers down
Note last spell QC'd — source and spell name
Check for new official 5e source releases
Review Bugs list
Update changed docs in GitHub and re-sync in Claude Project settings
Send Buttondown newsletter (even sprint)


Sprint 5 — SEO Depth + Mobile/Tablet Fixes
Primary Goal: Content volume and responsive layout on both tools.
Revenue Goal: AdSense application submitted.
Success Metric: Both tools usable on mobile. Two more SEO articles live.
Frontend — Unassigned (Jess/Caleb)

Fix mobile layout (375px) on Initiative Tracker — based on Sprint 4 QA notes
Fix mobile layout (375px) on Spell Searcher — based on Sprint 4 QA notes
Fix tablet layout (768px) on Initiative Tracker — based on Sprint 4 QA notes
Fix tablet layout (768px) on Spell Searcher — based on Sprint 4 QA notes
Articles index page styled to match site branding (Sprint 4 was functional only)
Ko-fi supporter callout component — reusable, appears on tool pages and homepage
Homepage updated to surface both live tools clearly

Backend/Business — Glenn

Write SEO article #2
Write SEO article #3
Submit AdSense application if not already done
Continue spell QC — pick up from last spell noted in Sprint 4 review
Complete Heroes of Faerun spell entry if not finished in Sprint 4
Post about Spell Searcher on Reddit (first genuine post — see content-voice.md for tone)

Sprint 5 Review (Glenn)

Standard review checklist (see Standing Sprint Rules)
How many daily users averaging now?
Any Ko-fi clicks recorded?


Sprint 6 — Spellbooks (localStorage) + Initiative Tracker Phase 1
Primary Goal: Spellbook gives users a reason to return. Tracker Phase 1 features ship.
Revenue Goal: AdSense approved or pending final review.
Success Metric: Spellbook functional. Tracker has effect durations and status icons.
Frontend — Unassigned (Jess/Caleb)

"Add to Spellbook" button on every spell card
localStorage spellbook — saves selected spells locally, intentionally limited
/spellbook route — view and remove locally saved spells
Modal prompt when saving: "Create a free account to save your spellbooks" — this is the account conversion hook
Effect durations on conditions (Initiative Tracker Phase 1)
Status icons for conditions
Mid-fight combatant additions

Backend/Business — Glenn

Write SEO article #3 (if not done in Sprint 5)
Post initiative tracker update on Reddit — new features are a post opportunity
Review Buttondown — is signup visible enough? Are subscribers getting value?
Continue spell QC
Send Buttondown newsletter (even sprint)

Sprint 6 Review (Glenn)

Standard review checklist
How many daily users averaging now?
Is AdSense approved?
Are subscribers growing?
Revenue number — even if $0, write it down


Phase 2 — First Revenue (Sprints 7–10)
Goal: Consistent traffic. AdSense running. Ko-fi converting. First dollar made. Build toward $1,500/month.

Sprint 7 — User Accounts
Primary Goal: Auth infrastructure live. Spellbooks cloud-synced for logged-in users.
Revenue Goal: First dollar made (ads or Ko-fi).
Success Metric: Users can create accounts and log in. Spellbook saves to account.
Frontend — Jess (critical path — heaviest sprint to date)

Login and signup pages (email/password)
Google OAuth login option — both available from day one
Auth state in React context (logged in / logged out)
Protected route wrapper component
Basic profile page: username, email, Ko-fi supporter status (placeholder until Sprint 8)
Spellbook save now works for logged-in users — cloud sync
"Saved locally" spells offer to migrate to account on first login
Modal prompt on spellbook save updates to reflect account state

Backend/Business — Glenn

User table, session tokens, FastAPI auth endpoints
Google OAuth backend integration
Activate AdSense ads if approved — place tastefully, not aggressively
Write SEO article #4: "Best Wizard Spells Not on the Cleric List" — targets unique multi-class filter
Ko-fi promotion push: mention in Reddit comments, Buttondown newsletter, site banner
Track revenue explicitly this sprint — document the first dollar if it happens
Continue spell QC

Sprint 7 Review (Glenn)

First dollar made? If yes, celebrate. Seriously.
User accounts working end to end?
Spellbook cloud sync working?
Revenue number


Sprint 8 — Ko-fi Integration + First Member Perk
Primary Goal: Site automatically recognizes Ko-fi supporters. Cloud spellbooks as first perk.
Revenue Goal: Consistent ad impressions. First recurring Ko-fi supporter.
Success Metric: Ko-fi webhook working. Supporters have multiple spellbooks.
Frontend — Jess

Supporter badge on profile page
Multiple saved spellbooks UI for Ko-fi members (free tier gets one)
Small "Supporters" section on site — warm, magical feel
Expiring condition alerts (Initiative Tracker Phase 1)
Export encounter summary — simple text copy/download
General tracker polish pass

Backend/Business — Glenn

Ko-fi webhook endpoint — receives POST from Ko-fi on new supporter, matches email to account, sets supporter flag automatically
Write SEO article #5
Build simple public "What's Coming" roadmap page — builds community investment
Review GA: what pages are people landing on? Double down on those topics
Send Buttondown newsletter (even sprint)

Sprint 8 Review (Glenn)

Initiative tracker Phase 1 complete?
Ko-fi webhook working?
Any recurring supporters?
Monthly revenue number


Sprint 9 — Live Shared Initiative Tracker
Primary Goal: The word-of-mouth feature. Ships and gets posted on Reddit.
Revenue Goal: Revenue growing month over month.
Success Metric: Live session works end to end. Posted on Reddit same sprint.
Frontend — Jess + Caleb if available

Session creation — generates shareable code or link
Session join — enter code or follow link, enter display name, no account required
Account holders get name pre-populated on join
Real-time tracker view shared across all participants
Session end handling — creator closes or all disconnect
Clean UX for both "I have an account" and "I'm just joining" flows

Backend/Business — Glenn

WebSocket or polling infrastructure for real-time session sync
Session/room model in backend
Write SEO article #6
Post live initiative tracker launch on Reddit immediately when it ships
Send Buttondown newsletter announcing the feature

Sprint 9 Review (Glenn)

Live sessions working end to end?
Reddit post made?
Monthly revenue number — compare to last sprint


Sprint 10 — Combat Manager MVP
Primary Goal: Third differentiated tool live.
Revenue Goal: Revenue growing month over month.
Success Metric: Combat Manager usable, linked to live sessions, posted on Reddit.
Frontend — Jess + Caleb if available

DM-only view accessible from an active shared session
HP tracking with quick damage/heal buttons per combatant
Condition add/remove per combatant
Notes field per combatant — DM-only, invisible to players
Round and turn tracking linked to live session state
Clean DM-focused layout at /combat
Linked from initiative tracker

Backend/Business — Glenn

Any backend needed for Combat Manager (likely minimal — shares live session state)
Write SEO article #7
Post Combat Manager launch on Reddit
Full revenue review: what is working? What is not? Plan Phase 3 based on real data
Send Buttondown newsletter (even sprint)

Sprint 10 Review (Glenn)

Three live, differentiated tools?
Monthly revenue number
What does Phase 3 look like based on what we now know?


Phase 3 — Scale What Works (Sprint 11+)
Sprints 11+ will be planned after Sprint 10 based on real traffic and revenue data.
General direction:

Encounter and Combat Generator (unique because it feeds into Combat Manager)
More SEO content
More tool enhancements
AI generators only when revenue can absorb API costs
Campaign Manager when there is enough to manage


Ongoing Every Sprint

Ship at least one small visible improvement
Review GA traffic and GSC impressions — write the numbers down
Write down the current monthly revenue number
Celebrate any milestones hit


Long-Term Backlog (Not Scheduled Yet)

Encounter and Combat Generator (Sprint 11)
NPC Generator (Phase 3, AI — deferred)
Magic Item Generator (Phase 3, AI — deferred)
Quest Generator (Phase 3, AI — deferred)
Campaign Manager (Phase 3+ — deferred)
Character sheet
Mobile optimization beyond responsive layout
VTT integrations
Marketplace







