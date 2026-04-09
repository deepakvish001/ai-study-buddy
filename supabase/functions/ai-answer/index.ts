import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questionId, title, body } = await req.json();
    if (!questionId || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingAnswer, error: existingAnswerError } = await supabase
      .from("answers")
      .select("id, confidence, status")
      .eq("question_id", questionId)
      .eq("is_ai", true)
      .maybeSingle();

    if (existingAnswerError) {
      console.error("Existing answer lookup error:", existingAnswerError);
      throw existingAnswerError;
    }

    if (existingAnswer) {
      return new Response(JSON.stringify({ success: true, confidence: existingAnswer.confidence, status: existingAnswer.status, existing: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert academic tutor on the DoubtSolver platform. Your job is to answer students' doubts clearly and accurately.

Rules:
1. Provide step-by-step explanations when applicable
2. Use simple language first, then add technical details
3. If the question involves math, show the work
4. If the question involves code, provide working examples
5. Be encouraging and supportive

At the END of your answer, you MUST add a special line in this exact format:
CONFIDENCE: [high|medium|low]

Use "high" if you are very confident in the answer.
Use "medium" if the answer is likely correct but might need verification.
Use "low" if the question is ambiguous, complex, or you are unsure.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Question Title: ${title}\n\nQuestion Details:\n${body}` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let answerText = aiData.choices?.[0]?.message?.content ?? "I couldn't generate an answer. Please try again.";

    let confidence: "high" | "medium" | "low" = "medium";
    const confidenceMatch = answerText.match(/CONFIDENCE:\s*(high|medium|low)/i);
    if (confidenceMatch) {
      confidence = confidenceMatch[1].toLowerCase() as "high" | "medium" | "low";
      answerText = answerText.replace(/\n?CONFIDENCE:\s*(high|medium|low)/i, "").trim();
    }

    const status = confidence === "low" ? "pending" : "approved";

    const { error: insertError } = await supabase.from("answers").insert({
      question_id: questionId,
      user_id: null,
      body: answerText,
      is_ai: true,
      confidence,
      status,
      sources_json: [],
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, confidence, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-answer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
