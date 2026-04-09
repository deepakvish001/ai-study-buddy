import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Zap, LogOut, User, BookOpen, Shield } from "lucide-react";

export default function Navbar() {
  const { user, profile, hasRole, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">DoubtSolver</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/browse">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <BookOpen className="mr-1 h-4 w-4" /> Browse
            </Button>
          </Link>

          {user && (
            <>
              <Link to="/ask">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Ask a Doubt
                </Button>
              </Link>
              {(hasRole("teacher") || hasRole("admin")) && (
                <Link to="/review">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Shield className="mr-1 h-4 w-4" /> Review
                  </Button>
                </Link>
              )}
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut().then(() => navigate("/"))} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}

          {!user && (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
