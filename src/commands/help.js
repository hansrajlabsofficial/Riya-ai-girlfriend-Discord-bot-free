import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ApplicationIntegrationType, InteractionContextType } from 'discord.js';

const CATEGORIES = {
  anime_card: {
    label: '🎴 Anime Card Collection (Karuta Style)',
    value: 'anime_card',
    description: '160,000+ Anime Collectible Cards, Drops, Grabs, Wishlists & Trades',
    commands: [
      { name: '/card_drop', desc: 'Drop a set of 4 anime cards with interactive 1️⃣2️⃣3️⃣4️⃣ grab buttons.' },
      { name: '/card_view <code>', desc: 'View high-res card image, print #, condition & owner details.' },
      { name: '/card_collection [user]', desc: 'Inspect your or another user\'s collected anime cards.' },
      { name: '/card_wishlist [action] [character]', desc: 'Manage your waifu/husbando wishlist.' },
      { name: '/card_burn <code>', desc: 'Destroy a card to extract Gold cash & Dust resources.' },
      { name: '/card_trade <user> <your_code> <their_code>', desc: 'Trade anime cards with another player.' },
      { name: '/card_lookup <character>', desc: 'Search anime character database & drop stats.' }
    ]
  },
  rpg: {
    label: '⚔️ RPG Combat & Attributes',
    value: 'rpg',
    description: 'Stats, Health, PvP Battles, Dungeon Raids & Robbery',
    commands: [
      { name: '/attributes', desc: 'Upgrade Strength, Defense, Agility, and Luck stats.' },
      { name: '/health [user]', desc: 'Inspect current & max Health Points (HP).' },
      { name: '/cd [user]', desc: 'Check active cooldown timers for explore, mine, dungeon, rob.' },
      { name: '/attack <user>', desc: 'Attack another player in quick PvP combat.' },
      { name: '/battle', desc: 'Enter the turn-based PvP Battle Arena.' },
      { name: '/rob <user>', desc: 'Rob wallet cash from target player (50% fine on failure!).' }
    ]
  },
  exploration: {
    label: '🌍 Exploration, Mining & Fishing',
    value: 'exploration',
    description: 'Adventure, Ore Mining, Fishing Simulator, Crafting & Trading',
    commands: [
      { name: '/fish', desc: 'Cast your line to catch fish, ocean creatures or scavenge treasures.' },
      { name: '/sell [category]', desc: 'Open Fish Market counter with interactive buttons to liquidate catches.' },
      { name: '/givefish <target> <name>', desc: 'Gift a caught fish or sea creature from your creel to a friend.' },
      { name: '/explore', desc: 'Embark on adventure to loot coins, XP, potions & rare items.' },
      { name: '/mine', desc: 'Mine caverns for Copper, Iron, Gold, and Diamond Gems.' },
      { name: '/dungeon', desc: 'Raid dungeon bosses for epic loot (50% HP penalty on defeat!).' },
      { name: '/craft [item]', desc: 'Forge swords, shields, armor & potions at Riya\'s Forge.' },
      { name: '/trade <user> <amount>', desc: 'Initiate a secure player-to-player trade.' },
      { name: '/bulksell', desc: 'Bulk-sell raw ores, gems & exploration loot for cash.' }
    ]
  },
  casino: {
    label: '🎰 Casino & Gambling Minigames',
    value: 'casino',
    description: 'Blackjack, Slots, Mines, Crash, War, Cups, Stack, Chance & Race',
    commands: [
      { name: '/blackjack <bet>', desc: 'Play 21 vs dealer with interactive Hit/Stand buttons.' },
      { name: '/slots <bet>', desc: 'Spin 3-reel slot machine for jackpot payouts.' },
      { name: '/mines <bet>', desc: 'Uncover gems on 5x5 minefield grid. Cash out before bombs!' },
      { name: '/crash <bet>', desc: 'Rocket multiplier game. Cash out before rocket explodes!' },
      { name: '/war <bet>', desc: 'Casino High-Card War vs Riya the Dealer.' },
      { name: '/cups <bet>', desc: 'Shell game! Pick 1 of 3 cups to find the hidden ball (2.5x payout).' },
      { name: '/stack <bet>', desc: 'Stack skyscraper blocks for higher payout multipliers.' },
      { name: '/chance <bet> <win_percent>', desc: 'Customizable odds bet (10% to 90% win chance).' },
      { name: '/horseracing <bet> <horse>', desc: 'Bet on a live animated 4-horse derby race.' },
      { name: '/coinflip <bet> <side>', desc: 'Flip a coin on Heads or Tails.' },
      { name: '/roulette <bet> <choice>', desc: 'Bet on Red, Black, Green or numbers.' }
    ]
  },
  wager: {
    label: '🧠 Multiplayer Wager Games',
    value: 'wager',
    description: 'Tic-Tac-Toe, Duel, Connect Four & Tactical Grid Chase',
    commands: [
      { name: '/catchme <user> [bet]', desc: 'Tactical 1v1 Grid Chase: Runner (🏃) vs Hunter (🚔) on 5x5 board.' },
      { name: '/ttt <user> <bet>', desc: 'Wager Tic-Tac-Toe match on 3x3 button grid.' },
      { name: '/duel <user> <bet>', desc: 'Wager RPG combat duel between two players.' },
      { name: '/c4 <user> <bet>', desc: 'Wager Connect Four match on 7-column grid.' }
    ]
  },
  gang: {
    label: '🛡️ Gang Syndicate System',
    value: 'gang',
    description: 'Gang Creation, Vault Deposits/Withdrawals & Ranks',
    commands: [
      { name: '/gang create <name>', desc: 'Create a new gang syndicate.' },
      { name: '/gang info', desc: 'View gang details, members, vault balance & multipliers.' },
      { name: '/gang deposit <amount>', desc: 'Deposit wallet coins into Gang Bank Vault.' },
      { name: '/gang withdraw <amount>', desc: 'Withdraw coins from Gang Vault (Leaders/Officers).' },
      { name: '/gang invite <user>', desc: 'Invite another player to join your gang.' }
    ]
  },
  banking: {
    label: '💸 Banking & Economy Suite',
    value: 'banking',
    description: 'Wallet, Bank Card, Transfers, Requests & Stipends',
    commands: [
      { name: '/bank_balance', desc: 'View Bank Balance & Visual Relationship Card graphic.' },
      { name: '/wallet [user]', desc: 'Inspect wallet cash, net worth & financial stats.' },
      { name: '/bank [user]', desc: 'View bank savings & custom visual PNG bank card.' },
      { name: '/deposit <amount>', desc: 'Transfer cash safely from wallet into bank vault.' },
      { name: '/withdraw <amount>', desc: 'Transfer savings from bank vault into wallet cash.' },
      { name: '/pay <user> <amount>', desc: 'Transfer cash directly to another player.' },
      { name: '/ask <user> <amount>', desc: 'Request money from a player with Accept/Refuse buttons.' },
      { name: '/weekly', desc: 'Claim weekly allowance ($50,000 + 500 XP).' },
      { name: '/vote', desc: 'Claim vote bonus ($25,000 + 250 XP).' },
      { name: '/daily', desc: 'Claim daily bonus coins & relationship XP.' },
      { name: '/account [user]', desc: 'View account creation & server join info.' },
      { name: '/profile [user]', desc: 'View complete player card with level, XP & partner.' },
      { name: '/inventory [user]', desc: 'View owned items, gear & gifts.' },
      { name: '/shop', desc: 'Browse general item store.' },
      { name: '/transactions', desc: 'View recent transaction logs.' },
      { name: '/add_bank_balance <amount> <user>', desc: 'Bot Owner command to add coins to users.' }
    ]
  },
  relationship: {
    label: '💖 Relationship & Dating',
    value: 'relationship',
    description: 'Virtual Dates, Hugs, Kisses, Gifts & Leaderboard',
    commands: [
      { name: '/date', desc: 'Virtual date simulation with Riya (Costs $10,000).' },
      { name: '/kiss [user]', desc: 'Send a romantic kiss (Costs $500).' },
      { name: '/hug [user]', desc: 'Send a warm hug (Costs $200).' },
      { name: '/gift', desc: 'Buy & send gifts (Diamond Ring, Red Flower, Teddy Bear).' },
      { name: '/friend', desc: 'Add friends & view friendship relationship levels.' },
      { name: '/stats [user]', desc: 'Inspect relationship level, mood state & memories.' },
      { name: '/leaderboard', desc: 'View top XP leaderboard & Daily Partner.' },
      { name: '/daily_quiz', desc: 'Daily relationship trivia question ($10,000 + 100 XP).' },
      { name: '/daily_task', desc: 'Complete daily quest for bonus rewards.' }
    ]
  },
  minigames: {
    label: '🎮 Minigames & Auto Channels',
    value: 'minigames',
    description: 'RPS, Guessing, Trivia & Auto Channel Quizzes',
    commands: [
      { name: '/rps <choice>', desc: 'Play Rock-Paper-Scissors (+XP & +$5,000 Cash).' },
      { name: '/guess <number>', desc: 'Number guessing game 1-10 (+XP & +$10,000 Cash).' },
      { name: '/guessthenumber', desc: 'Guild-wide number guessing game.' },
      { name: '/triviaquiz', desc: 'General knowledge trivia quiz.' },
      { name: '/connectfour', desc: 'Play Connect Four minigame.' },
      { name: '/memory', desc: 'Memory card matching game.' },
      { name: '/emojiquiz', desc: 'Auto-channel Emoji Quiz setup & controls.' },
      { name: '/antonymquiz', desc: 'Auto-channel Antonym Quiz setup & controls.' },
      { name: '/counting', desc: 'Auto-channel Counting Game setup & controls.' }
    ]
  },
  social: {
    label: '💬 Social & Fun Suite',
    value: 'social',
    description: 'Ship, Aura, 8Ball, WYR, Bestie, Compliments & Roasts',
    commands: [
      { name: '/ship <user>', desc: 'Calculate love compatibility % with Re-Roll button.' },
      { name: '/aura [user]', desc: 'Discover aura color & energy score!' },
      { name: '/8ball <question>', desc: 'Magic 8-Ball predictions.' },
      { name: '/wyr', desc: 'Would You Rather voting game.' },
      { name: '/bestie <user>', desc: 'Calculate friendship bond score.' },
      { name: '/compliment [user]', desc: 'Send a sweet wholesome compliment.' },
      { name: '/roast [user]', desc: 'Serve a hilarious, playful roast.' },
      { name: '/fight <user>', desc: 'Comical slapstick brawl.' },
      { name: '/pet [user]', desc: 'Give cute headpats to a user.' },
      { name: '/slap [user]', desc: 'Slap another user playfully.' }
    ]
  },
  settings: {
    label: '⚙️ Bot Config & Info',
    value: 'settings',
    description: 'Channel Binding, Settings, Language & About',
    commands: [
      { name: '/delete <amount> [user]', desc: 'Bulk delete messages from the current channel (1-100).' },
      { name: '/clear <amount> [user]', desc: 'Bulk clear/purge messages from the current channel (1-100).' },
      { name: '/download <type> <platform> <url>', desc: 'Download Video or Image from Instagram, YouTube, or TikTok.' },
      { name: '/setup_autodownload <channel> [status]', desc: 'Configure channel for automatic media downloads.' },
      { name: '/welcome <channel|message|second_message|banner|test>', desc: 'Configure onboarding welcome channel, greeting, second message & banner.' },
      { name: '/select_channel <channel>', desc: 'Bind Riya\'s primary chat channel.' },
      { name: '/setup_region_roles', desc: 'Deploy Region Selection auto-roles panel with buttons & world map.' },
      { name: '/setup_games_roles', desc: 'Deploy Self Game Roles panel with buttons, emojis & game templates.' },
      { name: '/setup_global', desc: 'Configure Inter-Server Global Chat relay channel.' },
      { name: '/settings', desc: 'Configure server settings & game toggles.' },
      { name: '/language', desc: 'Change bot output language.' },
      { name: '/status', desc: '24/7 Live bot online status, uptime, connected servers & dashboard link.' },
      { name: '/about', desc: 'View information & version of Riya Bot.' },
      { name: '/help [category]', desc: 'Display this complete command directory.' }
    ]
  }
};

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Displays the complete directory of all slash commands including Anime Cards!')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
  .addStringOption(option =>
    option.setName('category')
      .setDescription('Filter commands by category')
      .setRequired(false)
      .addChoices(
        { name: '🎴 Anime Card Collection (Karuta Style)', value: 'anime_card' },
        { name: '⚔️ RPG Combat & Attributes', value: 'rpg' },
        { name: '🌍 Exploration & Mining', value: 'exploration' },
        { name: '🎰 Casino & Gambling', value: 'casino' },
        { name: '🧠 Multiplayer Wagers', value: 'wager' },
        { name: '🛡️ Gang Syndicate System', value: 'gang' },
        { name: '💸 Banking & Economy', value: 'banking' },
        { name: '💖 Relationship & Dating', value: 'relationship' },
        { name: '🎮 Minigames & Auto Channels', value: 'minigames' },
        { name: '💬 Social & Fun', value: 'social' },
        { name: '⚙️ Bot Config & Info', value: 'settings' }
      ));

