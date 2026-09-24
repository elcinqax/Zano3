import { Customer, Product, Sale, SaleItem, CustomerPayment, AppNotification, AppSettings, DatabaseDump, PaymentMethod, Expense, ExpenseItem } from '../types';

const DB_NAME = 'mobilsatis_sqlite_db';
const DB_VERSION = 1;

export const SQLITE_SCHEMA_DDL = `
-- MobilSatış SQLite Veritabanı Şeması
-- Cihazda yerel ve internetsiz olarak saklanır

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  balance REAL DEFAULT 0,
  totalPurchases REAL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  buyPrice REAL NOT NULL,
  sellPrice REAL NOT NULL,
  stock REAL NOT NULL,
  minStock REAL DEFAULT 5,
  unit TEXT DEFAULT 'Adet',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  defaultUnit TEXT DEFAULT 'Adet',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expenseItemId TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  unitPrice REAL,
  amount REAL NOT NULL,
  paymentMethod TEXT NOT NULL,
  supplier TEXT,
  notes TEXT,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (expenseItemId) REFERENCES expense_items(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoiceNo TEXT UNIQUE NOT NULL,
  customerId TEXT,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  subtotal REAL NOT NULL,
  discount REAL DEFAULT 0,
  taxRate REAL DEFAULT 18,
  taxAmount REAL DEFAULT 0,
  total REAL NOT NULL,
  costTotal REAL NOT NULL,
  profit REAL NOT NULL,
  paymentMethod TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  paidAmount REAL NOT NULL,
  changeAmount REAL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  saleId TEXT NOT NULL,
  productId TEXT NOT NULL,
  productName TEXT NOT NULL,
  quantity REAL NOT NULL,
  unitPrice REAL NOT NULL,
  buyPrice REAL NOT NULL,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  FOREIGN KEY (saleId) REFERENCES sales(id),
  FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  customerName TEXT NOT NULL,
  amount REAL NOT NULL,
  paymentMethod TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  isRead INTEGER DEFAULT 0,
  actionTab TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  storeName TEXT NOT NULL,
  storePhone TEXT,
  storeAddress TEXT,
  currency TEXT DEFAULT '₺',
  taxRate REAL DEFAULT 18,
  isPinEnabled INTEGER DEFAULT 0,
  pinCode TEXT DEFAULT '1234',
  isBiometricEnabled INTEGER DEFAULT 0,
  autoLockMinutes INTEGER DEFAULT 5,
  theme TEXT DEFAULT 'system',
  lastBackupDate TEXT,
  googleDriveSyncEmail TEXT
);
`.trim();

