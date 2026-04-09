import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { User, MessageSquare, ThumbsUp, Zap, Shield, Star, Edit, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: reputation } = useQuery({
    queryKey: ["reputation", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("reputation").eq("user_id", user!.id).single();
      return data?.reputation ?? 0;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: async () => {
      const [q, a] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("answers").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      return { questions: q.count ?? 0, answers: a.count ?? 0 };
    },
    enabled: !!user,
  });

  const { data: myQuestions } = useQuery({
    queryKey: ["my-questions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("id, title, status, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myAnswers } = useQuery({
    queryKey: ["my-answers", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("answers").select("id, body, upvotes, is_accepted, created_at, questions(id, title)").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: editName.trim() || null, bio: editBio.trim() || null }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated!");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reputation", user.id] });
      // Force auth context refresh
      window.location.reload();
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground flex-1">Please sign in to view your profile.</div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-10 flex-1">
        {/* Profile Header */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-6 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30 shrink-0">
              <span className="text-2xl font-bold text-primary">
                {profile?.display_name ? profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{profile?.display_name ?? "User"}</h1>
                <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (open) { setEditName(profile?.display_name ?? ""); setEditBio(profile?.bio ?? ""); } }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-7 px-2"><Edit className="h-3.5 w-3.5" /></Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle className="text-foreground">Edit Profile</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-foreground">Display Name</label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-muted border-border text-foreground mt-1" />
                      </div>
                      <div>
                        <label className="text-sm text-foreground">Bio</label>
                        <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell us about yourself..." className="bg-muted border-border text-foreground mt-1" rows={3} />
                      </div>
                      <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-primary text-primary-foreground">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-muted-foreground">{user.email}</p>
              {profile?.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
              <div className="mt-2 flex gap-2 flex-wrap">
                {roles.map((r) => (
                  <Badge key={r} className={r === "teacher" ? "bg-secondary/10 text-secondary border-0" : r === "admin" ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                    {r === "teacher" && <Shield className="mr-1 h-3 w-3" />}
                    {r === "admin" && <Zap className="mr-1 h-3 w-3" />}
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{reputation ?? 0}</span>
                      <span className="text-muted-foreground">reputation points</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border-border text-foreground">
                    <p className="text-xs">+5 per question · +10 per answer · +2 per upvote · +15 accepted</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stats?.questions ?? 0}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-foreground">{stats?.answers ?? 0}</div>
              <div className="text-xs text-muted-foreground">Answers</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-primary">{reputation ?? 0}</div>
              <div className="text-xs text-muted-foreground">Reputation</div>
            </CardContent>
          </Card>
          {(hasRole("teacher") || hasRole("admin")) && (
            <Card className="bg-card border-border">
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-secondary">{reviewsCompleted ?? 0}</div>
                <div className="text-xs text-muted-foreground">Reviews</div>
              </CardContent>
            </Card>
          )}
        </div>

        {hasRole("admin") && (
          <div className="mb-8">
            <Link to="/admin">
              <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                <Shield className="mr-2 h-4 w-4" /> Go to Admin Dashboard
              </Button>
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> My Questions</CardTitle>
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

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2"><ThumbsUp className="h-5 w-5 text-secondary" /> My Answers</CardTitle>
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
      <Footer />
    </div>
  );
}
