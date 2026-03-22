import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    document.title = "404 — Universal Trust";
    return () => { document.title = "Universal Trust — AI Agent Identity & Trust Layer on LUKSO"; };
  }, []);

  // Try to extract an address from the broken path for a helpful CTA
  const pathParts = location.pathname.split("/").filter(Boolean);
  const maybeAddress = pathParts.find((p) => /^0x[0-9a-fA-F]{40}$/.test(p));

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-12 relative overflow-hidden">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-lukso-purple/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-lukso-darker border border-lukso-border flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Headline */}
          <p className="text-sm font-semibold text-lukso-pink uppercase tracking-widest mb-1">404</p>
          <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
          <p className="text-gray-400 mb-2 max-w-sm mx-auto">
            This page doesn't exist — or it moved. Check the URL or use one of the links below.
          </p>

          {/* Show broken path for context */}
          {location.pathname !== "/" && (
            <p className="text-xs text-gray-600 font-mono mb-6 break-all">
              {location.pathname}
            </p>
          )}

          {/* If path contains an address, offer smart shortcuts */}
          {maybeAddress && (
            <div className="bg-lukso-darker/60 border border-lukso-border/50 rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
              <p className="text-xs text-gray-500 mb-2">Found an address in the URL — did you mean:</p>
              <div className="flex flex-col gap-2">
                <Link
                  to={`/agent/${maybeAddress}`}
                  className="flex items-center gap-2 text-sm text-lukso-purple hover:text-lukso-pink transition font-medium"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View agent profile →
                </Link>
                <Link
                  to={`/verify?address=${maybeAddress}`}
                  className="flex items-center gap-2 text-sm text-lukso-purple hover:text-lukso-pink transition font-medium"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verify this address →
                </Link>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm"
            >
              Browse Agents
            </Link>
            <Link
              to="/verify"
              className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition text-sm"
            >
              Trust Scanner
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-purple/50 hover:text-white transition text-sm"
            >
              Register Agent
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