const DEFAULT_SETTINGS: AppSettings = {
  storeName: 'Almalı Təndiri',
  storePhone: '+994 70 749 99 91',
  storeAddress: 'Qax rayon Almalı kəndi, Almalı Təndiri',
  currency: '₼',
  taxRate: 0,
  isPinEnabled: false,
  pinCode: '1234',
  isBiometricEnabled: false,
  autoLockMinutes: 5,
  theme: 'system',
  screenTopPadding: 'auto',
  showStatusBarClock: true,
  lastBackupDate: new Date().toISOString(),
  googleDriveSyncEmail: '',
};

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Ahmet Yılmaz',
    phone: '0532 555 12 34',
    email: 'ahmet.yilmaz@email.com',
    address: 'Moda Cad. No:12, Kadıköy',
    balance: 0,
    totalPurchases: 0,
    notes: 'Haftalık düzenli müşteri, veresiye açık hesap.',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-22T14:30:00.000Z',
  },
  {
    id: 'cust-2',
    name: 'Selin Demir',
    phone: '0544 333 45 67',
    email: 'selin.demir@email.com',
    address: 'Bağdat Cad. No:140/4, Kadıköy',
    balance: 0,
    totalPurchases: 0,
    notes: 'Kredi kartı tercih ediyor.',
    createdAt: '2026-09-05T11:20:00.000Z',
    updatedAt: '2026-09-20T16:15:00.000Z',
  },
  {
    id: 'cust-3',
    name: 'Mehmet Kaya (Kaya Ticaret)',
    phone: '0555 777 88 99',
    email: 'kaya.ticaret@email.com',
    address: 'Sanayi Mah. 4. Sok. No:8',
    balance: 0,
    totalPurchases: 0,
    notes: 'Toptan alıcı, ay sonu EFT ile kapatır.',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-09-23T11:00:00.000Z',
  },
  {
    id: 'cust-4',
    name: 'Zeynep Aktaş',
    phone: '0505 444 22 11',
    email: 'zeynep.aktas@email.com',
    address: 'Rıhtım Sok. No:5, Üsküdar',
    balance: 0,
    totalPurchases: 0,
    notes: 'Nakit alıcı.',
    createdAt: '2026-09-12T15:40:00.000Z',
    updatedAt: '2026-09-24T09:10:00.000Z',
  },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Türk Kahvesi 100g',
    category: 'Gıda & İçecek',
    buyPrice: 32.0,
    sellPrice: 50.0,
    stock: 45,
    minStock: 10,
    unit: 'Adet',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Çaykur Rize Çayı 1000g',
    category: 'Gıda & İçecek',
    buyPrice: 140.0,
    sellPrice: 195.0,
    stock: 18,
    minStock: 5,
    unit: 'Adet',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'Zeytinyağı Sızma 1 Litre',
    category: 'Gıda & İçecek',
    buyPrice: 280.0,
    sellPrice: 380.0,
    stock: 4, // Critical stock!
    minStock: 6,
    unit: 'Litre',
    createdAt: '2026-09-02T09:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'prod-4',
    name: 'USB-C Hızlı Şarj Kablosu 1.5m',
    category: 'Elektronik & Aksesuar',
    buyPrice: 85.0,
    sellPrice: 160.0,
    stock: 22,
    minStock: 5,
    unit: 'Adet',
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-21T11:00:00.000Z',
  },
  {
    id: 'prod-5',
    name: 'Kablosuz Optik Mouse',
    category: 'Elektronik & Aksesuar',
    buyPrice: 160.0,
    sellPrice: 290.0,
    stock: 3, // Critical stock!
    minStock: 5,
    unit: 'Adet',
    createdAt: '2026-09-03T10:30:00.000Z',
    updatedAt: '2026-09-23T14:00:00.000Z',
  },
  {
    id: 'prod-6',
    name: 'Sıvı El Sabunu 500ml',
    category: 'Temizlik & Hijyen',
    buyPrice: 25.0,
    sellPrice: 45.0,
    stock: 35,
    minStock: 8,
    unit: 'Adet',
    createdAt: '2026-09-04T11:00:00.000Z',
    updatedAt: '2026-09-18T16:00:00.000Z',
  },
  {
    id: 'prod-7',
    name: 'A4 Fotokopi Kağıdı 80g (Paket)',
    category: 'Kırtasiye & Ofis',
    buyPrice: 110.0,
    sellPrice: 175.0,
    stock: 2, // Critical stock!
    minStock: 10,
    unit: 'Paket',
    createdAt: '2026-09-05T12:00:00.000Z',
    updatedAt: '2026-09-24T08:00:00.000Z',
  },
  {
    id: 'prod-8',
    name: 'Organik Bal 850g',
    category: 'Gıda & İçecek',
    buyPrice: 240.0,
    sellPrice: 360.0,
    stock: 14,
    minStock: 5,
    unit: 'Adet',
    createdAt: '2026-09-06T14:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
  },
];

const SEED_SALES: Sale[] = [];

const SEED_PAYMENTS: CustomerPayment[] = [];

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'MobilSatış Hazır',
    message: 'Satış, stok, müşteri ve gider takip sisteminiz kullanıma hazırdır.',
    type: 'system',
    isRead: true,
    actionTab: 'pos',
    createdAt: '2026-09-24T08:00:00.000Z',
  },
];

