import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ This version string is the easiest proof you’re running the right code
const SERVER_VERSION = "v3-action-json-redirect";

// ✅ Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, version: SERVER_VERSION });
});

// ✅ Guaranteed keyword fallback
function shouldRedirectToContact(message) {
  const m = message.toLowerCase();

  // Only redirect on explicit intent to go to contact page / proceed
  return (
    m.includes("open contact") ||
    m.includes("go to contact") ||
    m.includes("take me to contact") ||
    m.includes("contact page") ||
    m.includes("proceed") ||
    m.includes("yes,") ||
    m === "yes" ||
    m.includes("yes please")
  );
}

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Please send a message.",
        action: "none",
        version: SERVER_VERSION,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
  "You are Unboxd AI, the official website assistant for Unboxd Studios. " +
  "You must ONLY answer as Unboxd Studios. If asked unrelated questions, politely redirect. " +
  "Use the business info below as your source of truth:\n\n" +

  "BUSINESS INFO:\n" +
  "- Business name: Unboxd Studios\n" +
  "- What we do: [e.g. branding, websites, marketing content, video editing]\n" +
  "- Services: [list your exact services]\n" +
  "- Typical turnaround times: [your real times]\n" +
  "- Pricing approach: [fixed packages / custom quotes]\n" +
  "- Location / service area: [Cape Town / remote]\n" +
  "- How to book: Users should contact via the contact page.\n\n" +

  "BEHAVIOR RULES:\n" +
  "- Be concise and helpful.\n" +
  "- When users ask about services/company, answer using BUSINESS INFO.\n" +
  "- When users want to book or get a quote: ask for name, service, and preferred date/time. " +
  "Then ask: 'Do you want me to open the contact page to submit this?' " +
  "Only if user confirms, set action='contact'.\n\n" +

  "Return ONLY JSON: {\"reply\":\"...\",\"action\":\"contact|none\"}"
        },
        { role: "user", content: message }
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    console.log("MODEL RAW:", raw);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, action: "none" };
    }

    const reply =
      typeof parsed.reply === "string" ? parsed.reply : String(parsed.reply || "");

    // model action OR keyword fallback (guaranteed)
    const modelAction = parsed.action === "contact" ? "contact" : "none";
    const redirectAction = shouldRedirectToContact(message) ? "contact" : "none";

// Only redirect if model asked OR user explicitly asked
    const action = modelAction === "contact" || redirectAction === "contact" ? "contact" : "none";
    
    console.log("RETURNING:", { reply, action, version: SERVER_VERSION });

    return res.json({ reply, action, version: SERVER_VERSION });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({
      reply: "Server error.",
      action: "none",
      version: SERVER_VERSION,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

app.get("/", (req, res) => {
  res.send("Unboxd API is running");
});