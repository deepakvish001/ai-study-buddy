import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { Zap, ThumbsUp, ThumbsDown, CheckCircle, Shield, Loader2, MessageSquare, Send, FileText, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Attachment {
  name: string;
  url: string;
  type: string;
}

export default function QuestionThread() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [newAnswer, setNewAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: question, isLoading } = useQuery({
    queryKey: ["question", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.user_id)
        .single();
      return { ...data, author_name: profile?.display_name ?? "Anonymous" };
    },
    enabled: !!id,
  });

  const { data: answers } = useQuery({
    queryKey: ["answers", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("answers")
        .select("*")
        .eq("question_id", id!)
        .order("is_ai", { ascending: false })
        .order("is_accepted", { ascending: false })
        .order("upvotes", { ascending: false });
      if (!data?.length) return [];
      const userIds = [...new Set(data.filter(a => a.user_id).map(a => a.user_id!))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
        : { data: [] };
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.display_name]));
      return data.map(a => ({ ...a, author_name: a.user_id ? profileMap[a.user_id] ?? "Anonymous" : "AI Bot" }));
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

  const handleVote = async (answerId: string, type: "up" | "down") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    const { error } = await supabase.from("votes").upsert(
      { user_id: user.id, answer_id: answerId, vote_type: type },
      { onConflict: "user_id,answer_id" }
    );
    if (error) { toast.error(error.message); return; }
    const answer = answers?.find((a) => a.id === answerId);
    if (answer) {
      await supabase.from("answers").update({
        upvotes: type === "up" ? answer.upvotes + 1 : answer.upvotes,
        downvotes: type === "down" ? answer.downvotes + 1 : answer.downvotes,
      }).eq("id", answerId);
    }
    queryClient.invalidateQueries({ queryKey: ["answers", id] });
  };

  const handleAccept = async (answerId: string) => {
    if (!user) return;
    await supabase.from("answers").update({ is_accepted: false }).eq("question_id", id!);
    await supabase.from("answers").update({ is_accepted: true }).eq("id", answerId);
    await supabase.from("questions").update({ status: "resolved" as any }).eq("id", id!);
    queryClient.invalidateQueries({ queryKey: ["answers", id] });
    queryClient.invalidateQueries({ queryKey: ["question", id] });
    toast.success("Answer accepted!");
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAnswer.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("answers").insert({
      question_id: id!,
      user_id: user.id,
      body: newAnswer.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setNewAnswer("");
      queryClient.invalidateQueries({ queryKey: ["answers", id] });
      toast.success("Answer posted!");
    }
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Question not found.
        </div>
      </div>
    );
  }

  const isOwner = user?.id === question.user_id;
  const isTeacher = hasRole("teacher") || hasRole("admin");
  const questionAttachments: Attachment[] = Array.isArray(question.attachments) ? (question.attachments as unknown as Attachment[]) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {/* Question */}
        <div className="mb-8">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {question.status === "resolved" && (
                  <Badge className="bg-secondary/10 text-secondary border-0">
                    <CheckCircle className="mr-1 h-3 w-3" /> Resolved
                  </Badge>
                )}
                {question.status === "open" && (
                  <Badge variant="outline" className="border-primary/30 text-primary">Open</Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{question.title}</h1>
              <p className="text-muted-foreground whitespace-pre-wrap">{question.body}</p>

              {/* Attachments */}
              {questionAttachments.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {questionAttachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
                      {att.type?.startsWith("image/") ? (
                        <img src={att.url} alt={att.name} className="w-full h-28 object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-28 bg-muted/50">
                          <FileText className="h-8 w-8 text-primary" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs text-muted-foreground truncate">{att.name}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {question.tags?.map((t: string) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">{t}</Badge>
                ))}
                <span className="text-xs text-muted-foreground">
                  Asked by {(question as any).author_name} · {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> {answers?.length ?? 0} Answers
          </h2>

          {answers?.length === 0 && (
            <Card className="bg-muted/30 border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                AI is generating an answer...
              </CardContent>
            </Card>
          )}

          {answers?.map((answer) => (
            <Card key={answer.id} className={`border-border ${answer.is_accepted ? "border-secondary/50 glow-green" : ""} ${answer.is_ai ? "border-primary/30 glow-orange" : ""}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button onClick={() => handleVote(answer.id, "up")} className="text-muted-foreground hover:text-secondary transition-colors">
                      <ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <span className="text-sm font-medium text-foreground">{answer.upvotes - answer.downvotes}</span>
                    <button onClick={() => handleVote(answer.id, "down")} className="text-muted-foreground hover:text-destructive transition-colors">
                      <ThumbsDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {answer.is_ai && (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <Zap className="mr-1 h-3 w-3" /> AI Answer
                        </Badge>
                      )}
                      {answer.is_accepted && (
                        <Badge className="bg-secondary/10 text-secondary border-0">
                          <CheckCircle className="mr-1 h-3 w-3" /> Accepted
                        </Badge>
                      )}
                      {answer.status === "pending" && (
                        <Badge variant="outline" className="border-primary/30 text-primary text-xs">Pending Review</Badge>
                      )}
                      {answer.confidence && answer.is_ai && (
                        <Badge variant="outline" className={`text-xs ${
                          answer.confidence === "high" ? "border-secondary/30 text-secondary" :
                          answer.confidence === "medium" ? "border-primary/30 text-primary" :
                          "border-destructive/30 text-destructive"
                        }`}>
                          {answer.confidence} confidence
                        </Badge>
                      )}
                      {answer.status === "approved" && !answer.is_ai && (
                        <Badge className="bg-secondary/10 text-secondary border-0">
                          <Shield className="mr-1 h-3 w-3" /> Verified
                        </Badge>
                      )}
                    </div>

                    <MarkdownRenderer content={answer.body} />

                    {answer.sources_json && Array.isArray(answer.sources_json) && (answer.sources_json as any[]).length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Sources:</p>
                        {(answer.sources_json as any[]).map((s: any, i: number) => (
                          <p key={i} className="text-xs text-muted-foreground">{s.title || s}</p>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">
                        {(answer as any).author_name} · {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
                      </span>
                      {(isOwner || isTeacher) && !answer.is_accepted && (
                        <Button variant="ghost" size="sm" onClick={() => handleAccept(answer.id)} className="text-secondary hover:text-secondary">
                          <CheckCircle className="mr-1 h-3 w-3" /> Accept
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Post Answer */}
        {user && (
          <form onSubmit={handleSubmitAnswer} className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Your Answer</h3>
            <Textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Write your answer..."
              className="min-h-[120px] bg-card border-border text-foreground mb-3"
            />
            <Button type="submit" disabled={submitting || !newAnswer.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Post Answer
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
