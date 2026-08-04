export type InterestType =
  | 'emi'
  | 'interest_only'
  | 'lumpsum'
  | 'weekly_reducing'
  | 'weekly_interest_only'
  | 'weekly_upfront_deduction';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  clientId: string;
  loanNumber?: string; // Customizable Loan Identifier (e.g. "1", "LN-101")
  principal: number;
  interestRate: number; // annual percent
  startDate: string; // ISO
  tenureMonths: number; // acts as tenure length (weeks or months depending on interestType)
  interestType: InterestType;
  purpose?: string;
  notes?: string;
  createdAt: string;
  // Optional fields for Upfront Deduction / Weekly Finance
  upfrontDeductionType?: 'percentage' | 'fixed';
  upfrontDeductionValue?: number;
  disbursedAmount?: number;
  lumpsumUnit?: string;
}

export interface Repayment {
  id: string;
  loanId: string;
  date: string; // ISO
  amount: number;
  method: string;
  notes: string;
}

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface Settings {
  currency: Currency;
  lenderName: string;
}

export interface AppData {
  clients: Client[];
  loans: Loan[];
  repayments: Repayment[];
  settings: Settings;
}
