import { Link } from "react-router-dom";

const TILES = [
  {
    to: "/admin/upload",
    icon: "⬆️",
    title: "Upload content",
    desc: "Add a new expedition report, photo set or video for review and publishing.",
  },
  {
    to: "/admin/content",
    icon: "🗂️",
    title: "Manage content",
    desc: "Edit, publish/unpublish, or delete existing expedition entries.",
  },
  {
    to: "/",
    icon: "🌐",
    title: "View public portal",
    desc: "See the site the way a public visitor sees it.",
  },
  {
    to: "/sitemap",
    icon: "🗺️",
    title: "Sitemap",
    desc: "Review the full list of indexed pages.",
  },
];

export default function AdminDashboard() {
  return (
    <div className="container">
      <section className="hero">
        <h1>Admin Dashboard</h1>
        <p>Manage PolarConnect content and site pages.</p>
      </section>

      <div className="grid">
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className="card dashboard-tile">
            <div className="card-body">
              <span className="card-icon" aria-hidden="true">{tile.icon}</span>
              <h3>{tile.title}</h3>
              <p>{tile.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
