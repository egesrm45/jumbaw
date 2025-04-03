import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar"),
  isOnline: boolean("is_online").default(false),
  tcVerified: boolean("tc_verified").default(false),
  tcoins: integer("tcoins").default(0),
  theme: text("theme").default("dark"),
  language: text("language").default("tr"),
  timezone: text("timezone").default("UTC+03:00"),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  tcNo: text("tc_no"), // Added TC No field
  firstName: text("first_name"), // Added first name field
  lastName: text("last_name"), // Added last name field
  yearOfBirth: text("year_of_birth"), // Added year of birth field
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatar: true,
  tcNo: true,
  firstName: true,
  lastName: true,
  yearOfBirth: true,
});

// Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
});

// Topics
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertTopicSchema = createInsertSchema(topics).pick({
  categoryId: true,
  name: true,
  description: true,
});

// Threads
export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  replyCount: integer("reply_count").default(0),
  tag: text("tag"),
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
  replyCount: true,
});

// Messages (posts in threads)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isEdited: boolean("is_edited").default(false),
  likes: integer("likes").default(0),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
  likes: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Thread = typeof threads.$inferSelect;
export type InsertThread = z.infer<typeof insertThreadSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Marketplace items
export const marketItems = pgTable("market_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // TCoin price
  image: text("image"),
  type: text("type").notNull(), // 'badge', 'avatar', 'theme', etc.
  inStock: integer("in_stock").default(99999),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMarketItemSchema = createInsertSchema(marketItems).omit({
  id: true,
  createdAt: true,
});

// User purchases
export const userItems = pgTable("user_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
});

export const insertUserItemSchema = createInsertSchema(userItems).omit({
  id: true,
  purchasedAt: true,
});

// TCoin transaction history
export const tcoinTransactions = pgTable("tcoin_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // positive for gains, negative for spending
  reason: text("reason").notNull(), // 'purchase', 'thread_create', 'message_like', etc.
  relatedId: integer("related_id"), // ID of the related item/thread/message if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTcoinTransactionSchema = createInsertSchema(tcoinTransactions).omit({
  id: true,
  createdAt: true,
});

export type MarketItem = typeof marketItems.$inferSelect;
export type InsertMarketItem = z.infer<typeof insertMarketItemSchema>;

export type UserItem = typeof userItems.$inferSelect;
export type InsertUserItem = z.infer<typeof insertUserItemSchema>;

export type TcoinTransaction = typeof tcoinTransactions.$inferSelect;
export type InsertTcoinTransaction = z.infer<typeof insertTcoinTransactionSchema>;