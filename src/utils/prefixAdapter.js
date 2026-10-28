import { logger } from './logger.js';
import { loadAllCommands } from './commandLoader.js';
import { detectPlatform } from '../services/mediaDownloadService.js';

const COMMAND_ALIASES = {
  // Media Download
  'download': 'download',
  'dl': 'download',
  'ig': 'download',
  'insta': 'download',
  'instagram': 'download',
  'reel': 'download',
  'reels': 'download',
  'yt': 'download',
  'youtube': 'download',
  'shorts': 'download',
  'tt': 'download',
  'tiktok': 'download',

  // Anime Cards
  'drop': 'card_drop',
  'carddrop': 'card_drop',
  'view': 'card_view',
  'cardview': 'card_view',
  'v': 'card_view',
  'collection': 'card_collection',
  'cardcollection': 'card_collection',
  'cards': 'card_collection',
  'col': 'card_collection',
  'wishlist': 'card_wishlist',
  'cardwishlist': 'card_wishlist',
  'wl': 'card_wishlist',
  'burn': 'card_burn',
  'cardburn': 'card_burn',
  'trade': 'card_trade',
  'cardtrade': 'card_trade',
  'lookup': 'card_lookup',
  'cardlookup': 'card_lookup',

  // RPG & Stats
  'attr': 'attributes',
  'stats': 'attributes',
  'hp': 'health',
  'cooldown': 'cd',
  'cooldowns': 'cd',
  'pvp': 'battle',

  // Economy & Banking
  'bal': 'bank_balance',
  'balance': 'bank_balance',
  'bankbalance': 'bank_balance',
  'globalbank': 'globalbankbalance',
  'topbank': 'globalbankbalance',
  'globalbal': 'globalbankbalance',
  'globalbankbalance': 'globalbankbalance',
  'w': 'wallet',
  'dep': 'deposit',
  'with': 'withdraw',
  'p': 'profile',
  'inv': 'inventory',
  'store': 'market',
  'shop': 'market',
  'buyall': 'market',
  'sellall': 'market',

  // Casino & Games
  'bj': 'blackjack',
  'slot': 'slots',
  'minefield': 'mines',
  'horse': 'horseracing',
  'race': 'horseracing',
  'flip': 'coinflip',
  'cf': 'coinflip',
  'tictactoe': 'ttt',
  'connect4': 'c4',
  'connectfour': 'c4',
  'openbox': 'luckybox',
  'luckybox': 'luckybox',
  'box': 'luckybox',

  // Social & Dating
  'friends': 'friend',
  'lb': 'leaderboard',
  'top': 'leaderboard',
  'dailyquiz': 'daily_quiz',
  'dailytask': 'daily_task',
  'trivia': 'triviaquiz',
  'eightball': '8ball',

  // System & Config
  'clear': 'clear',
  'delete': 'delete',
  'purge': 'delete',
  'bind': 'select_channel',
  'config': 'settings',
  'lang': 'language',
  'info': 'about',
  'globalchat': 'setup_global',
  'setupglobal': 'setup_global',
  'setup_global': 'setup_global',
  'call': 'globalcall',
  'phone': 'globalcall',
  'hangup': 'globalcall',
  'globalcall': 'globalcall',
  'privatecall': 'globalprivatecall',
  'globalprivatecall': 'globalprivatecall',
  'xprivatecall': 'globalprivatecall',
  'privcall': 'globalprivatecall',
  'privhangup': 'globalprivatecall',
  'xprivhangup': 'globalprivatecall',
  'status': 'status',
  'xstatus': 'status',
  'botstatus': 'status',
  'uptime': 'status',
  'live': 'status'
};

function parseAmountToken(token) {
  if (!token) return null;
  const cleaned = token.toLowerCase().trim();
  if (/^\d+[kK]$/.test(cleaned)) {
    return parseInt(cleaned.slice(0, -1), 10) * 1000;
  }
  if (/^\d+[mM]$/.test(cleaned)) {
    return parseInt(cleaned.slice(0, -1), 10) * 1000000;
  }
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }
  return null;
}

