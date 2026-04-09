import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, Shield, TrendingUp, MessageSquare, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function Leaderboard() {
  // Top users by reputation
  const { data: topUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, reputation, reviews_completed")
        .order("reputation", { ascending: false })
        .limit(20);
      // Get roles for these users
      const userIds = data?.map((p) => p.user_id) ?? [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      const roleMap: Record<string, string[]> = {};
      roles?.forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      return (data ?? []).map((p) => ({ ...p, roles: roleMap[p.user_id] ?? [] }));
    },
  });

  // Top teachers by reviews completed
  const { data: topTeachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["leaderboard-teachers"],
    queryFn: async () => {
      const { data: teacherRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["teacher", "admin"]);
      const teacherIds = teacherRoles?.map((r) => r.user_id) ?? [];
      if (teacherIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, reputation, reviews_completed")
        .in("user_id", teacherIds)
        .order("reviews_completed", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Trending questions (most answers + votes, recent)
  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ["leaderboard-trending"],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from("questions")
        .select("id, title, tags, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!questions?.length) return [];
      const qIds = questions.map((q) => q.id);
      const { data: answers } = await supabase
        .from("answers")
        .select("question_id, upvotes")
        .in("question_id", qIds);
      // Score = answer count + total upvotes
      const scoreMap: Record<string, { answerCount: number; totalUpvotes: number }> = {};
      answers?.forEach((a) => {
        if (!scoreMap[a.question_id]) scoreMap[a.question_id] = { answerCount: 0, totalUpvotes: 0 };
        scoreMap[a.question_id].answerCount++;
        scoreMap[a.question_id].totalUpvotes += a.upvotes;
      });
      // Get author names
      const authorIds = [...new Set(questions.map((q) => q.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => { nameMap[p.user_id] = p.display_name ?? "User"; });

      return questions
        .map((q) => ({
          ...q,
          author: nameMap[q.user_id] ?? "User",
          answerCount: scoreMap[q.id]?.answerCount ?? 0,
          totalUpvotes: scoreMap[q.id]?.totalUpvotes ?? 0,
          score: (scoreMap[q.id]?.answerCount ?? 0) * 2 + (scoreMap[q.id]?.totalUpvotes ?? 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    },
  });

  const medalColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  const initials = (name: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-10 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Users by Reputation */}
          <Card className="bg-card border-border lg:row-span-2">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Top Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers && [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full mb-3 rounded-lg" />)}
              <div className="space-y-2">
                {topUsers?.map((u, i) => (
                  <div key={u.user_id} className={`flex items-center gap-3 p-3 rounded-lg ${i < 3 ? "bg-primary/5 border border-primary/10" : "bg-muted/30"}`}>
                    <span className={`text-lg font-bold w-7 text-center ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                      {initials(u.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{u.display_name || "User"}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.roles.includes("teacher") && (
                          <Badge className="bg-secondary/10 text-secondary border-0 text-[10px] px-1.5 py-0">
                            <Shield className="mr-0.5 h-2.5 w-2.5" /> Teacher
                          </Badge>
                        )}
                        {u.roles.includes("admin") && (
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">Admin</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-primary">{u.reputation}</span>
                      <span className="text-xs text-muted-foreground ml-1">pts</span>
                    </div>
                  </div>
                ))}
              </div>
              {!loadingUsers && (!topUsers || topUsers.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No users yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Most Helpful Teachers */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-secondary" /> Most Helpful Teachers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTeachers && [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full mb-3 rounded-lg" />)}
              <div className="space-y-2">
                {topTeachers?.map((t, i) => (
                  <div key={t.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <span className={`text-lg font-bold w-7 text-center ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/10 text-xs font-bold text-secondary shrink-0">
                      {initials(t.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{t.display_name || "Teacher"}</p>
                      <p className="text-xs text-muted-foreground">{t.reputation} rep</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-secondary">{t.reviews_completed}</span>
                      <span className="text-xs text-muted-foreground ml-1">reviews</span>
                    </div>
                  </div>
                ))}
              </div>
              {!loadingTeachers && (!topTeachers || topTeachers.length === 0) && (
                <p className="text-center text-muted-foreground py-6 text-sm">No teachers yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Trending Questions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Trending Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTrending && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full mb-3 rounded-lg" />)}
              <div className="space-y-2">
                {trending?.map((q, i) => (
                  <Link key={q.id} to={`/question/${q.id}`} className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`text-lg font-bold w-7 text-center shrink-0 ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm line-clamp-1">{q.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {q.answerCount}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {q.totalUpvotes}</span>
                          <span>by {q.author}</span>
                          <span>{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                        </div>
                        {q.tags && q.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {q.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {!loadingTrending && (!trending || trending.length === 0) && (
                <p className="text-center text-muted-foreground py-6 text-sm">No questions yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
