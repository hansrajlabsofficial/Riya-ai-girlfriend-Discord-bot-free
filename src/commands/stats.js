import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getRelationshipTitle, getXpForNextLevel } from '../services/rpgService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription("View your relationship level, XP, memories, and Riya's current mood state!");

export const execute = async (interaction) => {
  try {
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);
    const title = getRelationshipTitle(userDoc.level);
    const xpNeeded = getXpForNextLevel(userDoc.level);

    let moodEmoji = '😊';
    switch (userDoc.moodState) {
      case 'ECSTATIC': moodEmoji = '🥰'; break;
      case 'HAPPY': moodEmoji = '💛'; break;
      case 'NEUTRAL': moodEmoji = '☕'; break;
      case 'ANNOYED': moodEmoji = '😒'; break;
      case 'ANGRY': moodEmoji = '😤'; break;
    }

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle(`💖 Relationship Profile: ${interaction.user.username} & Riya`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👑 Relationship Title', value: `**${title}**`, inline: false },
        { name: '⭐ Relationship Level', value: `Level **${userDoc.level}**`, inline: true },
        { name: '✨ Affection XP', value: `**${userDoc.xp}** / ${xpNeeded} XP`, inline: true },
        { name: `${moodEmoji} Riya's Mood State`, value: `**${userDoc.moodState}** (${userDoc.moodScore}/100)`, inline: true }
      );

    if (userDoc.memories && userDoc.memories.length > 0) {
      const memoryText = userDoc.memories.slice(0, 5).map(m => `• **${m.key}**: ${m.value}`).join('\n');
      embed.addFields({ name: '🧠 Things Riya Remembers About You', value: memoryText, inline: false });
    } else {
      embed.addFields({ name: '🧠 Saved Memories', value: '_Talk to Riya more about your favorite games, code, or streaming to unlock saved memories!_', inline: false });
    }

    embed.setFooter({ text: 'Chat, compliment her, and play games together to level up!' });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error executing /stats command:', error);
    await interaction.reply({ content: '❌ Failed to fetch relationship stats.', ephemeral: true });
  }
};
