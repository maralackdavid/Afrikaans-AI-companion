# Maralack Cape Flats AI Companion

> **"My vision is to educate a new generation and entertain the old through a holistic and immersive experience of the Cape Flats Afrikaans language and Culture."**

An intelligent, real-time multimodal language learning companion and cultural preservation platform celebrating **Kaapse Afrikaans (Kaaps)**, **Hoofafrikaans (Formal Afrikaans)**, and **isiXhosa**. Powered by Google's state-of-the-art **Gemini 3.1 Flash Lite**, **Gemini Live API**, **Gemini TTS**, and **Google Veo 3.1**.

---

## 🌟 Key Features

1. **Interactive Learning Studio (`LearnMode`)**
   - **Flashcards & Quizzes:** Dynamic multi-lingual study decks with contextual usage examples generated on demand.
   - **Pronunciation Coach:** Real-time speech-to-text pronunciation evaluation and feedback powered by multimodal audio analysis.
   - **Multi-dialect Support:** Seamless toggle between Formal Afrikaans, Kaapse dialect, and isiXhosa.

2. **Real-Time Voice Companion (`LiveMode`)**
   - **Full-Duplex Conversational Audio:** Ultra-low latency voice streaming directly to the Gemini Live API via WebSockets (`audio/pcm;rate=16000`).
   - **Live Audio Transcription & Translation:** Real-time dual speech transcription and automatic translation echoing.
   - **Voice Personality Switching:** Expressive voice presets (Puck, Charon, Kore, Fenrir, Zephyr, Aoede).

3. **Conversational Tutor & Heritage Guide (`ChatMode`)**
   - **Cultural Preservation:** Deep insights into Cape Flats history, District Six memories, Cape Malay heritage, and local cuisine (Gatsbys, Koesisters, Mutton Salomie).
   - **Contextual Variations:** Generates concurrent translations in Formal Afrikaans, Kaapse slang, isiXhosa, and English for any query.

4. **Cape Flats Cultural Trivia Game (`TriviaMode`)**
   - **Animated Cape Personas:**
     - **Auntie Christine:** *The Gossip Auntie* — warm, sharp, loves local skinner and calls you "my darling".
     - **Bra Colin:** *The Street-Smart Corner Veteran* — talks in rich Kaaps slang and street wisdom.
     - **Meester Martin:** *The Respected Heritage Teacher* — knowledgeable, encouraging, and historical.
   - **Voice Feedback:** Dynamic TTS reactions where personas react, praise, or gently roast your answers in character.

5. **Multimodal Media Studio (`ImageGenMode`)**
   - **Heritage Imagery Generation:** High-resolution cultural illustrations with style presets (Photorealistic, Watercolor, Anime, 3D Render, Oil Painting).
   - **Veo Video Generation:** Text-to-video and image-to-video synthesis powered by `veo-3.1-lite-generate-preview` with background polling and base64 video playback.

---

## 🏗️ System Architecture

### High-Level Architecture Diagram (Mermaid.js)

```mermaid
graph TB
    subgraph Client ["Client Browser (React 19 + TypeScript + Vite)"]
        UI["Modern UI / Tailwind CSS"]
        Tabs["Module Router: Learn | Chat | Voice | Heritage | Trivia | Imagen"]
        AudioProc["Web Audio API: 16kHz PCM Capture & WebAudio Buffer Player"]
        WSClient["WebSocket Client (/ws-live)"]
        APIClient["Fetch REST Client (/api/gemini/*)"]
    end

    subgraph Backend ["Node.js / Express Backend (server.ts)"]
        Server["Express 5 Server (Port 3000)"]
        ViteMW["Vite Dev Middleware (SPA)"]
        ProxyRoutes["Proxy API Endpoints:
        • /api/gemini/chat
        • /api/gemini/translate
        • /api/gemini/variations
        • /api/gemini/flashcards
        • /api/gemini/quiz
        • /api/gemini/tts
        • /api/gemini/image
        • /api/gemini/generate-video
        • /api/gemini/video-status
        • /api/gemini/video-download
        • /api/gemini/transcribe"]
        WSServer["WebSocket Server: ws://localhost:3000/ws-live"]
    end

    subgraph Gemini ["Google Gemini & GenAI Cloud Services"]
        GenAISDK["@google/genai SDK (v1.30+)"]
        FlashLite["gemini-3.1-flash-lite:
        Text, Chat, Quizzes, Flashcards, Variations & Transcriptions"]
        LiveAPI["gemini-3.1-flash-live-preview / gemini-3.5-live-translate-preview:
        Bidirectional Real-Time Audio Streaming"]
        TTS["gemini-3.1-flash-tts-preview:
        Voice & Persona Audio Synthesis"]
        ImageGen["gemini-2.5-flash-image:
        Heritage & Slang Visualizations"]
        Veo["veo-3.1-lite-generate-preview:
        AI Video Synthesis & Animation"]
    end

    UI --> Tabs
    Tabs --> AudioProc
    Tabs --> WSClient
    Tabs --> APIClient

    WSClient <-->|Full-Duplex PCM Audio & Events| WSServer
    APIClient -->|JSON REST Requests| ProxyRoutes

    Server --> ViteMW
    Server --> ProxyRoutes
    Server --> WSServer

    ProxyRoutes --> GenAISDK
    WSServer <-->|Live Session Connection| GenAISDK

    GenAISDK --> FlashLite
    GenAISDK <-->|Live Stream| LiveAPI
    GenAISDK --> TTS
    GenAISDK --> ImageGen
    GenAISDK --> Veo
```

