import { CONTRACT_ADDRESS, EXPLORER_URL } from "../config";

export default function Footer() {
  return (
    <footer className="border-t border-lukso-border bg-lukso-darker mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>AgentIdentityRegistry:</span>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lukso-purple hover:text-lukso-pink transition font-mono text-xs"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>LUKSO Mainnet (Chain 42)</span>
            <span>•</span>
            <a
              href="https://github.com/LUKSOAgent/universal-trust"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lukso-purple hover:text-lukso-pink transition"
            >
              GitHub
            </a>
            <span>•</span>
            <span>Synthesis Hackathon 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
