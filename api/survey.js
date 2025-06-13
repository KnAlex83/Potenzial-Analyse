// Survey API - Production Ready - Database Schema Matched
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');

// Rate limiting storage (in-memory for serverless functions)
const rateLimitStore = new Map();

neonConfig.webSocketConstructor = ws;

exports.handler = async (event, context) => {
  // Extract request details from Netlify event
  const { httpMethod: method, headers, body } = event;
  
  // Secure CORS configuration - only allow specific domains
  const allowedOrigins = [
    'https://potenzial.grovia-digital.com',
    'https://www.potenzial.grovia-digital.com',
    'https://grovia-digital.com',
    'https://www.grovia-digital.com'
  ];
  
  const origin = headers.origin;
  
  // Prepare response headers
  const responseHeaders = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Max-Age': '300',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
  
  // Set CORS headers based on origin validation
  if (allowedOrigins.includes(origin)) {
    responseHeaders['Access-Control-Allow-Origin'] = origin;
  } else if (!origin) {
    // Allow same-origin requests (no origin header)
    responseHeaders['Access-Control-Allow-Origin'] = 'https://potenzial.grovia-digital.com';
  } else {
    // Log unauthorized access attempts
    console.warn('CORS violation detected:', {
      timestamp: new Date().toISOString(),
      origin: origin,
      userAgent: headers['user-agent'],
      ip: headers['x-forwarded-for'] || headers['client-ip'],
      method: method
    });
    
    // Block unauthorized origins
    return {
      statusCode: 403,
      headers: responseHeaders,
      body: JSON.stringify({
        success: false,
        message: "Zugriff von dieser Domain nicht erlaubt",
        error_id: generateErrorId()
      })
    };
  }

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: ''
    };
  }

  // Rate limiting check
  const clientIP = headers['x-forwarded-for'] || headers['client-ip'] || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return {
      statusCode: 429,
      headers: responseHeaders,
      body: JSON.stringify({
        success: false,
        message: "Zu viele Anfragen. Bitte versuchen Sie es später erneut.",
        error_id: generateErrorId()
      })
    };
  }

  // Request size validation (10KB limit)
  const requestSize = body ? Buffer.byteLength(body, 'utf8') : 0;
  if (requestSize > 10240) {
    return {
      statusCode: 413,
      headers: responseHeaders,
      body: JSON.stringify({
        success: false,
        message: "Anfrage zu groß",
        error_id: generateErrorId()
      })
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({
        success: false,
        message: "Service temporarily unavailable",
        error_id: generateErrorId()
      })
    };
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  if (method === 'POST') {
    // CRITICAL: API Authentication - Require API key for POST requests
    const apiKey = headers['x-api-key'] || headers['authorization']?.replace('Bearer ', '');
    
    // First check: Environment variable exists
    if (!process.env.API_KEY) {
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({
          success: false,
          message: "Service configuration error",
          error_id: generateErrorId()
        })
      };
    }

    // Second check: API key provided and valid
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return {
        statusCode: 401,
        headers: responseHeaders,
        body: JSON.stringify({
          success: false,
          message: "Unauthorized access - API key required"
        })
      };
    }

    try {
      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: JSON.stringify({
            success: false,
            message: "Invalid JSON format",
            error_id: generateErrorId()
          })
        };
      }

      // Input structure validation
      const validationError = validateInputStructure(requestData);
      if (validationError) {
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: JSON.stringify({
            success: false,
            message: "Validierungsfehler",
            errors: [validationError],
            error_id: generateErrorId()
          })
        };
      }

      // Enhanced input sanitization
      const sanitizedData = sanitizeInputs(requestData);
      
      // Additional validation for sanitized data
      if (!sanitizedData || typeof sanitizedData !== 'object') {
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: JSON.stringify({
            success: false,
            message: "Daten konnten nicht verarbeitet werden",
            error_id: generateErrorId()
          })
        };
      }

      // Calculate scores
      const scores = {
        question1: getQuestionScore(sanitizedData.question1, 1),
        question2: getQuestionScore(sanitizedData.question2, 2),
        question3: getQuestionScore(sanitizedData.question3, 3),
        question4: getQuestionScore(sanitizedData.question4, 4),
        question5: getQuestionScore(sanitizedData.question5, 5),
        question6: getQuestionScore(sanitizedData.question6, 6),
        question7: getQuestionScore(sanitizedData.question7, 7),
        question8: getQuestionScore(sanitizedData.question8, 8),
      };

      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
      const maxScore = 32; // Maximum possible score
      const scorePercentage = Math.round((totalScore / maxScore) * 100);

      // Use raw SQL insert to match exact database schema
      const insertQuery = `
        INSERT INTO survey_responses (
          question1, question2, question3, question4, question5, question6, question7, question8,
          first_name, email, total_score, score_percentage, user_ip, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id;
      `;

      const values = [
        sanitizedData.question1,
        sanitizedData.question2,
        sanitizedData.question3,
        sanitizedData.question4,
        sanitizedData.question5,
        sanitizedData.question6,
        sanitizedData.question7,
        sanitizedData.question8,
        sanitizedData.firstName,
        sanitizedData.email,
        totalScore,
        scorePercentage,
        clientIP,
        headers['user-agent'] || null
      ];

      // Execute database insertion
      const result = await pool.query(insertQuery, values);
      const insertedId = result.rows[0]?.id;
      
      // Send webhook with enhanced data
      const webhookData = {
        submission_id: insertedId,
        question1: sanitizedData.question1,
        question2: sanitizedData.question2,
        question3: sanitizedData.question3,
        question4: sanitizedData.question4,
        question5: sanitizedData.question5,
        question6: sanitizedData.question6,
        question7: sanitizedData.question7,
        question8: sanitizedData.question8,
        first_name: sanitizedData.firstName,
        email: sanitizedData.email,
        total_score: totalScore,
        score_percentage: scorePercentage,
        question1_label: getQuestion1Label(sanitizedData.question1),
        question2_label: getQuestion2Label(sanitizedData.question2),
        question3_label: getQuestion3Label(sanitizedData.question3),
        question4_label: getQuestion4Label(sanitizedData.question4),
        question5_label: getQuestion5Label(sanitizedData.question5),
        question6_label: getQuestion6Label(sanitizedData.question6),
        question7_label: getQuestion7Label(sanitizedData.question7),
        question8_label: getQuestion8Label(sanitizedData.question8),
        timestamp: new Date().toISOString(),
        user_ip: clientIP,
        user_agent: headers['user-agent'] || null
      };

      await sendWebhook(webhookData);

      return {
        statusCode: 201,
        headers: responseHeaders,
        body: JSON.stringify({
          success: true,
          message: "Umfrage erfolgreich übermittelt",
          id: insertedId
        })
      };

    } catch (error) {
      console.error('Database error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        errorId: generateErrorId()
      });

      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({
          success: false,
          message: "Datenbankfehler beim Speichern der Antworten",
          error_id: generateErrorId()
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers: responseHeaders,
    body: JSON.stringify({
      success: false,
      message: "Method not allowed"
    })
  };
};

