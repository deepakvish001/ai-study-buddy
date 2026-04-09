import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ALL_TAGS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History", "Economics"];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeTag = searchParams.get("tag");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["browse", search, activeTag],
    queryFn: async () => {
      let query = supabase
        .from("questions")
        .select("id, title, body, tags, status, created_at, user_id, answers(id)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (search) query = query.ilike("title", `%${search}%`);
      if (activeTag) query = query.contains("tags", [activeTag]);

      const { data } = await query;
      return data ?? [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(search ? { q: search } : {});
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Browse Questions</h1>

        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
          <Button type="submit" className="bg-primary text-primary-foreground">Search</Button>
        </form>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={!activeTag ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchParams(search ? { q: search } : {})}
            className={!activeTag ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}
          >
            All
          </Button>
          {ALL_TAGS.map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ ...(search ? { q: search } : {}), tag })}
              className={activeTag === tag ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}
            >
              {tag}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && <div className="text-center py-10 text-muted-foreground">Loading...</div>}
          {!isLoading && questions?.length === 0 && (
            <div className="glass-card p-10 text-center text-muted-foreground">
              No questions found. Try a different search or tag.
            </div>
          )}
          {questions?.map((q: any) => (
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
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {q.answers?.length ?? 0} answers
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {q.status === "resolved" && (
                    <CheckCircle className="h-5 w-5 text-secondary shrink-0 ml-3" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
