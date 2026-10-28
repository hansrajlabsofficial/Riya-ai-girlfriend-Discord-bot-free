import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getCardByCode, deleteCardFromDb } from '../services/cardService.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('card_burn')
  .setDescription('Destroy an anime card in your collection to extract Gold & Dust!')
  .addStringOption(option =>
    option.setName('code')
      .setDescription('4-character card code of the card to burn')
      .setRequired(true));

export const execute = async (interaction) => {
  const code = interaction.options.getString('code').toLowerCase().trim();
  const user = interaction.user;

  const card = await getCardByCode(code);
  if (!card) {
    return interaction.reply({ content: `❌ Card \`${code}\` was not found.`, ephemeral: true });
  }

  if (card.ownerId !== user.id) {
    return interaction.reply({ content: `❌ You do not own card \`${code}\`!`, ephemeral: true });
  }

  // Calculate burn yield matching Image 3 mockup (Gold + Dust)
  const goldReward = Math.floor(Math.random() * 200) + 100; // 100 to 300 Gold
  const dustReward = card.stars === '★★★★' ? 2 : 1;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('burn_confirm').setLabel('🔥 Confirm Burn').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('burn_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder()
    .setTitle('🔥 Burn Card Confirmation')
    .setColor('#FF4500')
    .setThumbnail(card.image)
    .setDescription(`**<@${user.id}>**, you will receive:\n\n💰 **${formatMoney(goldReward)}**\n✨ **${dustReward} Dust** (\`${card.stars}\`)\n\n*Are you sure you want to permanently burn card \`${card.code}\` (**${card.character}**)?*`)
    .setFooter({ text: 'Karuta-style Card Burn Engine' });

  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === user.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

  collector.on('collect', async i => {
    if (i.customId === 'burn_cancel') {
      return i.update({ content: '❌ Burn canceled.', embeds: [], components: [] });
    }

    await deleteCardFromDb(code);
    const userDoc = await getUserData(user.id, interaction.guildId);
    await addBalance(userDoc, goldReward);
    await userDoc.save();

    const successEmbed = new EmbedBuilder()
      .setTitle('🔥 CARD INCINERATED!')
      .setColor('#00FF7F')
      .setDescription(`Card \`${code}\` (**${card.character}**) was burned into ash!\n\n**Gained:** ${formatMoney(goldReward)} & ${dustReward} Dust!`)
      .setFooter({ text: 'Riya AI Girlfriend • Card Burn Complete' });

    await i.update({ embeds: [successEmbed], components: [] });
  });
};
