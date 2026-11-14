export type PaymentMethod = 'cash' | 'mixed' | 'credit' | 'transfer' | 'card';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance: number; // Positive means debt to store (veresiye)
  totalPurchases: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: 'Adet' | 'Kg' | 'Paket' | 'Koli' | 'Metre' | 'Litre';
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  buyPrice: number;
  discount: number;
  total: number;
}

export interface SaleReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  returns?: SaleReturnItem[];
  // What left the shelf. Differs from `items` (net of returns) because returned goods
  // are not put back into stock. Sales saved before this field deducted `items`.
  stockDeductions?: { productId: string; quantity: number }[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'cancelled';
  paidAmount: number;
  changeAmount: number;
  cashPaid?: number;
  transferPaid?: number;
  customerBalanceDelta?: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'stock_alert' | 'debt_reminder' | 'milestone' | 'system';
  isRead: boolean;
  actionTab?: 'pos' | 'dashboard' | 'products' | 'customers' | 'settings';
  createdAt: string;
}

export interface Reminder {
  id: string;
  customerId?: string;
  customerName: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  // Local calendar day as YYYY-MM-DD, so the day never shifts with the time zone.
  dueDate: string;
  notes?: string;
  status: 'pending' | 'done';
  completedAt?: string;
  createdAt: string;
}

export type ReminderDraft = Omit<Reminder, 'id' | 'status' | 'completedAt' | 'createdAt'>;

export interface AppSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  currency: string;
  taxRate: number;
  isPinEnabled: boolean;
  pinCode: string;
  isBiometricEnabled: boolean;
  autoLockMinutes: number;
  theme: 'light' | 'dark' | 'system';
  screenTopPadding?: 'auto' | 'compact' | 'large' | 'zero';
  showStatusBarClock?: boolean;
  lastBackupDate?: string;
  lastPhoneBackupDate?: string;
  backupWhatsappNumber?: string;
  autoBackupReminder?: 'daily' | 'weekly' | 'never';
  autoBackupOnDayEnd?: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  defaultUnit?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseItemId?: string;
  title: string;
  category: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  amount: number;
  paymentMethod: PaymentMethod;
  supplier?: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface DatabaseDump {
  version: string;
  timestamp: string;
  tables: {
    customers: Customer[];
    products: Product[];
    sales: Sale[];
    payments: CustomerPayment[];
    notifications: AppNotification[];
    settings: AppSettings;
    expenses?: Expense[];
    expenseItems?: ExpenseItem[];
    reminders?: Reminder[];
  };
}

export interface CustomerProductPurchaseSummary {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  totalQuantity: number;
  returnedQuantity: number;
  totalSpent: number;
  avgPrice: number;
  totalProfit: number;
  ordersCount: number;
  lastPurchaseDate: string;
}

export interface ExpenseProductSummary {
  expenseItemId: string;
  expenseItemName: string;
  category: string;
  unit: string;
  totalAmount: number;
  totalQuantity: number;
  avgUnitPrice: number;
  entriesCount: number;
  percentageOfTotal: number;
  lastExpenseDate: string;
}
