export interface User {
  id: string;
  email: string;
  business_name: string | null;
  stripe_account_id: string | null;
  subscription_tier: string;
  is_active: boolean;
}

export interface Dispute {
  id: string;
  stripe_dispute_id: string;
  amount: number;
  currency: string;
  reason: string;
  reason_code: string | null;
  reason_label: string | null;
  reason_description: string | null;
  network: string | null;
  status: DisputeStatus;
  customer_email: string | null;
  customer_name: string | null;
  win_probability: number | null;
  win_explanation: string | null;
  dispute_created_at: string;
  evidence_due_by: string | null;
  created_at: string;
}

export type DisputeStatus =
  | "needs_response"
  | "under_review"
  | "response_submitted"
  | "won"
  | "lost"
  | "skipped";

export interface DisputeListResponse {
  disputes: Dispute[];
  total: number;
}

export interface DisputeAnalysis {
  win_probability: number;
  explanation: string;
  recommendation: "fight" | "skip" | "borderline";
  key_factors: string[];
  missing_evidence: string[];
}

export interface RepresentmentLetter {
  letter_text: string;
  reason_code: string;
  network: string;
  evidence_types_referenced: string[];
}

export interface Evidence {
  id: string;
  dispute_id: string;
  evidence_type: string;
  source: string;
  title: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  stripe_file_id: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export interface EvidenceGuideItem {
  evidence_type: string;
  label: string;
  description: string;
  where_to_find: string;
  why_it_matters: string;
  priority: "required" | "recommended";
  collected: boolean;
  accepts_file: boolean;
}

export interface EvidenceGuide {
  dispute_id: string;
  reason_code: string | null;
  reason_label: string;
  items: EvidenceGuideItem[];
}

export interface Analytics {
  total_disputes: number;
  total_won: number;
  total_lost: number;
  total_skipped: number;
  win_rate: number;
  total_recovered_cents: number;
  total_lost_cents: number;
  money_saved_by_skipping_cents: number;
  reason_code_breakdown: ReasonCodeBreakdown[];
}

export interface ReasonCodeBreakdown {
  reason_code: string;
  count: number;
  won: number;
  lost: number;
  total_amount_cents: number;
}

export interface Subscription {
  subscription_tier: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
}
