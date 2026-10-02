# Afrikaans AI Companion (Multimodal Heritage & Real-Time Voice System)

[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.1_Flash_Live-4285F4?logo=googlegemini)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?logo=express)](https://expressjs.com/)
[![Framework](https://img.shields.io/badge/Methodology-PMI--CPMAI-blue)](https://www.pmi.org/)

A full-duplex multimodal language learning and cultural preservation platform designed to preserve and teach regional South African dialects (**Kaapse Afrikaans**, **Hoofafrikaans**, and **isiXhosa**). Powered by the **Gemini Live API** (`gemini-3.1-flash-live-preview`), **Gemini 2.5 Flash**, **Gemini TTS**, and **Google Veo 3.1** video synthesis.

---

## 1. CPMAI Phase I: Matching AI to Business Needs

Following the **PMI Certified Professional in Managing AI (CPMAI) Phase I (Business Understanding)** framework, this project establishes the problem definition, cognitive justifications, data feasibility, and ROI/impact modeling required to deploy real-time voice and multimodal AI for language education and heritage preservation.

### 1.1 Business Objective & Impact / ROI Feasibility
* **Target Audience**: Heritage language learners, educational institutions, South African diaspora, and native dialect speakers.
* **Problem Statement**: Regional dialects like Kaapse Afrikaans (Cape Flats Afrikaans) are severely underrepresented in commercial language platforms and standard LLM tokenizers, risking cultural attrition and leaving learners without interactive, accent-accurate conversational tools.
* **Projected Impact & Financial Model**: Delivers sub-200ms latency full-duplex voice tutoring at a unit cost of **< \$0.02 per interactive session** (using Gemini 3.1 Flash Lite / Live API), reducing private language tutoring costs by 90% while democratizing scalable cultural preservation.

### 1.2 Cognitive vs. Non-Cognitive Justification
* **Why AI is Required (Probabilistic Need)**: Fluid spoken dialogue, real-time code-switching between Kaapse Afrikaans and English, dynamic accent comprehension, and adaptive pronunciation feedback require probabilistic multimodal processing that static audio files or rule-based chatbots cannot replicate.
* **Non-Cognitive Integration (Deterministic Boundary)**: WebSocket connection management, 16kHz PCM audio stream framing, session state tracking, flashcard deck indexing, and UI state transitions in React 19 / Express 5 are **100% deterministic**, reserving LLM inference strictly for speech understanding, dialogue synthesis, and media generation.

### 1.3 AI Pattern Mapping
* **Primary Pattern**: **Conversational & Human Interaction** (full-duplex real-time audio streaming via WebSockets using `gemini-3.1-flash-live-preview`).
* **Secondary Pattern**: **Hyper-Personalization & Recognition** (multimodal image and video synthesis via Gemini 2.5 Flash and Google Veo 3.1, paired with real-time pronunciation evaluation).

### 1.4 DIKUW Pyramid Alignment
* **Data (Base Facts)**: 16kHz PCM audio buffers, cultural trivia JSON datasets, dialect vocabulary pairs, and historical media assets.
* **Information (Structured Context)**: Categorized flashcard metadata, structured WebSocket message frames, and persona prompt configurations (e.g., Cape Flats Trivia Host).
* **Knowledge (Multimodal Context)**: Gemini Live model understanding regional phonetic nuances, idiom interpretations, and code-switching semantics.
* **Understanding & Cultural Preservation (Grounded Interaction)**: Full-duplex conversational synthesis delivering real-time interactive cultural tutoring, dialect preservation, and contextual media generation.

### 1.5 CPMAI Go/No-Go Assessment (3x3 Feasibility Matrix)

| Feasibility Pillar | Assessment Criteria | Status | Strategic Justification |
| :--- | :--- | :---: | :--- |
| **Business / Impact Feasibility** | Problem Definition | 🟢 **GO** | Clear cultural gap; high demand for interactive, dialect-accurate voice learning. |
| | Sponsor / Community Support | 🟢 **GO** | Strong community engagement for regional language preservation and education. |
| | Sufficient ROI / Unit Economics | 🟢 **GO** | Serverless WebSockets + Gemini Flash Lite achieve < \$0.02/session cost structure. |
| **Data Feasibility** | Data Availability | 🟢 **GO** | Dialect corpora, pronunciation sets, and cultural trivia validated by native speakers. |
| | Access & Security | 🟢 **GO** | Audio streaming handled over secure WebSockets (`wss://`) with ephemeral session keys. |
| | Data Quality | 🟢 **GO** | Curated vocabulary and prompt engineering enforce authentic regional idioms. |
| **Execution Feasibility** | Technology & Skills | 🟢 **GO** | Gemini Live API, React 19, Express 5, and `@google/genai` SDK offer mature tooling. |
| | Implementation Timeline | 🟢 **GO** | Modular studio design: LiveMode, LearnMode, TriviaMode, and ImageGenMode. |
| | Operational Context | 🟢 **GO** | Cross-platform web application accessible on desktop and mobile browsers. |

*Overall Assessment*: **ALL GREEN (GO)** — Project approved for technical implementation.

---

## 2. Target System Architecture & Modes

```mermaid
graph TD
    subgraph ClientTier ["1. Client Tier (React 19 + TypeScript)"]
        User["User / Learner"]
        AudioEngine["Web Audio API\n(16kHz PCM Capture & Playback)"]
        UIApp["React 19 Frontend\n(Tailwind CSS / Lucide Icons)"]
    end

    subgraph ServerTier ["2. Backend Orchestration Tier (Express 5 / Node.js)"]
        WSServer["WebSocket Server\n(Full-Duplex Audio Relay)"]
        APIRouter["Express REST API\n(Trivia & Media Generation)"]
    end

    subgraph MultimodalAITier ["3. Google Gemini Multimodal Engine"]
        GeminiLive["Gemini Live API\n(gemini-3.1-flash-live-preview)"]
        GeminiFlash["Gemini 3.1 Flash Lite / 2.5 Flash\n(Text & Vision Processing)"]
        GeminiTTS["Gemini Text-to-Speech\n(Audio Synthesis)"]
        GoogleVeo["Google Veo 3.1\n(Cultural Video Generation)"]
    end

    %% Real-time Voice Flow
    User -->|1. Speaks into Mic| AudioEngine
    AudioEngine -->|2. Send PCM Frames| WSServer
    WSServer -->|3. Bi-Directional Stream| GeminiLive
    GeminiLive -->|4. Synthesized Audio Response| WSServer
    WSServer -->|5. Stream Audio Payload| AudioEngine
    AudioEngine -->|6. Play Response| User

    %% Studio Feature Flows
    UIApp -->|REST Query| APIRouter
    APIRouter -->|Pronunciation & Text| GeminiFlash
    APIRouter -->|Generate Audio| GeminiTTS
    APIRouter -->|Generate Heritage Media| GoogleVeo
