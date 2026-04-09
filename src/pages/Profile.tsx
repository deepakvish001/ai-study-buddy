import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MessageSquare, ThumbsUp, Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { user, profile, roles } = useAuth();

  const { data: myQuestions } = useQuery({
    queryKey: ["my-questions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("id, title, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myAnswers } = useQuery({
    queryKey: ["my-answers", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("answers")
        .select("id, body, upvotes, is_accepted, created_at, questions(id, title)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Please sign in to view your profile.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-10">
        {/* Profile Header */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="flex items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{profile?.display_name ?? "User"}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex gap-2">
                {roles.map((r) => (
                  <Badge key={r} className={r === "teacher" ? "bg-secondary/10 text-secondary border-0" : r === "admin" ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                    {r === "teacher" && <Shield className="mr-1 h-3 w-3" />}
                    {r === "admin" && <Zap className="mr-1 h-3 w-3" />}
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* My Questions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> My Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myQuestions?.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
              {myQuestions?.map((q) => (
                <Link key={q.id} to={`/question/${q.id}`} className="block text-sm text-foreground hover:text-primary transition-colors">
                  {q.title}
                  <span className="ml-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* My Answers */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-secondary" /> My Answers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myAnswers?.length === 0 && <p className="text-sm text-muted-foreground">No answers yet.</p>}
              {myAnswers?.map((a: any) => (
                <Link key={a.id} to={`/question/${a.questions?.id}`} className="block text-sm text-foreground hover:text-primary transition-colors">
                  {a.questions?.title}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">↑{a.upvotes}</span>
                    {a.is_accepted && <Badge className="bg-secondary/10 text-secondary border-0 text-xs">Accepted</Badge>}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
