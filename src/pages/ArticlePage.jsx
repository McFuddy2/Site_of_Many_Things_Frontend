// src/pages/ArticlePage.jsx
import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getArticleBySlug } from "../data/articles";
import { setMetaDescription, setCanonical } from "../utils/seo";
import "../14ArticlesPage.css";

export default function ArticlePage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  useEffect(() => {
    if (!article) return;
    document.title = article.metaTitle;
    setMetaDescription(article.metaDescription);
    setCanonical(`https://thesiteofmanythings.com/articles/${article.slug}`);
  }, [article]);

  // If the slug doesn't match any article, send to 404
  if (!article) {
    return <Navigate to="/Void" replace />;
  }

  return (
    <div className="articles-page-wrapper">
      <div className="article-full-wrapper">

        {/* Breadcrumb */}
        <nav className="article-breadcrumb">
          <Link to="/articles">← Back to Articles</Link>
        </nav>

        {/* Header */}
        <div className="article-header">
          <p className="article-date">
            {new Date(article.publishedDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="article-full-title">{article.title}</h1>
          <p className="article-full-excerpt">{article.excerpt}</p>
        </div>

        {/* Body */}
        <div className="article-body">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        {/* Footer CTA */}
        <div className="article-footer-cta">
          <p>Found this useful? There's more where that came from.</p>
          <Link to="/articles" className="article-back-link">
            Browse all articles →
          </Link>
        </div>

      </div>
    </div>
  );
}