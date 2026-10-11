# MOSAIC — Domain Research Report

Prepared 2026-10-11 for the Keppel "AI HARVEST" track (Tencent Cloud AI CAN DO IT SG 2026). Deadline 2026-10-16.

Scope: (1) knowledge-elicitation methods and a probe library for the AI interviewer; (2) water-ingress incident response in commercial buildings with a seed rule set; (3) governance frameworks and how MOSAIC's recommend/approve/escalate tiers map to them; (4) building-data standards for pill portability; (5) quantified business value.

Confidence legend used throughout:
- **[verified]** read from the primary document or source page in this research session.
- **[secondary]** reported by a reputable secondary source (law firm, trade press, repository abstract); primary not opened.
- **[standard ref]** canonical textbook/paper reference from the literature; not re-opened here.
- **[verify before slide]** number or wording we could not confirm; use with a caveat or drop.

---

## 0. One-paragraph synthesis for the pitch

MOSAIC's Expert Capture mode is, in human-factors terms, a **Cognitive Task Analysis (CTA) interview run by an agent**. The best-evidenced CTA protocols — Klein's **Critical Decision Method (CDM)** and Militello & Hutton's **Applied CTA (ACTA)** — are built around a small, fixed set of *probes* (cues, knowledge, goals, options, basis, hypotheticals, expert–novice contrast) applied to *specific remembered incidents*, not to generalities. That maps one-to-one onto MOSAIC's rule fields (trigger ← cues/noticing; evidence ← knowledge/big picture; decision ← options/basis; exception ← hypotheticals/anomalies; forbidden action ← "errors a novice would make"; escalation ← time-pressure/self-monitoring; owner ← task diagram; outcome ← "how did you know it worked"). Recent LLM work (ASK Assistant–Scribe–Knowledge-Checker, GATE, Geiecke & Jaravel's AI-led interviews, K-GRASP, PKAI, LadderTeam, SOP-Agent) shows interviews run by an LLM with a *schema-constrained scribe* and a *gap-checker* produce more complete, more consistent specifications than experts writing documents themselves — exactly the Decision Canvas + contradiction-check loop. Governance-wise, Singapore's own IMDA Model Framework (2020) defines human-in/over/out-of-the-loop and a probability–severity matrix; the 2026 **Model AI Governance Framework for Agentic AI** adds approval checkpoints for irreversible actions, deny-by-default, and *human override rate* as a health metric. MOSAIC's tiers (recommend / approve / escalate) plus deterministic gates sit squarely on those texts, and on ISO/IEC 42001 Annex A (A.6.2.8 event logs, A.9.4 intended use), NIST AI RMF (GOVERN 3.2, MAP 3.5, MANAGE 2.4), and EU AI Act Art. 14. For portability, reference **Brick 1.5** classes (verified: `Switchgear`, `Electrical_Room`, `Leak_Alarm`, `Water_Leak_Sensor`, `Water_Loss_Alarm`, `Sump`-type pumps) and **Project Haystack 4** tags for equipment, **COBie/ISO 19650-3** for the asset register, **ISO 41001/55001** for the management-system hooks.

---

## 1. Knowledge elicitation: methods, probes, and recent LLM work

### 1.1 Method family and what each is good for

| Method | Origin | Core mechanic | What it surfaces | MOSAIC use |
|---|---|---|---|---|
| **Critical Incident Technique (CIT)** | Flanagan 1954 [standard ref] | Ask for specific memorable incidents, not opinions | Concrete cases | Opening of each capture session |
| **Critical Decision Method (CDM)** | Klein, Calderwood & MacGregor 1989 (IEEE Trans. SMC) [verified abstract]; Hoffman, Crandall & Shadbolt 1998 (Human Factors 40(2):254–276) [verified abstract] | Multi-pass ("sweep") retrospection of one non-routine incident guided by cognitive probes; grounded in Recognition-Primed Decision model | Cues, expectancies, goals, options, basis for choice, time pressure, hypotheticals, expert–novice differences; outputs Situation Assessment Records, timelines, decision requirements | Main engine of the Expert Onboarding Call |
| **Applied CTA (ACTA)** | Militello & Hutton 1998 (Ergonomics) [verified abstract, 603 cites] | Three streamlined interviews: Task Diagram → Knowledge Audit → Simulation Interview; output Cognitive Demands Table | Roles/steps, "job smarts", noticing, anomalies, equipment difficulties, errors a novice would make | Task Diagram = owner/role map; Knowledge Audit = cues & exceptions; Simulation = what-if walk-through |
| **Repertory grid** | Kelly 1955 (Personal Construct Psychology) [standard ref]; Fransella, Bell & Bannister manual [verified abstract]; Jankowicz 2003 [verified abstract] | Triadic elicitation ("how are two of these alike and different from the third?") → bipolar constructs → ratings grid | Hidden distinctions experts use to classify situations; inconsistencies between constructs | Contradiction checking: present three past incidents/rules and elicit the distinguishing construct |
| **Laddering** | Hinkle 1965; Reynolds & Gutman 1988 [standard ref]; Corbridge et al. 1994 (Knowledge Acquisition) [verified abstract — "most productive technique" in comparative study] | Ladder *up* ("why does that matter?") to goals/values; ladder *down* ("how do you tell? give an example") to observable cues | Hierarchy from cue → rule → goal; concrete indicators | Turns vague advice into testable triggers and outcomes |
| **Think-aloud / protocol analysis** | Ericsson & Simon 1980 (Psych. Review), 1993 (Protocol Analysis, MIT Press) [standard ref]; Crandall 1989 comparison with CDM [verified abstract] | Concurrent verbalisation during a task; retrospective report immediately after | Process in the moment; low interviewer bias if no "why" prompts during the task | Simulation walk-through of the demo incident with a live evidence feed |
| **Contrived techniques (sorting, grids, laddering)** | McGeorge & Rugg 1992 [verified abstract]; Hoffman, Shadbolt, Burton & Klein 1995 [secondary] | Tasks experts do not normally do; expose tacit structure | Knowledge "not readily apparent" from interviews/self-report | Second-session consolidation across experts |

Reference chapter covering all of the above: Shadbolt & Smart (2015) "Knowledge Elicitation: Methods, Tools and Techniques", in Wilson & Sharples (eds.) *Evaluation of Human Work*, 4th ed., CRC Press, pp. 163–200 [verified bibliographic record, eprints.soton.ac.uk/359638]. Practitioner handbook: Crandall, Klein & Hoffman (2006) *Working Minds: A Practitioner's Guide to Cognitive Task Analysis*, MIT Press [standard ref].

Why experts need probes at all: Crandall (1989) notes tacit knowledge is "among the most difficult for experts to articulate on their own" and that unstructured interviews bias toward what fits simple if/then rules [verified abstract]. Crandall et al. (1993) showed CDM interviews elicited significantly more information than non-CDM interviews with NICU nurses and produced an assessment guide containing cues "not available in the current literature" [verified abstract]. Okoli (2020, 2021) used CDM with 31 fire commanders to extract 134 decision points and a 42-item "critical cue inventory" [verified abstract] — a good analogue for an incident-response pill. Brown et al. (2024, *Organizational Research Methods*) is the recent management-science endorsement of CDM/ACTA [verified abstract]. Militello et al. (2023) standardised CDM-style interviews across 102 anaesthesiologists after simulated incidents — evidence that the protocol can be scripted and run by many interviewers (and therefore by an agent) [verified abstract].

### 1.2 CDM's four sweeps → MOSAIC's interview phases

CDM proceeds in sweeps over one incident (Hoffman et al. 1998; Crandall et al. 2006):

1. **Incident identification and selection** — "Tell me about a time a water leak nearly got out of hand / where your experience made the difference." Pick non-routine, high-stakes, recent.
2. **Timeline verification** — build a dated/ordered chronology; mark *decision points* and *shifts in situation assessment*.
3. **Deepening** — at each decision point apply the cognitive probes (cues, knowledge, analogues, goals, options, basis, experience, aiding, time pressure, situation assessment).
4. **"What-if" queries** — hypotheticals ("if X had been different…"), expert–novice contrast ("what would a new technician have done wrong here?"), error probes.

MOSAIC mapping: Phase 1–2 = *Story capture* (transcript segments become provenance anchors); Phase 3 = *Rule extraction* (each decision point → candidate rule tile); Phase 4 = *Exceptions, forbidden actions, boundaries* and *contradiction checks*; then ACTA's Knowledge Audit probes run as a *coverage sweep* against the rule schema (the "Knowledge Checker" role from the ASK paper, §1.5).

### 1.3 Probe library (ready-to-use JSON)

Design notes:
- `method` tags which protocol the probe comes from; `phase` is the MOSAIC interview phase; `targets` are MOSAIC rule fields; `scribe_hint` tells the extraction model how to map the answer.
- Probe wording for CDM follows the standard table in Klein et al. (1989) / Hoffman et al. (1998) / Crandall et al. (2006); ACTA wording follows Militello & Hutton (1998) Knowledge Audit and Simulation Interview tables. Wordings are paraphrased for spoken delivery.
- Rule: ask about a *specific* incident first; generalise only after two incidents agree (CIT/CDM principle). Do not ask "why" during a concurrent think-aloud (Ericsson & Simon); ask it retrospectively.

```json
{
  "probe_library_version": "1.0",
  "rule_fields": ["trigger", "cue_evidence", "decision", "allowed_action", "forbidden_action", "exception", "escalation", "owner", "deadline", "outcome"],
  "phases": ["incident_selection", "timeline", "deepening", "what_if", "coverage_audit", "contrast_and_contradiction", "confirmation"],
  "probes": [
    {"id": "P01", "method": "CIT/CDM", "phase": "incident_selection", "targets": ["trigger"],
     "prompt": "Think of a water leak or flooding incident in the last few years where your experience really made the difference, or where things nearly went wrong. Walk me through it from the first moment you heard about it.",
     "follow_up": "What made this one non-routine?",
     "scribe_hint": "Open an incident record; capture asset, date (approx), systems involved; mark transcript segment as provenance root.",
     "source": "Flanagan 1954; Klein et al. 1989; Hoffman et al. 1998"},

    {"id": "P02", "method": "CDM-timeline", "phase": "timeline", "targets": ["trigger", "deadline"],
     "prompt": "Let's put that in order. What was the very first signal, who got it, and roughly how many minutes passed before each of the next things happened?",
     "follow_up": "Where in that sequence did you make a real decision, as opposed to just following routine?",
     "scribe_hint": "Create decision points DP1..DPn with t+minutes; each DP becomes a candidate rule tile.",
     "source": "Hoffman et al. 1998 (timeline verification sweep)"},

    {"id": "P03", "method": "CDM-deepening:cues", "phase": "deepening", "targets": ["cue_evidence", "trigger"],
     "prompt": "At that point, what were you actually seeing, hearing or smelling? What told you this was more than a drip?",
     "follow_up": "Was there a reading, alarm, photo or message that confirmed it? Which one?",
     "scribe_hint": "Each cue → cue_evidence item with {source_type: alarm|sensor|visual|report|message, observable: true}. Prefer instrumentable cues (BMS alarm, leak sensor, meter) over vague ones.",
     "source": "Klein et al. 1989 'Cues' probe"},

    {"id": "P04", "method": "CDM-deepening:knowledge", "phase": "deepening", "targets": ["cue_evidence"],
     "prompt": "What information did you use to make that call, and how did you get it? Who or what did you check?",
     "follow_up": "If that information had not been available, what would you have used instead?",
     "scribe_hint": "Map information sources to evidence feed channels (BMS, control room, tenant hotline, drawings, vendor).",
     "source": "Klein et al. 1989 'Knowledge' probe"},

    {"id": "P05", "method": "CDM-deepening:analogues", "phase": "deepening", "targets": ["exception", "trigger"],
     "prompt": "Did this remind you of a previous incident? What was the same, and what was the critical difference?",
     "scribe_hint": "Differences between analogues → exception candidates; similarities → generalise trigger.",
     "source": "Klein et al. 1989 'Analogues' probe"},

    {"id": "P06", "method": "CDM-deepening:goals", "phase": "deepening", "targets": ["outcome", "decision"],
     "prompt": "What were you trying to achieve right then — in order of priority? Life safety, stopping the water, protecting equipment, keeping the tenant open?",
     "scribe_hint": "Ordered goals → outcome field and priority ordering of rules within the pill.",
     "source": "Klein et al. 1989 'Goals' probe"},

    {"id": "P07", "method": "CDM-deepening:options", "phase": "deepening", "targets": ["decision", "allowed_action"],
     "prompt": "What other things could you have done at that moment? Even ones you dismissed quickly.",
     "scribe_hint": "Every option → allowed_action candidate or forbidden_action candidate (see P08).",
     "source": "Klein et al. 1989 'Options' probe"},

    {"id": "P08", "method": "CDM-deepening:basis", "phase": "deepening", "targets": ["decision", "forbidden_action", "exception"],
     "prompt": "How did you choose that option and reject the others? Was there a rule you were following, written or unwritten?",
     "follow_up": "Is there anything you would never do in that situation, no matter how much pressure you were under? Why?",
     "scribe_hint": "'Never do' statements → forbidden_action with rationale; 'rule I follow' → decision with condition; look for standards/regulations referenced (LEW, FSM, insurer).",
     "source": "Klein et al. 1989 'Basis' probe"},

    {"id": "P09", "method": "CDM-deepening:experience", "phase": "deepening", "targets": ["owner", "escalation"],
     "prompt": "What training or experience did someone need to make that call safely? Who on your team could have made it, and who could not?",
     "scribe_hint": "Minimum competency → owner role; if competency is a licence (LEW, licensed plumber, FSM) create escalation to that role.",
     "source": "Klein et al. 1989 'Experience' probe"},

    {"id": "P10", "method": "CDM-deepening:aiding", "phase": "deepening", "targets": ["cue_evidence", "deadline"],
     "prompt": "Looking back, what information, if you had had it 10 minutes earlier, would have changed what you did?",
     "scribe_hint": "Missing information → evidence requirements for the deterministic gate; timing → deadline.",
     "source": "Klein et al. 1989 'Aiding' probe"},

    {"id": "P11", "method": "CDM-deepening:time_pressure", "phase": "deepening", "targets": ["deadline", "escalation"],
     "prompt": "How much time did you really have before the situation got worse? What would 'worse' have looked like?",
     "scribe_hint": "Minutes to deterioration → deadline; 'worse' → escalation trigger condition.",
     "source": "Klein et al. 1989 'Time pressure' probe"},

    {"id": "P12", "method": "CDM-deepening:situation_assessment", "phase": "deepening", "targets": ["cue_evidence", "escalation"],
     "prompt": "If you had to hand over to a relief duty manager at that exact moment, what would you tell them in three sentences?",
     "scribe_hint": "The handover summary = canonical situation description for the rule; anything the expert says 'watch out for' → escalation condition.",
     "source": "Klein et al. 1989 'Situation assessment' probe"},

    {"id": "P13", "method": "CDM-whatif:hypothetical", "phase": "what_if", "targets": ["exception", "decision"],
     "prompt": "Suppose one thing had been different — say the water was coming from the ceiling above the switchroom instead of the pantry. What changes?",
     "follow_up": "And if it had been 2 am on a Sunday with only the security guard on site?",
     "scribe_hint": "Each counterfactual branch → exception with its own decision; populate the 'What would change the decision?' drawer.",
     "source": "Klein et al. 1989 'Hypotheticals' probe; Crandall et al. 2006 what-if sweep"},

    {"id": "P14", "method": "CDM-whatif:novice_error", "phase": "what_if", "targets": ["forbidden_action", "escalation"],
     "prompt": "What would a technician in their first month most likely have done wrong here? What is the classic mistake?",
     "scribe_hint": "Classic mistakes → forbidden_action; if mistake is catastrophic → mark rule tier 'escalate' and add deterministic gate.",
     "source": "Klein et al. 1989 expert–novice contrast; Militello & Hutton 1998 Simulation Interview 'errors' probe"},

    {"id": "P15", "method": "ACTA-knowledge_audit:past_future", "phase": "coverage_audit", "targets": ["trigger", "outcome"],
     "prompt": "Experts can see how a situation developed and where it is going. For leaks, what do you look at to predict what will happen in the next hour?",
     "scribe_hint": "Predictive cues → trigger thresholds and outcome expectations.",
     "source": "Militello & Hutton 1998 Knowledge Audit 'Past & Future'"},

    {"id": "P16", "method": "ACTA-knowledge_audit:big_picture", "phase": "coverage_audit", "targets": ["escalation", "owner"],
     "prompt": "What is the big picture you keep in your head during a leak — which systems, tenants and people are affected, and who needs to know?",
     "scribe_hint": "Stakeholder list → owners and escalation recipients; systems list → asset_refs.",
     "source": "Militello & Hutton 1998 'Big Picture'"},

    {"id": "P17", "method": "ACTA-knowledge_audit:noticing", "phase": "coverage_audit", "targets": ["cue_evidence", "trigger"],
     "prompt": "Have you ever noticed something others missed — a smell, a stain, a pump running too long — that turned out to matter?",
     "scribe_hint": "Subtle cues → secondary evidence items with lower confidence weight.",
     "source": "Militello & Hutton 1998 'Noticing'"},

    {"id": "P18", "method": "ACTA-knowledge_audit:job_smarts", "phase": "coverage_audit", "targets": ["allowed_action"],
     "prompt": "What are the shortcuts or tricks you use that are not in any manual — ways to find the source faster or contain water with what is on hand?",
     "scribe_hint": "Tricks → allowed_actions tagged 'practice' (not standard-mandated); still require confirmation.",
     "source": "Militello & Hutton 1998 'Job Smarts'"},

    {"id": "P19", "method": "ACTA-knowledge_audit:improvising", "phase": "coverage_audit", "targets": ["allowed_action", "exception"],
     "prompt": "Tell me about a time you had to improvise because the normal approach was not possible — valve seized, contractor unreachable, access blocked.",
     "scribe_hint": "Improvisations → exceptions with allowed_action; flag any that bypass a safety control for expert confirmation.",
     "source": "Militello & Hutton 1998 'Opportunities/Improvising'"},

    {"id": "P20", "method": "ACTA-knowledge_audit:self_monitoring", "phase": "coverage_audit", "targets": ["escalation"],
     "prompt": "How do you know when you are getting out of your depth and need to call someone more senior or a specialist?",
     "scribe_hint": "Self-monitoring cues → escalation triggers; the named 'someone' → escalation target role.",
     "source": "Militello & Hutton 1998 'Self-Monitoring'"},

    {"id": "P21", "method": "ACTA-knowledge_audit:anomalies", "phase": "coverage_audit", "targets": ["exception", "escalation"],
     "prompt": "What is a leak that does not behave like a normal leak — something that should make the team stop and rethink?",
     "scribe_hint": "Anomalies → exceptions that override the default decision; usually escalate tier.",
     "source": "Militello & Hutton 1998 'Anomalies'"},

    {"id": "P22", "method": "ACTA-knowledge_audit:equipment", "phase": "coverage_audit", "targets": ["cue_evidence", "forbidden_action"],
     "prompt": "Which sensors, alarms or valves do you not fully trust, and what do you do about it?",
     "scribe_hint": "Unreliable instruments → require corroborating evidence in the gate; 'do not rely on X alone' → forbidden_action.",
     "source": "Militello & Hutton 1998 'Equipment Difficulties'"},

    {"id": "P23", "method": "ACTA-simulation", "phase": "what_if", "targets": ["decision", "allowed_action", "owner", "deadline"],
     "prompt": "I am going to play you a simulated incident feed. At each update, tell me: what you notice, what you would do, who you would call, and how long you would give it before changing course.",
     "scribe_hint": "Run against the demo scenario; capture per-step decisions as draft rules; compare with rules already extracted to detect contradictions.",
     "source": "Militello & Hutton 1998 Simulation Interview"},

    {"id": "P24", "method": "RepGrid-triadic", "phase": "contrast_and_contradiction", "targets": ["trigger", "exception"],
     "prompt": "Here are three past leak incidents (A, B, C). In what important way are two of them alike and different from the third?",
     "follow_up": "What is the opposite of that quality? Where does today's incident sit between the two poles?",
     "scribe_hint": "Construct poles → classification dimension for triggers/exceptions (e.g., 'near energised equipment' vs 'wet area only'); use to resolve conflicting rules.",
     "source": "Kelly 1955; Fransella et al.; Jankowicz 2003 (triadic elicitation)"},

    {"id": "P25", "method": "Laddering-down", "phase": "contrast_and_contradiction", "targets": ["cue_evidence"],
     "prompt": "You said 'when it looks serious'. How, specifically, do you tell? Give me an example you could photograph or measure.",
     "scribe_hint": "Repeat until cue is observable; attach measurement/threshold.",
     "source": "Jankowicz 2003 'laddering down'; Corbridge et al. 1994"},

    {"id": "P26", "method": "Laddering-up", "phase": "contrast_and_contradiction", "targets": ["outcome", "decision"],
     "prompt": "Why does that matter? ... And why does that matter?",
     "scribe_hint": "Stop at a goal statement (life safety, asset protection, tenant continuity, compliance); becomes outcome and rule priority.",
     "source": "Hinkle 1965; Reynolds & Gutman 1988"},

    {"id": "P27", "method": "ThinkAloud-retrospective", "phase": "what_if", "targets": ["decision"],
     "prompt": "(immediately after a simulated step) Tell me what was going through your mind just then — no need to justify it.",
     "scribe_hint": "Do not ask 'why' mid-task; record verbatim; extract decision rationale afterwards.",
     "source": "Ericsson & Simon 1980/1993"},

    {"id": "P28", "method": "Contradiction-resolution", "phase": "contrast_and_contradiction", "targets": ["exception", "decision"],
     "prompt": "Earlier you said you would isolate the riser first; just now you said you would call the LEW first. Which comes first, or does it depend on something?",
     "scribe_hint": "Resolve into ordered rules or an exception with a distinguishing condition; record both transcript segments as provenance.",
     "source": "Repertory-grid logic (Kelly); ASK Knowledge Checker (Roudiere et al. 2026)"},

    {"id": "P29", "method": "Boundary", "phase": "confirmation", "targets": ["escalation", "forbidden_action"],
     "prompt": "Which of these decisions should a system never make on its own, even with all the evidence? Which could it recommend, and which could it draft for someone to approve?",
     "scribe_hint": "Sets rule tier: recommend / approve / escalate; forbidden autonomous actions become hard gates.",
     "source": "IMDA MGF 2020 §3.14–3.18; MGF Agentic AI 2026 (approval checkpoints)"},

    {"id": "P30", "method": "Outcome", "phase": "confirmation", "targets": ["outcome"],
     "prompt": "How did you know it had worked? What did you check the next morning, and what would have told you it had not?",
     "scribe_hint": "Verification checks → outcome criteria used by Outcome & Learning screen.",
     "source": "Klein et al. 1989 'Goals'; Crandall et al. 2006"},

    {"id": "P31", "method": "Confirmation", "phase": "confirmation", "targets": ["all"],
     "prompt": "I have written this up as: WHEN [trigger] AND we can see [evidence], DO [decision] via [owner] within [deadline]; NEVER [forbidden]; EXCEPT [exception]; ESCALATE to [role] if [condition]; SUCCESS = [outcome]. Is that right? What is wrong or missing?",
     "scribe_hint": "Expert edits → confirmation_status: confirmed | edited | rejected; store diff and segment reference.",
     "source": "Decision Canvas confirmation step; ASK Scribe"}
  ]
}
```

### 1.4 Interviewer behaviour rules derived from the literature

1. **Incidents before generalities.** CDM/CIT: start every rule from a remembered case; generalise only when ≥2 cases agree (Klein 1989; Hoffman 1998).
2. **Separate the roles** (ASK): Assistant asks and steers; Scribe writes into the schema; Knowledge Checker scores completeness and tells the Assistant what to ask next (Roudiere et al. 2026 [verified abstract]). This is the architectural argument for "more than a chatbot".
3. **Schema-constrained extraction with explicit content requirements** reduces variability across experts (ASK) and increases F1 in process-element extraction when definitions and format instructions are rigorous (Neuberger et al. 2024 [verified abstract]).
4. **Expert–novice contrast is the single best probe for forbidden actions** (CDM what-if sweep; ACTA Simulation "errors" probe).
5. **Ladder down until observable.** A cue that cannot be sensed, photographed or reported is not evidence for a gate.
6. **Use triads for contradictions.** Repertory-grid triads force the distinguishing construct into the open (Kelly; Jankowicz).
7. **Retrospective, not concurrent, "why".** Ericsson & Simon: asking "why" during a task changes behaviour; ask afterwards.
8. **Provenance on every field.** K-GRASP recommends retaining "source expert, date, and stated assumptions" as provenance to "support later review and incremental refinement" [verified abstract] — precisely MOSAIC's per-rule provenance.
9. **Log the elicitation itself.** Q-Survey (LLM-assisted repertory grid) found experts want "visible AI provenance, edit/undo, bypass controls" when AI suggests constructs [verified abstract].
10. **Expect < 50 % implicit requirements on first pass.** ReqElicitGym (2026) reports current LLMs elicit fewer than half of users' implicit requirements [secondary] — justifies the coverage audit (P15–P22) and a second session.

### 1.5 LLM-driven interviewing, knowledge elicitation and SOP extraction (2023–2026)

| Paper | Year / venue | Finding relevant to MOSAIC | Confidence |
|---|---|---|---|
| Li, Tamkin, Goodman, Andreas — *Eliciting Human Preferences with Language Models* (GATE), arXiv 2310.11589; ICLR 2025 | 2023/2025 | LLMs that *actively ask* free-form questions elicit task specifications that match or significantly beat user-written specs (content recommendation, email validation) | [verified via arXiv/ICLR listing] |
| Geiecke & Jaravel — *Conversations at Scale: Robust AI-led Interviews*, SSRN 4974382 / CEPR DP19705 | 2024, rev. 2026 | Open-source single-agent AI interviewer rated approximately comparable to an average human expert interviewer; adaptable to new topics almost instantly | [secondary: SSRN/CEPR listing] |
| Roudiere et al. — *From Tacit Knowledge to Structured Documents: A Framework for Knowledge Elicitation* (ASK), ECKM | 2026 | Assistant–Scribe–Knowledge-Checker; interview-generated specs more complete, better structured, less variable than manual; consultants preferred interviews | [verified abstract] |
| Luna et al. — *K-GRASP: Tacit Knowledge Externalisation with LMs and Knowledge Graphs*, ECKM | 2026 | Interviewer LLM → RDF triples with provenance/scope; consultative LLM answers with triples shown for transparency; raises access control, privacy, versioning | [verified abstract] |
| Cho et al. — *LLMs Explain Experts Better Than Experts Themselves* | 2026 | LLM-externalised tacit knowledge improved decision quality and let novices approach expert-level, often outperforming expert-articulated knowledge (Polanyi's paradox) | [verified abstract] |
| Zuin et al. — *Leveraging LLMs for Tacit Knowledge Discovery in Organizational Contexts*, IJCNN | 2025 | Agent iteratively interviews employees; 94.9 % full-knowledge recall in simulation; recovers knowledge without direct access to the sole specialist | [verified abstract] |
| Schinckus et al. — *LLMs for Process Knowledge Acquisition* (PKAI), BISE | 2025 | 19 design requirements; multi-agent preparation→socialisation→externalisation; analysts with PKAI built better conceptual models | [verified abstract] |
| Rank et al. — *LLMs for Tacit Knowledge Elicitation in Industry 5.0: Literature Review*, AHFE | 2025 | Operator acceptance of conversational agents is the key challenge; LLMs can build an ever-expanding knowledge base from operator insights | [verified abstract] |
| Korn, Gorsch, Vogelsang — *LLMREI*, arXiv 2507.02564 | 2025 | Chatbot runs requirements-elicitation interviews with little human involvement to cut interviewer errors | [secondary] |
| *ReqElicitGym*, arXiv 2602.18306 | 2026 | 101 scenarios; LLM interviewers elicit < 50 % of implicit requirements | [secondary] |
| *From Chat to Interview* (OntoAgent), arXiv 2605.05828 | 2026 | Interview-experience ontology reduces omitted implicit requirements and redundant questions | [secondary] |
| *LadderTeam*, arXiv 2608.17029 | 2026 | Dual-agent laddering interviewer (ACV, 5-Whys, JTBD) with a judge agent preventing drift | [secondary] |
| Liu et al. — *LLM-assisted hybrid interfaces for remote repertory grid interviews* (Q-Survey), Computers in Human Behavior Reports | 2026 | Automated triadic RGT with LLM; ~27 min to elicit ≥6 constructs; experts asked for visible AI provenance, edit/undo | [verified abstract] |
| Sun et al. — LLM vs naive human interviewers (children), PLOS One | 2025 | LLM questions adhered to best-practice guidelines, elicited more unique correct info per question and less false info | [verified abstract] |
| Dengel et al. — Semi-structured interviews *with* LLMs | 2023 | Context strongly changes LLM answers — caution for using an LLM as the *interviewee* | [verified abstract] |
| Bellan, Dragoni, Ghidini — *Extracting Business Process Entities and Relations from Text using PLMs and In-Context Learning* | 2022 | GPT-3 with conceptual definitions + few examples extracts activities, participants, performs-relations; control flow is hard | [verified abstract] |
| Neuberger et al. — *Universal Prompting Strategy for Extracting Process Model Information* | 2024 | Up to +8 % F1 over SOTA ML; examples, definition specificity and format rigour are key | [verified abstract] |
| Grohs et al. — *LLMs can accomplish BPM tasks* | 2023 | Imperative/declarative process mining from text with little prompt engineering | [verified abstract] |
| Rula et al. — *Procedural Text Mining with LLMs*, K-CAP | 2023 | Incremental Q&A extraction of procedures/steps from PDFs with an ontology of procedures | [verified abstract] |
| Hörner et al. — *BPMNGen*, BISE | 2026 | LLMs good for simple/moderate processes, weak for complex — argues for human confirmation of complex rules | [verified abstract] |
| *SOP-Agent: Empower General Purpose AI Agent with Domain-Specific SOPs*, arXiv 2501.09316 | 2025 | SOPs as **decision graphs** (nodes = candidate actions; edges = IF / ALWAYS); filtered toolset per node reduces action space | [secondary, arXiv listing] |

How to cite in the deck: "Interview-led capture (ASK, GATE, Geiecke & Jaravel) + schema-constrained extraction (Neuberger, Bellan) + decision-graph execution (SOP-Agent) + expert confirmation (CDM/ACTA, Hörner)."

### 1.6 Metrics the Expert Capture screen should display (judge-facing)

- **Schema completeness** per rule (fields filled / 10) — ASK Knowledge Checker.
- **Provenance coverage** (% of fields with a transcript segment) — K-GRASP.
- **Confirmation status** (confirmed / edited / rejected) — Decision Canvas.
- **Contradictions open / resolved** — triadic resolution (P24, P28).
- **Observable-cue ratio** (% cues that are sensor/alarm/report-backed) — laddering down.
- Post-deployment: **human override rate** and **approval response time** (MGF Agentic AI, §3.3).

---

## 2. Water-ingress / leak incident response in commercial buildings

### 2.1 Source base

Insurer / risk-engineering guidance [secondary unless noted]:
- Risk-engineering water damage guide (cfins.com "Minimizing Water Damage"): ERP should "identify all water shut off valves and areas or equipment controlled"; responder list "current and include back up"; liquid detection systems are "inexpensive and easily installed".
- Arch AIRE Water Damage Mitigation Plan: labelled map of all shutoffs; **"Fire protection shutoffs (DO NOT SHUT OFF without proper authorization)"**.
- CNA Flood Preparation Guide (via MCAA): "shut off electrical power to buildings in imminent danger of flooding"; running electrical equipment suffers greater damage; "A qualified electrician or maintenance team member should check the status of electrical systems before others enter the area."
- Chubb commercial brochure: water damage is the **2nd most common cause of loss to commercial property, behind fire**; **non-weather water losses make up 20 % of all property insurance losses**; frequency and cost "led by high rise commercial buildings"; top interior causes: domestic plumbing, roofing intrusion, toilets, sprinklers, water heaters, HVAC.
- Zurich UK, "The risks of escape of water in commercial buildings": commercial EoW claims "reach seven figures"; offices contain many water-using systems (heating, AC, coffee machines, coolers); isolate leaking appliances quickly; consider leak detection; keep emergency call-out numbers; re-occupation pressure surges cause joint failures.
- FM Global Data Sheet 10-7 (Fire Protection System Impairments) underpins the widely used **Red Tag Permit** system: any planned or unplanned shutdown of sprinklers, water supplies, fire pumps or alarm interlocks is an impairment; notify insurer; emergency impairments logged by the incident commander [secondary: university/city programmes citing DS 10-7].
- IICRC S500 Standard for Professional Water Damage Restoration: Category 1 (clean), 2 (significantly contaminated), 3 (grossly contaminated — PPE mandatory, porous materials removed); current edition ties category degradation to microbial amplification rather than a fixed 48-h clock [secondary: Cleanfax, Legend Brands].
- US EPA, *Mold Remediation in Schools and Commercial Buildings*, Table 1: dry water-damaged materials **within 24–48 hours**; discard wet ceiling tiles and fibreglass insulation; "even if materials are dried within 48 hours, mold growth may have occurred"; contaminated water (sewage/chemical) requires PPE and containment under OSHA [verified via epa.gov chapter page summary].
- BOMA International *Emergency Preparedness Guidebook* (3rd ed., 2012): four phases (mitigation, preparedness, response, recovery), in-depth communications-plan chapter; floods — occupant safety first, then damage limitation; notify tenants of building status; appoint a re-entry team [secondary].

Singapore regulatory anchors:
- **EMA — Electricity Act / Electricity (Electrical Installations) Regulations**: a Licensed Electrical Worker (LEW) is "a person who is technically competent in carrying out electrical work and is licensed by EMA"; large installations must be inspected and certified by LEWs annually; Reg. 13 places responsibility on the LEW in charge to ensure compliance with Singapore Standards and **SS 638 Code of Practice for Electrical Installations** [verified via EMA handbook summary].
- **WSH Council Alert, 21 June 2023** (worker electrocuted on a rain-drenched roof): employers should insulate exposed electrical components and **cease electrical works when it rains or the area is wet** [secondary press coverage of the alert; alert page itself confirmed at tal.sg].
- **SCDF — Fire Safety Act 1993 (as amended 14 Sep 2020)**: premises with Fire Safety Managers must set up a **Company Emergency Response Team (CERT)**; premises with a Fire Certificate must prepare an **Emergency Response Plan** covering evacuation, in-place protection, arson prevention and incident mitigation; CERT handles the initial stage before SCDF arrives [verified via scdf.gov.sg summaries].
- **BCA — Building Control (Reportable Matters) Regulations 2025**: owner (or last maintenance contractor) must **call BCA within 6 hours** of a reportable lift/escalator safety incident; safety risks reported within 72 hours; good-practice guide: stop operation when a lift is unsafe [verified via bca.gov.sg summary; flooded pit not explicitly listed — treat as "unsafe condition"].
- **NEA — Control of Vectors and Pesticides Act**: owners/occupiers liable for mosquito breeding; NEA cites fines up to **S$5,000 or 3 months** for repeat household offenders on first conviction; LTA guidebook cites the Act's maximum of **up to S$50,000 or 6 months** [secondary].
- **PUB flood alerts**: heavy-rain SMS from MSS/NEA, canal water-level SMS at 50/75/90/100 % thresholds, Telegram t.me/pubfloodalerts, myENV app; 24-h line 1800-CALL-PUB; SCDF 995 for emergencies [verified via pub.gov.sg summaries].
- **MOM — WSH (Incident Reporting) Regulations**: dangerous occurrences and injuries are reportable via iReport; sources conflict on 24 h vs 10 days for dangerous occurrences — [verify before slide].
- **PUB licensed plumber / SS 636** for water-service work — [verify before slide; not retrieved this session].

International electrical-safety anchor: **NFPA 70E** Article 120 (establishing an electrically safe work condition) and the "qualified person" concept [standard ref]. Use alongside EMA LEW requirement; do not quote clause text.

### 2.2 Roles (mixed-use asset, Singapore)

| Role | In MOSAIC | Responsibilities in a water-ingress event |
|---|---|---|
| **Duty Facilities / Asset Operations Manager** (Incident Commander) | Human supervisor; approves "approve"-tier actions; receives escalations | Declares incident, owns the timeline, decides tenant/landlord comms, calls insurer |
| **Technical Services lead (M&E)** | Technical Services pill owner | Locates source, isolates valves/risers, pumps, protects plant |
| **Licensed Electrical Worker (LEW)** | Hard gate for anything near energised equipment | Only person who may isolate/re-energise switchgear; certifies fit for operation |
| **Fire Safety Manager (FSM) + CERT** | Safety pill owner | Life safety, cordons, authorises any fire-protection impairment, red-tag, SCDF liaison |
| **Property / Tenant Experience manager** | Tenant Experience pill owner | Tenant notices, access, relocation, claims liaison |
| **Security / FCC (fire command centre) operator** | Evidence feed | BMS/leak alarms, CCTV, first responder on site at night |
| **Cleaning / restoration contractor** | External, "approve"-tier mobilisation | Extraction, drying, Cat 2/3 handling |
| **Lift contractor** | External | Lift pit water, return to service |
| **Insurer / loss adjuster** | External | Notification, evidence, red-tag notification |
| **Asset Manager (landlord)** | Portfolio Pulse consumer | Material loss, tenant compensation, capex |

### 2.3 Time-boxed response skeleton

**T+0 to T+15 min ("first 15 minutes")**
1. Receive signal (BMS leak alarm / tenant call / security patrol). Log time, location, source type, water category if known.
2. **Life safety first**: cordon slippery area; evacuate affected zone if water near electrical equipment or ceiling collapse risk; activate CERT if FSM deems necessary (SCDF).
3. **Electrical safety gate**: if water is in, above, or flowing toward an electrical room / switchgear / riser cupboard / lift motor room — **nobody enters; call LEW; isolate upstream only under LEW instruction** (EMA; WSH Council 2023; CNA; NFPA 70E).
4. **Stop the source**: nearest local isolation valve → floor/riser valve → main, using the shutoff map (risk-engineering guide). **Never close fire-protection valves without FSM authorisation** (Arch AIRE; FM Global DS 10-7).
5. **Protect**: move/raise equipment, deploy absorbent socks/bunds, drip trays; take lifts out of service if water in shaft/pit (BCA).
6. **Notify**: Duty Manager → Technical Services, FSM, Property Manager; FCC logs; tenant first notice within 30 min (BOMA comms plan).
7. **Document**: photos/video *before* cleanup; retain failed component (insurer guides).

**T+15 to T+60 min**: confirm isolation; identify category (IICRC S500); mobilise restoration contractor; tenant updates; insurer first notice; red-tag if fire protection impaired; DC/server-room BCP owner decision on IT power.

**T+1 h to T+24 h**: extraction, dehumidification started; moisture mapping; LEW inspection before any re-energisation; lift contractor check; incident report draft; WSH/BCA reporting if applicable.

**T+24 to 48 h**: drying verified against EPA 24–48 h window; porous materials discarded; stagnant water cleared (NEA); tenant return-to-occupancy; lessons captured → playbook version diff.

### 2.4 Electrical-safety specifics to make the gate credible

- Trigger geometry: water *in* the electrical room, on the floor under switchgear, dripping from above the switchgear, or in a riser/trunking that terminates in the switchroom.
- Evidence required to *downgrade* from "do not enter": LEW on site confirms isolation **and** verifies by test; or LEW confirms the affected board is a dead/spare section.
- Forbidden: entering a wet switchroom; operating a wet breaker; using wet-vacs or pumps powered from the affected board; "quick look" by security.
- Re-energisation only after LEW inspection and certification (EMA regime; CNA re-entry guidance).
- If incoming supply isolation is needed, the LEW coordinates with the grid operator (SP Group) [verify contact details before slide].

### 2.5 Seed rule set (ready-to-use JSON)

Notes: `tier` ∈ {recommend, approve, escalate}; `gate` is the deterministic precondition evaluated on the evidence feed before any action is offered; `provenance` is mock but structurally what Expert Capture produces; `standards_refs` are the citations a judge can check.

```json
{
  "pill_set_version": "0.3.0-seed",
  "asset": {"name": "Demo mixed-use asset (office + retail podium + basement carpark + comms room)", "location": "Singapore"},
  "pills": ["asset_operations_orchestrator", "technical_services", "safety_fire", "tenant_experience"],
  "rules": [
    {
      "rule_id": "TS-WTR-001",
      "pill": "technical_services",
      "title": "Water in or above an electrical room / switchgear — do not enter, LEW-only isolation",
      "trigger": "Leak alarm, liquid detection, or visual report of water inside, dripping onto, or flowing toward any electrical room, LV/HV switchroom, riser cupboard, or lift motor room.",
      "cue_evidence": [
        {"type": "alarm", "ref": "brick:Leak_Alarm | brick:Liquid_Detection_Alarm located in brick:Electrical_Room", "required": false},
        {"type": "visual_report", "ref": "FCC/security photo or tenant call naming an electrical room", "required": false},
        {"type": "drawing", "ref": "Riser/trunking route terminating in switchroom", "required": false}
      ],
      "decision": "Treat as electrical hazard. Lock out access, notify the Licensed Electrical Worker (LEW) immediately, and isolate water upstream of the room. Electrical isolation only on LEW instruction.",
      "allowed_actions": ["Cordon and signage", "Call LEW", "Upstream water isolation outside the room", "Notify Duty Manager and FSM", "Log and photograph from outside the threshold"],
      "forbidden_actions": ["Entering the room before LEW confirms de-energised and safe", "Operating any wet breaker or switch", "Powering pumps/wet-vacs from the affected board", "Security 'quick look' entry"],
      "exceptions": ["LEW confirms the affected section is a spare/dead board and documents it", "Water is confined to a sealed trench with no contact path (LEW judgement)"],
      "escalation": {"to": "LEW and Duty Manager; FSM if evacuation", "when": "Immediately on trigger", "deadline_min": 5},
      "owner": "Technical Services lead (on-site) → LEW (authority)",
      "outcome": "No person enters until LEW declares safe; water stopped; LEW certifies before re-energisation.",
      "tier": "escalate",
      "gate": {"block_actions_unless": "LEW_confirmation == true", "blocked": ["enter_room", "re_energise", "operate_breaker"]},
      "standards_refs": ["EMA Electricity (Electrical Installations) Regulations; LEW regime; SS 638", "WSH Council Alert 21 Jun 2023 (cease electrical works when wet)", "CNA Flood Preparation Guide (qualified electrician before re-entry)", "NFPA 70E Art. 120", "IMDA MGF 2020 §3.18 safety-critical: human assumes control"],
      "asset_refs": {"brick_equipment": ["Switchgear", "Main_Circuit_Breaker", "Transformer", "Bus_Riser", "Breaker_Panel"], "brick_location": ["Electrical_Room"], "haystack_tags": ["elec", "panel", "equip"]},
      "provenance": {"expert_role": "Senior M&E Engineer, 18 yrs", "transcript_segment": "EC-01 @ 00:14:20-00:17:05", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-002",
      "pill": "technical_services",
      "title": "Locate and isolate the source within 10 minutes using the shutoff map",
      "trigger": "Confirmed active water release (not condensation) anywhere in the asset.",
      "cue_evidence": [
        {"type": "alarm", "ref": "brick:Water_Leak_Sensor / Leak_Alarm on floor or riser", "required": false},
        {"type": "report", "ref": "Tenant/security report with floor and grid reference", "required": true},
        {"type": "drawing", "ref": "Shutoff valve map (asset register: COBie Component → System)", "required": true}
      ],
      "decision": "Isolate at the nearest local valve; if source unknown after 5 min, isolate the floor/riser; if still unknown at 10 min, isolate the domestic main for the stack and escalate.",
      "allowed_actions": ["Close local/zone isolation valves", "Close floor or riser valves", "Close domestic water main for the stack (Duty Manager informed)"],
      "forbidden_actions": ["Closing any fire-protection (sprinkler/wet riser/hose reel) valve without FSM authorisation — see SF-WTR-003", "Leaving an isolated riser unlabelled"],
      "exceptions": ["Source is a fire-protection system → SF-WTR-003 governs", "Source is tenant fit-out plumbing behind locked tenancy → Tenant Experience arranges access (TE-WTR-009)"],
      "escalation": {"to": "Duty Manager", "when": "Source not isolated at 10 min or main isolation needed", "deadline_min": 10},
      "owner": "Technical Services technician on duty",
      "outcome": "Flow stopped; valve(s) tagged; time of isolation logged.",
      "tier": "recommend",
      "gate": {"block_actions_unless": "valve_is_not_fire_protection == true", "blocked": ["close_valve"]},
      "standards_refs": ["Risk-engineering water damage guide: ERP identifies all shutoffs and controlled areas; backup responder list", "Arch AIRE Water Damage Mitigation Plan: labelled shutoff map; fire protection shutoffs not to be closed without authorisation", "Zurich UK: isolate leaking appliances quickly"],
      "asset_refs": {"brick_equipment": ["Valve", "Water_Pump"], "haystack_tags": ["valve", "domestic-water", "equip"]},
      "provenance": {"expert_role": "Senior M&E Engineer", "transcript_segment": "EC-01 @ 00:21:10-00:24:40", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "SF-WTR-003",
      "pill": "safety_fire",
      "title": "Fire-protection impairment requires FSM authorisation, red tag, insurer notice and fire watch",
      "trigger": "The leak source is a sprinkler, wet riser, hose reel or fire pump line, OR isolating the leak would shut down any fire-protection water supply or alarm interlock.",
      "cue_evidence": [
        {"type": "alarm", "ref": "Sprinkler flow switch / fire pump run alarm", "required": false},
        {"type": "visual_report", "ref": "Water from sprinkler head or wet riser landing valve", "required": false}
      ],
      "decision": "FSM (or deputy) authorises the impairment; raise an impairment (red-tag) permit; notify property insurer; post fire watch in the affected zone; restore protection as the first priority after life safety.",
      "allowed_actions": ["Isolate the smallest sprinkler zone possible", "Fire watch patrols every 30 min", "Insurer impairment notification", "Call fire-protection contractor"],
      "forbidden_actions": ["Technician closing a sprinkler control valve on own authority", "Leaving the system impaired overnight without fire watch and FSM sign-off"],
      "exceptions": ["Immediate life-safety hazard (e.g., water on live equipment) permits emergency isolation first, with FSM informed within 5 min and permit raised retrospectively"],
      "escalation": {"to": "Fire Safety Manager; SCDF per ERP if alarm interlocks affected", "when": "Immediately", "deadline_min": 5},
      "owner": "Fire Safety Manager",
      "outcome": "Impairment logged, insurer notified, protection restored and permit closed.",
      "tier": "approve",
      "gate": {"block_actions_unless": "FSM_authorisation == true", "blocked": ["close_fire_protection_valve"]},
      "standards_refs": ["FM Global Data Sheet 10-7 (impairment management; red-tag permit practice)", "Arch AIRE: fire protection shutoffs DO NOT SHUT OFF without authorisation", "SCDF Fire Safety Act 1993: FSM duties, Emergency Response Plan, CERT"],
      "asset_refs": {"brick_equipment": ["Fire_Safety_Equipment", "Water_Pump"], "haystack_tags": ["pump", "equip"]},
      "provenance": {"expert_role": "Fire Safety Manager, 12 yrs", "transcript_segment": "EC-02 @ 00:08:30-00:12:15", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "SF-WTR-004",
      "pill": "safety_fire",
      "title": "Life safety and cordon — evacuate affected zone, activate CERT if needed",
      "trigger": "Water on walkways, ceiling sagging, or water near electrical equipment in an occupied area.",
      "cue_evidence": [{"type": "visual_report", "ref": "Photo of pooling/ceiling deformation", "required": true}],
      "decision": "Cordon slippery/ceiling-risk area; evacuate the zone if ceiling collapse or electrical contact risk; activate CERT per ERP; FCC announces.",
      "allowed_actions": ["Cordon and signage", "Zone evacuation", "CERT activation", "SCDF 995 if structural or electrical injury risk"],
      "forbidden_actions": ["Allowing occupants to retrieve belongings under a sagging ceiling", "Delaying evacuation to protect equipment"],
      "exceptions": [],
      "escalation": {"to": "FSM; SCDF if injury or structural risk", "when": "Immediately", "deadline_min": 3},
      "owner": "Fire Safety Manager / CERT leader",
      "outcome": "No injuries; zone cleared and logged.",
      "tier": "recommend",
      "gate": null,
      "standards_refs": ["SCDF CERT and Emergency Response Plan requirements (Fire Safety Act)", "BOMA Emergency Preparedness Guidebook: occupant safety before damage limitation"],
      "asset_refs": {"brick_location": ["Floor", "Room"]},
      "provenance": {"expert_role": "Fire Safety Manager", "transcript_segment": "EC-02 @ 00:03:00-00:06:40", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-005",
      "pill": "technical_services",
      "title": "Water in lift shaft or pit — take lift out of service and report if required",
      "trigger": "Water detected in a lift pit (pit sensor), running down a shaft, or reported in a lift car.",
      "cue_evidence": [{"type": "alarm", "ref": "Lift pit water-level/leak alarm (brick:Water_Level_Alarm)", "required": false}, {"type": "report", "ref": "Lift contractor or security report", "required": false}],
      "decision": "Park lift at an upper floor and take out of service; call lift contractor; assess against BCA reportable matters; return to service only after contractor inspection.",
      "allowed_actions": ["Take lift out of service via FCC", "Call lift maintenance contractor", "BCA incident call if a reportable safety incident occurred"],
      "forbidden_actions": ["Running the lift to 'test' with water in the pit", "Entering the pit without contractor and isolation"],
      "exceptions": [],
      "escalation": {"to": "Duty Manager; BCA within 6 h if reportable incident", "when": "On trigger", "deadline_min": 15},
      "owner": "Technical Services lead",
      "outcome": "Lift isolated, contractor report filed, BCA informed where required.",
      "tier": "approve",
      "gate": {"block_actions_unless": "lift_contractor_clearance == true", "blocked": ["return_lift_to_service"]},
      "standards_refs": ["BCA Building Control (Reportable Matters) Regulations 2025: call BCA within 6 h of reportable incident; owner/last maintenance contractor duty", "BCA Good Practices Guide for Lift Owners: stop operation when unsafe"],
      "asset_refs": {"brick_equipment": ["Elevator"], "haystack_tags": ["elevator", "verticalTransport", "equip"]},
      "provenance": {"expert_role": "Senior M&E Engineer", "transcript_segment": "EC-01 @ 00:31:00-00:33:10", "confirmation_status": "edited"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-006",
      "pill": "technical_services",
      "title": "Leak alarm in comms/server room or data hall — contain first, IT power decisions need BCP owner approval",
      "trigger": "Under-floor leak detection, condensate leak alarm or high-humidity alarm in a server room / comms room / data hall.",
      "cue_evidence": [{"type": "alarm", "ref": "brick:Leak_Alarm / Condensate_Leak_Alarm / High_Humidity_Alarm in brick:Server_Room", "required": true}],
      "decision": "Notify DC/IT operations immediately; isolate the water source (CRAC condensate, chilled-water branch); deploy containment; any IT power-down is proposed only, and executed by the IT/BCP owner.",
      "allowed_actions": ["Isolate CRAC/chilled-water branch", "Containment and drip diversion", "Notify IT/BCP owner with evidence pack"],
      "forbidden_actions": ["Switching off IT racks or UPS output without BCP owner approval", "Pumping water with equipment powered from in-room circuits"],
      "exceptions": ["Water contacting live IT equipment → TS-WTR-001 electrical gate applies"],
      "escalation": {"to": "IT/BCP owner and Duty Manager", "when": "Immediately", "deadline_min": 5},
      "owner": "Technical Services lead with IT/BCP owner",
      "outcome": "Source isolated; no unplanned IT shutdown; incident logged for availability reporting.",
      "tier": "approve",
      "gate": {"block_actions_unless": "BCP_owner_approval == true", "blocked": ["power_down_IT"]},
      "standards_refs": ["Uptime Institute Annual Outage Analysis 2025/2026: 54–57 % of significant outages cost > US$100k; ~1 in 5 > US$1M", "Chubb: HVAC among top causes of interior water damage"],
      "asset_refs": {"brick_equipment": ["CRAC", "Chilled_Water_Pump", "Valve"], "brick_location": ["Server_Room"], "haystack_tags": ["crac", "chilled-water", "equip"]},
      "provenance": {"expert_role": "DC Operations Manager", "transcript_segment": "EC-03 @ 00:05:10-00:09:00", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "SF-WTR-007",
      "pill": "safety_fire",
      "title": "Classify water category; Category 2/3 triggers PPE, access restriction and licensed cleaning",
      "trigger": "Water source is, or may be, sewage, greywater, cooling-tower/condenser water, or has sat > 48 h.",
      "cue_evidence": [{"type": "visual_report", "ref": "Odour/colour/source observations", "required": true}, {"type": "drawing", "ref": "Source system identity (sanitary vs domestic vs condenser)", "required": false}],
      "decision": "Classify per IICRC S500. Cat 2/3: restrict access, PPE for responders, engage licensed cleaning/restoration, remove porous materials, disinfect before drying.",
      "allowed_actions": ["Access restriction", "PPE issue", "Engage restoration contractor with Cat 3 capability"],
      "forbidden_actions": ["Cleaning staff handling Cat 3 water without PPE", "Reusing contaminated porous materials"],
      "exceptions": ["Cat 1 confirmed → standard drying (TS-WTR-008)"],
      "escalation": {"to": "WSH officer / Duty Manager", "when": "On Cat 3 classification", "deadline_min": 30},
      "owner": "Safety officer",
      "outcome": "Correct category recorded; no exposure incidents.",
      "tier": "recommend",
      "gate": null,
      "standards_refs": ["IICRC S500 Standard for Professional Water Damage Restoration (Categories 1–3; PPE mandatory for Cat 3)", "US EPA Mold Remediation in Schools and Commercial Buildings: contaminated water requires PPE and containment (OSHA)"],
      "asset_refs": {"haystack_tags": ["domestic-water", "condenser-water"]},
      "provenance": {"expert_role": "Safety officer", "transcript_segment": "EC-04 @ 00:02:00-00:04:30", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-008",
      "pill": "technical_services",
      "title": "Start extraction and drying within 24 h; verify dry within 48 h; discard wet ceiling tiles and insulation",
      "trigger": "Isolation complete; wet building fabric present.",
      "cue_evidence": [{"type": "report", "ref": "Moisture meter readings by area", "required": true}, {"type": "photo", "ref": "Affected materials inventory", "required": true}],
      "decision": "Mobilise extraction, dehumidifiers and air movers; moisture-map; discard porous materials (ceiling tiles, fibreglass insulation); re-check at 24 h and 48 h.",
      "allowed_actions": ["Contractor mobilisation", "Equipment hire", "Material disposal"],
      "forbidden_actions": ["Closing up ceilings/walls before moisture readings are within target", "Running drying equipment from circuits not yet cleared by LEW"],
      "exceptions": ["Cat 2/3 water → disinfect before drying (SF-WTR-007)"],
      "escalation": {"to": "Duty Manager", "when": "Drying not started within 24 h or readings not falling at 48 h", "deadline_min": 1440},
      "owner": "Technical Services lead",
      "outcome": "Moisture readings at target by 48 h; no mould remediation needed.",
      "tier": "recommend",
      "gate": {"block_actions_unless": "power_cleared_by_LEW == true", "blocked": ["run_drying_equipment_from_affected_board"]},
      "standards_refs": ["US EPA Mold Remediation in Schools and Commercial Buildings, Table 1: dry within 24–48 h; discard wet ceiling tiles/insulation; 48 h is a guideline not a guarantee"],
      "asset_refs": {"brick_location": ["Floor", "Room"]},
      "provenance": {"expert_role": "Senior M&E Engineer", "transcript_segment": "EC-01 @ 00:40:00-00:43:30", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TE-WTR-009",
      "pill": "tenant_experience",
      "title": "Tenant first notice within 30 min; factual, no liability admission; updates on a stated cadence",
      "trigger": "Any incident affecting tenant premises, access, services or safety.",
      "cue_evidence": [{"type": "record", "ref": "Incident log with affected units", "required": true}],
      "decision": "Draft and send first notice (what, where, what we are doing, next update time, contact) to affected tenants within 30 min; updates at the stated cadence; keep a comms log.",
      "allowed_actions": ["Draft notice", "Send after Property Manager approval", "Arrange access to tenancy for isolation"],
      "forbidden_actions": ["Sending any message without named human approval", "Stating cause or liability before investigation", "Promising compensation"],
      "exceptions": ["Life-safety instruction (evacuate) is issued immediately by FSM/FCC without comms approval"],
      "escalation": {"to": "Property Manager; Asset Manager if anchor tenant or media risk", "when": "Before first notice", "deadline_min": 30},
      "owner": "Property / Tenant Experience Manager",
      "outcome": "All affected tenants notified within 30 min; comms log complete.",
      "tier": "approve",
      "gate": {"block_actions_unless": "named_approver_signoff == true", "blocked": ["send_tenant_message"]},
      "standards_refs": ["BOMA Emergency Preparedness Guidebook: communications plan; notify tenants of building status", "Zurich UK property-manager EoW guidance", "IMDA MGF for Agentic AI 2026: irreversible actions such as 'sending communications' require human approval"],
      "asset_refs": {},
      "provenance": {"expert_role": "Property Manager, 10 yrs", "transcript_segment": "EC-05 @ 00:06:15-00:10:00", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TE-WTR-010",
      "pill": "tenant_experience",
      "title": "Insurer first notice and evidence preservation",
      "trigger": "Estimated damage above the asset's notification threshold, OR any fire-protection impairment, OR tenant property damage.",
      "cue_evidence": [{"type": "photo", "ref": "Pre-cleanup photos with timestamps", "required": true}, {"type": "record", "ref": "Failed component retained and tagged", "required": false}],
      "decision": "Notify insurer/broker within policy window; preserve evidence; schedule loss adjuster; separate landlord vs tenant scope.",
      "allowed_actions": ["Insurer notification", "Evidence pack compilation", "Contractor quotations"],
      "forbidden_actions": ["Disposing of the failed component before adjuster release", "Committing to repairs outside emergency mitigation before adjuster contact"],
      "exceptions": [],
      "escalation": {"to": "Asset Manager", "when": "Loss estimate exceeds delegated authority", "deadline_min": 1440},
      "owner": "Property Manager",
      "outcome": "Claim accepted without evidence dispute.",
      "tier": "approve",
      "gate": null,
      "standards_refs": ["Chubb / Zurich / CNA water damage guidance on documentation and prompt notification", "FM Global red-tag practice: insurer notified of impairments"],
      "asset_refs": {},
      "provenance": {"expert_role": "Property Manager", "transcript_segment": "EC-05 @ 00:14:00-00:16:30", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "SF-WTR-011",
      "pill": "safety_fire",
      "title": "Clear stagnant water within 24 h — vector control liability",
      "trigger": "Standing water remains anywhere on the premises (plant decks, planter boxes, basement, roof) after the incident.",
      "cue_evidence": [{"type": "photo", "ref": "Standing water locations", "required": true}],
      "decision": "Remove standing water within 24 h; where it cannot be removed, treat and inspect daily until dry; record in vector-control log.",
      "allowed_actions": ["Pump out", "Larvicide via pest-control contractor", "Daily inspection"],
      "forbidden_actions": ["Leaving pooled water over a weekend without treatment"],
      "exceptions": [],
      "escalation": {"to": "Duty Manager", "when": "Water cannot be cleared within 24 h", "deadline_min": 1440},
      "owner": "Safety officer / cleaning supervisor",
      "outcome": "No breeding detected on next NEA or internal inspection.",
      "tier": "recommend",
      "gate": null,
      "standards_refs": ["NEA — Control of Vectors and Pesticides Act: owners/occupiers liable for breeding; penalties up to S$5,000/3 months (households, first conviction) and up to S$50,000/6 months (Act maximum per LTA guidebook)"],
      "asset_refs": {"brick_location": ["Basement", "Roof"]},
      "provenance": {"expert_role": "Safety officer", "transcript_segment": "EC-04 @ 00:11:00-00:12:20", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-012",
      "pill": "technical_services",
      "title": "PUB heavy-rain / flood alert — pre-emptive basement and roof checks",
      "trigger": "PUB/MSS heavy rain warning or PUB canal water-level alert for a station near the asset, OR NE monsoon advisory.",
      "cue_evidence": [{"type": "external_feed", "ref": "PUB SMS/Telegram flood alert; MSS heavy rain warning", "required": true}],
      "decision": "Within 30 min: test basement sump pumps and float switches, clear roof outlets and rainwater downpipes, stage flood barriers at carpark ramps/known low points, brief security on patrol points.",
      "allowed_actions": ["Sump pump test", "RWDP/roof drain clearance", "Flood barrier deployment", "Security briefing"],
      "forbidden_actions": ["Deploying barriers that block egress routes", "Ignoring a pump-run alarm during the warning window"],
      "exceptions": [],
      "escalation": {"to": "Duty Manager", "when": "Pump fails test or water enters basement", "deadline_min": 30},
      "owner": "Technical Services technician on duty",
      "outcome": "No basement ingress; pump runtimes logged.",
      "tier": "recommend",
      "gate": null,
      "standards_refs": ["PUB flood alert channels (heavy-rain SMS from MSS/NEA; canal level SMS at 50/75/90/100 %; Telegram t.me/pubfloodalerts; myENV)", "PUB flood-resilience guidance"],
      "asset_refs": {"brick_equipment": ["Water_Pump"], "brick_point": ["Water_Level_Sensor", "Max_Water_Level_Alarm"], "brick_location": ["Basement"], "haystack_tags": ["pump", "equip"]},
      "provenance": {"expert_role": "Senior M&E Engineer", "transcript_segment": "EC-01 @ 00:50:00-00:53:30", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-013",
      "pill": "technical_services",
      "title": "FCU condensate / chilled-water leak above tenant ceiling — isolate FCU, drain tray, schedule repair",
      "trigger": "Condensate leak alarm or ceiling stain/drip in a tenancy with FCUs or chilled-water branch above.",
      "cue_evidence": [{"type": "alarm", "ref": "brick:Condensate_Leak_Alarm", "required": false}, {"type": "report", "ref": "Tenant photo of ceiling stain/drip", "required": true}],
      "decision": "Close the FCU chilled-water isolation valves, clear/drain the condensate tray, place drip protection, notify tenant, schedule repair; check adjacent FCUs on the same drain line.",
      "allowed_actions": ["FCU isolation", "Tray clearance", "Temporary cooling arrangement", "Work order"],
      "forbidden_actions": ["Working above live tenant workstations without clearing the area", "Leaving the FCU valves open overnight pending repair"],
      "exceptions": ["Drip onto tenant IT/electrical equipment → TS-WTR-001 gate"],
      "escalation": {"to": "Technical Services lead", "when": "More than one FCU affected or leak persists after isolation", "deadline_min": 60},
      "owner": "Technical Services technician",
      "outcome": "Drip stopped; tenant informed; repair scheduled within 48 h.",
      "tier": "recommend",
      "gate": null,
      "standards_refs": ["Chubb: HVAC among top causes of interior water damage", "Zurich UK: offices carry many water-using systems (heating, AC)"],
      "asset_refs": {"brick_equipment": ["Fan_Coil_Unit", "Valve"], "brick_point": ["Condensate_Leak_Alarm"], "haystack_tags": ["fcu", "chilled-water", "equip"]},
      "provenance": {"expert_role": "Senior M&E Engineer", "transcript_segment": "EC-01 @ 00:57:00-00:59:40", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "TS-WTR-014",
      "pill": "technical_services",
      "title": "Re-energisation and return to service only after LEW inspection and documented clearance",
      "trigger": "Any electrical equipment, board or circuit that was wetted or isolated during the incident.",
      "cue_evidence": [{"type": "record", "ref": "LEW inspection/test report", "required": true}, {"type": "report", "ref": "Moisture readings for the room", "required": true}],
      "decision": "LEW inspects and tests; documents fitness; Technical Services restores in sequence; FCC confirms alarms normal.",
      "allowed_actions": ["LEW inspection", "Staged re-energisation", "Alarm verification"],
      "forbidden_actions": ["Re-energising on visual inspection alone", "Re-energising before the room is dry"],
      "exceptions": [],
      "escalation": {"to": "Duty Manager", "when": "LEW declines to certify", "deadline_min": 240},
      "owner": "LEW",
      "outcome": "Supply restored with LEW certification on file.",
      "tier": "escalate",
      "gate": {"block_actions_unless": "LEW_certificate_on_file == true", "blocked": ["re_energise"]},
      "standards_refs": ["EMA LEW regime; SS 638", "CNA Flood Preparation Guide: qualified electrician checks before re-entry"],
      "asset_refs": {"brick_equipment": ["Switchgear", "Breaker_Panel"], "brick_location": ["Electrical_Room"]},
      "provenance": {"expert_role": "LEW (contract)", "transcript_segment": "EC-06 @ 00:04:00-00:07:10", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    },
    {
      "rule_id": "AO-WTR-015",
      "pill": "asset_operations_orchestrator",
      "title": "Incident report within 24 h; regulatory reports where triggered; outcome captured into playbook version",
      "trigger": "Incident closed or 24 h elapsed, whichever first.",
      "cue_evidence": [{"type": "record", "ref": "Timeline, actions, approvals, overrides, outcomes", "required": true}],
      "decision": "Compile incident report; file MOM WSH incident report if injury/dangerous occurrence; BCA report if lift incident; record which rules fired, which were overridden and why; propose playbook diff for approval.",
      "allowed_actions": ["Report compilation", "Regulatory filings", "Playbook diff proposal"],
      "forbidden_actions": ["Auto-publishing a new playbook version without named approval", "Deleting override records"],
      "exceptions": [],
      "escalation": {"to": "Asset Operations Manager (approver of playbook versions)", "when": "Diff proposed", "deadline_min": 1440},
      "owner": "Asset Operations Manager",
      "outcome": "Report filed; new playbook version approved or rejected with rationale; rollback available.",
      "tier": "approve",
      "gate": {"block_actions_unless": "approver_signoff == true", "blocked": ["publish_playbook_version"]},
      "standards_refs": ["MOM WSH (Incident Reporting) Regulations (deadline to verify)", "BCA Reportable Matters Regulations 2025", "ISO/IEC 42001 A.6.2.8 event logs; A.8.4 communication of incidents", "NIST AI RMF MANAGE 4.1, 4.3 (post-deployment monitoring, incident tracking)", "ISO 55001 clause 10 improvement (incident investigation, nonconformity, corrective action)"],
      "asset_refs": {},
      "provenance": {"expert_role": "Asset Operations Manager", "transcript_segment": "EC-07 @ 00:02:00-00:05:00", "confirmation_status": "confirmed"},
      "version": "1.0.0"
    }
  ]
}
```

### 2.6 Why a Keppel judge will find this authentic

- Uses Singapore-specific authorities that an operations manager deals with (EMA LEW, SCDF FSM/CERT/ERP, BCA 6-hour lift incident call, NEA vector control, PUB flood alerts) rather than generic "call maintenance".
- Encodes the two classic failure modes experts warn about: (a) a well-meaning technician closing a sprinkler valve (impairment), and (b) a "quick look" into a wet switchroom.
- Puts irreversible actions (tenant communications, playbook publishing, IT power-down) behind named approval — consistent with the 2026 Singapore agentic-AI framework (§3.3).
- Deadlines are in minutes and tied to real deterioration (electrical contact, 24–48 h mould window, 6 h BCA, 24 h stagnant water).

---

## 3. Governance frameworks for the Responsible-AI score

### 3.1 IMDA/PDPC Model AI Governance Framework, 2nd ed. (Jan 2020) [verified from PDF text]

Section 3.14 defines the three approaches (quoted):
- **Human-in-the-loop**: "human oversight is active and involved, with the human retaining full control and the AI only providing recommendations or input. Decisions cannot be exercised without affirmative actions by the human, such as a human command to proceed with a given decision." It "requires AI to provide enough information for the human to make an informed decision (e.g. factors that are used in the decision, their value and weighting, correlations)."
- **Human-out-of-the-loop**: "no human oversight over the execution of decisions. The AI system has full control without the option of human override."
- **Human-over-the-loop (or human-on-the-loop)**: "the human is in a monitoring or supervisory role, with the ability to take over control when the AI model encounters unexpected or undesirable events (such as model failure). This approach allows humans to adjust parameters during the operation of the algorithm."

Section 3.15–3.17: a **probability × severity of harm matrix** determines the level of human involvement; footnote 4 adds other factors: "(a) the nature of harm… (b) the **reversibility of harm**, and… the ability for individuals to obtain recourse; and (c) whether it is operationally feasible or meaningful for a human to be involved".

Section 3.18 (quoted): "For safety-critical systems, it would be prudent for organisations to ensure that a person be allowed to assume control, with the AI system providing sufficient information for that person to make meaningful decisions or to safely shut down the system where human control is not possible."

The framework's four guiding areas: internal governance structures and measures; determining the level of human involvement in AI-augmented decision-making; operations management; stakeholder interaction and communication [verified structure].

### 3.2 IMDA/AI Verify Foundation — Model AI Governance Framework for Generative AI (final, 2024) [secondary]

Nine dimensions: Accountability; Data; Trusted Development and Deployment; Incident Reporting; Testing and Assurance; Security; Content Provenance; Safety and Alignment R&D; AI for Public Good. (Draft released 16 Jan 2024; consultation to 15 Mar 2024; final version published 2024 — the commonly cited month is May 2024 [verify before slide].) Relevant to MOSAIC: *Accountability* (responsibility allocated by level of control along the chain), *Incident Reporting*, *Testing and Assurance*.

### 3.3 IMDA — Model AI Governance Framework for Agentic AI (launched 22 Jan 2026 at WEF Davos; updated 20 May 2026 with feedback from 60+ organisations) [secondary: Baker McKenzie; Modulos summary; IMDA factsheet page confirmed title and date]

Four dimensions:
1. **Assess and bound risks upfront** — use-case-specific assessment considering **autonomy level**, access to sensitive data, breadth of data; bound risks "by design" by limiting tool access, permissions, operational environments and scope of permitted actions.
2. **Make humans meaningfully accountable** — clear responsibilities across developers, deployers, operators, end users; oversight mechanisms able to **override, intercept, or review** agent actions, especially for actions with real-world material impact.
3. **Implement technical controls and processes** — tool guardrails, plan reflection, least-privilege access; pre-deployment testing of task execution, policy compliance and tool-use accuracy; progressive roll-out and real-time monitoring.
4. **Enable end-user responsibility** — transparency about capabilities, escalation contact points, training to maintain essential human skills.

Human-oversight design detail (per the framework as summarised by Modulos):
- "define significant checkpoints or action boundaries that require human approval", "train humans to evaluate those requests effectively and audit the approvals", "complement them with automated monitoring and predefined alert thresholds"; oversight must not be "an approval button that humans press by reflex".
- Approval categories: **high-stakes actions**, **irreversible actions** ("permanently deleting data, sending communications, or making payments"), **outlier/atypical behaviour**, **user-defined boundaries**.
- Approval form should match the action: simple approve/reject for routine; **editable plan** for complex; **written justification** for high-risk.
- Metrics: **human override rate** (persistently low "may indicate rubber-stamping"); short **human response times** may indicate "automation bias or review fatigue"; outlier-reviewer analytics.
- **Deny actions by default** when approval infrastructure fails or no approval policy covers a new action.
- Observability to request: "logging of tool calls and access history".

### 3.4 AI Verify (AI Verify Foundation) [verified from aiverifyfoundation.sg]

Testing framework with four elements — Principles, Outcomes, Processes, Evidence — plus process checks and technical tests (AI Verify Toolkit for traditional AI; Project Moonshot for GenAI). The **11 principles**: Transparency; Explainability; Reproducibility; Safety; Security; Robustness; Fairness; Data Governance; Accountability; **Human Agency & Oversight**; Inclusive Growth, Societal and Environmental Well-being.

### 3.5 ISO/IEC 42001:2023 — AI management system [secondary control list; clause 4–10 mandatory, Annex A reference controls]

Controls to cite (IDs and titles): A.3.2 AI roles and responsibilities; A.5.2 AI system impact assessment process; A.5.3 Documentation of impact assessments; A.5.4 Assessing impacts on individuals or groups; A.6.2.4 AI system verification and validation; A.6.2.6 AI system operation and monitoring; A.6.2.7 Technical documentation; **A.6.2.8 AI system recording of event logs**; A.8.2 System documentation and information for users; A.8.4 Communication of incidents; **A.9.2 Processes for responsible use of AI systems; A.9.3 Objectives for responsible use; A.9.4 Intended use of the AI system**; A.10.2 Allocation of responsibilities; A.10.3 Suppliers. Commentators note that operating outside declared intended use (A.9.4) should trigger a new impact assessment (A.5) — this is MOSAIC's "escalate when outside pill scope".

### 3.6 NIST AI RMF 1.0 (Jan 2023) and Playbook [verified wording for GOVERN 3.2, MAP 3.5, MANAGE 1.3/2.4/4.1/4.2/4.3]

- **GOVERN 3.2**: "Policies and procedures are in place to define and differentiate roles and responsibilities for human-AI configurations and oversight of AI systems."
- **MAP 3.5**: "Processes for human oversight are defined, assessed, and documented in accordance with organizational policies from the GOVERN function."
- **MANAGE 1.3**: responses to high-priority risks "are developed, planned, and documented" (mitigate, transfer, avoid, accept).
- **MANAGE 2.4**: "Mechanisms are in place and applied, responsibilities are assigned and understood to supersede, disengage, or deactivate" AI systems whose performance or outcomes are inconsistent with intended use.
- **MANAGE 4.1**: post-deployment monitoring plans including "appeals and overrides, decommissioning, incident response, recovery, and change management".
- **MANAGE 4.3**: "Incidents and errors are communicated to relevant AI actors including affected communities. Processes for tracking, responding to, and recovering from incidents and errors are followed and documented."

### 3.7 EU AI Act Article 14 (Human oversight) [verified via artificialintelligenceact.eu]

High-risk systems must be designed so they "can be effectively overseen by natural persons during the period in which they are in use"; measures proportionate to risks, autonomy and context; overseers must be enabled to (a) "properly understand the relevant capacities and limitations", (b) "remain aware of the possible tendency of automatically relying or over-relying on the output" (automation bias), (c) "correctly interpret the… output", (d) "not to use the high-risk AI system or to otherwise disregard, override or reverse the output", (e) intervene or "interrupt the system through a 'stop' button or a similar procedure". Useful as a non-Singapore benchmark; MOSAIC is not EU high-risk, so cite as design alignment only.

### 3.8 Mapping MOSAIC's tiers and gates to the frameworks

| MOSAIC construct | Behaviour | IMDA MGF 2020 | MGF Agentic AI 2026 | ISO/IEC 42001 | NIST AI RMF | EU AI Act Art. 14 |
|---|---|---|---|---|---|---|
| **Recommend** | AI proposes; human performs the action in the physical world; nothing executes automatically | Human-in-the-loop ("AI only providing recommendations"); low–medium severity cells | Routine action: simple approve/reject form | A.9.2 processes for responsible use; A.8.2 information for users | MAP 3.5 oversight processes | 14(4)(c) interpret output |
| **Approve** | AI drafts an action a system *would* execute (send tenant notice, raise work order, publish playbook version); executes only after a *named* approver signs | Human-in-the-loop with "affirmative action by the human" | Approval checkpoint for **irreversible** actions ("sending communications") — editable plan or written justification | A.6.2.8 event logs (who approved what); A.3.2 roles | GOVERN 3.2 roles for human-AI configurations | 14(4)(d) override/reverse |
| **Escalate** | Situation exceeds pill authority or evidence missing; AI routes to a role with deadline; deterministic gate blocks unsafe actions | §3.18 safety-critical: "a person be allowed to assume control… or to safely shut down"; high-severity cells of the matrix; footnote 4 reversibility | **Deny by default** when no approval policy covers the action; outlier/atypical behaviour category | A.9.4 intended use → outside scope triggers A.5 impact assessment | MANAGE 2.4 supersede/disengage; MANAGE 1.3 planned responses | 14(4)(e) stop/interrupt |
| **Portfolio Pulse / evidence monitoring** (no actions) | Observes feeds, flags anomalies | Human-over-the-loop acceptable for low-severity, reversible, monitoring-only functions | Real-time monitoring, predefined alert thresholds | A.6.2.6 operation and monitoring | MANAGE 4.1 monitoring | 14(4)(a) monitor anomalies |
| **Not used** | Autonomous control of building systems | Human-out-of-the-loop — explicitly excluded by MOSAIC | — | — | — | — |
| **"Why this action?" drawer** | Shows rule, evidence, provenance, approver | HITL requires AI "provide enough information… factors used, their value and weighting" | Transparency to end users | A.8.2 | MAP/MEASURE transparency | 14(4)(a),(c) |
| **Override capture + version diff** | Every human override logged with reason; diffs approved | Operations management / audit trail | **Human override rate** as health metric; audit approvals | A.6.2.8; A.8.4 | MANAGE 4.1 appeals and overrides; MANAGE 4.3 incident tracking | — |
| **Role/sensitivity scoping of pills** | Pills carry allowed tools/actions/data | — | "bound risks by design": limit tool access, permissions, scope of permitted actions; least privilege | A.10.2 allocation of responsibilities | GOVERN 3.2 | 14(3) proportionality |

Responsible-AI evidence checklist for the deck (each item maps to a framework line above): (1) tier on every rule; (2) deterministic gates with evidence preconditions; (3) named approver and timestamp on approve-tier actions; (4) override log with reasons and override-rate KPI; (5) deny-by-default for unknown actions; (6) provenance per rule field; (7) version history with rollback; (8) role-based pill visibility; (9) incident report pipeline; (10) explicit "no autonomous control of building systems" statement; (11) AI Verify process-check mapping for Human Agency & Oversight, Accountability, Transparency, Explainability.

---

## 4. Building data standards for pill portability

### 4.1 What each standard gives MOSAIC

| Standard | What it is | Status / version | Use in pill schema | Confidence |
|---|---|---|---|---|
| **Brick Schema** | Open RDF/OWL ontology for buildings: Equipment, Location, Point (Sensor/Alarm/Setpoint/Command/Status), Substance, Quantity, relationships (feeds, hasPoint, hasLocation, isPartOf) | Current source version **1.5.0** (GitHub `bricksrc/version.py`) [verified]; classes verified in source: `Electrical_Equipment` → `Switchgear` (→ `Automatic_Switch`, `Circuit_Breaker` → `Main_Circuit_Breaker`, `Disconnect_Switch`), `Transformer`, `Bus_Riser`, `Motor_Control_Center`, `Breaker_Panel`, `Inverter`, `Energy_Storage`, `PlugStrip`; `Pump` → `Water_Pump` → `Chilled_Water_Pump`; `Storage_Tank`; `Elevator`; Alarms `Leak_Alarm` (→ `Condensate_Leak_Alarm`), `Liquid_Detection_Alarm`, `Water_Loss_Alarm`, `Water_Level_Alarm` (→ `Max_/Min_/Collection_Basin_`), `Humidity_Alarm` (→ `High_/Low_`); Sensors `Water_Leak_Sensor` (hasSubstance Water), `Water_Level_Sensor`; Locations `Electrical_Room`, `Mechanical_Room` → `Pump_Room`, `Server_Room`, `Basement`, `Riser` | Primary vocabulary for `asset_refs.brick_equipment`, `brick_point`, `brick_location`; evidence items reference Brick alarm/sensor classes | [verified from source] |
| **Project Haystack 4 (phIoT lib 4.0.0)** | Tag-based semantic model widely used in BMS integration; equips include ahu, fcu, crac, chiller, boiler, pump, tank, valve, meter, elec-meter, elec-panel, battery, vfd, switch, elevator, escalator; water tags: chilled-water, condenser-water, domestic-water, hot-water, makeup-water | 4.0.0 (page dated 2 Sep 2026) [verified]; **no leak/flood tag** in phIoT — rely on Brick for leak semantics | Secondary vocabulary `asset_refs.haystack_tags` for sites whose BMS speaks Haystack | [verified] |
| **RealEstateCore / Google Digital Buildings / ASHRAE 223P** | Alternative ontologies; 2026 comparison (arXiv 2603.14374) finds Brick and RealEstateCore more complete/expressive, Haystack and Brick more compact; "no single building ontology suits every integration task" | — | Mention as supported mappings; do not implement | [secondary] |
| **ISO 19650-3:2020** | Information management during the operational phase using BIM; appoints an information-management function, sets organisational information requirements, asset information standard; governs exchange between asset owner/operator and maintenance contractors | Published 2020 [verified abstract] | Pills reference the Asset Information Model as the source of truth for asset IDs and drawings (shutoff maps) | [verified abstract] |
| **COBie** (Construction Operations Building Information Exchange) | Spreadsheet/IFC schema for handing over FM asset data; originated by Bill East, US Army Corps of Engineers (2007); NBIMS-US Chapter 4.2 (COBie 2.4, 2015); **BS 1192-4:2014** code of practice; GSA P-100 (2017) | [verified via Wikipedia summary] | Worksheets *Facility, Floor, Space, Zone, Type, Component, System, Contact, Job, Document* [standard ref] → `asset_refs.cobie_component` and `cobie_system` give the human-readable asset register link | [verified/standard ref] |
| **IFC (ISO 16739-1)** | Open BIM data model | — | Underlying geometry/location; not referenced directly in pills | [standard ref] |
| **ISO 41001:2018** | Facility management — management systems — requirements; Annex SL 10-clause structure (planning, support, operation, performance evaluation, improvement) | [secondary]; the Support clause includes documented information and competence; whether 7.6 is titled "Organizational knowledge" [verify before slide] | Positions MOSAIC as the FM-system's knowledge-retention and operational-control mechanism; ISO 9001:2015 §7.1.6 "Organizational knowledge" is the well-known analogue (safeguard against loss of knowledge) | [secondary] |
| **ISO 55000/55001** | Asset management system; ISO 55001:2014 clause 7.5 *Information requirements*, 7.6 *Documented information*, clause 10 *Improvement* (nonconformity, corrective/preventive action); ISO 55001 revised 2024 [verify clause numbers in 2024 edition] | [standard ref] | Pills are "asset management decision criteria" artefacts; incident→playbook diff satisfies clause 10 | [standard ref] |
| **BCA Guide to Smart FM v2; Integrated FM; Certified FM Company scheme** | Singapore policy context for Smart FM and IFM | [verified via BCA pages] | Cite for "credible implementation path" and Singapore alignment | [verified] |

### 4.2 Recommended `asset_refs` block for the pill schema

```json
{
  "asset_refs": {
    "brick_equipment": ["Switchgear", "Main_Circuit_Breaker"],
    "brick_location": ["Electrical_Room"],
    "brick_point": ["Leak_Alarm", "Water_Leak_Sensor"],
    "haystack_tags": ["elec", "panel", "equip"],
    "cobie": {"component": "SWBD-B1-01", "system": "LV Distribution", "space": "B1-ER-01"},
    "aim_ref": "ISO19650-3:AIM/asset/SWBD-B1-01",
    "ontology_versions": {"brick": "1.5.0", "haystack_phIoT": "4.0.0"}
  }
}
```

Portability argument for judges: a pill never names a vendor point ID; it names a Brick class (and optional Haystack tags and COBie component). Any site whose BMS/CMMS can be tagged to Brick/Haystack (both have open converters) can run the same pill. Ontology versions are recorded so a pill can be re-validated when the ontology changes.

---

## 5. Quantified business value

### 5.1 Water damage — frequency and cost

- Water damage is the **2nd most common cause of commercial property loss, behind fire**; **non-weather water losses are ~20 % of all property insurance losses**; frequency and cost rising, "led by high rise commercial buildings" — Chubb commercial brochure [secondary; Chubb's own document].
- Top interior causes: domestic plumbing, roof intrusion, toilets, sprinklers, water heaters, HVAC — Chubb whitepaper via Insurance Business [secondary].
- Zurich UK Property Major Loss Team: commercial escape-of-water claims "reach seven figures" (GBP) [secondary].
- Average commercial water-damage loss **US$89,000** (ATI Restoration whitepaper, citing 470k+ claims; source method unclear) [verify before slide]; Allianz AGCS average water claim ~US$24,000 across ~2,700 North American claims in 2020 (all water causes) [secondary].
- UK ABI: insurers pay about **£1.8 million per day** for escape-of-water damage (via Clyde & Co 2023, Marsh) [secondary].
- Non-weather water losses (plumbing, toilets, etc.) ~US$16 billion (personal + commercial, Chubb brochure) [secondary].
- **Mould window**: materials must be dry within 24–48 h or remediation costs escalate — US EPA [verified].
- **Data-centre angle (Keppel)**: Uptime Institute Annual Outage Analysis — **54 % (2025 edition) / 57 % (2026 edition)** of significant outages cost > US$100,000; **~1 in 5 > US$1 million**; process/procedure failures rising [secondary, trade press of Uptime reports].
- **Rent exposure (Singapore)**: CBRE Q2 2026 Core CBD Grade A rent **S$12.50 psf/month** (record-low vacancy 3.3 %) [secondary, CBRE press release]. Illustration: a 10,000 sq ft tenant floor = S$125,000/month; a 14-day closure ≈ S$58,000 in rent abatement before restoration, tenant claims and reputational cost.

Illustrative slide line: *"One avoided switchroom flood or one anchor-tenant floor kept open pays for the pilot: a two-week closure of one Grade A floor ≈ S$58k rent alone; average commercial water loss ≈ US$89k; data-hall outage > US$100k in most cases."*

### 5.2 Knowledge loss when experts leave

- **42 % of institutional knowledge is unique to the employee's role and not shared**; colleagues "can't perform 42 % of their job" if that person leaves; knowledge workers lose **5.3 hours/week** waiting for or recreating information; **US$47 million/year** productivity loss for a large US business (modelled); **60 % find it difficult to nearly impossible** to get vital information from colleagues; new-hire formal training averages **2.5 months**, but getting up to speed takes **up to 6 months** — Panopto Workplace Knowledge and Productivity Report, 2018, n=1,000 [verified via HR Dive].
- Replacing an employee costs **one-half to two times annual salary** ("a conservative estimate") — Gallup [verified via gallup.com].
- Polanyi's paradox empirically supported: LLM-externalised tacit knowledge let novices approach expert performance (Cho et al. 2026) [verified abstract]; CDM elicited information "not available in the current literature" (Crandall et al. 1993).
- Rank et al. 2025: traditional tacit-knowledge elicitation "require[s] significant resources in time and personnel" [verified abstract] — the cost MOSAIC removes.

### 5.3 FM workforce ageing — global and Singapore

- IFMA (dated projection, widely cited by JLL/CIO Review): about **40 % of facility managers in high-income countries retiring by 2026**; average FM age ~49 vs 43 general workforce [secondary; dated].
- IFMA/WSU 2021 member survey (n=2,069): **31 % over 55** [secondary].
- Singapore: SMS Tan See Leng, World Workplace Asia Pacific 2022 gala speech — about **40 % of resident PMETs in the Built Environment sector are aged 50+**; **more than half of Singapore's buildings will be over 30 years old by 2025** [secondary — figure surfaced in search summary; page fetch returned navigation only; verify quote before slide].
- JTC (18 Sep 2025, Derrick Ong): "The growth in FM talent is not keeping pace"; private sector "struggling to attract staff for traditional FM tasks"; "An ageing workforce further exacerbates the problem, threatening to increase costs… while decreasing service standards, safety and operational efficiency" [verified].
- BCA (2026 forum reply): built environment faces "a growing, ageing building stock and tight manpower constraints"; IFM identified in 2021 as key enabler to reduce manpower reliance; Smart FM PoC grants; Certified FM Company scheme [verified via BCA pages].
- Ken Research: ~20,000 skilled-worker shortage projected for Singapore FM [low reliability — do not headline].

### 5.4 Onboarding time

- Panopto: formal training 2.5 months; up to 6 months to full productivity [verified via HR Dive]. MOSAIC target claim: pills convert a 6-month "learn from the senior" ramp into day-one guided decisions with named escalation — frame as hypothesis, measure in pilot.

### 5.5 Suggested "Business Value" numbers (with sources on slide)

1. Water = #2 commercial property loss cause; 20 % of all property losses are non-weather water (Chubb).
2. Commercial EoW claims reach seven figures (Zurich); average ≈ US$89k (ATI, caveat).
3. 24–48 h drying window (EPA) → minutes matter.
4. 42 % of knowledge is unique to one person; 5.3 h/week lost (Panopto 2018).
5. Replacement cost 0.5–2× salary (Gallup).
6. ~40 % of Singapore BE PMETs are 50+ (MND 2022, verify); FM talent growth "not keeping pace" (JTC 2025).
7. One Grade A floor ≈ S$125k/month rent at S$12.50 psf (CBRE Q2 2026).
8. 54–57 % of DC outages > US$100k (Uptime).

---

## 6. Reference list

Knowledge elicitation (peer-reviewed; Consensus links):
- [Critical decision method for eliciting knowledge](https://consensus.app/papers/details/9f7afb60a3f850c3b4bc3d0c8ef956fa/?utm_source=claude_desktop) (Klein, Calderwood & MacGregor, 1989, IEEE Trans. SMC, 1115 citations)
- [Use of the Critical Decision Method to Elicit Expert Knowledge: A Case Study in the Methodology of Cognitive Task Analysis](https://consensus.app/papers/details/82dfd0eb6dff516fbded23764297cce7/?utm_source=claude_desktop) (Hoffman, Crandall & Shadbolt, 1998, Human Factors, 435 citations)
- [Applied cognitive task analysis (ACTA): a practitioner's toolkit for understanding cognitive task demands](https://consensus.app/papers/details/996a98b9889259aa91ec64ccd2a80255/?utm_source=claude_desktop) (Militello & Hutton, 1998, Ergonomics, 603 citations)
- [Applied Cognitive Task Analysis (ACTA) Methodology](https://consensus.app/papers/details/e8176417b7745c5c9f210e5b06948b28/?utm_source=claude_desktop) (Militello et al., 1997)
- [Cognitive Task Analysis: Eliciting Expert Cognition in Context](https://consensus.app/papers/details/58024190e3225e888edc4e1d5d4661b0/?utm_source=claude_desktop) (Brown et al., 2024, Organizational Research Methods)
- [Adapting Cognitive Task Analysis Methods for Use in a Large Sample Simulation Study of High-Risk Healthcare Events](https://consensus.app/papers/details/f8a729c701e85acba52665354cb28127/?utm_source=claude_desktop) (Militello et al., 2023, J. Cognitive Engineering and Decision Making)
- [Critical decision method: A technique for eliciting concrete assessment indicators from the intuition of NICU nurses](https://consensus.app/papers/details/5ead1aaaeb8f5a11b2e58ef051c16b4c/?utm_source=claude_desktop) (Crandall et al., 1993, Advances in Nursing Science)
- [A comparative study of think-aloud and critical decision knowledge elicitation methods](https://consensus.app/papers/details/7d0d010592e3537aa9f01e8151427c95/?utm_source=claude_desktop) (Crandall, 1989, SIGART Newsletter)
- [Expert knowledge elicitation in the firefighting domain and the implications for training novices](https://consensus.app/papers/details/adc41c0f67d55bd9a6dd81c0be5299dc/?utm_source=claude_desktop) (Okoli, 2020)
- [A naturalistic decision-making approach to managing non-routine fire incidents](https://consensus.app/papers/details/18af3b56d2265606aa10d7dae0a04a25/?utm_source=claude_desktop) (Okoli et al., 2021, J. Risk Research)
- [The use of cognitive task analysis in clinical and health services research — a systematic review](https://consensus.app/papers/details/1adaf65ea73b51429905d13a078d9c4e/?utm_source=claude_desktop) (Swaby et al., 2022)
- [Cognitive task analysis](https://consensus.app/papers/details/5f697f34354b5965ab6ac18692dccc83/?utm_source=claude_desktop) (Feldon, 2009, 623 citations)
- [The Repertory Grid Technique](https://consensus.app/papers/details/93f00ba297e758b593ecaa0e8faabf41/?utm_source=claude_desktop) (Bourne et al., 2017)
- [The Easy Guide to Repertory Grids](https://consensus.app/papers/details/ec0e60e74c965a1e9da1a3439c2402f7/?utm_source=claude_desktop) (Jankowicz, 2003, 495 citations)
- [A manual for repertory grid technique](https://consensus.app/papers/details/486bece7d82459238e55be3a6052b6ac/?utm_source=claude_desktop) (Fransella et al., 1977/2004, 1568 citations)
- [Laddering: technique and tool use in knowledge acquisition](https://consensus.app/papers/details/d8ea35383dd95d57bfb120061b0f05c8/?utm_source=claude_desktop) (Corbridge et al., 1994, Knowledge Acquisition)
- [The uses of 'contrived' knowledge elicitation techniques](https://consensus.app/papers/details/8646609f09ab5c49a33c3f1df8a18572/?utm_source=claude_desktop) (McGeorge & Rugg, 1992, Expert Systems)
- [Knowledge elicitation: issues and methods](https://consensus.app/papers/details/2a7e7ee88d765a34bc2810c2c9561355/?utm_source=claude_desktop) (Hart, 1985)
- Shadbolt & Smart (2015) Knowledge Elicitation: Methods, Tools and Techniques, in *Evaluation of Human Work* 4th ed., CRC Press, 163–200 — https://eprints.soton.ac.uk/359638
- Crandall, Klein & Hoffman (2006) *Working Minds*, MIT Press [standard ref]; Ericsson & Simon (1980) Psychological Review 87(3):215–251; (1993) *Protocol Analysis*, MIT Press [standard ref]; Kelly (1955) *The Psychology of Personal Constructs* [standard ref]; Flanagan (1954) Psychological Bulletin 51(4):327–358 [standard ref]; Reynolds & Gutman (1988) J. Advertising Research 28(1):11–31 [standard ref]
- AHRQ Critical Decision Method tool page — https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/critical-decision-method

LLM-driven elicitation / SOP extraction:
- [Leveraging Large Language Models for Tacit Knowledge Discovery in Organizational Contexts](https://consensus.app/papers/details/1c6d20ebdf425291aed9f560a355f8ba/?utm_source=claude_desktop) (Zuin et al., 2025, IJCNN)
- [Large Language Models for Tacit Knowledge Elicitation in Industry 5.0: A Literature Review](https://consensus.app/papers/details/f29d78d3d34250659b9d4376f22415b3/?utm_source=claude_desktop) (Rank et al., 2025, AHFE)
- [From Tacit Knowledge to Structured Documents: A Framework for Knowledge Elicitation](https://consensus.app/papers/details/e2f21b6729255626b961aa29dd6aab83/?utm_source=claude_desktop) (Roudiere et al., 2026, ECKM)
- [K-GRASP: Tacit Knowledge Externalisation with Language Models and Knowledge Graphs](https://consensus.app/papers/details/3aff4c1e872558e5a8a53905fec24863/?utm_source=claude_desktop) (Luna et al., 2026, ECKM)
- [Large Language Models Explain Experts Better Than Experts Themselves](https://consensus.app/papers/details/42403bc8f0245e09a6caf5de70e49584/?utm_source=claude_desktop) (Cho et al., 2026)
- [Large Language Models for Process Knowledge Acquisition](https://consensus.app/papers/details/1da30349ad765b9383b209d62fe5c906/?utm_source=claude_desktop) (Schinckus et al., 2025, BISE)
- [Comparing the performance of a large language model and naive human interviewers in interviewing children](https://consensus.app/papers/details/15f1fd19d9355dcb8b34e5fa6f7a7f2b/?utm_source=claude_desktop) (Sun et al., 2025, PLOS One)
- [Qualitative Research Methods for Large Language Models: Conducting Semi-Structured Interviews with ChatGPT and BARD](https://consensus.app/papers/details/7752b4d1d28e55d0bb9aad8a441df50b/?utm_source=claude_desktop) (Dengel et al., 2023)
- [LLM-assisted hybrid interfaces for remote repertory grid interviews](https://consensus.app/papers/details/178947c6d37e5a85a3dcc53198d4747f/?utm_source=claude_desktop) (Liu et al., 2026, Computers in Human Behavior Reports)
- [Extracting Business Process Entities and Relations from Text Using Pre-trained Language Models and In-Context Learning](https://consensus.app/papers/details/25646d55968c5355b0f419e7f2cf20fd/?utm_source=claude_desktop) (Bellan et al., 2022)
- [A Universal Prompting Strategy for Extracting Process Model Information from Natural Language Text using Large Language Models](https://consensus.app/papers/details/365257b2fd9552c9a609e151f93fe937/?utm_source=claude_desktop) (Neuberger et al., 2024)
- [Large Language Models can accomplish Business Process Management Tasks](https://consensus.app/papers/details/1b037b9626f852fcaa6a026d8b8dc686/?utm_source=claude_desktop) (Grohs et al., 2023)
- [Procedural Text Mining with Large Language Models](https://consensus.app/papers/details/3839db159ce75bcc85c70dc4e1d49d6b/?utm_source=claude_desktop) (Rula et al., 2023, K-CAP)
- [Process Knowledge Extraction and Knowledge Graph Construction Through Prompting](https://consensus.app/papers/details/a05f90eb1d795271b41813c5b5377ef5/?utm_source=claude_desktop) (Bellan et al., 2024, ACM SAC)
- [Automatically Generating BPMN 2.0 Process Models from Natural Language Process Descriptions](https://consensus.app/papers/details/b1937dddf06e5041a560bf1f31bee1d3/?utm_source=claude_desktop) (Hörner et al., 2026, BISE)
- Li, Tamkin, Goodman & Andreas — Eliciting Human Preferences with Language Models (GATE), arXiv 2310.11589, ICLR 2025 — https://arxiv.org/abs/2310.11589
- Geiecke & Jaravel — Conversations at Scale: Robust AI-led Interviews — https://papers.ssrn.com/abstract=4974382 ; CEPR DP19705 — https://cepr.org/publications/dp19705
- SOP-Agent: Empower General Purpose AI Agent with Domain-Specific SOPs, arXiv 2501.09316 — https://arxiv.org/abs/2501.09316
- LLMREI, arXiv 2507.02564 — https://arxiv.org/pdf/2507.02564 ; ReqElicitGym, arXiv 2602.18306 — https://arxiv.org/html/2602.18306v1 ; From Chat to Interview (OntoAgent), arXiv 2605.05828 — https://arxiv.org/pdf/2605.05828 ; LadderTeam, arXiv 2608.17029 — https://huggingface.co/papers/2608.17029 ; iReDev, arXiv 2507.13081 — https://arxiv.org/pdf/2507.13081

Water-damage response and Singapore regulation:
- Minimizing Water Damage (risk-engineering guide) — https://www.cfins.com/wp-content/uploads/2021/11/Minimizing-Water-Damage.pdf
- Arch AIRE Water Damage Mitigation Plan — https://www.archgroup.com/wp-content/uploads/Arch-AIRE-Water-Damage-Mitigation-Plan-MCE-008RB-0526.pdf
- CNA Risk Control Flood Preparation Guide (via MCAA) — https://www.mcaa.org/wp-content/uploads/2017/09/CNARiskControlFloodPreparationGuide.pdf
- Chubb StreamLabs commercial brochure (water = #2 commercial loss cause; 20 % non-weather) — https://www.chubb.com/content/dam/chubb-sites/chubb-com/us-en/business-insurance/iot-solutions-to-prevent-losses-to-your-home-or-business/pdf/chubb_streamlabs-commercial-brochure.pdf
- Chubb, Water Losses Front and Center Vol. II — https://www.chubb.com/content/dam/aem-chubb-global/amc/pdf/water_losses_front_and_center_vol_ii.pdf
- Zurich UK, The risks of escape of water in commercial buildings — https://www.zurich.co.uk/news-and-insight/the-risks-of-escape-of-water-in-commercial-buildings ; Zurich EoW for property managers — https://www.zurich.co.uk/news-and-insight/escape-of-water-property-manager
- FM Global red-tag practice based on Data Sheet 10-7 (university programme) — https://risk.uni.edu/fire-protection-impairment-program ; https://www.northwestern.edu/risk/environmental-health-safety/docs/workplace-safety-docs/fire-protection-system-impairments-red-tag-program.pdf
- IICRC S500 key terms (Cleanfax) — https://cleanfax.com/practical-application-s500-2015-key-terms/ ; Legend Brands categories — https://techtips.legendbrands.com/restoration-basics-1-water-damage-categories
- US EPA, Mold Remediation in Schools and Commercial Buildings, Ch. 4 (Table 1, 24–48 h) — https://epa.gov/mold/mold-remediation-schools-and-commercial-buildings-guide-chapter-4
- BOMA Emergency Preparedness Guidebook — https://www.boma.org/BOMA/BOMA/Research-Resources/Publication_Pages/Emergency%20Preparedness%20Guidebook.aspx ; BOMA Security & Emergency Preparedness — https://boma.org/advocacy/security-emergency/
- EMA Handbook for Application of Electrical Installation Licence / LEW regime — https://elise.ema.gov.sg/eguides/HFAEIL_10.pdf ; LEW classes — https://elise.ema.gov.sg/elise/eisiInstallationApplyNote.jsp
- WSH Council Alert 21 June 2023, worker electrocuted during solar panel installation — https://www.tal.sg/wshc/resources/newsletters/wsh-alerts/wsh-alert-21-june-2023-worker-electrocuted-during-solar-panel-installation ; WSH Council wet-weather reminder — https://tal.sg/wshc/media/announcements/2021/safety-reminder--wet-weather-safety
- SCDF CERT — https://www.scdf.gov.sg/fire-safety-services-listing/company-emergency-response-cert ; MHA commencement of Fire Safety (Amendment) Act — https://www.mha.gov.sg/media-room/newsroom/commencement-of-the-fire-safety-amendment-act/
- BCA incident notification (6-hour call) — https://www1.bca.gov.sg/regulatory-info/lifts-escalators/lifts-and-escalators-legislation/incident-notification ; Reportable matters — https://www1.bca.gov.sg/safety-and-standards/lifts-escalators-and-mechanised-car-parking-systems/fixed-installations-legislations/reportable-matters/ ; Good practices guide for lift owners — https://www1.bca.gov.sg/docs/default-source/docs-corp-regulatory/lift-escalators-e-guide/good-practices-guide-for-lift-owners.pdf
- NEA enforcement on mosquito breeding — https://www.nea.gov.sg/media/news/news/index/nea-will-take-strong-enforcement-action-against-premises-found-with-repeat-and-profuse-mosquito-breeding ; LTA Vector Control Guidebook (Act maximum) — https://www.lta.gov.sg/content/dam/ltagov/industry_innovations/industry_matters/safety_health_environment/construction_safety_environment/pdf/Vector_Control_Guidebook_(compressed)_new.pdf
- PUB flood alerts — https://www.pub.gov.sg/Public/KeyInitiatives/Flood-Resilience/Flood-Forecasting-and-Monitoring/Subscribe-to-SMS-Alerts ; PUB Flood Wise campaign 2024 — https://www.pub.gov.sg/Resources/News-Room/PressReleases/2024/11/PUB-launches-inaugural-flood-resilience-campaign-to-educate-public-on-being-Flood-Wise

Governance:
- IMDA/PDPC Model AI Governance Framework, 2nd ed. (2020) PDF — https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/resource-for-organisation/ai/sgmodelaigovframework2.pdf (text extracted locally: scratchpad/imda_mgf2.txt)
- IMDA factsheet, Updated Model AI Governance Framework for Agentic AI (20 May 2026) — https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/factsheets/2026/updated-model-ai-governance-framework-for-agentic-ai
- Baker McKenzie summary of MGF Agentic AI (29 Jan 2026) — https://www.bakermckenzie.com/en/insight/publications/2026/01/singapore-governance-framework-for-agentic-ai-launched ; Allen & Gledhill — https://www.allenandgledhill.com/mm/publication/articles/32314/launches-new-model-ai-governance-framework-for-agentic-ai ; Modulos summary (human accountability) — https://docs.modulos.ai/frameworks/singapore-mgf-agentic/human-accountability
- MGF for Generative AI (AI Verify Foundation) — https://aiverifyfoundation.sg/?p=10545 ; OECD catalogue entry — https://oecd.ai/en/catalogue/tools/model-ai-governance-framework-for-generative-ai
- AI Verify — https://aiverifyfoundation.sg/what-is-ai-verify/
- ISO/IEC 42001 Annex A control list (secondary) — https://riskprofs.com/iso-42001-annex-a-controls-list/ ; https://www.tcsa.in/frameworks/iso-42001/controls
- NIST AI RMF Core — https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ ; Playbook MANAGE — https://airc.nist.gov/airmf-resources/playbook/manage/
- EU AI Act Article 14 — https://artificialintelligenceact.eu/article/14/

Building data standards:
- Brick Schema source (version 1.5.0; classes verified) — https://github.com/BrickSchema/Brick (bricksrc/equipment.py, alarm.py, sensor.py, location.py) ; https://brickschema.org
- Project Haystack phIoT 4.0.0 — https://project-haystack.org/doc/lib-phIoT/index
- A Systematic Comparison and Evaluation of Building Ontologies (2026) — https://arxiv.org/html/2603.14374v1 ; Survey on Semantic Modeling for Building Energy Management — https://arxiv.org/pdf/2404.11716
- ISO 19650-3:2020 preview — https://webstore.ansi.org/preview-pages/ISO/preview_ISO+19650-3-2020.pdf
- COBie — https://en.wikipedia.org/wiki/COBie
- BCA Guide to Smart FM v2 — https://www1.bca.gov.sg/docs/default-source/docs-corp-buildsg/facilities-management/guide_to_smart_fm_v2.pdf ; BCA Accelerating the Transformation of the FM Industry — https://www1.bca.gov.sg/resources/newsroom/accelerating-the-transformation-of-the-fm-industry/ ; BCA forum reply on IFM (2026) — https://www1.bca.gov.sg/resources/newsroom/forum--integrated-facilities-management-designed-to-uplift-sector/

Business value:
- HR Dive on Panopto Workplace Knowledge and Productivity Report (2018) — https://www.hrdive.com/news/inefficient-knowledge-sharing-costs-large-us-businesses-47m-a-year/527892/
- Gallup, This Fixable Problem Costs U.S. Businesses $1 Trillion — https://www.gallup.com/workplace/247391/fixable-problem-costs-businesses-trillion.aspx
- JTC, Towards Zero Operations (18 Sep 2025) — https://www.jtc.gov.sg/about-jtc/news-and-stories/feature-stories/partners-night---derrick-ong
- MND, Speech by SMS Tan at World Workplace Asia Pacific 2022 gala — https://mnd.gov.sg/newsroom/speeches/view/speech-by-sms-tan-at-the-gala-dinner-for-world-workplace-asia-pacific-2022
- JLL, Firms are on the hunt for tech-savvy facilities managers (IFMA 40 % retirement projection) — https://www.jll.com/en-uk/insights/firms-are-on-the-hunt-for-tech-savvy-facilities-managers ; IFMA/WSU 2021 survey — https://jfmer.kglmeridian.com/downloadpdf/view/journals/fmer/6/1/article-p15.pdf
- CBRE, Singapore Grade A office market sixth consecutive quarter of rental growth (Q2 2026) — https://www.cbre.com.sg/press-releases/singapore-grade-a-office-market-records-sixth-consecutive-quarter-of-rental-growth
- Uptime Institute Annual Outage Analysis coverage — https://www.datacenterknowledge.com/outages/data-center-outages-decline-for-fourth-straight-year-but-issues-persist ; https://www.itweb.co.za/article/uptime-announces-annual-outage-analysis-report-2026/o1Jr5MxPNOwMKdWL
- ATI Restoration whitepaper (US$89k average commercial loss; caveat) — https://atirestoration.com/wp-content/uploads/2021/03/Whitepaper_Water-Damage-and-Insurance-Implications_compressed.pdf
- Clyde & Co, The rising cost of escape of water claims (ABI £1.8m/day) — https://www.clydeco.com/en/insights/2023/07/the-rising-cost-of-escape-of-water-claims

Consensus notice (required by the search tool): Upgrade to Consensus Pro to return 20 results per search instead of 10, and include more data like study design and key takeaways for every result.: https://consensus.app/pricing/?utm_source=claude_desktop
