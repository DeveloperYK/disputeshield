import type {
  Analytics,
  Dispute,
  DisputeAnalysis,
  DisputeListResponse,
  Evidence,
  EvidenceGuide,
  RepresentmentLetter,
  Subscription,
  User,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }

  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ access_token: string; token_type: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function register(
  email: string,
  password: string,
  businessName?: string,
) {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      business_name: businessName || null,
    }),
  });
}

export async function getMe() {
  return request<User>("/auth/me");
}

// Disputes
export async function listDisputes() {
  return request<DisputeListResponse>("/disputes");
}

export async function getDispute(id: string) {
  return request<Dispute>(`/disputes/${id}`);
}

export async function analyzeDispute(id: string) {
  return request<DisputeAnalysis>(`/disputes/${id}/analyze`, {
    method: "POST",
  });
}

export async function generateResponse(id: string) {
  return request<RepresentmentLetter>(`/disputes/${id}/generate-response`, {
    method: "POST",
  });
}

export async function skipDispute(id: string) {
  return request<Dispute>(`/disputes/${id}/skip`, {
    method: "POST",
  });
}

export async function submitResponse(id: string) {
  return request<Dispute>(`/disputes/${id}/submit`, {
    method: "POST",
  });
}

// Evidence
export async function listEvidence(disputeId: string) {
  return request<Evidence[]>(`/disputes/${disputeId}/evidence`);
}

export async function addEvidence(
  disputeId: string,
  data: {
    evidence_type: string;
    title: string;
    description?: string;
    content?: string;
  },
) {
  return request<Evidence>(`/disputes/${disputeId}/evidence`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadEvidence(
  disputeId: string,
  data: {
    file: File;
    evidence_type: string;
    title: string;
    description?: string;
  },
): Promise<Evidence> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("evidence_type", data.evidence_type);
  formData.append("title", data.title);
  if (data.description) {
    formData.append("description", data.description);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/disputes/${disputeId}/evidence/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new ApiError(res.status, body.detail || "Upload failed");
  }

  return res.json();
}

export async function getEvidenceGuide(disputeId: string) {
  return request<EvidenceGuide>(`/disputes/${disputeId}/evidence-guide`);
}

export async function pullEvidence(disputeId: string) {
  return request<Evidence[]>(`/disputes/${disputeId}/pull-evidence`, {
    method: "POST",
  });
}

// Analytics
export async function getAnalytics() {
  return request<Analytics>("/analytics");
}

// Stripe Connect
export async function getConnectUrl() {
  return request<{ url: string }>("/stripe/connect-url");
}

export async function connectStripe(code: string) {
  return request<User>("/stripe/connect-callback", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disconnectStripe() {
  return request<User>("/stripe/disconnect", {
    method: "POST",
  });
}

// Billing
export async function getSubscription() {
  return request<Subscription>("/billing/subscription");
}

export async function createCheckout(tier: string) {
  return request<{ checkout_url: string }>("/billing/create-checkout", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}

export async function createPortal() {
  return request<{ portal_url: string }>("/billing/portal", {
    method: "POST",
  });
}

// Dev (test mode only)
export async function seedTestDispute() {
  return request<Dispute>("/dev/seed-dispute", {
    method: "POST",
  });
}

export { ApiError };
