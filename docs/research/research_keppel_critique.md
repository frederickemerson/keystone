# Keppel intelligence + MOSAIC red-team (AI HARVEST track, Tencent Cloud AI CAN DO IT SG 2026)

Date: 2026-10-11. Deadline: 2026-10-16 (5 days). Sources are listed inline and collected in Appendix C. Primary documents (Keppel AR2025, SR2025, Keppel REIT SR24/factsheet, Keppel DC REIT AR2025, Investor Day 2025/2026 decks, Almere statement) were downloaded and text-searched; quotes are verbatim from those PDFs.

---

## PART A - KEPPEL INTELLIGENCE

### A1. What the track actually is

- Hackathon: "AI CAN DO IT" Tencent Cloud Hackathon Singapore 2026, co-run with AI Singapore. Five tracks: DBS (banking), Keppel (real estate), Aspire (fintech), Ryde (digital services), NTU LKCMedicine (healthcare). Submissions close 16 Oct, finalists 23 Oct (top 2 per track), Demo Day 3 Nov. Prize pool S$17k (10k/5k/2k). Tools: CodeBuddy, WorkBuddy, Miora. [technode](https://technode.global/2026/09/18/tencent-cloud-ai-singapore-industry-ai-hackathon-dbs-keppel/), [luma kick-off](https://luma.com/26fqf3hy), [tch.cloud.tencent.com](https://tch.cloud.tencent.com/)
- Public coverage describes Keppel's track only as "turning expert knowledge into reusable intelligence". The phrases "AI HARVEST", "Intelligence Pills", "AI Marcus" have **zero public footprint** (searched Keppel newsroom, SGX filings, press). They are launch-talk/handbook coinage. Implication: use them verbatim in the pitch (judges' own words), but do not expect any external doc to define them further.
- Preliminary judging is done by **Keppel + Tencent Cloud experts** using track-specific criteria; the 10x10 generic rubric is the Demo Day rubric. Treat the 11 "Solution should be" properties and the 8 diagram points as the real first-round scorecard.
- The handbook copy-paste error ("solutions for the banking and financial services sector" under the Keppel track) is noise; ignore.

### A2. Keppel's own AI vocabulary (this is the language judges live in)

