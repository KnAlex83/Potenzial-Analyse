// Survey API - Version 2024-06-13-10-35 - Force Cache Refresh
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { pgTable, text, serial, timestamp, integer } = require('drizzle-orm/pg-core');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

// Define schema directly in API file for Netlify compatibility
const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  question1: text("question1").notNull(),
  question2: text("question2").notNull(),
  question3: text("question3").notNull(),
  question4: text("question4").notNull(),
  question5: text("question5").notNull(),
  question6: text("question6").notNull(),
  question7: text("question7").notNull(),
  question8: text("question8").notNull(),
  firstName: text("first_name").notNull(),
  email: text("email").notNull(),
  totalScore: integer("total_score").notNull(),
  scorePercentage: integer("score_percentage").notNull(),
  userIp: text("user_ip"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      success: false,
      message: "Database connection not configured"
    });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  if (req.method === 'POST') {
    // CRITICAL: API Authentication - Require API key for POST requests
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    // First check: Environment variable exists
    if (!process.env.API_KEY) {
      return res.status(500).json({
        success: false,
        message: "API key not configured"
      });
    }
    
    // Second check: API key provided and matches
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access - API key required"
      });
    }
      
    try {
      const data = req.body;
      const sanitizedData = sanitizeInputs(data);
      
      // Validate required survey questions first
      const requiredQuestions = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'question8'];
      for (const field of requiredQuestions) {
        if (!sanitizedData[field]) {
          return res.status(400).json({
            success: false,
            message: `Feld ${field} ist erforderlich`
          });
        }
      }
      
      if (!sanitizedData.firstName || !sanitizedData.email) {
        return res.status(400).json({
          success: false,
          message: "Vorname und E-Mail sind erforderlich"
        });
      }
      
      const totalScore = sanitizedData.totalScore || 0;
      const scorePercentage = sanitizedData.scorePercentage || 0;
      
      const response = {
        question1: sanitizedData.question1,
        question2: sanitizedData.question2,
        question3: sanitizedData.question3,
        question4: sanitizedData.question4,
        question5: sanitizedData.question5,
        question6: sanitizedData.question6,
        question7: sanitizedData.question7,
        question8: sanitizedData.question8,
        firstName: sanitizedData.firstName,
        email: sanitizedData.email,
        totalScore: totalScore,
        scorePercentage: scorePercentage,
        userIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null
      };
      
      // Insert into database
      const [insertedResponse] = await db.insert(surveyResponses).values(response).returning();
      
      // Send webhook
      await sendWebhook(response);
      
      return res.json({
        success: true,
        message: "Umfrage erfolgreich übermittelt",
        data: {
          id: insertedResponse.id,
          scorePercentage: scorePercentage
        }
      });
      
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: "Datenbankfehler beim Speichern der Antworten"
      });
    }
  }

  if (req.method === 'GET') {
    // GET requests also require authentication
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access"
      });
    }
    
    try {
      const responses = await db.select().from(surveyResponses);
      return res.json(responses);
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: "Fehler beim Abrufen der Daten"
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

function sanitizeInputs(data) {
  const sanitized = {};
  
  const stringFields = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'question8', 'firstName', 'email'];
  
  for (const field of stringFields) {
    if (data[field]) {
      sanitized[field] = data[field]
        .toString()
        .trim()
        .replace(/[<>"'&;|`$(){}[\]\\*?~!#^]/g, '')
        .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '')
        .replace(/[\r\n\t\f\v]/g, ' ')
        .substring(0, field === 'email' ? 255 : 100)
        .trim();
    }
  }
  
  sanitized.totalScore = Math.max(0, Math.min(32, parseInt(data.totalScore) || 0));
  sanitized.scorePercentage = Math.max(0, Math.min(100, parseInt(data.scorePercentage) || 0));
  
  return sanitized;
}

async function sendWebhook(response) {
  try {
    if (!process.env.WEBHOOK_URL) {
      console.log('No webhook URL configured, skipping webhook');
      return;
    }

    const webhookData = {
      timestamp: new Date().toISOString(),
      survey_response: response,
      labels: {
        question1: getQuestion1Label(response.question1),
        question2: getQuestion2Label(response.question2),
        question3: getQuestion3Label(response.question3),
        question4: getQuestion4Label(response.question4),
        question5: getQuestion5Label(response.question5),
        question6: getQuestion6Label(response.question6),
        question7: getQuestion7Label(response.question7),
        question8: getQuestion8Label(response.question8)
      }
    };

    const webhookResponse = await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
    }
  } catch (error) {
    console.error('Webhook error:', error);
  }
}

function getQuestion1Label(value) {
  const labels = {
    'sehr-hoch': 'Sehr hoch',
    'hoch': 'Hoch',
    'mittel': 'Mittel',
    'niedrig': 'Niedrig'
  };
  return labels[value] || value;
}

function getQuestion2Label(value) {
  const labels = {
    'sehr-viele': 'Sehr viele',
    'viele': 'Viele',
    'einige': 'Einige',
    'wenige': 'Wenige'
  };
  return labels[value] || value;
}

function getQuestion3Label(value) {
  const labels = {
    'taeglich': 'Täglich',
    'mehrmals-woche': 'Mehrmals pro Woche',
    'woechentlich': 'Wöchentlich',
    'selten-nie': 'Selten/Nie'
  };
  return labels[value] || value;
}

function getQuestion4Label(value) {
  const labels = {
    'sehr-stark': 'Sehr stark',
    'stark': 'Stark',
    'maessig': 'Mäßig',
    'schwach': 'Schwach'
  };
  return labels[value] || value;
}

function getQuestion5Label(value) {
  const labels = {
    'sehr-erfolgreich': 'Sehr erfolgreich',
    'erfolgreich': 'Erfolgreich',
    'maessig-erfolgreich': 'Mäßig erfolgreich',
    'wenig-erfolgreich': 'Wenig erfolgreich'
  };
  return labels[value] || value;
}

function getQuestion6Label(value) {
  const labels = {
    'sehr-hoch': 'Sehr hoch',
    'hoch': 'Hoch',
    'mittel': 'Mittel',
    'niedrig': 'Niedrig'
  };
  return labels[value] || value;
}

function getQuestion7Label(value) {
  const labels = {
    'sehr-gut': 'Sehr gut',
    'gut': 'Gut',
    'ausreichend': 'Ausreichend',
    'verbesserungsbedarf': 'Verbesserungsbedarf'
  };
  return labels[value] || value;
}

function getQuestion8Label(value) {
  const labels = {
    'sehr-hoch': 'Sehr hoch',
    'hoch': 'Hoch',
    'mittel': 'Mittel',
    'niedrig': 'Niedrig'
  };
  return labels[value] || value;
}
