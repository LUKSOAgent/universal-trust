export default function TrustBadge({ score, size = "md" }) {
  let color, label, ringColor, glowColor;
  // Improved tier mapping with distinct colors:
  // 0-99: Unproven (gray)
  // 100-199: Registered (blue)
  // 200-499: Trusted (green/emerald)
  // 500-999: Established (purple)
  // 1000+: Verified (gold/amber)
  if (score >= 1000) {
    color = "from-amber-500 to-yellow-400";
    label = "Verified";
    ringColor = "border-amber-500/40";
    glowColor = "shadow-amber-500/20";
  } else if (score >= 500) {
    color = "from-purple-500 to-violet-400";
    label = "Established";
    ringColor = "border-purple-500/40";
    glowColor = "shadow-purple-500/20";
  } else if (score >= 200) {
    color = "from-emerald-500 to-green-400";
    label = "Trusted";
    ringColor = "border-emerald-500/40";
    glowColor = "shadow-emerald-500/20";
  } else if (score >= 100) {
    color = "from-blue-500 to-cyan-400";
    label = "Registered";
    ringColor = "border-blue-500/40";
    glowColor = "shadow-blue-500/20";
  } else {
    color = "from-gray-500 to-gray-400";
    label = "Unproven";
    ringColor = "border-gray-500/20";
    glowColor = "";
  }

  const sizeClasses = {
    sm: "w-10 h-10 text-xs",
    md: "w-14 h-14 text-sm sm:w-16 sm:h-16",
    lg: "w-20 h-20 text-base sm:w-24 sm:h-24 sm:text-lg",
  };

  const ringSize = {
    sm: "w-12 h-12",
    md: "w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]",
    lg: "w-[5.5rem] h-[5.5rem] sm:w-[7rem] sm:h-[7rem]",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {/* Outer ring for trusted agents */}
        {score >= 100 && (
          <div className={`absolute inset-0 ${ringSize[size]} -m-1 rounded-full border-2 ${ringColor} animate-pulse`} />
        )}
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shadow-lg ${glowColor} relative z-10`}
          title={`Trust Score: ${score}`}
        >
          {score}
        </div>
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
