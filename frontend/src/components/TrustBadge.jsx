export default function TrustBadge({ score, size = "md" }) {
  const maxScore = 10000;
  const pct = Math.min((score / maxScore) * 100, 100);
  
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
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shadow-lg`}>
        {score}
      </div>
      <span className={`text-xs text-gray-400`}>{label}</span>
    </div>
  );
}