Keppel's FY2025 Annual Report has a two-page spread "Enabling AI and Embedding AI" (pp. 22-23). Key verbatim items ([AR2025 PDF](https://links.sgx.com/1.0.0/corporate-announcements/CMLEN559K1LSH1QR/880492_1.%20Keppel%20Ltd._Annual%20Report%202025.pdf); same content on the web at [Keppel's AI edge, Nov 2025](https://www.keppel.com/insights/feature-stories/keppels-ai-edge-transforming-asset-management-and-operations-with-intelligence/)):

| Keppel term | What it is (verbatim where possible) | Why it matters for MOSAIC |
|---|---|---|
| **KAI - Keppel AI platform** | "Keppel's proprietary AI operating system that enhances workflows, collaboration and decision making. KAI integrates multiple AI models - including ChatGPT, Claude and Gemini - to improve research and avoid blind spots. It enables the creation of AI agents that think like experts, trained on proprietary data and subject matter expertise. These agents evaluate opportunities using both qualitative and quantitative reasoning, offer real-time recommendations, and collaborate like digital co-workers." Beta in 2025, wide rollout end-2025. SR2025 lists "Microsoft 365 Copilot and Keppel AI (KAI)" as the enterprise tools staff are trained on. | The challenge brief ("intelligence pills that collaborate like a team of specialists") is KAI's positioning restated. KAI is already **multi-model** - so "portable / model-independent" is not an abstract criterion to Keppel, it is how they already build. Pitch pills as the governed, portable knowledge layer that a KAI-style agent host consumes. Never pitch MOSAIC as a replacement platform. |
| **Alpha / Duet / AlphaCore** | Gen-AI apps for deal evaluation (Alpha, "up to four times" faster) and research (Duet); ">50,000 companies analysed, >17,000 questions answered". Investor Day 2026: "AI tools expanded to AlphaCore & KAI". | Shows Keppel measures AI by throughput metrics. Give the pill a health card with numbers. |
| **Athena** | Connectivity Division: "a 'black swan detector', predicting rare but high-impact failures like cooling system breakdowns before they occur. Using signal processing and AI - covering vibration, sound, and higher order harmonics - Athena identifies early warning signs and highlights them to data centre operators." Deployed in one facility, more rollouts underway. Investor Day 2026 labels it "Predictive Maintenance AI". | **Cooling-system failure is Keppel's canonical ops incident.** Athena detects; nobody has publicly described what happens *after* the alert (judgement, escalation, tenant comms). That gap is MOSAIC's slot: "Athena says something is wrong; the pill encodes what the chief engineer would do next." |
| **Agent9D** | Project-execution agent: finds chokepoints, suggests pre-emptive action; targets "30% improvement in timely project delivery and 50% reduction in site changes". | Keppel accepts agents that *recommend* to a human PM. Mirror that posture. |
| **Tellus** | "Geospatial Site Intelligence" (Investor Day 2026 slide "TELLUS / KAI / ATHENA"). | Vocabulary only. |
| **Operations Nerve Centre (ONC)** + **Infrastructure Intelligence (II)** | Infrastructure Division: "Proprietary AI/ML solutions; real-time remote monitoring and control" (Investor Day 2025); Thu Duc City ONC monitors Vietnam energy assets; April 2026 Midea deal: modular cooling "connected to Keppel's state-of-the-art Operations Nerve Centre (ONC)... runs on Keppel's proprietary digital platform, Infrastructure Intelligence (II)". [Keppel EaaS story](https://keppel.com/en/media/newsletters/feature-stories/expanding-keppel-energy-as-a-service-solution-in-asia), [Midea release](https://www.midea.com/sg/news/midea-and-keppel-partner-to-collaborate-on-ai-enabled-modular-cooling-solutions-opportunities-across-asia), [Investor Day 2025 deck](https://www.keppel.com/file/investor-relations/investor-day-2025/keppel-investor-day-2025-management-presentations.pdf) | Name the Incident Decision Room's data source "ONC-style feed / BMS feed". Keppel judges will recognise the pattern. |
| **Integrated Operations and Management Control Centre** | The central control hub of the Seasons Smart Vibrant Precinct, Sino-Singapore Tianjin Eco-City (Seasons City: ~161,800 sqm GFA, 5-storey mall + 3 office towers, Green Mark Platinum). [Keppel smart cities feature](https://www.keppel.com/realestate/Special-Features-Library/Empowering-Smart-Cities---How-Keppel-Is-Transforming-Urban-Spaces-For-The-Future) | This is the **China Real Estate** ops centre - the speaker's division. |
| **Digital twin** | Public Keppel digital twin = Keppel Infrastructure x NUS Kent Ridge campus (sensing + AC/DC hybrid microgrid, 2023). No real-estate-division digital twin found publicly. [SGX release](https://links.sgx.com/1.0.0/corporate-announcements/IMBVGW7KHL7LIH26/778576_MREL_Keppel%20pioneers%20digital%20twin%20and%20innovative%20hybrid%20ACDC%20grid%20to%20manage%20distributed%20energy%20with%20NUS.pdf) | Do not claim a digital-twin integration; say "BMS/iBMS + ONC feeds". |
| **Keppel NEXT / KTAP / Transformation & Innovation** | Keppel NEXT = annual innovation forum; Keppel Technology Advisory Panel (chair Chua Kee Lock, Vertex); Francois van Raemdonck = MD & Head, Transformation & Innovation; Kevin Chng = CFO & Chief Digital Officer. No unit called "Keppel Technology & Innovation" exists in the 2025 org list. | Use "Transformation & Innovation" if you must name a function. |
| **Investor Day 2026 Real Estate slide "AI in action across real estate"** (12 Aug 2026, Louis Lim) | Technical Services: "AI-driven predictive maintenance and smart building diagnostics cut downtime and costs." Leasing: "AI-matched tenant sourcing and dynamic pricing." Asset Management: "Real-time performance analytics and scenario modelling drive portfolio decisions." Thesis slide: "Sensor-run, healthy, efficient, adaptable assets win"; "Buildings become data-generating operating systems." [Investor Day 2026 deck](https://www.keppel.com/file/investor-relations/events-presentations/presentations/2026/keppel-investor-day-2026-presentation-slides.pdf) | **This is the Real Estate CEO's own taxonomy two months ago.** The six pill names in the handbook (Asset Ops, Energy, Leasing, Technical Services, Sustainability, Tenant Experience) map onto it. Quote "cut downtime" as the KPI. |

Also real: Keppel's 1H2026 call claimed "AI is increasingly embedded into our investment, asset management and operating activities... over SGD 100 million in recurring annual run rate" (third-party transcript; cite cautiously). Keppel-AWS framework agreement builds a shared "AI Platform" on Amazon Bedrock; Keppel-Dell (Sep 2025) covers sector AI platforms; Keppel-NTU covers applied AI/robotics/AI DCs.

### A3. The speaker

- Title given: "EVP, President's Office & Operational Excellence, Real Estate Division China". This title does **not** appear in the FY2025 Senior Management list ([PDF](https://www.keppel.com/annualreport2025/theme/default/pdf/overview/keppel-ltd-2025-senior-management.pdf)), so the person sits one tier below. The China Real Estate leadership on that list: **Wong Liang Kit - President, China; CEO, Urban Solutions**; **William Tan - MD, Property Development & Operations, China**; **Eric Goh - Chief Representative, China; CEO, China Fund Management**; **Louis Lim - CEO, Real Estate**. Real Estate Division China HQ is in Shanghai ([contact page](https://keppel.com/realestate/Contact-us)). The speaker almost certainly reports into Wong Liang Kit's President's Office.
- "Operational/Operations Excellence" is a real Keppel function name (AR2024 lists Koh Khai Yang, Executive Director, Operations Excellence in Fund Management & Investment). Expect the speaker to think in SOPs, O&M standardisation, estate management across many assets, retrofit/SUR performance (e.g. INNO88 Seoul: "intelligent building controls... 30% reduction in energy consumption... annual cost savings of approximately $1.2 million"), and China operations (Seasons City, Park Avenue Central Shanghai, Park Avenue Heights Wuxi, Sindora Living senior living in Nanjing/Jinan).
- "AI Marcus" cannot be verified; if the speaker's first name is Marcus, the phrase means "a pill that is a digital clone of my judgement". Either way, the pitch line "an expert's judgement outlives the expert" is what he asked for.
- Consequence: a **China mixed-use commercial sub-centre** (mall podium + office towers, like Seasons City) is the most *speaker-native* asset; a **Singapore Grade A office + colocation DC** is the most *Keppel-SG/Tencent-SG-judge-native*. See A6 for the recommendation.

### A4. Asset universe and the operating structure (who the "Asset Operations Manager" really is)

**Singapore offices (Keppel REIT)** - [factsheet 2025](https://www.keppelreit.com/file/investor-relations/publications/factsheet/kreit-fact-sheet-2025-fa-web.pdf), [FY2025 results](https://links.sgx.com/1.0.0/corporate-announcements/XXOEHDSMS5UXGAF6/874046_KREIT%20FY%202025_Unaudited%20Results.pdf): Ocean Financial Centre (79.9%), Marina Bay Financial Centre T1/T2 + Link Mall (33.3%) and T3 (two-thirds after 31 Dec 2025), One Raffles Quay (33.3%), Keppel Bay Tower (100%). 495 tenants; banking/insurance/financial 34.7% of rent; DBS is MBFC's anchor. All SG assets Green Mark Platinum or Platinum (Super Low Energy) + WELL Health-Safety. Keppel's own registered office is Keppel Bay Tower.

**Keppel Bay Tower** - first Green Mark Platinum (Zero Energy) commercial building in Singapore (Dec 2020): EUI below 115 kWh/m2/yr (benchmark office 219), 2.2m kWh/yr saved, ~S$400k/yr, "intelligent building control system" with "high-precision physics-based simulation engine", ML-driven fresh-air intake, cooling tower water management, smart LED, 400 m2 PV, 100% green leases. [Keppel feature](https://keppel.com/realestate/Special-Features-Library/Keppel-Bay-Tower-a-green-building-of-the-future), [BCA release](https://www1.bca.gov.sg/resources/newsroom/keppel-bay-tower-certified-as-singapore-s-first-green-mark-platinum-zero-energy-commercial-building/). Keppel South Central (completed 2025) is Green Mark Platinum SLE targeting >30% energy improvement.

**Operating structure (critical for the governance story)**: Keppel REIT SR24 - "Each property is overseen by a dedicated team of property and facility managers, with whom the Manager collaborates to ensure regular building maintenance and property enhancements." **Raffles Quay Asset Management Pte Ltd (RQAM)** is "the property manager for Marina Bay Financial Centre and One Raffles Quay" (bizSAFE Star). [KREIT SR24](https://keppelreit.com/file/sustainability/sustainability-report/kreit-sr24-website.pdf). Keppel DC REIT: facility managers "appointed pursuant to the facility management agreements"; FMs for KDC SGP 1-5, 7, 8 are Keppel-owned entities (Keppel DC Singapore 1 Ltd, Keppel DC Singapore 2 Pte Ltd, Keppel DCS3 Services Pte Ltd). [KDCR AR2025](https://www.keppeldcreit.com/en/file/investor-relations/publications/annual-report/kdcr-ar2025.pdf). So the real "Asset Operations Manager" sits at the **REIT manager / asset-management layer supervising property & facility managers**. Model MOSAIC's roles as: Expert (chief engineer at the FM), Asset Operations Manager (Keppel asset management), Approver (Head of Technical Services), Tenant Experience lead - this is the actual chain of accountability.

**Data centres (Keppel DC REIT)** - KDC SGP 1-5, 7, 8 (SGP 9 to start mid-2026 at the Genting Lane AI-ready campus); fully-fitted (colocation) vs shell-and-core; ~12% PUE improvement on AEI colocation assets, independently assured (target 10%, one year early); ISO 14001/45001/46001/50001; "using AI for predictive machine learning"; "continuous monitoring and recalibration of temperature setpoints to avoid overcooling... identify and prevent power leakage"; "optimise and/or right-size chillers and computer room air conditioners"; "hot or cold aisle containment"; climate table: "installation/enhancement of drainage systems, water leak sensors and building elevation"; "cooling infrastructure includes built-in redundancies". Real incident: fire on 7 May 2026 in the **technical room** of Almere DC (master-leased; tenant operates), holding statement within 24h, "assessment of the damage and the initiation of operational recovery efforts" ([statement](https://wpcms.keppel.com/wm/cms-site/kpl/file/media/2026/May/08-may-kdcreit/almere-dc-incident-holding-statement-final.pdf)). No public Keppel water/CRAH incident. Nearest Singapore precedent: Equinix SG, 14 Oct 2023 - contractor closed chilled-water buffer-tank valves during a planned upgrade, halls overheated, DBS and Citi down for hours, MAS 4-hour rule breached ([DCD](https://datacenterdynamics.com/en/news/equinix-blames-singapore-outage-on-third-party-contractor)).

**China / Vietnam / US**: Seasons City (Tianjin Eco-City; mall + office towers, Green Mark Platinum, IOMCC), Park Avenue Central Shanghai (office+retail), Park Avenue Heights Wuxi (mixed-use), Sindora Living (senior living, Nanjing/Jinan), Saigon Centre (45% via Keppel Land Watco; Phase 3 divestment announced 2025), KORE US REIT (Plaza Buildings Bellevue, Westmoor Center Denver, etc.). [AR2025 major properties], [KORE AR2025](https://links.sgx.com/1.0.0/corporate-announcements/ZWF7N0FSUEGR5TPW/880319_KORE%20US%20REIT%20Annual%20Report%202025.pdf).

### A5. Vocabulary and KPIs the demo should use (so it reads as Keppel, not generic PropTech)

Operational vocabulary (all verbatim from Keppel REIT SR24 / Keppel DC REIT AR2025 / SR2025):
- Systems: BMS / **iBMS** (integrated Building Management System), VAV boxes, AHUs, chiller plant / "energy efficient chiller systems", cooling tower water management, "smart indoor temperature sensors", "water leakage detectors and isolation sub-valves to enable quicker identification and mitigation of water losses", "smart water management systems that offer real-time monitoring and analytics", sump pits and pumps, service-room curbs (MBFC/ORQ), pump alarms, drainage/gutter inspection under **PPM (Planned Preventative Maintenance)**.
- DC: PUE, WUE, CRAC/CRAH, chilled-water loop, hot/cold aisle containment, temperature setpoints, "built-in redundancies", facility manager (FM) under facility management agreement, colocation vs shell-and-core, hyperscale client, SLA.
- Governance/safety: Zero Fatality Strategy, bizSAFE Star, ISO 45001, business continuity plans, Cyber Incident Response plan, "asset enhancement initiatives (AEI)", GRESB, WELL Health-Safety Rating, Green Mark Platinum (SLE), NABERS.
- Business: Real Estate-as-a-Service (REaaS), Sustainable Urban Renewal (SUR), asset-light, fee-based income, "tenant satisfaction surveys... on-site services, building management, maintenance, cleanliness, security, management personnel and eco-friendly features", green leases.

KPIs to put on screens: EUI (kWh/m2/yr; KBT <115), energy intensity (GJ/m2; Keppel REIT 1.33 in 2024), water withdrawal intensity (ML/m2; 0.0022), PUE (and the 12% AEI improvement), downtime / MTTR, tenant satisfaction score, PPM compliance, SLA credits avoided, time-to-escalation, "cut downtime and costs" (Louis Lim's words).

Naming: use **fictional** assets with Keppel-like attributes (e.g. "Harbourfront Tower, Grade A office, Green Mark Platinum SLE, EUI 112, anchor tenant: a bank" and "DC SGP-X, fully-fitted colocation, PUE 1.32"). Do not use real Keppel property names or logos - avoids factual nitpicks and impersonation issues, while every attribute still reads as Keppel.

### A6. Demo incident: water ingress in a mixed-use asset vs alternatives

| Option | For | Against |
|---|---|---|
| **A. Water ingress, mixed-use (current plan)** | Visual, universally understood; spans Technical / Tenant / Safety pills; Keppel REIT literally lists leak detectors, isolation sub-valves, sump pumps, service-room curbs; "extreme precipitation" is the first row in both Keppel REIT's and Keppel DC REIT's climate-risk tables; mixed-use = Seasons City / Saigon Centre = the speaker's world. | Reads as "FM 101 / janitorial"; the *expert judgement* content is thin (mop, isolate, claim); weak link to Keppel's stated AI priorities (predictive maintenance, cooling). Judges may ask "where is the know-how that isn't already in the SOP?" |
| **B. DC chilled-water / CRAH leak or chiller fault** | Cooling failure is Keppel's own flagship AI narrative (Athena); Equinix 2023 gives a Singapore precedent with regulatory and tenant stakes; rich judgement calls (isolate loop vs ride-through on thermal mass, when to notify a hyperscale client, when to shed load); PUE/setpoint vocabulary. | DC ops are heavily proceduralised (MOPs/SOPs/EOPs) - the "undocumented expertise" story is harder; Tenant Experience pill fits poorly (clients, not tenants); risk of looking like autonomous control of critical infrastructure; harder for generalist judges to follow. |
| **C. Grade A office cooling loss (chiller trip) on a hot afternoon, bank anchor tenant** | Cooling = Keppel's theme; tenant experience is real (trading floor comfort, SLA); undocumented know-how is genuine (chiller staging, which vendor to call, how to talk to the anchor tenant); BMS/iBMS/VAV/AHU vocabulary straight from Keppel REIT SR. | Less visually dramatic than water. |

**Recommendation: keep the team's water-ingress plan but make the water come from the chilled-water system** - a chilled-water riser/AHU leak in a Grade A office tower that (i) floods a tenant ceiling (water ingress) and (ii) degrades cooling to the bank tenant's floors. This is a near-zero-rework change that fuses A and C: it keeps water ingress + three pills, and gains Keppel's cooling vocabulary (isolation sub-valves, leak detectors, chiller/AHU, BMS alarms, setpoints). Then, for the Scalable/Reusable criteria, show the **same Technical Services pill re-applied to a colocation DC** (CRAH/chilled-water leak) with an asset-profile overlay that changes the gates (client SLA notification instead of tenant message; no floor re-opening logic). That covers two of the three asset types named in the challenge (office + data centre) with one pill, which is precisely the "reusable rather than one-off" point the diagram must prove. Drop "mixed-use" unless you want to court the China speaker specifically; if so, make the second asset a mall-podium + office sub-centre instead of the DC.

---

## PART B - RED TEAM OF THE MOSAIC PLAN

Blunt summary first: **the plan is roughly 2x what 1-3 people can ship in 5 days**, and its biggest differentiator (a pill is a compiled, testable, versioned decision artefact - not a prompt) is implicit rather than demonstrated. Seven screens, two modes, voice, three pills, contradiction checking, counterfactuals and version diffs: judges will reward one closed loop that works end-to-end over seven screens that half-work. The Keppel-side scorecard (11 properties + 8 diagram points) is what gets you into the top 2; the generic 10 dims only matter on Demo Day.

### B1. Generic rubric (10 x 10) - projected score if the current plan ships as described, and the real risk

| Dimension | Projected | Risk / fix |
|---|---|---|
| Impact & Relevance | 8 | Directly on the problem statement. Loses points if the incident feels generic; fix via A6 and Keppel KPIs on screen. |
| Human-Centred Design | 6-7 | Too many personas (expert, AOM, FM tech, tenant, approver). Pick two primary users: the retiring Chief Engineer (capture) and the Asset Operations Manager (incident). Everyone else is a name in a RACI. |
| AI Interaction | 7 | Interview-to-rules extraction with provenance is strong. Incident mode risks "agents talking" theatre. Show the AI being **wrong and corrected** at least once - that is the depth judges look for. |
| Technical Execution | 5 | Over-scope. Half-finished screens read as incompetence, not ambition. See B4 cuts. |
| Feasibility | 6-7 | Mock data is fine; the missing piece is the integration path (BMS/iBMS alarms, CMMS work orders, FM agreements, RQAM-type property managers) and the Tencent stack mapping. One diagram slide fixes it. |
| Demo & Storytelling | 8 potential | The arc "the expert leaves; his judgement stays, governed" is excellent. Two modes = two demos; thread them with one person's story (same expert's words show up as the rule that blocks the unsafe action). |
| Innovation & Creativity | 7 | Pill-as-artefact with provenance, deterministic gates and counterfactual is novel. "Multi-agent orchestrator" framing is commodity - de-emphasise it. |
| UX & Accessibility | 5-6 | Dense dashboards, no accessibility story. Voice capture helps; add keyboard flow and plain-language "Why" text. |
| Responsible AI & Ethics | 8 | Gates, provenance, bounded actions. Add evidence-based confidence, audit log, RBAC and you are at 9. |
| Overall / Impression | 7 | Hinges on whether the loop closes live without a crash. |

### B2. The 11 "Solution should be" properties

| Property | Status | Gap and fix |
|---|---|---|
| Human-supervised | **Covered** | Decision Canvas (expert confirms each tile) + Approval Panel. Make the "nothing executes without a named human" rule visible on every action chip. |
| Transparent | **Covered** | "Why this action?" drawer + provenance to transcript segment. Add "which pill version" and "which evidence items" to the drawer. |
| Accountable | **Weak** | Owners/deadlines on actions exist, but **who owns the pill** is undefined. Add per-pill RACI: Owner (domain expert), Steward (AOM), Approver (Head of Technical Services), review cadence; and an immutable audit log (who approved/escalated what, when, on which version). |
| Reliable | **Missing** | Nothing checks recommendations. Add: pill compiled into tests/evals; replay on past incidents; eval pass rate shown in the registry; approval blocked if evals regress. |
| Reusable | **Covered / thin** | Pill export exists, but reuse is only asserted. Demonstrate the same pill on a second asset (A6). |
| Scalable | **Weak** | "Portfolio Pulse" is a screen, not a mechanism. Replace with the mechanism: pill + asset profile overlay (parameters per asset type) + registry showing coverage across N assets. |
| Governed | **Covered / hand-wavy** | review -> validate -> version -> approve exists; "validate" is undefined. Define it as "evals pass + steward sign-off"; add shadow mode before release. |
| Portable | **Covered in principle** | JSON/YAML export. Make it concrete: pill = SKILL.md + rules.yaml + evals + provenance, plain text, model-agnostic; demo a model swap with identical decision (gates are deterministic). Note Keppel's KAI is already multi-model - speak to that. |
| Version-controlled | **Partial** | Diff for approval exists; **rollback is not demonstrated**. Add semantic versions, CHANGELOG, one-click rollback with reason. |
| Secure | **Missing** | No role/sensitivity model. Add sensitivity labels on evidence (tenant PII, lease commercial terms, CCTV) and role views (Technician / AOM / Tenant Experience / Exec) with a role switcher in the demo; pills themselves carry an access scope. |
| Clearly bounded | **Covered** | Recommend / Requires approval / Must escalate. Make it a mandatory `action_class` field on every rule, colour-coded, and show "outside approved scope -> escalate to named human" firing. |

### B3. The 8 diagram points

| # | Point | Status | Fix |
|---|---|---|---|
| 1 | Business problem | Covered | Quantify: single-expert dependency, onboarding time, inconsistency across assets, retirement loss - and Keppel's words "cut downtime and costs". |
| 2 | Whose expertise and how undocumented knowledge is obtained | Covered | Name the role precisely (Chief Engineer / Senior Property Manager, 20+ yrs at the asset, employed by the FM). Interview is adaptive and incident-anchored ("walk me through the last time..."), with contradiction probes. |
| 3 | How it becomes reusable | Covered | Show the pill file and the second-asset application. |
| 4 | How the AOM uses/supervises/verifies/escalates | Covered | Incident Decision Room + Approval Panel; add the evidence-coverage meter so "verify" is concrete. |
| 5 | Why more than a chatbot/RAG | Covered but must be argued explicitly | One slide: RAG retrieves text; a pill is executable, has deterministic gates, provenance, tests, versions, owners, and a learning loop. Chatbots cannot be rolled back. |
| 6 | Feedback reviewed/validated/versioned/approved | Covered / weak on "validated" | Evals + shadow mode + approval. |
| 7 | Extend to multi-asset / BU / enterprise | **Weak** | Registry + asset profiles + the fact that the pill is a SKILL.md package installable in WorkBuddy/CodeBuddy/ADP = enterprise distribution path. |
| 8 | Credible implementation path | **Missing** | Map to Tencent: WorkBuddy "Skills & Expert Center" (install skills, "distill them into experts, and enable multi-expert collaboration"; team sharing of "skills, experts and knowledge base (RAG)"; "Create, version and deploy custom agents"; skills "scanned for security risks before installation"; "confirmation for sensitive operations"; RBAC admin/member/viewer) [WorkBuddy](https://www.tencentcloud.com/act/pro/workbuddy); ADP custom skills = ZIP with SKILL.md at root, YAML metadata, **semantic versioning**, automated sandbox security review, **enterprise sharing requires approval in the Approval Center** [ADP docs](https://www.tencentcloud.com/document/product/1254/81540); ADP multi-agent + workflow modes + knowledge base + workspace permissions [ADP docs](https://www.tencentcloud.com/document/product/1254/78765); CodeBuddy skills = `.codebuddy/skills/<name>/SKILL.md` with `name`, `description`, `allowed-tools`, `scripts/` [CodeBuddy docs](https://www.tencentcloud.com/document/product/1256/77295); TRTC ASR for the interview; Agent Runtime sandbox for executing rule checks. Integration: BMS/iBMS alarm feed, leak-detector telemetry, CMMS work orders, FM agreement SLAs. |

### B4. Scope to cut to ship in 5 days

**Must ship (the golden path, one asset pair, one expert):**
1. Expert Capture from a **transcript** (pre-recorded audio or text; browser ASR optional) -> rule extraction -> Decision Canvas confirm -> export pill (SKILL.md + rules.yaml + evals).
2. Pill Registry: list with version, owner, status (Draft / Shadow / Approved / Retired), eval pass rate, assets covered.
3. Incident Decision Room: scripted evidence timeline (leak detector, BMS alarm, tenant call), pill selection, decision graph, deterministic gates, Recommend / Approve / Escalate chips, "Why this action?" drawer, tenant message draft.
4. Outcome & Learning: outcome capture -> expert correction -> version diff -> run evals -> approve -> **rollback**.
5. Proof pack: >=3 CodeBuddy/WorkBuddy screenshots (take them from day 1), GitHub repo, live URL, diagram, 16:9 cover, <10-word blurb, 5-8 min video.

**Cut or shrink:**
- Live adaptive voice interview with real-time follow-ups -> pre-recorded 90-second clip + transcript; the "adaptive" part becomes one scripted follow-up question.
- Contradiction checking -> one scripted contradiction (two transcript spans disagree on a threshold), surfaced on the Canvas.
- Portfolio Pulse -> one card in the Registry ("Technical Services v1.3 covers 3 assets; 2 pending corrections").
- Counterfactual "What would change the decision?" -> keep only if rules are data (then it is a 20-line function: list unmet evidence/gates). Otherwise cut.
- Three pills -> two (Technical Services; Tenant Experience). Safety/Sustainability becomes a gate inside Technical Services ("LEW sign-off before re-energising").
- Seven screens -> four (Capture, Registry, Incident Room, Learning).
- Multi-agent choreography -> **do not build three LLM agents talking**. The handbook says explicitly "a pill need not correspond one-to-one with an agent." One orchestrator, pills as data. Cheaper and more defensible.
- Any real BMS/IoT integration -> none; mock feed with timestamps and sensor IDs.

### B5. The 2-3 "wow" moments most likely to win

1. **The gate blocks the agent, and the block is traceable to a human sentence.** The orchestrator proposes "re-energise floor 23 AHU"; a red gate refuses: "Rule TS-07 (v1.2) requires LEW sign-off and moisture < X; evidence missing. Owner: Head of Technical Services. Source: Chief Engineer interview 00:14:32." AOM clicks Escalate. One frame shows human-supervised, transparent, bounded, accountable.
2. **The expert disagrees, the system shows its receipts, then learns.** During outcome capture the Chief Engineer says the threshold was wrong; the diff v1.2 -> v1.3 shows the exact change, the evals replay 6 past incidents (5 pass, 1 flagged), approval requires the steward, then a **rollback button** returns to v1.2 in one click. "How does it get smarter after deployment?" answered live.
3. **Same pill, different asset, same model-agnostic decision.** Apply Technical Services v1.3 to the colocation DC profile: the tenant-message action disappears, a client-SLA notification gate appears. Optionally swap the model (Hunyuan -> DeepSeek) and the decision is identical because gates are deterministic. Portability and scalability made visible in 30 seconds.

### B6. Differentiation risks

What most teams will build: a RAG chatbot over SOP PDFs, three named "agents" (Technical Services Agent, Leasing Agent, Tenant Agent) that chat in a transcript, an "approve" button, and a slide claiming governance. Judges will see ten of these.

How MOSAIC stands apart (only if demonstrated, not asserted):
- A pill is a **compiled artefact** (rules + gates + tests + provenance + owner + version), not a prompt or a vector index.
- **Provenance to the spoken word** (transcript span per rule).
- **Deterministic gates** that an LLM cannot talk its way past.
- **Evals/regression + shadow mode + rollback** - the governance loop is executable, not a diagram.
- **Keppel-native** vocabulary, KPIs and operating structure (REIT manager -> property/facility manager -> FM contractor).

Risks that erase the difference:
- UI shows "agents chatting" -> you look like everyone else. Show rules firing, not chat.
- Over-scope -> half-working demo loses to a smaller working one.
- Water ingress framed as janitorial -> fix via A6.
- "Smarter after deployment" asserted, not shown -> fix via B5.2.
- No Tencent-stack mapping -> Tencent judges mark Feasibility down; proof-of-use screenshots are a hard gate ("Without proof, the project will not proceed to scoring").

### B7. Improvements (ranked by value / effort)

1. **Pill = SKILL.md package.** `pills/technical-services/chilled-water-leak/` containing `SKILL.md` (YAML: name, description, version, owner, steward, approver, scope, action_classes, allowed-tools; body: the heuristics in prose for the LLM), `rules.yaml` (trigger / required_evidence / decision / action_class / escalation / owner / deadline), `evals/*.yaml` (replayed incidents with expected decisions), `provenance.json` (rule -> transcript spans), `CHANGELOG.md`. Same package installs into CodeBuddy (`.codebuddy/skills/`), WorkBuddy (Skills & Expert Center), ADP (ZIP import, semver, Approval Center) and any SKILL.md-compatible host. Portable, vendor-neutral, version-controlled by construction - and it doubles as your "credible path" slide and your proof-of-use (install the pill in WorkBuddy, screenshot it).
2. **Pill compiled into tests.** Every rule emits a test; "validate" in the governance loop = run the evals; a version cannot be approved if evals regress. Show the pass/fail matrix in the diff view.
3. **Regression on replayed past incidents.** Seed 6-10 synthetic past incidents with the expert's recorded decision; "Replay" runs the pill against them; report agreement rate and false-escalation rate. This is the Reliable criterion.
4. **Shadow mode.** New versions run silently alongside the approved version on live incidents; the registry shows "Shadow: 4/4 agreements" before promotion. One badge and one counter.
5. **Evidence-based confidence, not LLM probabilities.** "Decision confidence: 2 of 3 required evidence items confirmed -> cannot approve; escalate." Calibration = coverage of required evidence + rule maturity (incidents applied, agreement rate). Avoid fabricated percentages; judges on Responsible AI will probe.
6. **RACI + audit log** per pill and per decision (user, time, pill version, action class, outcome).
7. **Sensitivity labels and role views** (Technician / AOM / Tenant Experience / Exec); tenant PII and lease terms masked for Technician.
8. **Pill health card** in the registry: version, assets covered, incidents applied, expert agreement %, eval pass %, pending corrections, next review date. This single card answers "how does it get smarter" and "how does it scale".
9. **Mandatory `action_class` on every rule**: Recommend / Requires approval / Must escalate (outside approved scope), colour-coded everywhere.
10. **Keppel-native skin**: fictional Grade A office (Green Mark Platinum SLE, EUI ~112, bank anchor tenant) + fictional colocation DC (PUE 1.32); evidence feed labelled BMS/iBMS, leak detector, isolation sub-valve, CMMS; KPIs: downtime avoided, tenant satisfaction, PPM compliance, SLA credits avoided.

### B8. Five-day plan (team of <=3)

- **Day 1 (Sat):** Freeze scope to B4. Hand-write both pills (SKILL.md + rules.yaml + 6 evals each). Define the data model (Pill, Rule, Evidence, Incident, Decision, Version, AuditEvent). Scaffold the app in CodeBuddy; **take proof screenshots from the first prompt**. Write the 10-word blurb and the diagram outline.
- **Day 2 (Sun):** Expert Capture: transcript upload -> LLM extraction into rules -> Decision Canvas (confirm / edit / reject tiles, provenance pop-over, one contradiction) -> export package.
- **Day 3 (Mon):** Incident Decision Room: scripted evidence timeline, pill selection, deterministic gate engine (pure functions over rules.yaml), action chips with action_class, Why drawer, tenant message, Escalate flow with named human.
- **Day 4 (Tue):** Learning loop: outcome capture -> correction -> diff -> eval run -> approve/rollback; Registry with health cards and shadow badge; role switcher; audit log. Deploy to a live URL. Second-asset overlay (DC).
- **Day 5 (Wed):** Diagram (8 points, one page), video (5-8 min, include the CodeBuddy/WorkBuddy reflection the handbook asks for), project description, cover image, README. Three full dry-runs; fix only what breaks.

Suggested blurb (<10 words): "Turn expert judgement into governed, versioned Intelligence Pills." (9 words)

---

## Appendix A - Keppel facts worth quoting in the pitch (with source)

- "AI agents that think like experts, trained on proprietary data and subject matter expertise... collaborate like digital co-workers" - Keppel AR2025 p.23 / Keppel Insights Nov 2025.
- "Athena acts as a 'black swan detector', predicting rare but high-impact failures like cooling system breakdowns before they occur" - same.
- "AI-driven predictive maintenance and smart building diagnostics cut downtime and costs" (Technical Services) - Keppel Investor Day 2026, Real Estate section.
- "Each property is overseen by a dedicated team of property and facility managers, with whom the Manager collaborates" - Keppel REIT SR24.
- "deploying water leakage detectors and isolation sub-valves to enable quicker identification and mitigation of water losses" - Keppel REIT SR24.
- "~12% reduction in effective PUE for fully-fitted (colocation) assets that underwent major asset enhancement works... independently assured" - Keppel DC REIT AR2025.
- Keppel Bay Tower: first Green Mark Platinum (Zero Energy) commercial building; EUI <115 kWh/m2/yr - BCA / Keppel.

## Appendix B - What was searched and not found (so nobody wastes time)

- "KAI" as a smart-building platform: KAI is Keppel's enterprise AI operating system (deal/research/KYC, multi-model), not a building-ops product.
- "AI Harvest", "Intelligence Pills", "AI Marcus": no public footprint.
- The speaker's exact title: not in any Keppel public leadership list.
- A Keppel real-estate digital twin or "integrated operations centre" for Singapore offices: none public; closest are the Tianjin IOMCC (Real Estate China) and the Infrastructure ONC.
- Any Keppel water-ingress / CRAH incident: none public; only the Almere technical-room fire (May 2026).
- "Keppel Technology & Innovation" as a unit: does not exist under that name.

## Appendix C - Source URLs

Hackathon: https://technode.global/2026/09/18/tencent-cloud-ai-singapore-industry-ai-hackathon-dbs-keppel/ ; https://luma.com/26fqf3hy ; https://tch.cloud.tencent.com/
Keppel AR2025: https://links.sgx.com/1.0.0/corporate-announcements/CMLEN559K1LSH1QR/880492_1.%20Keppel%20Ltd._Annual%20Report%202025.pdf
Keppel AI edge (Nov 2025): https://www.keppel.com/insights/feature-stories/keppels-ai-edge-transforming-asset-management-and-operations-with-intelligence/
Keppel SR2025: https://www.keppel.com/file/sustainability/sustainability-reports/keppel-sustainability-report-2025.pdf
Keppel Investor Day 2025: https://www.keppel.com/file/investor-relations/investor-day-2025/keppel-investor-day-2025-management-presentations.pdf
Keppel Investor Day 2026: https://www.keppel.com/file/investor-relations/events-presentations/presentations/2026/keppel-investor-day-2026-presentation-slides.pdf
Senior management 2025: https://www.keppel.com/annualreport2025/theme/default/pdf/overview/keppel-ltd-2025-senior-management.pdf
Keppel RE contact (Shanghai HQ): https://keppel.com/realestate/Contact-us
Keppel REIT SR24: https://keppelreit.com/file/sustainability/sustainability-report/kreit-sr24-website.pdf
Keppel REIT factsheet 2025: https://www.keppelreit.com/file/investor-relations/publications/factsheet/kreit-fact-sheet-2025-fa-web.pdf
Keppel REIT FY2025 results: https://links.sgx.com/1.0.0/corporate-announcements/XXOEHDSMS5UXGAF6/874046_KREIT%20FY%202025_Unaudited%20Results.pdf
Keppel Bay Tower: https://keppel.com/realestate/Special-Features-Library/Keppel-Bay-Tower-a-green-building-of-the-future ; https://www1.bca.gov.sg/resources/newsroom/keppel-bay-tower-certified-as-singapore-s-first-green-mark-platinum-zero-energy-commercial-building/
Keppel DC REIT AR2025: https://www.keppeldcreit.com/en/file/investor-relations/publications/annual-report/kdcr-ar2025.pdf
Almere statement: https://wpcms.keppel.com/wm/cms-site/kpl/file/media/2026/May/08-may-kdcreit/almere-dc-incident-holding-statement-final.pdf
KDC SGP 9: https://w.media/keppel-to-build-third-ai-data-center-in-mid-2026/
Equinix SG 2023: https://datacenterdynamics.com/en/news/equinix-blames-singapore-outage-on-third-party-contractor
ONC: https://keppel.com/en/media/newsletters/feature-stories/expanding-keppel-energy-as-a-service-solution-in-asia ; https://www.midea.com/sg/news/midea-and-keppel-partner-to-collaborate-on-ai-enabled-modular-cooling-solutions-opportunities-across-asia
Tianjin IOMCC: https://www.keppel.com/realestate/Special-Features-Library/Empowering-Smart-Cities---How-Keppel-Is-Transforming-Urban-Spaces-For-The-Future
NUS digital twin: https://links.sgx.com/1.0.0/corporate-announcements/IMBVGW7KHL7LIH26/778576_MREL_Keppel%20pioneers%20digital%20twin%20and%20innovative%20hybrid%20ACDC%20grid%20to%20manage%20distributed%20energy%20with%20NUS.pdf
Keppel-NTU: https://www.ntu.edu.sg/news/detail/keppel-and-ntu-to-advance-applied-ai--robotics-and-future-ready-ai-data-centres
KORE AR2025: https://links.sgx.com/1.0.0/corporate-announcements/ZWF7N0FSUEGR5TPW/880319_KORE%20US%20REIT%20Annual%20Report%202025.pdf
WorkBuddy: https://www.tencentcloud.com/act/pro/workbuddy
ADP custom skills: https://www.tencentcloud.com/document/product/1254/81540 ; ADP agents/workflows: https://www.tencentcloud.com/document/product/1254/78765
CodeBuddy skills: https://www.tencentcloud.com/document/product/1256/77295
