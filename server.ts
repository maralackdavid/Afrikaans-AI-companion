
import express from "express";
import path from "path";
// import { createServer as createViteServer } from "vite"; // Removed for dynamic import
import { GoogleGenAI, Type, Modality, GenerateVideosOperation } from "@google/genai";
import { WebSocketServer } from "ws";
import http from "http";

// We'll import constants but since server runs in Node, we need to be careful with paths
// For simplicity and robustness in this bundled environment, I'll redefine the critical ones 
// or import them if they are clean.
import { MODELS, SYSTEM_INSTRUCTION_BASE } from "./constants";

const app = express();
// const port = process.env.PORT || 3000; // Moved to startServer
const server = http.createServer(app);

app.use(express.json({ limit: '50mb' }));

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// --- API ROUTES ---

app.post("/api/gemini/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  
  let langLabel = 'English';
  if (targetLang === 'af' || targetLang === 'formal' || targetLang === 'Formal') {
     langLabel = 'Formal Afrikaans';
  } else if (targetLang === 'kaapse' || targetLang === 'Kaapse') {
     langLabel = 'Kaapse Afrikaans (Western Cape slang style)';
  } else if (targetLang === 'xh' || targetLang === 'isixhosa' || targetLang === 'isiXhosa') {
     langLabel = 'isiXhosa';
  }
  
  const prompt = `Translate the following text into natural, accurate ${langLabel}. Only return the translation itself, no explanations, no extra surrounding quotes, and no formatting.\n\nText: "${text}"`;
  
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
    });
    res.json({ translation: response.text?.trim() || "" });
  } catch (error: any) {
    console.error("Translation API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/tts", async (req, res) => {
  const { text, voiceName } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("TTS API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/variations", async (req, res) => {
  const { text } = req.body;
  const prompt = `Analyze the following text: "${text}".
  Provide translations/variations in the requested languages:
  1. 'formal': Standard, formal Afrikaans (Hoofafrikaans).
  2. 'kaapse': Western Cape slang (Kaapse Afrikaans/Kaaps).
  3. 'english': The English translation.
  4. 'isixhosa': The isiXhosa translation.
  
  Ensure the Kaapse version uses authentic slang/idioms where appropriate. 
  For isiXhosa, provide a natural conversational translation.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formal: { type: Type.STRING },
            kaapse: { type: Type.STRING },
            english: { type: Type.STRING },
            isixhosa: { type: Type.STRING }
          },
          required: ["formal", "kaapse", "english", "isixhosa"]
        }
      }
    });

    if (response.text) {
      const cleanedJson = response.text.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanedJson));
    } else {
      res.json({ formal: '', kaapse: '', english: '', isixhosa: '' });
    }
  } catch (error: any) {
    console.error("Variations API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/flashcards", async (req, res) => {
  const { topic, style } = req.body;
  const languageFocus = style === 'isiXhosa' ? 'isiXhosa' : style === 'Formal' ? 'Formal Afrikaans' : 'Kaapse Afrikaans';
  
  const prompt = `Generate 5 learning flashcards about: "${topic}". 
  Focus on ${languageFocus}.
  
  Each flashcard must have:
  - 'afrikaans': The phrase in Afrikaans (use the style: ${style === 'isiXhosa' ? 'Formal' : style}).
  - 'isixhosa': The phrase in isiXhosa.
  - 'english': The English translation.
  - 'example': A usage example in ${style === 'isiXhosa' ? 'isiXhosa' : 'the target Afrikaans style'}.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              afrikaans: { type: Type.STRING },
              isixhosa: { type: Type.STRING },
              english: { type: Type.STRING },
              example: { type: Type.STRING },
            },
            required: ["afrikaans", "isixhosa", "english", "example"],
          },
        },
      },
    });
    
    if (response.text) {
      const cleanedJson = response.text.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanedJson));
    } else {
      res.json([]);
    }
  } catch (error: any) {
    console.error("Flashcards API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/quiz", async (req, res) => {
  const { topic, style } = req.body;
  const languageFocus = style === 'isiXhosa' ? 'isiXhosa' : style === 'Formal' ? 'Formal Afrikaans' : 'Kaapse Afrikaans';
  
  const prompt = `Generate 3 multiple-choice quiz questions for a learner about: "${topic}".
  Focus on ${languageFocus}.
  
  If the focus is isiXhosa:
  - Questions and options should be primarily in isiXhosa with English translations in brackets.
  - Questions should test vocabulary and common phrases in isiXhosa.
  
  If the focus is Afrikaans (Formal or Kaapse):
  - Questions and options should be in Afrikaans (appropriate to the style) with English translations in brackets.
  
  Format requirements:
  - 'question': The question text.
  - 'options': 4 choices.
  - 'correctAnswerIndex': index (0-3).
  - 'explanation': Why it's correct.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of 4 possible answers"
              },
              correctAnswerIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" },
              explanation: { type: Type.STRING, description: "Brief explanation of why the answer is correct" }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"],
          },
        },
      },
    });

    if (response.text) {
      const cleanedJson = response.text.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanedJson));
    } else {
      res.json([]);
    }
  } catch (error: any) {
    console.error("Quiz API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  const { history, message, instruction } = req.body;
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model: MODELS.TEXT,
      history: history,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION_BASE} 
        
        Language Style Preference: ${instruction.includes('isiXhosa') || instruction.includes('Xhosa') ? 'isiXhosa' : 'Afrikaans'}.
        If the user is learning isiXhosa, provide roleplay responses in isiXhosa with translations in English.
        If the user is learning Afrikaans (Kaaps or Formal), stay in that style.
        
        General Instructions: ${instruction}`,
      }
    });

    const result = await chat.sendMessage({ message });
    res.json({ text: result.text || "" });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/trivia-question", async (req, res) => {
  const { personaId, topic, personaData } = req.body;
  const persona = personaData[personaId];
  const prompt = `Generate a multiple choice trivia question about the Western Cape/Coloured topic: "${topic}".
  
  Format requirements:
  1. 'question': The actual trivia question text.
  2. 'options': 4 possible answers.
  3. 'correctAnswerIndex': 0-3.
  4. 'hostIntro': You are ${persona.name}. Write a short intro (1-2 sentences) where you speak to the user and ask the question in your character. 
     ${persona.systemInstruction}
  
  Return valid JSON.`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.INTEGER },
            hostIntro: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswerIndex", "hostIntro"]
        }
      }
    });

    if (response.text) {
      const cleanedJson = response.text.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanedJson));
    } else {
      res.status(500).json({ error: "Failed to generate trivia content" });
    }
  } catch (error: any) {
    console.error("Trivia Gen API Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/trivia-feedback", async (req, res) => {
    const { personaId, isCorrect, correctAnswer, personaData } = req.body;
    const persona = personaData[personaId];
    
    const prompt = `The user just answered a trivia question ${isCorrect ? 'CORRECTLY' : 'INCORRECTLY'}. 
    The correct answer was "${correctAnswer}".
    
    You are ${persona.name}. ${persona.systemInstruction}
    
    React to their answer in character.
    - If correct: Praise them (in your style).
    - If incorrect: Roast them gently or scold them (in your style) and tell them the right answer.
    - Keep it short (2-3 sentences max).
    
    Return just the text of your reaction.`;

    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODELS.TEXT,
            contents: prompt,
        });
        res.json({ text: response.text?.trim() || "" });
    } catch (error: any) {
        console.error("Trivia Feedback API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/gemini/image", async (req, res) => {
    const { userPrompt, size, style, aspectRatio, useLocationGrounding, referenceImageBase64, imageContext } = req.body;
    try {
        const ai = getAI();
        const fullPrompt = `Style: ${style}.\n${userPrompt}.\n\n${imageContext}`;
        const parts: any[] = [{ text: fullPrompt }];

        if (referenceImageBase64) {
            const cleanBase64 = referenceImageBase64.includes(',') 
                ? referenceImageBase64.split(',')[1] 
                : referenceImageBase64;

            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        const tools: any[] = [];
        const isNanoBananaPro = MODELS.IMAGE === 'gemini-3-pro-image-preview';
        const isNanoBananaV2 = MODELS.IMAGE === 'gemini-3.1-flash-image-preview';
        
        if (useLocationGrounding && (isNanoBananaPro || isNanoBananaV2)) {
            const searchConfig: any = { webSearch: {} };
            if (isNanoBananaV2) {
                searchConfig.imageSearch = {};
            }
            tools.push({ googleSearch: { searchTypes: searchConfig } });
        }

        const imageConfig: any = {
            aspectRatio: aspectRatio,
        };
        
        if (isNanoBananaPro || isNanoBananaV2) {
            imageConfig.imageSize = size;
        }

        const response = await ai.models.generateContent({
            model: MODELS.IMAGE,
            contents: { parts },
            config: {
                imageConfig,
                tools: tools.length > 0 ? tools : undefined
            },
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return res.json({ image: part.inlineData.data });
                }
            }
        }
        res.status(500).json({ error: "No image data found" });
    } catch (error: any) {
        console.error("Image API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/gemini/generate-video", async (req, res) => {
    const { prompt, image, aspectRatio } = req.body;
    try {
        const ai = getAI();
        const reqConfig: any = {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9'
        };

        const requestParams: any = {
            model: 'veo-3.1-lite-generate-preview',
            prompt: prompt || 'A scenic video landscape inspired by the Western Cape',
            config: reqConfig
        };

        if (image) {
            const cleanBase64 = image.includes(',') 
                ? image.split(',')[1] 
                : image;
            
            let mimeType = 'image/jpeg';
            if (image.includes('image/png')) mimeType = 'image/png';
            else if (image.includes('image/webp')) mimeType = 'image/webp';
            
            requestParams.image = {
                imageBytes: cleanBase64,
                mimeType: mimeType
            };
        }

        const operation = await ai.models.generateVideos(requestParams);
        res.json({ operationName: operation.name });
    } catch (error: any) {
        console.error("Generate Video Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/gemini/video-status", async (req, res) => {
    const { operationName } = req.body;
    try {
        const ai = getAI();
        const op = new GenerateVideosOperation();
        op.name = operationName;
        const updated = await ai.operations.getVideosOperation({ operation: op });
        res.json({ done: updated.done, error: updated.error });
    } catch (error: any) {
        console.error("Video status check error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/gemini/video-download", async (req, res) => {
    const { operationName } = req.body;
    try {
        const ai = getAI();
        const op = new GenerateVideosOperation();
        op.name = operationName;
        const updated = await ai.operations.getVideosOperation({ operation: op });
        
        const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) {
            return res.status(404).json({ error: "Video URI not found or video not ready." });
        }
        
        const apiKey = process.env.GEMINI_API_KEY;
        const videoRes = await fetch(uri, {
            headers: { 'x-goog-api-key': apiKey || '' },
        });
        
        if (!videoRes.ok) {
            throw new Error(`Failed to fetch video: ${videoRes.statusText}`);
        }
        
        const arrayBuffer = await videoRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        
        res.json({ video: `data:video/mp4;base64,${base64}` });
    } catch (error: any) {
        console.error("Video download proxy error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/gemini/transcribe", async (req, res) => {
  const { base64Audio, mimeType } = req.body;
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          { text: "Listen to the audio. Transcribe the spoken Afrikaans, English, or isiXhosa text exactly. Return ONLY the transcription text, nothing else. Do not add quotes or explanations." }
        ]
      }
    });
    res.json({ transcription: response.text?.trim() || "" });
  } catch (error: any) {
    console.error("Transcription API Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// --- VITE MIDDLEWARE ---

async function startServer() {
  const port = process.env.PORT || 3000;
  console.log(`Starting server on port ${port}...`);
  
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Loading Vite in development mode...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- WEBSOCKET FOR LIVE API ---
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (ws) => {
    console.log("Live API client connected");
    let session: any = null;

    ws.on("message", async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            
            // Initialization message
            if (msg.type === 'setup') {
                const ai = getAI();
                const isTranslateMode = msg.mode === 'translate';
                const modelName = isTranslateMode ? 'gemini-3.5-live-translate-preview' : MODELS.LIVE;
                
                const liveConfig: any = {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: msg.voiceName || "Zephyr" } },
                    },
                    systemInstruction: msg.systemInstruction || "You are a helpful assistant.",
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                };

                if (isTranslateMode) {
                    liveConfig.translationConfig = {
                        targetLanguageCode: msg.targetLanguageCode || "af",
                        echoTargetLanguage: msg.echoTargetLanguage ?? false
                    };
                }

                session = await ai.live.connect({
                    model: modelName,
                    callbacks: {
                        onmessage: (message) => {
                            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            
                            // Extract any text content safely
                            let transcription = "";
                            const parts = message.serverContent?.modelTurn?.parts;
                            if (parts) {
                                for (const part of parts) {
                                    if (part.text) {
                                       transcription += part.text;
                                    }
                                }
                            }

                            // Extract user speech transcription if available
                            let userTranscription = "";
                            const userParts = message.serverContent?.userTurn?.parts;
                            if (userParts) {
                                for (const part of userParts) {
                                    if (part.text) {
                                        userTranscription += part.text;
                                    }
                                }
                            }
                            
                            if (audio) ws.send(JSON.stringify({ audio }));
                            if (transcription) ws.send(JSON.stringify({ transcription }));
                            if (userTranscription) ws.send(JSON.stringify({ userTranscription }));
                            if (message.serverContent?.interrupted) ws.send(JSON.stringify({ interrupted: true }));
                            if (message.serverContent?.turnComplete) ws.send(JSON.stringify({ turnComplete: true }));
                            
                            // Relay other server messages if needed
                            if (parts) {
                                ws.send(JSON.stringify({ parts }));
                            }
                        },
                    },
                    config: liveConfig,
                });
                console.log(`Live session established with model: ${modelName}`);
                ws.send(JSON.stringify({ type: 'ready' }));
            } else if (msg.audio && session) {
                session.sendRealtimeInput({
                    audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" },
                });
            }
        } catch (err) {
            console.error("WebSocket message error:", err);
        }
    });

    ws.on("close", () => {
        console.log("Live API client disconnected");
        if (session) session.close();
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/ws-live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
