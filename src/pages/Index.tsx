import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap, Clock, Users, CheckCircle, Search, ArrowRight, MessageSquare,
  Brain, Shield, Calculator, Atom, FlaskConical, Leaf, Monitor, BookOpen,
  Landmark, TrendingUp, User, Sparkles, GraduationCap, Star
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CATEGORY_CONFIG: { name: string; icon: React.ElementType; color: string; bg: string; border: string; gradient: string }[] = [
  { name: "Mathematics",      icon: Calculator,   color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    gradient: "from-blue-500/20 to-blue-600/5" },
  { name: "Physics",          icon: Atom,          color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20",  gradient: "from-purple-500/20 to-purple-600/5" },
  { name: "Chemistry",        icon: FlaskConical,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", gradient: "from-emerald-500/20 to-emerald-600/5" },
  { name: "Biology",          icon: Leaf,          color: "text-green-400",   bg: "bg-green-500/10",   border: "border-green-500/20",   gradient: "from-green-500/20 to-green-600/5" },
  { name: "Computer Science", icon: Monitor,       color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    gradient: "from-cyan-500/20 to-cyan-600/5" },
  { name: "English",          icon: BookOpen,      color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   gradient: "from-amber-500/20 to-amber-600/5" },
  { name: "History",          icon: Landmark,      color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  gradient: "from-orange-500/20 to-orange-600/5" },
  { name: "Economics",        icon: TrendingUp,    color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    gradient: "from-rose-500/20 to-rose-600/5" },
];

const TAG_MAP = Object.fromEntries(CATEGORY_CONFIG.map(c => [c.name, c]));

function AnimatedCounter({ target, suffix }: { target: number | string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (typeof target !== "number" || animated.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const duration = 1200;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  if (typeof target === "string") return <div ref={ref}>{target}</div>;
  return <div ref={ref}>{count}{suffix}</div>;
}

function TagBadge({ tag }: { tag: string }) {
  const config = TAG_MAP[tag];
  if (!config) return <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{tag}</Badge>;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${config.bg} ${config.border} ${config.color}`}>
      <Icon className="h-2.5 w-2.5" /> {tag}
    </span>
  );
}

export default function Index() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [q, a, u] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }).eq("is_ai", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { questions: q.count ?? 0, aiAnswers: a.count ?? 0, users: u.count ?? 0 };
    },
  });

  const { data: recentQuestions, isLoading: recentLoading } = useQuery({
    queryKey: ["recent-questions"],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from("questions")
        .select("id, title, body, tags, status, created_at, user_id, answers(id)")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!questions?.length) return [];
      const userIds = [...new Set(questions.map((q) => q.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]));
      return questions.map((q) => ({ ...q, display_name: profileMap[q.user_id] ?? "Anonymous" }));
    },
  });

  const { data: categoryCounts } = useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      const { data } = await supabase.from("questions").select("tags");
      (data ?? []).forEach((q) => {
        (q.tags ?? []).forEach((t: string) => { counts[t] = (counts[t] ?? 0) + 1; });
      });
      return counts;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/browse?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-1/4 w-56 h-56 bg-secondary/5 rounded-full blur-[80px]" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 gap-1.5 px-3 py-1">
            <Sparkles className="h-3 w-3" /> AI-Powered Answers in Seconds
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            What's your <span className="text-primary">doubt</span>?
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Ask any academic question and get instant, AI-generated answers with sources. Verified by real teachers.
          </p>

          <form onSubmit={handleSearch} className="mx-auto flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search doubts or ask a new one..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
              <Search className="h-4 w-4" /> Search
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/ask" className="flex items-center gap-1.5 text-primary hover:underline font-medium">
              <Zap className="h-3.5 w-3.5" /> Ask a new question <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/30 py-10">
        <div className="container mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 px-4 text-center">
          {statsLoading ? (
            [1,2,3,4].map(i => <div key={i}><Skeleton className="h-9 w-16 mx-auto mb-1" /><Skeleton className="h-4 w-24 mx-auto" /></div>)
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-foreground"><AnimatedCounter target={stats?.questions ?? 0} /></div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1"><MessageSquare className="h-3 w-3" /> Questions Asked</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-primary"><AnimatedCounter target={stats?.aiAnswers ?? 0} /></div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1"><Zap className="h-3 w-3" /> AI Answers</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-secondary"><AnimatedCounter target={stats?.users ?? 0} /></div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Active Users</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{"< 10s"}</div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Avg Response</div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-3 bg-muted/50 text-muted-foreground border-border hover:bg-muted/50 gap-1">
              <GraduationCap className="h-3 w-3" /> Simple Process
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How it Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: MessageSquare, title: "Ask Your Doubt", desc: "Post your academic question with details, images, or code snippets", step: "01", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
              { icon: Brain, title: "AI Generates Answer", desc: "Our AI instantly analyzes and provides a detailed, step-by-step answer", step: "02", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20" },
              { icon: Shield, title: "Teacher Verifies", desc: "Real teachers review AI answers for accuracy and add expert insights", step: "03", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            ].map((s) => (
              <Card key={s.step} className="bg-card/60 border-border/50 hover:border-primary/20 transition-all group">
                <CardContent className="p-6 text-center">
                  <div className="text-[10px] font-bold text-muted-foreground/40 mb-3 tracking-widest">STEP {s.step}</div>
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${s.bg} border ${s.border} group-hover:scale-110 transition-transform`}>
                    <s.icon className={`h-7 w-7 ${s.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-16 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge className="mb-3 bg-muted/50 text-muted-foreground border-border hover:bg-muted/50 gap-1">
                <Star className="h-3 w-3" /> Explore
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Browse by Category</h2>
            </div>
            <Link to="/browse">
              <Button variant="ghost" className="text-primary hover:text-primary/80 gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORY_CONFIG.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts?.[cat.name] ?? 0;
              return (
                <Link key={cat.name} to={`/browse?tag=${encodeURIComponent(cat.name)}`}>
                  <Card className={`bg-gradient-to-br ${cat.gradient} border-border/50 hover:${cat.border} transition-all hover:shadow-lg hover:scale-[1.02] group cursor-pointer`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${cat.bg} border ${cat.border} group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-5 w-5 ${cat.color}`} />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm mb-1">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">{count} question{count !== 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured / Recent Questions */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 gap-1">
                <Zap className="h-3 w-3" /> Latest
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Recent Questions</h2>
            </div>
            <Link to="/browse">
              <Button variant="ghost" className="text-primary hover:text-primary/80 gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {recentLoading && [1,2,3,4].map(i => (
              <Card key={i} className="bg-card/60 border-border/50">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-4" />
                  <div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div>
                </CardContent>
              </Card>
            ))}
            {!recentLoading && recentQuestions?.length === 0 && (
              <Card className="bg-card/60 border-border/50 sm:col-span-2">
                <CardContent className="py-12 text-center text-muted-foreground">No questions yet. Be the first to ask!</CardContent>
              </Card>
            )}
            {!recentLoading && recentQuestions?.map((q: any) => {
              const answerCount = q.answers?.length ?? 0;
              const isResolved = q.status === "resolved";
              return (
                <Link key={q.id} to={`/question/${q.id}`} className="block group">
                  <Card className={`h-full border-border/50 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${isResolved ? "bg-secondary/[0.03]" : "bg-card/60"}`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        {/* Answer count pill */}
                        <div className={`hidden sm:flex flex-col items-center rounded-lg px-2.5 py-1.5 min-w-[48px] ${answerCount > 0 ? (isResolved ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary") : "bg-muted/50 text-muted-foreground"}`}>
                          <MessageSquare className="h-3.5 w-3.5 mb-0.5" />
                          <span className="text-xs font-bold">{answerCount}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm flex-1">{q.title}</h3>
                            {isResolved && (
                              <Badge className="bg-secondary/10 text-secondary border-0 shrink-0 text-[10px] gap-0.5">
                                <CheckCircle className="h-2.5 w-2.5" /> Solved
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{q.body}</p>

                          <div className="flex items-center gap-2 flex-wrap">
                            {q.tags?.slice(0, 2).map((t: string) => <TagBadge key={t} tag={t} />)}
                            {q.tags?.length > 2 && <span className="text-[10px] text-muted-foreground">+{q.tags.length - 2}</span>}
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground ml-auto">
                              <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{q.display_name}</span>
                              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
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
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-br from-primary/10 via-card to-secondary/5 border-primary/20">
            <CardContent className="py-12 text-center">
              <GraduationCap className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h2 className="text-2xl font-bold text-foreground mb-3">Ready to solve your doubts?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">Join thousands of students getting instant AI-powered answers verified by expert teachers.</p>
              <div className="flex items-center justify-center gap-3">
                <Link to="/ask">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                    <Zap className="h-4 w-4" /> Ask a Question
                  </Button>
                </Link>
                <Link to="/browse">
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:border-primary hover:text-primary gap-1.5">
                    <Search className="h-4 w-4" /> Browse Questions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
