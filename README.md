# Nepal Iron Store Inventory & Billing Management System
### (फलाम तथा निर्माण सामग्री भण्डार व्यवस्थापन प्रणाली)

An end-to-end, production-ready inventory management and billing system specifically architected for Nepal-based iron, steel, and construction material retailers and wholesalers (selling TMT rebar, GI/MS pipes, corrugated CGI sheets, angles, channels, binding wire, nails, and cement).

---

## 🇳🇵 Nepal-Specific Requirements & Compliance

1. **Currency & Numbering Format**:
   - Currency: **Nepalese Rupee (NPR, रु, Rs.)**
   - South Asian formatting (Lakhs & Crores grouping: e.g. `Rs. 15,23,450.75`).
   - Official **Amount in Words** rendered automatically in both Nepali Devanagari (अक्षरेपी) and English on all tax invoices.

2. **Bikram Sambat (वि.सं.) & Gregorian (AD) Calendar**:
   - Exact bidirectional date conversion covering BS 2075 through 2090.
   - Dual-date display across all screens, tables, and printed documents.
   - Nepal Fiscal Year calculation (Shrawan 1 to Ashadh end, e.g. `2081/82`).
   - Sequential, fiscal-year prefixed invoice numbering (e.g. `TI-208182-0001`).

3. **Inland Revenue Department (IRD) Tax Compliance & CBMS API**:
   - **Schedule 5 Tax Invoice (कर विजक)** format with Buyer & Seller PAN, 13% VAT segregation, Taxable vs Non-Taxable amounts.
   - **Schedule 10 VAT Sales Register (अनुसूची १० कर बिक्री खाता)** exportable to CSV/Excel.
   - **Schedule 9 VAT Purchase Register (अनुसूची ९ कर खरिद खाता)** exportable to CSV/Excel.
   - **IRD CBMS Integration Module**: Ready for real-time electronic invoice reporting to IRD's Central Billing Monitoring System (`POST /api/bill`) with automated retry queue, payload validation, and sandbox simulator.
   - Official **Credit Notes (क्रेडिट नोट)** for sales returns per IRD rules.

4. **Digital Payments & Dynamic QR Integration**:
   - Split & partial payments: Cash (नगद), Bank Transfer / connectIPS, and Customer Credit (उधारो खाता).
   - **NEPALPAY & Fonepay QR**: Real-time dynamic QR code generation with embedded amount and merchant parameters for customer scanning via eSewa, Khalti, IME Pay, or mobile banking apps.

5. **Bilingual Support (English & नेपाली)**:
   - One-click language toggle (EN / नेपाली) for all navigation, buttons, forms, tables, and invoice templates without altering underlying database records.

---

## 🏗️ Iron-Store Core Capabilities

- **Measurement & Unit Conversion Engine**:
  - Automatically converts between **Pieces (थान)**, **Bundles (बन्डल)**, **Kg (किलो)**, **Tonnes (टन)**, **Metres (मिटर)**, and **Sheets (पाता)**.
  - Pre-configured standard formulas (e.g., $d^2 / 162$ kg/m for 8mm, 10mm, 12mm, 16mm, 20mm, 25mm, 32mm TMT bars).
- **Cut-Length Sales & Remnants Tracking**:
  - When cutting partial lengths (e.g., 4.5m of a 12m rebar or pipe), the remaining remnant (7.5m) is automatically logged as **Usable Remnant** or **Scrap**.
  - Dedicated **Remnants Manager** allows cashiers to search and sell offcut pieces before cutting full bars.
- **Stock Movement Ledger (Single Source of Truth)**:
  - Inventory on hand is strictly derived from immutable ledger transactions: receipts, sales, returns, cut creations, scrap write-offs, and adjustments.
  - Multi-location tracking: Main Yard (गोदाम १), Cutting Shed (कटिङ सेड), and Retail Store (काउन्टर).
- **Purchasing & Landed Costs (GRN)**:
  - Goods Received Notes (GRN) with ordered vs received quantities, shortages, and damage notes.
  - **Landed Cost Allocation**: Freight (भाडा) and unloading labour costs are automatically allocated into unit inventory valuation cost.
- **Customer Khata & Credit Control**:
  - Running balance ledgers, credit limits, payment terms, and deposit receipt vouchers (जम्मा भौचर).
