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
  role?: 'client' | 'plumber' | 'crew';
  subscriptionPlan?: 'monthly' | 'yearly';
  monthlyPaid?: boolean;
  paidUntil?: string; // ISO string representing when current monthly subscription expires
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'RESTRICTED' | 'active' | 'inactive';
  restricted?: boolean; // True for crew member accounts
  plumberId?: string; // Unique assigned identification code (e.g., PLM-000001) for plumbers
  isPaid?: boolean; // Mirror field for subscription security rules
  isMaster?: boolean; // True if plumber is a master plumber who can register crew
  masterPlumberId?: string; // If crew member, references their master plumber's user ID
  crewMemberIds?: string[]; // If master plumber, list of up to 5 crew member user IDs
  activeJobId?: string | null; // For the one-active-job constraint
  activeJob?: boolean; // Boolean indicating if plumber has an active job
  bio?: string;
  experienceYears?: number;
  profilePhoto?: string;
  workPhotos?: string[];
  rating?: number;
  reviewsCount?: number;
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
  status: 'OPEN' | 'ACCEPTED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
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
  clientEmail?: string;
  projectName?: string;
  projectDescription?: string;
  additionalAmount?: number;
  additionalAmountDetails?: string;
  paymentMethod?: string;
  isPaid?: boolean;
  isEmergency?: boolean;
  termsAccepted?: boolean;
  pdfUrl?: string;
  responsePeriod?: 'Instant' | '48-hours';
  assignedPlumberId?: string | null;
  
  // Job Photo Management (Phase 2.1)
  bannerPhoto?: string;
  beforePhoto?: string;
  progressPhoto?: string;
  completedPhoto?: string;
  isPrivateProject?: boolean;
  photoPortfolioApproved?: boolean;
  
  // Client Reviews & Surveys (Phase 2.1 Sign-Off)
  reviewRating?: number;
  reviewComment?: string;
  surveyFeedback?: Record<string, string>;
  signedOffAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'plumber';
  text: string;
  timestamp: string;
  read: boolean;
  createdAt?: number;
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