export function createInteractionMock(message, commandName, args, commandModule) {
  let replyMessage = null;

  const mockOptions = {
    getSubcommand(required = true) {
      if (!args || args.length === 0) {
        return required ? null : undefined;
      }
      const potentialSub = args[0].toLowerCase();
      // Check if commandModule has subcommand choices or options
      const optionsDef = commandModule?.data?.options || [];
      const hasSubcommand = optionsDef.some(opt => opt.name === potentialSub || opt.type === 1);
      
      if (hasSubcommand || ['setchannel', 'removechannel', 'help', 'repair', 'create', 'info', 'deposit', 'withdraw', 'invite'].includes(potentialSub)) {
        return potentialSub;
      }
      return required ? args[0] : null;
    },
    getSubcommandGroup() {
      return null;
    },
    getString(name, required = false) {
      if (!args || args.length === 0) return null;

      // Special handling for download / media downloader options
      if (commandName === 'download') {
        const fullText = args.join(' ');
        const urlMatch = fullText.match(/(https?:\/\/[^\s]+)/i);
        const extractedUrl = urlMatch ? urlMatch[1] : null;

        if (name === 'url') {
          if (extractedUrl) return extractedUrl;
          return fullText.replace(/^url\s*:\s*/i, '').trim();
        }

        if (name === 'platform') {
          if (extractedUrl) {
            const detected = detectPlatform(extractedUrl);
            if (detected) return detected;
          }
          if (fullText.includes('instagram') || fullText.includes('insta')) return 'instagram';
          if (fullText.includes('youtube') || fullText.includes('youtu.be')) return 'youtube';
          if (fullText.includes('tiktok')) return 'tiktok';
          return 'instagram';
        }

        if (name === 'type') {
          if (fullText.toLowerCase().includes('image') || fullText.toLowerCase().includes('photo') || fullText.toLowerCase().includes('pic')) {
            return 'image';
          }
          return 'video';
        }
      }

      // If subcommand was used, string options might follow it
      const optionArgs = (args[0] && mockOptions.getSubcommand(false)) ? args.slice(1) : args;
      if (optionArgs.length === 0) return null;

      // Filter out user/channel mentions & numeric tokens
      const textTokens = optionArgs.filter(tok => !tok.startsWith('<@') && !tok.startsWith('<#') && !/^\d+$/.test(tok));
      if (textTokens.length > 0) {
        return textTokens.join(' ');
      }
      return optionArgs.join(' ');
    },
    getInteger(name, required = false) {
      if (!args || args.length === 0) return null;
      for (const arg of args) {
        if (!arg.startsWith('<@') && !arg.startsWith('<#')) {
          const val = parseAmountToken(arg);
          if (val !== null && !isNaN(val)) return val;
        }
      }
      return null;
    },
    getNumber(name, required = false) {
      if (!args || args.length === 0) return null;
      for (const arg of args) {
        if (!arg.startsWith('<@') && !arg.startsWith('<#')) {
          const val = parseFloat(arg);
          if (!isNaN(val)) return val;
        }
      }
      return null;
    },
    getUser(name, required = false) {
      const users = Array.from(message.mentions.users.values());
      if (name === 'user2' || name === 'target2' || name === 'user_two') {
        return users[1] || users[0] || null;
      }
      return users[0] || null;
    },
    getMember(name, required = false) {
      const members = Array.from(message.mentions.members?.values() || []);
      if (name === 'user2' || name === 'target2' || name === 'user_two') {
        if (members[1]) return members[1];
      }
      if (members[0]) return members[0];
      const targetUser = mockOptions.getUser(name, required);
      if (targetUser && message.guild) {
        return message.guild.members.cache.get(targetUser.id) || null;
      }
      return null;
    },
    getChannel(name, required = false) {
      return message.mentions.channels.first() || null;
    },
    getRole(name, required = false) {
      return message.mentions.roles?.first() || null;
    },
    getBoolean(name, required = false) {
      if (!args || args.length === 0) return null;
      const lower = args.join(' ').toLowerCase();
      if (lower.includes('true') || lower.includes('yes') || lower.includes('enable')) return true;
      if (lower.includes('false') || lower.includes('no') || lower.includes('disable')) return false;
      return null;
    }
  };

  const mockInteraction = {
    id: message.id,
    createdTimestamp: message.createdTimestamp,
    commandName,
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guildId,
    channel: message.channel,
    channelId: message.channel.id,
    client: message.client,
    replied: false,
    deferred: false,
    options: mockOptions,

    isCommand: () => true,
    isChatInputCommand: () => true,
    isButton: () => false,
    isStringSelectMenu: () => false,

    async reply(options) {
      if (mockInteraction.replied) return replyMessage;

      // Deduplication check: Check channel cache to see if our bot user already sent a reply referencing this message ID
      const botId = message.client?.user?.id;
      if (botId && message.channel?.messages?.cache) {
        const existingReply = message.channel.messages.cache.find(m => 
          m.author.id === botId && m.reference?.messageId === message.id
        );
        if (existingReply) {
          mockInteraction.replied = true;
          replyMessage = existingReply;
          return existingReply;
        }
      }

      try {
        let payload = options;
        if (typeof options === 'string') {
          payload = { content: options };
        }
        
        replyMessage = await message.reply(payload);
        mockInteraction.replied = true;
        return replyMessage;
      } catch (err) {
        logger.error(`Error replying in prefix mock interaction: ${err.message}`);
        throw err;
      }
    },

    async deferReply(options) {
      mockInteraction.deferred = true;
      await message.channel.sendTyping().catch(() => {});
      return null;
    },

    async editReply(options) {
      let payload = options;
      if (typeof options === 'string') {
        payload = { content: options };
      }
      if (replyMessage) {
        return await replyMessage.edit(payload);
      } else {
        return await mockInteraction.reply(payload);
      }
    },

    async followUp(options) {
      let payload = options;
      if (typeof options === 'string') {
        payload = { content: options };
      }
      return await message.channel.send(payload);
    },

    async deleteReply() {
      if (replyMessage) {
        await replyMessage.delete().catch(() => {});
      }
    },

    async fetchReply() {
      return replyMessage;
    }
  };

  return mockInteraction;
}