// Generate unique error ID for tracking
function generateErrorId() {
  return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Enhanced rate limiting with IP-based tracking
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10;
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const userLimit = rateLimitStore.get(ip);
  
  if (now > userLimit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Input structure validation with security checks
function validateInputStructure(data) {
  if (!data || typeof data !== 'object') {
    return { field: 'body', message: 'Request body must be a valid object' };
  }
  
  // Check for nested objects or arrays that could be malicious
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      return { field: key, message: 'Nested objects are not allowed' };
    }
    if (Array.isArray(value)) {
      return { field: key, message: 'Arrays are not allowed' };
    }
  }
  
  // Required fields validation
  const requiredFields = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'question8', 'firstName', 'email'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return { field, message: `Feld ${field} ist erforderlich` };
    }
  }
  
  return null;
}

// Comprehensive input sanitization with security focus
function sanitizeInputs(data) {
  const sanitized = {};
  
  // Whitelist of allowed question values for strict validation
  const questionOptions = {
    question1: ['option1', 'option2', 'option3', 'option4'],
    question2: ['option1', 'option2', 'option3', 'option4'],
    question3: ['option1', 'option2', 'option3', 'option4', 'option5'],
    question4: ['option1', 'option2', 'option3', 'option4', 'option5'],
    question5: ['option1', 'option2', 'option3', 'option4'],
    question6: ['option1', 'option2', 'option3'],
    question7: ['option1', 'option2', 'option3', 'option4'],
    question8: ['option1', 'option2', 'option3']
  };

  // Sanitize survey questions with strict whitelist validation
  for (let i = 1; i <= 8; i++) {
    const questionKey = `question${i}`;
    const value = data[questionKey];
    const allowedOptions = questionOptions[questionKey];
    
    if (allowedOptions && allowedOptions.includes(value)) {
      sanitized[questionKey] = value;
    } else {
      throw new Error(`Invalid option for ${questionKey}: ${value}`);
    }
  }

  // Sanitize text fields with enhanced security
  sanitized.firstName = sanitizeTextField(data.firstName, 'firstName', 100);
  sanitized.email = sanitizeEmail(data.email);

  return sanitized;
}

