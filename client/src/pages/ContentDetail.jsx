import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";

export default function ContentDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    api.get(`/content/${id}`)
      .then(({ data }) => setItem(data.content))
      .catch(() => setError("This content could not be found."));
  }, [id]);

  // SEO: dynamic title, meta description, Open Graph tags, and a
  // schema.org JSON-LD block so this page is properly discoverable
  // and shows a real preview when shared.
  useEffect(() => {
    if (!item) return;

    document.title = `${item.title} — PolarConnect`;

    const setMeta = (attr, key, content) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("name", "description", item.description || item.title);
    setMeta("property", "og:title", item.title);
    setMeta("property", "og:description", item.description || item.title);
    setMeta("property", "og:type", "article");
    if (item.mediaType === "image") setMeta("property", "og:image", item.viewUrl);

    // Canonical URL — avoids duplicate-URL SEO issues (e.g. tracking params)
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + `/content/${item._id}`);

    // schema.org structured data for Google rich results
    const schemaType = item.mediaType === "video" ? "VideoObject"
      : item.mediaType === "image" ? "ImageObject"
      : "CreativeWork";

    let ld = document.getElementById("pc-structured-data");
    if (!ld) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.id = "pc-structured-data";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": schemaType,
      name: item.title,
      description: item.description,
      contentUrl: item.viewUrl,
      keywords: item.tags?.join(", "),
      about: item.expeditionName || item.category,
      publisher: {
        "@type": "Organization",
        name: "NCPOR — National Centre for Polar and Ocean Research",
      },
    });

    return () => { ld.textContent = ""; }; // clear when navigating away
  }, [item]);

  if (error) return <div className="container"><p className="status status-error">{error}</p></div>;
  if (!item) return <div className="container"><p className="status">Loading...</p></div>;

  return (
    <div className="container detail">
      <Link to="/" className="back-link">&larr; Back to portal</Link>
      <span className="badge">{item.category}</span>
      <h1>{item.title}</h1>
      {item.expeditionName && <p className="muted">Expedition: {item.expeditionName}</p>}

      {item.mediaType === "image" && !imageError ? (
        <img 
          src={item.viewUrl} 
          alt={item.title} 
          className="detail-media"
          onError={() => setImageError(true)}
        />
      ) : item.mediaType === "video" ? (
        <video src={item.viewUrl} controls className="detail-media" />
      ) : (
        <div className="document-view">
          <p className="doc-note">📄 Document / Report</p>
          <a href={item.viewUrl} target="_blank" rel="noreferrer" className="doc-link">
            📥 View / Download Document
          </a>
        </div>
      )}

      <p className="description">{item.description}</p>

      {item.tags?.length > 0 && (
        <div className="tags">
          {item.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
        </div>
      )}

      <div className="social-caption">
        <strong>Social caption:</strong> {item.socialCaption}
      </div>
    </div>
  );
}