- **Daily Cash Register (दैनिक नगद बही)**:
  - Morning opening float count, cash sales, customer receipts, petty cash expenses (खाजा, भाडा, मजदुरी), and evening drawer reconciliation with discrepancy tracking.

---

## 👥 User Roles & Access Control (RBAC)

| Role | Default User | Access Privileges |
| :--- | :--- | :--- |
| **Owner / Admin** | `admin` | Full settings, users, prices, margins, approvals, backup export |
| **Cashier** | `cashier` | New sale POS, payments, customer lookup, invoice printing, day cashbook |
| **Storekeeper** | `storekeeper`| Goods receiving (GRN), stock movements, remnants, stock audit counts |
| **Accountant** | `accountant` | Purchases, expenses, customer/supplier ledgers, IRD VAT registers |

---

## 🚀 Getting Started

### 1. Install & Setup
```bash
# Install root backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Seed database with authentic Nepal iron & steel products, suppliers, customers
npm run seed
```

### 2. Start Application
```bash
# Starts both Backend API (Port 5000) and Frontend Vite Server (Port 5173 with proxy)
npm run dev
```

Alternatively, to run the self-contained single-server production build:
```bash
# Builds frontend and runs on Port 5000
npm run build
npm run server
```

Open your browser to:
- Frontend UI: `http://localhost:5173` (Dev) or `http://localhost:5000` (Production)
- API Health Check: `http://localhost:5000/api/health`

### 3. Run Automated Test Suite
```bash
npm test
```

---

## 📁 System Architecture

```
Iron Store/
├── backend/
│   ├── db/
│   │   ├── database.js          # SQLite connection (WAL mode, Foreign Keys)
│   │   └── schema.js            # Tables, IRD defaults, indexes
│   ├── routes/                  # REST APIs (products, inventory, sales, purchases, customers, suppliers, cashbook, reports, cbms, settings)
│   ├── services/
│   │   ├── stockService.js      # Ledger movement engine & unit converter
│   │   ├── invoiceService.js    # IRD Tax Invoice & Credit Note generator
│   │   ├── cbmsService.js       # IRD CBMS API integration & sandbox sync
│   │   └── reportService.js     # VAT Sales Sch 10, Purchase Sch 9, Valuation
│   ├── utils/
│   │   ├── nepaliCalendar.js    # Bidirectional Bikram Sambat converter
│   │   └── nepaliNumberToWords.js # Words converter in NPR (Lakhs/Crores)
│   ├── scripts/
│   │   └── seed.js              # Seed Jagdamba, Panchakanya, Hulas data
│   └── server.js                # Express 5 API server
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Top bar with FY, BS date, drawer status, language toggle, role switcher
│   │   │   ├── Sidebar.tsx      # Main navigation
│   │   │   ├── InvoicePrintModal.tsx # Printable IRD Tax Invoice & Challan
│   │   │   └── DynamicQrModal.tsx    # NEPALPAY / Fonepay QR modal
│   │   ├── context/
│   │   │   ├── LanguageContext.tsx   # Bilingual i18n context (EN / नेपाली)
│   │   │   └── AuthContext.tsx       # RBAC role switcher
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Sales, cash, low stock, remnants overview
│   │   │   ├── NewSale.tsx      # Iron-store POS, unit converter, cut lengths, split pay
│   │   │   ├── Products.tsx     # Catalogue, conversion ratios, cut remnants manager
│   │   │   ├── Purchases.tsx    # GRN, shortages, landed freight allocation
│   │   │   ├── Inventory.tsx    # Warehouse stock, movement ledger, stock audit
│   │   │   ├── Customers.tsx    # Customer Khata, credit limits, deposit receipts
│   │   │   ├── Suppliers.tsx    # Supplier accounts payable & purchase ledgers
│   │   │   ├── Cashbook.tsx     # Day book, drawer reconciliation, petty expenses
│   │   │   ├── Reports.tsx      # IRD VAT Sales/Purchase books, valuation, margins
│   │   │   └── Settings.tsx     # Shop identity, fiscal year, IRD CBMS config, backup
│   │   ├── utils/               # Nepali calendar & currency formatters
│   │   └── types/               # TypeScript interfaces
│   └── tailwind.config.js       # Industrial steel & construction theme
└── test-server.js               # End-to-end integration test suite
```
