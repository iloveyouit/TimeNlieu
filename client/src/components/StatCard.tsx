interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  icon: string;
  color: "primary" | "success" | "warning" | "muted";
  trend?: "up" | "down";
  progress?: number;
}

export function StatCard({
  title,
  value,
  unit,
  icon,
  color,
  trend,
  progress,
}: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-accent text-foreground",
  };

  const textColorClasses = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    muted: "text-foreground",
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-bold font-mono ${textColorClasses[color]}`}>
              {value}
            </span>
            <span className="text-muted-foreground text-sm">{unit}</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <i className={`fas fa-${icon} text-xl`}></i>
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`${textColorClasses[color]} flex items-center gap-1`}>
            <i className={`fas fa-arrow-${trend} text-xs`}></i>
            <span>this week</span>
          </span>
        </div>
      )}
      {progress !== undefined && (
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${color === "primary" ? "bg-primary" : ""}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}
