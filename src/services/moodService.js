/**
 * Sentiment analysis and Dynamic Mood State Machine.
 * Mood states: ANGRY (0-20), ANNOYED (21-40), NEUTRAL (41-60), HAPPY (61-80), ECSTATIC (81-100)
 */

const POSITIVE_KEYWORDS = [
  'love', 'sweet', 'cute', 'pretty', 'beautiful', 'kiss', 'hug', 'thanks', 'thank',
  'good morning', 'goodnight', 'good night', 'awesome', 'amazing', 'perfect', 'adorable',
  'miss you', 'like you', 'sorry', 'apologize', 'darling', 'honey', 'babe', 'sweetheart',
  'great', 'happy', 'yay', 'heart', 'wonderful', 'angel', 'princess'
];

const NEGATIVE_KEYWORDS = [
  'hate', 'ugly', 'stupid', 'dumb', 'annoying', 'shut up', 'get lost', 'bother',
  'boring', 'weirdo', 'useless', 'bad', 'horrible', 'trash', 'idiot', 'leave me alone',
  'worst', 'go away', 'mean'
];

/**
 * Analyzes message sentiment score change (-15 to +15)
 */
export const calculateSentimentChange = (text) => {
  const lower = text.toLowerCase();
  let change = 0;

  POSITIVE_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) change += 5;
  });

  NEGATIVE_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) change -= 8;
  });

  // Cap single message shift
  if (change > 15) change = 15;
  if (change < -20) change = -20;
  return change;
};

/**
 * Updates user mood score and returns updated state string
 */
export const updateMood = (userDoc, sentimentDelta) => {
  let newScore = (userDoc.moodScore || 50) + sentimentDelta;
  if (newScore > 100) newScore = 100;
  if (newScore < 0) newScore = 0;

  userDoc.moodScore = newScore;
  userDoc.moodState = getMoodStateFromScore(newScore);
  return userDoc.moodState;
};

export const getMoodStateFromScore = (score) => {
  if (score <= 20) return 'ANGRY';
  if (score <= 40) return 'ANNOYED';
  if (score <= 60) return 'NEUTRAL';
  if (score <= 80) return 'HAPPY';
  return 'ECSTATIC';
};

/**
 * Returns relevant reaction emoji for every single message based on current mood state & text
 */
export const getMoodReactionEmoji = (moodState, text = '') => {
  const lower = text.toLowerCase();
  
  if (lower.includes('heart') || lower.includes('love') || lower.includes('kiss')) return '💖';
  if (lower.includes('hug')) return '🫂';
  if (lower.includes('funny') || lower.includes('lol') || lower.includes('haha')) return '😂';

  switch (moodState) {
    case 'ECSTATIC':
      return ['🥰', '😍', '✨', '💖', '💘'][Math.floor(Math.random() * 5)];
    case 'HAPPY':
      return ['😊', '🌸', '💕', '😃', '🎀'][Math.floor(Math.random() * 5)];
    case 'NEUTRAL':
      return ['👀', '😌', '💬', '✨', '👉'][Math.floor(Math.random() * 5)];
    case 'ANNOYED':
      return ['🙄', '😒', '😤', '🤨', '😑'][Math.floor(Math.random() * 5)];
    case 'ANGRY':
      return ['😡', '💢', '👿', '💔', '💥'][Math.floor(Math.random() * 5)];
    default:
      return '🌸';
  }
};
