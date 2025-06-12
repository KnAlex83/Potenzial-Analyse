import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const surveyResponses = pgTable("survey_responses", {
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

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  timestamp: true,
  userIp: true,
  userAgent: true,
  totalScore: true,
  scorePercentage: true,
}).extend({
  question1: z.enum([
    "option1", // Kaum – ich starte gerade erst
    "option2", // Einige – ich spüre, dass mehr möglich wäre
    "option3", // Viele! Ich ahne, wieviel Potenzial brachliegt
    "option4"  // Massive Mengen – es hält mein Business zurück
  ]),
  question2: z.enum([
    "option1", // < 2h (riskiert Stillstand)
    "option2", // 2-4h (Minimalaufwand für erste Schritte)
    "option3", // 5-8h (ideales Tempo für spürbare Veränderung)
    "option4"  // > 8h (Turbo-Transformation möglich)
  ]),
  question3: z.enum([
    "option1", // Exakt messbar & terminiert
    "option2", // Klarer Fokus
    "option3", // Teilweise konkret
    "option4", // Vage
    "option5"  // Kein Ziel / unsicher
  ]),
  question4: z.enum([
    "option1", // Klare Skalierung
    "option2", // Wachstum mit Plan
    "option3", // Stabilisierung
    "option4", // Unklar
    "option5"  // Keine Vision
  ]),
  question5: z.enum([
    "option1", // Stimme VOLL zu
    "option2", // Stimme zu
    "option3", // Neutral
    "option4"  // Stimme nicht zu
  ]),
  question6: z.enum([
    "option1", // Starte direkt durch
    "option2", // Werde viel umsetzen
    "option3"  // Brauche erst externe Motivation
  ]),
  question7: z.enum([
    "option1", // Extrem! Ich bin bereit
    "option2", // Sehr – ich spüre die Dringlichkeit
    "option3", // Mittel – aber ich zögere noch
    "option4"  // Gering – ich warte lieber ab
  ]),
  question8: z.enum([
    "option1", // JA – ich will JETZT durchstarten!
    "option2", // Vielleicht – brauche Details zum ROI
    "option3"  // Nein – ich unterschätze noch den Hebel
  ]),
  firstName: z.string().min(1, "Bitte gib deinen Vornamen ein"),
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein"),
});

export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// Keep existing user schema for compatibility
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
