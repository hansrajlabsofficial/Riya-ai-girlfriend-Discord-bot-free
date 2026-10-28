import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getCardByCode, saveCardToDb } from '../services/cardService.js';

export const data = new SlashCommandBuilder()
  .setName('card_trade')
  .setDescription('Trade anime cards with another user!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user you want to trade cards with')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('your_card')
      .setDescription('Card code of the card you are offering')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('their_card')
      .setDescription('Card code of the card you want from them')
      .setRequired(true));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user');
  const yourCode = interaction.options.getString('your_card').toLowerCase().trim();
  const theirCode = interaction.options.getString('their_card').toLowerCase().trim();
  const sender = interaction.user;

  if (target.id === sender.id) return interaction.reply({ content: '❌ You cannot trade cards with yourself!', ephemeral: true });
  if (target.bot) return interaction.reply({ content: '🤖 Bots cannot trade cards!', ephemeral: true });

  const c1 = await getCardByCode(yourCode);
  const c2 = await getCardByCode(theirCode);

  if (!c1) return interaction.reply({ content: `❌ Your card \`${yourCode}\` was not found.`, ephemeral: true });
  if (!c2) return interaction.reply({ content: `❌ Target card \`${theirCode}\` was not found.`, ephemeral: true });

  if (c1.ownerId !== sender.id) return interaction.reply({ content: `❌ You do not own card \`${yourCode}\`!`, ephemeral: true });
  if (c2.ownerId !== target.id) return interaction.reply({ content: `❌ **${target.username}** does not own card \`${theirCode}\`!`, ephemeral: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('trade_accept').setLabel('✅ Accept Transfer').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('trade_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setTitle('🔄 Karuta Card Trade Request')
    .setColor('#AA00FF')
    .setDescription(
      `**<@${sender.id}>** offers:\n\`${c1.code}\` • \`${c1.stars}\` • \`#${c1.print}\` • **${c1.series}** · **${c1.character}**\n\n` +
      `↕️ **IN EXCHANGE FOR** ↕️\n\n` +
      `**<@${target.id}>**'s:\n\`${c2.code}\` • \`${c2.stars}\` • \`#${c2.print}\` • **${c2.series}** · **${c2.character}**\n\n` +
      `**<@${target.id}>**, click Accept below to confirm the swap!`
    )
    .setImage(c1.image)
    .setFooter({ text: 'Karuta-style Card Transfer Engine' });

  const msg = await interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === target.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'trade_decline') {
      return i.update({ content: `❌ **${target.username}** declined the card trade.`, embeds: [], components: [] });
    }

    // Swap owners!
    c1.ownerId = target.id;
    c2.ownerId = sender.id;

    await saveCardToDb(c1);
    await saveCardToDb(c2);

    const successEmbed = new EmbedBuilder()
      .setTitle('🎉 CARD TRANSFER ACCEPTED!')
      .setColor('#00FF7F')
      .setDescription(`Card trade completed successfully!\n\n**${sender.username}** received \`${c2.code}\` (**${c2.character}**)\n**${target.username}** received \`${c1.code}\` (**${c1.character}**)`)
      .setFooter({ text: 'Card swap saved to collection!' });

    await i.update({ content: null, embeds: [successEmbed], components: [] });
  });
};
