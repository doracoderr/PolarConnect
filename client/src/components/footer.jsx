import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3>PolarConnect</h3>
          <p>NCPOR · Polar &amp; Ocean Research</p>
        </div>

        <div className="footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/sitemap">Sitemap</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>NCPOR · Ministry of Earth Sciences</span>
        <span>Built by Team The PARIKALP (SIH26063)</span>
      </div>
    </footer>
  );
}