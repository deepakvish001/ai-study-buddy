import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Zap, CheckCircle, X, Edit, ArrowUpDown, Clock, User, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ReviewStats from "@/components/ReviewStats";
import { formatDistanceToNow, format } from "date-fns";

export default function TeacherReview() {
  const { hasRole, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("pending");

  if (!hasRole("teacher") && !hasRole("admin")) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground flex-1">Only teachers and admins can access this page.</div>
        <Footer />
      </div>
    );
  }

  // Fetch all AI answers (not just pending)
  const { data: allAnswers, isLoading } = useQuery({
    queryKey: ["review-answers", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("answers")
        .select("*, questions(id, title, body)")
        .eq("is_ai", true);

      if (activeTab !== "all") {
        query = query.eq("status", activeTab as "pending" | "approved" | "rejected");
      }

      const { data } = await query.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Fetch reviewer profiles for approved/rejected answers
  const reviewerIds = [...new Set((allAnswers ?? []).map(a => (a as any).reviewed_by).filter(Boolean))];
  const { data: reviewerProfiles } = useQuery({
    queryKey: ["reviewer-profiles", reviewerIds],
    queryFn: async () => {
      if (reviewerIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", reviewerIds);
      const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      data?.forEach(p => { map[p.user_id] = p; });
      return map;
    },
    enabled: reviewerIds.length > 0,
  });

  const confidenceOrder: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const filtered = (allAnswers?.filter(a => filter === "all" || a.confidence === filter) ?? []).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return (confidenceOrder[a.confidence ?? "medium"] ?? 1) - (confidenceOrder[b.confidence ?? "medium"] ?? 1);
  });

  const pendingCount = allAnswers?.filter(a => a.status === "pending").length ?? 0;
  const lowCount = allAnswers?.filter(a => a.confidence === "low").length ?? 0;
  const medCount = allAnswers?.filter(a => a.confidence === "medium").length ?? 0;
  const highCount = allAnswers?.filter(a => a.confidence === "high").length ?? 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["review-answers"] });
    queryClient.invalidateQueries({ queryKey: ["pending-answers"] });
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
    queryClient.invalidateQueries({ queryKey: ["reviewer-profiles"] });
  };

  const handleApprove = async (answerId: string) => {
    const updates: any = {
      status: "approved" as const,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    };
    if (editingId === answerId && editBody.trim()) updates.body = editBody.trim();
    const { error } = await supabase.from("answers").update(updates).eq("id", answerId);
    if (error) toast.error(error.message);
    else { toast.success("Answer approved!"); setEditingId(null); invalidateAll(); }
  };

  const handleReject = async (answerId: string) => {
    if (rejectingId !== answerId) {
      setRejectingId(answerId);
      setRejectionReason("");
      return;
    }
    const { error } = await supabase.from("answers").update({
      status: "rejected" as const,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim() || null,
    } as any).eq("id", answerId);
    if (error) toast.error(error.message);
    else { toast.success("Answer rejected"); setRejectingId(null); setRejectionReason(""); invalidateAll(); }
  };

  const handleBatchApprove = async () => {
    for (const id of selected) {
      await supabase.from("answers").update({
        status: "approved" as const,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
    }
    toast.success(`${selected.size} answers approved!`);
    setSelected(new Set());
    invalidateAll();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const getReviewerName = (reviewedBy: string | null) => {
    if (!reviewedBy || !reviewerProfiles) return null;
    return reviewerProfiles[reviewedBy]?.display_name ?? "Unknown teacher";
  };

  const renderAnswerCard = (answer: any, showActions: boolean) => {
    const reviewerName = getReviewerName((answer as any).reviewed_by);
    const reviewedAt = (answer as any).reviewed_at;

    return (
      <Card key={answer.id} className={`border-border transition-all ${
        answer.status === "approved" ? "border-secondary/30" :
        answer.status === "rejected" ? "border-destructive/30" :
        "border-primary/20 glow-orange"
      } ${selected.has(answer.id) ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {showActions && (
              <input type="checkbox" checked={selected.has(answer.id)} onChange={() => toggleSelect(answer.id)} className="accent-primary h-4 w-4" />
            )}
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Zap className="mr-1 h-3 w-3" /> AI Answer
            </Badge>
            {answer.confidence && (
              <Badge variant="outline" className={`text-xs ${
                answer.confidence === "low" ? "border-destructive/30 text-destructive" :
                answer.confidence === "high" ? "border-secondary/30 text-secondary" :
                "border-primary/30 text-primary"
              }`}>
                {answer.confidence === "low" ? "🔴" : answer.confidence === "medium" ? "🟡" : "🟢"} {answer.confidence} confidence
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${
              answer.status === "approved" ? "border-secondary/30 text-secondary" :
              answer.status === "rejected" ? "border-destructive/30 text-destructive" :
              "border-primary/30 text-primary"
            }`}>
              {answer.status === "approved" ? <CheckCircle className="mr-1 h-3 w-3" /> :
               answer.status === "rejected" ? <X className="mr-1 h-3 w-3" /> :
               <Clock className="mr-1 h-3 w-3" />}
              {answer.status}
            </Badge>
          </div>
          <CardTitle className="text-sm">
            <button onClick={() => navigate(`/question/${answer.questions?.id}`)} className="text-primary hover:underline">
              Q: {answer.questions?.title}
            </button>
          </CardTitle>
          {answer.questions?.body && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{answer.questions.body}</p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
            </span>
            {reviewerName && reviewedAt && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {answer.status === "approved" ? "Approved" : "Rejected"} by <span className="text-foreground font-medium">{reviewerName}</span> · {format(new Date(reviewedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingId === answer.id ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-[200px] bg-muted border-border text-foreground font-mono text-sm" />
              <div className="min-h-[200px] rounded-md border border-border bg-card p-4 overflow-auto">
                <MarkdownRenderer content={editBody} />
              </div>
            </div>
          ) : (
            <div className="max-h-60 overflow-auto">
              <MarkdownRenderer content={answer.body} />
            </div>
          )}
          {/* Show rejection reason for already-rejected answers */}
          {answer.status === "rejected" && (answer as any).rejection_reason && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-medium text-destructive mb-1">Rejection Reason:</p>
              <p className="text-sm text-muted-foreground">{(answer as any).rejection_reason}</p>
            </div>
          )}
          {showActions && (
            <>
              {rejectingId === answer.id && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <label className="text-xs font-medium text-destructive mb-2 block">Why are you rejecting this answer? (optional but helpful)</label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Incorrect formula, missing context, misleading explanation..."
                    className="min-h-[80px] bg-card border-border text-foreground text-sm mb-2"
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleReject(answer.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      <X className="mr-1 h-4 w-4" /> Confirm Reject
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRejectingId(null)} className="text-muted-foreground">Cancel</Button>
                  </div>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button onClick={() => handleApprove(answer.id)} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <CheckCircle className="mr-1 h-4 w-4" /> Approve
                </Button>
                {editingId === answer.id ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-muted-foreground">Cancel</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { setEditingId(answer.id); setEditBody(answer.body); }} className="border-border text-muted-foreground">
                    <Edit className="mr-1 h-4 w-4" /> Edit & Approve
                  </Button>
                )}
                {rejectingId !== answer.id && (
                  <Button variant="ghost" size="sm" onClick={() => handleReject(answer.id)} className="text-destructive hover:text-destructive">
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-10 flex-1">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Teacher Review Queue</h1>
          {pendingCount > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20">{pendingCount} pending</Badge>
          )}
        </div>

        <ReviewStats />

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelected(new Set()); setFilter("all"); }}>
          <TabsList className="mb-6 bg-muted/50 border border-border">
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Clock className="mr-1.5 h-3.5 w-3.5" /> Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              <X className="mr-1.5 h-3.5 w-3.5" /> Rejected
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          {/* Filters & Batch */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44 bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({allAnswers?.length ?? 0})</SelectItem>
                <SelectItem value="low">🔴 Low ({lowCount})</SelectItem>
                <SelectItem value="medium">🟡 Medium ({medCount})</SelectItem>
                <SelectItem value="high">🟢 High ({highCount})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-card border-border text-foreground">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="confidence">Low confidence first</SelectItem>
              </SelectContent>
            </Select>
            {selected.size > 0 && activeTab === "pending" && (
              <Button size="sm" onClick={handleBatchApprove} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <CheckCircle className="mr-1 h-4 w-4" /> Approve {selected.size} Selected
              </Button>
            )}
          </div>

          {isLoading && [1, 2, 3].map(i => (
            <div key={i} className="mb-4"><Skeleton className="h-40 w-full rounded-xl" /></div>
          ))}

          {!isLoading && filtered.length === 0 && (
            <Card className="bg-muted/30 border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-3 h-8 w-8 text-secondary" />
                {activeTab === "pending" ? "All caught up! No answers need review." :
                 activeTab === "approved" ? "No approved answers yet." :
                 activeTab === "rejected" ? "No rejected answers." :
                 "No answers found."}
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {filtered.map((answer: any) => renderAnswerCard(answer, activeTab === "pending" || activeTab === "rejected"))}
          </div>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
