# LexNav — Hackathon Video Submission Guide & Script

> **Submission Criteria**: Under 4 Minutes | Public Google Drive or YouTube Link | Live Testing & GenAI in Action

---

## 📹 Video Submission Link
- **Demo Video URL**: `[INSERT YOUR YOUTUBE / GOOGLE DRIVE LINK HERE]`
  *(Ensure link access is set to "Anyone with the link" or YouTube "Unlisted")*

---

## ⏱️ Video Structure & Timestamps (Total Duration: ~3:30)

| Timestamp | Section | What to Show on Screen | Live Action / Narration |
|---|---|---|---|
| **0:00 – 0:30** | **1. Problem & Context Onboarding** | Landing Page (`http://localhost:8080`) | Introduce LexNav as a context-aware legal document intelligence platform. Select Role (*Tenant*), Jurisdiction (*Maharashtra, India*), and Urgency (*Critical*). |
| **0:30 – 1:00** | **2. Live Data Entry & Document Ingestion** | Situation Textbox & Document Switcher | Type live into the prompt box: *"I received a 15-day eviction notice as a tenant in Maharashtra."* Click **"Analyze Document"**. Show OCR verification and page count metadata. |
| **1:00 – 1:40** | **3. GenAI in Action: Clause Risk Radar** | Tab 2: Risk Radar | Point out Google Gemini 2.5 Flash analyzing clauses. Highlight **HIGH RISK** badges on unannounced entry and unilateral indemnity. Click **"View Source Quote"** to demonstrate quotation protection and verbatim grounding. |
| **1:40 – 2:15** | **4. Deadlines, Timeline & Multi-Doc Comparison** | Tab 3 (Timeline) & Tab 4 (Compare) | Show the chronological milestone countdown (*"15 days critical"*). Switch to Tab 4 to show the 3 contractual contradictions between the underlying lease (30-day notice) and the eviction notice (15-day notice). |
| **2:15 – 2:55** | **5. Live Q&A Testing (Success & Edge Cases)** | Tab 5: Grounded Q&A | **Success Test**: Type *"Can the landlord enter without 24 hours notice?"* Show line-level citation to §12.4.<br>**Edge Case / Negative Test**: Type *"What is the pet deposit fee?"* Show the fail-closed fallback: *"Insufficient Document Evidence: No matching clause found."* (Proves zero hallucination). |
| **2:55 – 3:30** | **6. Action Checklist, Lawyer Brief & Ephemeral Purge** | Tab 6, Tab 7 & Header Purge | Check off a non-directive option. Switch to Tab 7 to review the 5 formulated attorney questions. Click **"Copy Brief"**. Click **"Purge Session Memory"** to demonstrate complete ephemeral privacy and zero data retention. |

---

## 🎙️ Word-for-Word Narration Script (Under 4 Minutes)

### [0:00 – 0:30] Scene 1: Introduction & Problem Statement
> *"Hello judges! This is LexNav, a context-aware legal document intelligence and consultation preparation platform powered natively by Google Gemini 2.5 Flash and Google Cloud.  
> Legal notices and contracts are intimidating and full of hidden traps. Generic chatbots hallucinate legal advice and store confidential data. LexNav solves this by providing 100% evidence-grounded document comprehension, contractual comparison, and lawyer meeting prep — with zero long-term data persistence.  
> Let's look at the live application running on localhost port 8080."*

### [0:30 – 1:00] Scene 2: Live Context Onboarding & Document Ingestion
> *(Action: In the situation box, type live)*:  
> *"Here, our user is a residential tenant in Maharashtra who just received a 15-day eviction notice. We configure their context: Role: Tenant, Jurisdiction: Maharashtra Rent Control Act, Urgency: Critical.  
> We click 'Analyze Document'. In the Legal Intelligence Studio, you can see our ingested document with OCR verified via Google Cloud Document AI, analyzing 920 words across 2 pages."*

