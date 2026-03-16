import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bg-lukso-darker/90 backdrop-blur-md border-b border-lukso-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white font-bold text-sm">
            UT
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent">
            Universal Trust
          </span>
        </Link>
        
        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          <NavLink to="/" active={isActive("/")}>Agents</NavLink>
          <NavLink to="/register" active={isActive("/register")}>Register</NavLink>
          <NavLink to="/endorse" active={isActive("/endorse")}>Endorse</NavLink>
          <NavLink to="/graph" active={isActive("/graph")}>Graph</NavLink>
          <NavLink to="/skills" active={isActive("/skills")}>Skills</NavLink>
          <NavLink to="/verify" active={isActive("/verify")} highlight>Verify</NavLink>
          <NavLink to="/about" active={isActive("/about")}>About</NavLink>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-2 text-gray-400 hover:text-white transition"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-lukso-border bg-lukso-darker px-4 pb-3 space-y-1">
          <MobileNavLink to="/" active={isActive("/")} onClick={() => setOpen(false)}>Agents</MobileNavLink>
          <MobileNavLink to="/register" active={isActive("/register")} onClick={() => setOpen(false)}>Register</MobileNavLink>
          <MobileNavLink to="/endorse" active={isActive("/endorse")} onClick={() => setOpen(false)}>Endorse</MobileNavLink>
          <MobileNavLink to="/graph" active={isActive("/graph")} onClick={() => setOpen(false)}>Graph</MobileNavLink>
          <MobileNavLink to="/skills" active={isActive("/skills")} onClick={() => setOpen(false)}>Skills</MobileNavLink>
          <MobileNavLink to="/verify" active={isActive("/verify")} onClick={() => setOpen(false)}>Verify</MobileNavLink>
          <MobileNavLink to="/about" active={isActive("/about")} onClick={() => setOpen(false)}>About</MobileNavLink>
        </div>
      )}
    </nav>
  );
}

function NavLink({ to, active, highlight, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-lukso-card text-lukso-pink border border-lukso-pink/30"
          : highlight
          ? "text-lukso-pink hover:text-white hover:bg-lukso-card/50"
          : "text-gray-400 hover:text-white hover:bg-lukso-card/50"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, active, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block px-4 py-3 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-lukso-card text-lukso-pink border border-lukso-pink/30"
          : "text-gray-400 hover:text-white hover:bg-lukso-card/50"
      }`}
    >
      {children}
    </Link>
  );
}
