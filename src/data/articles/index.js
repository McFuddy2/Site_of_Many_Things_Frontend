import { spellFilterMultiClass } from "./5e-spell-filter-multi-class";
import { initiativeTrackerWholeTable } from "./initiative-tracker-whole-table";

export const articles = [
  spellFilterMultiClass,
  initiativeTrackerWholeTable,
];

export function getArticleBySlug(slug) {
  return articles.find((a) => a.slug === slug) ?? null;
}

export function getArticlesByCategory(category) {
  return articles.filter((a) => a.category === category);
}
