import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Zap, X, Loader2 } from "lucide-react";

const SUGGESTED_TAGS = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English", "History", "Economics"];

export default function AskQuestion() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search similar questions while typing title
  useEffect(() => {
    if (title.length < 5) { setSimilar([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("questions")
        .select("id, title, status")
        .ilike("title", `%${title}%`)
        .limit(3);
      setSimilar(data ?? []);
    }, 500);
    return () => clearTimeout(timer);
  }, [title]);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first"); return; }
    if (!title.trim() || !body.trim()) { toast.error("Title and body are required"); return; }

    setLoading(true);
    try {
      const { data: question, error } = await supabase
        .from("questions")
        .insert({ user_id: user.id, title: title.trim(), body: body.trim(), tags })
        .select("id")
        .single();
      if (error) throw error;

      // Trigger AI answer in background
      triggerAIAnswer(question.id, title, body);

      toast.success("Question posted! AI is generating an answer...");
      navigate(`/question/${question.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Ask a Doubt</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your doubt? Be specific..."
              className="bg-card border-border text-foreground"
              required
            />
          </div>

          {similar.length > 0 && (
            <Card className="bg-muted/50 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Similar questions found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {similar.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => navigate(`/question/${q.id}`)}
                    className="block w-full text-left text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {q.title}
                    {q.status === "resolved" && (
                      <Badge className="ml-2 bg-secondary/10 text-secondary border-0 text-xs">Resolved</Badge>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="body" className="text-foreground">Description</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your doubt in detail. Include what you've already tried..."
              className="min-h-[200px] bg-card border-border text-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <Badge key={t} className="bg-primary/10 text-primary border-primary/20">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                className="bg-card border-border text-foreground"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button key={t} type="button" onClick={() => addTag(t)}>
                  <Badge variant="outline" className="text-xs cursor-pointer border-border text-muted-foreground hover:border-primary hover:text-primary">
                    + {t}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</>
            ) : (
              <><Zap className="mr-2 h-4 w-4" /> Post Question & Get AI Answer</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

async function triggerAIAnswer(questionId: string, title: string, body: string) {
  try {
    await supabase.functions.invoke("ai-answer", {
      body: { questionId, title, body },
    });
  } catch (err) {
    console.error("AI answer generation failed:", err);
  }
}
