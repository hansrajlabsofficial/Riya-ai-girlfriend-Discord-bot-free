import { SlashCommandBuilder, EmbedBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription('Get information about Riya AI Girlfriend & Minigames Bot')
  .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
  .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);

export const execute = async (interaction) => {
  const ping = interaction.client.ws.ping;
  const guildCount = interaction.client.guilds.cache.size;

  const embed = new EmbedBuilder()
    .setColor('#FF1493')
    .setTitle('👩🏻‍❤️‍👩🏻 About Riya — AI Girlfriend & Minigames Bot')
    .setDescription(
      `Kem chhe! I am **Riya**, a 20-year-old CS student & competitive gamer from Ahmedabad! ☕🎮✨\n\n` +
      `Powered by **Google Gemini API**, **Firebase Firestore**, and **Discord.js v14**.`
    )
    .addFields(
      { name: '📡 Latency', value: `\`${ping} ms\``, inline: true },
      { name: '🌐 Guilds Connected', value: `\`${guildCount} Servers\``, inline: true },
      { name: '👑 Creator & Studio', value: 'HL.Hansraj Labs', inline: true },
      { name: '💖 Key Features', value: 'AI Chatting, RPG Relationship Leveling, Bank Balance Economy, Gift Shop, Daily Quiz/Task, Connect Four, Counting, TicTacToe, Emoji Quiz, Antonym Quiz!' }
    )
    .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

  await interaction.reply({ embeds: [embed] });
};
