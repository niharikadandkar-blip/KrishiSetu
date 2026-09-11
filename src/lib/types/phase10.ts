export type ReportCategory =
  | 'NON_PAYMENT'
  | 'NON_DELIVERY'
  | 'QUALITY_MISMATCH'
  | 'FRAUD'
  | 'UNPROFESSIONAL_BEHAVIOR'
  | 'HARASSMENT'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface TransactionReviewItem {
  id: string;
  orderId: string;
  reviewerId: string;
  reviewedUserId: string;
  reviewedProviderId?: string | null;
  rating: number; // 1 to 5
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  reviewerName?: string;
  reviewedUserName?: string;
}

export interface ModerationNoteItem {
  id: string;
  reportId: string;
  reviewerId: string;
  reviewerName?: string;
  note: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  reportedProviderId?: string | null;
  reportedProviderName?: string | null;
  orderId?: string | null;
  offerId?: string | null;
  lotId?: string | null;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  moderationNotes?: ModerationNoteItem[];
}

export interface UserReputationSummary {
  userId: string;
  userName: string;
  userRole: string;
  mobileVerified: boolean;
  profileVerified: boolean;
  verificationBadges: string[];
  completedTransactionCount: number;
  averageRating: number;
  totalReviewCount: number;
  ratingBreakdown: Record<number, number>;
}

export interface ReviewEligibilityResult {
  eligible: boolean;
  reason?: string;
  orderId?: string;
  reviewedUserId?: string;
  reviewedProviderId?: string | null;
}
