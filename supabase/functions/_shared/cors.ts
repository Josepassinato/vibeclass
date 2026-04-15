/**
 * Shared CORS configuration for all edge functions.
 *
 * In production, restrict Access-Control-Allow-Origin to your actual domain.
 * Example: "https://your-app.vercel.app"
 */
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Standard preflight response for OPTIONS requests. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
