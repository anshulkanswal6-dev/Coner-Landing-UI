import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Lightbulb, Heart } from "lucide-react";

const ICON_MAP = {
  pain_point: AlertCircle,
  pricing_interest: DollarSign,
  feature_requests: Lightbulb,
  satisfaction: Heart,
  engagement: TrendingUp,
};

const TREND_COLORS = {
  up: "text-green-500",
  down: "text-red-500",
  neutral: "text-zinc-500",
};

export default function InsightCards({ insights, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3"></div>
            <div className="h-6 bg-zinc-800 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-zinc-800 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-6 mb-6 text-center">
        <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">Not enough data yet. Start some conversations to see insights!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {insights.map((insight, i) => {
        const Icon = ICON_MAP[insight.metric_type] || TrendingUp;
        const TrendIcon = insight.trend === "up" ? TrendingUp : insight.trend === "down" ? TrendingDown : null;
        const trendColor = TREND_COLORS[insight.trend] || TREND_COLORS.neutral;

        return (
          <div
            key={i}
            data-testid={`insight-card-${i}`}
            className="bg-gradient-to-br from-zinc-900/70 to-zinc-900/40 border border-white/5 rounded-lg p-4 hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <Icon className="w-5 h-5 text-purple-400" />
              {TrendIcon && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
            </div>
            <h4 className="font-heading font-semibold text-sm mb-2 text-white">{insight.title}</h4>
            <p className="text-2xl font-bold mb-2 text-purple-400">{insight.delta_value}</p>
            <p className="text-xs text-zinc-400 line-clamp-2">{insight.description}</p>
          </div>
        );
      })}
    </div>
  );
}
