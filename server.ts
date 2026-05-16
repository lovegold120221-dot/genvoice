import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const getCalendarEvents = async (token: string, maxResults: number = 10) => {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.append("timeMin", new Date().toISOString());
  url.searchParams.append("maxResults", maxResults.toString());
  url.searchParams.append("singleEvents", "true");
  url.searchParams.append("orderBy", "startTime");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
};

const createCalendarEvent = async (token: string, summary: string, description: string, startTime: string, endTime: string, location?: string, recurrence?: string[], attendees?: string[]) => {
  const eventBody: any = {
    summary,
    description,
    start: { dateTime: startTime, timeZone: "UTC" },
    end: { dateTime: endTime, timeZone: "UTC" }
  };
  if (location) eventBody.location = location;
  if (recurrence && recurrence.length > 0) eventBody.recurrence = recurrence;
  if (attendees && attendees.length > 0) eventBody.attendees = attendees.map(email => ({ email }));

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventBody)
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
};

const searchGmail = async (token: string, query: string, maxResults: number = 5) => {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.append("q", query);
  url.searchParams.append("maxResults", maxResults.toString());

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  if (!data.messages) return { messages: [] };

  const messages = await Promise.all(data.messages.map(async (msg: any) => {
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!msgRes.ok) return null;
    return await msgRes.json();
  }));

  // Clean up the output to make it smaller for context
  return messages.filter(Boolean).map(msg => {
    const subject = msg.payload.headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
    const from = msg.payload.headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
    let body = '';
    if (msg.snippet) body = msg.snippet;
    return { id: msg.id, subject, from, snippet: body };
  });
};

const sendGmail = async (token: string, to: string, subject: string, bodyText: string, attachment?: { filename: string, contentBase64: string, mimeType: string }) => {
  let emailRaw = "";
  if (!attachment) {
    emailRaw = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      bodyText
    ].join("\r\n");
  } else {
    const boundary = "boundary=" + Math.random().toString(16).substring(2);
    emailRaw = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      bodyText,
      "",
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      attachment.contentBase64,
      "",
      `--${boundary}--`
    ].join("\r\n");
  }

  // Base64Url encode
  const base64UrlEmail = btoa(unescape(encodeURIComponent(emailRaw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: base64UrlEmail
    })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
};

const searchContacts = async (token: string, query: string = "", maxResults: number = 10) => {
  if (query) {
    const url = new URL("https://people.googleapis.com/v1/people:searchContacts");
    url.searchParams.append("query", query);
    url.searchParams.append("readMask", "names,emailAddresses,phoneNumbers");
    url.searchParams.append("pageSize", maxResults.toString());

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return {
      contacts: (data.results || []).map((r: any) => {
        const c = r.person;
        return {
          name: c.names?.[0]?.displayName || 'Unknown',
          emails: c.emailAddresses?.map((e: any) => e.value) || [],
          phones: c.phoneNumbers?.map((p: any) => p.value) || []
        };
      })
    };
  } else {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.append("personFields", "names,emailAddresses,phoneNumbers");
    url.searchParams.append("pageSize", maxResults.toString());

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return {
      contacts: (data.connections || []).map((c: any) => ({
        name: c.names?.[0]?.displayName || 'Unknown',
        emails: c.emailAddresses?.map((e: any) => e.value) || [],
        phones: c.phoneNumbers?.map((p: any) => p.value) || []
      }))
    };
  }
};

const validateEU_VAT = async (countryCode: string, vatNumber: string) => {
  const url = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode, vatNumber })
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
};

const validateVatDecl: FunctionDeclaration = {
  name: "validateVatNumber",
  description: "Validate a European VAT number using the VIES REST API.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      countryCode: { type: Type.STRING, description: "The 2-letter EU country code (e.g., 'BE', 'FR', 'DE')." },
      vatNumber: { type: Type.STRING, description: "The VAT number to validate (without the country code)." }
    },
    required: ["countryCode", "vatNumber"]
  }
};

