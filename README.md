# 🌴 HH GOA VIBE RAG

### Multilingual Voice + Retrieval-Augmented Generation Assistant

> **Speak naturally. Ask in your language. Get knowledge-grounded answers.**

HH GOA VIBE RAG is a multilingual **Voice + RAG (Retrieval-Augmented Generation)** assistant built to make AI interaction more natural, conversational, and accessible across Indian languages.

The project combines **voice interaction, multilingual semantic search, FAISS vector retrieval, local AI generation, and a Goa-inspired glassmorphism interface** into a single AI experience.

---

## 🌊 Project Vision

AI should not require people to change the way they communicate.

Instead of forcing users to type perfect English queries, HH GOA VIBE RAG aims to let users:

**Speak → Understand → Retrieve → Generate → Respond**

The current prototype focuses on **English and Gujarati**, with the architecture designed to expand toward **all major Indic languages**.

---

# ✨ Key Features

### 🎙️ Voice-First AI

Designed around natural human interaction.

Users can interact with the system using voice or text and receive contextual answers from the RAG pipeline.

---

### 🌐 Multilingual Understanding

Current language support:

- 🇬🇧 English
- 🇮🇳 Gujarati

The project is designed to expand into:

- Hindi
- Marathi
- Bengali
- Tamil
- Telugu
- Kannada
- Malayalam
- Punjabi
- Odia
- Assamese
- Urdu
- Nepali
- Konkani
- Sanskrit
- Other Indic languages

---

### 🔎 Semantic Retrieval

Instead of depending only on keyword matching, the system converts questions and knowledge chunks into multilingual semantic embeddings.

Current embedding model:

`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

Embedding dimension:

`384`

---

### ⚡ FAISS Vector Search

Knowledge embeddings are indexed using:

`FAISS IndexFlatIP`

Since the embeddings are normalized, inner-product search provides cosine-similarity-based retrieval.

This enables lightweight and fast local semantic search.

---

### 🧠 Local AI Generation

The current generation model is:

`Gemma 3:4b`

The model runs locally through **Ollama**, allowing the core system to operate without relying on paid external LLM APIs.

---

### 🧩 Smart Retrieval Pipeline

HH GOA VIBE RAG performs multiple retrieval stages:

```text
User Question
      ↓
Query Embedding
      ↓
FAISS Vector Search
      ↓
Candidate Retrieval
      ↓
Metadata-Aware Ranking
      ↓
Duplicate Removal
      ↓
Top-K Contexts
      ↓
Gemma 3:4b
      ↓
Grounded Answer




























<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f833120b-57cd-46e1-a74d-76547dc8a8f2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
