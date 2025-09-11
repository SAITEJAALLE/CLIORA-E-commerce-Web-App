import { useContext } from "react";
import { Link, NavLink } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import logo from "../assets/cliora-logo.svg";

export default function Navbar() {
  const auth = useContext(AuthContext) || {};
  const user = auth.user || null;
  const logout = auth.logout || (() => {});

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand" aria-label="Cliora home">
          <img src={logo} alt="Cliora" />
          <span className="brand-name">CLIORA</span>
        </Link>

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
              <span className="nav-link" style={{opacity:.75,fontWeight:500}}>{user.name}</span>
              <button className="btn btn-ghost" onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