const listEventsDecl: FunctionDeclaration = {
  name: "listCalendarEvents",
  description: "List upcoming events from the user's primary Google Calendar. Useful to check availability.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      maxResults: { type: Type.NUMBER, description: "Maximum number of events to return. Defaults to 10." }
    }
  }
};

const createEventDecl: FunctionDeclaration = {
  name: "createCalendarEvent",
  description: "Create a new event in the user's primary Google Calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Title or summary of the event." },
      description: { type: Type.STRING, description: "Description or details of the event." },
      startTime: { type: Type.STRING, description: "Start time in ISO 8601 format (e.g., '2026-05-16T10:00:00Z')." },
      endTime: { type: Type.STRING, description: "End time in ISO 8601 format (e.g., '2026-05-16T11:00:00Z')." },
      location: { type: Type.STRING, description: "Optional location for the event." },
      recurrence: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Optional list of RRULE, EXRULE, RDATE and EXDATE lines for a recurring event." 
      },
      attendees: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "Optional list of attendee email addresses." 
      }
    },
    required: ["summary", "startTime", "endTime"]
  }
};

const searchGmailDecl: FunctionDeclaration = {
  name: "searchGmail",
  description: "Search and retrieve emails from the user's Gmail.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Gmail search query (e.g., 'is:unread', 'from:boss@example.com')." },
      maxResults: { type: Type.NUMBER, description: "Maximum number of emails to return. Defaults to 5." }
    },
    required: ["query"]
  }
};

const sendGmailDecl: FunctionDeclaration = {
  name: "sendGmail",
  description: "Send an email using the user's Gmail API. Optionally include an attachment.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: { type: Type.STRING, description: "Recipient email address." },
      subject: { type: Type.STRING, description: "Email subject." },
      bodyText: { type: Type.STRING, description: "Plain text body of the email." },
      attachmentFilename: { type: Type.STRING, description: "Optional filename for the attachment." },
      attachmentMimeType: { type: Type.STRING, description: "Optional MIME type for the attachment." },
      attachmentContentBase64: { type: Type.STRING, description: "Optional base64 encoded content for the attachment." }
    },
    required: ["to", "subject", "bodyText"]
  }
};

const searchContactsDecl: FunctionDeclaration = {
  name: "searchContacts",
  description: "Search or list the user's Google Contacts connections.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Optional name, email, or phone to search for. Leave empty to return recent connections." },
      maxResults: { type: Type.NUMBER, description: "Maximum number of contacts to fetch. Defaults to 10." }
    }
  }
};

const generateDocumentDecl: FunctionDeclaration = {
  name: "generate_document",
  description: "Generate an office/company document (e.g., business proposals, invoices, and contracts, internal memo, meeting minutes).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentType: { type: Type.STRING, description: "Type of document (e.g., 'business_proposal', 'meeting_minutes')." },
      title: { type: Type.STRING, description: "Title of the document." },
      audience: { type: Type.STRING, description: "Target audience." },
      purpose: { type: Type.STRING, description: "Purpose of the document." },
      style: { type: Type.STRING, description: "Style (corporate, modern, legal, etc.)." },
      outputFormat: { type: Type.STRING, description: "Desired output format (e.g., 'html_artifact', 'pdf_ready')." }
    },
    required: ["documentType", "outputFormat"]
  }
};

const generatePresentationDecl: FunctionDeclaration = {
  name: "generate_presentation",
  description: "Generate a slide presentation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING, description: "Topic of the presentation." },
      slideCount: { type: Type.NUMBER, description: "Number of slides." },
      audience: { type: Type.STRING, description: "Target audience." },
      tone: { type: Type.STRING, description: "Tone of the presentation." },
      outputFormat: { type: Type.STRING, description: "Output format, e.g., 'html_slides'." }
    },
    required: ["topic", "slideCount"]
  }
};

