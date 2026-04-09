import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Zap, CheckCircle, X, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TeacherReview() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  if (!hasRole("teacher") && !hasRole("admin")) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Only teachers and admins can access this page.
        </div>
      </div>
    );
  }

  const { data: pendingAnswers, isLoading } = useQuery({
    queryKey: ["pending-answers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("answers")
        .select("*, questions(id, title), profiles(display_name)")
        .eq("status", "pending")
        .eq("is_ai", true)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const handleApprove = async (answerId: string) => {
    const updates: any = { status: "approved" as const };
    if (editingId === answerId && editBody.trim()) {
      updates.body = editBody.trim();
    }
    const { error } = await supabase.from("answers").update(updates).eq("id", answerId);
    if (error) toast.error(error.message);
    else {
      toast.success("Answer approved!");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["pending-answers"] });
    }
  };

  const handleReject = async (answerId: string) => {
    const { error } = await supabase.from("answers").update({ status: "rejected" as const }).eq("id", answerId);
    if (error) toast.error(error.message);
    else {
      toast.success("Answer rejected");
      queryClient.invalidateQueries({ queryKey: ["pending-answers"] });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Teacher Review Queue</h1>
          <Badge className="bg-primary/10 text-primary border-primary/20">{pendingAnswers?.length ?? 0} pending</Badge>
        </div>

        {isLoading && <div className="text-center py-10 text-muted-foreground">Loading...</div>}

        {!isLoading && pendingAnswers?.length === 0 && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-secondary" />
              All caught up! No answers need review.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {pendingAnswers?.map((answer: any) => (
            <Card key={answer.id} className="border-primary/20 glow-orange">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <Zap className="mr-1 h-3 w-3" /> AI Answer
                  </Badge>
                  {answer.confidence && (
                    <Badge variant="outline" className={`text-xs ${
                      answer.confidence === "low" ? "border-destructive/30 text-destructive" :
                      "border-primary/30 text-primary"
                    }`}>
                      {answer.confidence} confidence
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm">
                  <button onClick={() => navigate(`/question/${answer.questions?.id}`)} className="text-primary hover:underline">
                    Q: {answer.questions?.title}
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingId === answer.id ? (
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="min-h-[150px] bg-muted border-border text-foreground mb-4"
                  />
                ) : (
                  <p className="text-foreground whitespace-pre-wrap mb-4">{answer.body}</p>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => handleApprove(answer.id)} size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    <CheckCircle className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  {editingId === answer.id ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-muted-foreground">
                      Cancel
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { setEditingId(answer.id); setEditBody(answer.body); }} className="border-border text-muted-foreground">
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleReject(answer.id)} className="text-destructive hover:text-destructive">
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
