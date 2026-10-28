import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('memory')
  .setDescription('Play an interactive emoji memory matching card game!');

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor('#9400D3')
      .setTitle('🧠 Emoji Memory Matching Game')
      .setDescription('Flip cards below to match pairs of emojis and win **+$5,000 Cash** and XP!')
      .setFooter({ text: 'You have 45 seconds.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mem_card_1').setLabel('❓ Card 1').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('mem_card_2').setLabel('❓ Card 2').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('mem_card_3').setLabel('❓ Card 3').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('mem_card_4').setLabel('❓ Card 4').setStyle(ButtonStyle.Secondary)
    );

    const memMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('mem_card_');
    const collector = memMsg.createMessageComponentCollector({ filter, time: 45000 });

    collector.on('collect', async i => {
      await addBalance(userDoc, 5000);
      await saveUserData(userDoc);
      await i.reply({ content: '🎉 **MATCH FOUND!** You flipped 💖 & 💖! You won **+$5,000 Cash**! 💸✨' });
      collector.stop();
    });

  } catch (error) {
    logger.error('Error executing /memory command:', error);
    await interaction.reply({ content: '❌ Failed to start memory game.', ephemeral: true });
  }
};
