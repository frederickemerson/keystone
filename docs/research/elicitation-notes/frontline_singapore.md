# Knowledge capture with frontline, shift-based technical workers (Singapore / Asia focus)

Scope note: about 17 search/fetch calls. The peer-reviewed evidence specific to FM technicians and chief engineers in Singapore is thin. Much of the "modality" evidence comes from vendors, and that is flagged below. The strongest primary sources are the PDPC Advisory Guidelines on Key Concepts (revised 29 April 2026), the Singapore ASR benchmarks (MERaLiON / MNSC) and the BCA/MND workforce statements.

## 1. Which capture modalities frontline workers actually use (voice, chat, micro-forms, photo/video, push-to-talk, smart glasses), and the time-in-motion constraints

### Takeaway
Vendor and practitioner material agrees that voice and photo capture attached to the work order or job is the lowest-friction pattern for technicians. I found no independent, peer-reviewed adoption study of WhatsApp or voice-note knowledge capture for maintenance technicians. Frontline digital tooling is consistently reported as under-delivered compared with what management believes. Smart-glasses evidence is mostly vendor case studies, and the adoption barriers it mentions are organisational rather than technical.

### Cited Findings
- MaintainX (vendor) argues that voice notes suit technicians whose schedules leave no room for data entry, and that AI can turn the notes into SOP drafts that must be reviewed by a human before they become the standard. — [MaintainX blog](https://www.getmaintainx.com/blog/how-to-create-maintenance-sops-with-ai-and-voice-notes)
- OxMaint (vendor) describes mobile CMMS voice capture that queues recordings offline and attaches AI summaries to work orders. It claims transcription accuracy above 92% for "standard English". This is an unverified vendor figure and does not cover accented or noisy speech. — [OxMaint](https://oxmaint.com/article/how-to-use-voice-notes-in-mobile-maintenance-workflows); [OxMaint power plant](https://oxmaint.com/industries/power-plant/voice-notes-to-work-orders-for-plant-maintenance-teams)
- University of Melbourne's "Health Worker Voices" project collected voice memos from COVID-19 frontline health workers through a private WhatsApp channel, with AI transcription. It is the closest research analogue for chat-based voice capture, but it is not maintenance work and no outcome data was found. — [Univ. of Melbourne](https://about.unimelb.edu.au/newsroom/news/2020/august/lessons-from-the-covid-19-frontline-captured-in-health-worker-voices-project)
- HCLTech case study: a purpose-built voice assistant was used in rail maintenance to collect real-time feedback and preserve expert insight (vendor case study). — [HCLTech](https://www.hcltech.com/ja-jp/case-study/revolutionizing-rail-maintenance-with-hcltech-voice-assistant)
- Axonify 2024 Deskless Report (n=788 frontline executives, managers and workers in retail, hospitality, grocery, foodservice and logistics): 75% of corporate leaders believe they invest in frontline tech, but only 39% of frontline employees agree. — [Newswire press release](https://www.newswire.com/news/new-research-reveals-critical-gaps-in-mobile-technology-for-frontline-22218657)
- VDC Research / BlueFletch (Jan 2024, more than 150 decision-makers): in North America, 75% of surveyed organisations have frontline workers sharing mobile devices. This bears on whether a personal-phone app or a shared device is realistic. — [Xenia summary](https://www.xenia.team/articles/deskless-workers)
- Point B (2024, 120 frontline supervisors and workers): average companies expect workers to use 6 or more enterprise applications daily, which points to app fatigue. — [Point B](https://www.pointb.com/Insights/Articles/2024/07/Equipping-Your-Deskless-Workforce-for-the-Future)
- BCG/Flip 2024 Deskless Report describes deskless workers as digitally disconnected compared with back-office staff. — [Flip / BCG](https://getflip.com/insights/bcg-flip-deskless-report-2024)
- Smart glasses: adoption barriers cited include "employee resistance to new technologies and difficulties with introducing innovations within organizations". The same piece calls adoption early-stage. — [SupplyChain247](https://www.supplychain247.com/article/smart_glasses_the_latest_weapon_against_downtime/vuzix)
- Remote-assist limit: issues that cannot be resolved remotely still require a site visit, so time can be lost when remote guidance fails. — [Fabricating & Metalworking, 2017](https://digital.fabricatingandmetalworking.com/march-2017/page-19)
- Fujitec (an elevator company with Asian operations) deployed Vuzix M400 glasses so that its most skilled engineers can support multiple field teams at once ("see-what-I-see"). This is a vendor case study. — [Vuzix / Fujitec](https://www.vuzix.com/en-ca/blogs/case-studies/fujitec-vuzix)
- CSCW-affiliated work on expertise sharing in a manufacturing firm found that the main challenges were the existing socio-technical infrastructure and the contextual nature of expertise, rather than the tool itself. — [Uni Siegen CSCW](https://www.cscw.uni-siegen.de/?p=1025)
- A VTT/ECCE 2015 model for gathering and sharing knowledge in maintenance work was built from interviews and observation at three industrial maintenance sites. — [VTT](https://cris.vtt.fi/en/publications/a-model-for-gathering-and-sharing-knowledge-in-maintenance-work/)
- Migrant worker phone use in Singapore: in a survey of 56 male, mostly Bangladeshi blue-collar workers, more phone use was associated with more stress, so phones are not a neutral channel for this group. — [NCCU repository](https://irtest.lib.nccu.edu.tw/handle/140.119/110628)
- An advocacy page reported that about 800 migrant workers in Singapore could not return to work during COVID because their phones lacked capacity for the required apps. The date is unclear, so treat this with caution. — [Our Better World](https://ourbetterworld.org/your_used_phone_can_help_our_migrant_friends_resume_work)

### Inferences
- The most defensible low-friction pattern is to attach a 30–90 second voice note, plus photos, to the job or work-order close-out, which already happens. A separate "knowledge app" competes with 6 or more existing apps and may not run on shared or low-end devices.
- WhatsApp or Telegram lowers adoption friction because workers already use them, but it brings data-governance problems: personal accounts, uncontrolled forwarding, and storage outside the employer's control. That interacts with PDPA protection and retention obligations (section 3). An official WhatsApp Business API bot or a CMMS-native channel is the governed version of the same pattern.
- Plant rooms are noisy and technicians often wear PPE, so push-to-talk or voice capture is best done after the job, in a quieter space. Ambient capture inside plant rooms is likely to fail on ASR quality (section 3) and to add privacy exposure.
- Smart glasses suit live remote assist by a senior expert more than durable knowledge capture. Footage contains third parties, and evidence of independent adoption is weak.

### Gaps
- I found no peer-reviewed study (CHI/CSCW or other) of WhatsApp or voice-note knowledge capture by maintenance or FM technicians in Asia. ACM DL searches for "field service" combined with "WhatsApp" or "WeChat" may surface some.
- I found no Singapore-specific data on device ownership or app usage among FM technicians, or on shift patterns (for example 12-hour shifts or on-call rosters in FM).
- I found no data on capture compliance rates, meaning the share of jobs closed with a usable voice note, from any deployment.

## 2. Incident-triggered or in-the-flow micro-interviews versus scheduled long interviews: recall quality and participation

### Takeaway
Memory research supports structured recall soon after the event, ideally within about 24 hours. Early recall also protects later recall. I found no study that directly tests AAR or hot-debrief timing for maintenance knowledge. Evidence on how timing affects accuracy is mixed in police studies.

### Cited Findings
- An eyewitness memory study concluded that initial recall should be completed within 24 hours of an incident, and that under these conditions the benefit of early recall on long-term memory lasts at least one month. — [PMC9225701](https://pmc.ncbi.nlm.nih.gov/articles/PMC9225701/)
- Officer-involved shooting research found that delayed questioning harmed recognition of some details, while immediate questioning avoided that decay. It found no support for the idea that delay improves officers' memory. — [Griffith repository](https://research-repository.griffith.edu.au/items/8aa59a1f-7cde-448f-9e14-f9f4e5bec97b)
- Contrary evidence: in a randomised experiment with officers in active-shooter training, interview timing did not influence recall of the scenario. — [Springer, J Exp Criminol](https://springerlink.bibliotecabuap.elogim.com/10.1007/s11292-018-9348-0)
- A review notes that a delay including sleep can increase the amount of detail recalled but also increase false recall. — [Frontiers in Psychology 2018](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01632/pdf)
- Testing-effect research: repeated retrieval practice reduced the recall loss over long delays compared with restudy. This is lab evidence. — [Univ. of Alberta, Lee & Brown 2003](https://sites.ualberta.ca/~nrbrown/pubs/LeeBrown2003.pdf)

### Inferences
- An incident-triggered micro-capture (2–5 targeted questions within the same shift or within 24 hours of a job or fault) is better supported than relying only on a scheduled 60–90 minute retrospective interview. Recall decays, and the episodic detail ("what did you check first, what did you smell or hear") is what gets lost.
- The two approaches are complementary. Short hot captures produce raw episodes. A later scheduled session with the chief engineer can generalise them into rules ("when X, check Y because Z"), which is a form of retrieval practice. Using the captured episode as a cue in the long interview should improve recall.
- Participation is plausibly higher when capture is short and tied to an event the worker already has to close out. This is not directly evidenced (see Gaps).

### Gaps
- I found no empirical study comparing participation or completion rates of micro-interviews with long interviews among frontline technical workers.
- I found no study of AAR or hot-debrief timing in maintenance or FM. The evidence base is eyewitness and police memory research, which is an analogy.

## 3. Singapore and Asia context: multilingual workforce, ASR accuracy for Singapore English, literacy, FM sector manpower, unions and WSG

### Takeaway
Off-the-shelf ASR performs much worse on Singapore-accented and code-switched speech. Locally adapted models (MERaLiON, from A*STAR and IMDA) cut WER sharply, so localisation is a hard requirement. The FM sector is officially described as manpower-intensive, ageing and largely outsourced. Retirement and re-employment ages rose to 64 and 69 in 2026, which lengthens the window for capturing knowledge from older technicians. English is the working lingua franca on sites, but technical vocabulary and literacy gaps are documented for migrant workers.

### Cited Findings
**ASR / language**
- IMDA's National Speech Corpus is described as the first large-scale Singapore English corpus, built to improve ASR on locally accented English. — [IMDA NSC](https://www.imda.gov.sg/About-IMDA/Emerging-Technologies-and-Research/Artificial-Intelligence/National-Speech-Corpus)
- MERaLiON-AudioLLM (localised Whisper-large-v2 encoder plus SEA-LION decoder, trained on Singapore-accent and code-switching data) reports about 5% WER on Singapore-focused tests, against about 19% for Qwen2-Audio and about 33% for stock Whisper-large-v2. These are the developers' own evaluations. — [Hugging Face model card](https://huggingface.co/MERaLiON/MERaLiON-AudioLLM-Whisper-SEA-LION); [arXiv 2412.09818](https://arxiv.org/pdf/2412.09818)
- A Singlish ASR paper's MNSC-ASR tables show stock Whisper-Large-v3 performing worst on most parts. MNSC Part 4 (conversational) WERs of 34.8 / 29.8 / 47.5 are reported across SingAudioLLM, fine-tuned Whisper and Whisper-Large-v3. The column-to-model mapping is from a snippet and should be checked in the PDF. — [arXiv 2501.01034](https://arxiv.org/pdf/2501.01034)
- MERaLiON-2-10B-ASR averages an error rate of 14.32 across 12 benchmarks covering English, Mandarin, Tamil and Malay. — [arXiv 2603.16184 (Polyglot-Lion)](https://arxiv.org/pdf/2603.16184)
- Code-switching research in Singapore mostly uses SEAME, about 192 hours of Mandarin-English conversational speech from 156 speakers. A Singapore-oriented test set has an English to Mandarin token ratio of about 7:3. — [arXiv 2106.07699](https://arxiv.org/pdf/2106.07699); [arXiv 2601.00935](https://arxiv.org/pdf/2601.00935)
- English-Malay code-switching in NSC conversational data occurs most around nouns, which is relevant because technical nouns (equipment names) are what matter in capture. — [BITS Pilani / NTU](https://www.bits-pilani.ac.in/wp-content/uploads/Singaporean_Conversational_English-Malay_Code-Switching_Speech_An_Analysis_Based_on_Code-switching_Points_and_Part_-of-Speech.pdf)
- AI Singapore Speech Lab built a local-accent speech-to-text engine using language identification as an auxiliary task for code-switching. — [AI Singapore](https://ai4e.aisingapore.org/?p=285374)
- Vendor claim: Whisper's error rates on Singlish are significantly higher than NCS's locally trained Ins8.ai. This is not peer-reviewed. — [Exotel blog](https://exotel.com/blog/multilingual-voice-ai-singapore-customer-support/)

**Migrant workers, language and literacy**
- An NUS study (Lim & Goh 2017) of Construction Safety Orientation Course instructors found English widely used on sites as the common language across nationalities. Instructors teach some English equipment terms but lack time for trade-specific technical vocabulary. — [NUS CDE](https://cde.nus.edu.sg/dbe/2017/03/insights-from-the-csoc-language-issues-in-the-communication-of-safety-knowledge)
- TWC2 (in The Straits Times) reports safety officers' concern that, because of the language gap, workers may follow supervisors' instructions without recognising danger. On-site notices are generally in workers' own languages. — [TWC2](https://twc2.org.sg/2017/10/25/straits-times-help-migrant-workers-stand-up-for-their-own-safety/)
- Dutta (2017, IJERPH), from interviews with Bangladeshi construction workers in Singapore, attributes risk to food insecurity, lack of sleep and transport as well as language. — [Najah repository](https://research-portal.najah.edu/migrant/29840/)

**FM sector manpower and policy**
- BCA/MND describe FM as relying on manpower-intensive work and an ageing workforce. — [BCA speech, MOS Zaqy Mohamad](https://www1.bca.gov.sg/resources/newsroom/speech-by-mos-zaqy-mohamad-at-the-6th-international-facility-management-conference/)
- About 40% of resident PMETs in the built environment sector are aged 50 or older. More than half of Singapore's buildings were projected to be 30 or more years old by 2025. — [MND speech, SMS Tan 2022](https://mnd.gov.sg/newsroom/speeches/view/speech-by-sms-tan-at-the-gala-dinner-for-world-workplace-asia-pacific-2022)
- Integrated and aggregated FM could yield over 20% manpower savings. The Real Estate ITM includes the Guide to Smart FM. — [BCA speech, MOS Tan Kiat How 2021](https://www1.bca.gov.sg/resources/newsroom/speech-by-mos-tan-kiat-how-at-the-singapore-international-facility-management-association-sifma-facilities-management-expert-summit-2021/)
- The Built Environment Jobs Transformation Map (EY for BCA and WSG) assessed 48 job roles: 1 highly impacted and 34 with a medium degree of change in tasks. — [MyCareersFuture](https://content.mycareersfuture.gov.sg/built-environment-sector-tech-innovations-changing-outlook-jobs/)
- Statista (2017 data): 64% of Singapore's FM workforce was outsourced and 36% in-house. This is old data, accessed through a proxy. — [Statista](https://www-statista-com.ezproxy.canberra.edu.au/statistics/1020504/singapore-breakdown-fm-workforce-by-employment-type)
- A union-backed upskilling deal covered about 1,100 rank-and-file workers, including technicians and supervisors, 65% of them aged 40 or older. — [HRO](https://humanresourcesonline.net/about-1100-rank-and-file-workers-to-benefit-from-adaptive-and-tech-upskilling)
- Foreign workers made up over 1.5 million of Singapore's workforce (about 40%) as of June 2024. This is economy-wide, not FM-specific. — [Dollars and Sense, SPOR 2024](https://dollarsandsense.sg/business/labour-market-singapore-public-sector-outcomes-review-spor/)
- Statutory retirement and re-employment ages rose to 64 and 69 on 1 July 2026, with targets of 65 and 70 by 2030. Employers must offer re-employment to eligible seniors. — [Singapore Law Watch](https://www.singaporelawwatch.sg/Headlines/singapore-to-raise-retirement-age-to-64-and-re-employment-age-to-69-on-july-1-tan-see-leng); [HRO](https://humanresourcesonline.net/mom-committee-of-supply-2024-singapore-to-increase-retirement-age-to-64-re-employment-age-to-69-in-2026)

### Inferences
- ASR must be localised (MERaLiON-class or fine-tuned on NSC/MNSC). With stock Whisper at roughly 30–47% WER on conversational Singapore speech, plant-room jargon, equipment tags and code-switched nouns will be garbled. Design for a human or LLM correction pass, a domain glossary (equipment tags, vendor names), and a "read-back" confirmation step to the expert.
- Tamil, Bengali and Burmese ASR quality for technical speech is likely poor. For migrant technicians, photo-plus-short-voice in their own language, with translation, may beat English text forms. This is unverified.
- Chief engineers and senior technicians (often older, local, mixed English/Mandarin/Malay) are the priority knowledge holders. The 64/69 re-employment window gives a defined horizon for capture, and some of that time could be explicitly rostered for capture and mentoring.
- Because so much FM is outsourced (64%), knowledge often sits with the FM contractor's staff rather than the building owner. Contract terms (who owns the captured knowledge) matter as much as tooling.

### Gaps
- I found no FM-specific counts of foreign versus local technicians, or a breakdown by nationality or language.
- I found no WER benchmarks for noisy industrial or plant-room speech in Singapore, and no Bengali, Tamil or Burmese technical-speech ASR benchmarks.
- I did not retrieve the current FM-specific JTM, Real Estate ITM 2025 targets, or JTC programme details. Most official sources found were 2021–2022 speeches.
- NTUC FM-specific programmes, and WSG Career Conversion Programmes for FM, were not verified.

## 4. PDPA and workplace monitoring: consent for recording, voice data, ambient capture, employee data, storing quotes and audio as provenance

### Takeaway
Under the PDPA (Advisory Guidelines on Key Concepts, revised 29 April 2026), employers can collect, use and disclose employee personal data without consent for purposes reasonably related to managing the employment relationship, but must notify employees of the purpose (s.20(4)–(5)). Other purposes can rely on the general legitimate interests exception only after a documented assessment. Recorded voice and named quotes are personal data. Retention limits and access requests apply. Whether "building a corporate knowledge base" falls within "managing the employment relationship" is untested, so the safest pattern is explicit notice plus consent for recordings and named attribution.

### Cited Findings
- Section 20(4)–(5) PDPA: an organisation collecting, using or disclosing personal data to enter into, manage or terminate an employment relationship "shall inform the individual of (a) that purpose; and (b) on request… the business contact information of a person who is able to answer the individual's questions". — [PDPC Advisory Guidelines on Key Concepts, rev. 29 Apr 2026, fn 14, p.63](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- Earlier PDPC examples of the employment exception include paying salaries and monitoring employees' use of company computer network resources. — [Law Gazette 2014](https://v1.lawgazette.com.sg/2014-06/1058.htm)
- Legitimate interests: paragraphs 2–10 of Part 3 of the First Schedule cover specific purposes (evaluative purposes, investigations or proceedings, debt recovery). The general exception (para 1) requires the organisation to identify the interest, conduct and document an assessment showing the legitimate interests outweigh any adverse effect, keep the assessment for as long as it relies on the exception, disclose reliance through external-facing channels such as a public data protection policy, and justify reliance to PDPC on request. — [PDPC Key Concepts AG, pp.60–63](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- Exceptions to consent "do not affect rights or obligations arising under any other law", such as confidentiality or contractual obligations. — [PDPC Key Concepts AG, p.60](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- Business contact information (name, position, business phone or email given for business purposes) is excluded from most Data Protection Provisions, but the definition depends on the purpose for which it was provided. — [PDPC Key Concepts AG, ~p.17](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- CCTV examples: organisations should inform people that CCTVs are in operation. Access requests for CCTV footage are expected, with third parties masked or with their consent. Retention (for example, a 30-day overwrite) is legitimate, but footage under an active access request must be preserved. — [PDPC Key Concepts AG, access and retention chapters](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- Retention Limitation Obligation (s.25): an organisation must cease to retain personal data once the purpose is no longer served and retention is not needed for legal or business purposes. — [PDPC Key Concepts AG](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- "Opinion data kept solely for an evaluative purpose" is carved out of access obligations. "Evaluative purpose" is defined in s.2(1). — [PDPC Key Concepts AG](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- Withdrawal of consent does not prevent retention needed for legal or business purposes (the warranty and audit example). — [PDPC Key Concepts AG, p.60](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/ag-on-key-concepts/advisory-guidelines-on-key-concepts-in-the-pdpa-17-may-2022.pdf)
- For comparison, Hong Kong PCPD guidance holds that monitoring is tolerated when done reasonably and that the employer's purpose weighs heavily. — [CTgoodjobs HR](https://cthr.ctgoodjobs.hk/HRInsight/workplace-monitoring-under-the-provision-of-personal-data-privacy-ordinacne/18694)
- For comparison, the Philippines NPC addressed whether consent is needed each time a virtual meeting is recorded (Advisory Opinion 2024-003). — [NPC PDF](https://www.privacy.gov.ph/wp-content/uploads/2024/04/Advisory-Opinion-No.-2024-003.pdf)
- For comparison, Ireland's DPC expects employers to consider less intrusive alternatives and to run DPIAs for intrusive monitoring. — [Matheson](https://www.matheson.com/insights/data-protection-in-the-workplace-dpc-guidance/)

### Inferences
- An expert's voice recording, transcript and attributed quote are the employee's personal data, and a quote may also contain third parties' data (colleagues or tenants named in a story). Provenance audio should be kept under a defined retention schedule. Many systems should keep a de-identified or approved transcript plus metadata as provenance and expire the raw audio.
- An external vendor processing recordings for the employer is likely a data intermediary. That needs a contract with protection and retention clauses and attention to cross-border transfer if the ASR or LLM runs offshore (Transfer Limitation Obligation, not researched in depth here).
- Ambient or always-on plant-room capture (glasses, body-cams, open mics) captures co-workers, contractors and tenants, and looks like monitoring. It needs notice, a legitimate-interests assessment, and probably union or worker consultation. Explicit push-to-record by the expert is far lower risk.
- Using captured knowledge to evaluate the technician (performance or discipline) would be a purpose change that undermines trust. State in writing that capture is not used for appraisal.

### Gaps
- I could not confirm Singapore's rule on recording a conversation with only one party's consent, outside the PDPA. No primary source was found.
- I did not retrieve PDPC guidance on Transfer Limitation (offshore ASR or LLM processing), or PDPC enforcement decisions on employee audio or voice recordings.
- There is no PDPC guidance specifically on "knowledge capture" or on whether it falls within "managing the employment relationship". This is a legal-opinion question.
- MOM, Tripartite or NTUC guidance on employee monitoring or recording beyond PDPA was not found.

## 5. Incentives and trust: reluctance to share ("knowledge is job security"), recognition and credit, time compensation

### Takeaway
Recent Asian research links knowledge hiding by older or plateaued workers to job insecurity and age-stereotype threat. Good supervisor relationships (LMX) and intergenerational contact mitigate it. I found no Singapore FM-specific evidence on named authorship or paid capture time.

### Cited Findings
- Duan, Liu, Wang & Tse (2025, J. Knowledge Management; 219 older workers, time-lagged design): age-based stereotype threat raises job insecurity, which drives knowledge hiding by older workers. Leader-member exchange mitigates this. — [Monash research portal](https://research.monash.edu/en/publications/for-the-sake-of-my-job-security-examining-the-effect-of-age-based/); [Emerald](https://www.emerald.com/insight/content/doi/10.1108/JKM-03-2024-0324/full/html)
- About 400 e-commerce employees in China: workers with a stronger sense of career plateau hide tacit knowledge because of job insecurity. Explicit knowledge followed a different pattern, and more time-sensitive knowledge was less likely to be hidden. — [Macao Polytechnic Univ.](https://research.mpu.edu.mo/en/publications/exploring-factors-triggering-individual-knowledge-hiding-at-the-e/)
- A US dissertation (n=401): older employees showed more evasive and rationalised hiding, which was reduced in environments with intergenerational contact. — [ECU ScholarShip](https://thescholarship.ecu.edu/items/4efc4d7d-94a1-4208-b082-8aa2fa5aabfe)
- A Malaysia–UK comparison (conference abstract) found that seniors hide knowledge to retain their value, while juniors hide it because of job insecurity and lack of rewards. — [MMU InventX](https://inventx.mmu.edu.my/ajax/E005.html)
- Singapore context: the Retirement and Re-employment Act protects against age-related dismissal before statutory retirement and requires a re-employment offer up to 69 (from 2026). — [Singapore Law Watch](https://www.singaporelawwatch.sg/Headlines/singapore-to-raise-retirement-age-to-64-and-re-employment-age-to-69-on-july-1-tan-see-leng)

### Inferences
- Present capture as making the expert more valuable rather than replaceable. Possible levers: named attribution on rules or playbooks ("Rule by CE Tan, 2026"), recognition by management, linking contribution to re-employment or mentor roles, and capture during paid time, never on rest days. The legal re-employment protection in Singapore may reduce, but not remove, the fear that sharing equals redundancy.
- The supervisor relationship matters (LMX). Capture led by a trusted chief engineer or supervisor is likely to work better than capture run by HQ or an outside vendor.
- Named authorship conflicts with privacy minimisation (section 4). Make attribution opt-in, with the expert approving the final wording of their rule.

### Gaps
- I found no empirical studies on named authorship or credit as an incentive for frontline knowledge capture, or on paid time for capture, in Singapore or Asia.
- I found no Singapore FM-specific evidence (survey or case) on technician attitudes towards knowledge-capture programmes.
