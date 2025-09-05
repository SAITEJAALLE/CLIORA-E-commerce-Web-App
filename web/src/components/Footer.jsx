import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/cliora-logo.svg";

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="m22 8-10 6L2 8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.1 4.19 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.31 1.69.57 2.49a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.14a2 2 0 0 1 2.11-.15c.8.26 1.63.45 2.49.57A2 2 0 0 1 22 16.92Z" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-shell">
        <div className="footer-grid">

          {/* LEFT: Brand */}
          <section className="footer-col footer-col--brand">
            <div className="footer-brand">
              <img src={logo} alt="Cliora" />
              <div>
                <div className="brand-name">CLIORA</div>
                <div className="brand-tag">Modern E-Commerce</div>
              </div>
            </div>
            <p className="footer-text">
              Curated products, elegant UI, and a smooth checkout experience.
              Built with React, Node, and Postgres.
            </p>
          </section>

          {/* CENTER: Explore */}
          <section className="footer-col footer-col--links">
            <h4 className="footer-title footer-title--center">Explore</h4>
            <nav className="footer-links footer-links--grid">
              <Link to="/">Home</Link>
              <Link to="/cart">Cart</Link>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </nav>
          </section>

          {/* RIGHT: About */}
          <section className="footer-col footer-col--about">
            <h4 className="footer-title footer-title--right">About the Developer</h4>
            <ul className="footer-list footer-list--right">
              <li><strong>Saiteja</strong> — Fullstack Web Developer</li>
              <li className="footer-contact">
                <span className="icon"><IconPhone /></span>
                <a href="tel:+447778307800">07778307800</a>
              </li>
              <li className="footer-contact">
                <span className="icon"><IconMail /></span>
                <a href="mailto:saitejaalle999@gmail.com">saitejaalle999@gmail.com</a>
              </li>
            </ul>
          </section>

        </div>

        <div className="footer-divider" />
        <div className="footer-meta">
          <span>© {new Date().getFullYear()} Cliora.</span>
          <span className="dot">•</span>
          <span>VAT included · GBP</span>
        </div>
      </div>
    </footer>
  );
}
