import { useContext, useMemo } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import logo from "../assets/cliora-logo.svg";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Navbar() {
  const auth = useContext(AuthContext) || {};
  const user = auth.user || null;
  const logout = auth.logout || (() => {});

  const navigate = useNavigate();
  const qs = useQuery();

  // Keep inputs in sync with the URL
  const q = qs.get("q") || "";
  const sort = qs.get("sort") || "new";

  function updateQuery(next) {
    const current = new URLSearchParams(window.location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (v === "" || v == null) current.delete(k);
      else current.set(k, v);
    });
    // Navigate to home with updated query (keeps SPA routing)
    navigate({ pathname: "/", search: `?${current.toString()}` });
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="Cliora home">
          <img src={logo} alt="Cliora" />
          <span className="brand-name">CLIORA</span>
        </Link>

        {/*  Search + Sort controls in the navbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            maxWidth: 640,
            margin: "0 16px",
          }}
        >
          <input
            type="search"
            placeholder="Search products…"
            value={q}
            onChange={(e) => {
              // set q and reset page to 1
              updateQuery({ q: e.target.value, page: 1 });
            }}
            className="nav-search"
            style={{ flex: 1 }}
          />

          <select
            value={sort}
            onChange={(e) => {
              // set sort and reset page to 1
              updateQuery({ sort: e.target.value, page: 1 });
            }}
            className="nav-sort"
            title="Sort products"
          >
            <option value="new">Recommended / Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>

        <nav className="nav-links">
          <NavLink className="nav-link" to="/">Home</NavLink>
          <NavLink className="nav-link" to="/cart">Cart</NavLink>
          {user?.role === "admin" && <NavLink className="nav-link" to="/admin">Admin</NavLink>}
          {!user ? (
            <>
              <NavLink className="nav-link" to="/login">Login</NavLink>
              <NavLink className="nav-link" to="/register">Register</NavLink>
            </>
          ) : (
            <>
              <span className="nav-link" style={{ opacity: 0.75, fontWeight: 500 }}>
                {user.name}
              </span>
              <button className="btn btn-ghost" onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
