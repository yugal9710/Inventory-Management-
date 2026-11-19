export type UserRole = 'super_admin' | 'admin' | 'cashier' | 'storekeeper' | 'accountant';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  active: number;
}

export interface UnitConversions {
  kg_per_piece?: number;
  pieces_per_bundle?: number;
  kg_per_meter?: number;
  meter_per_piece?: number;
  foot_per_piece?: number;
  sheets_per_bundle?: number;
  kg_per_sheet?: number;
  kg_per_packet?: number;
  kg_per_bundle?: number;
  bags_per_tonne?: number;
  pieces_per_box?: number;
  [key: string]: number | undefined;
}

export interface Product {
  id: number;
  code: string;
  barcode?: string;
  name_en: string;
  name_np?: string;
  category: string;
  grade?: string;
  brand?: string;
  size?: string;
  base_unit: string;
  selling_units: string[];
  unit_conversions: UnitConversions;
  tax_category: 'VAT_13' | 'EXEMPT' | 'ZERO';
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  allows_cutting: number;
  standard_length?: number;
  current_stock?: number;
  active: number;
  locations?: { location_id: number; location_name: string; location_name_np: string; stock_qty: number }[];
  remnants?: Remnant[];
}

export interface Remnant {
  id: number;
  product_id: number;
  product_code?: string;
  product_name?: string;
  product_name_np?: string;
  category?: string;
  brand?: string;
  size?: string;
  location_id: number;
  location_name?: string;
  length_meters: number;
  quantity: number;
  condition: 'usable' | 'scrap';
  notes?: string;
  status: 'available' | 'sold' | 'discarded';
  created_at?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  product_name_np?: string;
  location_id: number;
  location_name: string;
  movement_type: string;
  quantity: number;
  unit: string;
  base_quantity: number;
  unit_cost: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  user_name?: string;
  date_ad: string;
  date_bs: string;
  created_at: string;
}

export interface Customer {
  id: number;
  customer_code?: string;
  name: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  contact_person?: string;
  customer_type?: string;
  address?: string;
  permanent_address?: string;
  temporary_address?: string;
  location_meta?: string;
  pan_vat?: string;
  credit_limit: number;
  payment_terms_days: number;
  opening_balance: number;
  current_balance: number;
  is_overdue?: boolean;
  available_credit?: number;
  notes?: string;
  active: number;
}

export interface Supplier {
  id: number;
  name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  pan_vat?: string;
  opening_balance: number;
  current_balance: number;
  notes?: string;
  active: number;
}

export interface SaleLine {
  id?: number;
  product_id: number;
  product_code?: string;
  product_name?: string;
  product_name_np?: string;
  category?: string;
  brand?: string;
  size?: string;
  location_id: number;
  location_name?: string;
  quantity: number;
  unit: string;
  base_quantity?: number;
  unit_price: number;
  discount_percent: number;
  discount_amount?: number;
  line_total: number;
  tax_category: string;
  tax_amount?: number;
  is_cut_length?: number;
  cut_length_meters?: number;
  remnant_id?: number;
}

export interface Sale {
  id: number;
  invoice_no: string;
  invoice_type: 'TAX_INVOICE' | 'ABBREVIATED' | 'CHALLAN';
  fiscal_year: string;
  customer_id?: number;
  customer_name: string;
  customer_pan?: string;
  customer_phone?: string;
  customer_address?: string;
  date_ad: string;
  date_bs: string;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  non_taxable_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
  is_delivery_challan: number;
  delivery_status: string;
  cbms_sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'EXEMPT';
  cbms_sync_code?: string;
  created_by_name?: string;
  notes?: string;
  lines?: SaleLine[];
  payments?: Payment[];
  amountInWordsEn?: string;
  amountInWordsNp?: string;
  formattedTotal?: string;
  store?: Record<string, string>;
}

export interface PurchaseLine {
  id?: number;
  product_id: number;
  product_code?: string;
  product_name?: string;
  location_id: number;
  ordered_qty: number;
  received_qty: number;
  shortage_qty: number;
  damaged_qty: number;
  unit: string;
  unit_cost: number;
  landed_unit_cost?: number;
  line_total: number;
  tax_category: string;
}

export interface Purchase {
  id: number;
  purchase_order_no: string;
  supplier_id: number;
  supplier_name?: string;
  supplier_pan?: string;
  supplier_invoice_no: string;
  fiscal_year: string;
  date_ad: string;
  date_bs: string;
  subtotal: number;
  discount: number;
  freight_amount: number;
  unloading_charge: number;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
  item_count?: number;
  lines?: PurchaseLine[];
  payments?: Payment[];
  notes?: string;
}

export interface Payment {
  id?: number;
  party_type: 'CUSTOMER' | 'SUPPLIER';
  party_id: number;
  reference_type: string;
  reference_id: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'QR_FONEPAY' | 'QR_NEPALPAY' | 'CHEQUE';
  amount: number;
  date_ad: string;
  date_bs: string;
  reference_number?: string;
  notes?: string;
  received_by_name?: string;
}

export interface CashSession {
  id: number;
  cashier_id: number;
  cashier_name?: string;
  date_ad: string;
  date_bs: string;
  opening_time: string;
  closing_time?: string;
  status: 'OPEN' | 'CLOSED';
  opening_cash: number;
  cash_sales: number;
  cash_receipts: number;
  cash_expenses: number;
  cash_supplier_payments: number;
  current_expected_cash?: number;
  expected_closing_cash?: number;
  actual_closing_cash?: number;
  cash_difference?: number;
  notes?: string;
}

export interface CashTransaction {
  id: number;
  session_id?: number;
  type: 'EXPENSE' | 'DEPOSIT' | 'WITHDRAWAL' | 'PETTY_CASH';
  category: string;
  amount: number;
  description?: string;
  payee?: string;
  date_ad: string;
  date_bs: string;
  created_by_name?: string;
}

export interface StoreSettings {
  shop_name_en: string;
  shop_name_np: string;
  pan_number: string;
  ird_reg_no: string;
  address_en: string;
  address_np: string;
  phone: string;
  email: string;
  active_fiscal_year: string;
  invoice_prefix: string;
  default_tax_rate: string;
  cbms_enabled: string;
  cbms_api_url: string;
  cbms_username: string;
  qr_bank_name: string;
  qr_account_name: string;
  qr_account_number: string;
  qr_merchant_id: string;
  [key: string]: string;
}
