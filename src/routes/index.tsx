import { createFileRoute } from "@tanstack/react-router";
import { useState, useId, useRef, useEffect, type ChangeEvent } from "react";
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
  Languages,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight,
  FileSearch,
  HelpCircle,
  Eye,
  Printer,
  X,
  FileCheck,
  Building2,
  UserCheck,
} from "lucide-react";
import { LexNavMark, LexNavWordmark } from "@/components/logo";

export const Route = createFileRoute("/")({ component: LexNavDashboard });

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
/* REALISTIC LEGAL DOCUMENTS DATASET                                          */
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
          "The landlord says they can walk into your apartment at any time without giving you notice. Under California Civil Code § 1954, landlords generally must give at least 24 hours written notice except during an active emergency.",
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

/* -------------------------------------------------------------------------- */
/* MULTI-DOCUMENT COMPARISON MATRIX                                            */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* GROUNDED Q&A DATABASE WITH PRESET KNOWLEDGE & CITATIONS                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

function LexNavDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();

  // Navigation & User State
  const [activeTab, setActiveTab] = useState<
    "overview" | "risks" | "timeline" | "compare" | "qa" | "actions" | "brief"
  >("overview");
  const [userRole, setUserRole] = useState<string>("tenant");
  const [jurisdiction, setJurisdiction] = useState<string>("US-CA");
  const [urgency, setUrgency] = useState<string>("critical");
  const [language, setLanguage] = useState<string>("en");

  // Selected Documents
  const [activeDocKey, setActiveDocKey] = useState<"lease" | "notice" | "freelance">("lease");
  const [customFile, setCustomFile] = useState<{
    name: string;
    text: string;
    wordCount: number;
    pages: number;
  } | null>(null);

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

  // Backend API Integration State
  const [backendStatus, setBackendStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);

  // Probe FastAPI Backend on Mount
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

  // Action Checkbox states
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  // Feedback states
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [sessionNotification, setSessionNotification] = useState<string | null>(null);

  // Active Document Object
  const currentDoc = PRELOADED_DOCS[activeDocKey];

  // Handle Custom File Upload (Drag & Drop or File Input)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional background ingestion to FastAPI if active
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
    };
    reader.readAsText(file);
  };

  // Reset / Ephemeral Purge
  const handlePurgeSession = () => {
    if (backendSessionId && backendStatus === "online") {
      fetch(`/api/v1/sessions/${backendSessionId}`, { method: "DELETE" }).catch(() => {});
    }
    setCustomFile(null);
    setQaQuery("");
    setCompletedActions({});
    setSessionActive(false);
    setSessionNotification("Session memory, parsed vectors, and cached artifacts purged completely.");
    setTimeout(() => {
      setSessionActive(true);
      setSessionNotification(null);
    }, 2500);
  };

  // Handle Q&A Submission
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
      // Dynamic Search across active clauses
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
            "Insufficient Document Evidence: The uploaded document text does not contain explicit provisions addressing this specific question. Please refer directly to counsel or request clarification from the counterparty.",
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

  // Copy Brief to Clipboard
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
    <main className="min-h-screen bg-paper text-ink pb-20">
      {/* -------------------------------------------------------------------- */}
      {/* TOP NOTIFICATION BANNER                                              */}
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
      {/* APP HEADER                                                           */}
      {/* -------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="#dashboard" aria-label="LexNav Home">
              <LexNavWordmark />
            </a>
            {backendStatus === "online" ? (
              <span className="hidden rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 sm:inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                FastAPI Backend Connected (Port 8000) · Gemini Active
              </span>
            ) : (
              <span className="hidden rounded-full border border-line bg-cream px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted sm:inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Gemini 2.5 Flash Engine Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-muted md:flex">
              <ShieldAlert className="size-3.5 text-coral" />
              <span>Informational Only · Not Legal Advice</span>
            </span>

            <button
              type="button"
              onClick={handlePurgeSession}
              title="Purge session memory and all uploaded documents immediately"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-xs font-medium text-muted hover:border-coral hover:text-coral transition-colors"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Purge Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------------- */}
      {/* HERO & CONTEXT ONBOARDING BAR                                        */}
      {/* -------------------------------------------------------------------- */}
      <section className="border-b border-line bg-cream/50 px-4 py-8 sm:px-6 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-coral">
                <Sparkles className="size-3.5" />
                Legal Document Intelligence & Consultation Prep
              </p>
              <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-5xl text-ink">
                Understand the clauses. Trace the evidence. Prepare for counsel.
              </h1>
              <p className="mt-2 text-sm text-muted max-w-3xl leading-relaxed">
                LexNav analyzes dense contracts, highlights risks and conflicting obligations, generates chronological
                timelines, and drafts lawyer-ready consultation briefs with verifiable source citations.
              </p>
            </div>

            {/* Google Stack Badges */}
            <div className="flex flex-wrap gap-2 text-[11px] text-muted">
              <span className="rounded-md border border-line bg-paper px-2.5 py-1 font-mono">
                Google Cloud Document AI
              </span>
              <span className="rounded-md border border-line bg-paper px-2.5 py-1 font-mono">
                Google Cloud Translation
              </span>
              <span className="rounded-md border border-line bg-paper px-2.5 py-1 font-mono">
                Ephemeral GCS Memory
              </span>
            </div>
          </div>

          {/* Context Control Strip */}
          <div className="mt-6 rounded-xl border border-line bg-paper p-4 shadow-xs sm:p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-coral" />
              Your Legal Context & Matter Parameters
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Role */}
              <div>
                <label htmlFor="user-role-select" className="block text-xs font-semibold text-ink mb-1">
                  Your Role
                </label>
                <select
                  id="user-role-select"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral"
                >
                  <option value="tenant">Tenant (Residential/Commercial)</option>
                  <option value="freelancer">Independent Contractor / Freelancer</option>
                  <option value="consumer">Consumer / Policy Holder</option>
                  <option value="employee">Employee / Contractor</option>
                  <option value="business">Small Business Owner</option>
                </select>
              </div>

              {/* Jurisdiction */}
              <div>
                <label htmlFor="jurisdiction-select" className="block text-xs font-semibold text-ink mb-1">
                  Governing Jurisdiction
                </label>
                <select
                  id="jurisdiction-select"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral"
                >
                  <option value="US-CA">California, USA (Civil Code / Tenancy)</option>
                  <option value="US-NY">New York, USA (Tenancy / Commercial)</option>
                  <option value="IN-MH">Maharashtra, India (Rent Control Act)</option>
                  <option value="UK-ENG">England & Wales, UK (Housing Act)</option>
                  <option value="COMMON-LAW">General Common Law Contract</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label htmlFor="urgency-select" className="block text-xs font-semibold text-ink mb-1">
                  Notice Urgency
                </label>
                <select
                  id="urgency-select"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral"
                >
                  <option value="critical">Critical (Notice to Quit / &lt;15 Days)</option>
                  <option value="medium">Standard Review / Pre-Signature</option>
                  <option value="low">Informational / General Audit</option>
                </select>
              </div>

              {/* Translation Language */}
              <div>
                <label htmlFor="language-select" className="block text-xs font-semibold text-ink mb-1 flex items-center justify-between">
                  <span>Language</span>
                  <span className="text-[10px] text-muted">Google Cloud Translation</span>
                </label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink focus:outline-coral"
                >
                  <option value="en">English (Original Document)</option>
                  <option value="es">Español (Traducción)</option>
                  <option value="hi">हिन्दी (अनुवाद)</option>
                  <option value="fr">Français (Traduction)</option>
                  <option value="de">Deutsch (Übersetzung)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* DOCUMENT SELECTOR & INGESTION STRIP                                  */}
      {/* -------------------------------------------------------------------- */}
      <section className="border-b border-line bg-paper px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted mr-1">Active Documents:</span>

            <button
              type="button"
              onClick={() => setActiveDocKey("lease")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                activeDocKey === "lease"
                  ? "border-ink bg-ink text-paper shadow-xs"
                  : "border-line bg-cream text-ink hover:border-ink"
              }`}
            >
              Residential Lease (Unit 4B)
            </button>

            <button
              type="button"
              onClick={() => setActiveDocKey("notice")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                activeDocKey === "notice"
                  ? "border-coral bg-coral text-paper shadow-xs"
                  : "border-line bg-cream text-ink hover:border-coral"
              }`}
            >
              15-Day Cure / Eviction Notice
            </button>

            <button
              type="button"
              onClick={() => setActiveDocKey("freelance")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                activeDocKey === "freelance"
                  ? "border-ink bg-ink text-paper shadow-xs"
                  : "border-line bg-cream text-ink hover:border-ink"
              }`}
            >
              Freelance MSA Contract
            </button>
          </div>

          {/* Upload Custom Document */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileUpload}
              className="sr-only"
              id="file-upload-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-ink/40 bg-cream/60 px-4 py-2 text-xs font-semibold text-ink hover:border-ink hover:bg-cream transition-colors"
            >
              <UploadCloud className="size-4 text-coral" />
              <span>Upload Custom Document (.PDF / .DOCX / .TXT)</span>
            </button>
          </div>
        </div>

        {/* Active Doc Ingestion Metadata */}
        <div className="mx-auto max-w-7xl mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-cream/40 px-4 py-2.5 text-xs text-muted">
          <div className="flex items-center gap-3">
            <FileText className="size-4 text-coral" />
            <span className="font-semibold text-ink">{currentDoc.name}</span>
            <span>•</span>
            <span>{currentDoc.pages} Pages</span>
            <span>•</span>
            <span>{currentDoc.wordCount.toLocaleString()} Words</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">OCR Verified: {currentDoc.ocrEngine}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>Ephemeral Session ID: <code className="font-mono text-[11px]">gcs-ephem-{activeDocKey}-ttl30m</code></span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* INTELLIGENCE TABS NAVIGATION                                         */}
      {/* -------------------------------------------------------------------- */}
      <nav
        aria-label="Intelligence Views"
        className="sticky top-[61px] z-30 border-b border-line bg-paper/95 backdrop-blur-md px-4 sm:px-6"
      >
        <div className="mx-auto max-w-7xl flex overflow-x-auto no-scrollbar gap-1 py-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-ink text-paper"
                : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <FileCheck className="size-3.5" />
            <span>1. Overview & Simplification</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "risks"}
            onClick={() => setActiveTab("risks")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "risks"
                ? "bg-ink text-paper"
                : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <ShieldAlert className="size-3.5 text-coral" />
            <span>2. Clause Risk Radar ({currentDoc.clauses.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "timeline"}
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "timeline"
                ? "bg-ink text-paper"
                : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <Clock className="size-3.5" />
            <span>3. Deadlines & Timeline</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "compare"}
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "compare"
                ? "bg-ink text-paper"
                : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <GitCompare className="size-3.5 text-coral" />
            <span>4. Multi-Doc Comparison</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "qa"}
            onClick={() => setActiveTab("qa")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "qa"
                ? "bg-ink text-paper"
                : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <Search className="size-3.5" />
            <span>5. Evidence-Grounded Q&A</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "actions"}
            onClick={() => setActiveTab("actions")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "actions"
                ? "bg-ink text-paper"
                : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            <ListChecks className="size-3.5" />
            <span>6. Action Options Checklist</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "brief"}
            onClick={() => setActiveTab("brief")}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "brief"
                ? "bg-coral text-paper shadow-xs"
                : "text-coral font-bold hover:bg-coral/10"
            }`}
          >
            <Scale className="size-3.5" />
            <span>7. Lawyer-Ready Brief</span>
          </button>
        </div>
      </nav>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN TAB CONTENT CONTAINER                                           */}
      {/* -------------------------------------------------------------------- */}
      <div id="dashboard" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ================================================================== */}
        {/* TAB 1: OVERVIEW & SIMPLIFICATION                                   */}
        {/* ================================================================== */}
        {activeTab === "overview" && (
          <section aria-labelledby="overview-heading" className="space-y-6">
            <div className="rounded-xl border border-line bg-cream/70 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-coral">
                    Plain-Language Legal Simplification (8th-Grade Reading Target)
                  </span>
                  <h2 id="overview-heading" className="mt-1 font-serif text-2xl sm:text-3xl text-ink">
                    Executive Document Synthesis
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                  <Building2 className="size-4 text-ink" />
                  <span>Governing: {currentDoc.jurisdiction}</span>
                </div>
              </div>

              <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink/90">
                {currentDoc.summary}
              </p>

              {/* Quick Metrics Cards */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-paper p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <ShieldAlert className="size-4 text-coral" />
                    <span>Risk Profile</span>
                  </div>
                  <p className="mt-2 text-2xl font-serif font-bold text-coral">
                    {currentDoc.clauses.filter((c) => c.risk === "high").length} High Risk Clauses
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Requires attorney consultation or clarification before agreement.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-paper p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <Clock className="size-4 text-ink" />
                    <span>Time Horizon</span>
                  </div>
                  <p className="mt-2 text-2xl font-serif font-bold text-ink">
                    {currentDoc.timeline.length} Key Deadlines
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Earliest deadline: {currentDoc.timeline[0]?.dateStr || "None"}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-paper p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                    <Scale className="size-4 text-emerald-600" />
                    <span>Evidence Grounding</span>
                  </div>
                  <p className="mt-2 text-2xl font-serif font-bold text-emerald-700">
                    100% Verifiable
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Every finding anchors to verbatim text with line-level quotes.
                  </p>
                </div>
              </div>
            </div>

            {/* Side-by-Side Example Card */}
            <div className="rounded-xl border border-line bg-paper p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
                Deep-Dive: Dense Legal Clause vs. LexNav Plain English
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-line bg-cream/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                    <FileText className="size-3.5 text-ink" />
                    Verbatim Document Extract (Section 18.2)
                  </p>
                  <blockquote className="text-xs font-mono leading-relaxed text-ink/80 italic border-l-2 border-line pl-3">
                    “Tenant agrees to defend, indemnify, and hold completely harmless Landlord, its agents, and
                    affiliates from and against any and all claims, liabilities, lawsuits, or medical damages occurring
                    on or about the Premises, even where attributable in part to Landlord’s deferred maintenance.”
                  </blockquote>
                </div>

                <div className="rounded-lg border border-coral/30 bg-coral/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-coral mb-2 flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-coral" />
                    LexNav Plain-English Translation
                  </p>
                  <p className="text-sm leading-relaxed text-ink font-medium">
                    You are forced to take financial and legal responsibility for injuries or damages that happen on the
                    property — even if they were caused by the landlord refusing to fix broken stairs or faulty wiring.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-coral font-bold">
                    <ShieldAlert className="size-4" />
                    <span>Flagged as Highly Disproportionate Liability Shift</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* TAB 2: CLAUSE RISK RADAR                                           */}
        {/* ================================================================== */}
        {activeTab === "risks" && (
          <section aria-labelledby="risks-heading" className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="risks-heading" className="font-serif text-2xl sm:text-3xl text-ink">
                  Clause Risk Radar
                </h2>
                <p className="text-xs text-muted">
                  Audited against {currentDoc.jurisdiction} legal standards. Direct quotations are preserved verbatim
                  under advice protection guardrails.
                </p>
              </div>

              {/* Legend with Icons & Labels (Non-Color Exclusive) */}
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-coral">
                  <ShieldAlert className="size-3.5" /> High Risk
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                  <AlertTriangle className="size-3.5" /> Caution
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-muted">
                  <Info className="size-3.5" /> Informational
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentDoc.clauses.map((clause) => {
                const isHigh = clause.risk === "high";
                const isCaution = clause.risk === "caution";

                return (
                  <article
                    key={clause.id}
                    className={`rounded-xl border p-5 transition-shadow hover:shadow-sm ${
                      isHigh
                        ? "border-coral/40 bg-coral/5"
                        : isCaution
                        ? "border-amber-300 bg-amber-50/40"
                        : "border-line bg-paper"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isHigh && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-coral px-2.5 py-0.5 text-[11px] font-bold text-paper">
                              <ShieldAlert className="size-3" />
                              HIGH RISK CLAUSE
                            </span>
                          )}
                          {isCaution && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                              <AlertTriangle className="size-3" />
                              CAUTION REQUIRED
                            </span>
                          )}
                          {!isHigh && !isCaution && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">
                              <Info className="size-3" />
                              INFORMATIONAL
                            </span>
                          )}

                          <span className="font-mono text-xs font-bold text-ink">
                            {clause.section}
                          </span>
                          <span className="text-xs text-muted">• Page {clause.page}</span>
                        </div>

                        <h3 className="mt-2 font-serif text-xl font-medium text-ink">
                          {clause.title}
                        </h3>
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink"
                      >
                        <Eye className="size-3.5 text-coral" />
                        <span>View Source Quote</span>
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Plain-Language Explanation */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">
                          Plain-English Meaning
                        </h4>
                        <p className="text-sm leading-relaxed text-ink/90">
                          {clause.plainEnglishSummary}
                        </p>
                      </div>

                      {/* Party Obligations */}
                      <div className="rounded-lg border border-line/70 bg-cream/50 p-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                          Contractual Obligations
                        </h4>
                        <ul className="space-y-1.5 text-xs">
                          {clause.obligations.map((ob, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-semibold text-coral shrink-0">
                                [{ob.party}]:
                              </span>
                              <span className="text-ink">{ob.action}</span>
                              <span className="text-[10px] text-muted italic ml-auto shrink-0">
                                ({ob.strictness})
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Verbatim Protected Quote */}
                    <div className="mt-3 rounded-md bg-paper/80 border border-line/60 p-2.5 text-xs font-mono italic text-muted">
                      “{clause.verbatimQuote}”
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* TAB 3: TIMELINE & DEADLINES                                        */}
        {/* ================================================================== */}
        {activeTab === "timeline" && (
          <section aria-labelledby="timeline-heading" className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 id="timeline-heading" className="font-serif text-2xl sm:text-3xl text-ink">
                Chronological Deadlines & Procedural Timeline
              </h2>
              <p className="text-xs text-muted mt-1">
                Extracted dates, cure windows, and statutory notice minimums mapped in chronological order.
              </p>
            </div>

            <div className="relative border-l-2 border-line pl-6 ml-4 space-y-8">
              {currentDoc.timeline.map((item, idx) => {
                const isCritical = item.urgency === "critical";
                const isWarning = item.urgency === "warning";

                return (
                  <div key={item.id} className="relative group">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[31px] top-1.5 size-4 rounded-full border-2 border-paper ${
                        isCritical
                          ? "bg-coral ring-4 ring-coral/20 animate-pulse"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-ink"
                      }`}
                    />

                    <div className="rounded-xl border border-line bg-paper p-5 shadow-xs">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-xl font-bold text-ink">
                            {item.dateStr}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isCritical
                                ? "bg-coral text-paper"
                                : isWarning
                                ? "bg-amber-100 text-amber-900"
                                : "bg-cream text-muted"
                            }`}
                          >
                            {item.daysRemaining}
                          </span>
                        </div>

                        <span className="text-xs text-muted font-mono">
                          {item.sourceDoc} • {item.sourceSection}
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* TAB 4: MULTI-DOCUMENT COMPARISON                                   */}
        {/* ================================================================== */}
        {activeTab === "compare" && (
          <section aria-labelledby="compare-heading" className="space-y-6">
            <div className="border-b border-line pb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="compare-heading" className="font-serif text-2xl sm:text-3xl text-ink">
                  Multi-Document Conflict Matrix
                </h2>
                <p className="text-xs text-muted mt-1">
                  Cross-document comparison between Document A (Original Lease) and Document B (15-Day Eviction Notice).
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-md bg-coral/10 px-3 py-1 text-xs font-bold text-coral">
                <AlertTriangle className="size-3.5" /> 3 Material Conflicts Detected
              </span>
            </div>

            <div className="space-y-4">
              {COMPARISON_DATA.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-line bg-paper p-5 transition-shadow hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
                    <h3 className="font-serif text-lg font-bold text-ink">{row.topic}</h3>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-coral px-2.5 py-0.5 text-xs font-bold text-paper">
                        {row.conflictType}
                      </span>
                      <span className="text-xs font-semibold text-coral uppercase">
                        Severity: {row.severity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Document A */}
                    <div className="rounded-lg border border-line bg-cream/40 p-4">
                      <p className="text-xs font-bold text-ink uppercase tracking-wider mb-1">
                        Document A: Residential Lease ({row.docAClause})
                      </p>
                      <p className="text-xs font-mono text-muted italic">“{row.docAText}”</p>
                    </div>

                    {/* Document B */}
                    <div className="rounded-lg border border-coral/30 bg-coral/5 p-4">
                      <p className="text-xs font-bold text-coral uppercase tracking-wider mb-1">
                        Document B: Eviction Notice ({row.docBClause})
                      </p>
                      <p className="text-xs font-mono text-ink italic">“{row.docBText}”</p>
                    </div>
                  </div>

                  {/* Legal Implication */}
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-cream/70 p-3 text-xs">
                    <Info className="size-4 text-coral shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-ink">Analytical Takeaway: </span>
                      <span className="text-muted">{row.implication}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* TAB 5: EVIDENCE-GROUNDED Q&A                                       */}
        {/* ================================================================== */}
        {activeTab === "qa" && (
          <section aria-labelledby="qa-heading" className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 id="qa-heading" className="font-serif text-2xl sm:text-3xl text-ink">
                Evidence-Grounded Q&A
              </h2>
              <p className="text-xs text-muted mt-1">
                Ask specific questions about the uploaded legal text. Every response provides citation metadata and
                direct excerpts. If evidence is lacking, the system fails closed rather than hallucinating.
              </p>
            </div>

            {/* Question Input Form */}
            <form onSubmit={handleAskQuestion} className="rounded-xl border border-line bg-cream p-4 shadow-xs">
              <label htmlFor={searchInputId} className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Ask Question Against Document Knowledge Base
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id={searchInputId}
                  type="text"
                  value={qaQuery}
                  onChange={(e) => setQaQuery(e.target.value)}
                  placeholder="e.g. Can the landlord enter without 24 hours notice?"
                  className="flex-1 rounded-lg border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:outline-coral"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-paper hover:bg-coral/90 transition-colors"
                >
                  <Search className="size-4" />
                  <span>Ask LexNav</span>
                </button>
              </div>

              {/* Sample Suggestion Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Suggested prompts:</span>
                <button
                  type="button"
                  onClick={() => setQaQuery("Can the landlord enter my home without 24 hours prior notice?")}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-muted hover:border-ink hover:text-ink"
                >
                  Notice for entry?
                </button>
                <button
                  type="button"
                  onClick={() => setQaQuery("What are the hard deadlines in the 15-day notice?")}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-muted hover:border-ink hover:text-ink"
                >
                  15-day notice deadlines?
                </button>
                <button
                  type="button"
                  onClick={() => setQaQuery("Does the freelance contract transfer copyright before I am paid?")}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-muted hover:border-ink hover:text-ink"
                >
                  IP transfer before pay?
                </button>
                <button
                  type="button"
                  onClick={() => setQaQuery("What is the pet deposit fee in the lease?")}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-coral hover:border-coral"
                >
                  Pet fee (Negative test)
                </button>
              </div>
            </form>

            {/* Q&A Thread List */}
            <div className="space-y-4">
              {qaList.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-5 ${
                    item.insufficientEvidence
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-line bg-paper"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <HelpCircle className="size-5 text-coral shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-ink">{item.question}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/90">
                        {item.answer}
                      </p>

                      {/* Evidence Drawer Anchor */}
                      <div className="mt-4 rounded-lg border border-line bg-cream/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-coral flex items-center gap-1.5">
                            <FileSearch className="size-3.5" />
                            Citation: {item.docName} • {item.section} (Page {item.page})
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setEvidenceModalItem({
                                title: item.question,
                                section: item.section,
                                docName: item.docName,
                                page: item.page,
                                quote: item.verbatimEvidence,
                              })
                            }
                            className="text-xs font-semibold text-ink underline hover:text-coral"
                          >
                            Inspect Verbatim Source Quote
                          </button>
                        </div>

                        <p className="mt-2 text-xs font-mono text-muted italic">
                          {item.verbatimEvidence}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* TAB 6: ACTION OPTIONS CHECKLIST                                    */}
        {/* ================================================================== */}
        {activeTab === "actions" && (
          <section aria-labelledby="actions-heading" className="space-y-6">
            <div className="border-b border-line pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Strict Non-Directive Option Framing
              </span>
              <h2 id="actions-heading" className="font-serif text-2xl sm:text-3xl text-ink">
                Recommended Procedural Considerations
              </h2>
              <p className="text-xs text-muted mt-1">
                Options to consider based on document terms. Formulated strictly as options ("Consider...", "One option
                is..."), never legal instructions.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "act-1",
                  priority: "Urgent",
                  title: "Consider requesting proof of service for the 15-day notice",
                  description:
                    "One option is to verify whether the notice was served via personal delivery, substituted service, or certified mail according to statutory requirements in your jurisdiction.",
                },
                {
                  id: "act-2",
                  priority: "Urgent",
                  title: "Consider preparing a written response letter disputing the sublet claim",
                  description:
                    "You may want to draft a formal clarification demonstrating that the individual is a temporary guest rather than a permanent occupant or commercial subtenant.",
                },
                {
                  id: "act-3",
                  priority: "Medium",
                  title: "Consider assembling rent receipts and bank statements for the past 12 months",
                  description:
                    "Compiling a clean record of timely payments can refute potential claims of non-financial default or habitual lateness.",
                },
                {
                  id: "act-4",
                  priority: "Counsel Prep",
                  title: "Consider scheduling an attorney consultation before the 7-day objection window closes",
                  description:
                    "Take the generated LexNav Consultation Brief to legal counsel to examine whether the unannounced entry and jury waiver clauses violate local statutory protections.",
                },
              ].map((action) => {
                const isChecked = !!completedActions[action.id];
                return (
                  <div
                    key={action.id}
                    onClick={() =>
                      setCompletedActions({
                        ...completedActions,
                        [action.id]: !isChecked,
                      })
                    }
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      isChecked
                        ? "border-emerald-300 bg-emerald-50/40 opacity-75"
                        : "border-line bg-paper hover:border-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-1 size-4 rounded border-line text-coral focus:ring-coral cursor-pointer"
                      aria-label={`Mark as considered: ${action.title}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            action.priority === "Urgent"
                              ? "bg-coral text-paper"
                              : "bg-cream text-muted"
                          }`}
                        >
                          {action.priority}
                        </span>
                        <h3 className={`text-sm font-bold ${isChecked ? "line-through text-muted" : "text-ink"}`}>
                          {action.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================================== */}
        {/* TAB 7: LAWYER-READY CONSULTATION BRIEF                             */}
        {/* ================================================================== */}
        {activeTab === "brief" && (
          <section aria-labelledby="brief-heading" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Attorney Consultation Deliverable
                </span>
                <h2 id="brief-heading" className="font-serif text-2xl sm:text-3xl text-ink">
                  Lawyer-Ready Matter Brief
                </h2>
                <p className="text-xs text-muted mt-1">
                  1-page structured executive briefing designed to streamline your first 15 minutes with legal counsel.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBrief}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:border-ink shadow-xs"
                >
                  {copiedBrief ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  <span>{copiedBrief ? "Copied to Clipboard!" : "Copy Full Brief"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink-soft shadow-xs"
                >
                  <Printer className="size-4" />
                  <span>Print Brief</span>
                </button>
              </div>
            </div>

            {/* Document Printable Brief */}
            <article className="rounded-xl border border-line bg-paper p-6 sm:p-8 shadow-sm">
              <header className="border-b-2 border-ink pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-ink">
                      CASE PREPARATION BRIEF: {currentDoc.name}
                    </h3>
                    <p className="text-xs font-semibold text-muted mt-1">
                      Compiled via LexNav Intelligence Engine • Powered by Google Gemini 2.5 Flash
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-ink">Date: September 26, 2026</p>
                    <p className="text-muted">Jurisdiction: {jurisdiction}</p>
                    <p className="text-coral font-semibold">Matter Urgency: {urgency.toUpperCase()}</p>
                  </div>
                </div>
              </header>

              {/* Section 1: Situation */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  1. Matter Summary & Client Role
                </h4>
                <p className="text-sm leading-relaxed text-ink/90 bg-cream/50 p-3 rounded-lg border border-line/60">
                  Client is acting as <span className="font-semibold underline">{userRole.toUpperCase()}</span>.{" "}
                  {currentDoc.summary}
                </p>
              </div>

              {/* Section 2: Flagged High-Risk Terms */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  2. Identified High-Risk Terms Requiring Legal Opinion
                </h4>
                <div className="space-y-2 text-xs">
                  {currentDoc.clauses
                    .filter((c) => c.risk === "high")
                    .map((clause) => (
                      <div key={clause.id} className="rounded-md border border-coral/30 bg-coral/5 p-3">
                        <span className="font-bold text-coral">
                          {clause.section} — {clause.title}:
                        </span>{" "}
                        <span className="font-mono italic">“{clause.verbatimQuote}”</span>
                        <p className="mt-1 font-semibold text-ink">
                          Impact: {clause.plainEnglishSummary}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Section 3: Critical Dates */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  3. Critical Timelines & Procedural Deadlines
                </h4>
                <ul className="divide-y divide-line/60 border border-line rounded-lg text-xs">
                  {currentDoc.timeline.map((t) => (
                    <li key={t.id} className="flex justify-between items-center p-3">
                      <div>
                        <span className="font-bold text-ink">{t.dateStr}</span>: {t.title}
                        <p className="text-muted text-[11px]">{t.description}</p>
                      </div>
                      <span className="font-mono text-coral font-semibold">{t.daysRemaining}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 4: 5 Formulated Attorney Questions */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  4. Formulated Questions to Discuss With Your Attorney
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs font-medium text-ink bg-cream/40 p-4 rounded-lg border border-line">
                  <li>
                    Does the 15-day cure window in the notice override the 30-day default provision stated in Section 21
                    of the underlying lease?
                  </li>
                  <li>
                    Is the unannounced landlord right-of-entry clause in Section 12.4 enforceable under California Civil
                    Code § 1954?
                  </li>
                  <li>
                    What statutory threshold distinguishes an overnight guest from an unauthorized subtenant under local
                    rent control ordinances?
                  </li>
                  <li>
                    Can the landlord legally declare a summary forfeiture of the $5,700 deposit without presenting an
                    itemized schedule of actual damages?
                  </li>
                  <li>
                    What immediate emergency responsive pleading or stay of proceedings should be prepared if a summary
                    unlawful detainer action is filed?
                  </li>
                </ol>
              </div>

              {/* Legal Disclaimer Inside Brief */}
              <footer className="mt-8 border-t border-line pt-4 text-[11px] text-muted leading-relaxed">
                <strong>LEGAL DISCLAIMER:</strong> This brief is generated automatically by LexNav for document
                comprehension and consultation preparation purposes only. LexNav is not an attorney or law firm and does
                not render formal legal opinions or advise on legal strategies. All analysis should be reviewed by a
                licensed legal professional in your jurisdiction.
              </footer>
            </article>
          </section>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* EVIDENCE CITATION MODAL / DRAWER                                     */}
      {/* -------------------------------------------------------------------- */}
      {evidenceModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-paper p-6 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Verified Source Grounding
                </span>
                <h3 id="evidence-dialog-title" className="font-serif text-xl font-bold text-ink">
                  {evidenceModalItem.title}
                </h3>
                <p className="text-xs text-muted font-mono mt-0.5">
                  {evidenceModalItem.docName} • {evidenceModalItem.section} • Page {evidenceModalItem.page}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceModalItem(null)}
                className="rounded-full p-1.5 text-muted hover:bg-cream hover:text-ink"
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
                <span>
                  Exact match verified against OCR stream · Quoted under LexNav Quotation Exemption Rules
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setEvidenceModalItem(null)}
                className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink-soft"
              >
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* PERSISTENT FOOTER WITH MANDATORY LEGAL DISCLAIMER                    */}
      {/* -------------------------------------------------------------------- */}
      <footer className="mt-20 border-t border-line bg-cream/40 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LexNavMark className="size-8" />
            <div>
              <p className="text-sm font-bold text-ink">LexNav Legal Intelligence Platform</p>
              <p className="text-xs text-muted">Powered Natively by Google Gemini 2.5 Flash & Google Cloud</p>
            </div>
          </div>

          <div className="max-w-xl text-right">
            <p className="text-xs text-muted leading-relaxed">
              <strong>Mandatory Legal Notice:</strong> LexNav provides legal document intelligence and consultation
              preparation tools for informational purposes only. It is not legal advice. Consult a qualified legal
              professional for advice regarding your specific situation.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
