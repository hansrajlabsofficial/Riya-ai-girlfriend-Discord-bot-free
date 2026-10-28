import { logger } from './logger.js';

/**
 * Normalizes a role string by stripping emojis, symbols, brackets, and extra spaces
 */
export const normalizeRoleName = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ') // emoji range
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // replace symbols and punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Smart role finder that thoroughly checks existing server roles before creating anything
 */
export const findExistingGuildRole = async (guild, item, explicitVal = null) => {
  if (!guild) return null;

  // 1. Ensure all roles are fetched into cache from Discord API
  try {
    if (!guild.roles.cache || guild.roles.cache.size <= 1) {
      await guild.roles.fetch();
    }
  } catch (err) {
    logger.warn(`Could not fetch guild roles for guild ${guild.id}: ${err.message}`);
  }

  const roles = guild.roles.cache;

  // 2. Check explicit value (Role ID or exact Name from raw_json or command option)
  if (explicitVal) {
    const cleanId = String(explicitVal).replace(/[<@&>]/g, '').trim();
    const byId = roles.get(cleanId);
    if (byId) return byId;

    const byName = roles.find(r => r.name.toLowerCase() === cleanId.toLowerCase());
    if (byName) return byName;
  }

  // 3. Exact name or label match
  const targetName = (item.name || '').toLowerCase();
  const targetLabel = (item.label || '').toLowerCase();

  const exact = roles.find(r => {
    const rName = r.name.toLowerCase();
    return rName === targetName || (targetLabel && rName === targetLabel);
  });
  if (exact) return exact;

  // 4. Normalized string match (ignores emojis, prefixes, symbols like ┃, |, etc.)
  const normTargetName = normalizeRoleName(targetName);
  const normTargetLabel = normalizeRoleName(targetLabel);

  const normalizedMatch = roles.find(r => {
    const normR = normalizeRoleName(r.name);
    if (!normR) return false;
    return (normTargetName && normR === normTargetName) || 
           (normTargetLabel && normR === normTargetLabel);
  });
  if (normalizedMatch) return normalizedMatch;

  // 5. Aliases match
  if (item.aliases && Array.isArray(item.aliases)) {
    for (const alias of item.aliases) {
      const normAlias = normalizeRoleName(alias);
      if (!normAlias) continue;

      const aliasMatch = roles.find(r => {
        const normR = normalizeRoleName(r.name);
        return normR === normAlias || normR.includes(normAlias);
      });
      if (aliasMatch) return aliasMatch;
    }
  }

  // 6. Substring containment match (e.g. "Minecraft" in "⛏️ Minecraft", or "Free Fire" in "🔫 Free Fire")
  const subMatch = roles.find(r => {
    const normR = normalizeRoleName(r.name);
    if (!normR || normR.length < 3) return false;

    if (normTargetLabel && (normR.includes(normTargetLabel) || normTargetLabel.includes(normR))) {
      return true;
    }
    if (normTargetName && (normR.includes(normTargetName) || normTargetName.includes(normR))) {
      return true;
    }
    return false;
  });
  if (subMatch) return subMatch;

  return null;
};
