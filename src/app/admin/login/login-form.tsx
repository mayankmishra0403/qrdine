"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loginWithEmail, loginWithPin } from "@/lib/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"email" | "pin">("email");
  const [pin, setPin] = useState(["", "", "", ""]);

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const result = await loginWithEmail(email, password);
    if (!result.success) {
      setError(result.error || "Login failed");
      setLoading(false);
      return;
    }
    redirectByRole(result.role);
  }

  function handlePinDigit(val: string, idx: number) {
    const newPin = [...pin];
    newPin[idx] = val.slice(-1);
    setPin(newPin);
    if (val && idx < 3) {
      const next = document.getElementById(`pin-${idx + 1}`);
      next?.focus();
    }
  }

  function handlePinKey(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      const prev = document.getElementById(`pin-${idx - 1}`);
      prev?.focus();
    }
  }

  async function handlePinSubmit() {
    const code = pin.join("");
    if (code.length !== 4) {
      setError("Enter a 4-digit PIN");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await loginWithPin(code);
    if (!result.success) {
      setError(result.error || "Invalid PIN");
      setPin(["", "", "", ""]);
      setLoading(false);
      document.getElementById("pin-0")?.focus();
      return;
    }
    redirectByRole(result.role);
  }

  function redirectByRole(role?: string) {
    let path = "/admin";
    if (role === "kitchen") path = "/kitchen";
    else if (role === "cashier") path = "/admin/pos";
    else if (role === "waiter") path = "/waiter-app";
    window.location.href = path;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${mode === "email" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Email Login
        </button>
        <button
          type="button"
          onClick={() => setMode("pin")}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${mode === "pin" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          PIN Quick Login
        </button>
      </div>

      {mode === "email" ? (
        <form onSubmit={handleEmailSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sign In</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PIN Login</CardTitle>
            <p className="text-xs text-muted-foreground">For cashiers and kitchen staff</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-3">
              {pin.map((digit, i) => (
                <Input
                  key={i}
                  id={`pin-${i}`}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinDigit(e.target.value, i)}
                  onKeyDown={(e) => handlePinKey(e, i)}
                  className="w-12 h-14 text-center text-lg font-bold"
                  autoFocus={i === 0}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              ))}
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handlePinSubmit} disabled={loading || pin.join("").length !== 4}>
              {loading ? "Verifying..." : "Login with PIN"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
