export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  isPretoriaGauteng: boolean; // True if city is Pretoria and province is Gauteng
  role?: 'client' | 'plumber';
  subscriptionPlan?: 'monthly' | 'yearly';
  subscriptionStatus?: 'active' | 'inactive';
}

export interface JobCategory {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  iconName: string; // Name of Lucide icon
  typicalIssues: string[];
}

export interface CalloutRequest {
  id: string;
  userId: string;
  jobCategoryId: string;
  issueDescription: string;
  status: 'Pending Dispatch' | 'En Route' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  baseFee: number; // R1000 standard
  surcharge: number; // R3000 for non-Pretoria/Gauteng
  totalAmount: number; // baseFee + surcharge
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientProvince: string;
  additionalAmount?: number;
  additionalAmountDetails?: string;
  paymentMethod?: string;
  isPaid?: boolean;
}

export interface Invoice {
  id: string;
  calloutId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  jobTitle: string;
  baseFee: number;
  surcharge: number;
  totalAmount: number;
  status: 'Paid' | 'Unpaid';
  paymentMethod?: string;
}
