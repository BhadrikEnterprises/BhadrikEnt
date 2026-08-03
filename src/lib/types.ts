export type InterestType = 'emi' | 'interest_only' | 'lumpsum';

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
  principal: number;
  interestRate: number; // annual percent
  startDate: string; // ISO
  tenureMonths: number;
  interestType: InterestType;
  purpose: string;
  createdAt: string;
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
