import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, Users, MessageSquare, Zap, Search, Plus, Minus, AlertTriangle,
  GraduationCap, CheckCircle, X, BarChart3, FileText, Clock, Eye,
  TrendingUp, Activity, Trash2, ExternalLink
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "react-router-dom";
import ReviewStats from "@/components/ReviewStats";

type AppRole = "student" | "teacher" | "admin";

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, questions, answers, pending, resolved, teachers, applications] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("status", "resolved"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("teacher_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0,
        questions: questions.count ?? 0,
        answers: answers.count ?? 0,
        pending: pending.count ?? 0,
        resolved: resolved.count ?? 0,
        teachers: teachers.count ?? 0,
        pendingApps: applications.count ?? 0,
      };
    },
  });

  // Recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const [recentQ, recentA, recentApps] = await Promise.all([
        supabase.from("questions").select("id, title, created_at, user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("answers").select("id, is_ai, status, created_at, question_id, questions(title)").order("created_at", { ascending: false }).limit(5),
        supabase.from("teacher_applications").select("id, status, created_at, user_id").order("created_at", { ascending: false }).limit(5),
      ]);

      const userIds = [
        ...(recentQ.data ?? []).map(q => q.user_id),
        ...(recentApps.data ?? []).map(a => a.user_id),
      ];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", [...new Set(userIds)]);
      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.display_name ?? "User"; });

      const items: { type: string; text: string; time: string; link?: string }[] = [];
      (recentQ.data ?? []).forEach(q => {
        items.push({ type: "question", text: `${nameMap[q.user_id] ?? "User"} asked "${q.title}"`, time: q.created_at, link: `/question/${q.id}` });
      });
      (recentA.data ?? []).forEach(a => {
        const title = (a as any).questions?.title ?? "a question";
        items.push({ type: "answer", text: `${a.is_ai ? "AI" : "User"} answered "${title}"`, time: a.created_at, link: `/question/${a.question_id}` });
      });
      (recentApps.data ?? []).forEach(a => {
        items.push({ type: "application", text: `${nameMap[a.user_id] ?? "User"} applied for teacher (${a.status})`, time: a.created_at });
      });

      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-10 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { icon: Users, label: "Users", value: stats?.users, color: "text-primary" },
            { icon: MessageSquare, label: "Questions", value: stats?.questions, color: "text-primary" },
            { icon: Zap, label: "Answers", value: stats?.answers, color: "text-secondary" },
            { icon: CheckCircle, label: "Resolved", value: stats?.resolved, color: "text-secondary" },
            { icon: GraduationCap, label: "Teachers", value: stats?.teachers, color: "text-amber-400" },
            { icon: AlertTriangle, label: "Pending", value: stats?.pending, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="py-3 text-center">
                <s.icon className={`mx-auto h-4 w-4 ${s.color} mb-1`} />
                <div className="text-xl font-bold text-foreground">{s.value ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BarChart3 className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5 data-[state=active]:bg-secondary/10 data-[state=active]:text-secondary">
              <GraduationCap className="h-3.5 w-3.5" /> Applications
              {(stats?.pendingApps ?? 0) > 0 && (
                <Badge className="ml-1 bg-secondary/20 text-secondary border-0 text-[10px] h-4 px-1">{stats?.pendingApps}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">
              <FileText className="h-3.5 w-3.5" /> Content
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <TrendingUp className="h-3.5 w-3.5" /> Review Stats
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" /> Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!recentActivity && [1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  {recentActivity?.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
                  {recentActivity?.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        item.type === "question" ? "bg-primary" : item.type === "answer" ? "bg-secondary" : "bg-amber-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{item.text}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.time), { addSuffix: true })}</p>
                      </div>
                      {item.link && (
                        <Link to={item.link}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-secondary" /> Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/review">
                    <Button variant="outline" className="w-full justify-start border-border text-foreground hover:border-primary">
                      <Shield className="mr-2 h-4 w-4 text-primary" /> Review AI Answers
                      {(stats?.pending ?? 0) > 0 && (
                        <Badge className="ml-auto bg-destructive/10 text-destructive border-0">{stats?.pending} pending</Badge>
                      )}
                    </Button>
                  </Link>
                  <Link to="/browse">
                    <Button variant="outline" className="w-full justify-start border-border text-foreground hover:border-primary">
                      <MessageSquare className="mr-2 h-4 w-4 text-primary" /> Browse All Questions
                    </Button>
                  </Link>
                  <Link to="/leaderboard">
                    <Button variant="outline" className="w-full justify-start border-border text-foreground hover:border-primary">
                      <TrendingUp className="mr-2 h-4 w-4 text-secondary" /> View Leaderboard
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="applications">
            <TeacherApplicationsPanel queryClient={queryClient} />
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <UserManagementPanel queryClient={queryClient} currentUserId={user?.id} />
          </TabsContent>

          {/* Content */}
          <TabsContent value="content">
            <ContentManagementPanel />
          </TabsContent>

          {/* Review Stats */}
          <TabsContent value="reviews">
            <ReviewStats />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

/* ─── Teacher Applications Panel (full) ─── */
function TeacherApplicationsPanel({ queryClient }: { queryClient: any }) {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [rejectDialogApp, setRejectDialogApp] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["teacher-applications-all", statusFilter],
    queryFn: async () => {
      let q = supabase.from("teacher_applications").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as "pending" | "approved" | "rejected");
      const { data } = await q;
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, reputation, reviews_completed").in("user_id", userIds);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p; });
      const roleMap: Record<string, string[]> = {};
      roles?.forEach(r => { if (!roleMap[r.user_id]) roleMap[r.user_id] = []; roleMap[r.user_id].push(r.role); });
      return data.map(a => ({ ...a, profile: profileMap[a.user_id], roles: roleMap[a.user_id] ?? [] }));
    },
  });

  const handleApprove = async (appId: string, userId: string) => {
    const { error } = await supabase.from("teacher_applications").update({ status: "approved" }).eq("id", appId);
    if (error) { toast.error(error.message); return; }
    const { error: roleError } = await supabase.rpc("manage_user_role", {
      _target_user_id: userId, _role: "teacher" as any, _action: "add",
    });
    if (roleError) toast.error(roleError.message);
    else toast.success("Application approved! User is now a teacher.");
    queryClient.invalidateQueries({ queryKey: ["teacher-applications-all"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const handleReject = async () => {
    if (!rejectDialogApp) return;
    const { error } = await supabase.from("teacher_applications")
      .update({ status: "rejected" })
      .eq("id", rejectDialogApp.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Application rejected.");
    setRejectDialogApp(null);
    setRejectReason("");
    queryClient.invalidateQueries({ queryKey: ["teacher-applications-all"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-primary/10 text-primary",
    approved: "bg-secondary/10 text-secondary",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-secondary" /> Teacher Applications
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-muted border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full mb-3" />)}
          {!isLoading && applications?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No applications found.</p>
          )}
          <div className="space-y-3">
            {applications?.map((app: any) => (
              <div key={app.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-sm font-bold text-secondary shrink-0">
                      {app.profile?.display_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{app.profile?.display_name || "User"}</p>
                        <Badge className={`${statusColors[app.status]} border-0 text-[10px]`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </Badge>
                        {app.roles?.map((r: string) => (
                          <Badge key={r} className="bg-muted text-muted-foreground border-0 text-[10px]">{r}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>⭐ Rep: {app.profile?.reputation ?? 0}</span>
                        <span>📝 Reviews: {app.profile?.reviews_completed ?? 0}</span>
                        <span>📅 {format(new Date(app.created_at), "MMM d, yyyy")}</span>
                      </div>
                      {app.message && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 rounded bg-muted/50 border border-border/50 italic">
                          "{app.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleApprove(app.id, app.user_id)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRejectDialogApp(app); setRejectReason(""); }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectDialogApp} onOpenChange={(open) => { if (!open) setRejectDialogApp(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejecting application from <span className="text-foreground font-medium">{rejectDialogApp?.profile?.display_name ?? "User"}</span>.
            </p>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional, visible to admins only)..."
              className="bg-muted border-border text-foreground"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRejectDialogApp(null)} className="text-muted-foreground">Cancel</Button>
              <Button onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <X className="mr-1 h-4 w-4" /> Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── User Management ─── */
function UserManagementPanel({ queryClient, currentUserId }: { queryClient: any; currentUserId?: string }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, reputation, reviews_completed, created_at")
        .order("created_at", { ascending: false });
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap: Record<string, AppRole[]> = {};
      roles?.forEach(r => { if (!roleMap[r.user_id]) roleMap[r.user_id] = []; roleMap[r.user_id].push(r.role as AppRole); });
      return (profiles ?? []).map(p => ({ ...p, roles: roleMap[p.user_id] ?? [] }));
    },
  });

  const filtered = allUsers?.filter(u => {
    const matchesSearch = !search || u.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter as AppRole);
    return matchesSearch && matchesRole;
  }) ?? [];

  const handleRoleChange = async (targetUserId: string, role: AppRole, action: "add" | "remove") => {
    const { error } = await supabase.rpc("manage_user_role", {
      _target_user_id: targetUserId, _role: role, _action: action,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`Role ${action === "add" ? "added" : "removed"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    }
  };

  const roleColors: Record<string, string> = {
    student: "bg-muted text-muted-foreground border-0",
    teacher: "bg-secondary/10 text-secondary border-0",
    admin: "bg-primary/10 text-primary border-0",
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">User Management</CardTitle>
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-muted border-border text-foreground" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="teacher">Teachers</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} user{filtered.length !== 1 ? "s" : ""} found</p>
      </CardHeader>
      <CardContent>
        {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full mb-3 rounded-lg" />)}
        <div className="space-y-3">
          {filtered.map(u => (
            <div key={u.user_id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                  {u.display_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{u.display_name || "Unnamed"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Rep: {u.reputation}</span>
                    {u.reviews_completed > 0 && <span>· Reviews: {u.reviews_completed}</span>}
                    <span>· Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {u.roles.map((r: AppRole) => (
                  <Badge key={r} className={roleColors[r]}>
                    {r}
                    {u.user_id !== currentUserId && (
                      <button onClick={() => handleRoleChange(u.user_id, r, "remove")} className="ml-1 hover:text-destructive">
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {(["student", "teacher", "admin"] as AppRole[])
                  .filter(r => !u.roles.includes(r))
                  .map(r => (
                    <Button key={r} variant="outline" size="sm"
                      className="h-6 text-xs border-border text-muted-foreground hover:text-foreground"
                      onClick={() => handleRoleChange(u.user_id, r, "add")}>
                      <Plus className="h-3 w-3 mr-1" /> {r}
                    </Button>
                  ))}
              </div>
            </div>
          ))}
        </div>
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No users found.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Content Management ─── */
function ContentManagementPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin-content", statusFilter],
    queryFn: async () => {
      let q = supabase.from("questions")
        .select("id, title, body, status, tags, created_at, user_id, answers(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as "open" | "resolved" | "closed");
      const { data } = await q;
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.display_name ?? "User"; });
      return data.map(d => ({ ...d, display_name: nameMap[d.user_id] ?? "User" }));
    },
  });

  const filtered = questions?.filter(q => !search || q.title.toLowerCase().includes(search.toLowerCase())) ?? [];

  const statusIcon = (s: string) => {
    if (s === "resolved") return <CheckCircle className="h-3 w-3 text-secondary" />;
    if (s === "open") return <Clock className="h-3 w-3 text-primary" />;
    return <X className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-400" /> Content Management
        </CardTitle>
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-muted border-border text-foreground" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} question{filtered.length !== 1 ? "s" : ""}</p>
      </CardHeader>
      <CardContent>
        {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-14 w-full mb-3" />)}
        <div className="space-y-2">
          {filtered.map((q: any) => (
            <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {statusIcon(q.status)}
                  <Link to={`/question/${q.id}`} className="font-medium text-foreground text-sm hover:text-primary transition-colors truncate">
                    {q.title}
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  <span>by {q.display_name}</span>
                  <span>· {q.answers?.length ?? 0} answers</span>
                  <span>· {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}</span>
                  {q.tags?.slice(0, 2).map((t: string) => (
                    <Badge key={t} variant="outline" className="text-[9px] border-border h-4 px-1">{t}</Badge>
                  ))}
                </div>
              </div>
              <Link to={`/question/${q.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No questions found.</p>
        )}
      </CardContent>
    </Card>
  );
}
