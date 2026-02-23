const dicebear = (style, seed) =>
  `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}`;

const HUMAN_STYLE = "avataaars";
const BOT_STYLE = "bottts";

// Random seed generator
const randSeed = () => Math.random().toString(36).slice(2);

/**
 * Generates avatar options for users.
 */
export const generateAvatar = ({ count = 6 } = {}) => {
  const data = [];

  for (let i = 0; i < count; i++) {
    data.push(dicebear(HUMAN_STYLE, randSeed()));
  }

  return data;
};

/**
 * Stable robot avatar for Interactive AI Partner
 * (used in Contact.js)
 */
export const aiPartnerAvatarUrl = (seed = "interactive-ai-partner") =>
  dicebear(BOT_STYLE, seed);
