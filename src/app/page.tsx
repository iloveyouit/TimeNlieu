import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">TimeNlieu</h1>
      <p className="text-lg text-muted-foreground">Track your timesheet entries and manage your time in lieu.</p>
      <Button onClick={() => signIn()} className="mt-4">Sign In</Button>
    </div>
  );
}