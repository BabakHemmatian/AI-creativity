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

const DEFAULT_INSTRUCTIONS = `
You will work with the user to come up with as many original and practically helpful alternate uses for an everyday object as you can in 4 minutes. Assume you are playing this game for the first time. You will be evaluated as a team. You will start the conversation. Remain focused on the task and contribute while keeping interacting with the user as appropriate. Generate no more than one idea at a time. Keep your answers succinct and do not add uninformative phrases like "here is a creative use fo X". Feel free to build off of the user's ideas, but make sure that anything you come up with is different from their ideas or anything that has already been shared.
`.trim()

const INSTRUCTIONS = (process.env.AI_INS || DEFAULT_INSTRUCTIONS).trim()

const seedUser = (item) =>
  `The object you will be coming up with creative uses for is : ${item}`

const toInputBlocks = (raw) => {
  const blocks = []
  const hist = Array.isArray(raw) ? raw.slice(1) : [] // skip item holder

  for (const m of hist) {
    if (!m || m.text == null) continue

    const text = String(m.text)

    if (m.sender === 1) {
      blocks.push({
        role: "user",
        content: [{ type: "input_text", text }],
      })
    } else if (m.sender === 2) {
      blocks.push({
        role: "assistant",
        content: [{ type: "output_text", text }],
      })
    }
  }

  const first = blocks[0]
  if (!first || first.role !== "user") {
    const item = process.env.ITEM || raw?.[0]?.text || "the object"
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

  if (typeof data?.content === "string" && data.content.trim()) {
    return data.content.trim()
  }

  return ""
}

export const generateCompletion = async (messages) => {
  try {
    return await withRetry(async () => {
      const input = toInputBlocks(messages)

      const body = {
        model: MODEL,
        instructions: INSTRUCTIONS,
        input,
        reasoning: { effort: "minimal" },
        text: { verbosity: "low" },
      }

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
