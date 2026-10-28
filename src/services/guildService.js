import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let cachedGuilds = null;
let lastFetchTime = 0;

export const DEFAULT_CONNECTED_GUILDS = [
  {
    id: '1205579847863369788',
    name: '⚡ VIP ARMY ┃ VIP BHAI',
    icon: 'https://cdn.discordapp.com/icons/1205579847863369788/70b8ada9bd0eb40ab23d559c92b1830f.png',
    memberCount: 169,
    owner: false
  },
  {
    id: '1275436284390674443',
    name: '🌐FG eSports🏆',
    icon: 'https://cdn.discordapp.com/icons/1275436284390674443/587f70373973667ff2f44e12b5a86554.png',
    memberCount: 5,
    owner: false
  },
  {
    id: '1361649010623910020',
    name: "Gamer's Galaxy",
    icon: 'https://cdn.discordapp.com/icons/1361649010623910020/2a3b15ccfe8adce32ce0554737a013e3.png',
    memberCount: 51,
    owner: false
  },
  {
    id: '1378386158685388920',
    name: 'GLOBAL HQ',
    icon: 'https://cdn.discordapp.com/icons/1378386158685388920/5ae888e8b96707ea289d9d90cbc7606b.png',
    memberCount: 16,
    owner: false
  },
  {
    id: '1388437540461346877',
    name: 'HANSRAJ AYAN OFFICIAL COMMUNITY',
    icon: 'https://cdn.discordapp.com/icons/1388437540461346877/dd6d7f9c887a210b7b624a8514cfe800.png',
    memberCount: 309,
    owner: false
  },
  {
    id: '1480210158348009704',
    name: 'XXXXXXXXXXXXXXXX',
    icon: 'https://cdn.discordapp.com/icons/1480210158348009704/ae23eda385a9e199d4ad94e481883bdc.png',
    memberCount: 9,
    owner: false
  },
  {
    id: '1517106528258097182',
    name: "HANSRAJxFPS's serverxxx",
    icon: 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png',
    memberCount: 7,
    owner: false
  }
];

export const getRealBotGuilds = async () => {
  const now = Date.now();
  if (cachedGuilds && (now - lastFetchTime < 60000)) {
    return cachedGuilds;
  }

  const token = config.discordToken || process.env.DISCORD_TOKEN;
  if (!token || token.includes('your_discord_bot_token')) {
    return DEFAULT_CONNECTED_GUILDS;
  }

  try {
    const response = await fetch('https://discord.com/api/v10/users/@me/guilds?with_counts=true', {
      headers: {
        'Authorization': `Bot ${token}`
      }
    });

    if (!response.ok) {
      logger.warn(`Discord API @me/guilds response status: ${response.status}`);
      return cachedGuilds || DEFAULT_CONNECTED_GUILDS;
    }

    const guilds = await response.json();
    cachedGuilds = guilds.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon 
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}`
        : 'https://cdn-icons-png.flaticon.com/512/2913/2913990.png',
      memberCount: g.approximate_member_count || 0,
      owner: g.owner,
      permissions: g.permissions
    }));

    lastFetchTime = now;
    logger.info(`Fetched ${cachedGuilds.length} real connected bot guilds from Discord REST API`);
    return cachedGuilds;
  } catch (err) {
    logger.warn(`Failed to fetch real bot guilds from Discord REST API: ${err.message}`);
    return cachedGuilds || DEFAULT_CONNECTED_GUILDS;
  }
};
