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
  const allowedOrigins = [
    'https://potenzial.grovia-digital.com',
    'https://grovia-digital.com',
    'http://localhost:5173' // For development only
  ];
  
  const origin = event.headers.origin;
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : 'https://potenzial.grovia-digital.com';
  
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'false',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
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
      // Rate limiting check
      const clientIp = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
      
      const data = JSON.parse(event.body);
      
      // Input validation and sanitization
      const validation = validateSurveyData(data);
      if (!validation.isValid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: validation.message
          })
        };
      }
      
      // Sanitize inputs
      const sanitizedData = sanitizeInputs(data);

      const userIp = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || null;
      const userAgent = event.headers['user-agent'] || null;
      
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
          totalScore: sanitizedData.totalScore || 0,
          scorePercentage: sanitizedData.scorePercentage || 0,
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
    // Require API key for data access
    const apiKey = event.headers['x-api-key'] || event.queryStringParameters?.api_key;
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey || apiKey !== validApiKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Unauthorized access"
        })
      };
    }
    
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

// Input validation function
function validateSurveyData(data) {
  const requiredFields = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'question8', 'firstName', 'email'];
  
  // Check required fields
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
      return { isValid: false, message: `Feld ${field} ist erforderlich` };
    }
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { isValid: false, message: "Ungültige E-Mail-Adresse" };
  }
  
  // Validate name length and characters
  if (data.firstName.length > 100 || !/^[a-zA-ZäöüÄÖÜß\s\-']+$/.test(data.firstName)) {
    return { isValid: false, message: "Ungültiger Vorname" };
  }
  
  // Validate email length
  if (data.email.length > 255) {
    return { isValid: false, message: "E-Mail-Adresse zu lang" };
  }
  
  // Validate survey answers (must be from predefined options)
  const validAnswers = ['a', 'b', 'c', 'd'];
  for (let i = 1; i <= 8; i++) {
    const answer = data[`question${i}`];
    if (!validAnswers.includes(answer)) {
      return { isValid: false, message: `Ungültige Antwort für Frage ${i}` };
    }
  }
  
  // Validate scores
  if (data.totalScore && (typeof data.totalScore !== 'number' || data.totalScore < 0 || data.totalScore > 32)) {
    return { isValid: false, message: "Ungültiger Gesamtscore" };
  }
  
  if (data.scorePercentage && (typeof data.scorePercentage !== 'number' || data.scorePercentage < 0 || data.scorePercentage > 100)) {
    return { isValid: false, message: "Ungültiger Prozentwert" };
  }
  
  return { isValid: true };
}

// Input sanitization function
function sanitizeInputs(data) {
  const sanitized = {};
  
  // Sanitize string fields
  const stringFields = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'question8', 'firstName', 'email'];
  
  for (const field of stringFields) {
    if (data[field]) {
      sanitized[field] = data[field]
        .toString()
        .trim()
        .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
        .substring(0, field === 'email' ? 255 : 100); // Limit length
    }
  }
  
  // Sanitize numeric fields
  sanitized.totalScore = Math.max(0, Math.min(32, parseInt(data.totalScore) || 0));
  sanitized.scorePercentage = Math.max(0, Math.min(100, parseInt(data.scorePercentage) || 0));
  
  return sanitized;
}

async function sendWebhook(response) {
  // Webhook implementation for external integrations
  if (process.env.WEBHOOK_URL) {
    const webhookData = {
      firstName: response.firstName,
      email: response.email,
      score: response.scorePercentage,
      timestamp: new Date().toISOString()
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
