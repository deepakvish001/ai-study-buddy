import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, MessageSquare, CheckCircle, GraduationCap, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ReactNode> = {
  new_answer: <MessageSquare className="h-4 w-4 text-primary shrink-0" />,
  new_comment: <MessageSquare className="h-4 w-4 text-secondary shrink-0" />,
  application_approved: <GraduationCap className="h-4 w-4 text-secondary shrink-0" />,
  application_rejected: <X className="h-4 w-4 text-destructive shrink-0" />,
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {(!notifications || notifications.length === 0) && (
            <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          )}
          {notifications?.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 ${
                !n.is_read ? "bg-primary/5" : ""
              }`}
            >
              <div className="mt-0.5">{typeIcons[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground shrink-0" />}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.is_read && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
