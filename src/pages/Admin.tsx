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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, Users, MessageSquare, Zap, Search, Plus, Minus, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

type AppRole = "student" | "teacher" | "admin";

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, questions, answers, pending] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }),
        supabase.from("answers").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count ?? 0,
        questions: questions.count ?? 0,
        answers: answers.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  // Users with roles
  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, reputation, reviews_completed, created_at")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");

      const roleMap: Record<string, AppRole[]> = {};
      roles?.forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role as AppRole);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap[p.user_id] ?? [],
      }));
    },
  });

  const filtered = allUsers?.filter((u) => {
    const matchesSearch = !search || u.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter as AppRole);
    return matchesSearch && matchesRole;
  }) ?? [];

  const handleRoleChange = async (targetUserId: string, role: AppRole, action: "add" | "remove") => {
    const { error } = await supabase.rpc("manage_user_role", {
      _target_user_id: targetUserId,
      _role: role,
      _action: action,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Role ${action === "add" ? "added" : "removed"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  const roleColors: Record<string, string> = {
    student: "bg-muted text-muted-foreground border-0",
    teacher: "bg-secondary/10 text-secondary border-0",
    admin: "bg-primary/10 text-primary border-0",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-6xl px-4 py-10 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <Users className="mx-auto h-5 w-5 text-primary mb-1" />
              <div className="text-2xl font-bold text-foreground">{stats?.users ?? 0}</div>
              <div className="text-xs text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <MessageSquare className="mx-auto h-5 w-5 text-primary mb-1" />
              <div className="text-2xl font-bold text-foreground">{stats?.questions ?? 0}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <Zap className="mx-auto h-5 w-5 text-secondary mb-1" />
              <div className="text-2xl font-bold text-foreground">{stats?.answers ?? 0}</div>
              <div className="text-xs text-muted-foreground">Answers</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="py-4 text-center">
              <Link to="/review">
                <AlertTriangle className="mx-auto h-5 w-5 text-destructive mb-1" />
                <div className="text-2xl font-bold text-foreground">{stats?.pending ?? 0}</div>
                <div className="text-xs text-muted-foreground">Pending Reviews</div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">User Management</CardTitle>
            <div className="flex gap-3 mt-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted border-border text-foreground"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full mb-3 rounded-lg" />)}

            <div className="space-y-3">
              {filtered.map((u) => (
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
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.roles.map((r: AppRole) => (
                      <Badge key={r} className={roleColors[r]}>
                        {r}
                        {u.user_id !== user?.id && (
                          <button onClick={() => handleRoleChange(u.user_id, r, "remove")} className="ml-1 hover:text-destructive">
                            <Minus className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                    {/* Add role buttons */}
                    {(["student", "teacher", "admin"] as AppRole[])
                      .filter((r) => !u.roles.includes(r))
                      .map((r) => (
                        <Button
                          key={r}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs border-border text-muted-foreground hover:text-foreground"
                          onClick={() => handleRoleChange(u.user_id, r, "add")}
                        >
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
      </div>
      <Footer />
    </div>
  );
}
