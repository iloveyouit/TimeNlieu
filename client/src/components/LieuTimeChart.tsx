import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LieuTimeChartProps {
  lieuBalance: number;
}

export function LieuTimeChart({ lieuBalance }: LieuTimeChartProps) {
  const maxLieu = 40;
  const percentage = Math.min((lieuBalance / maxLieu) * 100, 100);
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lieu Time Accumulation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(210 40% 96%)"
                strokeWidth="12"
                fill="none"
              ></circle>
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(158 64% 52%)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-mono text-success">
                {lieuBalance.toFixed(1)}
              </span>
              <span className="text-muted-foreground text-sm mt-1">
                hours banked
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-2xl font-bold font-mono">0.0</p>
            <p className="text-sm text-muted-foreground mt-1">Used this month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-mono">{lieuBalance.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground mt-1">Total balance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
