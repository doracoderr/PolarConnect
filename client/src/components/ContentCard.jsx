import { Link } from "react-router-dom";

export default function ContentCard({ item }) {
  return (
    <Link to={`/content/${item._id}`} className="card">
      {item.mediaType === "image" ? (
        <img src={item.mediaUrl} alt={item.title} className="card-img" loading="lazy" />
      ) : (
        <div className="card-img card-img-placeholder">{item.mediaType.toUpperCase()}</div>
      )}
      <div className="card-body">
        <span className="badge">{item.category}</span>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </Link>
  );
}