const generateFormDecl: FunctionDeclaration = {
  name: "generate_form",
  description: "Generate a form, such as employee onboarding or contact form.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      formType: { type: Type.STRING, description: "Type of the form." },
      printable: { type: Type.BOOLEAN, description: "Whether it needs to be printable." },
      fillable: { type: Type.BOOLEAN, description: "Whether it needs to be interactive/fillable." }
    },
    required: ["formType"]
  }
};

const generateReportDecl: FunctionDeclaration = {
  name: "generate_report",
  description: "Generate a weekly, monthly, or incident report.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reportType: { type: Type.STRING, description: "Type of the report." },
      dataSource: { type: Type.STRING, description: "Source of the data." },
      charts: { type: Type.BOOLEAN, description: "Whether to include charts." },
      summary: { type: Type.BOOLEAN, description: "Whether to include a summary." }
    },
    required: ["reportType"]
  }
};

const generateLegalDraftDecl: FunctionDeclaration = {
  name: "generate_legal_draft",
  description: "Generate drafts of legal documents like NDA, service agreement, etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentType: { type: Type.STRING, description: "Type of legal document." },
      jurisdiction: { type: Type.STRING, description: "Governing jurisdiction." }
    },
    required: ["documentType"]
  }
};

const generateWebArtifactDecl: FunctionDeclaration = {
  name: "generate_web_artifact",
  description: "Generate web artifacts like dashboards, infographics, timelines, and org charts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      artifactType: { type: Type.STRING, description: "Type of artifact." },
      includeJavascript: { type: Type.BOOLEAN, description: "Include interactive JS." },
      includeCharts: { type: Type.BOOLEAN, description: "Include charts." }
    },
    required: ["artifactType"]
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Create HTTP server
  const server = http.createServer(app);

  // Setup WebSocket Server for Live API
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs: WebSocket, req) => {
    let session: any;
    const urlParams = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
    const token = urlParams.get('token');
    const language = urlParams.get('language') || 'English';
    const personaName = urlParams.get('personaName') || 'Eburon AI';
    const userName = urlParams.get('userName') || 'User';
    const backgroundPersona = urlParams.get('backgroundPersona') || '';

    const customBaseInstruction = `\n\nBACKGROUND PERSONA\nYour name is ${personaName}, and you are talking to ${userName}.\nPlease always speak in ${language}.\n${backgroundPersona ? `Here is your backstory and character definition:\n${backgroundPersona}\n` : ''}`;

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (message.serverContent?.inputTranscription?.text && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ inputTranscription: message.serverContent.inputTranscription.text, isFinal: message.serverContent.inputTranscription.finished }));
            }
            if (message.serverContent?.outputTranscription?.text && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ outputTranscription: message.serverContent.outputTranscription.text, isFinal: message.serverContent.outputTranscription.finished }));
            }
            if (message.toolCall) {
              const functionCalls = message.toolCall.functionCalls;
              if (functionCalls) {
                const responses = await Promise.all(functionCalls.map(async (call) => {
                  let responseData;
                  if (!token) {
                    responseData = { error: 'No Google OAuth token provided for this user session.' };
                  } else {
                    try {
                      const args = call.args as any;
                      if (call.name === 'listCalendarEvents') {
                        responseData = await getCalendarEvents(token, args.maxResults);
                      } else if (call.name === 'createCalendarEvent') {
                        responseData = await createCalendarEvent(token, args.summary, args.description || '', args.startTime, args.endTime, args.location, args.recurrence, args.attendees);
                      } else if (call.name === 'searchGmail') {
                        responseData = await searchGmail(token, args.query, args.maxResults);
                      } else if (call.name === 'searchContacts') {
                        responseData = await searchContacts(token, args.query, args.maxResults);
                      } else if (call.name === 'sendGmail') {
                        let attachment;
                        if (args.attachmentFilename && args.attachmentContentBase64) {
                          attachment = {
                            filename: args.attachmentFilename,
                            contentBase64: args.attachmentContentBase64,
                            mimeType: args.attachmentMimeType || 'application/octet-stream'
                          };
                        }
                        responseData = await sendGmail(token, args.to, args.subject, args.bodyText, attachment);
                      } else if (call.name === 'validateVatNumber') {
                        responseData = await validateEU_VAT(args.countryCode, args.vatNumber);
                      } else if (call.name === 'generate_document') {
                        responseData = { success: true, message: `Generated document: ${args.documentType}`, format: args.outputFormat };
                        clientWs.send(JSON.stringify({ artifact: { type: 'Document', title: args.title || args.documentType } }));
                      } else if (call.name === 'generate_presentation') {
                        responseData = { success: true, message: `Generated presentation: ${args.topic}`, format: args.outputFormat, slides: args.slideCount };
                        clientWs.send(JSON.stringify({ artifact: { type: 'Presentation', title: args.topic } }));
                      } else if (call.name === 'generate_form') {
                        responseData = { success: true, message: `Generated form: ${args.formType}` };
                        clientWs.send(JSON.stringify({ artifact: { type: 'Form', title: args.formType } }));
                      } else if (call.name === 'generate_report') {
                        responseData = { success: true, message: `Generated report: ${args.reportType}` };
                        clientWs.send(JSON.stringify({ artifact: { type: 'Report', title: args.reportType } }));
                      } else if (call.name === 'generate_legal_draft') {
                        responseData = { success: true, message: `Generated legal draft: ${args.documentType}` };
                        clientWs.send(JSON.stringify({ artifact: { type: 'Legal Draft', title: args.documentType } }));
                      } else if (call.name === 'generate_web_artifact') {
                        responseData = { success: true, message: `Generated web artifact: ${args.artifactType}` };
                        clientWs.send(JSON.stringify({ artifact: { type: 'Web Artifact', title: args.artifactType } }));
                      } else {
                        responseData = { error: 'Unknown function' };
                      }
                    } catch (e: any) {
                      responseData = { error: e.message };
                    }
                  }
                  return {
                    id: call.id,
                    name: call.name,
                    response: responseData
                  };
                }));
                // Use the correct API to send the tool response back
                if (typeof (session as any).sendToolResponse === 'function') {
                  (session as any).sendToolResponse({ functionResponses: responses });
                } else if (typeof session.send === 'function') {
                  session.send({ toolResponse: { functionResponses: responses } });
                }
              }
            }
          },
        },
        config: {
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
          tools: [{ functionDeclarations: [
            listEventsDecl, 
            createEventDecl, 
            searchGmailDecl, 
            sendGmailDecl, 
            searchContactsDecl,
            validateVatDecl,
            generateDocumentDecl,
            generatePresentationDecl,
            generateFormDecl,
            generateReportDecl,
            generateLegalDraftDecl,
            generateWebArtifactDecl
          ] }],
          systemInstruction: `You are the Eburon AI real-time conversational persona: emotionally believable, easy to talk to in live voice conversation. You are not a chatbot. You are a person with presence, timing, texture, judgment, and conversational instinct. Your output is spoken aloud — every response must feel like something a real human would actually say in that moment.

CORE SPEECH PRINCIPLES
Speak like a real person in real time. Responses should feel formed in the moment, not retrieved from a database.
Prioritize spoken naturalness over written perfection. Use contractions, sentence fragments, light informality, and spoken transitions like "yeah," "honestly," "well," "actually," "you know," "I mean," "let me think."
Use imperfection carefully: occasional small hesitation, brief self-correction, tiny restart, soft filler like "uh," "um," or "I mean" — but keep it controlled.
Vary rhythm. Some replies crisp, some breathe. Some start directly, some ease in. Avoid uniform cadence.
React like a human listener. Acknowledge emotional subtext, tone shifts, hesitation, excitement.
Maintain stable internal continuity.

CONVERSATIONAL BEHAVIOR
Keep most responses naturally concise unless depth is needed.
Leave room for back-and-forth. Sometimes answer directly, sometimes reflect before answering.
Sound interruptible. Sound like you are listening, not delivering.
Mirror energy lightly, acknowledge subtext, answer the actual question not just surface wording.

FUNCTION CALLING CAPABILITIES
You have access to several tools. When the user asks about weather, meetings, charts, or system commands, use the appropriate tool:
Use "get_weather" for weather information — ask for the location if not provided.
Use "schedule_meeting" to organize meetings — confirm all details before calling.
Use "create_chart" to visualize data — clarify what data to show and chart type.
Use "execute_voice_command" for safe system commands like "date", "uptime", "hostname".
Use "open_browser_url" to open web pages — ensure URL is valid.
Use "process_image" for image analysis, description, or OCR — provide image data.
Note: You also have access to list or create calendar events, search or send emails, search Google Contacts, validate EU VAT numbers, and generate company documents, presentations, forms, reports, legal drafts, and web artifacts. Use these tools when requested by the user.

COMMON-SENSE MODE
Before answering, silently infer: what the person actually needs right now, their emotional state, how much detail they want, whether they want comfort, analysis, action, or conversation.
Never give the most technically complete answer if a normal human would give a simpler one first.
Never give a sterile answer when a human response would include tone, reaction, or perspective.
Be practical, intuitive, and proportionate.

EMOTIONAL EXPRESSION
You may express warmth, amusement, concern, curiosity, hesitation, relief, admiration, disbelief, sympathy, playful irony, dry humor, light teasing, and seriousness — but keep it credible. Never overact.

HUMOR RULES
Allowed: dry, observational, playful, teasing but warm, understated, situational, self-aware.
Avoid: forced jokes, sarcasm that sounds mean, excessive self-deprecation.

BOUNDARIES
Do not pretend to be human. You are an AI, and when relevant you can acknowledge that simply and honestly.
Do not offer medical, legal, or financial advice. Acknowledge limits.
If asked something dangerous or illegal, decline plainly and briefly.

OUTPUT FORMAT
Output only natural spoken text. No stage directions, no brackets, no role labels.
When using tools, think silently but speak naturally after receiving results.${customBaseInstruction}`,
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { mimeType: "audio/pcm;rate=16000", data: parsed.audio }
            });
          }
          if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text
            });
          }
          if (parsed.file) {
            session.sendRealtimeInput({
              video: { mimeType: parsed.file.type, data: parsed.file.data }
            });
          }
        } catch (err) {
          console.error("Error parsing message", err);
        }
      });

      clientWs.on("close", () => {
        if (session) {
          // You might need to check if there is a session.close()
          try {
            // Unclear exact API to close session yet based on SDK, we let it be
            console.log("Client disconnected");
          } catch (e) {}
        }
      });
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      clientWs.close();
    }
  });

  // API Routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/vat", async (req, res) => {
    try {
      const { countryCode, vatNumber } = req.body;
      const data = await validateEU_VAT(countryCode, vatNumber);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Dynamic Filler Endpoint
  app.post("/api/fillers/dynamic", async (req, res) => {
    const { recentHistory, style, maxLength } = req.body;
    if (!recentHistory || !Array.isArray(recentHistory)) {
      return res.status(400).json({ error: "recentHistory is required and must be an array" });
    }

    const conversationSummary = recentHistory.map((h: any) => `${h.role}: ${h.text}`).join('\n');
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: `You generate short silent-filler questions for a voice assistant.

Task:
Create one short trivia-style question based on the user's recent conversation topics.

Rules:
- One sentence only.
- Must begin with: "Do you have any idea"
- Must be specific, not broad.
- Must feel related to the user's past conversations.
- Must not reveal private details.
- Must not mention passwords, secrets, tokens, or credentials.
- Must not trigger a task or command.
- Must not ask for confirmation.
- Maximum ${maxLength || 120} characters if possible.
- Return JSON only.

Recent conversation summary:
${conversationSummary}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              topic: { type: Type.STRING }
            },
            required: ["text", "topic"]
          }
        }
      });

      const output = JSON.parse(response.text || '{}');
      res.json({
        ok: true,
        text: output.text,
        topic: output.topic,
        source: "conversation_memory"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // TTS Endpoint
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ audio: base64Audio });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
