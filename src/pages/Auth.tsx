import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import Navbar from "@/components/Navbar";

function getPasswordStrength(pw: string): { label: string; value: number; color: string } {
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

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users away
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
        toast.success("Account created! Check your email to confirm.");
      } else {
        await signIn(email, password);
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error instanceof Error ? result.error.message : "Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Welcome!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl text-foreground">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isSignUp ? "Join the community and get instant answers" : "Sign in to ask doubts and help others"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 border-border text-foreground hover:bg-muted"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Display Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required className="bg-muted border-border text-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-muted border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="bg-muted border-border text-foreground pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {isSignUp && password.length > 0 && (
                  <div className="space-y-1">
                    <Progress value={strength.value} className="h-1.5" />
                    <p className={`text-xs ${strength.value === 100 ? "text-secondary" : strength.value >= 66 ? "text-primary" : "text-destructive"}`}>{strength.label}</p>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline">
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
