import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  answerId: string;
}

export default function CommentThread({ answerId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);

  const { data: comments } = useQuery({
    queryKey: ["comments", answerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("answer_id", answerId)
        .order("created_at", { ascending: true });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const map = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.display_name]));
      return data.map(c => ({ ...c, author_name: map[c.user_id] ?? "Anonymous" }));
    },
    enabled: expanded,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !body.trim()) return;
    const { error } = await supabase.from("comments").insert({
      answer_id: answerId,
      user_id: user.id,
      body: body.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", answerId] });
    }
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    queryClient.invalidateQueries({ queryKey: ["comments", answerId] });
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
        <MessageSquare className="h-3 w-3" />
        {expanded ? "Hide comments" : "Comments"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-border/30">
          {comments?.map(c => (
            <div key={c.id} className="flex items-start gap-2 group">
              <div className="flex-1">
                <p className="text-xs text-foreground">
                  <span className="font-medium text-primary">{(c as any).author_name}</span>{" "}
                  <span className="text-muted-foreground">· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </p>
                <p className="text-sm text-foreground/90">{c.body}</p>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {user && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input value={body} onChange={e => setBody(e.target.value)} placeholder="Add a comment..." className="h-8 text-xs bg-muted border-border text-foreground" />
              <Button type="submit" size="sm" variant="ghost" disabled={!body.trim()} className="h-8 px-2 text-primary">
                <Send className="h-3 w-3" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
