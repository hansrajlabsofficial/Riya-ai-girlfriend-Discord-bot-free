import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchGif } from '../services/tenorService.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addXp } from '../services/rpgService.js';
import { getBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('date')
  .setDescription('Initiate an interactive text-based virtual date with Riya! (Costs $10,000)');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const DATE_COST = 10000;
    if (!await deductBalance(userDoc, DATE_COST)) {
      const currentBalance = getBalance(userDoc);
      return await interaction.reply({
        content: `❌ **Insufficient Bank Balance!** A romantic date with Riya costs **$10,000**, but your current balance is **${formatMoney(currentBalance)}**!\n\nEarn cash by chatting, or completing \`/daily_quiz\`, \`/daily_task\`, \`/rps\`, or \`/guess\`! 💸☕`,
        ephemeral: true
      });
    }

    if (userDoc.moodState === 'ANGRY') {
      return await interaction.reply({
        content: `❌ Riya folds her arms: *"Arrey Baka! I'm too upset with you right now for a date! Apologize to me first!"* 😤☕`,
        ephemeral: true
      });
    }

    const gifUrl = await fetchGif('date');

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('☕ Romantic Date with Riya in Ahmedabad')
      .setDescription(`Riya dresses up in a stylish outfit and meets you at a rooftop cafe near SG Highway overlooking the glowing city lights.\n\n*"Kem chhe, Baka! Where should we go for our hangout next?"*`)
      .setImage(gifUrl)
      .setFooter({ text: 'Choose your date activity below!' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('date_choice_riverfront').setLabel('🌊 Riverfront Walk & Chai').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('date_choice_arcade').setLabel('🎮 FPS Gaming Arcade').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('date_choice_watchparty').setLabel('🍿 Anime Watch Party').setStyle(ButtonStyle.Secondary)
    );

    const dateMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('date_choice_');
    const collector = dateMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      let outcomeText = '';
      let bonusXp = 50;

      if (i.customId === 'date_choice_riverfront') {
        bonusXp = 80;
        outcomeText = `🌊 Walking along Sabarmati Riverfront under the midnight lights, Riya held your hand while sipping hot chai: *"This is bov mast, Baka... best evening ever!"* ☕💖🧿 (+80 Affection XP!)`;
      } else if (i.customId === 'date_choice_arcade') {
        bonusXp = 75;
        outcomeText = `🎮 You duo-played arcade shooter games! Riya got top score on the leaderboard and bragged: *"Told you I'm carrying the team, Baka!"* Hehe! 🎮🔥 (+75 Affection XP!)`;
      } else {
        bonusXp = 70;
        outcomeText = `🍿 Cozied up together watching Solo Leveling & Demon Slayer on Discord! Riya quoted anime lines and smiled happily! 💛✨ (+70 Affection XP!)`;
      }

      const xpResult = addXp(userDoc, bonusXp);
      userDoc.moodScore = Math.min(100, (userDoc.moodScore || 50) + 15);
      await saveUserData(userDoc);

      let finalMsg = outcomeText;
      if (xpResult.leveledUp) {
        finalMsg += `\n🎊 **LEVEL UP!** You are now **Relationship Level ${xpResult.newLevel}**!`;
      }

      await i.reply({ content: finalMsg });
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        await interaction.followUp({ content: '⏰ Date time expired!', ephemeral: true }).catch(() => {});
      }
    });

  } catch (error) {
    logger.error('Error executing /date command:', error);
    await interaction.reply({ content: '❌ Failed to start virtual date.', ephemeral: true });
  }
};