---

### Real-Time Live Audio & Translation Sequence (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Microphone)
    participant Client as Web App (LiveMode)
    participant Server as Express / WebSocket Server
    participant GeminiLive as Gemini Live API (3.1 Live / 3.5 Translate)

    User->>Client: Clicks "Connect" & speaks
    Client->>Server: Connect WS (ws://localhost:3000/ws-live)
    Client->>Server: Send setup event (voiceName, systemInstruction, targetLanguage)
    Server->>GeminiLive: ai.live.connect(model, speechConfig, translationConfig)
    GeminiLive-->>Server: Session Ready
    Server-->>Client: { type: "ready" }

    loop Audio Streaming
        Client->>Server: Raw 16kHz PCM chunks (Base64)
        Server->>GeminiLive: session.sendRealtimeInput(audio)
        GeminiLive-->>Server: Realtime Response (Audio parts + Transcriptions)
        Server-->>Client: { audio, transcription, userTranscription }
        Client->>User: Playback AI Audio & display live captions
    end

    User->>Client: Clicks "Disconnect"
    Client->>Server: Close WS connection
    Server->>GeminiLive: session.close()
```

### Application Tab State & Navigation Flow (Mermaid.js)

```mermaid
flowchart TD
    App([Maralack AI Companion Entry]) --> TabRouter{Select Tab}

    TabRouter -->|Learn| LM[Learn Studio]
    LM --> Flashcards[Interactive Flashcards]
    LM --> Quiz[Multiple Choice Quizzes]
    LM --> Pronounce[Pronunciation Evaluator]

    TabRouter -->|Chat| CM[Conversational Tutor]
    CM --> DialectSelect[Language Style: Formal / Kaapse / Both / isiXhosa]
    CM --> Variations[Multi-Dialect Translation Accordion]

    TabRouter -->|Voice| VM[Live Voice Partner]
    VM --> LiveStream[Bidirectional PCM WebSockets]
    VM --> EchoTrans[Live Translation Echoing]

    TabRouter -->|Heritage| HM[Heritage & Culture]
    HM --> DeepDive[Curated Cape Flats & District Six Prompts]

    TabRouter -->|Trivia| TM[Trivia Game Show]
    TM --> PickPersona[Select: Auntie Christine / Bra Colin / Meester Martin]
    TM --> QuestionRound[Voice Question + Interactive Choices]
    TM --> HostReaction[Character Reaction & Scoring]

    TabRouter -->|Imagen| IM[Media Studio]
    IM --> ImgGen[Gemini 2.5 Flash Image Generation]
    IM --> VidGen[Veo 3.1 Video Synthesis]
```

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Description |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | High-performance, functional UI architecture |
| **Bundler & Tooling** | Vite 6 | Lightning-fast HMR and build compilation |
| **Styling** | Tailwind CSS | Sleek, responsive South African inspired theme |
| **Icons** | Lucide React | High-contrast accessibility icons |
| **Server Runtime** | Node.js (v20+) / Express 5 | Full-stack backend proxy and static server |
| **WebSocket Layer** | `ws` (v8) | Real-time duplex streaming for Gemini Live API |
| **AI SDK** | `@google/genai` (v1.30.0) | Official unified Google GenAI TypeScript SDK |

### 🤖 Gemini Models In Use

| Capability | Model Identifier | Purpose |
|---|---|---|
| **Text, Chat & Logic** | `gemini-3.1-flash-lite` | Chat responses, quizzes, flashcards, translations |
| **Live Voice** | `gemini-3.1-flash-live-preview` | Full-duplex real-time spoken audio conversation |
| **Live Translation** | `gemini-3.5-live-translate-preview` | Real-time translated audio streaming with target echo |
| **Speech Synthesis (TTS)** | `gemini-3.1-flash-tts-preview` | Host persona voice commentary and pronunciation playback |
| **Image Generation** | `gemini-2.5-flash-image` | High-fidelity cultural visual creation |
| **Video Generation** | `veo-3.1-lite-generate-preview` | AI video synthesis from text prompts and reference images |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **npm** or **bun**
- A **Google Gemini API Key** with access to Gemini 3.1 and Veo models

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/maralackdavid/Afrikaans-AI-companion.git
   cd Afrikaans-AI-companion
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (based on `.env.example`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

---

## 📤 Publishing to GitHub

To publish this repository to your personal or organization GitHub account:

### Option A: Using the GitHub CLI (`gh`)

```bash
# Authenticate with GitHub
gh auth login

# Create a new repository and push
gh repo create maralack-afrikaans-ai-companion --public --source=. --remote=origin --push
```

### Option B: Using Git CLI

1. **Create an empty repository on GitHub** (e.g., named `maralack-afrikaans-ai-companion`).
2. **Link the remote and push:**
   ```bash
   # Add your remote URL
   git remote add origin https://github.com/<your-github-username>/maralack-afrikaans-ai-companion.git

   # Ensure default branch is main
   git branch -M main

   # Push codebase to GitHub
   git push -u origin main
   ```

---

## 📜 Cultural Note & Heritage Acknowledgement

This application is built in honor of the rich, vibrant linguistic tapestry of South Africa's Western Cape. **Kaapse Afrikaans (Kaaps)** has a centuries-old history shaped by indigenous Khoisan, Southeast Asian, Malagasy, East African, and European influences. It represents identity, resilience, humor, and community.

---

## 📄 License

MIT License. Created by David Maralack.
