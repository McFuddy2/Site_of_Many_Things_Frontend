// src/pages/ArticlesIndexPage.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { articles } from "../data/articles";
import { setMetaDescription, setCanonical } from "../utils/seo";
import "../14ArticlesPage.css";

const CATEGORY_LABELS = {
  "tool-guide": "Tool Guide",
  "dm-tips": "DM Tips",
  "deep-dive": "Deep Dive",
};

export default function ArticlesIndexPage() {
  useEffect(() => {
    document.title = "Articles | Site of Many Things";
    setMetaDescription(
      "Guides, tips, and deep dives for Dungeon Masters and TTRPG players. Learn how to use our tools and run better games."
    );
    setCanonical("https://thesiteofmanythings.com/articles");
  }, []);

  return (
    <div className="articles-page-wrapper">
      <h1 className="articles-page-title">Articles</h1>
      <p className="articles-page-subtitle">
        Guides for our tools, tips for the table, and deep dives for the curious DM.
      </p>

      <div className="articles-list">
        {articles.map((article) => (
          <motion.div
            key={article.slug}
            className="article-card"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Link to={`/articles/${article.slug}`} className="article-card-link">
              <div className="article-card-meta">
                <span className="article-category-badge">
                  {CATEGORY_LABELS[article.category] ?? article.category}
                </span>
                <span className="article-date">
                  {new Date(article.publishedDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h2 className="article-card-title">{article.title}</h2>
              <p className="article-card-excerpt">{article.excerpt}</p>
              <span className="article-read-more">Read more →</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}