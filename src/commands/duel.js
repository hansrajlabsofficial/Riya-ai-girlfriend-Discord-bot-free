import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('duel')
  .setDescription('Challenge another user to a high-stakes RPG Wager Duel!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user you want to duel')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Wager amount per player')
      .setRequired(true));

export const execute = async (interaction) => {
  const opponent = interaction.options.getUser('user');
  const bet = interaction.options.getInteger('bet');
  const challenger = interaction.user;

  if (opponent.id === challenger.id) return interaction.reply({ content: '❌ You cannot duel yourself!', ephemeral: true });
  if (opponent.bot) return interaction.reply({ content: '🤖 You cannot duel a bot!', ephemeral: true });
  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Duel is $100!', ephemeral: true });

  const cDoc = await getUserData(challenger.id, interaction.guildId);
  const oDoc = await getUserData(opponent.id, interaction.guildId);

  if (getBalance(cDoc) < bet) return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  if (getBalance(oDoc) < bet) return interaction.reply({ content: `❌ **${opponent.username}** does not have **${formatMoney(bet)}** in their wallet!`, ephemeral: true });

  const acceptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('duel_accept').setLabel(`⚔️ Accept Wager Duel (${formatMoney(bet)})`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('duel_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger)
  );

  const initEmbed = new EmbedBuilder()
    .setTitle('⚔️ RPG Wager Duel Challenge')
    .setColor('#FF4500')
    .setDescription(`**${challenger.username}** challenges **${opponent.username}** to an RPG Duel!\n\n**Wager Pot:** ${formatMoney(bet * 2)} (${formatMoney(bet)} each)\n\n**${opponent.username}**, do you accept this duel?`)
    .setFooter({ text: 'Riya AI Girlfriend • Wager RPG Duel' });

  const msg = await interaction.reply({ content: `<@${opponent.id}>`, embeds: [initEmbed], components: [acceptRow], fetchReply: true });

  const filter = i => i.user.id === opponent.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'duel_decline') {
      return i.update({ content: `❌ **${opponent.username}** declined the duel offer.`, embeds: [], components: [] });
    }

    const freshC = await getUserData(challenger.id, interaction.guildId);
    const freshO = await getUserData(opponent.id, interaction.guildId);

    if (getBalance(freshC) < bet || getBalance(freshO) < bet) {
      return i.update({ content: '❌ Duel canceled! One of the players lacks required funds.', embeds: [], components: [] });
    }

    await deductBalance(freshC, bet);
    await deductBalance(freshO, bet);

    // Calculate Duel combat based on Strength, Defense, Agility, Luck
    const cAtk = 15 + ((freshC.attributes?.strength || 1) * 5) + ((freshC.attributes?.luck || 1) * 2);
    const cDef = (freshC.attributes?.defense || 1) * 3;
    const cAgility = (freshC.attributes?.agility || 1);

    const oAtk = 15 + ((freshO.attributes?.strength || 1) * 5) + ((freshO.attributes?.luck || 1) * 2);
    const oDef = (freshO.attributes?.defense || 1) * 3;
    const oAgility = (freshO.attributes?.agility || 1);

    let cHp = 100;
    let oHp = 100;
    let combatLog = '';

    for (let round = 1; round <= 5; round++) {
      if (cHp <= 0 || oHp <= 0) break;

      // Challenger hits Opponent
      if (Math.random() > oAgility * 0.02) {
        const dmgToO = Math.max(8, cAtk - oDef + Math.floor(Math.random() * 10));
        oHp -= dmgToO;
        combatLog += `🗡️ **Round ${round}:** ${challenger.username} strikes ${opponent.username} for **${dmgToO} DMG**!\n`;
      } else {
        combatLog += `💨 **Round ${round}:** ${opponent.username} dodged ${challenger.username}'s strike!\n`;
      }

      if (oHp <= 0) break;

      // Opponent hits Challenger
      if (Math.random() > cAgility * 0.02) {
        const dmgToC = Math.max(8, oAtk - cDef + Math.floor(Math.random() * 10));
        cHp -= dmgToC;
        combatLog += `🪓 **Round ${round}:** ${opponent.username} counters for **${dmgToC} DMG**!\n`;
      } else {
        combatLog += `💨 **Round ${round}:** ${challenger.username} dodged ${opponent.username}'s counter!\n`;
      }
    }

    const winner = cHp > oHp ? challenger : opponent;
    const winnerDoc = winner.id === challenger.id ? freshC : freshO;
    const totalPot = bet * 2;

    await addBalance(winnerDoc, totalPot);
    await freshC.save();
    await freshO.save();

    const duelEmbed = new EmbedBuilder()
      .setTitle(`🏆 DUEL CHAMPION: ${winner.username}!`)
      .setColor('#00FF7F')
      .setDescription(`**COMBAT LOG:**\n${combatLog}\n\n🎉 **VICTOR:** <@${winner.id}>\n💰 **Wager Pot Won:** ${formatMoney(totalPot)}`)
      .setFooter({ text: 'Riya AI Girlfriend • High Stakes RPG Duel' });

    await i.update({ content: null, embeds: [duelEmbed], components: [] });
  });
};
