# Classic Human-Led Expert Knowledge Elicitation Methods: Evidence on Knowledge Quality vs Expert Time Cost

Scope note: Consensus MCP was unavailable (session expired), so these notes come from web search plus full-text reads of three primary/near-primary documents: Clark et al. 2008 handbook chapter, Hoffman 1987 *AI Magazine*, and Militello & Lim 1995 HFES. Several key primary reports (the ACTA NPRDC report on DTIC, Hoffman et al. 1995, Burton et al. 1990, Hoffman/Crandall/Shadbolt 1998) were paywalled or returned 403, so abstract-level claims are marked as such. Most of the quantitative base is **old (1987–2008)**. The research tradition peaked during the expert-systems era and has not been re-measured much since.

## 1. What each method captures well (tacit cues, exceptions, decision points vs explicit procedures)

### Takeaway
Methods divide by what they reach. Document/SOP analysis and unstructured or structured interviews mainly capture explicit, declarative and procedural knowledge. Incident-anchored CTA (CDM, ACTA knowledge audit and simulation interview) and "contrived" tasks (limited-information, constrained-processing, tough cases) are what reach cues, decision points, pattern recognition and exceptions. Sorting, laddering and repertory grid efficiently capture *conceptual/taxonomic* structure, such as categories of faults or equipment, but not decision sequences.

