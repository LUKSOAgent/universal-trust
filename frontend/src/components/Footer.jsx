import { CONTRACT_ADDRESS, SKILLS_REGISTRY_ADDRESS, EXPLORER_URL } from "../config";

function truncate(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Footer() {
  return (
    <footer className="border-t border-lukso-border bg-lukso-darker mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top row */}
        <div className="grid sm:grid-cols-3 gap-6 mb-6 text-sm">
          {/* Branding */}
          <div>
            <p className="text-white font-semibold mb-1">Universal Trust</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              On-chain identity and reputation layer for AI agents on LUKSO.
              No API keys. No centralized authority.
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-500">Powered by LUKSO Mainnet</span>
            </div>
          </div>

          {/* Contracts */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium mb-2">Contracts</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-40 shrink-0">AgentIdentityRegistry</span>
                <a
                  href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-lukso-purple hover:text-lukso-pink transition"
                  title={CONTRACT_ADDRESS}
                >
                  {truncate(CONTRACT_ADDRESS)}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-40 shrink-0">AgentSkillsRegistry</span>
                <a
                  href={`${EXPLORER_URL}/address/${SKILLS_REGISTRY_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-lukso-purple hover:text-lukso-pink transition"
                  title={SKILLS_REGISTRY_ADDRESS}
                >
                  {truncate(SKILLS_REGISTRY_ADDRESS)}
                </a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium mb-2">Links</p>
            <div className="space-y-1.5">
              <a
                href="https://github.com/LUKSOAgent/universal-trust"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub — LUKSOAgent/universal-trust
              </a>
              <a
                href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}#readContract`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                LUKSO Explorer
              </a>
              <a
                href="https://docs.lukso.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                LUKSO Docs
              </a>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-4 border-t border-lukso-border/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <span className="font-medium text-gray-500">Built for Synthesis 2026 — Agents that Trust track</span>
          <span>Last updated March 16, 2026 · v1.1.0</span>
        </div>
      </div>
    </footer>
  );
}