export const execute = async (interaction) => {
  const selectedCat = interaction.options.getString('category');

  const buildSelectMenu = (currentVal = 'overview') => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_select')
      .setPlaceholder('📌 Select a category to view command details...')
      .addOptions([
        { label: '📖 Overview & Category Directory', value: 'overview', description: 'Show all command categories summary' },
        ...Object.values(CATEGORIES).map(cat => ({
          label: cat.label,
          value: cat.value,
          description: cat.description,
          default: cat.value === currentVal
        }))
      ])
  );

  const buildLinkRow = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🌐 Open Web Dashboard & Server Settings')
      .setStyle(ButtonStyle.Link)
      .setURL('https://riya-ai-girlfriend-discord-bot-full.vercel.app/')
  );

  const buildCategoryEmbed = (catKey) => {
    const cat = CATEGORIES[catKey];
    if (!cat) return null;

    const embed = new EmbedBuilder()
      .setTitle(`📖 ${cat.label}`)
      .setColor('#FF69B4')
      .setDescription(`*${cat.description}*\n\nHere are all **${cat.commands.length} commands** in this category:`)
      .setFooter({ text: 'Riya AI Girlfriend • Works with both Slash (/) and Prefix (x or k!)' });

    for (const cmd of cat.commands) {
      embed.addFields({ name: `\`${cmd.name}\``, value: cmd.desc, inline: false });
    }

    return embed;
  };

  const buildOverviewEmbed = () => new EmbedBuilder()
    .setTitle('📖 Riya AI Girlfriend - Master Commands Directory (Slash & Prefix x)')
    .setColor('#FF1493')
    .setDescription(
      'Welcome to Riya\'s official command directory! Featuring the brand new **🎴 Anime Card Collection System (Karuta Style)**!\n\n' +
      '✨ **Dual Command Support**: All 82 commands work via both **Slash Commands (`/`)** and **Text Prefix (`x` or `k!`)** (e.g., `xhelp`, `xdrop`, `xdaily`, `xbank_balance`, `xdate`, `xkiss`, `xhug`, `xantonymquiz`, etc.)!\n\n' +
      'Use the dropdown menu below or `/help category:<choice>` / `xhelp` to inspect details for any category:'
    )
    .addFields(
      Object.values(CATEGORIES).map(cat => ({
        name: cat.label,
        value: `*${cat.commands.length} Commands* • ${cat.description}`,
        inline: true
      }))
    )
    .setFooter({ text: 'Riya AI Girlfriend • 82 Commands • Prefix: x or k!' });

  let initialEmbed = selectedCat ? buildCategoryEmbed(selectedCat) : buildOverviewEmbed();
  if (!initialEmbed) initialEmbed = buildOverviewEmbed();

  const msg = await interaction.reply({
    embeds: [initialEmbed],
    components: [buildSelectMenu(selectedCat || 'overview'), buildLinkRow()],
    fetchReply: true
  });

  const collector = msg.createMessageComponentCollector({ time: 180000 });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: '❌ Use `/help` to open your own interactive menu!', ephemeral: true });
    }

    const val = i.values[0];
    let newEmbed;

    if (val === 'overview') {
      newEmbed = buildOverviewEmbed();
    } else {
      newEmbed = buildCategoryEmbed(val);
    }

    await i.update({ embeds: [newEmbed], components: [buildSelectMenu(val), buildLinkRow()] });
  });

  collector.on('end', () => {
    interaction.editReply({ components: [buildLinkRow()] }).catch(() => {});
  });
};
