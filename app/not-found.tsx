import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-card">
      <p className="eyebrow">Not Found</p>
      <h1 className="section-title">That passage could not be found.</h1>
      <p className="empty-copy">
        Choose a valid book and chapter to keep reading from Genesis to Revelation.
      </p>
      <div className="hero-actions">
        <Link className="primary-link" href="/">
          Back to library
        </Link>
      </div>
    </section>
  );
}
