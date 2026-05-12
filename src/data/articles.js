// src/data/articles.js
// All articles live here. To add a new article, add a new object to this array.
// Fields:
//   slug         — URL path: /articles/[slug]
//   title        — Page title and H1
//   metaTitle    — <title> tag (can differ from title for SEO)
//   metaDescription — <meta description> tag
//   category     — "tool-guide" | "dm-tips" | "deep-dive"
//   publishedDate — "YYYY-MM-DD" string
//   excerpt      — Short summary shown on the index page
//   content      — Full article in markdown

export const articles = [
  {
    slug: "5e-spell-filter-multi-class",
    title: "The 5e Spell Filter That Handles Multi-Class Exclusions",
    metaTitle: "5e Spell Filter for Multi-Class Characters | Site of Many Things",
    metaDescription:
      "Most 5e spell search tools show you every spell for every class. This one lets you exclude spells your other class already covers — built for multi-class or party optimizer characters.",
    category: "deep-dive",
    publishedDate: "2026-04-09",
    excerpt: "Most spell filtering tools let you narrow by level or class — but what about filtering *out* a class entirely? If you're multi-classing, that changes everything. Here's how inclusion and exclusion filtering works, and why it matters for your build.",

    content: `
## A Problem Worth Solving

If you've built a multi-class spellcaster in 5e, you've probably felt it — that moment where you open a spell list, filter by Wizard, and get buried under 200+ spells. Scrolling. Scrolling. Cross-referencing your Cleric list by hand to figure out which ones you actually *need*.

It works. But it's slow, and it's the kind of friction that pulls you out of the creative part of character building.

There's a better way to look at it.

## Inclusions Are Common. Exclusions Are Rare.

Most spell search tools are built around inclusion — show me spells *for* this class, *of* this level, *from* this school. That covers a lot of ground.

But multi-class characters have a different question: *what does this class give me that my other class doesn't?*

That's an exclusion question. And most tools don't answer it.

## How the Spell Searcher Handles It

The [Spell Searcher](/spell-search) was built with this in mind. You pick your primary class, then select one or more classes to *exclude* — and the results strip out any spell that appears on those excluded lists.

So a Wizard/Cleric who selects Wizard and excludes Cleric will only see spells that Wizards get but Clerics don't. No cross-referencing. No scrolling past spells you already have. Just the spells that actually expand what your character can do.

## Example One: The Multi-Class Problem

Say you're building a Wizard 6 / Cleric 6. You already have the full Cleric spell list available to you. When you level up and pick new Wizard spells, the meaningful question isn't "what can Wizards cast?" — it's "what can Wizards cast that my Cleric *can't*?"

Try it like this:
- Select class: **Wizard**
- Exclude class: **Cleric**
- Result: only spells that are unique to the Wizard list

That's your actual expansion. Those are the spells worth thinking about.

## Example Two: The Sorcerer's Dilemma 

You just hit level 5 with your Sorcerer. Big moment — level 3 spells are finally on the table. But unlike your Cleric friend who can just swap spells after a long rest, your Sorcerer is locked in until next level. This pick matters.

Your party has a Druid, a Cleric, and you. The Druid and Cleric have their own spell lists covered — no need to double up on what they already bring. You want something that's *yours*. Something with impact.

Here's how you'd filter for it:

- Select class: **Sorcerer**
- Exclude classes: **Druid**, **Cleric**
- Level: **3rd**
- School: **Evocation**
- Toggle off: **Concentration**

Now you're looking at a tight, clean list of hard-hitting level 3 spells that belong to the Sorcerer in a way your party's other casters can't replicate. No noise. No overlap. Just options that are genuinely yours to own.

And look at that — Fireball is right there.

Look, were you ever *not* going to take Fireball? Probably not. But now you can say you did the research. You filtered methodically. You considered your party composition and your spell school and your concentration balance. You made an *informed* decision.

The decision was always Fireball. But now it looks like wisdom.

## Give It a Try

Head to the [Spell Searcher](/spell-search) and pull it up on your next build. Stack your filters, run the exclusions, and see what's left. It takes about thirty seconds and has a way of making your spell choices feel a lot more intentional.

Even if you already know it's going to be Fireball.
`.trim(),
  },
];

// Helper: get a single article by slug
export function getArticleBySlug(slug) {
  return articles.find((a) => a.slug === slug) ?? null;
}

// Helper: get articles by category
export function getArticlesByCategory(category) {
  return articles.filter((a) => a.category === category);
}