import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bg-lukso-darker border-b border-lukso-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lukso-pink to-lukso-purple flex items-center justify-center text-white font-bold text-sm">
            UT
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-lukso-pink to-lukso-purple bg-clip-text text-transparent">
            Universal Trust
          </span>
        </Link>
        
        <div className="flex items-center gap-1">
          <NavLink to="/" active={isActive("/")}>Agents</NavLink>
          <NavLink to="/register" active={isActive("/register")}>Register</NavLink>
          <NavLink to="/verify" active={isActive("/verify")}>Verify</NavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-lukso-card text-lukso-pink border border-lukso-pink/30"
          : "text-gray-400 hover:text-white hover:bg-lukso-card/50"
      }`}
    >
      {children}
    </Link>
  );
}
