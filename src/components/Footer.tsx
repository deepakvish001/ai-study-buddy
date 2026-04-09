import { Link } from "react-router-dom";
import logoImg from "/favicon.png";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="DoubtSolver" className="h-7 w-7 rounded-md" />
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