// Enhanced text field sanitization with XSS and injection protection
function sanitizeTextField(input, fieldName, maxLength) {
  if (typeof input !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  // Length validation
  if (input.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }

  // Remove HTML tags and entities
  let sanitized = input.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/&[#\w]+;/g, '');
  
  // Remove potential script injections
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/('|(\\\\)+|(\\'))+/g, '');
  sanitized = sanitized.replace(/((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi, '');
  sanitized = sanitized.replace(/((\%27)|(\'))union/gi, '');
  sanitized = sanitized.replace(/union((\s)*)((\%20)*)((\%23)*)/gi, '');
  sanitized = sanitized.replace(/select((\s)*)((\%20)*)((\%23)*)/gi, '');
  sanitized = sanitized.replace(/insert((\s)*)((\%20)*)((\%23)*)/gi, '');
  sanitized = sanitized.replace(/delete((\s)*)((\%20)*)((\%23)*)/gi, '');
  sanitized = sanitized.replace(/update((\s)*)((\%20)*)((\%23)*)/gi, '');
  sanitized = sanitized.replace(/drop((\s)*)((\%20)*)((\%23)*)/gi, '');
  
  // Normalize whitespace and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  sanitized = sanitized.trim();
  
  // Final validation
  if (sanitized.length === 0 && input.length > 0) {
    throw new Error(`${fieldName} contains invalid characters`);
  }

  return sanitized;
}

// Enhanced email sanitization
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Length validation
  if (email.length > 254) {
    throw new Error('Email exceeds maximum length');
  }

  // Remove dangerous characters
  const sanitized = email.replace(/[<>'"&]/g, '');
  
  // Check for injection attempts
  if (sanitized !== email) {
    throw new Error('Email contains invalid characters');
  }

  return sanitized.toLowerCase().trim();
}

// Scoring functions
function getQuestionScore(value, questionNumber) {
  const scoringMaps = {
    1: { 'option1': 1, 'option2': 2, 'option3': 3, 'option4': 4 },
    2: { 'option1': 1, 'option2': 2, 'option3': 3, 'option4': 4 },
    3: { 'option1': 1, 'option2': 2, 'option3': 3, 'option4': 4, 'option5': 5 },
    4: { 'option1': 1, 'option2': 2, 'option3': 3, 'option4': 4, 'option5': 5 },
    5: { 'option1': 1, 'option2': 2, 'option3': 3, 'option4': 4 },
    6: { 'option1': 1, 'option2': 2, 'option3': 3 },
    7: { 'option1': 1, 'option2': 2, 'option3': 3, 'option4': 4 },
    8: { 'option1': 1, 'option2': 2, 'option3': 3 }
  };
  
  return scoringMaps[questionNumber]?.[value] || 0;
}

// Webhook function
async function sendWebhook(response) {
  // Webhook implementation would go here
  console.log('Webhook data prepared:', response);
}

// Label functions for webhook data
function getQuestion1Label(value) {
  const labels = {
    'option1': 'Anfänger - Ich kenne die Grundlagen kaum',
    'option2': 'Fortgeschritten - Ich habe ein solides Grundverständnis',
    'option3': 'Experte - Ich verstehe die meisten Strategien',
    'option4': 'Profi - Ich bin sehr versiert in Personal Branding'
  };
  return labels[value] || value;
}

function getQuestion2Label(value) {
  const labels = {
    'option1': '0-2 (Wenig bis gar keine)',
    'option2': '3-5 (Einige potenzielle Kontakte)',
    'option3': '6-10 (Regelmäßige Anfragen)',
    'option4': '> 10 (Viele verpasste Chancen)'
  };
  return labels[value] || value;
}

function getQuestion3Label(value) {
  const labels = {
    'option1': 'Gar nicht sichtbar',
    'option2': 'Sporadisch aktiv',
    'option3': 'Regelmäßig präsent',
    'option4': 'Sehr aktiv und engagiert',
    'option5': 'Thought Leader in meiner Branche'
  };
  return labels[value] || value;
}

function getQuestion4Label(value) {
  const labels = {
    'option1': 'Kaum Resonanz',
    'option2': 'Wenige Likes/Kommentare',
    'option3': 'Moderate Interaktion',
    'option4': 'Gute Resonanz',
    'option5': 'Hohe Interaktionsraten'
  };
  return labels[value] || value;
}

function getQuestion5Label(value) {
  const labels = {
    'option1': 'Gar nicht',
    'option2': 'Selten',
    'option3': 'Gelegentlich',
    'option4': 'Regelmäßig'
  };
  return labels[value] || value;
}

function getQuestion6Label(value) {
  const labels = {
    'option1': 'Sehr unzufrieden',
    'option2': 'Unzufrieden',
    'option3': 'Zufrieden'
  };
  return labels[value] || value;
}

function getQuestion7Label(value) {
  const labels = {
    'option1': '< 1h (Wenig Zeit)',
    'option2': '1-3h (Moderate Zeit)',
    'option3': '4-8h (Viel Zeit)',
    'option4': '> 8h (Turbo-Transformation möglich)'
  };
  return labels[value] || value;
}

function getQuestion8Label(value) {
  const labels = {
    'option1': 'Sehr hoch',
    'option2': 'Hoch',
    'option3': 'Mittel'
  };
  return labels[value] || value;
}
