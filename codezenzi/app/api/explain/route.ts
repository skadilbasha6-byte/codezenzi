import { generateText, Output } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import { LANGUAGES, type LanguageId } from "@/lib/languages"

export const maxDuration = 30

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
const MODEL = google("gemini-3.6-flash")

const schema = z.object({
  explanation: z.string().describe("A beginner-friendly explanation of why the error occurs."),
  suggestedFix: z.string().describe("The corrected code snippet, or an empty string if unsure."),
  reason: z.string().describe("Why the suggested correction works."),
  alternative: z.string().describe("An optional alternative solution, or an empty string."),
})

interface ExplainBody {
  language?: LanguageId
  code?: string
  errorType?: string
  errorMessage?: string
  line?: number
  nearbyCode?: string
  analyzerOutput?: string
}

export async function POST(req: Request) {
  let body: ExplainBody
  try {
    body = (await req.json()) as ExplainBody
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const cfg = LANGUAGES[body.language ?? "python"]
  if (!cfg) return Response.json({ error: "Unsupported language." }, { status: 400 })

  const system =
    "You are Codezenzi, a patient programming tutor. A real parser or static analyzer already detected the error below. " +
    "Do NOT dispute the analyzer. Explain the error in plain language for a beginner, propose a concrete fix, and say why it works. " +
    "Keep it concise. If you are not confident about the fix, say so honestly and leave suggestedFix empty."

  const prompt = [
    `Language: ${cfg.label}`,
    `Error type: ${body.errorType ?? "unknown"}`,
    `Error message: ${body.errorMessage ?? ""}`,
    `Error line: ${body.line ?? "?"}`,
    body.nearbyCode ? `Nearby code:\n${body.nearbyCode}` : "",
    body.analyzerOutput ? `Static analyzer output: ${body.analyzerOutput}` : "",
    body.code ? `Full code:\n${body.code}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const { output } = await generateText({
      model: MODEL,
      system,
      prompt,
      temperature: 0.2,
      output: Output.object({ schema }),
    })
    return Response.json(output)
  } catch (err) {
    console.log("[codezenzi] explain error:", err instanceof Error ? err.message : String(err))
    return Response.json({ error: "AI explanation is unavailable right now." }, { status: 502 })
  }
}
