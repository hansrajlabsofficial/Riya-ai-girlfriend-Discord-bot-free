import { SlashCommandBuilder } from 'discord.js';
import { execute as executeDailyQuiz } from './daily_quiz.js';

export const data = new SlashCommandBuilder()
  .setName('triviaquiz')
  .setDescription('Starts a Triviaquiz')
  .addSubcommand(sub => sub.setName('start').setDescription('Starts a Triviaquiz'));

export const execute = async (interaction) => {
  return await executeDailyQuiz(interaction);
};
