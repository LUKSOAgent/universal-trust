import { CONTRACT_ADDRESS, EXPLORER_URL } from "../config";

export default function Footer() {
  return (
    <footer className="border-t border-lukso-border bg-lukso-darker mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="shrink-0">Contract:</span>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lukso-purple hover:text-lukso-pink transition font-mono text-xs"
            >
              <span className="hidden sm:inline">{CONTRACT_ADDRESS}</span>
              <span className="sm:hidden">{CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>LUKSO Mainnet</span>
            <span className="hidden sm:inline">•</span>
            <a
              href="https://github.com/LUKSOAgent/universal-trust"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lukso-purple hover:text-lukso-pink transition"
            >
              GitHub
            </a>
            <span>•</span>
            <span>Synthesis 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
