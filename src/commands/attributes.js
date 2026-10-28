import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';

export const data = new SlashCommandBuilder()
  .setName('attributes')
  .setDescription('Upgrade your character stat attributes (Strength, Defense, Agility, Luck)');

export const execute = async (interaction) => {
  const userDoc = await getUserData(interaction.user.id, interaction.guildId);
  const attrs = userDoc.attributes || { strength: 1, defense: 1, agility: 1, luck: 1 };

  const embed = new EmbedBuilder()
    .setColor('#FF1493')
    .setTitle(`⚔️ ${interaction.user.username}'s RPG Character Attributes`)
    .setDescription('Upgrade your character stats to boost your combat and RPG skills!')
    .addFields(
      { name: '💪 Strength (ATK)', value: `**Level ${attrs.strength}** (+${attrs.strength * 5} Damage)`, inline: true },
      { name: '🛡️ Defense (DEF)', value: `**Level ${attrs.defense}** (+${attrs.defense * 3} Armor)`, inline: true },
      { name: '⚡ Agility (Dodge)', value: `**Level ${attrs.agility}** (+${attrs.agility * 2}% Dodge)`, inline: true },
      { name: '🍀 Luck (Crit/Loot)', value: `**Level ${attrs.luck}** (+${attrs.luck * 2}% Crit Rate)`, inline: true }
    )
    .setFooter({ text: 'Upgrade cost: 500 XP per point' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('attr_up_str').setLabel('+ STR').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('attr_up_def').setLabel('+ DEF').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('attr_up_agi').setLabel('+ AGI').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('attr_up_lck').setLabel('+ LCK').setStyle(ButtonStyle.Primary)
  );

  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('attr_up_');
  const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

  collector.on('collect', async i => {
    const type = i.customId.replace('attr_up_', '');
    const statKey = type === 'str' ? 'strength' : type === 'def' ? 'defense' : type === 'agi' ? 'agility' : 'luck';

    if ((userDoc.xp || 0) < 500) {
      return await i.reply({ content: '❌ You need at least **500 XP** to upgrade a stat attribute!', ephemeral: true });
    }

    userDoc.xp -= 500;
    userDoc.attributes[statKey] += 1;
    await saveUserData(userDoc);

    await i.reply({ content: `✅ Successfully upgraded **${statKey.toUpperCase()}** to **Level ${userDoc.attributes[statKey]}**! ⚔️` });
    collector.stop();
  });
};
