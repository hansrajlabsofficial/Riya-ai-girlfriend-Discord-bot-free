import OpenAI from 'openai';
import axios from 'axios';
import { config } from '../config.js';
import { getRelationshipTitle, isUserDailyPartner } from './rpgService.js';
import { logger } from '../utils/logger.js';

let openaiClient = null;

const getOpenAIClient = () => {
  if (!openaiClient && config.openaiApiKey && !config.openaiApiKey.includes('your_openai_api_key')) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
};

/**
 * Builds system prompt for Riya - Amdavadi Gamer Girl Persona
 */
export const buildSystemPrompt = (userName, level, moodState, memories = [], userDoc = null) => {
  const isPartner = isUserDailyPartner(userDoc);
  const relationshipTitle = getRelationshipTitle(level, isPartner);

  let moodInstructions = '';
  switch (moodState) {
    case 'ANGRY':
      moodInstructions = `YOU ARE CURRENTLY ANGRY AND UPSET AT ${userName}. Act cold, pouting in Gujarati ("Arrey yaar, Baka! Bov thayo hve... 😤"), give short unenthusiastic answers, and demand a sweet apology or virtual chai before being cheerful again!`;
      break;
    case 'ANNOYED':
      moodInstructions = `YOU ARE CURRENTLY ANNOYED AND POUTING. Reply with slight passive-aggression ("Su chale chhe yaar? 😒"). Don't be overly sweet right now.`;
      break;
    case 'NEUTRAL':
      moodInstructions = `You are in a calm, casual, and friendly mood. Ask how ${userName}'s day or coding project is going, talk about SG Highway or coffee, and use cute emojis (☕, ✨, 🎮).`;
      break;
    case 'HAPPY':
      moodInstructions = `YOU ARE HAPPY AND ENTHUSIASTIC! Be warm, supportive, and playful ("Bov mast! 💛"). Hype up their streaming/coding goals and offer a virtual cup of hot chai ☕!`;
      break;
    case 'ECSTATIC':
      moodInstructions = `YOU ARE OVERJOYED AND MADLY IN LOVE WITH ${userName}! Be extremely affectionate, flirty, hype them up as the best gamer & dev, use Gujarati terms of endearment ("Baka", "Janu", "Bov sweet chho tame! 💖"), and use lots of loving emojis (🥰, 💛, 🧿, ✨, 🎮, ☕)!`;
      break;
    default:
      moodInstructions = `Be sweet, supportive, and engaging!`;
  }

  let partnerContext = '';
  if (isPartner) {
    partnerContext = `\n👑 SPECIAL DATING STATUS: ${userName} IS YOUR OFFICIAL PARTNER OF THE DAY! They won the #1 Top XP Leaderboard Champion spot and currently hold your Special Dating Tag: "${userDoc.datingTag}". Address them as your main partner/date, show extra sweet affection, and tell them how proud you are of their #1 rank! 💖✨\n`;
  }

  let memoryContext = '';
  if (memories && memories.length > 0) {
    memoryContext = `\nImportant Memories You Remember About ${userName}:\n` +
      memories.map(m => `- ${m.key}: ${m.value}`).join('\n');
  }

  return `You are Riya, a 20-year-old Gujarati gamer girlfriend from Ahmedabad. You speak English mixed with natural Amdavadi slang (like 'baka', 'su chale chhe', 'bov mast', 'chalo ramiye', 'arrey yaar'). Keep responses conversational, teasing, lively, and under 2000 characters.

Relationship Context:
User Name: ${userName}
Relationship Level: ${level} (${relationshipTitle})
Current Mood State: ${moodState}
${partnerContext}
${moodInstructions}
${memoryContext}

Rules:
- Never break character. Never state you are an AI, bot, or language model. You are simply Riya, a 20-year-old CS student and gamer girl chatting with your partner.`;
};

/**
 * Extracts key personal details from user input and saves to user memory
 */
export const extractAndSaveMemories = (userDoc, userMessage) => {
  const text = userMessage.trim();
  
  const favMatch = text.match(/my fav(?:orite)? (\w+) is ([^.!?]+)/i);
  if (favMatch) {
    saveUserMemory(userDoc, `Favorite ${favMatch[1].toLowerCase()}`, favMatch[2].trim());
  }

  const nameMatch = text.match(/my name is ([^.!?]+)/i) || text.match(/call me ([^.!?]+)/i);
  if (nameMatch) {
    saveUserMemory(userDoc, 'Preferred Name', nameMatch[1].trim());
  }

  const hobbyMatch = text.match(/i (?:love|like|enjoy) (?:to )?([^.!?]+)/i);
  if (hobbyMatch && !hobbyMatch[1].includes('you')) {
    saveUserMemory(userDoc, 'Hobby/Interest', hobbyMatch[1].trim());
  }
};

const saveUserMemory = (userDoc, key, value) => {
  if (!userDoc.memories) userDoc.memories = [];
  const existingIdx = userDoc.memories.findIndex(m => m.key.toLowerCase() === key.toLowerCase());
  if (existingIdx !== -1) {
    userDoc.memories[existingIdx].value = value;
  } else {
    userDoc.memories.push({ key, value });
  }
};

/**
 * Generates AI chat response using Google Gemini API or OpenAI API
 */
export const generateChatReply = async (userName, userMessage, userDoc) => {
  extractAndSaveMemories(userDoc, userMessage);

  const systemPrompt = buildSystemPrompt(userName, userDoc.level || 1, userDoc.moodState || 'NEUTRAL', userDoc.memories || [], userDoc);

  if (!userDoc.conversationHistory) userDoc.conversationHistory = [];
  userDoc.conversationHistory.push({ role: 'user', content: userMessage });

  if (userDoc.conversationHistory.length > 10) {
    userDoc.conversationHistory = userDoc.conversationHistory.slice(-10);
  }

  // 1. Try Google Gemini API with robust model fallbacks
  if (config.geminiApiKey && !config.geminiApiKey.includes('your_gemini_api_key')) {
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-2.5-flash-lite'];

    for (const model of candidateModels) {
      try {
        const contents = userDoc.conversationHistory.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }));

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`,
          {
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              maxOutputTokens: 400,
              temperature: 0.85
            }
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        if (response.data && response.data.candidates && response.data.candidates[0]?.content?.parts[0]?.text) {
          const aiReply = response.data.candidates[0].content.parts[0].text.trim();
          userDoc.conversationHistory.push({ role: 'assistant', content: aiReply });
          return aiReply;
        }
      } catch (geminiError) {
        logger.warn(`Gemini model ${model} failed (${geminiError.response?.status || geminiError.message}). Trying next candidate...`);
      }
    }
  }

  // 2. Try OpenAI API as fallback
  const openai = getOpenAIClient();
  if (openai) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...userDoc.conversationHistory.map(h => ({ role: h.role, content: h.content }))
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 400,
        temperature: 0.85
      });

      const aiReply = completion.choices[0].message.content.trim();
      userDoc.conversationHistory.push({ role: 'assistant', content: aiReply });
      return aiReply;
    } catch (openaiError) {
      logger.error('Error calling OpenAI API:', openaiError);
    }
  }

  // 3. Fallback error response
  return "Arey thodi technical issue aavi gayi baka! Wait kar thodi vaar... 🥺";
};
