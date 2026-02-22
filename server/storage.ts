import { db } from "./db";
import { conversations, messages, predictions, dailyPicks, favoriteTeams, bankrollEntries, sharedPicks, leaderboardEntries, userStreaks } from "@shared/schema";
import type { Conversation, InsertConversation, Message, InsertMessage, Prediction, InsertPrediction, DailyPick, InsertDailyPick, FavoriteTeam, InsertFavoriteTeam, BankrollEntry, InsertBankrollEntry, SharedPick, InsertSharedPick, LeaderboardEntry, InsertLeaderboardEntry, UserStreak } from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
  savePrediction(data: InsertPrediction): Promise<Prediction>;
  getDailyPicks(): Promise<DailyPick[]>;
  getDailyPicksByDate(date: string): Promise<DailyPick[]>;
  getPickHistory(limit?: number): Promise<DailyPick[]>;
  saveDailyPick(data: InsertDailyPick): Promise<DailyPick>;
  clearDailyPicks(): Promise<void>;
  clearDailyPicksByDate(date: string): Promise<void>;
  updateDailyPickResult(id: number, result: string): Promise<void>;
  getAllFavorites(): Promise<FavoriteTeam[]>;
  addFavorite(data: InsertFavoriteTeam): Promise<FavoriteTeam>;
  removeFavorite(teamId: number): Promise<void>;
  isFavorite(teamId: number): Promise<boolean>;
  getAllBankrollEntries(): Promise<BankrollEntry[]>;
  addBankrollEntry(data: InsertBankrollEntry): Promise<BankrollEntry>;
  updateBankrollEntry(id: number, result: string, payout: string): Promise<BankrollEntry | undefined>;
  deleteBankrollEntry(id: number): Promise<void>;
  getSharedPick(shareCode: string): Promise<SharedPick | undefined>;
  createSharedPick(data: InsertSharedPick): Promise<SharedPick>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  upsertLeaderboardEntry(data: InsertLeaderboardEntry): Promise<LeaderboardEntry>;
  getStreaks(): Promise<UserStreak | undefined>;
  updateStreaks(data: Partial<UserStreak>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(title: string): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({ title }).returning();
    return conv;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(conversationId: number, role: string, content: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({ conversationId, role, content }).returning();
    return msg;
  }

  async savePrediction(data: InsertPrediction): Promise<Prediction> {
    const [pred] = await db.insert(predictions).values(data).returning();
    return pred;
  }

  async getDailyPicks(): Promise<DailyPick[]> {
    return db.select().from(dailyPicks).orderBy(desc(dailyPicks.createdAt));
  }

  async getDailyPicksByDate(date: string): Promise<DailyPick[]> {
    return db.select().from(dailyPicks).where(eq(dailyPicks.pickDate, date)).orderBy(desc(dailyPicks.createdAt));
  }

  async getPickHistory(limit: number = 50): Promise<DailyPick[]> {
    return db.select().from(dailyPicks).orderBy(desc(dailyPicks.createdAt)).limit(limit);
  }

  async saveDailyPick(data: InsertDailyPick): Promise<DailyPick> {
    const [pick] = await db.insert(dailyPicks).values(data).returning();
    return pick;
  }

  async clearDailyPicks(): Promise<void> {
    await db.delete(dailyPicks);
  }

  async clearDailyPicksByDate(date: string): Promise<void> {
    await db.delete(dailyPicks).where(eq(dailyPicks.pickDate, date));
  }

  async updateDailyPickResult(id: number, result: string): Promise<void> {
    await db.update(dailyPicks).set({ result }).where(eq(dailyPicks.id, id));
  }

  async getAllFavorites(): Promise<FavoriteTeam[]> {
    return db.select().from(favoriteTeams).orderBy(desc(favoriteTeams.createdAt));
  }

  async addFavorite(data: InsertFavoriteTeam): Promise<FavoriteTeam> {
    const [fav] = await db.insert(favoriteTeams).values(data).returning();
    return fav;
  }

  async removeFavorite(teamId: number): Promise<void> {
    await db.delete(favoriteTeams).where(eq(favoriteTeams.teamId, teamId));
  }

  async isFavorite(teamId: number): Promise<boolean> {
    const [fav] = await db.select().from(favoriteTeams).where(eq(favoriteTeams.teamId, teamId));
    return !!fav;
  }

  async getAllBankrollEntries(): Promise<BankrollEntry[]> {
    return db.select().from(bankrollEntries).orderBy(desc(bankrollEntries.createdAt));
  }

  async addBankrollEntry(data: InsertBankrollEntry): Promise<BankrollEntry> {
    const [entry] = await db.insert(bankrollEntries).values(data).returning();
    return entry;
  }

  async updateBankrollEntry(id: number, result: string, payout: string): Promise<BankrollEntry | undefined> {
    const [entry] = await db.update(bankrollEntries).set({ result, payout }).where(eq(bankrollEntries.id, id)).returning();
    return entry;
  }

  async deleteBankrollEntry(id: number): Promise<void> {
    await db.delete(bankrollEntries).where(eq(bankrollEntries.id, id));
  }

  async getSharedPick(shareCode: string): Promise<SharedPick | undefined> {
    const [pick] = await db.select().from(sharedPicks).where(eq(sharedPicks.shareCode, shareCode));
    return pick;
  }

  async createSharedPick(data: InsertSharedPick): Promise<SharedPick> {
    const [pick] = await db.insert(sharedPicks).values(data).returning();
    return pick;
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return db.select().from(leaderboardEntries).orderBy(desc(leaderboardEntries.accuracy)).limit(20);
  }

  async upsertLeaderboardEntry(data: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    const existing = await db.select().from(leaderboardEntries).where(eq(leaderboardEntries.username, data.username));
    if (existing.length > 0) {
      const [updated] = await db.update(leaderboardEntries).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(leaderboardEntries.username, data.username)).returning();
      return updated;
    }
    const [entry] = await db.insert(leaderboardEntries).values(data).returning();
    return entry;
  }

  async getStreaks(): Promise<UserStreak | undefined> {
    const [streak] = await db.select().from(userStreaks).limit(1);
    return streak;
  }

  async updateStreaks(data: Partial<UserStreak>): Promise<void> {
    const existing = await db.select().from(userStreaks).limit(1);
    if (existing.length > 0) {
      await db.update(userStreaks).set({ ...data, updatedAt: new Date() }).where(eq(userStreaks.id, existing[0].id));
    } else {
      await db.insert(userStreaks).values({
        currentStreak: data.currentStreak || 0,
        longestWinStreak: data.longestWinStreak || 0,
        longestLossStreak: data.longestLossStreak || 0,
        lastResult: data.lastResult || "",
      });
    }
  }
}

export const storage = new DatabaseStorage();
