import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle, X, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReviewerStat {
  reviewerId: string;
  displayName: string;
  totalReviews: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  avgReviewTimeMs: number | null;
}

export default function ReviewStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["review-stats"],
    queryFn: async () => {
      // Fetch all reviewed AI answers
      const { data: answers } = await supabase
        .from("answers")
        .select("id, status, confidence, created_at, reviewed_at, reviewed_by, is_ai")
        .eq("is_ai", true)
        .in("status", ["approved", "rejected"]);

      if (!answers || answers.length === 0) return { reviewers: [], totals: null };

      // Get unique reviewer IDs
      const reviewerIds = [...new Set(answers.map(a => a.reviewed_by).filter(Boolean))] as string[];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", reviewerIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.display_name ?? "Unknown"; });

      // Compute per-reviewer stats
      const byReviewer: Record<string, { approved: number; rejected: number; reviewTimes: number[] }> = {};

      for (const a of answers) {
        const rid = a.reviewed_by;
        if (!rid) continue;
        if (!byReviewer[rid]) byReviewer[rid] = { approved: 0, rejected: 0, reviewTimes: [] };
        if (a.status === "approved") byReviewer[rid].approved++;
        else byReviewer[rid].rejected++;

        if (a.reviewed_at && a.created_at) {
          const diff = new Date(a.reviewed_at).getTime() - new Date(a.created_at).getTime();
          if (diff > 0) byReviewer[rid].reviewTimes.push(diff);
        }
      }

      const reviewers: ReviewerStat[] = Object.entries(byReviewer).map(([id, s]) => {
        const total = s.approved + s.rejected;
        return {
          reviewerId: id,
          displayName: profileMap[id] ?? "Unknown",
          totalReviews: total,
          approved: s.approved,
          rejected: s.rejected,
          approvalRate: total > 0 ? Math.round((s.approved / total) * 100) : 0,
          avgReviewTimeMs: s.reviewTimes.length > 0
            ? s.reviewTimes.reduce((a, b) => a + b, 0) / s.reviewTimes.length
            : null,
        };
      }).sort((a, b) => b.totalReviews - a.totalReviews);

      const totalApproved = answers.filter(a => a.status === "approved").length;
      const totalRejected = answers.filter(a => a.status === "rejected").length;
      const totalReviewed = totalApproved + totalRejected;

      return {
        reviewers,
        totals: {
          totalReviewed,
          totalApproved,
          totalRejected,
          approvalRate: totalReviewed > 0 ? Math.round((totalApproved / totalReviewed) * 100) : 0,
        },
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!stats?.totals) return null;

  const formatTime = (ms: number | null) => {
    if (!ms) return "—";
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totals.totalReviewed}</p>
              <p className="text-xs text-muted-foreground">Total Reviewed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <CheckCircle className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totals.totalApproved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totals.totalRejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totals.approvalRate}%</p>
              <p className="text-xs text-muted-foreground">Approval Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-reviewer breakdown */}
      {stats.reviewers.length > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Reviewer Breakdown
            </h3>
            <div className="space-y-3">
              {stats.reviewers.map(r => (
                <div key={r.reviewerId} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-foreground truncate min-w-0">{r.displayName}</span>
                  <div className="flex items-center gap-4 text-muted-foreground text-xs shrink-0">
                    <span>{r.totalReviews} reviews</span>
                    <span className="text-secondary">{r.approved} ✓</span>
                    <span className="text-destructive">{r.rejected} ✗</span>
                    <span className="text-primary">{r.approvalRate}%</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(r.avgReviewTimeMs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
