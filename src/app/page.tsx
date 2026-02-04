"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">TimeNlieu</h1>
      <p className="text-lg text-muted-foreground">Track your timesheet entries and manage your time in lieu.</p>
      <Button onClick={() => signIn("credentials")} className="mt-4">Sign In</Button>
    </div>
  );
}