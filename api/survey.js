const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

const rateLimitStore = new Map();

function generateErrorId() {
  return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
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

function sanitizeInputs(data) {
  const sanitized = {};
  
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

  sanitized.firstName = data.firstName.replace(/<[^>]*>/g, '').trim();
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }
  sanitized.email = data.email.toLowerCase().trim();

  return sanitized;
}

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

exports.handler = async (event, context) => {
  const { httpMethod: method, headers, body } = event;
  
  const allowedOrigins = [
    'https://potenzial.grovia-digital.com',
    'https://www.potenzial.grovia-digital.com',
    'https://grovia-digital.com',
    'https://www.grovia-digital.com'
  ];
  
  const origin = headers.origin;
  
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
  
  if (allowedOrigins.includes(origin)) {
    responseHeaders['Access-Control-Allow-Origin'] = origin;
  } else if (!origin) {
    responseHeaders['Access-Control-Allow-Origin'] = 'https://potenzial.grovia-digital.com';
  } else {
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

  if (method === 'POST') {
    const apiKey = headers['x-api-key'] || headers['authorization']?.replace('Bearer ', '');
    
    if (!process.env.API_KEY || !apiKey || apiKey !== process.env.API_KEY) {
      return {
        statusCode: 401,
        headers: responseHeaders,
        body: JSON.stringify({
          success: false,
          message: "Unauthorized access - API key required"
        })
      };
    }

    let pool;
    try {
      const requestData = JSON.parse(body);
      
      const requiredFields = ['question1', 'question2', 'question3', 'question4', 'question5', 'question6', 'question7', 'question8', 'firstName', 'email'];
      for (const field of requiredFields) {
        if (!requestData[field]) {
          return {
            statusCode: 400,
            headers: responseHeaders,
            body: JSON.stringify({
              success: false,
              message: `Feld ${field} ist erforderlich`,
              error_id: generateErrorId()
            })
          };
        }
      }

      const sanitizedData = sanitizeInputs(requestData);
      
      const totalScore = getQuestionScore(sanitizedData.question1, 1) +
                        getQuestionScore(sanitizedData.question2, 2) +
                        getQuestionScore(sanitizedData.question3, 3) +
                        getQuestionScore(sanitizedData.question4, 4) +
                        getQuestionScore(sanitizedData.question5, 5) +
                        getQuestionScore(sanitizedData.question6, 6) +
                        getQuestionScore(sanitizedData.question7, 7) +
                        getQuestionScore(sanitizedData.question8, 8);

      const scorePercentage = Math.round((totalScore / 30) * 100);

      pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Use only the core columns that exist in all environments
      const insertQuery = `
        INSERT INTO survey_responses (
          question1, question2, question3, question4, question5, question6, question7, question8,
          first_name, email, total_score, score_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
      `;

      const values = [
        sanitizedData.question1, sanitizedData.question2, sanitizedData.question3, sanitizedData.question4,
        sanitizedData.question5, sanitizedData.question6, sanitizedData.question7, sanitizedData.question8,
        sanitizedData.firstName, sanitizedData.email, totalScore, scorePercentage
      ];

      const result = await pool.query(insertQuery, values);
      const insertedId = result.rows[0]?.id;
      
      return {
        statusCode: 201,
        headers: responseHeaders,
        body: JSON.stringify({
          success: true,
          message: "Umfrage erfolgreich übermittelt",
          id: insertedId,
          score: scorePercentage
        })
      };

    } catch (error) {
      console.error('Database error:', error.message, error.stack);
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({
          success: false,
          message: "Datenbankfehler beim Speichern der Antworten",
          error_id: generateErrorId()
        })
      };
    } finally {
      if (pool) {
        await pool.end();
      }
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
