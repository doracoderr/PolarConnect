export default function Contact() {
  return (
    <div className="container narrow">
      <section className="hero">
        <h1>Contact</h1>
        <p>Questions about an expedition, or want to report an issue on the portal?</p>
      </section>

      <div className="card" style={{ padding: "18px 20px" }}>
        <h3 style={{ marginTop: 0 }}>NCPOR</h3>
        <p style={{ color: "var(--muted)", margin: "4px 0" }}>
          National Centre for Polar and Ocean Research, Ministry of Earth Sciences
        </p>
        <p style={{ margin: "12px 0 4px" }}>
          <strong>Email:</strong>{" "}
          <a href="mailto:contact@ncpor.gov.in">contact@ncpor.gov.in</a>
        </p>
        <p style={{ margin: "4px 0" }}>
          <strong>Portal team:</strong> Team The PARIKALP &middot; SIH26063
        </p>
      </div>
    </div>
  );
}
