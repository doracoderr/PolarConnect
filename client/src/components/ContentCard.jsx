import { Link } from "react-router-dom";

export default function ContentCard({ item }) {
  return (
    <Link to={`/content/${item._id}`} className="card">
      {item.mediaType === "image" ? (
        <img src={item.viewUrl} alt={item.title} className="card-img" loading="lazy" />
      ) : (
        <div className="card-img card-img-placeholder">
          <span className="card-icon">{item.mediaType === "video" ? "🎬" : "📄"}</span>
          <span>{item.mediaType === "video" ? "View Video →" : "View Document →"}</span>
        </div>
      )}
      <div className="card-body">
        <span className="badge">{item.category}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </Link>
  );
}
