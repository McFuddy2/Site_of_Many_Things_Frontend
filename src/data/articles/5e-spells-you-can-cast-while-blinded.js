export const blindedCasterExcludeKeyword = {
  slug: "5e-spells-you-can-cast-while-blinded",
  title: "Blinded in Combat? Here's How to Find Spells You Can Still Cast",
  metaTitle: "Which 5e Spells Work While Blinded | Site of Many Things",
  metaDescription:
    "Blinded and still want to cast? Filter your spell list, exclude spells that need sight, and see what's left. A quick trick using keyword exclusion on the Spell Searcher.",
  category: "deep-dive",
  publishedDate: "2026-07-21",
  excerpt:
    "Your Bard just got blinded and half your spells need to see the target. Instead of scrolling your whole list mid-turn, you can filter down to the ones that still work. Here's the trick.",

  content: `
## The Turn You Dread

Your Bard takes a face full of Blinding Smite, or walks into a Fog Cloud, or fails the save against a Medusa's gaze. You're blinded. The table turns to you. And now you're mentally scrolling your spell list, trying to remember which of your spells actually need you to *see* the target.

A lot of them do. "A creature you can see within range" is one of the most common phrases in the entire spellbook. Blinded, those spells are off the table — you can't pick a target you can't see.

The clock is ticking, the DM is waiting, and you're doing rules research instead of playing.

## Why This Is Annoying to Figure Out

Most spell tools let you filter *to* things — this class, this level, this school. That's great for building a character. It's less great for the specific, in-the-moment question of "what can I still do right now, given this condition?"

Because the thing you want isn't a category. It's the *absence* of a phrase. You want every spell that doesn't hinge on seeing your target. No standard class-or-level filter gets you there.

## The Trick: Exclude the Phrase

The [Spell Searcher](/spell-search) lets you filter spells out by keyword, matching against the full text of the spell — not just its name or tags. That turns "spells I can cast while blinded" into something you can actually search for.

Here's the move: filter to your spells, then exclude the exact phrase that sight-dependent spells share.

Try it like this:
- Select class: **Bard**
- Level: **Cantrip** through **3rd**
- Exclude keyword: **you can see**

The exclusion strips out every spell whose text contains "you can see" — which is the phrasing D&D uses for targeting you can't do without sight. What's left is a much shorter list of spells that don't care whether your eyes work: buffs, area effects that don't require picking a visible target, spells that hit everything in a radius, self-affecting spells, and so on.

You went from "my whole spell list" to "the handful that actually work right now" in about ten seconds.

## It Works for More Than Blindness

Once you see the pattern, it shows up everywhere. Keyword exclusion is a way to answer "what's left after I remove the spells that share this trait?"

A few that come up at real tables:
- **Silenced or in an antimagic-adjacent bind?** You're often reaching for spells without a verbal component — filter and exclude from there.
- **Trying to avoid friendly-fire in a crowded room?** Exclude an area shape or damage phrasing you don't want near your allies.
- **Building around a theme?** Exclude a keyword that doesn't fit the character concept and see what remains.

The point isn't that any one exclusion gives you a perfect list. It's that it does the tedious narrowing for you, so you're choosing from ten spells instead of two hundred.

## A Fair Warning

Keyword exclusion is a fast filter, not a rules lawyer. Excluding "you can see" catches the big category of sight-dependent targeting, but D&D isn't perfectly consistent about its phrasing, and a spell here or there might slip through or get caught when you didn't expect it. Glance over the survivors before you commit — the list is short enough now that a quick read is easy.

That's the whole idea, really. The tool does the heavy narrowing. You make the call.

## Give It a Try

Next time a condition scrambles your options mid-fight, head to the [Spell Searcher](/spell-search), filter to your class and levels, and exclude the phrase that's getting in your way. It's faster than flipping through your character sheet, and it keeps you in the game instead of in the rulebook.

Your Bard is blind, not useless. Go prove it.
`.trim(),
};
