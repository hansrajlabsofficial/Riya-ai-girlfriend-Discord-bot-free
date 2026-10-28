import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { ANIME_DATABASE, createNewCard, saveCardToDb } from '../services/cardService.js';

export const data = new SlashCommandBuilder()
  .setName('card_drop')
  .setDescription('Drop a set of 4 collectible anime cards in the channel!');

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);

  // Check 30-min cooldown
  const now = Date.now();
  const lastDrop = userDoc.cooldowns?.cardDrop || 0;
  if (now - lastDrop < 1800000) { // 30 minutes
    const remainingSec = Math.ceil((1800000 - (now - lastDrop)) / 1000);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    return interaction.reply({
      content: `⏳ Card drop on cooldown! You can drop again in **${mins}m ${secs}s**!`,
      ephemeral: true
    });
  }

  userDoc.cooldowns.cardDrop = now;
  await userDoc.save();

  // Pick 4 random anime characters
  const droppedCards = [];
  for (let i = 0; i < 4; i++) {
    const charData = ANIME_DATABASE[Math.floor(Math.random() * ANIME_DATABASE.length)];
    droppedCards.push(createNewCard(charData));
  }

  // Render cards summary embed matching Image 3 mockup
  let descText = `**${user.username} is dropping 4 cards!** 🎴\n\n`;
  droppedCards.forEach((c, idx) => {
    descText += `**[ ${idx + 1} ]** ${c.character} • *${c.series}*\n`;
  });
  descText += `\n*Click button 1️⃣, 2️⃣, 3️⃣, or 4️⃣ below to claim a card!*`;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('grab_0').setLabel('1️⃣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('grab_1').setLabel('2️⃣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('grab_2').setLabel('3️⃣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('grab_3').setLabel('4️⃣').setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle('🎴 Karuta-style Anime Card Drop!')
    .setColor('#FF69B4')
    .setDescription(descText)
    .setImage(droppedCards[0].image) // Preview first card image
    .setFooter({ text: 'Riya AI Girlfriend • Anime Collectibles Engine' });

  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const claimed = new Set();
  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    const idx = parseInt(i.customId.replace('grab_', ''));
    if (claimed.has(idx)) {
      return i.reply({ content: `❌ Card #${idx + 1} has already been claimed!`, ephemeral: true });
    }

    claimed.add(idx);
    const card = droppedCards[idx];
    card.ownerId = i.user.id;

    await saveCardToDb(card);

    const grabEmbed = new EmbedBuilder()
      .setTitle('🎉 CARD CLAIMED!')
      .setColor('#00FF7F')
      .setDescription(`**<@${i.user.id}>** took the **${card.character}** card \`${card.code}\`!\n\n**Condition:** \`${card.condition}\` condition!\n**Stars:** \`${card.stars}\` | **Print:** \`#${card.print}\``)
      .setThumbnail(card.image)
      .setFooter({ text: 'Card added to your /card_collection!' });

    await i.reply({ embeds: [grabEmbed] });
  });

  collector.on('end', () => {
    msg.edit({ components: [] }).catch(() => {});
  });
};
