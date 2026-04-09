import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, CheckCircle, MessageSquare, Clock, User, Zap, ThumbsUp,
  Calculator, Atom, FlaskConical, Leaf, Monitor, BookOpen, Landmark, TrendingUp,
  HelpCircle, Filter, ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TAG_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  Mathematics:        { icon: Calculator,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  Physics:            { icon: Atom,          color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
  Chemistry:          { icon: FlaskConical,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  Biology:            { icon: Leaf,          color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/20" },
  "Computer Science": { icon: Monitor,       color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  English:            { icon: BookOpen,      color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  History:            { icon: Landmark,      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  Economics:          { icon: TrendingUp,    color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
};

const ALL_TAGS = Object.keys(TAG_CONFIG);
const PAGE_SIZE = 20;

function TagBadge({ tag, size = "sm" }: { tag: string; size?: "sm" | "md" }) {
  const config = TAG_CONFIG[tag] ?? { icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${config.bg} ${config.border} ${config.color} ${size === "md" ? "text-xs px-2.5 py-1" : "text-[10px]"}`}>
      <Icon className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"} />
      {tag}
    </span>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const activeTag = searchParams.get("tag");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
      const params: Record<string, string> = {};
      if (search) params.q = search;
      if (activeTag) params.tag = activeTag;
      setSearchParams(params);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: results, isLoading } = useQuery({
    queryKey: ["browse", debouncedSearch, activeTag, sort, page],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("id, title, body, tags, status, created_at, user_id, answers(id)")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (debouncedSearch) query = query.ilike("title", `%${debouncedSearch}%`);
      if (activeTag) query = query.contains("tags", [activeTag]);

      if (sort === "newest") query = query.order("created_at", { ascending: false });
      else if (sort === "oldest") query = query.order("created_at", { ascending: true });

      const { data } = await query;
      if (!data?.length) return { questions: [], profiles: {} };

      const userIds = [...new Set(data.map(q => q.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.display_name]));

      let sorted = data;
      if (sort === "unanswered") sorted = data.filter(q => !q.answers?.length).concat(data.filter(q => q.answers?.length));

      return { questions: sorted, profiles: profileMap };
    },
  });

  const questions = results?.questions ?? [];
  const profileMap = results?.profiles ?? {};

  const totalShown = page * PAGE_SIZE + questions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-6 sm:py-10 flex-1 max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Browse Questions</h1>
              <p className="text-sm text-muted-foreground">Find answers to your doubts or help others</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Card className="bg-card/60 border-border/50 mb-6 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions by title..."
                  className="pl-10 bg-background/50 border-border text-foreground h-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sort} onValueChange={(v) => { setSort(v); setPage(0); }}>
                  <SelectTrigger className="w-full sm:w-44 bg-background/50 border-border text-foreground h-10">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="unanswered">Unanswered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSearchParams(search ? { q: search } : {})}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              !activeTag
                ? "bg-primary/15 border-primary/30 text-primary shadow-sm shadow-primary/10"
                : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
            }`}
          >
            <Zap className="h-3 w-3" /> All Topics
          </button>
          {ALL_TAGS.map((tag) => {
            const config = TAG_CONFIG[tag];
            const Icon = config.icon;
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => { setSearchParams({ ...(search ? { q: search } : {}), tag }); setPage(0); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? `${config.bg} ${config.border} ${config.color} shadow-sm`
                    : `bg-muted/30 border-border text-muted-foreground hover:${config.border} hover:${config.color}`
                }`}
              >
                <Icon className="h-3 w-3" /> {tag}
              </button>
            );
          })}
        </div>

        {/* Results Info */}
        {!isLoading && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {questions.length > 0
                ? `Showing ${page * PAGE_SIZE + 1}–${totalShown} questions${activeTag ? ` in ${activeTag}` : ""}${debouncedSearch ? ` matching "${debouncedSearch}"` : ""}`
                : "No questions found"
              }
            </p>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-3">
          {isLoading && [1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="bg-card/60 border-border/50">
              <CardContent className="p-5">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}

          {!isLoading && questions.length === 0 && (
            <Card className="bg-card/60 border-border/50">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">No questions found</p>
                <p className="text-sm text-muted-foreground/70">Try a different search term or browse another topic</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && questions.map((q: any) => {
            const answerCount = q.answers?.length ?? 0;
            const isResolved = q.status === "resolved";
            return (
              <Link key={q.id} to={`/question/${q.id}`} className="block group">
                <Card className={`border-border/50 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${isResolved ? "bg-secondary/[0.03]" : "bg-card/60"}`}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex gap-4">
                      {/* Stats column */}
                      <div className="hidden sm:flex flex-col items-center gap-2 min-w-[60px]">
                        <div className={`flex flex-col items-center rounded-lg px-3 py-2 ${answerCount > 0 ? (isResolved ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary") : "bg-muted/50 text-muted-foreground"}`}>
                          <MessageSquare className="h-4 w-4 mb-0.5" />
                          <span className="text-sm font-semibold">{answerCount}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-70">
                            {answerCount === 1 ? "answer" : "answers"}
                          </span>
                        </div>
                        {isResolved && (
                          <div className="flex items-center gap-1 text-secondary">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1.5">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1">
                            {q.title}
                          </h3>
                          {isResolved && (
                            <Badge className="bg-secondary/10 text-secondary border-0 shrink-0 text-[10px] gap-1">
                              <CheckCircle className="h-2.5 w-2.5" /> Solved
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{q.body}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Tags with colors */}
                          {q.tags?.slice(0, 3).map((t: string) => (
                            <TagBadge key={t} tag={t} />
                          ))}
                          {q.tags?.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{q.tags.length - 3} more</span>
                          )}

                          <span className="hidden sm:inline text-border">•</span>

                          {/* Meta info */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto sm:ml-0">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {profileMap[q.user_id] ?? "Anonymous"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                            </span>
                            {/* Mobile answer count */}
                            <span className="flex items-center gap-1 sm:hidden">
                              <MessageSquare className="h-3 w-3" />
                              {answerCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {!isLoading && questions.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="border-border text-muted-foreground gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm font-medium text-foreground">{page + 1}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={questions.length < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)}
              className="border-border text-muted-foreground gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