// In-memory set to prevent duplicate execution of prefix commands for the exact same message ID
const processedPrefixMessages = new Set();
const userPrefixDebounce = new Map();
const PREFIX_DEBOUNCE_MS = 1500;

export async function handlePrefixCommand(message) {
  const content = message.content.trim();
  if (!content || message.author.bot) return false;

  let prefixUsed = null;
  let rawWithoutPrefix = null;

  // Prefixes to support: 'k!', 'k ', 'x ', 'x', 'X ', 'X', '.'
  if (content.toLowerCase().startsWith('k!')) {
    prefixUsed = 'k!';
    rawWithoutPrefix = content.slice(2).trim();
  } else if (content.toLowerCase().startsWith('k ')) {
    prefixUsed = 'k';
    rawWithoutPrefix = content.slice(2).trim();
  } else if (content.toLowerCase().startsWith('x ')) {
    prefixUsed = 'x';
    rawWithoutPrefix = content.slice(2).trim();
  } else if (content.toLowerCase().startsWith('x') && content.length > 1) {
    // Check if 'x' is followed directly by a command name or alias
    prefixUsed = 'x';
    rawWithoutPrefix = content.slice(1).trim();
  } else if (content.startsWith('.') && content.length > 1) {
    prefixUsed = '.';
    rawWithoutPrefix = content.slice(1).trim();
  }

  if (!prefixUsed || !rawWithoutPrefix) return false;

  // Deduplication Check: Prevent double execution of the exact same message ID
  if (processedPrefixMessages.has(message.id)) {
    return true;
  }
  processedPrefixMessages.add(message.id);
  if (processedPrefixMessages.size > 500) {
    const firstItem = processedPrefixMessages.values().next().value;
    processedPrefixMessages.delete(firstItem);
  }

  // Cross-instance check: If channel cache already contains a reply from our bot to this message ID, abort
  const botId = message.client?.user?.id;
  if (botId && message.channel?.messages?.cache) {
    const existingReply = message.channel.messages.cache.find(m => 
      m.author.id === botId && m.reference?.messageId === message.id
    );
    if (existingReply) {
      logger.info(`Skipping duplicate command execution for message ${message.id} (already answered by another bot process)`);
      return true;
    }
  }

  // Per-User Execution Debounce (prevents rapid-fire duplicate prefix triggers)
  const now = Date.now();
  const lastExec = userPrefixDebounce.get(message.author.id) || 0;
  if (now - lastExec < PREFIX_DEBOUNCE_MS) {
    return true;
  }
  userPrefixDebounce.set(message.author.id, now);

  const parts = rawWithoutPrefix.split(/\s+/);
  const rawCmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const { commandsMap } = await loadAllCommands();

  // Resolve alias or canonical name
  const canonicalName = COMMAND_ALIASES[rawCmd] || rawCmd;
  const commandModule = commandsMap.get(canonicalName);

  if (!commandModule) {
    // If command doesn't exist and prefix was just single letter 'x' attached to a word (e.g. 'xray'), ignore so AI chat can handle
    if (prefixUsed === 'x' && !COMMAND_ALIASES[rawCmd] && !content.toLowerCase().startsWith('x ')) {
      return false;
    }
    await message.reply(`❓ Unknown command \`${rawCmd}\`. Type \`xhelp\` or \`/help\` to see all available commands! 💕`).catch(() => {});
    return true;
  }

  try {
    logger.info(`Executing prefix command '${canonicalName}' triggered by ${message.author.tag} (${message.author.id})`);
    const mockInteraction = createInteractionMock(message, canonicalName, args, commandModule);
    await commandModule.execute(mockInteraction);
    return true;
  } catch (err) {
    logger.error(`Error executing prefix command '${canonicalName}':`, err);
    await message.reply(`❌ Oops! An error occurred while executing \`${canonicalName}\`.`).catch(() => {});
    return true;
  }
}
