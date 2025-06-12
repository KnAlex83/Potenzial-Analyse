Grovia Digital - Personal Branding Potenzialanalyse

Ein professionelles 8-Schritte Survey-Tool für die Personal Branding Masterclass von Grovia Digital.

Grovia Digital Logo
🎯 Überblick

Diese Anwendung erfasst systematisch das Potenzial von Interessenten für die Personal Branding Masterclass durch eine strukturierte 8-Schritte Umfrage auf Deutsch.
Features

    ✅ 8-Schritte Survey mit intelligentem Fortschrittsbalken
    ✅ Deutsche Benutzeroberfläche optimiert für Personal Branding
    ✅ Dynamische Validierung mit visuellen Feedback-Elementen
    ✅ PostgreSQL Datenbank für sichere Datenspeicherung
    ✅ Webhook Integration für automatische Benachrichtigungen
    ✅ CSV Export für Datenanalyse
    ✅ Responsive Design für alle Geräte
    ✅ Professional Branding mit Grovia Digital Logo

Technologie Stack

    Frontend: React 18, TypeScript, Tailwind CSS, Wouter Router
    Backend: Node.js, Express, TypeScript
    Database: PostgreSQL mit Drizzle ORM
    UI Components: Radix UI, Shadcn/ui
    Form Management: React Hook Form mit Zod Validation
    Build Tool: Vite

🚀 Schnellstart
Voraussetzungen

    Node.js 18 oder höher
    PostgreSQL Datenbank
    Git

Installation

    Repository klonen:

git clone https://github.com/KnAlex83/Potenzial-Analyse.git
cd Potenzial-Analyse

    Dependencies installieren:

npm install

    Environment Variables konfigurieren:

cp .env.example .env

Bearbeite die .env Datei mit deinen Werten:

DATABASE_URL=postgresql://username:password@localhost:5432/grovia_survey
WEBHOOK_URL=https://your-webhook-endpoint.com (optional)
NODE_ENV=development
PORT=5000

    Datenbank Setup:

npx drizzle-kit push

    Development Server starten:

npm run dev

Die Anwendung ist nun verfügbar unter: http://localhost:5000
📋 Survey Fragen
Schritt 1-2: Personal Branding Assessment

    Aktuelles Verständnis von Personal Branding (5 Optionen)
    Wöchentliche Zeitinvestition (4 Optionen)

Schritt 3-4: Zieldefinition

    Kurzfrist-Ziele (3 Monate) - Freitext bis 2000 Zeichen
    Langfrist-Ziele (12-24 Monate) - Freitext bis 2000 Zeichen

Schritt 5-7: Commitment Assessment

    Zustimmung zur Personal Branding Bedeutung (5 Optionen)
    Umsetzungsbereitschaft nach Masterclass (3 Optionen)
    Investitionsbereitschaft 500€ (3 Optionen)

Schritt 8: Kontaktdaten

    Vorname (Pflichtfeld)
    E-Mail-Adresse (Pflichtfeld mit Validierung)

🔧 API Endpoints
Survey Submission

POST /api/survey
Content-Type: application/json

{
  "question1": "option1",
  "question2": "option2",
  "question3": "Mein Kurzfrist-Ziel...",
  "question4": "Mein Langfrist-Ziel...",
  "question5": "option1",
  "question6": "option1", 
  "question7": "option1",
  "firstName": "Max",
  "email": "max@beispiel.de"
}

Daten Export (Admin)

GET /api/survey/responses
GET /api/survey/export  # CSV Download

🌐 Deployment
Option 1: Vercel (Empfohlen)

npm i -g vercel
vercel

Option 2: Railway

    Repository bei railway.app verbinden
    Environment Variables setzen
    Automatisches Deployment

Option 3: DigitalOcean App Platform

    GitHub Repository verbinden
    Build Command: npm run build
    Run Command: npm start

Subdomain Konfiguration

    DNS Eintrag bei deinem Domain Provider:
        CNAME: survey.grovia-digital.com → your-deployment-url

    SSL Zertifikat wird automatisch generiert

📊 Datenbank Schema

-- Survey Responses
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  question1 TEXT NOT NULL,
  question2 TEXT NOT NULL,
  question3 TEXT NOT NULL,
  question4 TEXT NOT NULL,
  question5 TEXT NOT NULL,
  question6 TEXT NOT NULL,
  question7 TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

🔗 Webhook Integration

Konfiguriere WEBHOOK_URL für automatische Benachrichtigungen bei neuen Responses:

{
  "id": 123,
  "timestamp": "2024-01-15T10:30:00Z",
  "question1": { "value": "option1", "label": "Ich habe kaum Berührungspunkte damit" },
  "question2": { "value": "option2", "label": "2-4 Stunden" },
  "question3": "Kurzfrist-Ziel Text...",
  "question4": "Langfrist-Ziel Text...",
  "question5": { "value": "option1", "label": "Stimme voll zu" },
  "question6": { "value": "option1", "label": "Ich starte direkt durch..." },
  "question7": { "value": "option1", "label": "Ja, ich sehe den Wert..." },
  "contact": {
    "firstName": "Max",
    "email": "max@beispiel.de"
  },
  "metadata": {
    "userIp": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}

🛠️ Development
Scripts

npm run dev          # Development Server
npm run build        # Production Build
npm run start        # Production Server
npm run db:generate  # Generate DB Migration
npm run db:push      # Apply DB Changes

Projekt Struktur

├── client/          # React Frontend
│   ├── src/
│   │   ├── components/  # UI Components
│   │   ├── pages/       # Survey & Success Pages
│   │   └── assets/      # Logo & Static Files
├── server/          # Express Backend
│   ├── db.ts           # Database Connection
│   ├── routes.ts       # API Routes
│   └── storage.ts      # Data Layer
├── shared/          # Shared Types & Schema
└── migrations/      # Database Migrations

📈 Analytics & Monitoring

    Survey Completion Rate tracking via Datenbankabfragen
    User Journey Analytics durch Schritt-für-Schritt Daten
    Conversion Funnel von Schritt 1 bis Kontaktdaten
    Lead Quality Scoring basierend auf Antworten

🔒 Datenschutz & Sicherheit

    DSGVO konform - Speicherung nur mit Einwilligung
    SSL Verschlüsselung für alle Datenübertragungen
    Input Validation auf Client- und Server-Seite
    SQL Injection Schutz durch Drizzle ORM
    Rate Limiting für API Endpunkte

📞 Support

Für technische Fragen oder Support:

    Email: support@grovia-digital.com
    GitHub Issues: Für Bug Reports und Feature Requests

📄 Lizenz

Proprietary - Grovia Digital © 2025
