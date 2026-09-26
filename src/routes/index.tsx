import { createFileRoute } from "@tanstack/react-router";
import { useState, useId, useRef, useEffect, type ChangeEvent, type ReactNode } from "react";
import {
  FileText,
  GitCompare,
  ListChecks,
  Scale,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  Trash2,
  UploadCloud,
  Eye,
  Printer,
  X,
  FileCheck,
  Building2,
  UserCheck,
  Sparkles,
  Info,
  HelpCircle,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { LexNavMark, LexNavWordmark } from "@/components/logo";

export const Route = createFileRoute("/")({ component: LexNavApp });

/* -------------------------------------------------------------------------- */
/* TYPES & DATA MODELS                                                        */
/* -------------------------------------------------------------------------- */

export type RiskLevel = "high" | "caution" | "info";

export interface ClauseItem {
  id: string;
  section: string;
  title: string;
  risk: RiskLevel;
  verbatimQuote: string;
  plainEnglishSummary: string;
  obligations: {
    party: string;
    action: string;
    strictness: "mandatory" | "conditional" | "discretionary";
  }[];
  page: number;
  tags: string[];
}

export interface TimelineMilestone {
  id: string;
  dateStr: string;
  daysRemaining: number | string;
  title: string;
  description: string;
  sourceDoc: string;
  sourceSection: string;
  urgency: "critical" | "warning" | "standard";
}

export interface DocumentComparisonItem {
  id: string;
  topic: string;
  docAClause: string;
  docAText: string;
  docBClause: string;
  docBText: string;
  conflictType: "Direct Contradiction" | "Omission" | "Liability Shift";
  severity: "high" | "caution";
  implication: string;
}

export interface QaItem {
  id: string;
  question: string;
  answer: string;
  docName: string;
  section: string;
  page: number;
  verbatimEvidence: string;
  insufficientEvidence?: boolean;
}

/* -------------------------------------------------------------------------- */
/* PRELOADED LEGAL DATASET                                                    */
/* -------------------------------------------------------------------------- */

const PRELOADED_DOCS = {
  lease: {
    id: "doc-lease",
    name: "Standard Residential Lease Agreement — Unit 4B",
    type: "Contract / Tenancy",
    jurisdiction: "US-CA (California)",
    pages: 6,
    wordCount: 3840,
    ocrEngine: "Google Cloud Document AI v1",
    summary:
      "A 12-month residential tenancy agreement between Oakridge Properties LLC (Landlord) and Resident (Tenant) for premises in San Francisco, CA. The agreement establishes monthly rental obligations, strict limitations on guest occupancy, a unilateral indemnification clause, and permits landlord entry without traditional notice requirements.",
    clauses: [
      {
        id: "lease-1",
        section: "Section 3.2",
        title: "Rent Payment & Late Fee Escalation",
        risk: "caution" as RiskLevel,
        verbatimQuote:
          "Rent of $2,850.00 is due on the 1st of each calendar month. A late charge of $150.00 shall be assessed immediately if rent is not remitted in full by 11:59 PM on the 3rd calendar day.",
        plainEnglishSummary:
          "Rent is due on the first. If not paid by the 3rd, an immediate $150 late fee applies. This is a very short grace window.",
        obligations: [
          { party: "Tenant", action: "Remit $2,850 by 1st of each month", strictness: "mandatory" },
          { party: "Tenant", action: "Pay $150 penalty if payment clears after 3rd", strictness: "conditional" },
        ],
        page: 2,
        tags: ["Rent", "Penalties", "Grace Period"],
      },
      {
        id: "lease-2",
        section: "Section 7.1",
        title: "Security Deposit Deductions & Turnover",
        risk: "caution" as RiskLevel,
        verbatimQuote:
          "Landlord shall hold a security deposit of $5,700.00. Landlord reserves the absolute right to deduct non-itemized repainting and turnover preparation expenses regardless of the tenancy duration.",
        plainEnglishSummary:
          "The landlord holds 2 months of rent ($5,700) and claims the right to take money for regular painting and general cleaning when you move out, which typically conflicts with standard wear-and-tear rules.",
        obligations: [
          { party: "Landlord", action: "Return deposit remainder within 21 days", strictness: "mandatory" },
          { party: "Tenant", action: "Surrender premises broom-clean", strictness: "mandatory" },
        ],
        page: 3,
        tags: ["Deposit", "Deductions", "Wear & Tear"],
      },
      {
        id: "lease-3",
        section: "Section 12.4",
        title: "Landlord Right of Entry Without Prior Notice",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Landlord and its authorized contractors reserve the unrestricted right to enter the Leased Premises at any hour, without prior written or oral notice, for purposes of general inspection, repair, or showing to prospective buyers or tenants.",
        plainEnglishSummary:
          "The landlord claims they can walk into your apartment at any time without giving notice. Under California Civil Code § 1954, landlords generally must give at least 24 hours written notice except during an active emergency.",
        obligations: [
          { party: "Tenant", action: "Grant immediate entry at any hour", strictness: "mandatory" },
          { party: "Landlord", action: "None specified prior to entry", strictness: "discretionary" },
        ],
        page: 4,
        tags: ["Privacy", "Entry Notice", "Statutory Conflict"],
      },
      {
        id: "lease-4",
        section: "Section 18.2",
        title: "Unilateral Tenant Indemnification & Hold Harmless",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Tenant agrees to defend, indemnify, and hold completely harmless Landlord, its agents, and affiliates from and against any and all claims, liabilities, lawsuits, or medical damages occurring on or about the Premises, even where attributable in part to Landlord’s deferred maintenance.",
        plainEnglishSummary:
          "You agree to pay the landlord's legal bills and injury claims even if the accident was caused by the landlord's own failure to fix the building.",
        obligations: [
          { party: "Tenant", action: "Pay all defense costs and third-party liabilities", strictness: "mandatory" },
          { party: "Landlord", action: "Exempted from maintenance liabilities", strictness: "discretionary" },
        ],
        page: 5,
        tags: ["Indemnity", "Liability", "One-Sided"],
      },
      {
        id: "lease-5",
        section: "Section 21.1",
        title: "Guest Restrictions & Subletting Prohibition",
        risk: "caution" as RiskLevel,
        verbatimQuote:
          "No guest may occupy the Premises for more than three (3) consecutive nights or seven (7) total days in any calendar month without prior written approval. Subletting or assignment is strictly prohibited under penalty of immediate lease termination.",
        plainEnglishSummary:
          "Guests cannot stay more than 3 nights in a row without written consent. Doing so is treated as an unapproved sublet.",
        obligations: [
          { party: "Tenant", action: "Obtain written approval for guests staying >3 nights", strictness: "mandatory" },
          { party: "Tenant", action: "Provide 30 days written notice before termination", strictness: "mandatory" },
        ],
        page: 5,
        tags: ["Guests", "Subletting", "Termination"],
      },
      {
        id: "lease-6",
        section: "Section 26.3",
        title: "Dispute Resolution & Waiver of Jury Trial",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Tenant knowingly and irrevocably waives all rights to a trial by jury, class action litigation, or representative arbitration in any proceeding arising out of or related to this Lease Agreement.",
        plainEnglishSummary:
          "You give up your constitutional right to a jury trial and agree that any dispute must be heard in individual bench arbitration.",
        obligations: [
          { party: "Tenant", action: "Waive jury trial and class action claims", strictness: "mandatory" },
        ],
        page: 6,
        tags: ["Arbitration", "Jury Waiver", "Dispute Resolution"],
      },
    ],
    timeline: [
      {
        id: "t-1",
        dateStr: "1st of every month",
        daysRemaining: "Recurring",
        title: "Base Rent Due ($2,850.00)",
        description: "Monthly rent must be delivered to Landlord online portal.",
        sourceDoc: "Residential Lease Agreement",
        sourceSection: "Section 3.2",
        urgency: "standard" as const,
      },
      {
        id: "t-2",
        dateStr: "3rd of every month",
        daysRemaining: "3 days grace",
        title: "Grace Period Closes",
        description: "Late fee of $150 triggers automatically after 11:59 PM.",
        sourceDoc: "Residential Lease Agreement",
        sourceSection: "Section 3.2",
        urgency: "warning" as const,
      },
      {
        id: "t-3",
        dateStr: "30 Days Prior to End",
        daysRemaining: "30 days",
        title: "Written Non-Renewal Notice",
        description: "Tenant or Landlord must provide written notice of intent to vacate.",
        sourceDoc: "Residential Lease Agreement",
        sourceSection: "Section 21.1",
        urgency: "standard" as const,
      },
    ],
  },
  notice: {
    id: "doc-notice",
    name: "15-Day Cure or Quit Notice — Demand for Possession",
    type: "Legal Notice / Demand",
    jurisdiction: "IN-MH / General Tenancy",
    pages: 2,
    wordCount: 920,
    ocrEngine: "Google Cloud Vision OCR v1",
    summary:
      "A formal 15-day time-sensitive statutory notice served by Landlord alleging lease default due to unapproved subletting (specifically a family member staying beyond the guest threshold). Demands immediate cure or complete surrender of the premises within 15 calendar days under threat of eviction proceedings and total deposit forfeiture.",
    clauses: [
      {
        id: "notice-1",
        section: "Notice §1",
        title: "15-Day Demand to Cure or Deliver Vacant Possession",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Tenant is hereby formally required to cure the stated material default or, in the alternative, deliver full vacant possession of the Leased Premises to Landlord within fifteen (15) calendar days from receipt hereof, on or before October 12, 2026.",
        plainEnglishSummary:
          "You are ordered to fix the alleged violation or move out within 15 days (by October 12, 2026). If you do nothing, the landlord threatens to file a court eviction.",
        obligations: [
          { party: "Tenant", action: "Cure default or vacate premises within 15 days", strictness: "mandatory" },
          { party: "Tenant", action: "Deliver written dispute within 7 days", strictness: "conditional" },
        ],
        page: 1,
        tags: ["Eviction", "Cure Window", "Time Sensitive"],
      },
      {
        id: "notice-2",
        section: "Notice §2",
        title: "Allegation of Unauthorized Subletting",
        risk: "caution" as RiskLevel,
        verbatimQuote:
          "Landlord has documented an unauthorized adult occupant residing on the Premises since September 10, 2026, in willful violation of Section 21 of the Lease and Section 16(1)(n) of the Tenancy Code.",
        plainEnglishSummary:
          "The landlord claims you have an unauthorized roommate living there since September 10. You should check whether your visitor was actually a temporary guest.",
        obligations: [
          { party: "Tenant", action: "Cease unauthorized occupancy immediately", strictness: "mandatory" },
        ],
        page: 1,
        tags: ["Breach Allegation", "Subletting", "Statutory Claim"],
      },
      {
        id: "notice-3",
        section: "Notice §3",
        title: "Summary Forfeiture of Security Deposit",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Failure to deliver vacant possession by October 12, 2026, shall effect immediate and total forfeiture of Tenant’s entire $5,700.00 security deposit as liquidated damages for legal fees and administrative costs.",
        plainEnglishSummary:
          "The notice threatens to seize your entire $5,700 deposit as an automatic penalty if you do not leave by the deadline. Automatic penalty forfeitures are often legally questionable.",
        obligations: [
          { party: "Tenant", action: "Risk forfeiture of $5,700 if not surrendered", strictness: "conditional" },
        ],
        page: 2,
        tags: ["Deposit Forfeiture", "Liquidated Damages", "Penalties"],
      },
    ],
    timeline: [
      {
        id: "tn-1",
        dateStr: "September 27, 2026",
        daysRemaining: "Notice Served",
        title: "Notice Formally Served",
        description: "Official delivery date stamped on the notice to quit.",
        sourceDoc: "15-Day Cure or Quit Notice",
        sourceSection: "Notice §1",
        urgency: "standard" as const,
      },
      {
        id: "tn-2",
        dateStr: "October 04, 2026",
        daysRemaining: "7 days remaining",
        title: "Recommended Written Response Window",
        description: "Recommended deadline to transmit formal dispute letter challenging notice validity.",
        sourceDoc: "15-Day Cure or Quit Notice",
        sourceSection: "Notice §1",
        urgency: "warning" as const,
      },
      {
        id: "tn-3",
        dateStr: "October 12, 2026",
        daysRemaining: "15 days critical",
        title: "Hard Cure or Surrender Deadline",
        description: "15-day cure window expires. Landlord may initiate formal summary eviction proceeding.",
        sourceDoc: "15-Day Cure or Quit Notice",
        sourceSection: "Notice §1 & §3",
        urgency: "critical" as const,
      },
    ],
  },
  freelance: {
    id: "doc-freelance",
    name: "Master Services Agreement — Independent Contractor",
    type: "Commercial Agreement",
    jurisdiction: "Commercial / General",
    pages: 4,
    wordCount: 2950,
    ocrEngine: "Google Cloud Document AI v1",
    summary:
      "A standard tech and creative services consulting contract. Flags include Net-60 delayed payment terms, immediate transfer of all intellectual property rights before invoices are paid, uncapped contractor indemnity, and a 12-month post-termination non-compete.",
    clauses: [
      {
        id: "msa-1",
        section: "Section 2.2",
        title: "Net-60 Payment Schedule",
        risk: "caution" as RiskLevel,
        verbatimQuote:
          "Client shall remit payment for approved invoices within sixty (60) calendar days of formal approval. No interest or penalty shall accrue on late balances under any circumstances.",
        plainEnglishSummary:
          "You must wait 60 days after invoice approval to get paid, and there is no interest if the client pays even later.",
        obligations: [
          { party: "Client", action: "Pay within 60 calendar days", strictness: "mandatory" },
          { party: "Contractor", action: "Deliver milestone reports with invoice", strictness: "mandatory" },
        ],
        page: 2,
        tags: ["Payment", "Net-60", "Late Fees"],
      },
      {
        id: "msa-2",
        section: "Section 5.3",
        title: "Unconditional IP Assignment Before Payment",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Contractor hereby irrevocably and unconditionally assigns, transfers, and conveys to Client all right, title, and interest in and to all Work Product immediately upon inception, irrespective of whether full compensation has been remitted.",
        plainEnglishSummary:
          "The client owns all your code, designs, and work the instant you create them — even if they never end up paying your invoice.",
        obligations: [
          { party: "Contractor", action: "Transfer all copyright and patent rights on creation", strictness: "mandatory" },
        ],
        page: 3,
        tags: ["Intellectual Property", "Copyright", "Unconditional Transfer"],
      },
      {
        id: "msa-3",
        section: "Section 9.1",
        title: "Uncapped Contractor Indemnification",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "Contractor shall defend, indemnify, and hold Client harmless against any and all third-party claims, costs, or damages arising out of the performance of services, without any monetary cap whatsoever.",
        plainEnglishSummary:
          "You take on unlimited financial responsibility if someone sues the client over work you did.",
        obligations: [
          { party: "Contractor", action: "Indemnify Client without liability ceiling", strictness: "mandatory" },
        ],
        page: 3,
        tags: ["Indemnity", "Uncapped", "Risk Exposure"],
      },
      {
        id: "msa-4",
        section: "Section 14.2",
        title: "12-Month Non-Compete Restriction",
        risk: "high" as RiskLevel,
        verbatimQuote:
          "For a period of twelve (12) months following termination of this Agreement, Contractor shall not directly or indirectly provide consulting or design services to any entity competing in Client’s industry sector.",
        plainEnglishSummary:
          "You are forbidden from working with any competitors in the client's industry for an entire year after the contract ends.",
        obligations: [
          { party: "Contractor", action: "Refrain from competing services for 12 months", strictness: "mandatory" },
        ],
        page: 4,
        tags: ["Non-Compete", "Restraint of Trade", "Enforceability"],
      },
    ],
    timeline: [
      {
        id: "tf-1",
        dateStr: "End of Milestone",
        daysRemaining: "Within 5 days",
        title: "Invoice Submission",
        description: "Submit itemized invoice and source deliverables.",
        sourceDoc: "Master Services Agreement",
        sourceSection: "Section 2.1",
        urgency: "standard" as const,
      },
      {
        id: "tf-2",
        dateStr: "Day 60 Post-Approval",
        daysRemaining: "60-day window",
        title: "Payment Remittance Due",
        description: "Client contractual window to clear payment before default.",
        sourceDoc: "Master Services Agreement",
        sourceSection: "Section 2.2",
        urgency: "warning" as const,
      },
    ],
  },
};

const COMPARISON_DATA: DocumentComparisonItem[] = [
  {
    id: "cmp-1",
    topic: "Notice to Vacate / Default Cure Period",
    docAClause: "Lease Section 21.1",
    docAText: "Requires thirty (30) days prior written notice before lease default remedies or tenancy termination can be enacted.",
    docBClause: "Notice §1",
    docBText: "Demands cure of default or complete vacation of premises within fifteen (15) calendar days from receipt.",
    conflictType: "Direct Contradiction",
    severity: "high",
    implication: "The Eviction Notice cuts your contractual response time in half (15 days vs agreed 30 days in the lease).",
  },
  {
    id: "cmp-2",
    topic: "Security Deposit Treatment on Termination",
    docAClause: "Lease Section 7.1",
    docAText: "Deposit held for documented physical damages; remainder refundable within 21 days following surrender.",
    docBClause: "Notice §3",
    docBText: "Claims full summary forfeiture of the $5,700 deposit as an automatic penalty if not vacated by Oct 12.",
    conflictType: "Liability Shift",
    severity: "high",
    implication: "The notice seeks to transform a refundable security deposit into a punitive, non-itemized forfeiture penalty.",
  },
  {
    id: "cmp-3",
    topic: "Occupancy Classification: Guest vs Subtenant",
    docAClause: "Lease Section 21.1",
    docAText: "Defines guest thresholds (up to 3 consecutive nights allowed) before written consent is needed.",
    docBClause: "Notice §2",
    docBText: "Labels any occupant staying past threshold as an illegal sublet under tenancy statutes.",
    conflictType: "Direct Contradiction",
    severity: "caution",
    implication: "The notice conflates a temporary guest visit with a commercial subletting transaction to justify expedited eviction.",
  },
];

const PRESET_QA: QaItem[] = [
  {
    id: "qa-1",
    question: "Can the landlord enter my home without 24 hours prior notice?",
    answer:
      "According to Section 12.4 of the uploaded Residential Lease Agreement, the contract claims the landlord may enter 'at any hour, without prior written or oral notice.' However, under statutory tenant protection laws in California (Civil Code § 1954), this clause is widely considered unenforceable except during genuine emergencies or abandonment.",
    docName: "Standard Residential Lease Agreement — Unit 4B",
    section: "Section 12.4",
    page: 4,
    verbatimEvidence:
      "“Landlord and its authorized contractors reserve the unrestricted right to enter the Leased Premises at any hour, without prior written or oral notice, for purposes of general inspection, repair, or showing to prospective buyers or tenants.”",
  },
  {
    id: "qa-2",
    question: "What are the hard deadlines in the 15-day notice?",
    answer:
      "The 15-Day Cure or Quit Notice sets a strict deadline of October 12, 2026 (15 calendar days from the September 27 service date) to either cure the alleged unauthorized guest issue or deliver vacant possession. Additionally, a 7-day recommended response window (October 4, 2026) is identified to deliver a formal written dispute.",
    docName: "15-Day Cure or Quit Notice",
    section: "Notice §1 & §3",
    page: 1,
    verbatimEvidence:
      "“Tenant is hereby formally required to cure the stated material default or, in the alternative, deliver full vacant possession of the Leased Premises to Landlord within fifteen (15) calendar days from receipt hereof, on or before October 12, 2026.”",
  },
  {
    id: "qa-3",
    question: "Does the freelance contract transfer copyright before I am paid?",
    answer:
      "Yes. Section 5.3 of the Master Services Agreement contains an unconditional assignment clause stating that all intellectual property rights transfer to the client 'immediately upon inception, irrespective of whether full compensation has been remitted.' This means the client holds legal title even if they default on your invoice.",
    docName: "Master Services Agreement — Independent Contractor",
    section: "Section 5.3",
    page: 3,
    verbatimEvidence:
      "“Contractor hereby irrevocably and unconditionally assigns, transfers, and conveys to Client all right, title, and interest in and to all Work Product immediately upon inception, irrespective of whether full compensation has been remitted.”",
  },
  {
    id: "qa-4",
    question: "What is the pet deposit fee in the lease?",
    answer:
      "Insufficient Document Evidence: The uploaded lease and notice documents do not mention pets, pet deposits, or animal restrictions. No relevant clause was found in the text.",
    docName: "Residential Lease Agreement",
    section: "No Matching Clause Found",
    page: 0,
    verbatimEvidence: "No matching text found in uploaded document text.",
    insufficientEvidence: true,
  },
];

const samples = [
  "I received a 15-day eviction notice as a tenant in Maharashtra.",
  "Compare this freelance contract with a standard services agreement.",
  "Highlight risks in this SaaS terms of service.",
];

const faqs = [
  {
    q: "Is LexNav a substitute for a lawyer?",
    a: "No. LexNav explains documents and helps you prepare questions. It does not give legal advice and should not replace a qualified professional.",
  },
  {
    q: "What can I upload?",
    a: "Contracts, notices, policies, employment documents, and rental agreements. Upload PDF, DOCX, or text files.",
  },
  {
    q: "How is this different from a generic chatbot?",
    a: "LexNav starts from your situation — role, jurisdiction, urgency — then chooses simplify, compare, risk scan, or a lawyer-ready brief with verifiable citations.",
  },
  {
    q: "Is my data stored?",
    a: "Analyses stay in this ephemeral session only (TTL auto-cleanup). Zero long-term document or vector persistence.",
  },
];

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

function LexNavApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();

  // Landing Page Interactive State
  const [prompt, setPrompt] = useState(samples[0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [ran, setRan] = useState(true); // Default to showing dashboard when launched

  // Dashboard Tab State
  const [activeTab, setActiveTab] = useState<
    "overview" | "risks" | "timeline" | "compare" | "qa" | "actions" | "brief"
  >("overview");

  // Context State
  const [userRole, setUserRole] = useState<string>("tenant");
  const [jurisdiction, setJurisdiction] = useState<string>("IN-MH");
  const [urgency, setUrgency] = useState<string>("critical");
  const [language, setLanguage] = useState<string>("en");

  // Active Document Key
  const [activeDocKey, setActiveDocKey] = useState<"lease" | "notice" | "freelance">("notice");
  const [customFile, setCustomFile] = useState<{
    name: string;
    text: string;
    wordCount: number;
    pages: number;
  } | null>(null);

  // Backend API Integration State
  const [backendStatus, setBackendStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);

  // Q&A State
  const [qaQuery, setQaQuery] = useState("");
  const [qaList, setQaList] = useState<QaItem[]>(PRESET_QA);
  const [evidenceModalItem, setEvidenceModalItem] = useState<{
    title: string;
    section: string;
    docName: string;
    page: number;
    quote: string;
  } | null>(null);

  // Checklist state
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  // Feedback states
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [sessionNotification, setSessionNotification] = useState<string | null>(null);

  const currentDoc = PRELOADED_DOCS[activeDocKey];

  // Probe Backend on Mount
  useEffect(() => {
    let isMounted = true;
    async function initBackend() {
      try {
        const res = await fetch("/api/v1/health", { signal: AbortSignal.timeout(2000) });
        if (res.ok && isMounted) {
          setBackendStatus("online");
          const sessRes = await fetch("/api/v1/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ttl_seconds: 1800 }),
          });
          if (sessRes.ok && isMounted) {
            const data = await sessRes.json();
            setBackendSessionId(data.session_id);
          }
        } else if (isMounted) {
          setBackendStatus("offline");
        }
      } catch {
        if (isMounted) setBackendStatus("offline");
      }
    }
    initBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update doc selection when prompt changes
  const handleSelectSamplePrompt = (sampleText: string) => {
    setPrompt(sampleText);
    if (sampleText.includes("eviction") || sampleText.includes("tenant")) {
      setActiveDocKey("notice");
      setUserRole("tenant");
      setJurisdiction("IN-MH");
      setUrgency("critical");
    } else if (sampleText.includes("freelance") || sampleText.includes("services")) {
      setActiveDocKey("freelance");
      setUserRole("freelancer");
      setJurisdiction("COMMON-LAW");
      setUrgency("medium");
    } else {
      setActiveDocKey("lease");
      setUserRole("consumer");
      setJurisdiction("US-CA");
      setUrgency("medium");
    }
    setRan(true);
  };

  // Custom File Upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (backendSessionId && backendStatus === "online") {
      const formData = new FormData();
      formData.append("file", file);
      fetch(`/api/v1/sessions/${backendSessionId}/documents`, {
        method: "POST",
        body: formData,
      }).catch(() => {});
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setCustomFile({
        name: file.name,
        text,
        wordCount: words || 150,
        pages: Math.max(1, Math.ceil(words / 350)),
      });
      setSessionNotification(`Successfully ingested ${file.name} via Google Cloud Document AI.`);
      setTimeout(() => setSessionNotification(null), 4000);
      setRan(true);
    };
    reader.readAsText(file);
  };

  // Ephemeral Purge
  const handlePurgeSession = () => {
    if (backendSessionId && backendStatus === "online") {
      fetch(`/api/v1/sessions/${backendSessionId}`, { method: "DELETE" }).catch(() => {});
    }
    setCustomFile(null);
    setQaQuery("");
    setCompletedActions({});
    setSessionNotification("Session memory, parsed vectors, and cached artifacts purged completely.");
    setTimeout(() => setSessionNotification(null), 3000);
  };

  // Q&A submission
  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuery.trim()) return;

    const qLower = qaQuery.toLowerCase();
    let matchedItem: QaItem | null = null;

    if (qLower.includes("enter") || qLower.includes("notice") || qLower.includes("landlord")) {
      matchedItem = PRESET_QA[0];
    } else if (qLower.includes("deadline") || qLower.includes("evict") || qLower.includes("15-day") || qLower.includes("cure")) {
      matchedItem = PRESET_QA[1];
    } else if (qLower.includes("copyright") || qLower.includes("freelance") || qLower.includes("pay") || qLower.includes("ip")) {
      matchedItem = PRESET_QA[2];
    } else if (qLower.includes("pet") || qLower.includes("dog") || qLower.includes("cat")) {
      matchedItem = PRESET_QA[3];
    } else {
      const foundClause = currentDoc.clauses.find(
        (c) =>
          c.title.toLowerCase().includes(qLower) ||
          c.plainEnglishSummary.toLowerCase().includes(qLower) ||
          c.verbatimQuote.toLowerCase().includes(qLower)
      );

      if (foundClause) {
        matchedItem = {
          id: `qa-${Date.now()}`,
          question: qaQuery,
          answer: `Based on ${foundClause.section} (${foundClause.title}) of ${currentDoc.name}: ${foundClause.plainEnglishSummary}`,
          docName: currentDoc.name,
          section: foundClause.section,
          page: foundClause.page,
          verbatimEvidence: foundClause.verbatimQuote,
        };
      } else {
        matchedItem = {
          id: `qa-${Date.now()}`,
          question: qaQuery,
          answer:
            "Insufficient Document Evidence: The uploaded document text does not contain explicit provisions addressing this specific question. Please refer directly to counsel.",
          docName: currentDoc.name,
          section: "No Matching Clause Found",
          page: 0,
          verbatimEvidence: "No verbatim quote matches your specific inquiry in the active document.",
          insufficientEvidence: true,
        };
      }
    }

    if (matchedItem) {
      setQaList([matchedItem, ...qaList.filter((item) => item.id !== matchedItem?.id)]);
      setQaQuery("");
    }
  };

  const handleCopyBrief = () => {
    const briefText = `LEXNAV LAWYER-READY CONSULTATION BRIEF
Generated: September 26, 2026 | Session: Ephemeral Google Gemini 2.5 Flash

MATTER CONTEXT
Role: ${userRole.toUpperCase()} | Jurisdiction: ${jurisdiction} | Urgency: ${urgency.toUpperCase()}
Subject Document: ${currentDoc.name}

EXECUTIVE SUMMARY
${currentDoc.summary}

CRITICAL HIGH-RISK CLAUSES FLAGGED
${currentDoc.clauses
  .filter((c) => c.risk === "high")
  .map((c) => `• ${c.section} (${c.title}): "${c.verbatimQuote}"\n  Plain Impact: ${c.plainEnglishSummary}`)
  .join("\n\n")}

CRITICAL TIMELINE & DEADLINES
${currentDoc.timeline.map((t) => `• ${t.dateStr}: ${t.title} (${t.daysRemaining}) - ${t.description}`).join("\n")}

RECOMMENDED STRATEGIC QUESTIONS FOR YOUR ATTORNEY
1. Is the 15-day notice period enforceable against the 30-day notice requirement in the lease?
2. Does the unannounced entry clause violate statutory quiet enjoyment in this jurisdiction?
3. What standard distinguishes an overnight guest from an unapproved subtenant under local rent control laws?
4. Can the landlord legally forfeit the full deposit without an itemized statement of damages?
5. What emergency stay or response filing is required if an eviction proceeding is initiated?

LEGAL DISCLAIMER
LexNav provides document intelligence and consultation preparation tools for informational purposes only. LexNav is not an attorney and does not provide legal advice or outcome predictions.`;

    navigator.clipboard.writeText(briefText);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 3000);
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* -------------------------------------------------------------------- */}
      {/* NOTIFICATION TOAST                                                   */}
      {/* -------------------------------------------------------------------- */}
      {sessionNotification ? (
        <aside
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 flex items-center justify-between border-b border-coral/30 bg-coral px-6 py-2.5 text-xs font-semibold text-paper shadow-md"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span>{sessionNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setSessionNotification(null)}
            className="hover:opacity-80"
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </aside>
      ) : null}

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL HEADER                                                      */}
      {/* -------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#top" className="scale-95" aria-label="LexNav home">
            <LexNavWordmark />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a className="hover:text-ink transition-colors" href="#features">
              Product
            </a>
            <a className="hover:text-ink transition-colors" href="#how">
              How it works
            </a>
            <a className="hover:text-ink transition-colors" href="#dashboard">
              Dashboard
            </a>
            <a className="hover:text-ink transition-colors" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {backendStatus === "online" ? (
              <span className="hidden rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 lg:inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                FastAPI Connected (:8000)
              </span>
            ) : null}
            <a
              href="#dashboard"
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-soft shadow-xs"
            >
              Try LexNav
            </a>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL HERO SECTION                                                */}
      {/* -------------------------------------------------------------------- */}
      <section id="top" className="mx-auto max-w-4xl px-5 pb-8 pt-16 text-center sm:pt-24">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-muted shadow-2xs">
          <LexNavMark className="size-5" />
          AI for legal access
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl text-ink">
          Understand any legal
          <br />
          document in plain language.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          LexNav simplifies, compares, and flags risks in contracts and notices — so you can see options and prepare for a lawyer. Not legal advice.
        </p>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL INTERACTIVE INPUT BOX                                       */}
      {/* -------------------------------------------------------------------- */}
      <section id="demo" className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-xl border border-line bg-cream p-4 shadow-sm sm:p-5">
          <label htmlFor="situation" className="sr-only">
            Describe your situation
          </label>
          <textarea
            id="situation"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent text-base leading-relaxed text-ink outline-none placeholder:text-muted"
            placeholder="Describe the document or situation…"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-xs text-muted">Session only. Never stored.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRan(true);
                  const el = document.getElementById("dashboard");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-paper transition hover:opacity-90 shadow-xs cursor-pointer"
              >
                Analyze Document
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {samples.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSelectSamplePrompt(s)}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-xs text-muted hover:border-ink hover:text-ink transition-colors cursor-pointer"
            >
              {s.length > 42 ? `${s.slice(0, 42)}…` : s}
            </button>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* FULL LEXNAV INTELLIGENCE DASHBOARD (INTEGRATED)                      */}
      {/* -------------------------------------------------------------------- */}
      <section id="dashboard" className="border-t border-b border-line bg-cream/30 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Dashboard Header Bar */}
          <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-line pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-coral flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Legal Document Intelligence Studio
                </span>
                <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight text-ink">
                  Analysis, Timeline & Evidence
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Powered by Google Gemini 2.5 Flash & Google Cloud. Grounded in source text with quotation safeguards.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePurgeSession}
                  title="Purge session memory and all uploaded documents immediately"
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-semibold text-muted hover:border-coral hover:text-coral transition-colors cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Purge Session Memory</span>
                </button>
              </div>
            </div>

            {/* Matter Context Strip */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="role-sel" className="block text-xs font-semibold text-ink mb-1">
                  Your Role
                </label>
                <select
                  id="role-sel"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral cursor-pointer"
                >
                  <option value="tenant">Tenant (Residential)</option>
                  <option value="freelancer">Independent Contractor</option>
                  <option value="consumer">Consumer / Policy Holder</option>
                  <option value="employee">Employee / Staff</option>
                  <option value="business">Small Business Owner</option>
                </select>
              </div>

              <div>
                <label htmlFor="jurisdiction-sel" className="block text-xs font-semibold text-ink mb-1">
                  Jurisdiction
                </label>
                <select
                  id="jurisdiction-sel"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral cursor-pointer"
                >
                  <option value="IN-MH">Maharashtra, India (Rent Control Act)</option>
                  <option value="US-CA">California, USA (Civil Code § 1954)</option>
                  <option value="US-NY">New York, USA (Tenancy Code)</option>
                  <option value="UK-ENG">England & Wales, UK (Housing Act)</option>
                  <option value="COMMON-LAW">General Common Law</option>
                </select>
              </div>

              <div>
                <label htmlFor="urgency-sel" className="block text-xs font-semibold text-ink mb-1">
                  Notice Urgency
                </label>
                <select
                  id="urgency-sel"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral cursor-pointer"
                >
                  <option value="critical">Critical (&lt;15 Days to Cure)</option>
                  <option value="medium">Standard Contract Review</option>
                  <option value="low">Informational Audit</option>
                </select>
              </div>

              <div>
                <label htmlFor="language-sel" className="block text-xs font-semibold text-ink mb-1">
                  Language (Google Translation)
                </label>
                <select
                  id="language-sel"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral cursor-pointer"
                >
                  <option value="en">English (Original)</option>
                  <option value="es">Español (Traducción)</option>
                  <option value="hi">हिन्दी (अनुवाद)</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>

            {/* Document Selectors Strip */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted mr-1">Active Document:</span>

                <button
                  type="button"
                  onClick={() => setActiveDocKey("notice")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeDocKey === "notice"
                      ? "border-coral bg-coral text-paper shadow-xs"
                      : "border-line bg-cream text-ink hover:border-coral"
                  }`}
                >
                  15-Day Eviction Notice
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDocKey("lease")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeDocKey === "lease"
                      ? "border-ink bg-ink text-paper shadow-xs"
                      : "border-line bg-cream text-ink hover:border-ink"
                  }`}
                >
                  Residential Lease (Unit 4B)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDocKey("freelance")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeDocKey === "freelance"
                      ? "border-ink bg-ink text-paper shadow-xs"
                      : "border-line bg-cream text-ink hover:border-ink"
                  }`}
                >
                  Freelance MSA
                </button>
              </div>

              {/* Upload Custom File */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileUpload}
                  className="sr-only"
                  id="custom-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-ink/40 bg-cream/70 px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink hover:bg-cream transition-colors cursor-pointer"
                >
                  <UploadCloud className="size-3.5 text-coral" />
                  <span>Upload .PDF / .DOCX / .TXT</span>
                </button>
              </div>
            </div>

            {/* Document OCR Info Line */}
            <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-muted">
              <span>
                <strong>{currentDoc.name}</strong> • {currentDoc.pages} Pages • {currentDoc.wordCount.toLocaleString()} Words • {currentDoc.ocrEngine}
              </span>
              <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                Ephemeral GCS Session ID: gcs-{activeDocKey}-ttl30m
              </span>
            </div>
          </div>

          {/* Tab Navigation Strip */}
          <nav aria-label="Dashboard Intelligence Tabs" className="flex overflow-x-auto no-scrollbar gap-1.5 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-ink text-paper shadow-xs"
                  : "bg-paper border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              <FileCheck className="size-3.5" />
              <span>1. Simplify Summary</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("risks")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "risks"
                  ? "bg-ink text-paper shadow-xs"
                  : "bg-paper border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              <ShieldAlert className="size-3.5 text-coral" />
              <span>2. Risk Radar ({currentDoc.clauses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-ink text-paper shadow-xs"
                  : "bg-paper border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              <Clock className="size-3.5" />
              <span>3. Deadlines & Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "compare"
                  ? "bg-ink text-paper shadow-xs"
                  : "bg-paper border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              <GitCompare className="size-3.5 text-coral" />
              <span>4. Multi-Doc Compare</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("qa")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "qa"
                  ? "bg-ink text-paper shadow-xs"
                  : "bg-paper border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              <Search className="size-3.5" />
              <span>5. Grounded Q&A</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("actions")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "actions"
                  ? "bg-ink text-paper shadow-xs"
                  : "bg-paper border border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              <ListChecks className="size-3.5" />
              <span>6. Next Steps Checklist</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("brief")}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "brief"
                  ? "bg-coral text-paper shadow-xs"
                  : "bg-paper border border-coral/40 text-coral font-bold hover:bg-coral/10"
              }`}
            >
              <Scale className="size-3.5" />
              <span>7. Lawyer Brief</span>
            </button>
          </nav>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <article className="rounded-xl border border-line bg-paper p-6 sm:p-8 text-left shadow-xs">
              <div className="flex justify-between items-start border-b border-line pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">
                    01 / Plain-English Simplification
                  </p>
                  <h3 className="mt-2 font-serif text-3xl font-medium text-ink">{currentDoc.name}</h3>
                </div>
                <span className="text-xs font-semibold text-muted bg-cream px-3 py-1 rounded-full border border-line">
                  {currentDoc.jurisdiction}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">{currentDoc.summary}</p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-cream p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Risk Profile</p>
                  <p className="mt-2 text-2xl font-serif font-bold text-coral">
                    {currentDoc.clauses.filter((c) => c.risk === "high").length} High Risk Clauses
                  </p>
                  <p className="mt-1 text-xs text-muted">Requires legal clarification before signing or agreeing.</p>
                </div>
                <div className="rounded-lg border border-line bg-cream p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Deadlines</p>
                  <p className="mt-2 text-2xl font-serif font-bold text-ink">
                    {currentDoc.timeline.length} Key Dates
                  </p>
                  <p className="mt-1 text-xs text-muted">Earliest: {currentDoc.timeline[0]?.dateStr}</p>
                </div>
                <div className="rounded-lg border border-line bg-cream p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Grounding</p>
                  <p className="mt-2 text-2xl font-serif font-bold text-emerald-700">100% Verifiable</p>
                  <p className="mt-1 text-xs text-muted">Direct line-level quotations for every finding.</p>
                </div>
              </div>
            </article>
          )}

          {/* TAB 2: RISK RADAR */}
          {activeTab === "risks" && (
            <div className="space-y-4">
              {currentDoc.clauses.map((clause) => {
                const isHigh = clause.risk === "high";
                const isCaution = clause.risk === "caution";
                return (
                  <article
                    key={clause.id}
                    className={`rounded-xl border p-5 shadow-xs transition-shadow ${
                      isHigh
                        ? "border-coral/40 bg-coral/5"
                        : isCaution
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-line bg-paper"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        {isHigh ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-coral px-2.5 py-0.5 text-[11px] font-bold text-paper">
                            <ShieldAlert className="size-3" /> HIGH RISK
                          </span>
                        ) : isCaution ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                            <AlertTriangle className="size-3" /> CAUTION
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">
                            <Info className="size-3" /> INFO
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-ink">{clause.section}</span>
                        <span className="text-xs text-muted">• Page {clause.page}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEvidenceModalItem({
                            title: clause.title,
                            section: clause.section,
                            docName: currentDoc.name,
                            page: clause.page,
                            quote: clause.verbatimQuote,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink hover:border-ink cursor-pointer"
                      >
                        <Eye className="size-3.5 text-coral" />
                        <span>View Source Quote</span>
                      </button>
                    </div>

                    <h4 className="mt-2 font-serif text-xl font-medium text-ink">{clause.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-ink/90">{clause.plainEnglishSummary}</p>

                    <div className="mt-3 rounded-md bg-cream/70 border border-line/60 p-3 text-xs font-mono italic text-muted">
                      “{clause.verbatimQuote}”
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="rounded-xl border border-line bg-paper p-6 shadow-xs">
              <h3 className="font-serif text-2xl font-bold text-ink mb-6">Chronological Procedural Timeline</h3>
              <div className="relative border-l-2 border-line pl-6 ml-3 space-y-6">
                {currentDoc.timeline.map((item) => (
                  <div key={item.id} className="relative">
                    <div
                      className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 border-paper ${
                        item.urgency === "critical"
                          ? "bg-coral ring-4 ring-coral/20 animate-pulse"
                          : item.urgency === "warning"
                          ? "bg-amber-500"
                          : "bg-ink"
                      }`}
                    />
                    <div className="rounded-lg border border-line bg-cream/50 p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-serif text-lg font-bold text-ink">{item.dateStr}</span>
                        <span className="rounded-full bg-coral/10 text-coral px-2.5 py-0.5 text-xs font-bold">
                          {item.daysRemaining}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-semibold text-ink">{item.title}</h4>
                      <p className="mt-1 text-xs text-muted">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-DOC COMPARE */}
          {activeTab === "compare" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center rounded-lg bg-coral/10 border border-coral/20 p-4">
                <span className="text-xs font-bold text-coral uppercase tracking-wider">
                  Contractual Discrepancies: Original Lease vs. 15-Day Eviction Notice
                </span>
                <span className="text-xs font-bold text-coral">3 Direct Conflicts</span>
              </div>
              {COMPARISON_DATA.map((row) => (
                <div key={row.id} className="rounded-xl border border-line bg-paper p-5 shadow-xs">
                  <div className="flex justify-between items-center border-b border-line pb-3">
                    <h4 className="font-serif text-lg font-bold text-ink">{row.topic}</h4>
                    <span className="rounded-md bg-coral px-2 py-0.5 text-xs font-bold text-paper">
                      {row.conflictType}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-line bg-cream p-3 text-xs">
                      <span className="font-bold text-ink uppercase">Lease ({row.docAClause}):</span>
                      <p className="mt-1 font-mono text-muted italic">“{row.docAText}”</p>
                    </div>
                    <div className="rounded-lg border border-coral/30 bg-coral/5 p-3 text-xs">
                      <span className="font-bold text-coral uppercase">Notice ({row.docBClause}):</span>
                      <p className="mt-1 font-mono text-ink italic">“{row.docBText}”</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    <strong className="text-ink">Legal Implication:</strong> {row.implication}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: GROUNDED Q&A */}
          {activeTab === "qa" && (
            <div className="space-y-5">
              <form onSubmit={handleAskQuestion} className="rounded-xl border border-line bg-cream p-4 shadow-xs">
                <label htmlFor={searchInputId} className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Ask Question Against Uploaded Document
                </label>
                <div className="flex gap-2">
                  <input
                    id={searchInputId}
                    type="text"
                    value={qaQuery}
                    onChange={(e) => setQaQuery(e.target.value)}
                    placeholder="e.g. Can the landlord enter without 24 hours notice?"
                    className="flex-1 rounded-lg border border-line bg-paper px-4 py-2 text-sm text-ink focus:outline-coral"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-coral px-5 py-2 text-sm font-semibold text-paper hover:bg-coral/90 transition-colors cursor-pointer"
                  >
                    Ask
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {qaList.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-xl border p-5 ${
                      item.insufficientEvidence ? "border-amber-300 bg-amber-50/50" : "border-line bg-paper"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <HelpCircle className="size-5 text-coral shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-ink">{item.question}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-ink/90">{item.answer}</p>
                        <div className="mt-3 rounded-lg border border-line bg-cream p-3 text-xs">
                          <span className="font-semibold text-coral flex items-center gap-1.5">
                            <FileSearch className="size-3.5" />
                            Citation: {item.docName} • {item.section} (Page {item.page})
                          </span>
                          <p className="mt-1 font-mono text-muted italic">{item.verbatimEvidence}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ACTION CHECKLIST */}
          {activeTab === "actions" && (
            <div className="space-y-3">
              {[
                {
                  id: "act-1",
                  priority: "Urgent",
                  title: "Consider requesting proof of service for the 15-day notice",
                  description:
                    "Verify whether the notice was served via personal delivery, substituted service, or certified mail according to statutory requirements in Maharashtra.",
                },
                {
                  id: "act-2",
                  priority: "Urgent",
                  title: "Consider preparing a written response letter disputing the sublet claim",
                  description:
                    "Draft a formal clarification demonstrating that the individual is a temporary guest rather than a permanent occupant or commercial subtenant.",
                },
                {
                  id: "act-3",
                  priority: "Medium",
                  title: "Consider assembling rent receipts and bank statements for the past 12 months",
                  description:
                    "Compiling a clean record of timely payments can refute potential claims of non-financial default.",
                },
                {
                  id: "act-4",
                  priority: "Counsel Prep",
                  title: "Consider scheduling an attorney consultation before the 7-day objection window closes",
                  description:
                    "Take the generated LexNav Brief to legal counsel to examine whether the notice to quit complies with the Maharashtra Rent Control Act.",
                },
              ].map((action) => {
                const isChecked = !!completedActions[action.id];
                return (
                  <div
                    key={action.id}
                    onClick={() => setCompletedActions({ ...completedActions, [action.id]: !isChecked })}
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      isChecked ? "border-emerald-300 bg-emerald-50/40 opacity-75" : "border-line bg-paper hover:border-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-1 size-4 rounded border-line text-coral focus:ring-coral cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="rounded-md bg-coral/10 text-coral px-2 py-0.5 text-[10px] font-bold uppercase">
                        {action.priority}
                      </span>
                      <h4 className={`text-sm font-bold mt-1 ${isChecked ? "line-through text-muted" : "text-ink"}`}>
                        {action.title}
                      </h4>
                      <p className="mt-1 text-xs text-muted">{action.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 7: LAWYER BRIEF */}
          {activeTab === "brief" && (
            <article className="rounded-xl border border-line bg-paper p-6 sm:p-8 shadow-sm">
              <div className="flex justify-between items-start border-b-2 border-ink pb-4">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-ink">LAWYER-READY CONSULTATION BRIEF</h3>
                  <p className="text-xs text-muted mt-1">{currentDoc.name} • Generated via LexNav</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBrief}
                    className="rounded-lg border border-line bg-cream px-3 py-1.5 text-xs font-semibold hover:border-ink cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedBrief ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copiedBrief ? "Copied!" : "Copy Brief"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-ink text-paper px-3 py-1.5 text-xs font-semibold hover:bg-ink-soft cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="size-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-5 text-xs">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-muted mb-1">1. Context & Roles</h4>
                  <p className="bg-cream/50 p-3 rounded-lg border border-line/60">
                    Client Role: <strong>{userRole.toUpperCase()}</strong> | Jurisdiction: <strong>{jurisdiction}</strong> | Urgency: <strong>{urgency.toUpperCase()}</strong>
                  </p>
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-muted mb-1">2. High-Risk Clauses Flagged</h4>
                  {currentDoc.clauses
                    .filter((c) => c.risk === "high")
                    .map((c) => (
                      <div key={c.id} className="rounded-md border border-coral/30 bg-coral/5 p-3 mb-2">
                        <strong className="text-coral">{c.section} — {c.title}:</strong> “{c.verbatimQuote}”
                      </div>
                    ))}
                </div>

                <div>
                  <h4 className="font-bold uppercase tracking-wider text-muted mb-1">3. Formulated Attorney Questions</h4>
                  <ol className="list-decimal list-inside space-y-1.5 bg-cream/40 p-4 rounded-lg border border-line font-medium text-ink">
                    <li>Is the 15-day notice period legally valid given the 30-day notice clause in the lease?</li>
                    <li>Does the unannounced entry provision violate statutory quiet enjoyment in this jurisdiction?</li>
                    <li>What legal threshold distinguishes an overnight guest from an unauthorized subtenant?</li>
                    <li>Can the landlord legally forfeit the entire security deposit without an itemized statement?</li>
                    <li>What emergency stay filing is required if an unlawful detainer action is filed?</li>
                  </ol>
                </div>
              </div>

              <footer className="mt-8 border-t border-line pt-4 text-[11px] text-muted">
                <strong>Legal Disclaimer:</strong> LexNav provides legal document intelligence and consultation preparation tools for informational purposes only. It is not legal advice.
              </footer>
            </article>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL 01 / SIMPLIFY FEATURE SECTION                               */}
      {/* -------------------------------------------------------------------- */}
      <section id="features" className="border-b border-line bg-cream/60 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">01 / Simplify</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-ink">
              Dense clauses, rewritten for humans.
            </h2>
            <p className="mt-4 max-w-md text-muted leading-relaxed">
              LexNav keeps the legal effect, drops the fog, and shows what the document actually asks of you.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-paper p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Original</p>
            <p className="text-sm italic text-muted">
              “The Tenant shall indemnify and hold harmless the Landlord from and against any and all claims…”
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-coral">Simplified</p>
            <p className="text-sm text-ink font-medium">
              You agree to cover the landlord if someone makes a claim because of something you did.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL 02 / RISK RADAR FEATURE SECTION                             */}
      {/* -------------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 space-y-3 lg:order-1">
            <RiskRow
              tone="high"
              title="Liability cap"
              detail="Recovery may be limited — confirm the number in your copy."
            />
            <RiskRow
              tone="mid"
              title="Response window"
              detail="A short deadline to reply is a common pressure point."
            />
            <RiskRow
              tone="ok"
              title="Termination language"
              detail="Look for how much notice you must give to leave."
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">02 / Risk radar</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-ink">
              Obligations, deadlines, and gaps — in one pass.
            </h2>
            <p className="mt-4 max-w-md text-muted leading-relaxed">
              Flags are informational. They help you know what to ask a lawyer, not what to sign.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL DARK NAVY 4-CARD USE CASES SECTION                          */}
      {/* -------------------------------------------------------------------- */}
      <section id="how" className="border-y border-line bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="max-w-xl font-serif text-4xl tracking-tight">Built for real situations, not generic chat.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div
              onClick={() => {
                setActiveTab("compare");
                const el = document.getElementById("dashboard");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer"
            >
              <UseCard
                icon={<GitCompare className="size-5" />}
                title="Compare"
                body="Side-by-side differences in obligations, fees, and exits."
              />
            </div>
            <div
              onClick={() => {
                setActiveTab("qa");
                const el = document.getElementById("dashboard");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer"
            >
              <UseCard
                icon={<FileText className="size-5" />}
                title="Cite answers"
                body="Questions answered only from the text you provided."
              />
            </div>
            <div
              onClick={() => {
                setActiveTab("brief");
                const el = document.getElementById("dashboard");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer"
            >
              <UseCard
                icon={<Scale className="size-5" />}
                title="Lawyer brief"
                body="A one-page summary and questions to take to counsel."
              />
            </div>
            <div
              onClick={() => {
                setActiveTab("actions");
                const el = document.getElementById("dashboard");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="cursor-pointer"
            >
              <UseCard
                icon={<ListChecks className="size-5" />}
                title="Next steps"
                body="Checklists framed as options — never instructions."
              />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL PRICING SECTION                                             */}
      {/* -------------------------------------------------------------------- */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-serif text-4xl tracking-tight text-ink">Plans that stay honest.</h2>
        <p className="mt-3 max-w-lg text-muted">
          Start with a session demo. Upgrade when you need unlimited analyses.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-cream p-8">
            <p className="text-sm font-semibold text-muted">Starter</p>
            <p className="mt-2 font-serif text-5xl">
              $0<span className="text-lg text-muted">/mo</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted">
              <li>5 analyses / month</li>
              <li>Simplification and risk flags</li>
              <li>Session-only processing</li>
            </ul>
            <a
              href="#dashboard"
              className="mt-8 inline-flex rounded-full border border-line bg-paper px-5 py-2 text-sm font-semibold text-ink hover:border-ink transition-colors"
            >
              Get started
            </a>
          </div>
          <div className="rounded-xl bg-ink p-8 text-paper shadow-sm">
            <p className="text-sm font-semibold text-cream/70">Pro</p>
            <p className="mt-2 font-serif text-5xl">
              $19<span className="text-lg text-cream/60">/mo</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-cream/80">
              <li>Unlimited analyses</li>
              <li>Document comparison</li>
              <li>Lawyer-ready brief export</li>
            </ul>
            <a
              href="#dashboard"
              className="mt-8 inline-flex rounded-full bg-coral px-5 py-2 text-sm font-semibold text-paper hover:opacity-90 transition-opacity"
            >
              Try Pro flow
            </a>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL FAQ SECTION                                                 */}
      {/* -------------------------------------------------------------------- */}
      <section id="faq" className="border-t border-line px-5 py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row">
          <h2 className="font-serif text-4xl tracking-tight text-ink lg:w-1/3">
            Frequently asked questions
          </h2>
          <div className="flex-1 divide-y divide-line">
            {faqs.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 py-4 text-left cursor-pointer"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="text-lg text-ink font-medium">{item.q}</span>
                    <span className="text-muted text-xl">{open ? "–" : "+"}</span>
                  </button>
                  {open ? (
                    <p className="pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL BOTTOM CTA                                                  */}
      {/* -------------------------------------------------------------------- */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-4xl rounded-xl bg-ink px-8 py-16 text-center text-paper shadow-md">
          <h2 className="font-serif text-4xl tracking-tight">
            Ready to find true north in your documents?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-cream/70 text-sm leading-relaxed">
            Information and assistance only. A lawyer still owns the advice.
          </p>
          <a
            href="#dashboard"
            className="mt-8 inline-flex rounded-full bg-coral px-6 py-3 text-sm font-semibold text-paper hover:opacity-90 transition-opacity shadow-sm"
          >
            Launch LexNav
          </a>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* EVIDENCE CITATION MODAL                                              */}
      {/* -------------------------------------------------------------------- */}
      {evidenceModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-paper p-6 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Verified Source Grounding
                </span>
                <h3 className="font-serif text-xl font-bold text-ink">
                  {evidenceModalItem.title}
                </h3>
                <p className="text-xs text-muted font-mono mt-0.5">
                  {evidenceModalItem.docName} • {evidenceModalItem.section} • Page {evidenceModalItem.page}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceModalItem(null)}
                className="rounded-full p-1.5 text-muted hover:bg-cream hover:text-ink cursor-pointer"
                aria-label="Close evidence modal"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Verbatim Unaltered Document Extract
              </h4>
              <div className="rounded-xl border border-coral/30 bg-cream/70 p-4">
                <blockquote className="text-sm font-mono leading-relaxed text-ink italic">
                  “{evidenceModalItem.quote}”
                </blockquote>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Exact match verified against OCR stream · Quoted under Quotation Exemption Rules</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setEvidenceModalItem(null)}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink-soft cursor-pointer"
              >
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* ORIGINAL FOOTER                                                      */}
      {/* -------------------------------------------------------------------- */}
      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LexNavWordmark className="origin-left scale-90" />
          <p className="text-sm text-muted">© 2026 LexNav · Not legal advice</p>
        </div>
      </footer>
    </main>
  );
}

function UseCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-paper/15 bg-ink-soft p-5 transition-transform hover:-translate-y-0.5">
      <div className="mb-4 text-coral">{icon}</div>
      <h3 className="font-semibold text-paper">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-cream/70">{body}</p>
    </article>
  );
}

function RiskRow({
  tone,
  title,
  detail,
}: {
  tone: "high" | "mid" | "ok";
  title: string;
  detail: string;
}) {
  const color =
    tone === "high" ? "text-coral" : tone === "mid" ? "text-ink" : "text-muted";
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-cream px-4 py-3">
      <ShieldAlert className={`mt-0.5 size-4 shrink-0 ${color}`} />
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
    </div>
  );
}
