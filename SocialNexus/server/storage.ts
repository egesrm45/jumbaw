import { 
  users, type User, type InsertUser,
  categories, type Category, type InsertCategory,
  topics, type Topic, type InsertTopic,
  threads, type Thread, type InsertThread,
  messages, type Message, type InsertMessage,
  marketItems, type MarketItem, type InsertMarketItem,
  userItems, type UserItem, type InsertUserItem,
  tcoinTransactions, type TcoinTransaction, type InsertTcoinTransaction
} from "@shared/schema";

// Storage Interface with CRUD methods
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: number, isOnline: boolean): Promise<User | undefined>;
  updateUserTcoins(id: number, amount: number): Promise<User | undefined>;
  verifyUserTc(id: number): Promise<User | undefined>;

  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Topic operations
  getTopicsByCategoryId(categoryId: number): Promise<Topic[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;

  // Thread operations
  getThreadsByTopicId(topicId: number): Promise<Thread[]>;
  getThread(id: number): Promise<Thread | undefined>;
  createThread(thread: InsertThread): Promise<Thread>;
  updateThreadLastActivity(id: number): Promise<Thread | undefined>;
  incrementThreadReplyCount(id: number): Promise<Thread | undefined>;

  // Message operations
  getMessagesByThreadId(threadId: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, content: string): Promise<Message | undefined>;
  deleteMessage(id: number): Promise<boolean>;
  likeMessage(id: number): Promise<Message | undefined>;

  // Market operations
  getAllMarketItems(): Promise<MarketItem[]>;
  getMarketItem(id: number): Promise<MarketItem | undefined>;
  createMarketItem(item: InsertMarketItem): Promise<MarketItem>;
  buyMarketItem(userId: number, itemId: number): Promise<UserItem | undefined>;
  getUserItems(userId: number): Promise<UserItem[]>;

  // TCoin operations
  createTcoinTransaction(transaction: InsertTcoinTransaction): Promise<TcoinTransaction>;
  getTcoinTransactionsByUserId(userId: number): Promise<TcoinTransaction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private topics: Map<number, Topic>;
  private threads: Map<number, Thread>;
  private messages: Map<number, Message>;
  private marketItems: Map<number, MarketItem>;
  private userItems: Map<number, UserItem>;
  private tcoinTransactions: Map<number, TcoinTransaction>;

  private userId: number;
  private categoryId: number;
  private topicId: number;
  private threadId: number;
  private messageId: number;
  private marketItemId: number;
  private userItemId: number;
  private tcoinTransactionId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.topics = new Map();
    this.threads = new Map();
    this.messages = new Map();
    this.marketItems = new Map();
    this.userItems = new Map();
    this.tcoinTransactions = new Map();

    this.userId = 1;
    this.categoryId = 1;
    this.topicId = 1;
    this.threadId = 1;
    this.messageId = 1;
    this.marketItemId = 1;
    this.userItemId = 1;
    this.tcoinTransactionId = 1;

    // Seed some initial data
    this.seedInitialData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    // Varsayılan değerler ile kullanıcı oluştur
    const user: User = { 
      ...insertUser, 
      id, 
      isOnline: true,
      tcVerified: false,
      tcoins: 50, // Başlangıç bonus
      theme: "system",
      language: "tr",
      timezone: "Europe/Istanbul",
      emailNotifications: true,
      smsNotifications: false
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, isOnline };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async updateUserTcoins(id: number, amount: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      // Hesaplanacak yeni TCoin sayısı
      const currentTcoins = user.tcoins || 0;
      const newTcoins = currentTcoins + amount;

      // Negatif değer olmamasını sağlama kontrolü
      const finalTcoins = newTcoins < 0 ? 0 : newTcoins;

      const updatedUser = { ...user, tcoins: finalTcoins };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async verifyUserTc(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, tcVerified: true };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryId++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  // Topic methods
  async getTopicsByCategoryId(categoryId: number): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter(
      (topic) => topic.categoryId === categoryId
    );
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    return this.topics.get(id);
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const id = this.topicId++;
    const topic: Topic = { ...insertTopic, id };
    this.topics.set(id, topic);
    return topic;
  }

  // Thread methods
  async getThreadsByTopicId(topicId: number): Promise<Thread[]> {
    return Array.from(this.threads.values())
      .filter((thread) => thread.topicId === topicId)
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
  }

  async getThread(id: number): Promise<Thread | undefined> {
    return this.threads.get(id);
  }

  async createThread(insertThread: InsertThread): Promise<Thread> {
    const id = this.threadId++;
    const now = new Date();
    const thread: Thread = { 
      ...insertThread, 
      id, 
      createdAt: now, 
      lastActivityAt: now,
      replyCount: 0
    };
    this.threads.set(id, thread);
    return thread;
  }

  async updateThreadLastActivity(id: number): Promise<Thread | undefined> {
    const thread = this.threads.get(id);
    if (thread) {
      const updatedThread = { ...thread, lastActivityAt: new Date() };
      this.threads.set(id, updatedThread);
      return updatedThread;
    }
    return undefined;
  }

  async incrementThreadReplyCount(id: number): Promise<Thread | undefined> {
    const thread = this.threads.get(id);
    if (thread) {
      const updatedThread = { 
        ...thread, 
        replyCount: thread.replyCount + 1,
        lastActivityAt: new Date()
      };
      this.threads.set(id, updatedThread);
      return updatedThread;
    }
    return undefined;
  }

  // Message methods
  async getMessagesByThreadId(threadId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const now = new Date();
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: now, 
      updatedAt: now,
      isEdited: false,
      likes: 0
    };
    this.messages.set(id, message);

    // Update thread's last activity and reply count
    await this.updateThreadLastActivity(insertMessage.threadId);
    if (this.messages.size > 1) { // Only increment if it's not the first message
      await this.incrementThreadReplyCount(insertMessage.threadId);
    }

    return message;
  }

  async updateMessage(id: number, content: string): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (message) {
      const updatedMessage = { 
        ...message, 
        content, 
        updatedAt: new Date(),
        isEdited: true
      };
      this.messages.set(id, updatedMessage);
      return updatedMessage;
    }
    return undefined;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }

  async likeMessage(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (message) {
      const updatedMessage = { ...message, likes: message.likes + 1 };
      this.messages.set(id, updatedMessage);
      return updatedMessage;
    }
    return undefined;
  }

  // Market methods
  async getAllMarketItems(): Promise<MarketItem[]> {
    return Array.from(this.marketItems.values());
  }

  async getMarketItem(id: number): Promise<MarketItem | undefined> {
    return this.marketItems.get(id);
  }

  async createMarketItem(insertMarketItem: InsertMarketItem): Promise<MarketItem> {
    const id = this.marketItemId++;
    const now = new Date();
    const marketItem: MarketItem = {
      ...insertMarketItem,
      id,
      createdAt: now
    };
    this.marketItems.set(id, marketItem);
    return marketItem;
  }

  async buyMarketItem(userId: number, itemId: number): Promise<UserItem | undefined> {
    const user = await this.getUser(userId);
    const item = await this.getMarketItem(itemId);

    if (!user || !item) {
      return undefined;
    }

    // Kullanıcının yeterli TCoini var mı kontrol et
    const userTcoins = user.tcoins || 0;
    if (userTcoins < item.price) {
      return undefined; // Yetersiz bakiye
    }

    // Item stokta mı kontrol et
    if (item.inStock <= 0) {
      return undefined; // Stokta yok
    }

    // Ödeme işlemini gerçekleştir
    await this.updateUserTcoins(userId, -item.price);

    // Stok düşür
    const updatedItem = { ...item, inStock: item.inStock - 1 };
    this.marketItems.set(itemId, updatedItem);

    // Satın alma kaydı oluştur
    const id = this.userItemId++;
    const now = new Date();
    const userItem: UserItem = {
      id,
      userId,
      itemId,
      purchasedAt: now,
      isActive: true
    };
    this.userItems.set(id, userItem);

    // TCoin işlem kaydı oluştur
    await this.createTcoinTransaction({
      userId,
      amount: -item.price,
      reason: 'market_purchase',
      relatedId: itemId
    });

    return userItem;
  }

  async getUserItems(userId: number): Promise<UserItem[]> {
    return Array.from(this.userItems.values())
      .filter(userItem => userItem.userId === userId);
  }

  // TCoin operations
  async createTcoinTransaction(transaction: InsertTcoinTransaction): Promise<TcoinTransaction> {
    const id = this.tcoinTransactionId++;
    const now = new Date();
    const tcoinTransaction: TcoinTransaction = {
      ...transaction,
      id,
      createdAt: now
    };
    this.tcoinTransactions.set(id, tcoinTransaction);
    return tcoinTransaction;
  }

  async getTcoinTransactionsByUserId(userId: number): Promise<TcoinTransaction[]> {
    return Array.from(this.tcoinTransactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private db: any;

  // TimeScaleDB bağlantısı
  private initTimeScaleDB() {
    const pgp = require('pg-promise')();

    const dbConfig = {
      host: process.env.TIMESCALE_HOST || 'localhost',
      port: process.env.TIMESCALE_PORT || 5432,
      database: process.env.TIMESCALE_DB || 'socialnexus',
      user: process.env.TIMESCALE_USER || 'postgres',
      password: process.env.TIMESCALE_PASSWORD || 'postgres',
      ssl: process.env.TIMESCALE_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    this.db = pgp(dbConfig);

    // TimeScaleDB kayıt tablolarını oluştur
    this.setupTimeScaleTables();
  }

  private async setupTimeScaleTables() {
    try {
      // Kullanıcı kayıt işlemleri tablosu
      await this.db.none(`
        CREATE TABLE IF NOT EXISTS user_registrations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          tc_no TEXT,
          tc_verified BOOLEAN DEFAULT FALSE,
          registration_ip TEXT,
          registration_time TIMESTAMPTZ DEFAULT NOW(),
          verification_time TIMESTAMPTZ
        );
      `);

      // TimeScaleDB hypertable oluşturma
      await this.db.none(`
        SELECT create_hypertable('user_registrations', 'registration_time', if_not_exists => TRUE);
      `).catch(err => {
        // Hypertable zaten varsa hata vermeden devam et
        console.log('Hypertable already exists or create_hypertable function not available');
      });

      console.log('TimeScaleDB tables created successfully');
    } catch (error) {
      console.error('Error setting up TimeScaleDB tables:', error);
    }
  }

  // Kullanıcı kaydının TimeScaleDB'ye eklenmesi
  public async logUserRegistration(userId: number, username: string, tcNo?: string, ipAddress?: string) {
    try {
      await this.db.none(`
        INSERT INTO user_registrations (user_id, username, tc_no, registration_ip, registration_time)
        VALUES ($1, $2, $3, $4, NOW())
      `, [userId, username, tcNo || null, ipAddress || null]);

      console.log(`Registration logged for user ${username}`);
      return true;
    } catch (error) {
      console.error('Error logging user registration:', error);
      return false;
    }
  }

  // TC kimlik doğrulama kaydının güncellenmesi
  public async updateTcVerificationLog(userId: number, tcVerified: boolean) {
    try {
      await this.db.none(`
        UPDATE user_registrations 
        SET tc_verified = $2, verification_time = NOW() 
        WHERE user_id = $1
      `, [userId, tcVerified]);

      console.log(`TC verification updated for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating TC verification log:', error);
      return false;
    }
  }

  private seedInitialData() {
    // Create default user
    const defaultUser: InsertUser = {
      username: "admin",
      password: "admin123",
      displayName: "Admin User",
      avatar: "https://ui-avatars.com/api/?name=Admin+User&background=0084FF&color=fff"
    };
    const user = this.createUser(defaultUser).then(user => {
      // Admin kullanıcısına başlangıç TCoini ver
      this.updateUserTcoins(user.id, 500);
      // TimeScaleDB'ye kullanıcı kaydını ekle
      this.logUserRegistration(user.id, defaultUser.username);
    });

    // Create default market items
    const badgeItem: InsertMarketItem = {
      name: "Doğrulanmış Rozeti",
      description: "Profil sayfanızda görünen özel TC Kimlik doğrulanmış rozeti",
      price: 100,
      type: "badge",
      image: "/assets/badges/verified.svg",
      inStock: 999
    };

    const themeItem: InsertMarketItem = {
      name: "Karanlık Tema+",
      description: "Gelişmiş karanlık tema - daha fazla kontrast ve özel vurgular",
      price: 150,
      type: "theme",
      image: "/assets/themes/dark-plus.svg",
      inStock: 999
    };

    const avatarItem: InsertMarketItem = {
      name: "Premium Avatar",
      description: "Premium kullanıcılar için özel tasarım avatar çerçevesi",
      price: 200,
      type: "avatar",
      image: "/assets/avatars/premium.svg",
      inStock: 50
    };

    // Market itemlerini ekle
    this.createMarketItem(badgeItem);
    this.createMarketItem(themeItem);
    this.createMarketItem(avatarItem);

    // TimeScaleDB bağlantısını başlat
    this.initTimeScaleDB();
    
    // Create categories
    const generalCategory: InsertCategory = {
      name: "General Discussion",
      description: "General topics and discussions"
    };
    const devCategory: InsertCategory = {
      name: "Development",
      description: "Development related discussions"
    };
    const designCategory: InsertCategory = {
      name: "Design",
      description: "Design related discussions"
    };

    this.createCategory(generalCategory).then(generalCat => {
      // Create topics for General
      this.createTopic({
        categoryId: generalCat.id,
        name: "Introductions",
        description: "Introduce yourself to the community"
      });
      this.createTopic({
        categoryId: generalCat.id,
        name: "Announcements",
        description: "Important announcements"
      });
      this.createTopic({
        categoryId: generalCat.id,
        name: "Forum Help",
        description: "Get help with using the forum"
      });
    });

    this.createCategory(devCategory).then(devCat => {
      // Create topics for Development
      this.createTopic({
        categoryId: devCat.id,
        name: "React",
        description: "React related discussions"
      }).then(reactTopic => {
        // Create sample threads in React topic
        this.createThread({
          topicId: reactTopic.id,
          userId: 1,
          title: "Help with React Context API",
          tag: "Question"
        }).then(thread => {
          this.createMessage({
            threadId: thread.id,
            userId: 1,
            content: "I'm having trouble with the Context API. Can anyone provide an example of how to properly use it with hooks?"
          });
        });

        this.createThread({
          topicId: reactTopic.id,
          userId: 1,
          title: "React 18 features discussion",
          tag: "Discussion"
        }).then(thread => {
          this.createMessage({
            threadId: thread.id,
            userId: 1,
            content: "What's your favorite new feature in React 18? I'm personally loving the automatic batching for better performance.\n\nAlso, has anyone experimented with the new Suspense SSR architecture? I'm curious about real-world results compared to traditional SSR approaches."
          });
        });
      });

      this.createTopic({
        categoryId: devCat.id,
        name: "Next.js",
        description: "Next.js related discussions"
      });
      this.createTopic({
        categoryId: devCat.id,
        name: "JavaScript",
        description: "JavaScript related discussions"
      });
    });

    this.createCategory(designCategory).then(designCat => {
      // Create topics for Design
      this.createTopic({
        categoryId: designCat.id,
        name: "UI Design",
        description: "UI Design related discussions"
      });
      this.createTopic({
        categoryId: designCat.id,
        name: "UX Research",
        description: "UX Research related discussions"
      });
    });
  }
}
}

export const storage = new MemStorage();