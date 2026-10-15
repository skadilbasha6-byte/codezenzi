import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { LANGUAGES, type LanguageId } from "@/lib/languages"

export const maxDuration = 60

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
const MODEL = google("gemini-3.6-flash")

interface GenerateBody {
  prompt?: string
  language?: LanguageId
  framework?: string
}

function stripFences(text: string): string {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9+#-]*\n([\s\S]*?)\n```$/)
  if (fenceMatch) return fenceMatch[1].trim()
  // Remove any stray leading/trailing fences.
  return trimmed.replace(/^```[a-zA-Z0-9+#-]*\n?/, "").replace(/\n?```$/, "").trim()
}

export async function POST(req: Request) {
  let body: GenerateBody
  try {
    body = (await req.json()) as GenerateBody
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const prompt = (body.prompt ?? "").trim()
  const languageId = body.language ?? "python"
  const cfg = LANGUAGES[languageId]

  if (!prompt) {
    return Response.json({ error: "Please describe what you want to build." }, { status: 400 })
  }
  if (!cfg) {
    return Response.json({ error: "Unsupported language." }, { status: 400 })
  }

  const frameworkLabel =
    body.framework && body.framework !== "none"
      ? cfg.frameworks?.find((f) => f.id === body.framework)?.label
      : undefined

  const system = [
    `You are Codezenzi, a coding assistant that writes clean, idiomatic, production-quality ${cfg.label} code.`,
    `Follow the standard conventions, structure, and best practices of ${cfg.label}. Do not mechanically translate from another language.`,
    frameworkLabel ? `Use ${frameworkLabel} where appropriate.` : "",
    `Return ONLY the ${cfg.label} source code. No explanations, no markdown fences, no commentary.`,
    `Include brief, helpful inline comments only where they add real value.`,
    `The code must be syntactically valid and ready to paste directly into an editor.`,
  ]
    .filter(Boolean)
    .join(" ")

  try {
    const { text } = await generateText({
      model: MODEL,
      system,
      prompt,
      temperature: 0.2,
      abortSignal: req.signal,
    })
    const code = stripFences(text)
    if (!code) {
      return Response.json({ error: "The model returned no code. Try rephrasing your request." }, { status: 502 })
    }
    return Response.json({ code, language: languageId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log("[codezenzi] generate error:", msg)
    const missingKey = !process.env.GOOGLE_GENERATIVE_AI_API_KEY || /api key|api_key|permission|invalid|unauthenticated|credential/i.test(msg)
    return Response.json(
      {
        error: missingKey
          ? "AI features need a free Google Gemini API key. Get one (no credit card) at aistudio.google.com/apikey and add it as the GOOGLE_GENERATIVE_AI_API_KEY environment variable."
          : "Code generation failed. Please try again.",
      },
      { status: 502 },
    )
  }
}
