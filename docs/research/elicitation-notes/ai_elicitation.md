# LLM/AI-Assisted Knowledge Elicitation and AI Interviewers (2023–2026)

Scope note: These notes cover research on AI interviewers and LLM elicitation and extraction pipelines that bears on Keystone, which turns an expert onboarding call into governed decision rules. Evidence labels used below:
- **[PR]**: peer-reviewed
- **[PP]**: preprint or working paper
- **[V]**: vendor or company report
- **[2nd]**: secondary summary, not the primary source

Several numbers were seen only in search snippets or secondary coverage. Each one is flagged where it appears.

## 1. AI-led interviews vs human interviewers: data quality, depth, completion, preference, cost

### Takeaway
Across economics, political science and Anthropic's own large deployment, AI interviewers produce transcripts that experts judge broadly comparable to human-led interviews. Participants rate them highly, and many prefer them to human interviewers or to open-text boxes. All of this evidence comes from opinion and attitude research, not from eliciting procedural expert knowledge. No study measured whether tacit operational know-how was captured correctly.

### Cited Findings
- **Chopra & Haaland, "Conducting Qualitative Interviews with AI"** [PP: CESifo WP 10666, Sep 2023; SSRN]
  - Ran 381 AI-led interviews (395 in a later version) on why people do not participate in the stock market.
  - Reports high interviewee satisfaction, and "a majority of respondents indicate a strict preference for AI-assisted interviews over human-led interviews."
  - Claims AI interviews yield thematically richer data than other scalable qualitative methods, and that responses predict behaviour about 6 months later.
  - The exact preference percentage was not in the abstract I could access.
  - Sources: [CESifo](https://cesifo.org/en/publications/2023/working-paper/conducting-qualitative-interviews-ai); [SSRN](https://papers.ssrn.com/abstract=4572954)
- **Chopra & Haaland follow-up: AEA RCT Registry AEARCTR-0015069.**
  - Includes a selection experiment (n=499, Nov 2023). Respondents chose among a 40-minute survey, a human interviewer and an AI interviewer.
  - Registry-level claims only; the trial end date is Sep 2026.
  - Source: [AEA registry](https://www.socialscienceregistry.org/trials/15069)
- **Geiecke & Jaravel, "Conversations at Scale: Robust AI-led Interviews with a Simple Open-Source Platform"** [PP: CEPR DP19705, 2024; SSRN 4974382]
  - Design: a single LLM agent with low latency, built on sociology interviewing practice and released as an open-source platform.
  - Validated against human experts and several respondent-based quality metrics, in domains including decision-making factors, political views and subjective mental states. Reports "high performance ratings" in all of them.
  - Source: [CEPR](https://cepr.org/publications/dp19705)
  - Secondary coverage [2nd] adds two details I could not verify against the paper:
    - Sociology PhD students from Harvard and LSE judged the AI transcripts broadly comparable to human expert interviews.
    - Of nearly 1,000 participants, most preferred the chatbot to open text fields, and only about 15% wanted a human interviewer.
    - Source: [Faculty Lounge](https://thefacultylounge.org/2024/11/ai-and-the-future-of-research-surveys/)
  - The authors' slides say AI interviews avoid priming while reaching thousands of respondents at low cost. Source: [NBER slides](https://conference.nber.org/conf_papers/f221279/f221279.slides.pdf)
- **Wuttke et al., "AI Conversational Interviewing"** [PR: LaTeCH-CLfL 2025 workshop at ACL]
  - Small-scale study; university students were randomly assigned to an AI or a human interviewer, both using the same political questionnaire.
  - Measured adherence, response quality and engagement. Reports AI data quality "comparable to traditional methods."
  - The abstract gives no numbers.
  - Sources: [arXiv 2410.01824](https://arxiv.org/abs/2410.01824); [ACL Anthology](https://preview.aclanthology.org/setup/2025.latechclfl-1.17)
- **AInterviewer platform** [PP: arXiv 2606.20588]
  - Pilot with n=40, randomly assigned to a trained human or a 7B open-source model via chat.
  - No significant difference in response length, specificity or relevance.
  - Interview length and number of questions per interview did differ significantly.
  - Source: [arXiv 2606.20588](https://arxiv.org/pdf/2606.20588)
- **Anthropic Interviewer** [V: company research post, Dec 2025]
  - Ran 1,250 interviews: general workforce n=1,000, scientists n=125, creatives n=125, recruited from crowdworker platforms.
  - The tool drafts an interview rubric and conversation flow from hypotheses. Human researchers review the plan before interviewing.
  - Interviews were adaptive and lasted 10–15 minutes. Analysis used AI theme clustering (Clio) with a human researcher.
  - Post-interview ratings:
    - 97.6% rated satisfaction 5 or higher on a 7-point scale; 49.6% gave the top rating.
    - 96.96% said the interview captured their thoughts well.
    - 99.12% would recommend the format.
  - No completion or dropout rate and no inter-rater validation were reported.
  - Stated limitations:
    - Demand characteristics.
    - Text only.
    - Self-report diverged from observed behaviour: 65% self-reported augmentative use vs 47% in usage data.
  - Source: [Anthropic](https://www.anthropic.com/research/anthropic-interviewer)
- **AI telephone surveying (voice)** [PP: arXiv 2507.17718]
  - An LLM + ASR + TTS voice interviewer, piloted with the SSRS Opinion Panel. Metrics were completion rate, breakoff rate and satisfaction.
  - Headline (hedged): shorter instruments and more responsive AI interviewers "may contribute to improvements across all three metrics."
  - The abstract has no numbers.
  - Source: [arXiv 2507.17718](https://arxiv.org/abs/2507.17718)

### Inferences
- The participant-acceptance risk for an AI-led onboarding call looks low. Satisfaction is consistently high, and some respondents prefer AI because it feels less judgmental and fits their schedule. That second point is my inference, not a measured finding.
- Anthropic's gap between self-report and behaviour (65% vs 47%) is directly relevant. What experts say they do in an interview will differ from what work orders show they do. This argues for cross-checking interview-derived rules against operational data.
- The "human reviews the plan, AI runs the interview, human plus AI analyses" structure appears in both Anthropic's tool and the academic platforms. It is a reasonable default architecture.

### Gaps
- No study compared AI and human interviewers on eliciting procedural or tacit operational knowledge (for example "when chiller X trips, do Y unless Z"). All the studies measured opinions or attitudes.
- I did not find exact Geiecke & Jaravel effect sizes or cost-per-interview figures; the CEPR page returned 403.
- I found no completion or dropout rates for Anthropic Interviewer.
- I found no rigorous cost comparison per interview. "Low cost" is asserted, not quantified, in the sources I accessed.

## 2. LLM-based knowledge, requirements, SOP and process-model elicitation: accuracy, misses, validation

### Takeaway
LLM interviewers can cover a large share of explicitly stated requirements, with error rates similar to human interviewers. They reliably miss implicit or tacit requirements: under half are recovered in a 2026 benchmark, and useful probes arrive late in the dialogue. LLM extraction into structured models captures content and actors well but under-produces structure: fewer gateways, events and conditions than human modellers. For decision rules, that structure is the critical part.

### Cited Findings
- **LLMREI (Korn et al.)** [PR: IEEE RE 2025]
  - A chatbot that runs elicitation interviews with minimal human involvement. Tested in 33 simulated-stakeholder interviews with zero-shot and least-to-most prompting; fine-tuning was dropped after poor preliminary results.
  - Makes "a similar number of errors" to human interviewers and extracts "a large portion" of requirements. It also generates highly context-dependent questions.
  - The abstract gives no exact percentages.
  - Sources: [arXiv 2507.02564](https://arxiv.org/abs/2507.02564); [RE 2025](https://conf.researchr.org/details/RE-2025/RE-2025-Research-Papers/2/LLMREI-Automating-Requirements-Elicitation-Interviews-with-LLMs)
- **ReqElicitGym** [PP: arXiv 2602.18306, Feb 2026]
  - Setup: 101 website elicitation scenarios across 10 app types, an oracle simulated user and an automatic evaluator.
  - Across 7 LLMs, models elicit **less than half of users' implicit requirements**, and effective questions tend to come in later turns.
  - Models do better on interaction and content requirements and consistently struggle on style requirements.
  - Source: [arXiv 2602.18306](https://arxiv.org/html/2602.18306v1)
- **"From Chat to Interview" (OntoAgent)** [PP: arXiv 2605.05828]
  - Free-form LLM chat "struggles to systematically uncover implicit requirements" and generates generic early questions.
  - An agent guided by an experience ontology scored 0.59 on TKQR, a metric that penalises late discovery. That is about a 21% relative gain over the best baseline, LLMREI-short.
  - Source: [arXiv 2605.05828](https://arxiv.org/pdf/2605.05828)
- **Latent requirements from industry stakeholder conversations** [PP: arXiv 2606.25867]
  - Notes that existing approaches focus on explicitly stated requirements and leave implicit ones largely unexplored.
  - Source: [arXiv 2606.25867](https://arxiv.org/pdf/2606.25867)
- **Follow-up question generation for requirements elicitation (Shen et al.)** [PR: RE 2025]
  - "Mistake-guided" prompting for interview follow-ups.
  - Source: [RE 2025](https://conf.researchr.org/details/RE-2025/RE-2025-Research-Papers/10/Requirements-Elicitation-Follow-up-Question-Generation)
- **Generative Goal Modeling** [PP: arXiv 2509.01048; numbers seen in a search snippet only]
  - GPT-4o, run on 15 interview transcripts, matched 62.0% of the goals humans extracted.
  - It traced goals to their source text with 98.7% accuracy. Its goal-refinement relations were rated 72.2% accurate.
  - It sampled extraction 10 times and clustered the results to handle non-determinism.
  - Source: [arXiv 2509.01048](https://arxiv.org/html/2509.01048v1)
- **Interview transcript to process model** [thesis, Utrecht; not peer-reviewed]
  - LLM-built process models matched human models well on transcript content and actors.
  - They had fewer activities, events and gateways, and lower similarity to human models.
  - Source: [Utrecht thesis](https://studenttheses.uu.nl/handle/20.500.12932/48957)
- **SOP to BPMN collaboration models via LLM** [PR: Springer chapter, 2026]
  - Pipeline: participant extraction, then entity extraction, then collaboration modelling.
  - Only the abstract was seen; no accuracy figures.
  - Source: [Springer](https://www.springerprofessional.de/en/bpmn-based-business-process-collaboration-modeling-using-large-l/51773402)

### Inferences
- For Keystone, the failure modes that matter most are in conditions, exceptions and thresholds (the "gateways"). These are exactly what LLM extraction under-produces, and what implicit-requirement benchmarks show LLMs fail to probe. Rule templates should force explicit slots for trigger, condition, exception, threshold and escalation, and should flag empty slots as gaps.
- Structured scaffolds (an ontology or checklist driving questions) beat free-form chat on implicit-requirement recall and timing (OntoAgent). A facility-operations ontology (asset types, failure modes, SLAs, escalation tiers) is the analogue.
- Sampling extraction several times and clustering the results (Generative Goal Modeling) is a cheap way to expose unstable or uncertain extractions for human review.

### Gaps
- I found no published accuracy benchmark for extracting decision rules or SOPs from spoken expert interviews in facilities or maintenance.
- I did not locate the ASK, SOP-agent or other named systems in this pass.
- Most requirements-elicitation results use simulated stakeholders (LLMREI, ReqElicitGym), so real-expert performance is unverified.

## 3. Adaptive gap-targeting questioning, contradiction detection and "confirm-don't-author"

### Takeaway
LLM-generated questions elicit more informative input, with less user effort, than asking users to write specifications themselves (GATE). Ontology or coverage-driven questioning improves implicit-requirement recall. Evidence on pre-filling drafts and asking experts to confirm or edit them is mixed. It can save time, but automation bias is documented: experts leave AI drafts uncorrected if they are "not completely wrong." I found no direct evidence on automated contradiction detection in elicitation.

### Cited Findings
- **GATE (Li, Tamkin, Goodman, Andreas), "Eliciting Human Preferences with Language Models"** [PP, arXiv 2310.11589; later published version not verified]
  - LM-driven elicitation (open questions or generated edge cases) was "often more informative than user-written prompts or labels."
  - Users reported less mental effort than writing prompts or labelling examples.
  - The questions surfaced considerations users had not anticipated.
  - Source: [arXiv 2310.11589](https://arxiv.org/abs/2310.11589)
- **Ontology-driven questioning (OntoAgent)** improved early discovery of implicit requirements by about 21% relative over LLMREI. Source: [arXiv 2605.05828](https://arxiv.org/pdf/2605.05828)
- **"Editing with AI: How Doctors Refine LLM-Generated Answers"** [PR: NeurIPS 2025]
  - 9 ophthalmologists worked in three conditions: write from scratch, directly edit an LLM draft, or edit indirectly by instruction.
  - Indirect editing cut effort but introduced errors. Direct editing was more precise but took more workload.
  - Doctors often skipped correcting answers that were "not completely wrong," even when these diverged from their own practice. This is an anchoring and automation-bias risk.
  - Source: [arXiv 2511.19940](https://arxiv.org/pdf/2511.19940)
- **Clinician-in-the-loop discharge documents** [PP: medRxiv]
  - An LLM draft plus clinician edit shortened creation time for summaries, but took more time for referrals.
  - Source: [medRxiv](https://www.medrxiv.org/highwire/citation/1079434/medlars)
- **AnchoredAI** [PP: arXiv 2509.16128]
  - Anchoring AI comments to specific text spans produced more targeted revisions and more sense of ownership than a chat interface, at higher cognitive effort.
  - Source: [arXiv 2509.16128](https://arxiv.org/html/2509.16128v1)

### Inferences
- "Confirm-don't-author" is likely faster, but it is vulnerable to rubber-stamping. Two mitigations follow from the evidence:
  - Present pre-filled rules as span-anchored, atomic claims that the expert must explicitly accept, edit or reject (AnchoredAI, direct editing).
  - Seed deliberate probes ("what would make this rule wrong?") rather than a single approve-all action.
- Asking the expert to react to concrete edge cases (GATE) is a natural fit for decision rules. "Chiller alarm at 2am on a Sunday, tenant event in progress: what do you do?" is a scenario probe that also exposes exceptions.
- Gap-targeting can be operationalised as empty slots in rule templates, plus disagreement across multiple extraction samples. This is an inference from findings 2 and 3; it has not been tested directly.

### Gaps
- I found no study quantifying time savings or accuracy of pre-filling from work orders or documents and then confirming with domain experts, in operations or maintenance.
- I found no peer-reviewed evidence on LLM contradiction detection across an expert's statements, or between an interview and its documents.
- Formal uncertainty-driven question selection (information gain, active learning) with real experts was not found beyond GATE.

## 4. Self-critique loops, LLM-as-judge, hallucination and provenance

### Takeaway
Intrinsic self-refinement (an LLM critiquing its own extraction without external signal) shows little or no gain for information extraction, and it costs more. Gains appear when feedback is external: tools, NLI checkers, or source verification. Quote-grounded provenance with mechanical verification is the most defensible mitigation for hallucinated rules. It verifies that a source exists, not that the interpretation is correct.

### Cited Findings
- **Brinkmann & Bizer, self-refinement for LLM attribute-value extraction** [PR: BTW 2025 workshop]
  - Tested error-based prompt rewriting and self-correction with GPT-4o in zero-shot, few-shot and fine-tuned setups.
  - Neither "significantly improved" extraction, while costs rose substantially.
  - Cites Huang et al. 2023: LLMs struggle to self-correct without external feedback.
  - Self-refinement does help code and text-to-SQL tasks, where execution feedback exists.
  - Source: [arXiv 2501.01237](https://arxiv.org/pdf/2501.01237)
- **Generative Goal Modeling:** 98.7% accuracy in tracing extracted goals back to transcript text [snippet-level]. This suggests source tracing for interview extractions is feasible. Source: [arXiv 2509.01048](https://arxiv.org/html/2509.01048v1)
- **Grounding-quote pattern** [PP: arXiv 2603.04663]
  - The model must return a verbatim substring justifying each extracted value. The substring is then matched mechanically against the source.
  - The authors found fuzzy matching over large chunks "empirically useless" for isolated value verification and used a tiered fallback.
  - Source: [arXiv 2603.04663](https://arxiv.org/pdf/2603.04663)
- **Hallucination survey** [PP: arXiv 2510.06265]
  - Describes splitting output into atomic claims and checking each against sources with NLI models.
  - Source: [arXiv 2510.06265](https://arxiv.org/pdf/2510.06265)
- **Practitioner guidance** [V/blog]
  - Each field should end as verified, absent or unverifiable.
  - Paraphrase-tolerant verification turns quote-gating into model entailment rather than source verification.
  - Source: [CreditGPT](https://www.creditgpt.com/content/how-to-stop-ai-hallucination-in-document-analysis)

### Inferences
- For Keystone, attach a verbatim transcript span (with timestamp) or work-order ID to every extracted rule clause. Verify the span mechanically. Any clause without a verifiable span is a "gap to confirm," not a rule.
- Do not rely on an internal Reflexion-style self-critique loop for extraction quality. Spend the budget instead on:
  - multi-sample disagreement;
  - checking rules against historical work orders (external feedback);
  - expert confirmation.
- LLM-as-judge for rule validation should be treated as a triage filter, not as the authority. I found no domain-specific evidence of its reliability here; see Gaps.

### Gaps
- I found no study specifically evaluating LLM-as-judge accuracy for validating extracted operational or business rules.
- I found no Reflexion-specific evaluation for knowledge extraction from interviews.

## 5. Voice vs text elicitation, ASR accuracy (incl. Singlish) and latency

### Takeaway
Spoken answers carry more information and personal experience than typed answers (randomised evidence). Voice is therefore a plausible default for experts. Off-the-shelf ASR degrades sharply on conversational Singlish: Whisper's WER roughly doubles vs US English on the same text, and reaches about 47% on hard conversational sets. Fine-tuning on Singapore data roughly halves the error. Latency expectations for voice agents were not well documented in the sources found.

### Cited Findings
- **Galasso, Nannicini & Nozza, "We Need to Talk: Audio Surveys and Information Extraction"** [PP: IZA DP 17488 / CEPR, 2024]
  - Randomised audio vs text answers to open questions across three surveys.
  - Audio answers were longer with simpler vocabulary. LLM-scored informativeness and personal experience were higher for spoken answers.
  - Sources: [IZA](https://www.iza.org/publications/dp17488); [CEPR DP19749](https://cepr.org/publications/dp19749)
- **Krupenkin (UMD talk)** used a randomised voice-vs-text modality treatment to induce higher-quality open-ended responses, ranked by LLM. Source: [UMD talk](https://talks.cs.umd.edu/talks/4327)
- **Sing-AudioLLM / MNSC** [PP: arXiv 2501.01034]
  - Whisper-large-v3 WER ranged from about 7% on read speech (MNSC Part 1) to about 47.5% on Part 4, which is conversational.
  - Singlish fine-tuning reduced several of these figures.
  - Source: [arXiv 2501.01034](https://arxiv.org/pdf/2501.01034)
- **Multi-dialect study** [PP: arXiv 2506.16969]
  - Whisper's WER on Singapore English was nearly twice its US English WER on identical text.
  - Source: [arXiv 2506.16969](https://arxiv.org/pdf/2506.16969)
- **SASRBench-v1** [self-reported model card]
  - whisper-large-v3-turbo scored 27.58% WER; whisper-large-v3 scored 103.41%.
  - A version fine-tuned on IMDA NSC Part 3 scored 13.35%.
  - Source: [Hugging Face](https://huggingface.co/mjwong/whisper-large-v3-turbo-singlish)
- **Vendor claim** [V]: NCS says its Ins8.ai beat Whisper on Singlish. No numbers were given. Source: [Exotel](https://exotel.com/?p=471266)
- **Voice survey interviewer** (arXiv 2507.17718) suggests responsiveness matters for completion and satisfaction; no figures. Geiecke & Jaravel emphasise low latency as a design goal. Sources: [arXiv 2507.17718](https://arxiv.org/abs/2507.17718); [CEPR](https://cepr.org/publications/dp19705)

### Inferences
- Voice suits busy facility experts and yields richer content. However, generic ASR on Singapore technicians' speech (code-switching, local terms, equipment jargon) is a real risk. Mitigations:
  - a Singapore-tuned ASR (IMDA NSC-trained models, or a local vendor);
  - custom vocabulary for asset and equipment names;
  - a read-back confirmation step for critical values such as setpoints, thresholds and contacts.
- A 47% WER on conversational speech would corrupt numeric thresholds. Numbers and entity names should be confirmed explicitly, in text or by read-back, before a rule is governed.

### Gaps
- I found no rigorous source on acceptable turn-taking latency for voice AI interviewers. Common industry targets of sub-second response are not cited here because I did not find a primary source.
- I found no study of voice AI interviewers specifically with Asian English speakers or in operational or industrial domains.
- WER benchmarks differ across test sets and should not be compared across datasets.
