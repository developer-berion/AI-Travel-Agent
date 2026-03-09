import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(
  () =>
    new Response(
      JSON.stringify({
        status: "placeholder",
        message:
          "Use apps/web Route Handlers for the current vertical slice. This edge function will host command execution once Supabase wiring is activated.",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
);
