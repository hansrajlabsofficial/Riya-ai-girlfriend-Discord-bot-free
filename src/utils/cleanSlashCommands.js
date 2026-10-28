import { REST, Routes, Client, GatewayIntentBits } from 'discord.js';
import { config } from '../config.js';
import { loadAllCommands } from './commandLoader.js';

const cleanSlashCommands = async () => {
  const token = (config.discordToken || '').trim().replace(/^["']|["']$/g, '');
  const clientId = (config.clientId || '').trim();

  if (!token || !clientId) {
    console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in environment!');
    process.exit(1);
  }

  const { commandsJSON } = await loadAllCommands();
  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`📡 Cleanly registering ${commandsJSON.length} global slash commands...`);

  try {
    // 1. Overwrite Global Commands with single clean set
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandsJSON }
    );
    console.log('✅ Global slash commands updated cleanly!');

    // 2. Fetch all guilds bot belongs to and clear per-guild commands
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(token);

    for (const [guildId, guild] of client.guilds.cache) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: [] }
        );
        console.log(`✅ Cleared duplicate per-guild slash commands for guild: ${guild.name} (${guildId})`);
      } catch (err) {
        console.error(`⚠️ Failed to clear per-guild commands for ${guildId}:`, err.message);
      }
    }

    client.destroy();
    console.log('🎉 ALL DOUBLE COMMAND DUPLICATES SUCCESSFULLY REMOVED AND CLEANED UP!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error cleaning slash commands:', err);
    process.exit(1);
  }
};

cleanSlashCommands();
