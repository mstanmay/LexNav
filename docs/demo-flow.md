# LexNav Recommended Evaluator Demo Flow

> **Estimated Evaluation Time**: 2–3 minutes  
> **Target Audience**: Hackathon Judges & AI Evaluation Bots  
> **Key Objective**: Rapidly verify end-to-end functionality, Google Cloud integration, evidence grounding, and legal safety guardrails.

---

## Step 1: Onboarding Context & Document Inspection (30 seconds)
1. Navigate to the live application at `http://localhost:8080/`.
2. Notice the top **Context Configuration Bar**:
   - Role is preselected to `Tenant (Residential/Commercial)`.
   - Jurisdiction is set to `California, USA (Civil Code / Tenancy)`.
   - Notice Urgency is set to `Critical (Notice to Quit / <15 Days)`.
   - Google Cloud Translation language is set to `English (Original Document)`.
3. Under **Active Documents**, click through the 3 preloaded real legal documents:
   - **Residential Lease (Unit 4B)**: 6 pages, 3,840 words, OCR verified via Google Cloud Document AI.
   - **15-Day Cure / Eviction Notice**: 2 pages, 920 words, OCR verified via Google Cloud Vision.
   - **Freelance MSA Contract**: 4 pages, 2,950 words, Commercial agreement.

---

## Step 2: Clause Risk Radar & Quotation Protection (30 seconds)
1. Click **Tab 2: Clause Risk Radar**.
2. Notice the multi-factor risk categorization (Icons + Text + Badges):
   - **HIGH RISK CLAUSE**: *Section 12.4 (Landlord Right of Entry Without Prior Notice)* and *Section 18.2 (Unilateral Tenant Indemnification)*.
   - Observe the **Contractual Obligations** breakdown separating Tenant vs Landlord requirements.
3. Click the **"View Source Quote"** button on any clause:
   - An accessible modal opens displaying the verbatim, unaltered document extract enclosed in quotation marks.
   - Note the compliance indicator: *"Quoted under LexNav Quotation Exemption Rules"*.

---

## Step 3: Chronological Timeline & Comparison Matrix (45 seconds)
1. Click **Tab 3: Deadlines & Timeline**:
   - Observe the visual milestone nodes with countdown indicators (*"3 days grace"*, *"7 days remaining"*, *"15 days critical"*).
   - Review how notice service dates and cure windows are mapped chronologically.
2. Click **Tab 4: Multi-Doc Comparison**:
   - Observe the 3 highlighted material conflicts between Document A (Lease) and Document B (Notice to Quit).
   - Review Conflict 1 (*Direct Contradiction*): The underlying Lease requires a 30-day notice, whereas the Eviction Notice cuts the response window down to 15 days.
   - Review Conflict 2 (*Liability Shift*): Unilateral summary forfeiture of the $5,700 deposit.

---

## Step 4: Evidence-Grounded Q&A & Fail-Closed Test (30 seconds)
1. Click **Tab 5: Evidence-Grounded Q&A**:
2. Click the suggested prompt chip: *"Notice for entry?"*
   - Observe the instant answer citing Section 12.4 of the Residential Lease, Page 4, with verbatim text.
3. Now test the **Negative / Fail-Closed Guardrail**:
   - Click the chip: *"Pet fee (Negative test)"* or type *"What is the pet deposit fee?"*.
   - Observe the response: **"Insufficient Document Evidence: The uploaded document text does not contain explicit provisions addressing this specific question."**
   - This proves LexNav fails closed and never hallucinates clauses that do not exist.

---

## Step 5: Lawyer-Ready Brief & Ephemeral Purge (30 seconds)
1. Click **Tab 7: Lawyer-Ready Brief**:
   - Review the complete 1-page executive summary prepared for an attorney consultation.
   - Read Section 4: **5 Formulated Questions to Discuss With Your Attorney** (e.g. *"Is the 15-day notice period legally valid given the 30-day notice clause in Section 21?"*).
   - Click **"Copy Full Brief"** (observe the "Copied to Clipboard!" confirmation).
   - Click **"Print Brief"** to see the clean print layout.
2. In the top navigation bar, click **"Purge Session"**:
   - Notice the instant confirmation notification: *"Session memory, parsed vectors, and cached artifacts purged completely."*
   - Confirms that LexNav maintains zero persistent legal data on disk.