### [1:00 – 1:40] Scene 3: GenAI in Action & Clause Risk Radar
> *(Action: Click Tab 2 - Risk Radar)*:  
> *"Here is GenAI in action. Google Gemini extracts and categorizes clauses by risk level using multi-factor indicators — not just color, but explicit badges and icons for accessibility.  
> Notice Notice Section 1 flagged as HIGH RISK with a mandatory obligation to cure within 15 days.  
> When we click 'View Source Quote' (click button), LexNav displays the exact, unaltered verbatim extract under our Quotation Exemption guardrails, guaranteeing that contract wording is never censored or modified."*

### [1:40 – 2:15] Scene 4: Chronological Timeline & Multi-Document Comparison
> *(Action: Click Tab 3 - Deadlines & Timeline)*:  
> *"In Tab 3, LexNav chronologically maps all procedural deadlines. It calculates active countdowns — highlighting the 7-day recommended dispute window and the 15-day critical cure deadline.  
> Next, in Tab 4: Multi-Doc Comparison (click Tab 4), LexNav performs cross-document discrepancy detection between the tenant's original lease and the eviction notice. It spots three major contradictions: the lease granted a 30-day notice period, but the notice unilaterally compressed it to 15 days; and the notice attempts an unlawful summary forfeiture of the $5,700 deposit."*

### [2:15 – 2:55] Scene 5: Live Grounded Q&A (Success & Edge Cases)
> *(Action: Click Tab 5 - Grounded Q&A)*:  
> *"Now let's test our Grounded Q&A engine live.  
> First, a valid test case: We type 'Can the landlord enter without 24 hours notice?' (click Ask). LexNav immediately answers and provides exact citation grounding: Document Name, Section 12.4, Page 4, and the verbatim excerpt.  
> Now, let's test a critical edge case — asking about something NOT in the document. We type 'What is the pet deposit fee?' (click Ask).  
> Notice that instead of hallucinating a fake number, LexNav fails closed and explicitly informs the user: 'Insufficient Document Evidence: The uploaded document does not contain explicit provisions addressing this question.' This demonstrates our strict legal AI safety guardrails."*

### [2:55 – 3:30] Scene 6: Action Checklist, Lawyer Brief & Privacy Purge
> *(Action: Click Tab 6 - Actions, then Tab 7 - Lawyer Brief)*:  
> *"In Tab 6, LexNav formulates procedural options strictly framed as non-directive considerations ('Consider requesting proof of service...'), never legal instructions.  
> In Tab 7, LexNav generates a 1-page Lawyer-Ready Consultation Brief. It highlights the flagged terms and formulates 5 strategic questions for the user's attorney consultation. We can copy the brief with one click or print it.  
> Finally, privacy: We click 'Purge Session Memory' in the header. All in-memory ChromaDB vectors and cached artifacts are wiped instantly — zero legal data is ever persisted.  
> Thank you for reviewing LexNav!"*

---

## 🛠️ How to Record and Obtain Your Submission Link (5 Minutes)

### Option A: Using OBS Studio or Loom (Recommended)
1. Open [http://localhost:8080](http://localhost:8080) in your browser.
2. Launch **Loom** (browser extension or desktop app) or **OBS Studio**.
   *(Windows built-in shortcut: Press `Win + Alt + R` to instantly record screen)*.
3. Follow the 3-minute script above, keeping your cursor clearly visible and pausing briefly on key actions.
4. Stop recording.

### Option B: Uploading & Getting the Public Submission Link
1. **Google Drive**:
   - Upload your recorded video file (`.mp4` / `.webm`) to [Google Drive](https://drive.google.com).
   - Right-click the uploaded video → select **Share** → **Share**.
   - Under General access, change from "Restricted" to **"Anyone with the link"**.
   - Click **Copy link**.
   - Open an incognito browser tab and paste the link to confirm it plays immediately without requesting access.
2. **YouTube (Alternative)**:
   - Go to [YouTube Studio](https://studio.youtube.com) → click **Create** → **Upload videos**.
   - Set visibility to **Unlisted** (anyone with the link can view).
   - Copy the video URL (e.g. `https://youtu.be/...`).
3. Paste the copied link into your hackathon submission portal and in `docs/video-submission.md`.
