import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";

export default function ContentDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/content/${id}`)
      .then(({ data }) => setItem(data.content))
      .catch(() => setError("This content could not be found."));
  }, [id]);

  // Basic SEO: update document title + meta description for this item.
  useEffect(() => {
    if (!item) return;
    document.title = `${item.title} — PolarConnect`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", item.description || item.title);
  }, [item]);

  if (error) return <div className="container"><p className="status status-error">{error}</p></div>;
  if (!item) return <div className="container"><p className="status">Loading...</p></div>;

  return (
    <div className="container detail">
      <Link to="/" className="back-link">&larr; Back to portal</Link>
      <span className="badge">{item.category}</span>
      <h1>{item.title}</h1>
      {item.expeditionName && <p className="muted">Expedition: {item.expeditionName}</p>}

      {item.mediaType === "image" ? (
        <img src={item.mediaUrl} alt={item.title} className="detail-media" />
      ) : item.mediaType === "video" ? (
        <video src={item.mediaUrl} controls className="detail-media" />
      ) : (
        <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="doc-link">
          View document
        </a>
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
