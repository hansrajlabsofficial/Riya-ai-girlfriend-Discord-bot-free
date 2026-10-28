import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('aura')
  .setDescription('Reveal your glowing aura status and energy level!');

export const execute = async (interaction) => {
  const auras = [
    { level: '~20%', title: '🌑 Shadow Aura', color: '#333333', desc: 'Mysterious, subtle energy shrouded in dark shadow.' },
    { level: '~40%', title: '🟢 Emerald Life Aura', color: '#00FF7F', desc: 'Vibrant, restorative natural aura radiating growth.' },
    { level: '~60%', title: '🔵 Azure Sky Aura', color: '#1E90FF', desc: 'Calm, focused, high-intellect spiritual aura.' },
    { level: '~80%', title: '🟣 Royal Violet Aura', color: '#8A2BE2', desc: 'Powerful, majestic energy emitting pure cosmic power!' },
    { level: '~90%', title: '🟡 Golden Sun Aura', color: '#FFD700', desc: 'Blinding divine warmth radiating supreme confidence!' },
    { level: '~100%', title: '🔥 OVER 9000 GODLIKE AURA', color: '#FF1493', desc: 'Legendary radiant aura overflowing with ultimate power!' }
  ];

  const randomAura = auras[Math.floor(Math.random() * auras.length)];

  const embed = new EmbedBuilder()
    .setColor(randomAura.color)
    .setTitle(`🔥 ${interaction.user.username}'s Aura Discovery`)
    .setDescription(
      `✨ **Aura Intensity:** **${randomAura.level}**\n` +
      `🔮 **Aura Type:** **${randomAura.title}**\n\n` +
      `*${randomAura.desc}*`
    )
    .setFooter({ text: 'Riya Aura Sensing Engine 🔥' });

  const btn = new ButtonBuilder()
    .setCustomId('aura_discover')
    .setLabel('Discover Your Aura! 🔥')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(btn);

  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

  const filter = i => i.user.id === interaction.user.id && i.customId === 'aura_discover';
  const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    const nextAura = auras[Math.floor(Math.random() * auras.length)];
    embed.setColor(nextAura.color)
      .setDescription(
        `✨ **Aura Intensity:** **${nextAura.level}**\n` +
        `🔮 **Aura Type:** **${nextAura.title}**\n\n` +
        `*${nextAura.desc}*`
      );
    await i.update({ embeds: [embed] });
  });
};
