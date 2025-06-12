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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    try {
      const data = req.body;
      
      if (!data.firstName || !data.email) {
        return res.status(400).json({
          success: false,
          message: "Vorname und E-Mail sind erforderlich"
        });
      }
      
      const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;
      
      const totalScore = data.totalScore || 0;
      const scorePercentage = data.scorePercentage || 0;
      
      const [response] = await db
        .insert(surveyResponses)
        .values({
          question1: data.question1,
          question2: data.question2,
          question3: data.question3,
          question4: data.question4,
          question5: data.question5,
          question6: data.question6,
          question7: data.question7,
          question8: data.question8,
          firstName: data.firstName,
          email: data.email,
          totalScore,
          scorePercentage,
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
