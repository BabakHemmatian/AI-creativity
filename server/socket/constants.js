export const AI_UID = process.env.AI_UID || ""
export const SESSION_TIME = process.env.SESSION_TIME || 120
export const MATCH_CONDITION = process.env.MATCH_CONDITION || "ALL"
export const NON_REPLY_PROMPT =
  process.env.NON_REPLY_PROMPT || "Could you elaborate?"

export const DEFAULT_SESSION = {
  ended: true,
  isMatching: false,
  types: [],
  items: [],
  currentI: -1,
  matchedUser: null,
  currentList: null,
  currentChatRoom: null,
  disconnecttime: new Date(),
}
