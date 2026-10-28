import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { fetchGif } from '../services/tenorService.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addXp } from '../services/rpgService.js';
import { getBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('kiss')
  .setDescription('Give a romantic kiss to Riya or another user! (Costs $500)')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user you want to kiss (leave empty to kiss Riya)')
      .setRequired(false)
  );

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const KISS_COST = 500;
    if (!await deductBalance(userDoc, KISS_COST)) {
      const currentBalance = getBalance(userDoc);
      return await interaction.reply({
        content: `❌ **Insufficient Bank Balance!** A kiss costs **$500**, but your current balance is **${formatMoney(currentBalance)}**!\n\nEarn cash by chatting, or completing \`/daily_quiz\`, \`/daily_task\`, \`/rps\`, or \`/guess\`! 💋💸`,
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('user') || interaction.client.user;
    const isBot = targetUser.id === interaction.client?.user?.id;
    const gifUrl = await fetchGif('anime kiss');

    let messageText = '';
    if (isBot) {
      if ((userDoc.moodState === 'ANGRY' || userDoc.moodState === 'ANNOYED') && userDoc.level < 5) {
        return await interaction.reply({
          content: `❌ Riya leans back with a pout: *"Arrey Baka! I'm still upset with you! You need to apologize or get me chai first!"* 😤☕`,
          ephemeral: true
        });
      }

      addXp(userDoc, 35);
      userDoc.moodScore = Math.min(100, (userDoc.moodScore || 50) + 10);
      await saveUserData(userDoc);
      messageText = `<@${interaction.user.id}> gently kisses Riya on the cheek! Riya blushes bright red: *"Bov sweet chho tame Baka!"* 💋💖🧿 (+35 Affection XP)`;
    } else {
      messageText = `<@${interaction.user.id}> gives <@${targetUser.id}> a sweet kiss! 💋✨`;
    }

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setDescription(messageText);

    if (gifUrl) embed.setImage(gifUrl);

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error executing /kiss:', error);
    await interaction.reply({ content: '❌ Could not perform kiss.', ephemeral: true });
  }
};
