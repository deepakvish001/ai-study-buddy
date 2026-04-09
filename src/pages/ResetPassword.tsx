import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

function getPasswordStrength(pw: string) {
  if (pw.length < 6) return { label: "Too short", value: 15, color: "bg-destructive" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", value: 33, color: "bg-destructive" };
  if (score <= 2) return { label: "Medium", value: 66, color: "bg-primary" };
  return { label: "Strong", value: 100, color: "bg-secondary" };
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Check for recovery session
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      // No recovery token — redirect
      toast.error("Invalid or expired reset link.");
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
    setLoading(false);
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <img src="/favicon.png" alt="DoubtSolver" className="mx-auto mb-4 h-12 w-12 rounded-xl" />
            <CardTitle className="text-2xl text-foreground">
              {success ? "Password Updated!" : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {success ? "You can now sign in with your new password." : "Enter your new password below."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="h-12 w-12 text-secondary" />
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-muted border-border text-foreground pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <Progress value={strength.value} className="h-1.5" />
                      <p className={`text-xs ${strength.value === 100 ? "text-secondary" : strength.value >= 66 ? "text-primary" : "text-destructive"}`}>{strength.label}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-foreground">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-muted border-border text-foreground"
                  />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
