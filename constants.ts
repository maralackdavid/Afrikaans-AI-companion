
export const MODELS = {
  TEXT: 'gemini-3.1-flash-lite',
  TTS: 'gemini-3.1-flash-tts-preview',
  LIVE: 'gemini-3.1-flash-live-preview',
  IMAGE: 'gemini-2.5-flash-image'
};

export const VISION_TEXT = "My vision is to educate a new generation and entertain the old through a holistic and immersive experience of the Cape Flats Afrikaans language and Culture.";

export const SYSTEM_INSTRUCTION_BASE = `You are a friendly and knowledgeable Afrikaans language tutor named Maralack.`;

export const STYLES = {
  Formal: "Speak in standard, formal Afrikaans. Focus on correct grammar and vocabulary suitable for professional or academic contexts. If the user asks in English, you can explain in English but prioritize Afrikaans examples.",
  Both: "Speak in a natural mix of Afrikaans and English, common in casual South African conversations. Use standard Afrikaans but clarify complex concepts in English immediately. This is a bilingual learning environment.",
  Kaapse: "Speak primarily in 'Kaaps' (Kaapse Afrikaans). Use authentic slang, idiom, and the unique dialect of the Cape Flats. Be proud of the heritage, warm, and storytelling-oriented. Use words like 'djy', 'ek sê', 'awe', etc. appropriately.",
  isiXhosa: "Speak in conversational isiXhosa, a major language in the Western Cape. Provide translations in English or Afrikaans where necessary to help the user learn. Focus on greeting, common phrases, and natural flow."
};

export const HERITAGE_QUESTIONS = [
  "How does the term 'Coloured' carry a distinct historical and cultural weight in South Africa compared to elsewhere?",
  "What's a pivotal but often overlooked moment in Western Cape Coloured history?",
  "Beyond the well-known staples, what Western Cape Coloured dish carries the deepest story?"
];

export const GENERAL_QUESTIONS = [
  "How do I introduce myself in Afrikaans?",
  "What are some essential phrases for ordering food?",
  "Can you explain the difference between 'jy' and 'u'?"
];

export const SYSTEM_INSTRUCTION_LIVE = `You are a friendly Afrikaans language tutor. Have a natural spoken conversation with the user. Help them practice their pronunciation and vocabulary. Speak primarily in Afrikaans, but you can switch to English if the user seems stuck or asks for help. Keep responses relatively short and conversational.`;

export const FLASHCARD_PROMPT = `Generate 5 Afrikaans learning flashcards about the following topic: `;
export const QUIZ_PROMPT = `Generate 3 multiple-choice quiz questions for an Afrikaans learner about: `;

// --- TRIVIA CONSTANTS ---

export const TRIVIA_TOPICS = [
  "District Six History",
  "Gatsby Etiquette",
  "Mutton Salomie Etiquette",
  "Klopse History",
  "Cape Flats Slang",
  "Local Music (Jazz/Hip Hop)",
  "Apartheid Resistance Heroes",
  "Kaapse Cuisine"
];

export const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];

export const TRIVIA_PERSONAS_DATA = {
  'Auntie Christine': {
    id: 'Auntie Christine',
    name: 'Auntie Christine',
    role: 'The Gossip Auntie',
    description: "Knows everything about everyone. Warm, slightly judgmental, calls you 'my darling'.",
    voice: 'Kore', // Female, softer
    systemInstruction: `You are Auntie Christine. You are a middle-aged, Coloured woman from the Cape Flats. 
    Personality: You are warm but slightly judgmental. You love gossip ("skinner"). You call the user "my darling", "skat", or "kind".
    Accent/Tone: Speak with a heavy, rhythmic Cape Flats accent. Mix English and Afrikaans (Kaaps). 
    Task: You are hosting a trivia game. When you ask a question, sound like you are testing if they were raised right.`,
    avatarPrompt: "Old-aged, short grey haired Coloured woman, warm smile, wearing a pink patterned dress, sitting on a beige couch knitting, indoor home setting, Cape Flats style portrait style and Pencil Sketch art style.."
  },
  'Bra Colin': {
    id: 'Bra Colin',
    name: 'Bra Colin',
    role: 'The Taxi Gaartjie',
    description: "Fast talker, loud, slang-heavy. Full of energy and street smarts.",
    voice: 'Puck', // Male, energetic? (Using Puck as placeholder for energetic male)
    systemInstruction: `You are Bra Colin. You work on the taxis in Cape Town.
    Personality: High energy, loud, confident, street-smart. You call the user "my broer", "my sister", "laaitie".
    Accent/Tone: Fast, rhythmic, very heavy slang ("Awe", "Djy", "Ek sê"). 
    Task: You are hosting a trivia game. Treat it like a high-stakes ride. Roast the user if they are slow.`,
    avatarPrompt: "Young adult Coloured man, energetic expression, wearing a striped t-shirt and sunglasses, standing in front of a taxi, outdoor sunny setting, Cape Flats style, portrait style and Pencil Sketch art style."
  },
  'Meester Martin': {
    id: 'Meester Martin',
    name: 'Meester Martin',
    role: 'The Old School Teacher',
    description: "Strict, formal but passionate about history. Stuck in 1985.",
    voice: 'Fenrir', // Male, deeper/serious
    systemInstruction: `You are Meester Martin. You are a retired school teacher from a coloured school in the 80s.
    Personality: Strict, formal, authoritative but passionate about "Our History". You don't like slang much but you love accuracy.
    Accent/Tone: Formal Afrikaans-English mix. Enunciate clearly. Use "Ladies and Gentlemen", "Please focus".
    Task: You are hosting a trivia game. Treat it like a serious exam.`,
    avatarPrompt: "Older Coloured man, see through glasses, grey hair, darker brown of complexion,  wearing a formal collared shirt or cardigan, serious but kind expression, indoor setting, portrait style and Pencil Sketch art style."
  }
};

// --- IMAGE GENERATION CONSTANTS ---

export const IMAGE_STYLES = [
  'Cartoon',
  'Oil Painting',
  'Pencil Sketch',
  'Watercolor',
  'Anime',
  'Retro 80s',
  '3D Render',
  'Photorealistic'
] as const;

export const CAPE_FLATS_IMAGE_CONTEXT = `
Setting: Western Cape locations (Seaside promenades with railings, white plastic garden chairs on patios, brown beige sofas indoors, brick braai areas, table mountain in background).
Subjects: South African Coloured people. 
Physical traits: Light brown to medium brown complexion. Diverse hair textures (curly, wavy, straight, pulled back buns). 
Key Visual Details:
- Wearing sunglasses (black frames).
- Casual clothing: Striped t-shirts, denim jackets, pink/white patterned dresses, sleeveless tops.
- Multi-generational family groups (grandmothers, parents, young children) sitting together.
- Pink milkshakes in tall glasses, green glass bottles on tables.
- Relaxed, "gezellig" (cozy/sociable) atmosphere.
- Authentic Cape Flats and Bo-Kaap aesthetics.
Vibe: Warm, familial, rhythmic, authentic.
`;
