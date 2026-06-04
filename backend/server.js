import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Google Gen AI SDK passing an empty config object to satisfy inner checks
const ai = new GoogleGenAI({});

app.use(cors());
app.use(express.json());

// In-memory simple user usage tracker (Resets on server restart)
const usageDatabase = {};

app.post('/api/summarize', async (expressReq, expressRes) => {
    try {
        const { text, userId, reportMode = "detailed" } = expressReq.body;

        if (!text || !userId) {
            return expressRes.status(400).json({ error: "Missing required fields: text or userId." });
        }

        // 1. Enforce simple local rate-limiting guardrail
        if (!usageDatabase[userId]) {
            usageDatabase[userId] = 0;
        }
        if (usageDatabase[userId] >= 20) {
            return expressRes.status(429).json({ error: "Rate limit reached. Maximum 20 uses per day." });
        }
        usageDatabase[userId]++;
        console.log(`User ${userId} incremented to ${usageDatabase[userId]}/20 uses. Report mode: ${reportMode}`);

        // 2. Structural Prompt engineered to build a clean multi-slide JSON schema
        let structuralPrompt;

        if (reportMode === "executive") {
            // Executive Mode: Concise 2-3 slides with blockers, risks, and action items
            structuralPrompt = `
            You are an expert executive communications agent. Your task is to ingest a massive, chaotic wall of messy developer logs, raw Jira updates, or corporate brain dumps, filter out the noise, and organize the information into a concise executive summary (maximum 3 slides).

            Instructions:
            1. Parse the text completely.
            2. Extract ONLY the most critical information for directors: 
               - Blockers and risks (what's stopping progress)
               - Key achievements and progress
               - Action items requiring director attention
            3. Create maximum 3 slides:
               - Slide 1: Executive Summary (key highlights, progress percentage)
               - Slide 2: Blockers & Risks (critical issues, impact level, what's needed)
               - Slide 3: Director's Action Items (decisions needed, resources required, next steps)
            4. Be concise and direct - no fluff, no trivial details
            5. Output the results strictly in the specified JSON schema format.

            Input Messy Data:
            """
            ${text}
            """

            Strict JSON Output Schema Format:
            {
              "presentationTitle": "EXECUTIVE SUMMARY - [PROJECT NAME]",
              "slides": [
                {
                  "slideTitle": "Executive Summary",
                  "bullets": [
                    "Overall progress: [X]% complete",
                    "Key achievements: [2-3 major wins]",
                    "Timeline status: [on track/at risk/delayed]"
                  ]
                },
                {
                  "slideTitle": "Critical Blockers & Risks",
                  "bullets": [
                    "Blocker 1: [description] - Impact: [high/medium/low] - Needs: [what's required]",
                    "Risk 1: [description] - Mitigation: [action needed]"
                  ]
                },
                {
                  "slideTitle": "Director's Action Items",
                  "bullets": [
                    "Decision needed: [what director must decide]",
                    "Resource request: [budget/people/tools needed]",
                    "Next milestone: [date and deliverable]"
                  ]
                }
              ]
            }
            `;
        } else {
            // Detailed Mode: Full comprehensive report
            structuralPrompt = `
            You are an expert executive communications agent. Your task is to ingest a massive, chaotic wall of messy developer logs, raw Jira updates, or corporate brain dumps, filter out the noise, and organize the information into a structured, high-level multi-slide presentation layout.

            Instructions:
            1. Parse the text completely.
            2. Categorize the items into logical corporate themes or technical focus areas (e.g., Infrastructure Upgrades, Critical Bug Resolutions, Product Pipeline, Operational Administration).
            3. For each category, write clean, impactful, professional, outcome-oriented executive bullet points. Remove all casual language, complaints, and trivial details.
            4. Output the results strictly in the specified JSON schema format.

            Input Messy Data:
            """
            ${text}
            """

            Strict JSON Output Schema Format:
            {
              "presentationTitle": "THEME OR PROJECT TITLE HERE",
              "slides": [
                {
                  "slideTitle": "Category Name 1",
                  "bullets": [
                    "Professional bullet point 1 summarizing matching entries.",
                    "Professional bullet point 2 summarizing matching entries."
                  ]
                },
                {
                  "slideTitle": "Category Name 2",
                  "bullets": [
                    "Professional bullet point 1.",
                    "Professional bullet point 2."
                  ]
                }
              ]
            }
            `;
        }

        // 3. Request structured data processing from Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: structuralPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        // 4. Send back the clean structured JSON data to the frontend loop
        const structuredPresentationJson = JSON.parse(response.text);
        expressRes.json(structuredPresentationJson);

    } catch (backendError) {
        console.error("Backend Error:", backendError);
        expressRes.status(500).json({ error: "Internal server bottleneck handling AI processing." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Secure SlideSync server running on port ${PORT}`);
});