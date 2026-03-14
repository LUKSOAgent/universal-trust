import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="bg-lukso-card border border-lukso-border rounded-xl p-12">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-lukso-darker border border-lukso-border flex items-center justify-center">
          <span className="text-4xl font-bold text-gray-600">?</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-6">Page not found. The page you're looking for doesn't exist.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-lukso-pink to-lukso-purple hover:opacity-90 transition text-sm"
          >
            Browse Agents
          </Link>
          <Link
            to="/verify"
            className="px-6 py-2.5 rounded-lg font-medium text-gray-300 border border-lukso-border hover:border-lukso-pink/50 hover:text-white transition text-sm"
          >
            Trust Scanner
          </Link>
        </div>
      </div>
    </div>
  );
}
