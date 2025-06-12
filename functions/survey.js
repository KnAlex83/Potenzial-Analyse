const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { pgTable, text, serial, timestamp, integer } = require('drizzle-orm/pg-core');

// Configure for serverless environment
neonConfig.webSocketConstructor = require('ws');

// Define schema
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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!process.env.DATABASE_URL) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Database configuration missing"
      })
    };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      
      if (!data.firstName || !data.email) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: "Vorname und E-Mail sind erforderlich"
          })
        };
      }

      const userIp = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || null;
      const userAgent = event.headers['user-agent'] || null;
      
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
          totalScore: data.totalScore || 0,
          scorePercentage: data.scorePercentage || 0,
          userIp: Array.isArray(userIp) ? userIp[0] : userIp,
          userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        })
        .returning();

      // Send webhook notification (optional)
      try {
        await sendWebhook(response);
      } catch (webhookError) {
        console.log('Webhook failed:', webhookError.message);
        // Continue even if webhook fails
      }
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: "Umfrage erfolgreich übermittelt"
        })
      };
      
    } catch (error) {
      console.error("Survey submission error:", error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Fehler beim Verarbeiten der Umfrage"
        })
      };
    }
  }

  if (event.httpMethod === 'GET') {
    try {
      const responses = await db.select().from(surveyResponses);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responses)
      };
    } catch (error) {
      console.error("Error fetching responses:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Fehler beim Laden der Antworten"
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Method not allowed' })
  };
};

async function sendWebhook(response) {
  // Webhook implementation for external integrations
  if (process.env.WEBHOOK_URL) {
    const webhookData = {
      firstName: response.firstName,
      email: response.email,
      score: response.scorePercentage,
      timestamp: new Date().toISOString()
    };
    
    await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });
  }
}
