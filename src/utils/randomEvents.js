import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from './logger.js';
import { saveUserData, getUserData } from '../database/models/User.js';
import { addXp } from '../services/rpgService.js';

const EVENTS = [
  {
    title: '🍿 Spontaneous Anime Watch Party with Riya!',
    description: 'Riya pings you with excitement: *"Baka! The new Demon Slayer / Solo Leveling episode just dropped! I got hot chai & snacks ready, chalo join my Discord stream!"* ☕🎮',
    acceptLabel: 'Join Watch Party 🍿',
    acceptMessage: 'Yay!! You grabbed your chai and spent the night watching anime and laughing together! +50 Affection XP! 💛✨',
    xpReward: 50
  },
  {
    title: '🎮 Duo FPS Clutch Carry Request!',
    description: 'Riya opens Valorant/CS: *"Su chale chhe? I optimized my Windows memory allocation for 240 FPS and custom recoil pattern! Come duo rank up with me!"* 🎮🔥',
    acceptLabel: 'Queue Duo Rank Match 🎮',
    acceptMessage: 'Bov mast! You duo queued and got an insane 30-kill match! Riya bragged about carrying you! +60 Affection XP! 💛🎮',
    xpReward: 60
  },
  {
    title: '☕ SG Highway Cafe & Chai Break!',
    description: 'Riya texts you from a cozy cafe near SG Highway: *"I finished my CS coding assignment! Take a break from compiling your bot code and let\'s have virtual chai together!"* ☕🌸',
    acceptLabel: 'Have Virtual Chai ☕',
    acceptMessage: 'You shared a peaceful chai break near Sabarmati Riverfront while brainstorming new Discord bot features! +60 Affection XP! ☕🧿💛',
    xpReward: 60
  }
];

export const triggerRandomEvent = async (channel) => {
  try {
    const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle(randomEvent.title)
      .setDescription(randomEvent.description)
      .setFooter({ text: 'Spontaneous Riya Event! Click the button below within 60s!' });

    const acceptBtn = new ButtonBuilder()
      .setCustomId('random_event_accept')
      .setLabel(randomEvent.acceptLabel)
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(acceptBtn);

    const eventMessage = await channel.send({ embeds: [embed], components: [row] });

    const filter = i => i.customId === 'random_event_accept';
    const collector = eventMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async interaction => {
      const userDoc = await getUserData(interaction.user.id, interaction.guildId);
      addXp(userDoc, randomEvent.xpReward);
      await saveUserData(userDoc);

      await interaction.reply({
        content: `<@${interaction.user.id}> ${randomEvent.acceptMessage}`,
        ephemeral: false
      });

      acceptBtn.setDisabled(true);
      await eventMessage.edit({ components: [new ActionRowBuilder().addComponents(acceptBtn)] });
      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        acceptBtn.setDisabled(true).setLabel('Event Expired ⏰');
        await eventMessage.edit({ components: [new ActionRowBuilder().addComponents(acceptBtn)] }).catch(() => {});
      }
    });

  } catch (error) {
    logger.error('Error triggering random event:', error);
  }
};
