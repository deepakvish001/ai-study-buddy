import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">DoubtSolver</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/browse" className="hover:text-primary transition-colors">Browse</Link>
            <Link to="/ask" className="hover:text-primary transition-colors">Ask</Link>
            <Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} DoubtSolver. AI-powered learning.</p>
        </div>
      </div>
    </footer>
  );
}
