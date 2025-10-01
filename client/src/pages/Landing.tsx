import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(225 73% 57%) 100%)"
    }}>
      <Card className="w-full max-w-md animate-in fade-in duration-500">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
              <i className="fas fa-clock text-3xl text-primary-foreground"></i>
            </div>
            <h1 className="text-3xl font-bold text-foreground">TimesheetPro</h1>
            <p className="text-muted-foreground mt-2">
              Smart timesheet tracking made simple
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full"
                size="lg"
                data-testid="button-login"
              >
                Sign In with Replit
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-success mt-0.5"></i>
                <div>
                  <h3 className="font-semibold">OCR Screenshot Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload timesheet screenshots and automatically extract data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-success mt-0.5"></i>
                <div>
                  <h3 className="font-semibold">Automatic Lieu Time Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Track overtime hours over 40/week automatically
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <i className="fas fa-check-circle text-success mt-0.5"></i>
                <div>
                  <h3 className="font-semibold">Visual Reports & Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    See your time tracking data with charts and graphs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
