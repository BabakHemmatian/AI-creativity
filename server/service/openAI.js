import axios from "axios"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set")

async function withRetry(fn, maxRetries = 3) {
  let delay = 1000
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const status = err?.response?.status
      const isRetryable =
        status === 429 || (status >= 500 && status < 600) || !status
      if (attempt === maxRetries || !isRetryable) throw err
      console.warn(
        `OpenAI request failed with status ${status} (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
      )
      await new Promise((r) => setTimeout(r, delay))
      delay *= 2
    }
  }
}

const MODEL = process.env.OPENAI_MODEL || "gpt-5"
const OPENAI_URL = "https://api.openai.com/v1/responses"

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${OPENAI_API_KEY}`,
}

const INSTRUCTIONS = `
You are going to play a game called the Alternative Uses Test (AUT; Guilford, 1967), where you work with a user to come up with creative uses for an everyday object. You may have played this game with this or other accounts in the past but play the game as if you have never played it before. You and the user will be taking turns to speak. You will be evaluated as a team based on the originality and practical usefulness of the ideas. When prompted, start the session by sharing a creative use for the object indicated. If the user follows up with you about your responses, succinctly answer any questions and consider any advice before continuing to generate ideas one at a time. The user will also generate ideas. Feel free to build your ideas off theirs, but make sure that anything you come up with is different from the user's ideas or anything that has already been shared in the chat. Also make sure you don't suggest any of the object’s conventional uses. Do not add uninformative sentences to your answer like “Sure, here is a creative use for X”. Generate one idea at a time. Each response should be no longer than a sentence, no more than 15 words.
`.trim()

const seedUser = (item) =>
  `Start the chat by sharing a creative use for ${item}.`

const toInputBlocks = (raw) => {
  const blocks = []
  const hist = Array.isArray(raw) ? raw.slice(1) : [] // skip item holder
  for (const m of hist) {
    if (!m || m.text == null) continue
    const text = String(m.text)
    if (m.sender === 1) {
      blocks.push({ role: "user", content: [{ type: "input_text", text }] })
    } else if (m.sender === 2) {
      blocks.push({
        role: "assistant",
        content: [{ type: "output_text", text }],
      })
    }
  }

  const first = blocks[0]
  if (!first || first.role !== "user") {
    const item = raw?.[0]?.text || "the object"
    blocks.unshift({
      role: "user",
      content: [{ type: "input_text", text: seedUser(item) }],
    })
  }
  return blocks
}

const extractOutputText = (data) => {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim()
  }
  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (
            c?.type === "output_text" &&
            typeof c.text === "string" &&
            c.text.trim()
          ) {
            return c.text.trim()
          }
          if (
            c?.type === "message" &&
            c?.role === "assistant" &&
            Array.isArray(c?.content)
          ) {
            const t = c.content.find(
              (x) => x.type === "output_text" && typeof x.text === "string",
            )
            if (t?.text?.trim()) return t.text.trim()
          }
        }
      }
    }
  }
  if (typeof data?.content === "string" && data.content.trim())
    return data.content.trim()
  return ""
}

export const generateCompletion = async (messages) => {
  const input = toInputBlocks(messages)
  const body = {
    model: MODEL,
    instructions: INSTRUCTIONS,
    input,
    reasoning: { effort: "minimal" },
    text: { verbosity: "low" },
    max_output_tokens: 40,
  }
  try {
    return await withRetry(async () => {
      const input = toInputBlocks(messages)
      const body = { model: MODEL, instructions: INSTRUCTIONS, input }

      console.log("OpenAI request body:", JSON.stringify(body, null, 2))
      const resp = await axios.post(OPENAI_URL, body, { headers })
      const text = extractOutputText(resp.data)

      if (!text) {
        console.error(
          "OpenAI Responses empty output. Raw payload:",
          JSON.stringify(resp.data),
        )
        throw new Error("Empty output from OpenAI Responses API")
      }
      return { text }
    })
  } catch (err) {
    const detail = err?.response?.data || err?.message || "Unknown OpenAI error"
    console.error("OpenAI Responses error:", detail)
    throw err
  }
}

export const chatgptReply = async (_message, messages, _lastres) => {
  return generateCompletion(messages)
}
