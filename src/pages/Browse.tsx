import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, MessageSquare, Clock, ArrowDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ALL_TAGS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History", "Economics"];
const PAGE_SIZE = 20;

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const activeTag = searchParams.get("tag");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);

  // Debounce search
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

      const { data, count } = await query;
      if (!data?.length) return { questions: [], profiles: {} };

      const userIds = [...new Set(data.map(q => q.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.display_name]));

      // Client-side sort for "unanswered"
      let sorted = data;
      if (sort === "unanswered") sorted = data.filter(q => !q.answers?.length).concat(data.filter(q => q.answers?.length));

      return { questions: sorted, profiles: profileMap };
    },
  });

  const questions = results?.questions ?? [];
  const profileMap = results?.profiles ?? {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-10 flex-1">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Browse Questions</h1>

        <div className="mb-6 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions..." className="pl-10 bg-card border-border text-foreground" />
          </div>
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-40 bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="unanswered">Unanswered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant={!activeTag ? "default" : "outline"} size="sm" onClick={() => setSearchParams(search ? { q: search } : {})} className={!activeTag ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}>All</Button>
          {ALL_TAGS.map((tag) => (
            <Button key={tag} variant={activeTag === tag ? "default" : "outline"} size="sm" onClick={() => { setSearchParams({ ...(search ? { q: search } : {}), tag }); setPage(0); }} className={activeTag === tag ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}>{tag}</Button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && [1,2,3,4].map(i => (
            <div key={i} className="glass-card p-5">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
          {!isLoading && questions.length === 0 && (
            <div className="glass-card p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-muted-foreground">No questions found. Try a different search or tag.</p>
            </div>
          )}
          {!isLoading && questions.map((q: any) => (
            <Link key={q.id} to={`/question/${q.id}`} className="block">
              <div className="glass-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1 truncate">{q.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{q.body}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {q.tags?.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-xs border-border text-muted-foreground">{t}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">by {profileMap[q.user_id] ?? "Anonymous"}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {q.answers?.length ?? 0}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {q.status === "resolved" && <CheckCircle className="h-5 w-5 text-secondary shrink-0 ml-3" />}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {!isLoading && questions.length > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border-border text-muted-foreground">Previous</Button>
            <span className="flex items-center text-sm text-muted-foreground px-3">Page {page + 1}</span>
            <Button variant="outline" size="sm" disabled={questions.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)} className="border-border text-muted-foreground">Next</Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
