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

async function sendWebhook(response) {
  console.log('Webhook data prepared:', response);
}

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

      const scorePercentage = Math.round((totalScore / 32) * 100);

      pool = new Pool({ connectionString: process.env.DATABASE_URL });

      // Use exact database column order: id, question1-4, user_ip, user_agent, timestamp, question5-7, first_name, email, question8, total_score, score_percentage
      const insertQuery = `
        INSERT INTO survey_responses (
          question1, question2, question3, question4, user_ip, user_agent, 
          question5, question6, question7, first_name, email, question8, 
          total_score, score_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id;
      `;

      const values = [
        sanitizedData.question1,
        sanitizedData.question2, 
        sanitizedData.question3,
        sanitizedData.question4,
        clientIP,
        headers['user-agent'] || null,
        sanitizedData.question5,
        sanitizedData.question6,
        sanitizedData.question7,
        sanitizedData.firstName,
        sanitizedData.email,
        sanitizedData.question8,
        totalScore,
        scorePercentage
      ];

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
          error_id: generateErrorId(),
          debug: error.message
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