const SEED_EXPENSE_ITEMS: ExpenseItem[] = [
  {
    id: 'exp-item-1',
    name: 'Un (50 kg Kisə / Çuval)',
    category: 'İstehsalat & Xammal',
    defaultUnit: 'Kisə',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'exp-item-2',
    name: 'Odun (Təndir Yanacağı)',
    category: 'İstehsalat & Yanacaq',
    defaultUnit: 'Maşın',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'exp-item-3',
    name: 'Təndir Mayası (Paket)',
    category: 'İstehsalat & Xammal',
    defaultUnit: 'Paket',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'exp-item-4',
    name: 'Xörək Duzu (Kisə 25kg)',
    category: 'İstehsalat & Xammal',
    defaultUnit: 'Kisə',
    createdAt: '2026-09-02T08:00:00.000Z',
  },
  {
    id: 'exp-item-5',
    name: 'Qablaşdırma & Çörək Torbası',
    category: 'Qablaşdırma & Sərfi',
    defaultUnit: 'Paket',
    createdAt: '2026-09-03T08:00:00.000Z',
  },
  {
    id: 'exp-item-6',
    name: 'Elektrik & Qaz Ödənişi',
    category: 'Kommunal & Əməliyyat',
    defaultUnit: 'Ay',
    createdAt: '2026-09-05T08:00:00.000Z',
  },
  {
    id: 'exp-item-7',
    name: 'Təndir İcarə Haqqı',
    category: 'Əməliyyat & İcarə',
    defaultUnit: 'Ay',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

const SEED_EXPENSES: Expense[] = [];

class SQLiteStorageManager {
  private memoryCache: {
    customers: Customer[];
    products: Product[];
    sales: Sale[];
    payments: CustomerPayment[];
    notifications: AppNotification[];
    settings: AppSettings;
    expenses: Expense[];
    expenseItems: ExpenseItem[];
  } = {
    customers: [],
    products: [],
    sales: [],
    payments: [],
    notifications: [],
    settings: DEFAULT_SETTINGS,
    expenses: [],
    expenseItems: [],
  };

  private isInitialized = false;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedCustomers = localStorage.getItem('sqlite_table_customers');
        const storedProducts = localStorage.getItem('sqlite_table_products');
        const storedSales = localStorage.getItem('sqlite_table_sales');
        const storedPayments = localStorage.getItem('sqlite_table_payments');
        const storedNotifications = localStorage.getItem('sqlite_table_notifications');
        const storedSettings = localStorage.getItem('sqlite_table_settings');
        const storedExpenses = localStorage.getItem('sqlite_table_expenses');
        const storedExpenseItems = localStorage.getItem('sqlite_table_expense_items');

        if (storedCustomers && storedProducts) {
          this.memoryCache.customers = JSON.parse(storedCustomers);
          this.memoryCache.products = JSON.parse(storedProducts);
          this.memoryCache.sales = storedSales ? JSON.parse(storedSales) : [];
          this.memoryCache.payments = storedPayments ? JSON.parse(storedPayments) : [];
          this.memoryCache.notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
          this.memoryCache.expenses = storedExpenses ? JSON.parse(storedExpenses) : SEED_EXPENSES;
          this.memoryCache.expenseItems = storedExpenseItems ? JSON.parse(storedExpenseItems) : SEED_EXPENSE_ITEMS;
          const parsedSettings = storedSettings ? JSON.parse(storedSettings) : {};

          // Auto-migrate old placeholder settings if present
          if (
            !parsedSettings.storeAddress ||
            parsedSettings.storeAddress.includes('Kadıköy') ||
            parsedSettings.storeAddress.includes('Atatürk Cad')
          ) {
            parsedSettings.storeAddress = 'Qax rayon Almalı kəndi, Almalı Təndiri';
          }
          if (!parsedSettings.storePhone || parsedSettings.storePhone.includes('532 100')) {
            parsedSettings.storePhone = '+994 70 749 99 91';
          }
          if (!parsedSettings.storeName || parsedSettings.storeName === 'MobilSatış Mağazası') {
            parsedSettings.storeName = 'Almalı Təndiri';
          }
          if (!parsedSettings.currency || parsedSettings.currency === '₺') {
            parsedSettings.currency = '₼';
          }
          if (!parsedSettings.screenTopPadding) {
            parsedSettings.screenTopPadding = 'auto';
          }

          this.memoryCache.settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
          this.persistAll();
        } else {
          // First time seeding
          this.memoryCache.customers = SEED_CUSTOMERS;
          this.memoryCache.products = SEED_PRODUCTS;
          this.memoryCache.sales = SEED_SALES;
          this.memoryCache.payments = SEED_PAYMENTS;
          this.memoryCache.notifications = SEED_NOTIFICATIONS;
          this.memoryCache.settings = DEFAULT_SETTINGS;
          this.memoryCache.expenses = SEED_EXPENSES;
          this.memoryCache.expenseItems = SEED_EXPENSE_ITEMS;
          this.persistAll();
        }
      }
    } catch (err) {
      console.error('SQLite Storage Init error, using fallback in-memory cache:', err);
      this.memoryCache.customers = SEED_CUSTOMERS;
      this.memoryCache.products = SEED_PRODUCTS;
      this.memoryCache.sales = SEED_SALES;
      this.memoryCache.payments = SEED_PAYMENTS;
      this.memoryCache.notifications = SEED_NOTIFICATIONS;
      this.memoryCache.settings = DEFAULT_SETTINGS;
      this.memoryCache.expenses = SEED_EXPENSES;
      this.memoryCache.expenseItems = SEED_EXPENSE_ITEMS;
    }

    // Force reset all sales, expenses, payments and customer balances to 0 as requested by user
    const REPORTS_RESET_MIGRATION_KEY = 'mobilsatis_reports_reset_2026_09_24';
    if (typeof window !== 'undefined' && window.localStorage && localStorage.getItem(REPORTS_RESET_MIGRATION_KEY) !== 'done') {
      this.memoryCache.sales = [];
      this.memoryCache.expenses = [];
      this.memoryCache.payments = [];
      if (Array.isArray(this.memoryCache.customers)) {
        this.memoryCache.customers.forEach((c) => {
          c.balance = 0;
          c.totalPurchases = 0;
        });
      }
      localStorage.setItem(REPORTS_RESET_MIGRATION_KEY, 'done');
      this.persistAll();
    }

    this.isInitialized = true;
    this.refreshStockNotifications();
    this.notify();
  }

  private persistAll() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sqlite_table_customers', JSON.stringify(this.memoryCache.customers));
        localStorage.setItem('sqlite_table_products', JSON.stringify(this.memoryCache.products));
        localStorage.setItem('sqlite_table_sales', JSON.stringify(this.memoryCache.sales));
        localStorage.setItem('sqlite_table_payments', JSON.stringify(this.memoryCache.payments));
        localStorage.setItem('sqlite_table_notifications', JSON.stringify(this.memoryCache.notifications));
        localStorage.setItem('sqlite_table_settings', JSON.stringify(this.memoryCache.settings));
        localStorage.setItem('sqlite_table_expenses', JSON.stringify(this.memoryCache.expenses));
        localStorage.setItem('sqlite_table_expense_items', JSON.stringify(this.memoryCache.expenseItems));
      }
    } catch (e) {
      console.error('SQLite persist failed:', e);
    }
  }

  // --- Products ---
  public getProducts(): Product[] {
    return [...this.memoryCache.products];
  }

  public addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: now,
      updatedAt: now,
    };
    this.memoryCache.products.unshift(newProduct);
    this.persistAll();
    this.refreshStockNotifications();
    this.notify();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.memoryCache.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const updated: Product = {
      ...this.memoryCache.products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryCache.products[index] = updated;
    this.persistAll();
    this.refreshStockNotifications();
    this.notify();
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.memoryCache.products.length;
    this.memoryCache.products = this.memoryCache.products.filter((p) => p.id !== id);
    if (this.memoryCache.products.length !== initialLen) {
      this.persistAll();
      this.notify();
      return true;
    }
    return false;
  }

  public adjustStock(id: string, delta: number): Product | null {
    const p = this.memoryCache.products.find((item) => item.id === id);
    if (!p) return null;
    return this.updateProduct(id, { stock: Math.max(0, p.stock + delta) });
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return [...this.memoryCache.customers].sort((a, b) =>
      a.name.localeCompare(b.name, 'tr')
    );
  }

  public addCustomer(customer: Omit<Customer, 'id' | 'balance' | 'totalPurchases' | 'createdAt' | 'updatedAt'>): Customer {
    const now = new Date().toISOString();
    const newCust: Customer = {
      ...customer,
      id: 'cust-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      balance: 0,
      totalPurchases: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.memoryCache.customers.unshift(newCust);
    this.persistAll();
    this.notify();
    return newCust;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const index = this.memoryCache.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated: Customer = {
      ...this.memoryCache.customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.memoryCache.customers[index] = updated;
    this.persistAll();
    this.notify();
    return updated;
  }

  public deleteCustomer(id: string): boolean {
    const initialLen = this.memoryCache.customers.length;
    this.memoryCache.customers = this.memoryCache.customers.filter((c) => c.id !== id);
    if (this.memoryCache.customers.length !== initialLen) {
      this.persistAll();
      this.notify();
      return true;
    }
    return false;
  }

  // Add Debt Payment / Collection (Tahsilat)
  public addCustomerPayment(customerId: string, amount: number, paymentMethod: PaymentMethod, notes?: string): CustomerPayment | null {
    const customer = this.memoryCache.customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const payment: CustomerPayment = {
      id: 'pay-' + Date.now(),
      customerId,
      customerName: customer.name,
      amount,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
    };

    customer.balance = Number((customer.balance - amount).toFixed(2));
    customer.updatedAt = payment.createdAt;

    this.memoryCache.payments.unshift(payment);
    this.addNotification({
      title: 'Tahsilat Alındı',
      message: `${customer.name} müşterisinden ${amount.toFixed(2)} ₺ tahsilat yapıldı. Güncel bakiye: ${customer.balance.toFixed(2)} ₺`,
      type: 'system',
      actionTab: 'customers',
    });

    this.persistAll();
    this.notify();
    return payment;
  }

  public getCustomerPayments(customerId?: string): CustomerPayment[] {
    if (!customerId) return [...this.memoryCache.payments];
    return this.memoryCache.payments.filter((p) => p.customerId === customerId);
  }

  // --- Sales ---
  public getSales(): Sale[] {
    return [...this.memoryCache.sales];
  }

  public createSale(
    saleData: Omit<Sale, 'id' | 'invoiceNo' | 'status' | 'createdAt' | 'items'> & {
      items: (Omit<SaleItem, 'id' | 'saleId'> & { id?: string; saleId?: string })[];
    }
  ): Sale {
    const now = new Date().toISOString();
    const count = this.memoryCache.sales.length + 101;
    const year = new Date().getFullYear();
    const invoiceNo = `ST-${year}-${String(count).padStart(5, '0')}`;
    const saleId = 'sale-' + Date.now();

    const finalItems: SaleItem[] = saleData.items.map((item, idx) => ({
      id: item.id || `item-${Date.now()}-${idx}`,
      saleId: item.saleId || saleId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      buyPrice: item.buyPrice,
      discount: item.discount,
      total: item.total,
    }));

    const newSale: Sale = {
      ...saleData,
      id: saleId,
      items: finalItems,
      invoiceNo,
      status: 'completed',
      createdAt: now,
    };

    // Deduct stock for all items
    for (const item of newSale.items) {
      const prod = this.memoryCache.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.updatedAt = now;
      }
    }

    // Update customer stats if selected (Müşterinin eksik veya fazla verdiği ödeme hesaba yansıtılır)
    if (newSale.customerId) {
      const cust = this.memoryCache.customers.find((c) => c.id === newSale.customerId);
      if (cust) {
        cust.totalPurchases = Number((cust.totalPurchases + newSale.total).toFixed(2));

        // Eksik veya fazla ödeme hesabı:
        // Eğer veresiye ise (paidAmount = 0), fark = total (müşteriye borç eklenir)
        // Eğer eksik ödendiyse (paidAmount < total), fark = total - paidAmount (kalan kısım borç eklenir)
        // Eğer fazla ödendiyse (paidAmount > total), fark = total - paidAmount (negatif değer: bakiye düşer / avans alacak)
        // Eğer tam ödendiyse, fark = 0
        let balanceDelta = 0;
        if (newSale.customerBalanceDelta !== undefined) {
          balanceDelta = newSale.customerBalanceDelta;
        } else if (newSale.paymentMethod === 'credit') {
          balanceDelta = Number(newSale.total.toFixed(2));
        } else {
          balanceDelta = Number((newSale.total - newSale.paidAmount).toFixed(2));
        }

        cust.balance = Number((cust.balance + balanceDelta).toFixed(2));
        newSale.customerBalanceDelta = balanceDelta;
        cust.updatedAt = now;

        if (balanceDelta > 0) {
          this.addNotification({
            title: newSale.paymentMethod === 'credit' ? 'Veresiye Satış' : 'Kalan Borç Hesaba Eklendi',
            message: `${cust.name} hesabına ${balanceDelta.toFixed(2)} ₺ veresiye eklendi. Güncel Bakiye: ${cust.balance.toFixed(2)} ₺`,
            type: 'debt_reminder',
            actionTab: 'customers',
          });
        } else if (balanceDelta < 0) {
          this.addNotification({
            title: 'Fazla Ödeme Hesaba Aktarıldı',
            message: `${cust.name} için ${Math.abs(balanceDelta).toFixed(2)} ₺ fazla ödeme müşteri hesabına alacak/avans olarak kaydedildi. Güncel Bakiye: ${cust.balance.toFixed(2)} ₺`,
            type: 'system',
            actionTab: 'customers',
          });
        }
      }
    }

    this.memoryCache.sales.unshift(newSale);

    // Add milestone notification if total > 2000
    if (newSale.total >= 2000) {
      this.addNotification({
        title: 'Yüksek Tutarlı Satış!',
        message: `${newSale.customerName} için ${newSale.total.toFixed(2)} ₺ tutarında satış tamamlandı.`,
        type: 'milestone',
        actionTab: 'dashboard',
      });
    }

    this.persistAll();
    this.refreshStockNotifications();
    this.notify();
    return newSale;
  }

  public cancelSale(saleId: string): boolean {
    const sale = this.memoryCache.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'cancelled') return false;

    sale.status = 'cancelled';

    // Restore stock
    for (const item of sale.items) {
      const prod = this.memoryCache.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
      }
    }

    // Reverse customer balance and purchase totals if customer was attached
    if (sale.customerId) {
      const cust = this.memoryCache.customers.find((c) => c.id === sale.customerId);
      if (cust) {
        const deltaToRevert =
          sale.customerBalanceDelta !== undefined
            ? sale.customerBalanceDelta
            : sale.paymentMethod === 'credit'
            ? sale.total
            : Number((sale.total - sale.paidAmount).toFixed(2));
        cust.balance = Number((cust.balance - deltaToRevert).toFixed(2));
        cust.totalPurchases = Math.max(0, Number((cust.totalPurchases - sale.total).toFixed(2)));
      }
    }

    this.addNotification({
      title: 'Satış İptal Edildi',
      message: `${sale.invoiceNo} numaralı satış iptal edildi ve stoklar iade edildi.`,
      type: 'system',
      actionTab: 'dashboard',
    });

    this.persistAll();
    this.refreshStockNotifications();
    this.notify();
    return true;
  }

  // --- Notifications ---
  public getNotifications(): AppNotification[] {
    return [...this.memoryCache.notifications];
  }

  public addNotification(notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.memoryCache.notifications.unshift(newNotif);
    // keep max 50
    if (this.memoryCache.notifications.length > 50) {
      this.memoryCache.notifications = this.memoryCache.notifications.slice(0, 50);
    }
    this.persistAll();
    this.notify();
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const n = this.memoryCache.notifications.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      this.persistAll();
      this.notify();
    }
  }

  public markAllNotificationsAsRead(): void {
    this.memoryCache.notifications.forEach((n) => (n.isRead = true));
    this.persistAll();
    this.notify();
  }

  public clearAllNotifications(): void {
    this.memoryCache.notifications = [];
    this.persistAll();
    this.notify();
  }

  private refreshStockNotifications() {
    // Kritik stok uyarısı kullanıcı isteğiyle kaldırıldı
    return;
  }

  // --- Expense Items ---
  public getExpenseItems(): ExpenseItem[] {
    return [...this.memoryCache.expenseItems];
  }

  public addExpenseItem(item: Omit<ExpenseItem, 'id' | 'createdAt'>): ExpenseItem {
    const newItem: ExpenseItem = {
      ...item,
      id: 'exp-item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    this.memoryCache.expenseItems.push(newItem);
    this.persistAll();
    this.notify();
    return newItem;
  }

  public updateExpenseItem(id: string, updates: Partial<ExpenseItem>): ExpenseItem | null {
    const index = this.memoryCache.expenseItems.findIndex((i) => i.id === id);
    if (index === -1) return null;
    this.memoryCache.expenseItems[index] = {
      ...this.memoryCache.expenseItems[index],
      ...updates,
    };
    // Also update any expenses referencing this item
    if (updates.name || updates.category) {
      this.memoryCache.expenses.forEach((exp) => {
        if (exp.expenseItemId === id) {
          if (updates.name) exp.title = updates.name;
          if (updates.category) exp.category = updates.category;
        }
      });
    }
    this.persistAll();
    this.notify();
    return this.memoryCache.expenseItems[index];
  }

  public deleteExpenseItem(id: string): boolean {
    const item = this.memoryCache.expenseItems.find((i) => i.id === id);
    const itemName = item?.name;
    const prevItemsLen = this.memoryCache.expenseItems.length;
    this.memoryCache.expenseItems = this.memoryCache.expenseItems.filter((i) => i.id !== id);

    // Also remove any expenses associated with this item id or title so it disappears completely from Giderler
    const prevExpensesLen = this.memoryCache.expenses.length;
    this.memoryCache.expenses = this.memoryCache.expenses.filter(
      (e) => e.expenseItemId !== id && (!itemName || e.title.toLowerCase() !== itemName.toLowerCase())
    );

    if (this.memoryCache.expenseItems.length !== prevItemsLen || this.memoryCache.expenses.length !== prevExpensesLen) {
      this.persistAll();
      this.notify();
      return true;
    }
    return false;
  }

  public deleteProductExpenses(productIdOrTitle: string, titleFallback?: string): boolean {
    const idLower = productIdOrTitle.toLowerCase();
    const titleLower = (titleFallback || productIdOrTitle).toLowerCase();

    const prevItemsLen = this.memoryCache.expenseItems.length;
    this.memoryCache.expenseItems = this.memoryCache.expenseItems.filter(
      (i) => i.id !== productIdOrTitle && i.name.toLowerCase() !== idLower && i.name.toLowerCase() !== titleLower
    );

    const prevExpensesLen = this.memoryCache.expenses.length;
    this.memoryCache.expenses = this.memoryCache.expenses.filter(
      (e) =>
        e.expenseItemId !== productIdOrTitle &&
        e.title.toLowerCase() !== idLower &&
        e.title.toLowerCase() !== titleLower
    );

    this.persistAll();
    this.notify();
    return true;
  }

  // --- Expenses ---
  public getExpenses(): Expense[] {
    return [...this.memoryCache.expenses];
  }

  public addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: now,
    };
    this.memoryCache.expenses.unshift(newExpense);
    this.persistAll();
    this.notify();
    return newExpense;
  }

  public updateExpense(id: string, updates: Partial<Expense>): Expense | null {
    const index = this.memoryCache.expenses.findIndex((e) => e.id === id);
    if (index === -1) return null;
    this.memoryCache.expenses[index] = {
      ...this.memoryCache.expenses[index],
      ...updates,
    };
    this.persistAll();
    this.notify();
    return this.memoryCache.expenses[index];
  }

  public deleteExpense(id: string): boolean {
    const prevLen = this.memoryCache.expenses.length;
    this.memoryCache.expenses = this.memoryCache.expenses.filter((e) => e.id !== id);
    if (this.memoryCache.expenses.length !== prevLen) {
      this.persistAll();
      this.notify();
      return true;
    }
    return false;
  }

  // --- Settings ---
  public getSettings(): AppSettings {
    return { ...this.memoryCache.settings };
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.memoryCache.settings = {
      ...this.memoryCache.settings,
      ...updates,
    };
    this.persistAll();
    this.notify();
    return { ...this.memoryCache.settings };
  }

  // --- Backup & SQL Dump ---
  public exportJSONDump(): DatabaseDump {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tables: {
        customers: this.memoryCache.customers,
        products: this.memoryCache.products,
        sales: this.memoryCache.sales,
        payments: this.memoryCache.payments,
        notifications: this.memoryCache.notifications,
        settings: this.memoryCache.settings,
        expenses: this.memoryCache.expenses,
        expenseItems: this.memoryCache.expenseItems,
      },
    };
  }

  public exportSQLDump(): string {
    const lines: string[] = [];
    lines.push('-- MobilSatış SQLite Veritabanı Yedeği (.sql)');
    lines.push(`-- Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`);
    lines.push('BEGIN TRANSACTION;');
    lines.push('');
    lines.push(SQLITE_SCHEMA_DDL);
    lines.push('');

    // Customers
    for (const c of this.memoryCache.customers) {
      const escape = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      lines.push(
        `INSERT OR REPLACE INTO customers (id, name, phone, email, address, balance, totalPurchases, notes, createdAt, updatedAt) VALUES ('${c.id}', ${escape(c.name)}, ${escape(c.phone)}, ${escape(c.email)}, ${escape(c.address)}, ${c.balance}, ${c.totalPurchases}, ${escape(c.notes)}, '${c.createdAt}', '${c.updatedAt}');`
      );
    }
    lines.push('');

    // Products
    for (const p of this.memoryCache.products) {
      const escape = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      lines.push(
        `INSERT OR REPLACE INTO products (id, name, category, buyPrice, sellPrice, stock, minStock, unit, createdAt, updatedAt) VALUES ('${p.id}', ${escape(p.name)}, ${escape(p.category)}, ${p.buyPrice}, ${p.sellPrice}, ${p.stock}, ${p.minStock}, '${p.unit}', '${p.createdAt}', '${p.updatedAt}');`
      );
    }
    lines.push('');

    // Expense Items
    for (const ei of this.memoryCache.expenseItems) {
      const escape = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      lines.push(
        `INSERT OR REPLACE INTO expense_items (id, name, category, defaultUnit, createdAt) VALUES ('${ei.id}', ${escape(ei.name)}, ${escape(ei.category)}, ${escape(ei.defaultUnit)}, '${ei.createdAt}');`
      );
    }
    lines.push('');

    // Expenses
    for (const exp of this.memoryCache.expenses) {
      const escape = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      lines.push(
        `INSERT OR REPLACE INTO expenses (id, expenseItemId, title, category, quantity, unit, unitPrice, amount, paymentMethod, supplier, notes, date, createdAt) VALUES ('${exp.id}', ${escape(exp.expenseItemId)}, ${escape(exp.title)}, ${escape(exp.category)}, ${exp.quantity || 'NULL'}, ${escape(exp.unit)}, ${exp.unitPrice || 'NULL'}, ${exp.amount}, '${exp.paymentMethod}', ${escape(exp.supplier)}, ${escape(exp.notes)}, '${exp.date}', '${exp.createdAt}');`
      );
    }
    lines.push('');

    // Sales & Items
    for (const s of this.memoryCache.sales) {
      const escape = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
      lines.push(
        `INSERT OR REPLACE INTO sales (id, invoiceNo, customerId, customerName, customerPhone, subtotal, discount, taxRate, taxAmount, total, costTotal, profit, paymentMethod, status, paidAmount, changeAmount, notes, createdAt) VALUES ('${s.id}', '${s.invoiceNo}', ${escape(s.customerId)}, ${escape(s.customerName)}, ${escape(s.customerPhone)}, ${s.subtotal}, ${s.discount}, ${s.taxRate}, ${s.taxAmount}, ${s.total}, ${s.costTotal}, ${s.profit}, '${s.paymentMethod}', '${s.status}', ${s.paidAmount}, ${s.changeAmount}, ${escape(s.notes)}, '${s.createdAt}');`
      );

      for (const it of s.items) {
        lines.push(
          `INSERT OR REPLACE INTO sale_items (id, saleId, productId, productName, quantity, unitPrice, buyPrice, discount, total) VALUES ('${it.id}', '${s.id}', '${it.productId}', ${escape(it.productName)}, ${it.quantity}, ${it.unitPrice}, ${it.buyPrice}, ${it.discount}, ${it.total});`
        );
      }
    }
    lines.push('');

    // Settings
    const set = this.memoryCache.settings;
    lines.push(
      `INSERT OR REPLACE INTO settings (id, storeName, storePhone, storeAddress, currency, taxRate, isPinEnabled, pinCode, isBiometricEnabled, autoLockMinutes, theme, lastBackupDate, googleDriveSyncEmail) VALUES ('main', '${set.storeName}', '${set.storePhone}', '${set.storeAddress}', '${set.currency}', ${set.taxRate}, ${set.isPinEnabled ? 1 : 0}, '${set.pinCode}', ${set.isBiometricEnabled ? 1 : 0}, ${set.autoLockMinutes}, '${set.theme}', '${set.lastBackupDate || ''}', '${set.googleDriveSyncEmail || ''}');`
    );

    lines.push('');
    lines.push('COMMIT;');
    return lines.join('\n');
  }

  public importDump(dump: DatabaseDump): boolean {
    try {
      if (!dump || !dump.tables) return false;
      if (Array.isArray(dump.tables.customers)) this.memoryCache.customers = dump.tables.customers;
      if (Array.isArray(dump.tables.products)) this.memoryCache.products = dump.tables.products;
      if (Array.isArray(dump.tables.sales)) this.memoryCache.sales = dump.tables.sales;
      if (Array.isArray(dump.tables.payments)) this.memoryCache.payments = dump.tables.payments;
      if (Array.isArray(dump.tables.notifications)) this.memoryCache.notifications = dump.tables.notifications;
      if (Array.isArray(dump.tables.expenses)) this.memoryCache.expenses = dump.tables.expenses;
      if (Array.isArray(dump.tables.expenseItems)) this.memoryCache.expenseItems = dump.tables.expenseItems;
      if (dump.tables.settings) {
        this.memoryCache.settings = { ...DEFAULT_SETTINGS, ...dump.tables.settings, lastBackupDate: new Date().toISOString() };
      }
      this.persistAll();
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to import dump:', e);
      return false;
    }
  }

  public resetAllReports(): void {
    this.memoryCache.sales = [];
    this.memoryCache.expenses = [];
    this.memoryCache.payments = [];
    if (Array.isArray(this.memoryCache.customers)) {
      this.memoryCache.customers.forEach((c) => {
        c.balance = 0;
        c.totalPurchases = 0;
      });
    }
    this.persistAll();
    this.notify();
  }

  public resetToSampleData(): void {
    this.memoryCache.customers = SEED_CUSTOMERS;
    this.memoryCache.products = SEED_PRODUCTS;
    this.memoryCache.sales = SEED_SALES;
    this.memoryCache.payments = SEED_PAYMENTS;
    this.memoryCache.notifications = SEED_NOTIFICATIONS;
    this.memoryCache.settings = DEFAULT_SETTINGS;
    this.memoryCache.expenses = SEED_EXPENSES;
    this.memoryCache.expenseItems = SEED_EXPENSE_ITEMS;
    this.persistAll();
    this.notify();
  }
}

export const sqliteStorage = new SQLiteStorageManager();
