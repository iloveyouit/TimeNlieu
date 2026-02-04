"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Landing() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError =
    touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Enter a valid email address."
      : null;
  const passwordError =
    touched.password && password.trim().length < 6
      ? "Password must be at least 6 characters."
      : null;
  const isFormInvalid =
    !email ||
    !password ||
    Boolean(emailError) ||
    Boolean(passwordError);

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    if (isFormInvalid) {
      setSubmitting(false);
      return;
    }
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }
    router.replace("/dashboard");
  };

  if (status === "loading") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">TimeNlieu</h1>
      <p className="text-lg text-muted-foreground">Track your timesheet entries and manage your time in lieu.</p>
      <form onSubmit={handleSubmit} className="mt-6 w-full max-w-sm space-y-4">
        <Input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          aria-invalid={Boolean(emailError) || undefined}
          required
        />
        {emailError ? <p className="text-sm text-destructive">{emailError}</p> : null}
        <Input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          aria-invalid={Boolean(passwordError) || undefined}
          required
        />
        {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={submitting || isFormInvalid}>
          {submitting ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
