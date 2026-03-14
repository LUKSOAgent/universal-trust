export default function TrustBadge({ score, size = "md" }) {
  let color, label;
  if (score >= 500) {
    color = "from-green-500 to-emerald-400";
    label = "Highly Trusted";
  } else if (score >= 200) {
    color = "from-blue-500 to-cyan-400";
    label = "Trusted";
  } else if (score >= 100) {
    color = "from-yellow-500 to-amber-400";
    label = "Verified";
  } else {
    color = "from-gray-500 to-gray-400";
    label = "New";
  }

  const sizeClasses = {
    sm: "w-10 h-10 text-xs",
    md: "w-16 h-16 text-sm",
    lg: "w-24 h-24 text-lg",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shadow-lg`}
      >
        {score}
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

/**
 * TrustScoreBar — horizontal progress bar with formula breakdown.
 * Use in AgentProfile and AgentCard for detailed score display.
 */
export function TrustScoreBar({ reputation, endorsements, trustScore }) {
  const maxScore = 10000;
  const pct = Math.min((trustScore / maxScore) * 100, 100);

  let barColor;
  if (trustScore >= 500) {
    barColor = "from-green-500 to-emerald-400";
  } else if (trustScore >= 200) {
    barColor = "from-blue-500 to-cyan-400";
  } else if (trustScore >= 100) {
    barColor = "from-yellow-500 to-amber-400";
  } else {
    barColor = "from-gray-500 to-gray-400";
  }

  return (
    <div className="w-full">
      {/* Formula breakdown */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mb-2">
        <span>
          Rep <span className="text-lukso-purple font-semibold">{reputation}</span>
        </span>
        <span className="text-gray-600">+</span>
        <span>
          Endorsements <span className="text-lukso-pink font-semibold">{endorsements}</span>
          <span className="text-gray-500"> × 10</span>
        </span>
        <span className="text-gray-600">=</span>
        <span className="font-semibold text-white">Score {trustScore}</span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 bg-lukso-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-600">0</span>
        <span className="text-xs text-gray-600">10,000</span>
      </div>
    </div>
  );
}
