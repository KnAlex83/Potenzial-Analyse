import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSurveyResponseSchema } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Survey submission endpoint
  app.post("/api/survey", async (req, res) => {
    try {
      // Validate request body using Zod schema
      const validatedData = insertSurveyResponseSchema.parse(req.body);
      
      // Get client IP and user agent for tracking
      const userIp = req.ip || req.connection.remoteAddress || null;
      const userAgent = req.get('User-Agent') || null;
      
      // Calculate score on server side
      const totalScore = req.body.totalScore || 0;
      const scorePercentage = req.body.scorePercentage || 0;
      
      // Store survey response
      const response = await storage.createSurveyResponse({
        ...validatedData,
        userIp,
        userAgent,
        totalScore,
        scorePercentage,
      });
      
      // Send webhook if configured
      await sendWebhook(response);
      
      res.status(201).json({ 
        success: true, 
        message: "Umfrage erfolgreich übermittelt",
        id: response.id 
      });
      
    } catch (error) {
      console.error("Survey submission error:", error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validierungsfehler",
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Fehler beim Speichern der Umfrage"
      });
    }
  });

  // Get all survey responses (admin endpoint)
  app.get("/api/survey/responses", async (req, res) => {
    try {
      const responses = await storage.getAllSurveyResponses();
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({
        success: false,
        message: "Fehler beim Laden der Antworten"
      });
    }
  });

  // Export survey responses as CSV
  app.get("/api/survey/export", async (req, res) => {
    try {
      const responses = await storage.getAllSurveyResponses();
      
      // Create CSV headers
      const headers = [
        "ID",
        "Frage 1 (Unentdeckte Chancen)",
        "Frage 2 (Wöchentliche Stunden)",
        "Frage 3 (3-Monats-Ziel)",
        "Frage 4 (Vision 1-2 Jahre)",
        "Frage 5 (Personal Branding Zustimmung)",
        "Frage 6 (Umsetzungsbereitschaft)",
        "Frage 7 (Veränderungswille)",
        "Frage 8 (Investitionsbereitschaft)",
        "Vorname",
        "E-Mail",
        "Gesamtpunktzahl",
        "Prozent",
        "IP-Adresse",
        "User Agent",
        "Zeitstempel"
      ];
      
      // Convert responses to CSV format
      const csvRows = [
        headers.join(","),
        ...responses.map(response => [
          response.id,
          `"${getQuestion1Label(response.question1)}"`,
          `"${getQuestion2Label(response.question2)}"`,
          `"${getQuestion3Label(response.question3)}"`,
          `"${getQuestion4Label(response.question4)}"`,
          `"${getQuestion5Label(response.question5)}"`,
          `"${getQuestion6Label(response.question6)}"`,
          `"${getQuestion7Label(response.question7)}"`,
          `"${getQuestion8Label(response.question8)}"`,
          `"${response.firstName.replace(/"/g, '""')}"`,
          `"${response.email.replace(/"/g, '""')}"`,
          response.totalScore,
          response.scorePercentage,
          `"${response.userIp || ''}"`,
          `"${response.userAgent || ''}"`,
          `"${response.timestamp}"`
        ].join(","))
      ];
      
      const csvContent = csvRows.join("\n");
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="survey-responses.csv"');
      res.send(csvContent);
      
    } catch (error) {
      console.error("Error exporting responses:", error);
      res.status(500).json({
        success: false,
        message: "Fehler beim Exportieren der Daten"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function sendWebhook(response: any) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) return;
  
  try {
    const webhookData = {
      id: response.id,
      timestamp: response.timestamp,
      question1: {
        value: response.question1,
        label: getQuestion1Label(response.question1)
      },
      question2: {
        value: response.question2,
        label: getQuestion2Label(response.question2)
      },
      question3: {
        value: response.question3,
        label: getQuestion3Label(response.question3)
      },
      question4: {
        value: response.question4,
        label: getQuestion4Label(response.question4)
      },
      question5: {
        value: response.question5,
        label: getQuestion5Label(response.question5)
      },
      question6: {
        value: response.question6,
        label: getQuestion6Label(response.question6)
      },
      question7: {
        value: response.question7,
        label: getQuestion7Label(response.question7)
      },
      question8: {
        value: response.question8,
        label: getQuestion8Label(response.question8)
      },
      scoring: {
        totalScore: response.totalScore,
        percentage: response.scorePercentage
      },
      contact: {
        firstName: response.firstName,
        email: response.email
      },
      metadata: {
        userIp: response.userIp,
        userAgent: response.userAgent
      }
    };
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });
    
  } catch (error) {
    console.error("Webhook error:", error);
    // Don't fail the request if webhook fails
  }
}

function getQuestion1Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "Kaum – ich starte gerade erst",
    option2: "Einige – ich spüre, dass mehr möglich wäre",
    option3: "Viele! Ich ahne, wieviel Potenzial brachliegt",
    option4: "Massive Mengen – es hält mein Business zurück"
  };
  return labels[value] || value;
}

function getQuestion2Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "< 2h (riskiert Stillstand)",
    option2: "2-4h (Minimalaufwand für erste Schritte)",
    option3: "5-8h (ideales Tempo für spürbare Veränderung)",
    option4: "> 8h (Turbo-Transformation möglich)"
  };
  return labels[value] || value;
}

function getQuestion3Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "🔥 Exakt messbar & terminiert",
    option2: "✅ Klarer Fokus",
    option3: "🟡 Teilweise konkret",
    option4: "⚠️ Vage",
    option5: "❌ Kein Ziel / unsicher"
  };
  return labels[value] || value;
}

function getQuestion4Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "🌟 Klare Skalierung",
    option2: "🚀 Wachstum mit Plan",
    option3: "⏱️ Stabilisierung",
    option4: "🔍 Unklar",
    option5: "❌ Keine Vision"
  };
  return labels[value] || value;
}

function getQuestion5Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "Stimme VOLL zu (erkenne den systemischen Hebel)",
    option2: "Stimme zu (sehe den Trend)",
    option3: "Neutral",
    option4: "Stimme nicht zu (glaube an veraltete Methoden)"
  };
  return labels[value] || value;
}

function getQuestion6Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "💯 Starte direkt durch – ich will keine Zeit verlieren!",
    option2: "✅ Werde viel umsetzen (ggf. mit Support)",
    option3: "⏸️ Brauche erst externe Motivation"
  };
  return labels[value] || value;
}

function getQuestion7Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "Extrem! Ich bin bereit für den nächsten Level-Sprung",
    option2: "Sehr – ich spüre die Dringlichkeit",
    option3: "Mittel – aber ich zögere noch",
    option4: "Gering – ich warte lieber ab"
  };
  return labels[value] || value;
}

function getQuestion8Label(value: string): string {
  const labels: Record<string, string> = {
    option1: "JA – ich will JETZT durchstarten!",
    option2: "Vielleicht – brauche Details zum ROI",
    option3: "Nein – ich unterschätze noch den Hebel"
  };
  return labels[value] || value;
}
