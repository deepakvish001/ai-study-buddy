import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Users, CheckCircle, Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const POPULAR_TAGS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History", "Economics"];

export default function Index() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [q, a] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }).eq("is_ai", true),
      ]);
      return { questions: q.count ?? 0, aiAnswers: a.count ?? 0 };
    },
  });

  const { data: recentQuestions } = useQuery({
    queryKey: ["recent-questions"],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from("questions")
        .select("id, title, tags, status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!questions?.length) return [];
      const userIds = [...new Set(questions.map((q) => q.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]));
      return questions.map((q) => ({ ...q, display_name: profileMap[q.user_id] ?? "Anonymous" }));
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/browse?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            <Zap className="mr-1 h-3 w-3" /> AI-Powered Answers in Seconds
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            What's your <span className="text-primary">doubt</span>?
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Ask any academic question and get instant, AI-generated answers with sources.
            Verified by real teachers.
          </p>

          <form onSubmit={handleSearch} className="mx-auto flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search doubts or ask a new one..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-primary text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/ask" className="flex items-center gap-1 text-primary hover:underline">
              Or ask a new question <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/30 py-8">
        <div className="container mx-auto grid grid-cols-3 gap-8 px-4 text-center">
          <div>
            <div className="text-3xl font-bold text-foreground">{stats?.questions ?? 0}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" /> Questions Asked
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">{stats?.aiAnswers ?? 0}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Zap className="h-3 w-3" /> AI Answers
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-secondary">{"< 10s"}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> Avg Response
            </div>
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-2xl font-bold text-foreground">Popular Topics</h2>
          <div className="flex flex-wrap gap-3">
            {POPULAR_TAGS.map((tag) => (
              <Link key={tag} to={`/browse?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="outline" className="cursor-pointer px-4 py-2 text-sm border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Questions */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">Recent Questions</h2>
            <Link to="/browse">
              <Button variant="ghost" className="text-primary hover:text-primary/80">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuestions?.length === 0 && (
              <div className="glass-card p-8 text-center text-muted-foreground">
                No questions yet. Be the first to ask!
              </div>
            )}
            {recentQuestions?.map((q: any) => (
              <Link key={q.id} to={`/question/${q.id}`} className="block">
                <div className="glass-card p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground hover:text-primary transition-colors">{q.title}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        {q.tags?.map((t: string) => (
                          <Badge key={t} variant="outline" className="text-xs border-border text-muted-foreground">{t}</Badge>
                        ))}
                        <span className="text-xs text-muted-foreground">by {q.display_name}</span>
                      </div>
                    </div>
                    {q.status === "resolved" && (
                      <CheckCircle className="h-5 w-5 text-secondary shrink-0" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