### Cited Findings
- **Taxonomy (Hoffman et al. 1995):** elicitation methods fall into three families: (1) analysis of tasks experts usually perform; (2) interviews of various types; (3) contrived tasks that reveal reasoning without asking about it directly. Wei & Salvendy (2004) later added a fourth family, formal models. — [Hoffman, Shadbolt, Burton & Klein 1995, OBHDP 62(2):129–158 (abstract)](https://research.bond.edu.au/en/publications/eliciting-knowledge-from-experts-a-methodological-analysis/); [Clark et al. 2008 chapter](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Standard CTA pipeline (Clark et al. 2008):**
  1. Collect preliminary knowledge: document analysis, observation, and structured or unstructured interviews.
  2. Identify knowledge types.
  3. Apply focused elicitation methods.
  4. Analyze and verify data.
  5. Format results.

  Experts are "most often interviewed separately to avoid premature consensus." — [Clark et al. 2008](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Why self-explanation fails (the mechanism):** automated expert knowledge "operates outside of conscious awareness" and is "not available for introspection." As a result, "experts' unaided self-reports of their problem-solving processes are typically inaccurate or incomplete." Newly generated reasoning on novel problems is reported more accurately than pre-existing routines applied to them. — [Clark et al. 2008, p. 584–585](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Critical Decision Method (CDM):** a retrospective interview that applies cognitive probes to actual *non-routine* events. It was developed in 1988 with fireground commanders for the US Army Research Institute (ARI TR-796). The study found commanders mostly used recognition rather than option comparison. A secondary summary says that in ~80% of incidents commanders handled decision points without considering more than one option; treat this figure as secondary. — [Klein, Calderwood & Clinton-Cirocco 1988, ARI TR-796](https://apps.dtic.mil/sti/pdfs/ADA199492.pdf); [gary-klein.com/cdm](https://www.gary-klein.com/cdm)
- **Hoffman, Crandall & Shadbolt (1998):** characterize CDM as "multiple-pass event retrospection guided by probe questions." Its products include Situation Assessment Records, timelines and decision requirements. The paper explicitly addresses reliability, validity, efficiency and utility, but its numbers were not retrievable. — [Human Factors 40:254–276 (record)](https://eprints.soton.ac.uk/252284)
- **CDM in nursing (worked example of what CDM yields):** 19 NICU nurses (14 experts averaging 10 yrs NICU, 5 less-experienced) at 3 hospitals.
  - Sessions were 1.5–2 h each, with 3 incident types per nurse:
    - a correct hunch;
    - an incorrect hunch;
    - a missed or misattributed case.
  - 117 situation-assessment shifts were coded (avg 3.8 per incident).
  - Inter-rater kappa was .81 for cues, .82 for concern level, .74 for suspecting NEC and .50 for actions.
  - Experts held a "much more sophisticated view of NEC than is found in the instructional nursing literature": they used patterns of cues in the context of a specific baby, whereas texts gave flat cue lists. This is a direct example of CDM surfacing tacit cue-patterns and exceptions that documentation lacks.

  — [Militello & Lim 1995, HFES 39th Annual Meeting](https://www.shadowboxtraining.com/wp-content/uploads/2026/08/A-Cognitive-Task-Analysis-of-NICU-Nurses-Patient-Assessment-Skills-by-Miletello1995.pdf)
- **CTA vs nurses' free recall (Crandall & Getchell-Reiter 1993, as reported by Clark et al.):** 17 NICU RNs averaging 13 yrs experience first gave free recall of critical incidents, then received CTA probes. The probes "elicited significantly more indicators of medical distress" than free recall; before CTA, cues were omitted or described vaguely as "highly generalized constellations of cues." **25 of 70 cues (>1/3)** the expert nurses used were absent from the medical and nursing training literature. They spanned 7 previously unrecognized categories, which were later added to standard training. — [Clark et al. 2008, p. 585](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf). Note: I could not locate the primary 1993 paper online; one search suggested the related primary NICU CDM work is Crandall & Calderwood 1989. Treat the citation as secondary.
- **ACTA (Militello & Hutton 1998, *Ergonomics* 41(11):1618–1641):** a streamlined CTA for practitioners, built because "CTA is resource intensive." It has three interview methods plus an output table:
  - **Task diagram:** gives the overview and locates the cognitively hard steps.
  - **Knowledge audit:** probes aspects of expertise such as past/future, big picture, noticing, job smarts, opportunities/improvising, self-monitoring and anomalies.
  - **Simulation interview:** walks through a scenario covering situation assessment, likely errors and how a novice would respond.
  - **Cognitive demands table:** synthesizes the findings.

  Evaluation results: "easy to use, flexible, and to provide clear output," and materials built from ACTA were "accurate and important for training purposes." — [PubMed abstract](https://pubmed.ncbi.nlm.nih.gov/9819578/); [BPS overview](https://www.bps.org.uk/psychologist/methods-accessing-expert-cognition)
- **Hoffman's "contrived" tasks:**
  - **Limited-information task:** the expert does a familiar task with some normally available data withheld.
  - **Constrained-processing task:** time or question constraints are imposed, e.g. 2 min to inspect an aerial photo that normally takes hours.
  - **Method of tough cases:** turns routine cases into hard ones.

  These are used to "disclose aspects of reasoning that the data base might lack." — [Hoffman 1987, AI Magazine 8:53–67](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583)
- **Interview vs card sort vs "twenty questions" (industrial lighting experts):** the structured interview and twenty-questions produced roughly the same number of rules; card sort produced fewer. The interview also had slightly higher agreement between knowledge engineers extracting rules independently. — [Schweickert, Burton, Shadbolt et al., "Comparing knowledge elicitation techniques: a case study" (abstract)](https://research.bond.edu.au/en/publications/comparing-knowledge-elicitation-techniques-a-case-study/)
- **Sorting variants:** "no significant differences between the types of knowledge elicited by different types of sort," so computerized sorts may match manual card sorts. — [Rugg, Corbridge, Major, Burton & Shadbolt 1992 (abstract)](https://research.bond.edu.au/en/publications/a-comparison-of-sorting-techniques-in-knowledge-acquisition/)
- **Expert self-explanation of procedure is unreliable even for "simple" assembly:** a team of engineers and technicians made "extensive and repeated efforts" to write complete assembly instructions for research equipment. They still omitted a step that was a universal practice among them, and the equipment did not work (Collins et al. 1985). — [Clark et al. 2008, p. 585](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Physician self-report vs actual cue use:** diagnoses of identical symptoms presented at different times correlated only .40–.50. Physicians said they considered extended symptom lists, but only 1–4 symptoms actually drove decisions (Einhorn 1974; Hoffman et al. 1968). — [Clark et al. 2008, p. 585](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)

### Inferences
- For Keystone (chief engineers and technicians in facility operations):
  - SOPs, O&M manuals and work-order histories supply the *explicit procedure* layer.
  - The incremental value of human elicitation lies in cues, anomaly detection, "what would make you deviate," and fault-pattern recognition. Incident-anchored methods (CDM, knowledge audit) target exactly these.
  - Card sort and laddering suit building an equipment/fault taxonomy cheaply but will not produce decision rules.
- The NICU and assembly examples suggest that asking a technician to "write down how you do X" will reproduce documented steps and drop the universally shared but unspoken ones. These dropped steps are often the ones a novice or an AI most needs.

### Gaps
- Primary-source numbers for ACTA output quality versus an unstructured-interview comparison group were not retrievable (the DTIC report returned 403).
- No facilities/HVAC/building-services-specific CTA outcome study was found. The nearest technical-maintenance analogues are the radar and avionics troubleshooting studies in Section 2.
- I found no primary quantitative evidence on repertory grid specifically in operational/maintenance domains.

## 2. Measured outcomes: how much more/different knowledge CTA captures, and time costs

### Takeaway
The best quantitative evidence is three findings:
- **Chao & Salvendy (1994):** no single expert verbalized more than 29–53% of their actual actions, whatever the elicitation method; pooling 6 experts raised coverage to 62–88%.
- **Sullivan et al. (colonoscopy):** individual surgeons articulated only 26–50% of the steps and 25–43% of the decision points identified by CTA.
- **Hoffman (1987):** unstructured interviews yielded only ~0.13 new propositions per *total task minute*, because every interview hour cost ~10 hours of total analyst time.

The widely quoted "experts omit ~70% of decisions" is a summary claim from Clark's group (Feldon & Clark 2006; Clark & Elen 2006), not a single measured result. CTA-based training shows large effects (meta-analytic d = 1.72; g = 0.87). CTA costs roughly 85% more front-end design time in the one cost study.

### Cited Findings
**Knowledge-capture rates**
- **Chao & Salvendy 1994 (strongest direct measure):**
  - Design: 6 expert programmers did troubleshooting tasks with all actions recorded, then explained them using various elicitation methods.
  - Single-expert ceiling: no expert reported more than 41% of diagnostic actions, 53% of debugging actions or 29% of interpretations, "regardless of the knowledge elicitation method used."
  - Pooled: aggregating all 6 experts raised coverage to 87%, 88% and 62%.
  - Cause: experts differ in *which* sub-skills are automated.
  - Quality: domain is software troubleshooting, n = 6 and the study is old, but it measures actual behaviour against self-report.

  — [Clark et al. 2008, p. 585](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **The "70%" claim:** Clark et al. (2008) state "experts are not fully aware of about 70% of their own decisions and mental analysis of tasks (Clark and Elen, 2006; Feldon and Clark, 2006)." Yates & Clark state "a number of studies have reported… experts omit about 70% of the important decisions they make when describing a complex task (Feldon & Clark, 2006)." **Quality flag:** this is a review-level synthesis by the same research group, not a single measured study. I found no single peer-reviewed study reporting exactly 70%. The closest empirical anchors are Chao & Salvendy (29–53% reported) and Sullivan (25–50% reported). — [Clark et al. 2008, p. 590](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf); [Yates & Clark chapter](https://s3-eu-west-1.amazonaws.com/s3-euw1-ap-pe-ws4-cws-documents.ri-prod/9780415879019/Cognitive_Task_Analysis.pdf)
- **Sullivan et al. (colonoscopy, Clark co-author; manuscript received 2007):** 3 expert colorectal surgeons were videotaped doing the procedure, then CTA built a 26-step procedural checklist and a 16-item cognitive demands table.
  - Surgeon A described 50% of steps and 43% of decisions.
  - Surgeon B described 30% of steps and 25% of decisions.
  - Surgeon C described 26% of steps and 38% of decisions.

  — [Sullivan et al., UVA-hosted PDF](https://faculty.med.virginia.edu/facultyaffairs/files/2016/04/2015-6-9b-1.pdf) (via search summary; PDF not opened by me)
- **Coronary bypass CTA (mixed methods):** interviews with 9 surgical experts identified 137 cognitive processes: 33 decision points, 23 critical communications, 43 pitfalls and 38 strategies. This shows the *type* of content CTA yields. — [search result, iris.unitn.it "dissecting cardiac surgery"](https://iris.unitn.it/retrieve/7c1a996d-5091-464f-a24e-bb1668889596/dissecting%20cardiac%20surgery.pdf) (not opened; secondary)

**Elicitation efficiency (analyst time)**
- **Hoffman 1987, airlift planners:**
  - Effort: 10 h of taped unstructured interviews required **100 h total task time** (prep + session + transcription/analysis, i.e. ~10:1). They involved 957 interviewer questions and yielded 753 propositions.
  - Overall rate: **≈0.13 propositions per task-minute**, ≈0.8 per question.
  - Rate over time: early hours produced >200 propositions/hour of interview, which fell to ~40/hour later. In the first 5 h the rate was ~1.6 per task-minute.
  - Benchmarks: ~2 new propositions per task-minute is "on the right track," ~1 indicates inefficiency, and ~3 is "golden."
  - Recommendations:
    - Structured interviews "can be many times more efficient overall."
    - Limited-information and constrained-processing tasks should take 15–45 min each but still need transcription.
    - Only the structured interview yields data "in a format ready to be input into the data base."

  — [Hoffman 1987, AI Magazine](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583) (full text read; Table 7 values were not extractable from the PDF)
- **Burton, Shadbolt, Rugg & Hedgecock 1990:** compared structured interview, protocol analysis (think-aloud), card sort and laddered grid across two classification domains with 8 experts each. **Protocol analysis was the least efficient** of the four. — [abstract](https://research.bond.edu.au/en/publications/the-efficacy-of-knowledge-elicitation-techniques-a-comparison-acr/)
- **Requirements-engineering systematic review (Davis, Dieste, Hickey, Juristo, Moreno 2006; Dieste & Juristo 2011, IEEE TSE 37(2):283–304):**
  - Interviews, "preferentially structured," appear among the most effective techniques; card sorting, ranking and think-aloud were less effective.
  - Analyst experience "seemed irrelevant."
  - Caveat: the underlying studies were unreplicated.
  - An update with 13 more studies and >60 results supported the same conclusion.

  — [EBSE summary](https://ebse.webspace.durham.ac.uk/ebse-bibliography/effectiveness-of-requirements-elicitation-techniques-empirical-results-derived-from-a-systematic-review/)

**ACTA session cost**
- The ACTA knowledge audit "can take up to two hours" and "often elicits previously undocumented aspects of successful task completion." — [BPS, *The Psychologist*](https://www.bps.org.uk/psychologist/methods-accessing-expert-cognition)
- ACTA evaluation (NPRDC TN-98-4, 1997): graduate-student novices used ACTA in firefighting and Navy electronic warfare. **93% of generated items addressed cognitive issues** (92% firefighting, 94% EW). — [Militello, Hutton, Pliske, Knight, Klein & Randel, ACTA Methodology, DTIC ADA335225](https://apps.dtic.mil/sti/tr/pdf/ADA335225.pdf) (via search summary; full PDF blocked)
- **CDM session length in practice:** 1.5–2 h per expert, up to 3 incidents each. — [Militello & Lim 1995](https://www.shadowboxtraining.com/wp-content/uploads/2026/08/A-Cognitive-Task-Analysis-of-NICU-Nurses-Patient-Assessment-Skills-by-Miletello1995.pdf)

**Downstream outcomes of CTA-derived content**
- **Lee 2004 meta-analysis:** 318 studies screened, 7 qualified, 39 pre/post comparisons. Effect sizes ranged .91–2.45 and the **mean d = +1.72**, with 75.2% post-training performance gain. **Conflict:** Yates & Clark report the range as .91–1.45 and the gain as 50%, so the sources disagree. Quality note: pre/post comparisons rather than controlled comparisons, from a small study pool. — [Clark et al. 2008, p. 586](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf); contradicted on range/gain by [Yates & Clark](https://s3-eu-west-1.amazonaws.com/s3-euw1-ap-pe-ws4-cws-documents.ri-prod/9780415879019/Cognitive_Task_Analysis.pdf)
- **Tofel-Grehl & Feldon 2013 (JCEDM 7(3):293–304):** CTA-based instruction overall **Hedges' g = 0.871**. "Effect sizes vary substantially by both CTA method used and training context," and the number of studies was relatively small. I could not retrieve the per-method breakdown. My recollection is that PARI-based studies had the largest effects and CDM-based studies smaller ones, but this is unverified. — [SAGE](https://journals.sagepub.com/doi/abs/10.1177/1555343412474821); [USU record](https://digitalcommons.usu.edu/itls_facpub/384)
- **Radar troubleshooting (Schaafstal et al. 2000, Navy):** the CTA-based course produced students who "solved more than twice as many malfunctions, in less time." Every later cohort replicated or exceeded the advantage. This is the closest analogue to facility equipment troubleshooting. — [Clark et al. 2008, p. 586](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Central venous catheter training (Velmahos et al. 2004):**
  - Design: a lecture built from CTA of 2 experts was compared with an expert's free-recall lecture.
  - Outcome: the CTA group did better on the post-test and on real patients, across the checklist, needle attempts, assistance needed and time to completion.

  — [Clark et al. 2008, p. 586](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Avionics troubleshooting (Sherlock tutor, F-15):** content came from Gott's Air Force CTA work. Tutored airmen averaged 28 months of experience vs 37 months for controls. After ~20 h on the tutor they showed significant gains that approached highly experienced technicians, and the gains held at 6 months. — [Parker 1990, NASA NTRS](https://ntrs.nasa.gov/citations/19900016252)
- **Cost study (Clark & Estes 1996):** a 10,000+ employee European organization redesigned its emergency/safety course for ~500 managers.

  | | Behavioural task analysis | CTA |
  |---|---|---|
  | Analysis + design | 7 days | 38 days |
  | Presenter training | 0 days | 18 days |
  | Delivery | 80 days | 34 days |
  | Total training days | 1,087 | 590 |

  CTA meant ~85% more front-end time but saved **497 person-days (~2.5 person-years)**, because the course shrank from 2 days to 1 with equal or better scores. Quality: a single field case and "only suggestive." — [Clark et al. 2008, Table 43.1](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)

### Inferences
- Rule of thumb for budgeting a human-led CTA program:
  - Expert time: ~1.5–2 h per expert session (CDM or knowledge audit).
  - Analyst time: ~10 analyst-hours per interview-hour once transcription and coding are included (Hoffman's 10 h → 100 h). LLM transcription and first-pass coding are the obvious lever to compress this.
  - Coverage: at least 3 experts per task.
- The diminishing-returns curve within a single unstructured interview (>200 → ~40 propositions/hour) argues for short, focused sessions anchored on specific incidents rather than long open-ended "tell me everything" sessions.
- The 70% figure should be presented to stakeholders as "self-report captures roughly a third to a half of what experts actually do (Chao & Salvendy; Sullivan)," not as a precise 70%.

### Gaps
- No primary data were found on "time to usable rules" (elapsed calendar time from first interview to validated rule set) for any method.
- ACTA total analyst hours per project and reliability across analysts were not retrievable; they are in DTIC ADA335225, which was blocked.
- The Tofel-Grehl & Feldon per-method effect sizes and study count were not retrieved.
- Hoffman et al. 1995 and Burton et al. 1990 full efficiency metrics (e.g. rules per hour) were not retrieved.

## 3. Questionnaires/forms vs interviews for tacit knowledge

### Takeaway
No head-to-head study isolating "self-report questionnaire vs interview" for tacit operational knowledge was found. The indirect evidence is consistent, though. Unaided self-description captures a minority of actual expert actions *regardless of method* (Chao & Salvendy). Probing is what adds cues beyond free recall (NICU). Structured interviews beat less-structured and introspective techniques in efficiency. Forms are therefore best used to *confirm, rank or validate* candidate knowledge rather than to author it.

### Cited Findings
- No single expert verbalized more than 29–53% of actions "regardless of the knowledge elicitation method used." Unaided self-report has a hard ceiling, and probing or contrived tasks cannot fully lift it for one person; only pooling across experts did. — [Clark et al. 2008](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- Free recall by expert nurses omitted, or vaguely generalized, cues that CTA probes then elicited. Probing, not self-generated narrative, added the tacit content. — [Clark et al. 2008](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- A physician acknowledged teaching a "plausible" reconstructed method rather than his real diagnostic technique: "I don't know how I do diagnosis, and yet I need things to teach students" (Johnson 1983). Experts asked to write procedures produce rationalized accounts. — [Clark et al. 2008](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- The structured interview is the only method whose output is "in a format ready to be input into the data base." Hoffman recommends a sequence: first-pass database from documents/familiar tasks, then structured interviews to refine (many times more efficient), then special tasks to fill gaps. — [Hoffman 1987](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583)
- Requirements-elicitation aggregation: structured interviews were among the most effective; introspective techniques (think-aloud) and sorting/ranking were less effective. — [Dieste & Juristo / Davis et al.](https://ebse.webspace.durham.ac.uk/ebse-bibliography/effectiveness-of-requirements-elicitation-techniques-empirical-results-derived-from-a-systematic-review/)
- A dissertation surveying practitioners found interview "specificity and structure" had no strong effect on tacit-requirements elicitation effectiveness overall, with weak evidence favouring more structure. It had small samples and non-validated scales. — [Reichental 2006, Nova Southeastern](https://nsuworks.nova.edu/gscis_etd/798)
- IAEA framing: tacit knowledge is the hardest part to capture because experts "know more than they might say or write down." — [IAEA (via search summary)](https://www.iaea.org/node/41993) (exact page not verified)

### Inferences
- A blank "describe how you handle chiller trips" form will tend to return the SOP plus rationalizations. The evidence (rationalized self-reports; probes outperform free recall) predicts this.
- Forms become useful once a candidate rule set exists, as recognition-type tasks: "Is this rule right? When does it NOT apply? Rank these cues." Recognition is easier than recall, and this mirrors Hoffman's "second-pass" structured interviewing. This last step is an inference; no study in this set directly tests forms-as-validation.

### Gaps
- I found no controlled study comparing written questionnaires and interviews for tacit operational know-how. The Jones & Miles (UWE) prototype-system comparison of scaling/classification tasks vs interviews is a lead but was not read.

## 4. Methods to catch contradictions and validate

### Takeaway
The literature's main validation levers are:
- **multiple experts interviewed separately** (≥2–3; pooling greatly raises coverage);
- **cross-checking against observed performance or recordings;**
- **inter-rater coding agreement;**
- **downstream testing** of the derived content (training or job-aid outcomes).

Disagreement between experts is treated as informative (subdomain specialization, or genuine uncertainty), not just noise.

### Cited Findings
- Select "two or more" SMEs (Chao & Salvendy 1994; Lee & Reigeluth 2003) and interview them separately "to avoid premature consensus." The Yates & Clark CTA process "first interviews at least three SMEs with recent experience." — [Clark et al. 2008](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf); [Yates & Clark](https://s3-eu-west-1.amazonaws.com/s3-euw1-ap-pe-ws4-cws-documents.ri-prod/9780415879019/Cognitive_Task_Analysis.pdf)
- Pooling 6 experts raised verbalized coverage from ≤41/53/29% to 87/88/62%. — [Clark et al. 2008](https://hpttreasures.wordpress.com/wp-content/uploads/2018/11/cta_chapter_2008.pdf)
- **Hoffman on contradictions:** some projects used only one expert to avoid contradictions (Prerau 1985), but this risks a system that is "wholly idiosyncratic at best." Multiple experts fill complementary subdomains: one aerial-photo expert knew desert landforms, another glacial/arctic. Disagreements reveal where the domain itself is uncertain. — [Hoffman 1987](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583)
- **Interviewer technique:** in Hoffman's airlift transcripts, most of the 957 interviewer "questions" were restatements of what the expert had just said, prompting the expert to confirm, deny or qualify. This is an in-session member check. — [Hoffman 1987](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583)
- **Behaviour-anchored validation:** Sullivan et al. scored each surgeon's verbal account against a CTA-derived 26-step checklist built from videotaped performance, which quantifies omissions per expert. — [Sullivan et al.](https://faculty.med.virginia.edu/facultyaffairs/files/2016/04/2015-6-9b-1.pdf)
- **Inter-rater reliability on coded CDM data:** kappa was .81 (cues), .82 (concern level), .74 (suspecting NEC) and .50 (actions). Cues code reliably; actions code less reliably. — [Militello & Lim 1995](https://www.shadowboxtraining.com/wp-content/uploads/2026/08/A-Cognitive-Task-Analysis-of-NICU-Nurses-Patient-Assessment-Skills-by-Miletello1995.pdf)
- **CDM incident triplet** (correct hunch / wrong hunch / missed case) builds disconfirmation into a single interview by capturing exceptions and failure modes, not only successes. — [Militello & Lim 1995](https://www.shadowboxtraining.com/wp-content/uploads/2026/08/A-Cognitive-Task-Analysis-of-NICU-Nurses-Patient-Assessment-Skills-by-Miletello1995.pdf)
- **ACTA outputs validated by domain review:** materials were rated "accurate and important for training purposes." — [Militello & Hutton 1998](https://pubmed.ncbi.nlm.nih.gov/9819578/)

### Inferences
- For Keystone, the evidence supports:
  - interviewing ≥3 senior staff separately per critical system;
  - auto-flagging conflicts between their rules as "needs adjudication or conditional rule";
  - checking rules against historical work orders and BMS trend data (behaviour-anchored validation analogous to Sullivan's video checklist).
- Low agreement on *actions* (κ = .50) versus high agreement on *cues* (κ ≈ .8) suggests experts agree on what to notice more than on what to do. Action rules are likely to need more conditionality.

### Gaps
- No quantitative evidence was found on member checking or vignette/scenario validation specifically, such as the error rate of rules caught by expert review. Hoffman, Crandall & Shadbolt (1998) reportedly address CDM reliability, but its numbers were not retrieved.

## 5. Fast/lightweight variants

### Takeaway
ACTA is the canonical lightweight CTA, usable by non-specialists after training. Its evaluation shows ~93% of novice-generated items were genuinely cognitive. The knowledge audit runs ≤2 h. CDM-style incident interviews run 1.5–2 h. Hoffman's contrived tasks are 15–45 min. The cheapest high-yield first pass is analyzing existing documents and records ("familiar task analysis"), followed by short targeted probes on gaps. Retrospective analysis of incident records and work orders is recommended practice, but I found no quantitative evaluation of it as an elicitation method.

### Cited Findings
- ACTA was "streamlined" precisely because full CTA "is resource intensive and has previously been of limited use to design practitioners." Practitioners found it easy to use and flexible, with clear output. — [Militello & Hutton 1998](https://pubmed.ncbi.nlm.nih.gov/9819578/)
- Graduate students using ACTA produced items rated 92% (firefighting) and 94% (EW) cognitive. Companion instructional software was judged effective by Navy instructional systems specialists and private-sector designers. — [ACTA Methodology, NPRDC TN-98-4](https://apps.dtic.mil/sti/tr/pdf/ADA335225.pdf) (via search summary); [Hutton, Militello & Miller 1997, HFES](https://journals.sagepub.com/doi/10.1177/107118139704100238)
- **Knowledge audit:** ≤2 h; "often elicits previously undocumented aspects." — [BPS](https://www.bps.org.uk/psychologist/methods-accessing-expert-cognition)
- **Contrived tasks:** 15–45 min each. Hoffman recommends documents/familiar tasks first, then structured interview, then targeted special tasks or tough cases to fill gaps. — [Hoffman 1987](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583)
- **Method of tough cases:** experts record their own tough cases as they occur (e.g. with a tape recorder at hand). This is an early form of in-the-flow, incident-based micro-capture. — [Hoffman 1987](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/583)
- **Limits of "lightweight" in practice:** a digital, customized ACTA for designing an emergency-medicine device used 11 SME interviews plus 2 workshops over ~1 year. Lightweight per session does not mean a fast end-to-end project. — [Stanik et al., arXiv 2108.05622](https://arxiv.org/abs/2108.05622)
- **Industry context for urgency (trade sources, lower quality):**
  - Up to 50% of the oil & gas workforce was projected to retire within ~7 years.
  - It "can take up to eight years or longer" for a new worker to get up to speed.

  — [IHS white paper](https://cdn.ihs.com/www/pdf/IHS0517-05-07-TechKnowledge-lr.pdf); [OGJ](https://www.ogj.com/home/article/17294840/the-great-crew-change)
- **Nuclear sector:** IAEA guidance on knowledge-loss risk management from attrition (Nuclear Energy Series NG-T-6.11, 2017; TECDOC-1399, 2004) focuses on risk-assessing which critical knowledge is at risk. IAEA/WANO did tacit-knowledge capture with retiring staff at Krško NPP. — [IAEA (via search summary)](https://www.iaea.org/node/41993); [IAEA TECDOC-1510](https://www-pub.iaea.org/MTCD/Publications/PDF/te_1510_web.pdf) (URLs and the doc-number mapping were not verified by opening them)

### Inferences
- A defensible lightweight protocol for Keystone, assembled from the evidence above (not itself validated as a whole):
  1. Mine SOPs, O&M manuals and work orders first (Hoffman's first-pass).
  2. Run 60–90 min incident-anchored sessions per expert, using CDM triplets (caught it / wrong call / missed it) plus knowledge-audit probes.
  3. Use ≥3 experts per system, interviewed separately.
  4. Use short structured confirm/rank forms for validation.
  5. Capture tough cases in the flow of work as they happen.
- The analyst bottleneck (~10:1 in 1987) is where automation helps most. The expert's time is not the dominant cost.

### Gaps
- No quantitative study was found evaluating retrospective work-order or incident-record mining as an elicitation method versus interviews.
- No published evaluation was found of "rapid CTA" or "micro-interview" variants with measured capture rates. MITRE's "thin-slicing" approach for command-and-control is a lead but was not read: [MITRE](https://mitre.org/news-insights/publication/thin-slicing-approach-understanding-cognitive-challenges-complex-command).
- The ShadowBox method (Klein et al.) is a scenario-based, scalable alternative that comes up in the same literature but was not investigated here.
- Recency: virtually all quantitative findings are 1987–2013. No post-2015 controlled comparisons of human elicitation methods were found in this pass.
