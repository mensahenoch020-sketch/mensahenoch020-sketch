import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  competition: text("competition").notNull(),
  matchDate: timestamp("match_date").notNull(),
  status: text("status").notNull().default("SCHEDULED"),
  predictionData: jsonb("prediction_data"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const dailyPicks = pgTable("daily_picks", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  pickType: text("pick_type").notNull(),
  pick: text("pick").notNull(),
  confidence: text("confidence").notNull(),
  reasoning: text("reasoning"),
  pickDate: text("pick_date").notNull().default(""),
  matchDate: text("match_date").default(""),
  homeTeam: text("home_team").default(""),
  awayTeam: text("away_team").default(""),
  competition: text("competition").default(""),
  result: text("result").default("pending"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userStreaks = pgTable("user_streaks", {
  id: serial("id").primaryKey(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestWinStreak: integer("longest_win_streak").notNull().default(0),
  longestLossStreak: integer("longest_loss_streak").notNull().default(0),
  lastResult: text("last_result").default(""),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  profileImage: text("profile_image").default(""),
  totalPicks: integer("total_picks").notNull().default(0),
  correctPicks: integer("correct_picks").notNull().default(0),
  accuracy: integer("accuracy").notNull().default(0),
  totalStaked: text("total_staked").default("0"),
  totalReturns: text("total_returns").default("0"),
  roi: integer("roi").notNull().default(0),
  winStreak: integer("win_streak").notNull().default(0),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const favoriteTeams = pgTable("favorite_teams", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  teamName: text("team_name").notNull(),
  teamCrest: text("team_crest").default(""),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bankrollEntries = pgTable("bankroll_entries", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id"),
  matchLabel: text("match_label").notNull(),
  market: text("market").notNull(),
  pick: text("pick").notNull(),
  stake: text("stake").default("0"),
  odds: text("odds").default("0"),
  confidence: integer("confidence"),
  matchDate: text("match_date"),
  result: text("result").default("pending"),
  payout: text("payout").default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const sharedPicks = pgTable("shared_picks", {
  id: serial("id").primaryKey(),
  shareCode: varchar("share_code", { length: 12 }).notNull().unique(),
  picksData: jsonb("picks_data").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
export const insertDailyPickSchema = createInsertSchema(dailyPicks).omit({ id: true, createdAt: true });
export const insertFavoriteTeamSchema = createInsertSchema(favoriteTeams).omit({ id: true, createdAt: true });
export const insertBankrollEntrySchema = createInsertSchema(bankrollEntries).omit({ id: true, createdAt: true });
export const insertSharedPickSchema = createInsertSchema(sharedPicks).omit({ id: true, createdAt: true });
export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).omit({ id: true, updatedAt: true });

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type DailyPick = typeof dailyPicks.$inferSelect;
export type InsertDailyPick = z.infer<typeof insertDailyPickSchema>;
export type FavoriteTeam = typeof favoriteTeams.$inferSelect;
export type InsertFavoriteTeam = z.infer<typeof insertFavoriteTeamSchema>;
export type BankrollEntry = typeof bankrollEntries.$inferSelect;
export type InsertBankrollEntry = z.infer<typeof insertBankrollEntrySchema>;
export type SharedPick = typeof sharedPicks.$inferSelect;
export type InsertSharedPick = z.infer<typeof insertSharedPickSchema>;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;
export type UserStreak = typeof userStreaks.$inferSelect;

export interface MatchFixture {
  id: number;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
  utcDate: string;
  status: string;
  score: { fullTime: { home: number | null; away: number | null }; halfTime: { home: number | null; away: number | null } };
  competition: { id: number; name: string; emblem: string };
  matchday: number;
}

export interface StandingEntry {
  position: number;
  team: { id: number; name: string; shortName: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface PredictionMarket {
  market: string;
  pick: string;
  confidence: number;
  odds?: string;
}

export interface MatchScore {
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface MatchPrediction {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homeCrest: string;
  awayCrest: string;
  competition: string;
  competitionEmblem: string;
  matchDate: string;
  status: string;
  score?: MatchScore;
  markets: PredictionMarket[];
  aiSummary: string;
  overallConfidence: "Low" | "Mid" | "High";
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
}
