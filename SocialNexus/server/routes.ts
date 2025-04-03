import type { Express, Request, Response } from "express";
import type { UploadedFile } from "express-fileupload";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertCategorySchema, 
  insertTopicSchema, 
  insertThreadSchema, 
  insertMessageSchema,
  insertMarketItemSchema,
  insertUserItemSchema,
  insertTcoinTransactionSchema,
  type User
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
// @ts-ignore - no types for this module
import { validateTCIdentity } from "./python_executor.mjs";

// Extend express-session declarations to include our user type
declare module 'express-session' {
  interface SessionData {
    user: Omit<User, 'password'>;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "forum-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 1 day
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Helper function to handle validation errors
  const validateRequest = (schema: any, data: any) => {
    try {
      return { data: schema.parse(data), error: null };
    } catch (error) {
      if (error instanceof ZodError) {
        return { data: null, error: fromZodError(error).message };
      }
      return { data: null, error: "Invalid request data" };
    }
  };

  // Auth Routes
  // TC Kimlik doğrulama API endpoint'i
  app.post("/api/auth/validate-tc", async (req: Request, res: Response) => {
    try {
      const { tcNo, firstName, lastName, yearOfBirth } = req.body;

      if (!tcNo || !firstName || !lastName || !yearOfBirth) {
        return res.status(400).json({ 
          success: false, 
          message: "TC Kimlik No, ad, soyad ve doğum yılı zorunludur" 
        });
      }

      // TC Kimlik numarası 11 haneli olmalı ve sayı olmalı
      if (!tcNo.match(/^\d{11}$/) || tcNo.startsWith('0')) {
        return res.status(400).json({ 
          success: false, 
          message: "Geçersiz TC Kimlik No formatı" 
        });
      }

      try {
        // TC Kimlik doğrulama işlemi
        const validationResult = await validateTCIdentity(tcNo, firstName, lastName, yearOfBirth);

        return res.status(200).json(validationResult);
      } catch (error: any) {
        console.error("TC kimlik doğrulama hatası:", error);
        return res.status(500).json({ 
          success: false, 
          message: "TC kimlik doğrulama sırasında bir hata oluştu" 
        });
      }
    } catch (error: any) {
      console.error("TC kimlik doğrulama API hatası:", error);
      return res.status(500).json({ 
        success: false, 
        message: "İşlem sırasında bir hata oluştu" 
      });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { data, error } = validateRequest(insertUserSchema, req.body);
    if (error) return res.status(400).json({ message: error });

    try {
      const { tcNo, firstName, lastName, yearOfBirth } = req.body;

      // TC Kimlik doğrulaması isteği
      let tcVerified = false;
      if (tcNo && firstName && lastName && yearOfBirth) {
        try {
          const validationResult = await validateTCIdentity(tcNo, firstName, lastName, yearOfBirth);

          if (validationResult.success) {
            tcVerified = true;
          } else {
            return res.status(400).json({ 
              message: "TC kimlik doğrulaması başarısız: " + validationResult.message 
            });
          }
        } catch (validationError: any) {
          return res.status(500).json({ 
            message: "TC kimlik doğrulama sırasında bir hata oluştu: " + validationError.message 
          });
        }
      } else {
        return res.status(400).json({ 
          message: "Kayıt için TC kimlik bilgileri (tcNo, firstName, lastName, yearOfBirth) zorunludur" 
        });
      }

      // TC Kimlik doğrulaması yapılmadıysa engelle
      if (!tcVerified) {
        return res.status(400).json({ 
          message: "Kayıt olmadan önce TC kimlik doğrulaması yapılmalıdır" 
        });
      }


      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(data);
      const { password, ...userWithoutPassword } = user;

      // Set user in session
      req.session.user = userWithoutPassword;

      // TC Kimlik doğrulama durumunu TimeScaleDB'ye kaydet
      await storage.updateTcVerificationLog(user.id, tcVerified);

      return res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Update user online status
      await storage.updateUserOnlineStatus(user.id, true);

      const { password: _, ...userWithoutPassword } = user;

      // Set user in session
      req.session.user = userWithoutPassword;

      return res.status(200).json(userWithoutPassword);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to login" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const user = req.session.user;
      if (user && user.id) {
        await storage.updateUserOnlineStatus(user.id, false);
      }

      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to logout" });
    }
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (req.session.user) {
      return res.status(200).json(req.session.user);
    }
    return res.status(401).json({ message: "Not authenticated" });
  });

  // Category Routes
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getAllCategories();
      return res.status(200).json(categories);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get categories" });
    }
  });

  app.post("/api/categories", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { data, error } = validateRequest(insertCategorySchema, req.body);
    if (error) return res.status(400).json({ message: error });

    try {
      const category = await storage.createCategory(data);
      return res.status(201).json(category);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to create category" });
    }
  });

  // Topic Routes
  app.get("/api/categories/:categoryId/topics", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const topics = await storage.getTopicsByCategoryId(categoryId);
      return res.status(200).json(topics);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get topics" });
    }
  });

  app.post("/api/topics", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { data, error } = validateRequest(insertTopicSchema, req.body);
    if (error) return res.status(400).json({ message: error });

    try {
      const topic = await storage.createTopic(data);
      return res.status(201).json(topic);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to create topic" });
    }
  });

  // Thread Routes
  app.get("/api/topics/:topicId/threads", async (req: Request, res: Response) => {
    try {
      const topicId = parseInt(req.params.topicId);
      if (isNaN(topicId)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }

      const threads = await storage.getThreadsByTopicId(topicId);

      // Get thread starters and enrich the response
      const enrichedThreads = await Promise.all(
        threads.map(async (thread) => {
          const user = await storage.getUser(thread.userId);
          const messages = await storage.getMessagesByThreadId(thread.id);
          const firstMessage = messages.length > 0 ? messages[0] : null;

          return {
            ...thread,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              isOnline: user.isOnline
            } : null,
            preview: firstMessage ? firstMessage.content.substring(0, 100) + (firstMessage.content.length > 100 ? '...' : '') : ''
          };
        })
      );

      return res.status(200).json(enrichedThreads);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get threads" });
    }
  });

  app.post("/api/threads", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { data, error } = validateRequest(insertThreadSchema, req.body);
    if (error) return res.status(400).json({ message: error });

    try {
      const threadData = {
        ...data,
        userId: req.session.user.id
      };

      const thread = await storage.createThread(threadData);

      // Also create the first message
      if (req.body.content) {
        await storage.createMessage({
          threadId: thread.id,
          userId: req.session.user.id,
          content: req.body.content
        });
      }

      // Konu oluşturma için TCoin ödülü (20 TCoin)
      const user = await storage.getUser(req.session.user.id);
      if (user) {
        await storage.updateUserTcoins(user.id, 20);

        // İşlem kaydı oluştur
        await storage.createTcoinTransaction({
          userId: user.id,
          amount: 20,
          reason: 'thread_create',
          relatedId: thread.id
        });

        // Session'daki kullanıcı bilgilerini güncelle
        const { password, ...userWithoutPassword } = user;
        req.session.user = userWithoutPassword;
      }

      return res.status(201).json(thread);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to create thread" });
    }
  });

  app.get("/api/threads/:threadId", async (req: Request, res: Response) => {
    try {
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }

      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }

      const topic = await storage.getTopic(thread.topicId);
      const category = topic ? await storage.getCategory(topic.categoryId) : null;
      const user = await storage.getUser(thread.userId);

      const enrichedThread = {
        ...thread,
        topic,
        category,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isOnline: user.isOnline
        } : null
      };

      return res.status(200).json(enrichedThread);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get thread" });
    }
  });

  // Message Routes
  app.get("/api/threads/:threadId/messages", async (req: Request, res: Response) => {
    try {
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "Invalid thread ID" });
      }

      const messages = await storage.getMessagesByThreadId(threadId);

      // Enrich messages with user data
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);

          return {
            ...message,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              isOnline: user.isOnline
            } : null
          };
        })
      );

      return res.status(200).json(enrichedMessages);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { data, error } = validateRequest(insertMessageSchema, req.body);
    if (error) return res.status(400).json({ message: error });

    try {
      const messageData = {
        ...data,
        userId: req.session.user.id
      };

      const message = await storage.createMessage(messageData);
      const user = await storage.getUser(message.userId);

      // Mesaj oluşturma için TCoin ödülü (10 TCoin)
      if (user) {
        await storage.updateUserTcoins(user.id, 10);

        // İşlem kaydı oluştur
        await storage.createTcoinTransaction({
          userId: user.id,
          amount: 10,
          reason: 'message_create',
          relatedId: message.id
        });

        // Session'daki kullanıcı bilgilerini güncelle
        const { password, ...userWithoutPassword } = user;
        req.session.user = userWithoutPassword;
      }

      const enrichedMessage = {
        ...message,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isOnline: user.isOnline
        } : null
      };

      return res.status(201).json(enrichedMessage);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to create message" });
    }
  });

  app.patch("/api/messages/:messageId", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only allow the author to edit
      if (message.userId !== req.session.user.id) {
        return res.status(403).json({ message: "Not authorized to edit this message" });
      }

      const updatedMessage = await storage.updateMessage(messageId, content);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      const user = await storage.getUser(updatedMessage.userId);

      const enrichedMessage = {
        ...updatedMessage,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isOnline: user.isOnline
        } : null
      };

      return res.status(200).json(enrichedMessage);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to update message" });
    }
  });

  app.delete("/api/messages/:messageId", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Only allow the author to delete
      if (message.userId !== req.session.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this message" });
      }

      const deleted = await storage.deleteMessage(messageId);
      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }

      return res.status(200).json({ message: "Message deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to delete message" });
    }
  });

  app.post("/api/messages/:messageId/like", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      const updatedMessage = await storage.likeMessage(messageId);
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Mesaj sahibine TCoin ödülü ver (kendine beğeni hariç)
      if (message.userId !== req.session.user.id) {
        const messageAuthor = await storage.getUser(message.userId);
        if (messageAuthor) {
          // 5 TCoin ödül ver
          await storage.updateUserTcoins(messageAuthor.id, 5);

          // İşlem kaydı oluştur
          await storage.createTcoinTransaction({
            userId: messageAuthor.id,
            amount: 5,
            reason: 'message_like',
            relatedId: messageId
          });
        }
      }

      return res.status(200).json(updatedMessage);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to like message" });
    }
  });

  // File upload route
  app.post("/api/upload", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No files were uploaded" });
      }

      const uploadedFile = req.files.file as UploadedFile;

      if (!uploadedFile) {
        return res.status(400).json({ message: "File is required" });
      }

      // Handle both single file and array of files
      const fileToProcess = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${fileToProcess.name.replace(/\s+/g, '_')}`;
      const uploadPath = `./uploads/${fileName}`;

      fileToProcess.mv(uploadPath, function(err: any) {
        if (err) {
          return res.status(500).json({ message: "Error uploading file", error: err });
        }

        // File uploaded successfully
        return res.status(200).json({ 
          success: true, 
          message: "File uploaded successfully",
          fileName: fileName,
          filePath: `/uploads/${fileName}`,
          fileUrl: `/api/files/${fileName}`
        });
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Serve uploaded files
  app.use('/api/files', express.static('uploads'));

  // Market Routes
  app.get("/api/market", async (req: Request, res: Response) => {
    try {
      const marketItems = await storage.getAllMarketItems();
      return res.status(200).json(marketItems);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get market items" });
    }
  });

  app.post("/api/market", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Admin kontrolü eklenebilir
    /*
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ message: "Only administrators can add market items" });
    }
    */

    const { data, error } = validateRequest(insertMarketItemSchema, req.body);
    if (error) return res.status(400).json({ message: error });

    try {
      const marketItem = await storage.createMarketItem(data);
      return res.status(201).json(marketItem);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to create market item" });
    }
  });

  app.post("/api/market/:itemId/buy", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const userItem = await storage.buyMarketItem(req.session.user.id, itemId);

      if (!userItem) {
        return res.status(400).json({ 
          message: "Purchase failed. Check if you have enough TCoins or if the item is in stock."
        });
      }

      // Güncel kullanıcı bilgilerini al
      const user = await storage.getUser(req.session.user.id);
      if (user) {
        // Session'daki kullanıcı bilgilerini güncelle
        const { password, ...userWithoutPassword } = user;
        req.session.user = userWithoutPassword;
      }

      return res.status(201).json(userItem);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to purchase item" });
    }
  });

  app.get("/api/user/items", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userItems = await storage.getUserItems(req.session.user.id);

      // Satın alınan itemlar hakkında detaylı bilgileri ekle
      const enrichedUserItems = await Promise.all(
        userItems.map(async (userItem) => {
          const marketItem = await storage.getMarketItem(userItem.itemId);
          return {
            ...userItem,
            item: marketItem
          };
        })
      );

      return res.status(200).json(enrichedUserItems);
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get user items" });
    }
  });

  // TCoin Routes
  app.get("/api/user/tcoins", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const transactions = await storage.getTcoinTransactionsByUserId(req.session.user.id);

      return res.status(200).json({
        tcoins: user.tcoins || 0,
        transactions
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to get TCoin data" });
    }
  });

  // TCoin for creating content - ödül mekanizması
  app.post("/api/user/tcoins/reward", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { reason, amount, relatedId } = req.body;

      if (!reason || !amount) {
        return res.status(400).json({ message: "Reason and amount are required" });
      }

      // Pozitif miktar kontrolü
      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be positive for rewards" });
      }

      // Ödülü kullanıcıya ekle
      const updatedUser = await storage.updateUserTcoins(req.session.user.id, amount);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // İşlem kaydı oluştur
      const transaction = await storage.createTcoinTransaction({
        userId: req.session.user.id,
        amount,
        reason,
        relatedId
      });

      // Session'daki kullanıcı bilgilerini güncelle
      const { password, ...userWithoutPassword } = updatedUser;
      req.session.user = userWithoutPassword;

      return res.status(200).json({
        success: true,
        tcoins: updatedUser.tcoins,
        transaction
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Failed to add reward" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}