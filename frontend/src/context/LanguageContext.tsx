import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'np';

interface Translations {
  [key: string]: {
    en: string;
    np: string;
  };
}

export const translations: Translations = {
  // Navigation
  dashboard: { en: 'Dashboard', np: 'ड्यासबोर्ड' },
  posBilling: { en: 'New Sale / POS', np: 'नयाँ बिक्री / बिलिङ' },
  products: { en: 'Products & Remnants', np: 'सामग्री र कटिङ टुक्रा' },
  purchases: { en: 'Purchasing & GRN', np: 'खरिद तथा दाखिला' },
  inventory: { en: 'Stock & Warehouses', np: 'स्टक तथा गोदाम' },
  customers: { en: 'Customers & Khata', np: 'ग्राहक तथा उधारो खाता' },
  suppliers: { en: 'Suppliers & Payables', np: 'आपूर्तिकर्ता र भुक्तानी' },
  cashbook: { en: 'Daily Cashbook', np: 'दैनिक नगद बही' },
  reports: { en: 'Reports & IRD Tax', np: 'कर प्रतिवेदन तथा हिसाब' },
  settings: { en: 'Settings & IRD CBMS', np: 'सेटिङ र CBMS' },
  developerConsole: { en: 'Developer Console', np: 'डेभलपर कन्सोल' },

  // POS / Billing
  searchProduct: { en: 'Search rebar, pipe, sheet, nails...', np: 'डण्डी, पाइप, जस्तापाता, किल्ला खोज्नुहोस्...' },
  selectCustomer: { en: 'Select Customer (Khata)', np: 'ग्राहक छनोट गर्नुहोस् (खाता)' },
  walkInCustomer: { en: 'Walk-in Cash Customer', np: 'काउन्टर सामान्य ग्राहक' },
  panVatNo: { en: 'PAN / VAT No', np: 'स्थायी लेखा नं. (प्यान)' },
  creditLimit: { en: 'Credit Limit', np: 'उधारो सीमा' },
  currentBalance: { en: 'Current Balance', np: 'हालको बाँकी' },
  availableCredit: { en: 'Available Credit', np: 'उपलब्ध उधारो' },
  itemCode: { en: 'Code', np: 'कोड' },
  itemName: { en: 'Product Description', np: 'सामग्रीको विवरण' },
  unit: { en: 'Unit', np: 'एकाइ' },
  qty: { en: 'Qty', np: 'परिमाण' },
  rate: { en: 'Rate (NPR)', np: 'दर (रु)' },
  discount: { en: 'Discount', np: 'छुट' },
  taxableAmt: { en: 'Taxable Amount', np: 'करयोग्य रकम' },
  vatAmt: { en: '13% VAT', np: '१३% भ्याट' },
  totalAmt: { en: 'Total Amount', np: 'जम्मा रकम' },
  amountPaid: { en: 'Amount Paid', np: 'भुक्तानी रकम' },
  balanceDue: { en: 'Balance Due', np: 'बाँकी रकम' },
  cutLengthSale: { en: 'Cut-Length Sale', np: 'लम्बाइ काटेर बिक्री' },
  cutLengthMeters: { en: 'Length to Cut (Meters)', np: 'काट्नुपर्ने लम्बाइ (मिटर)' },
  remnantGenerated: { en: 'Remnant Generated', np: 'बाँकी रहने टुक्रा' },
  remnantCondition: { en: 'Remnant Condition', np: 'टुक्राको अवस्था' },
  usableRemnant: { en: 'Usable Stock', np: 'पुन: प्रयोगयोग्य' },
  scrapDiscard: { en: 'Scrap (स्क्रयाप)', np: 'पत्रु / कवाडी' },
  paymentMethod: { en: 'Payment Method', np: 'भुक्तानी विधि' },
  cash: { en: 'Cash', np: 'नगद' },
  bankTransfer: { en: 'Bank Transfer / Cheque', np: 'बैंक दाखिला / चेक' },
  qrPayment: { en: 'Fonepay / NEPALPAY QR', np: 'फोनपे / नेपालपे क्यूआर' },
  creditKhata: { en: 'On Credit (Khata)', np: 'उधारो (खाता)' },
  splitPayment: { en: 'Split Payment', np: 'संयुक्त भुक्तानी' },
  issueInvoice: { en: 'Issue IRD Tax Invoice', np: 'कर विजक जारी गर्नुहोस्' },
  issueChallan: { en: 'Issue Delivery Challan', np: 'चलानी जारी गर्नुहोस्' },

  // Stock & Inventory
  stockOnHand: { en: 'Stock on Hand', np: 'हाल मौज्दात' },
  reorderLevel: { en: 'Reorder Level', np: 'पुन: अर्डर विन्दु' },
  lowStockAlert: { en: 'Low Stock Alert', np: 'न्यून स्टक चेतावनी' },
  movementLedger: { en: 'Stock Movement Ledger', np: 'स्टक चलखेल खाता (लेजर)' },
  singleSourceOfTruth: { en: 'Single Source of Truth', np: 'सत्यको मूल स्रोत' },
  locations: { en: 'Warehouse / Yard Locations', np: 'गोदाम तथा यार्ड स्थान' },

  // Actions
  print: { en: 'Print Invoice', np: 'प्रिन्ट गर्नुहोस्' },
  save: { en: 'Save', np: 'सुरक्षित गर्नुहोस्' },
  cancel: { en: 'Cancel', np: 'रद्द गर्नुहोस्' },
  refresh: { en: 'Refresh', np: 'ताजा गर्नुहोस्' },
  exportCsv: { en: 'Export CSV', np: 'CSV डाउनलोड' },
  add: { en: 'Add New', np: 'नयाँ थप्नुहोस्' },
  status: { en: 'Status', np: 'स्थिति' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
