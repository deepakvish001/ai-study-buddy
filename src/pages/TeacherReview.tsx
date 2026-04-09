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
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Zap, CheckCircle, X, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export default function TeacherReview() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!hasRole("teacher") && !hasRole("admin")) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground flex-1">Only teachers and admins can access this page.</div>
        <Footer />
      </div>
    );
  }

  const { data: pendingAnswers, isLoading } = useQuery({
    queryKey: ["pending-answers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("answers")
        .select("*, questions(id, title, body)")
        .eq("status", "pending")
        .eq("is_ai", true)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const filtered = pendingAnswers?.filter(a => filter === "all" || a.confidence === filter) ?? [];
  const lowCount = pendingAnswers?.filter(a => a.confidence === "low").length ?? 0;
  const medCount = pendingAnswers?.filter(a => a.confidence === "medium").length ?? 0;

  const handleApprove = async (answerId: string) => {
    const updates: any = { status: "approved" as const };
    if (editingId === answerId && editBody.trim()) updates.body = editBody.trim();
    const { error } = await supabase.from("answers").update(updates).eq("id", answerId);
    if (error) toast.error(error.message);
    else { toast.success("Answer approved!"); setEditingId(null); queryClient.invalidateQueries({ queryKey: ["pending-answers"] }); queryClient.invalidateQueries({ queryKey: ["pending-count"] }); }
  };

  const handleReject = async (answerId: string) => {
    const { error } = await supabase.from("answers").update({ status: "rejected" as const }).eq("id", answerId);
    if (error) toast.error(error.message);
    else { toast.success("Answer rejected"); queryClient.invalidateQueries({ queryKey: ["pending-answers"] }); queryClient.invalidateQueries({ queryKey: ["pending-count"] }); }
  };

  const handleBatchApprove = async () => {
    for (const id of selected) { await supabase.from("answers").update({ status: "approved" as const }).eq("id", id); }
    toast.success(`${selected.size} answers approved!`);
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["pending-answers"] });
    queryClient.invalidateQueries({ queryKey: ["pending-count"] });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-10 flex-1">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Teacher Review Queue</h1>
          <Badge className="bg-primary/10 text-primary border-primary/20">{pendingAnswers?.length ?? 0} pending</Badge>
        </div>

        {/* Filters & Batch */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-card border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low ({lowCount})</SelectItem>
              <SelectItem value="medium">Medium ({medCount})</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <Button size="sm" onClick={handleBatchApprove} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <CheckCircle className="mr-1 h-4 w-4" /> Approve {selected.size} Selected
            </Button>
          )}
        </div>

        {isLoading && [1,2,3].map(i => (
          <div key={i} className="mb-4"><Skeleton className="h-40 w-full rounded-xl" /></div>
        ))}

        {!isLoading && filtered.length === 0 && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-secondary" />
              All caught up! No answers need review.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {filtered.map((answer: any) => (
            <Card key={answer.id} className={`border-primary/20 glow-orange ${selected.has(answer.id) ? "ring-2 ring-primary" : ""}`}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <input type="checkbox" checked={selected.has(answer.id)} onChange={() => toggleSelect(answer.id)} className="accent-primary h-4 w-4" />
                  <Badge className="bg-primary/10 text-primary border-primary/20"><Zap className="mr-1 h-3 w-3" /> AI Answer</Badge>
                  {answer.confidence && (
                    <Badge variant="outline" className={`text-xs ${answer.confidence === "low" ? "border-destructive/30 text-destructive" : "border-primary/30 text-primary"}`}>{answer.confidence} confidence</Badge>
                  )}
                </div>
                <CardTitle className="text-sm">
                  <button onClick={() => navigate(`/question/${answer.questions?.id}`)} className="text-primary hover:underline">Q: {answer.questions?.title}</button>
                </CardTitle>
                {answer.questions?.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{answer.questions.body}</p>
                )}
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
                  <MarkdownRenderer content={answer.body} />
                )}
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => handleApprove(answer.id)} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90"><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button>
                  {editingId === answer.id ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-muted-foreground">Cancel</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { setEditingId(answer.id); setEditBody(answer.body); }} className="border-border text-muted-foreground"><Edit className="mr-1 h-4 w-4" /> Edit</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleReject(answer.id)} className="text-destructive hover:text-destructive"><X className="mr-1 h-4 w-4" /> Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
