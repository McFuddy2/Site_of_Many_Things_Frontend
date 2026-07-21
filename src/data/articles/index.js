// To add a new article:
// 1. Create a new file in this folder named after the article slug (e.g. my-article-slug.js)
// 2. Export a single article object from that file as a named export
// 3. Import it here and add it to the articles array below
// 4. Add the new URL to public/sitemap.xml
// 5. Request indexing in Google Search Console after deploying

import { spellFilterMultiClass } from "./5e-spell-filter-multi-class";
import { initiativeTrackerWholeTable } from "./initiative-tracker-whole-table";
import { blindedCasterExcludeKeyword } from "./5e-spells-you-can-cast-while-blinded";

export const articles = [
  blindedCasterExcludeKeyword,
  initiativeTrackerWholeTable,
  spellFilterMultiClass,
];

export function getArticleBySlug(slug) {
  return articles.find((a) => a.slug === slug) ?? null;
}

export function getArticlesByCategory(category) {
  return articles.filter((a) => a.category === category);
}
