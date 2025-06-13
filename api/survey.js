// Survey API - Version 2024-06-13-12-30 - CORS Security Implementation
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { pgTable, text, serial, timestamp, integer } = require('drizzle-orm/pg-core');
const ws = require('ws');

// Rate limiting storage (in-memory for serverless functions)
const rateLimitStore = new Map();

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

  exports.handler = async (req, res) => {
  // Secure CORS configuration - only allow specific domains
  const allowedOrigins = [
    'https://potenzial.grovia-digital.com',
    'https://www.potenzial.grovia-digital.com',
    'https://grovia-digital.com',
    'https://www.grovia-digital.com'
  ];
  
  const origin = req.headers.origin;
  
  // Set CORS headers based on origin validation
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow same-origin requests (no origin header)
    res.setHeader('Access-Control-Allow-Origin', 'https://potenzial.grovia-digital.com');
  } else {
    // Log unauthorized access attempts
    console.warn('CORS violation detected:', {
      timestamp: new Date().toISOString(),
      origin: origin,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      method: req.method,
      path: req.path
    });
    
    // Block unauthorized origins
    return res.status(403).json({
      success: false,
      message: "Zugriff von dieser Domain nicht erlaubt",
      error_id: generateErrorId()
    });
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '300'); // 5 minutes preflight cache
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting check
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({
      success: false,
      message: "Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
      error_id: generateErrorId()
    });
  }

  // Request size validation (prevent large payload attacks)
  if (req.method === 'POST') {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 10240) { // 10KB limit
      return res.status(413).json({
        success: false,
        message: "Anfrage zu groß",
        error_id: generateErrorId()
      });
    }
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      success: false,
      message: "Service temporarily unavailable",
      error_id: generateErrorId()
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
      
      // First validate the request structure to prevent injection attempts
      validateInputStructure(data);
      
      // Then sanitize all inputs with comprehensive security measures
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
      // Log detailed error for internal debugging (never expose to client)
      console.error('Survey submission error:', {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      
      // Determine appropriate error response without exposing internal details
      let clientMessage = "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
      let statusCode = 500;
      
      // Handle specific validation errors safely
      if (error.message && error.message.includes('Ungültiger Wert') || 
          error.message.includes('muss ein gültiger') ||
          error.message.includes('darf nicht leer sein') ||
          error.message.includes('E-Mail') ||
          error.message.includes('muss zwischen')) {
        clientMessage = "Die übermittelten Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.";
        statusCode = 400;
      }
      
      return res.status(statusCode).json({
        success: false,
        message: clientMessage,
        error_id: generateErrorId()
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
      // Log detailed error internally without exposing database structure
      console.error('Data retrieval error:', {
        timestamp: new Date().toISOString(),
        error: error.message,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      
      return res.status(500).json({
        success: false,
        message: "Die Daten konnten nicht abgerufen werden. Bitte versuchen Sie es später erneut.",
        error_id: generateErrorId()
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

function sanitizeInputs(data) {
  const sanitized = {};
  
  // Define allowed values for each question to prevent injection
  const allowedValues = {
    question1: ['sehr-hoch', 'hoch', 'mittel', 'niedrig'],
    question2: ['sehr-viele', 'viele', 'einige', 'wenige'],
    question3: ['taeglich', 'mehrmals-woche', 'woechentlich', 'selten-nie'],
    question4: ['sehr-stark', 'stark', 'maessig', 'schwach'],
    question5: ['sehr-erfolgreich', 'erfolgreich', 'maessig-erfolgreich', 'wenig-erfolgreich'],
    question6: ['sehr-hoch', 'hoch', 'mittel', 'niedrig'],
    question7: ['sehr-gut', 'gut', 'ausreichend', 'verbesserungsbedarf'],
    question8: ['sehr-hoch', 'hoch', 'mittel', 'niedrig']
  };
  
  // Validate and sanitize survey questions with strict whitelist
  for (let i = 1; i <= 8; i++) {
    const field = `question${i}`;
    if (data[field]) {
      const value = data[field].toString().trim().toLowerCase();
      if (allowedValues[field].includes(value)) {
        sanitized[field] = value;
      } else {
        throw new Error(`Ungültiger Wert für ${field}: ${value}`);
      }
    }
  }
  
  // Enhanced sanitization for text fields with multiple layers of protection
  if (data.firstName) {
    sanitized.firstName = sanitizeTextField(data.firstName, 'firstName', 50);
  }
  
  if (data.email) {
    sanitized.email = sanitizeEmail(data.email);
  }
  
  // Strict numeric validation
  sanitized.totalScore = validateNumeric(data.totalScore, 0, 32, 'totalScore');
  sanitized.scorePercentage = validateNumeric(data.scorePercentage, 0, 100, 'scorePercentage');
  
  return sanitized;
}

function sanitizeTextField(input, fieldName, maxLength) {
  if (!input || typeof input !== 'string') {
    throw new Error(`${fieldName} muss ein gültiger Text sein`);
  }
  
  let sanitized = input.toString().trim();
  
  // Remove all HTML tags and entities
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/&[^;]+;/g, '');
  
  // Remove JavaScript protocols and dangerous patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/file:/gi, '');
  
  // Remove SQL injection patterns more comprehensively
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|DECLARE|CAST|CONVERT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|\||&|\$|\(|\)|\{|\}|\[|\]|\\)/g,
    /(\bOR\b|\bAND\b|\bNOT\b|\bLIKE\b|\bBETWEEN\b|\bIN\b|\bEXISTS\b)/gi
  ];
  
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<applet[^>]*>.*?<\/applet>/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /url\s*\(/gi,
    /@import/gi
  ];
  
  xssPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove control characters and normalize whitespace
  sanitized = sanitized.replace(/[\r\n\t\f\v\0]/g, ' ');
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Length validation
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Final validation - only allow alphanumeric, spaces, and basic punctuation
  sanitized = sanitized.replace(/[^a-zA-ZäöüÄÖÜß0-9\s\-\.,]/g, '');
  
  sanitized = sanitized.trim();
  
  if (sanitized.length === 0) {
    throw new Error(`${fieldName} darf nicht leer sein nach der Bereinigung`);
  }
  
  return sanitized;
}

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('E-Mail muss ein gültiger Text sein');
  }
  
  let sanitized = email.toString().trim().toLowerCase();
  
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Ungültiges E-Mail-Format');
  }
  
  // Additional security checks
  if (sanitized.includes('..') || sanitized.startsWith('.') || sanitized.endsWith('.')) {
    throw new Error('E-Mail enthält ungültige Zeichen');
  }
  
  // Length validation
  if (sanitized.length > 255) {
    throw new Error('E-Mail ist zu lang');
  }
  
  return sanitized;
}

function validateNumeric(value, min, max, fieldName) {
  const num = parseInt(value);
  
  if (isNaN(num)) {
    throw new Error(`${fieldName} muss eine gültige Zahl sein`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} muss zwischen ${min} und ${max} liegen`);
  }
  
  return num;
}

function generateErrorId() {
  return 'ERR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function checkRateLimit(clientIP) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10; // Maximum 10 requests per 15 minutes per IP
  
  // Clean old entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > windowMs) {
      rateLimitStore.delete(ip);
    }
  }
  
  // Check current IP
  if (!rateLimitStore.has(clientIP)) {
    rateLimitStore.set(clientIP, {
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  const ipData = rateLimitStore.get(clientIP);
  
  // Reset window if expired
  if (now - ipData.windowStart > windowMs) {
    rateLimitStore.set(clientIP, {
      count: 1,
      windowStart: now
    });
    return true;
  }
  
  // Check if under limit
  if (ipData.count < maxRequests) {
    ipData.count++;
    return true;
  }
  
  return false; // Rate limit exceeded
}

function validateInputStructure(data) {
  // Validate request structure before processing
  if (!data || typeof data !== 'object') {
    throw new Error('Ungültige Anfragstruktur');
  }
  
  // Check for unexpected fields that might indicate injection attempts
  const allowedFields = [
    'question1', 'question2', 'question3', 'question4', 'question5', 
    'question6', 'question7', 'question8', 'firstName', 'email', 
    'totalScore', 'scorePercentage'
  ];
  
  const providedFields = Object.keys(data);
  const unexpectedFields = providedFields.filter(field => !allowedFields.includes(field));
  
  if (unexpectedFields.length > 0) {
    throw new Error(`Unerwartete Felder in der Anfrage: ${unexpectedFields.join(', ')}`);
  }
  
  // Check for nested objects or arrays that might contain malicious payloads
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === 'object') {
      throw new Error(`Feld ${key} darf kein Objekt oder Array enthalten`);
    }
  }
  
  return true;
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
