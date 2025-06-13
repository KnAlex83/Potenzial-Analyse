const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { pgTable, text, serial, timestamp, integer } = require('drizzle-orm/pg-core');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

// Define schema directly in API file for Vercel compatibility
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
  const db = drizzle({ client: pool });

  if (req.method === 'POST') {
       // API Authentication - Require API key for POST requests
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!process.env.API_KEY || apiKey !== process.env.API_KEY) {
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
      
      const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;
    
      const [response] = await db
        .insert(surveyResponses)
        .values({
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
          totalScore: sanitizedData.totalScore,
          scorePercentage: sanitizedData.scorePercentage,
          userIp: Array.isArray(userIp) ? userIp[0] : userIp,
          userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        })
        .returning();
      
      return res.status(201).json({ 
        success: true, 
        message: "Umfrage erfolgreich übermittelt"
      });
      
    } catch (error) {
      console.error("Survey submission error:", error);
      return res.status(400).json({
        success: false,
        message: "Fehler beim Verarbeiten der Umfrage"
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const responses = await db.select().from(surveyResponses);
      return res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      return res.status(500).json({
        success: false,
        message: "Fehler beim Laden der Antworten"
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
        // Remove ALL shell metacharacters and command injection attempts
        .replace(/[<>\"'&;|`$(){}[\]\\*?~!#^]/g, '')
        // Remove potential SQL injection patterns
        .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '')
        // Remove newlines and control characters
        .replace(/[\r\n\t\f\v]/g, ' ')
        .substring(0, field === 'email' ? 255 : 100)
        .trim();
    }
  }
  
  sanitized.totalScore = Math.max(0, Math.min(32, parseInt(data.totalScore) || 0));
  sanitized.scorePercentage = Math.max(0, Math.min(100, parseInt(data.scorePercentage) || 0));
  
  return sanitized;
}
