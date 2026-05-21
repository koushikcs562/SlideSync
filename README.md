# 📊 SlideSync — Corporate Slide Generation Engine

SlideSync is an AI-powered automated workflow designed to solve the weekly corporate bottleneck of translating messy, highly technical log dumps and team notes into polished, outcome-oriented executive status decks. 

By passing unstructured text arrays through contextual engineering boundaries, SlideSync synthesizes raw chat logs into multi-slide presentations categorized by strategic business impact themes.

## 🌟 Core Features

- **Massive Ingestion Pipeline:** Processes large text blocks without layout overflow or content clipping.
- **Dynamic Semantic Categorization:** Leverages `gemini-2.5-flash` to extract high-level professional topics (e.g., *Infrastructure Operations*, *Critical Client Resolutions*, *Compliance*), filtering out casual text, complaints, and trivial details.
- **Dynamic Multi-Slide Compiler:** Reads strict structured JSON arrays to programmatically generate custom presentation decks using `PptxGenJS`.
- **Local Guardrail Architecture:** Features integrated in-memory user tracking hooks for API rate-limiting validation.

## 🛠️ System Architecture

The application is split into a production-ready, two-tiered architecture:

1. **Frontend Server (Port 8080):** Built with modern Tailwind CSS for a seamless interface and client-side presentation compiling.
2. **Backend Gateway (Port 5000):** An Express.js Node app acting as a secure middleware router for handling communication boundaries and interacting securely with the Google Gen AI SDK.

## ⚡ Quick Start

### 1. Set Up the Backend
Navigate to the backend directory, install the required packages, and start the node server:
```bash
cd backend
npm install
npm start
