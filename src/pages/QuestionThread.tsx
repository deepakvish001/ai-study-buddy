import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Zap, ThumbsUp, ThumbsDown, CheckCircle, Shield, Loader2, MessageSquare, Send, FileText, Share2, ArrowLeft, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CommentThread from "@/components/CommentThread";

interface Attachment { name: string; url: string; type: string; }

export default function QuestionThread() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newAnswer, setNewAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const aiRequestedRef = useRef<string | null>(null);

  const { data: question, isLoading } = useQuery({
    queryKey: ["question", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("*").eq("id", id!).single();
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", data.user_id).single();
      return { ...data, author_name: profile?.display_name ?? "Anonymous" };
    },
    enabled: !!id,
  });

  const { data: answers } = useQuery({
    queryKey: ["answers", id],
    queryFn: async () => {
      const { data } = await supabase.from("answers").select("*").eq("question_id", id!).order("is_ai", { ascending: false }).order("created_at", { ascending: true });
      if (!data?.length) return [];
      const userIds = [...new Set(data.filter(a => a.user_id).map(a => a.user_id!))];
      const { data: profiles } = userIds.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds) : { data: [] };
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.display_name]));
      return data.map(a => ({ ...a, author_name: a.user_id ? profileMap[a.user_id] ?? "Anonymous" : "AI Bot" }));
    },
    enabled: !!id,
    refetchInterval: ({ state }) => state.data?.length ? false : 5000,
  });

  useEffect(() => {
    if (!id || !question || answers === undefined || answers.length > 0 || aiRequestedRef.current === id) return;

    aiRequestedRef.current = id;

    const ensureAIAnswer = async () => {
      const { error } = await supabase.functions.invoke("ai-answer", {
        body: { questionId: id, title: question.title, body: question.body },
      });

      if (error) {
        aiRequestedRef.current = null;
        console.error("AI answer generation failed:", error);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["answers", id] });
    };

    void ensureAIAnswer();
  }, [id, question, answers, queryClient]);

  const { data: userVotes } = useQuery({
    queryKey: ["user-votes", id, user?.id],
    queryFn: async () => {
      const answerIds = answers?.map(a => a.id) ?? [];
      if (!answerIds.length) return {};
      const { data } = await supabase.from("votes").select("answer_id, vote_type").eq("user_id", user!.id).in("answer_id", answerIds);
      return Object.fromEntries((data ?? []).map(v => [v.answer_id, v.vote_type]));
    },
    enabled: !!user && !!answers?.length,
  });

  const handleVote = async (answerId: string, type: "up" | "down") => {
    if (!user) { toast.error("Sign in to vote"); return; }
    const currentVote = userVotes?.[answerId];

    try {
      if (currentVote === type) {
        await supabase.from("votes").delete().eq("user_id", user.id).eq("answer_id", answerId);
      } else if (currentVote) {
        await supabase.from("votes").update({ vote_type: type }).eq("user_id", user.id).eq("answer_id", answerId);
      } else {
        await supabase.from("votes").insert({ user_id: user.id, answer_id: answerId, vote_type: type });
      }

      const { data: voteCounts } = await supabase.from("votes").select("vote_type").eq("answer_id", answerId);
      const ups = voteCounts?.filter(v => v.vote_type === "up").length ?? 0;
      const downs = voteCounts?.filter(v => v.vote_type === "down").length ?? 0;
      await supabase.from("answers").update({ upvotes: ups, downvotes: downs }).eq("id", answerId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["answers", id] }),
        queryClient.invalidateQueries({ queryKey: ["user-votes", id, user.id] }),
      ]);
    } catch (err: any) {
      toast.error("Failed to vote: " + err.message);
    }
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
    const { error } = await supabase.from("answers").insert({ question_id: id!, user_id: user.id, body: newAnswer.trim() });
    if (error) toast.error(error.message);
    else { setNewAnswer(""); queryClient.invalidateQueries({ queryKey: ["answers", id] }); toast.success("Answer posted!"); }
    setSubmitting(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleRegenerateAI = async () => {
    if (!question || regenerating) return;
    setRegenerating(true);
    try {
      const { error } = await supabase.functions.invoke("ai-answer", {
        body: { questionId: id, title: question.title, body: question.body, regenerate: true },
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["answers", id] });
      toast.success("AI answer regenerated!");
    } catch (err: any) {
      toast.error("Failed to regenerate: " + (err.message || "Unknown error"));
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-4 py-10 flex-1">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-8" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground flex-1">Question not found.</div>
      </div>
    );
  }

  const isOwner = user?.id === question.user_id;
  const isTeacher = hasRole("teacher") || hasRole("admin");
  const questionAttachments: Attachment[] = Array.isArray(question.attachments) ? (question.attachments as unknown as Attachment[]) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-10 flex-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="mb-8">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {question.status === "resolved" && <Badge className="bg-secondary/10 text-secondary border-0"><CheckCircle className="mr-1 h-3 w-3" /> Resolved</Badge>}
                {question.status === "open" && <Badge variant="outline" className="border-primary/30 text-primary">Open</Badge>}
                <Button variant="ghost" size="sm" onClick={handleShare} className="ml-auto text-muted-foreground hover:text-primary h-7 px-2">
                  <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                </Button>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{question.title}</h1>
              <MarkdownRenderer content={question.body} />

              {questionAttachments.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {questionAttachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
                      {att.type?.startsWith("image/") ? <img src={att.url} alt={att.name} className="w-full h-28 object-cover" /> : <div className="flex items-center justify-center h-28 bg-muted/50"><FileText className="h-8 w-8 text-primary" /></div>}
                      <div className="p-2"><p className="text-xs text-muted-foreground truncate">{att.name}</p></div>
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {question.tags?.map((t: string) => <Badge key={t} variant="outline" className="border-border text-muted-foreground">{t}</Badge>)}
                <span className="text-xs text-muted-foreground">Asked by {(question as any).author_name} · {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><MessageSquare className="h-5 w-5" /> {answers?.length ?? 0} Answers</h2>

          {answers?.length === 0 && (
            <Card className="bg-muted/30 border-border">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                AI is generating an answer...
              </CardContent>
            </Card>
          )}

          {answers?.map((answer) => {
            const currentVote = userVotes?.[answer.id];
            const isPendingAI = answer.is_ai && answer.status === "pending";
            const isVerifiedAI = answer.is_ai && answer.status === "approved";
            return (
              <Card key={answer.id} className={`border-border ${answer.is_accepted ? "border-secondary/50 glow-green" : ""} ${answer.is_ai ? "border-primary/30 glow-orange" : ""}`}>
                {isPendingAI && (
                  <div className="px-4 pt-3 sm:px-6 sm:pt-4">
                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>This AI answer is awaiting teacher verification.</span>
                    </div>
                  </div>
                )}
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button onClick={() => handleVote(answer.id, "up")} className={`transition-colors ${currentVote === "up" ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}>
                        <ThumbsUp className={`h-4 w-4 sm:h-5 sm:w-5 ${currentVote === "up" ? "fill-current" : ""}`} />
                      </button>
                      <span className="text-sm font-medium text-foreground">{answer.upvotes - answer.downvotes}</span>
                      <button onClick={() => handleVote(answer.id, "down")} className={`transition-colors ${currentVote === "down" ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                        <ThumbsDown className={`h-4 w-4 sm:h-5 sm:w-5 ${currentVote === "down" ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {answer.is_ai && <Badge className="bg-primary/10 text-primary border-primary/20"><Zap className="mr-1 h-3 w-3" /> AI Answer</Badge>}
                        {answer.is_accepted && <Badge className="bg-secondary/10 text-secondary border-0"><CheckCircle className="mr-1 h-3 w-3" /> Accepted</Badge>}
                        {isPendingAI && <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 text-xs"><Clock className="mr-1 h-3 w-3" /> Verification Pending</Badge>}
                        {isVerifiedAI && <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs"><Shield className="mr-1 h-3 w-3" /> Verified by Teacher</Badge>}
                        {answer.confidence && answer.is_ai && (
                          <Badge variant="outline" className={`text-xs ${answer.confidence === "high" ? "border-secondary/30 text-secondary" : answer.confidence === "medium" ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}>{answer.confidence} confidence</Badge>
                        )}
                        {answer.status === "approved" && !answer.is_ai && <Badge className="bg-secondary/10 text-secondary border-0"><Shield className="mr-1 h-3 w-3" /> Verified</Badge>}
                      </div>

                      <MarkdownRenderer content={answer.body} />

                      {answer.sources_json && Array.isArray(answer.sources_json) && (answer.sources_json as any[]).length > 0 && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Sources:</p>
                          {(answer.sources_json as any[]).map((s: any, i: number) => <p key={i} className="text-xs text-muted-foreground">{s.title || s}</p>)}
                        </div>
                      )}

                      {isPendingAI && (
                        <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-500/80">
                          ⚠️ This answer was generated by AI and has not yet been verified by a teacher. While it may be helpful, please use it with caution and cross-check important information.
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">{(answer as any).author_name} · {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                        <div className="flex items-center gap-2">
                          {answer.is_ai && (
                            <Button variant="ghost" size="sm" onClick={handleRegenerateAI} disabled={regenerating} className="text-primary hover:text-primary/80 text-xs h-7 gap-1">
                              {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerate
                            </Button>
                          )}
                          {(isOwner || isTeacher) && !answer.is_accepted && (
                            <Button variant="ghost" size="sm" onClick={() => handleAccept(answer.id)} className="text-secondary hover:text-secondary"><CheckCircle className="mr-1 h-3 w-3" /> Accept</Button>
                          )}
                        </div>
                      </div>

                      <CommentThread answerId={answer.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {user && (
          <form onSubmit={handleSubmitAnswer} className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Your Answer</h3>
            <Textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} placeholder="Write your answer... (supports markdown)" className="min-h-[120px] bg-card border-border text-foreground mb-3" />
            <Button type="submit" disabled={submitting || !newAnswer.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post Answer
            </Button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
