import { users, surveyResponses, type User, type InsertUser, type SurveyResponse, type InsertSurveyResponse } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  createSurveyResponse(response: InsertSurveyResponse & { userIp?: string | null; userAgent?: string | null; totalScore: number; scorePercentage: number }): Promise<SurveyResponse>;
  getAllSurveyResponses(): Promise<SurveyResponse[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createSurveyResponse(response: InsertSurveyResponse & { userIp?: string | null; userAgent?: string | null; totalScore: number; scorePercentage: number }): Promise<SurveyResponse> {
    const [surveyResponse] = await db
      .insert(surveyResponses)
      .values(response)
      .returning();
    return surveyResponse;
  }

  async getAllSurveyResponses(): Promise<SurveyResponse[]> {
    return await db.select().from(surveyResponses).orderBy(desc(surveyResponses.timestamp));
  }
}

export const storage = new DatabaseStorage();