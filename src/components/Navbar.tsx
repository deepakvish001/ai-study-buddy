import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Zap, LogOut, BookOpen, Shield, Menu, Settings, Trophy } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, profile, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isTeacher = hasRole("teacher") || hasRole("admin");
  const isAdmin = hasRole("admin");

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("is_ai", true);
      return count ?? 0;
    },
    enabled: isTeacher,
    refetchInterval: 30000,
  });

  const close = () => setOpen(false);
  const isActive = (path: string) => location.pathname === path;

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const activeClass = "text-primary";
  const inactiveClass = "text-muted-foreground hover:text-foreground";

  const navLinks = (
    <>
      <Link to="/browse" onClick={close}>
        <Button variant="ghost" size="sm" className={`w-full justify-start ${isActive("/browse") ? activeClass : inactiveClass}`}>
          <BookOpen className="mr-2 h-4 w-4" /> Browse
        </Button>
      </Link>
      <Link to="/leaderboard" onClick={close}>
        <Button variant="ghost" size="sm" className={`w-full justify-start ${isActive("/leaderboard") ? activeClass : inactiveClass}`}>
          <Trophy className="mr-2 h-4 w-4" /> Leaderboard
        </Button>
      </Link>

      {user && (
        <>
          <Link to="/ask" onClick={close}>
            <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Ask a Doubt
            </Button>
          </Link>
          {isTeacher && (
            <Link to="/review" onClick={close}>
              <Button variant="ghost" size="sm" className={`w-full justify-start ${isActive("/review") ? activeClass : inactiveClass}`}>
                <Shield className="mr-2 h-4 w-4" /> Review
                {(pendingCount ?? 0) > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                    {pendingCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={close}>
              <Button variant="ghost" size="sm" className={`w-full justify-start ${isActive("/admin") ? activeClass : inactiveClass}`}>
                <Settings className="mr-2 h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          <NotificationBell />
          <Link to="/profile" onClick={close}>
            <Button variant="ghost" size="sm" className={`w-full justify-start ${isActive("/profile") ? activeClass : inactiveClass}`}>
              <div className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">{initials}</div>
              Profile
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className={`w-full justify-start ${inactiveClass}`} onClick={() => { close(); signOut().then(() => navigate("/")); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </>
      )}

      {!user && (
        <Link to="/auth" onClick={close}>
          <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Sign In</Button>
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">DoubtSolver</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/browse">
            <Button variant="ghost" size="sm" className={isActive("/browse") ? activeClass : inactiveClass}>
              <BookOpen className="mr-1 h-4 w-4" /> Browse
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm" className={isActive("/leaderboard") ? activeClass : inactiveClass}>
              <Trophy className="mr-1 h-4 w-4" /> Leaderboard
            </Button>
          </Link>
          {user && (
            <>
              <Link to="/ask">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Ask a Doubt</Button>
              </Link>
              {isTeacher && (
                <Link to="/review">
                  <Button variant="ghost" size="sm" className={`relative ${isActive("/review") ? activeClass : inactiveClass}`}>
                    <Shield className="mr-1 h-4 w-4" /> Review
                    {(pendingCount ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-0.5">
                        {pendingCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className={isActive("/admin") ? activeClass : inactiveClass}>
                    <Settings className="mr-1 h-4 w-4" /> Admin
                  </Button>
                </Link>
              )}
              <NotificationBell />
              <Link to="/profile">
                <Button variant="ghost" size="icon" className={isActive("/profile") ? activeClass : inactiveClass}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{initials}</div>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut().then(() => navigate("/"))} className={inactiveClass}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          {!user && (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Sign In</Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-background border-border">
              <div className="flex flex-col gap-2 mt-8">{navLinks}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
