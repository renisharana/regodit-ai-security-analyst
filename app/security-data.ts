export type AnswerStatus = "verified" | "confirmed" | "conflict" | "unknown";

export type Evidence = {
  source: string;
  location: string;
  excerpt: string;
  strength: "strong" | "supporting" | "limited";
};

export type Finding = {
  key: string;
  questionId: string;
  title: string;
  category: string;
  answer: string;
  status: AnswerStatus;
  confidence: number;
  priority: "critical" | "high" | "normal";
  rationale: string;
  evidence: Evidence[];
  conflict?: string;
  owner?: string;
};

export type QuestionnaireItem = {
  id: string;
  category: string;
  question: string;
};

const categoryQuestions: Array<[string, string[]]> = [
  ["Governance", [
    "Does your organization have a formal Information Security Program established?",
    "Does your organization have a published set of Information Security policies, standards and procedures?",
    "Does your organization have a public information security policy?",
    "Does your organization document role descriptions including relevant cybersecurity and data protection responsibilities?",
    "Is there a procedure for overseeing cybersecurity and data protection controls, including escalation to leadership?",
  ]],
  ["Third-Party Risk Management", [
    "Will you use contractors or subcontractors to complete the engagement?",
    "Do you have a third-party risk management program or policy?",
    "Please attach your Third-Party Risk Management Policy.",
    "Does your third-party risk management program include supply chain protections?",
    "Do vendor and subcontractor agreements require cybersecurity and privacy standards to flow down to applicable suppliers?",
  ]],
  ["Security Awareness and Training", [
    "Do all personnel, including contractors, receive security awareness training at onboarding and at least annually?",
    "How frequently are employees trained on company policies?",
    "Does your organization provide role-based security awareness training at least annually?",
  ]],
  ["Privacy", [
    "Does your organization have privacy controls or a Data Privacy program?",
    "Will your personnel or product require access to sensitive data such as PII, PI, or PHI?",
    "Please provide your data retention schedule and secure disposal procedures.",
    "Do you have a privacy policy? If so, provide an attachment or URL.",
    "Are privacy requirements extended to contractors and service providers through documented agreements?",
  ]],
  ["Data Security", [
    "Do you or your service providers store sensitive information outside the United States? If so, where?",
    "Do you require data-at-rest encryption for sensitive data?",
    "Do you require data-in-transit encryption? Describe the protocols used.",
    "Will customer data be stored on site, in a data center, or by a third party?",
    "Do you have data retention and secure disposal procedures?",
    "Can you provide data flow diagrams showing how customer data moves through the product?",
  ]],
  ["Physical Security", [
    "Is there a policy for physical security requirements?",
    "Do you require physical access to customer locations for this engagement?",
    "Will you acknowledge the customer's Visitor Management expectations?",
    "Do you track assets brought onto customer sites?",
    "Can you provide a data protection policy and evidence of physical safeguards for onsite devices?",
  ]],
  ["Web Application Security", [
    "Will the customer use a web application provided by you?",
    "What is the name of the web application?",
    "What is the function or purpose of the web application?",
    "How do you report application security vulnerabilities?",
    "Does the web application have an SSL or TLS certificate?",
    "Does the application offer SSO, or is SSO planned?",
  ]],
  ["Secure Coding", [
    "Do you have policies, procedures, or standards for secure development?",
    "Do you use secure coding principles such as detailed logging and encrypted credentials?",
  ]],
  ["Vulnerability Management", [
    "Are internal vulnerability scans performed?",
    "On what cadence are vulnerability scans performed?",
    "What are the documented remediation timelines for critical and high patches?",
  ]],
  ["Business Continuity and Disaster Recovery", [
    "What is the process for disaster recovery and backups?",
    "Please provide a copy of your business continuity and disaster recovery policy.",
  ]],
  ["Incident Response", [
    "Do you keep a record of security events?",
    "Do you monitor the security of your wireless networks?",
    "Do you have an incident response plan? Describe it briefly.",
    "How often is the Incident Response Plan tested?",
    "Do you require prompt notice to third parties for information security events?",
    "Have you had a security event in the last five years?",
    "Do you outsource security functions to third-party providers?",
  ]],
  ["Network and Endpoint Security", [
    "Do you use antivirus software to protect devices? Describe it.",
    "Will your organization access the customer's network?",
    "Question 52 is malformed in the supplied questionnaire and requires customer clarification.",
    "List all authorized personnel who will access customer assets or networks.",
    "Provide a current network architecture diagram and endpoint protection details.",
  ]],
  ["Asset Management", [
    "Do you maintain an inventory of IT assets and software?",
    "Does your organization have identity and access controls?",
    "Does your organization use role-based access control?",
    "Do you limit and periodically review user access privileges?",
    "What is the cadence of access reviews?",
    "Do you require replay-resistant authentication such as OTP or MFA?",
    "Are external authenticators NIST compliant?",
    "Do you enforce least privilege?",
  ]],
  ["Risk Assessment", [
    "Do you conduct information security risk assessments at least annually?",
    "How do you prioritize critical assets?",
    "Do you conduct penetration testing at least annually?",
    "Were the findings from the most recent penetration test remediated?",
  ]],
];

export const questionnaire: QuestionnaireItem[] = categoryQuestions.flatMap(
  ([category, questions], categoryIndex, allCategories) => {
    const start = allCategories
      .slice(0, categoryIndex)
      .reduce((total, [, priorQuestions]) => total + priorQuestions.length, 0);
    return questions.map((question, index) => ({
      id: `${start + index + 1}.0`,
      category,
      question,
    }));
  },
);

const source = {
  access: "Regodit_access_control_policy_v1.0.docx",
  review: "Access_Review_Records.xlsx",
  crypto: "Regodit_cryptography_policy_v1.0.docx",
  bcdr: "Regodit_business_continuity_and_disaster_recovery_policy_v1.0.docx",
  plan: "BCP_DR_Plan_Solsphere.docx",
  soc: "Regodit AI_SOC2_Type_II_Report_Test.docx",
  vuln: "Regodit_vulnerability_and_patch_management_policy_v1.0.docx",
  vapt: "VAPT Report 01.docx",
  hr: "Regodit_hr_policy_v1.0.docx",
  assets: "Asset_Inventory_Regodit.xlsx",
};

export const findings: Finding[] = [
  {
    key: "production-access",
    questionId: "58.0",
    title: "Production access does not match policy",
    category: "Access control",
    answer: "Unknown until the access-review actions are confirmed complete.",
    status: "conflict",
    confidence: 46,
    priority: "critical",
    rationale: "The governing policy and the latest operational record describe materially different production access.",
    conflict: "Policy limits standing access to the CTO. The September review lists four Admin or Editor users and marks two elevated accounts as unjustified; a contractor Admin account is marked for revocation.",
    owner: "K. O'Brien · Security Lead",
    evidence: [
      { source: source.access, location: "§5 Privileged and Production Access", excerpt: "Standing production access is limited to the Chief Technology Officer.", strength: "strong" },
      { source: source.review, location: "AWS Production Console · rows 6–12", excerpt: "Multiple Admin and Editor roles are listed; two require revocation or reduction.", strength: "strong" },
    ],
  },
  {
    key: "backups",
    questionId: "41.0",
    title: "Backups are daily and automated",
    category: "Business continuity",
    answer: "Production databases are backed up automatically each day and retained for 35 days. Geographic replication remains unresolved.",
    status: "conflict",
    confidence: 72,
    priority: "high",
    rationale: "Frequency and automation agree across sources, but geographic resilience does not.",
    conflict: "The BCDR policy says there is no second-region backup. The SOC report says RDS snapshots use cross-region replication.",
    owner: "Tanay · DevOps/SRE",
    evidence: [
      { source: source.bcdr, location: "§6 Backup · Table 3", excerpt: "Automated daily database backups with a rolling 35-day window.", strength: "strong" },
      { source: source.bcdr, location: "§7 Resilience", excerpt: "The company does not maintain backups in a second geographic region.", strength: "strong" },
      { source: source.soc, location: "A1.2 · Backup controls", excerpt: "Daily RDS snapshots retained for 35 days with cross-region replication.", strength: "supporting" },
    ],
  },
  {
    key: "mfa",
    questionId: "60.0",
    title: "MFA is required for core systems",
    category: "Authentication",
    answer: "Yes. MFA is enforced for cloud infrastructure, identity/email, source control, and production access.",
    status: "verified",
    confidence: 92,
    priority: "high",
    rationale: "Two policies and the SOC control description agree on scope.",
    evidence: [
      { source: source.access, location: "§4 Authentication", excerpt: "MFA is enforced across all core systems.", strength: "strong" },
      { source: source.crypto, location: "§7 Access to Keys", excerpt: "MFA is required for access to cryptographic keys and secrets.", strength: "supporting" },
      { source: source.soc, location: "§3.6.1 Logical Access", excerpt: "All production access requires multi-factor authentication.", strength: "supporting" },
    ],
  },
  {
    key: "data-location",
    questionId: "22.0",
    title: "Customer data is hosted by AWS",
    category: "Data security",
    answer: "Customer operational data is stored in AWS RDS, Redshift, S3, and MSK. The exact AWS region and country are not stated in the supplied files.",
    status: "verified",
    confidence: 88,
    priority: "high",
    rationale: "The storage services are documented; geographic residency is still unknown.",
    evidence: [
      { source: source.soc, location: "§3.9 Infrastructure · Table 3", excerpt: "RDS hosts structured customer data; Redshift, S3, and MSK hold operational and analytics data.", strength: "strong" },
      { source: source.soc, location: "§3.6.2 Physical Security", excerpt: "Production servers are maintained by AWS at its data centers.", strength: "supporting" },
    ],
  },
  {
    key: "encryption",
    questionId: "20.0",
    title: "Sensitive data is encrypted at rest",
    category: "Cryptography",
    answer: "Yes. Sensitive data at rest uses AES-256 through AWS-native encryption on databases, object storage, and disks.",
    status: "verified",
    confidence: 95,
    priority: "high",
    rationale: "The cryptography policy is specific about the algorithm and covered storage types.",
    evidence: [
      { source: source.crypto, location: "§4 Encryption in Transit and at Rest", excerpt: "Sensitive data at rest is encrypted using AES-256.", strength: "strong" },
      { source: source.soc, location: "A1.2 · Backup controls", excerpt: "Backup data is encrypted at rest using AWS-managed encryption keys.", strength: "supporting" },
    ],
  },
  {
    key: "vulnerability-scanning",
    questionId: "38.0",
    title: "No automated internal vulnerability scanning",
    category: "Vulnerability management",
    answer: "No automated internal scanner is currently operated. Third-party VAPT is commissioned at least annually and provider-native findings are reviewed.",
    status: "verified",
    confidence: 96,
    priority: "high",
    rationale: "The policy explicitly avoids claiming a capability that is not in place.",
    evidence: [
      { source: source.vuln, location: "§3 Current State", excerpt: "The company does not currently operate automated vulnerability scanning.", strength: "strong" },
      { source: source.vuln, location: "§4 Vulnerability Identification", excerpt: "Third-party VAPT is commissioned at least annually and after major changes.", strength: "strong" },
      { source: source.vapt, location: "Executive Summary", excerpt: "The supplied VAPT report documents automated and manual application testing and twenty findings.", strength: "supporting" },
    ],
  },
  {
    key: "offboarding",
    questionId: "HR-1",
    title: "An offboarding process is documented",
    category: "People security",
    answer: "A detailed offboarding checklist exists, but the HR policy is still marked as a draft with blank approval fields. Current enforcement needs confirmation.",
    status: "unknown",
    confidence: 63,
    priority: "normal",
    rationale: "Documentation exists, but approval and operating evidence are incomplete.",
    owner: "Priyanka Choudhury · People Ops",
    evidence: [
      { source: source.hr, location: "§9 Employee Termination and Offboarding", excerpt: "The checklist covers account deactivation, access revocation, asset recovery, key rotation, and data handling.", strength: "supporting" },
      { source: source.hr, location: "Document Control", excerpt: "Version 1.0 approval date and author remain placeholders; effective date is blank.", strength: "limited" },
      { source: source.assets, location: "Asset inventory · row 11", excerpt: "A retired contractor laptop is marked wiped and decommissioned per the offboarding checklist.", strength: "supporting" },
    ],
  },
  {
    key: "background-checks",
    questionId: "11.0",
    title: "Background checks are described but need confirmation",
    category: "People security",
    answer: "The HR draft requires pre-access background checks, while the SOC report says checks may finish within 90 days. Confirm the actual timing used today.",
    status: "conflict",
    confidence: 67,
    priority: "high",
    rationale: "The timing differs and the HR policy has not been fully approved.",
    conflict: "The HR draft says checks occur before access. The SOC report allows completion within 90 days, withholding only elevated access.",
    owner: "Priyanka Choudhury · People Ops",
    evidence: [
      { source: source.hr, location: "§3 Recruitment and Hiring", excerpt: "Prospective personnel with system or data access must undergo comprehensive background checks.", strength: "supporting" },
      { source: source.soc, location: "CC1.4 · Personnel controls", excerpt: "BGV is completed within 90 days; elevated access is withheld until clearance.", strength: "supporting" },
    ],
  },
  {
    key: "recovery-testing",
    questionId: "46.0",
    title: "Recovery testing history is contradictory",
    category: "Business continuity",
    answer: "Unknown. The approved policy says no restore or recovery test has yet occurred; the SOC report says testing occurred during its audit period.",
    status: "conflict",
    confidence: 42,
    priority: "high",
    rationale: "Both sources make direct, incompatible statements about completed testing.",
    conflict: "No test yet versus tested during 1 April–30 June 2026.",
    owner: "Tanay · DevOps/SRE",
    evidence: [
      { source: source.bcdr, location: "§11 Testing", excerpt: "As at the policy effective date, no restore or recovery test has yet been performed.", strength: "strong" },
      { source: source.soc, location: "A1.3 · Recovery testing", excerpt: "The report says recovery testing evidence was inspected during the audit period.", strength: "supporting" },
    ],
  },
  {
    key: "physical-infrastructure",
    questionId: "22.0",
    title: "On-premises infrastructure is unresolved",
    category: "Infrastructure",
    answer: "Unknown. The policy says the company owns no on-premises servers, but the asset inventory lists an active on-prem backup server in an HQ server room.",
    status: "conflict",
    confidence: 48,
    priority: "high",
    rationale: "The asset record and operating-model statement cannot both be current as written.",
    conflict: "No on-premises servers versus one active Dell PowerEdge backup server.",
    owner: "K. O'Brien · Security Lead",
    evidence: [
      { source: source.bcdr, location: "§3 Operating Model", excerpt: "The company holds no on-premises servers, data centers, or server rooms.", strength: "strong" },
      { source: source.assets, location: "Asset inventory · row 10", excerpt: "Dell PowerEdge R740, on-prem backup, in use, located in HQ server room.", strength: "strong" },
    ],
  },
];

type SeedAnswer = {
  status: AnswerStatus;
  answer: string;
  evidence: string;
  confidence: number;
};

export const seedAnswers: Record<string, SeedAnswer> = {
  "1.0": { status: "verified", answer: "Yes. A formal information security program and policy set are documented.", evidence: "Information Security Policy; SOC 2 report", confidence: 91 },
  "2.0": { status: "verified", answer: "Yes. The supplied evidence includes policies for access, cryptography, HR, incidents, continuity, risk, assets, vendors, and vulnerabilities.", evidence: "Company policies folder", confidence: 98 },
  "4.0": { status: "verified", answer: "Yes. Security and privacy responsibilities are assigned to executive and technical roles.", evidence: "Access Control Policy §2", confidence: 88 },
  "5.0": { status: "verified", answer: "Yes. Deviations are escalated to the CEO and relevant functional lead.", evidence: "SOC 2 report §3.5.3", confidence: 86 },
  "7.0": { status: "verified", answer: "Yes. A Third-Party Risk Management Policy is supplied.", evidence: "Vendor Risk Management Policy", confidence: 98 },
  "8.0": { status: "verified", answer: "Available as an attachment.", evidence: "Regodit_Vendor_Risk_Management_Policy.docx", confidence: 100 },
  "10.0": { status: "verified", answer: "Yes. Agreements require security and data-protection obligations for relevant third parties.", evidence: "Vendor Risk Management Policy; SOC 2 report", confidence: 84 },
  "11.0": { status: "verified", answer: "Yes. Training is required at onboarding and annually.", evidence: "HR Policy §6", confidence: 81 },
  "12.0": { status: "verified", answer: "Annually, with onboarding training for new personnel.", evidence: "HR Policy §6", confidence: 86 },
  "14.0": { status: "verified", answer: "Yes. Privacy controls and DPA-governed processing are described.", evidence: "SOC 2 report · Privacy criteria", confidence: 82 },
  "15.0": { status: "verified", answer: "Yes. Customer alerts and logs may incidentally include names, emails, phone numbers, and other PII.", evidence: "SOC 2 report · Data classification", confidence: 91 },
  "16.0": { status: "verified", answer: "A retention schedule and secure disposal requirements are documented.", evidence: "Data Classification Policy; SOC 2 report C1.2", confidence: 83 },
  "18.0": { status: "verified", answer: "Yes. Privacy and confidentiality duties are extended through contracts and DPAs.", evidence: "SOC 2 report; Master Services Agreement", confidence: 84 },
  "20.0": { status: "verified", answer: "Yes. Sensitive data at rest uses AES-256 via AWS-native encryption.", evidence: "Cryptography Policy §4", confidence: 95 },
  "21.0": { status: "verified", answer: "Yes. TLS 1.3 is required; TLS 1.2 is allowed only for compatibility.", evidence: "Cryptography Policy §4", confidence: 94 },
  "22.0": { status: "verified", answer: "By a third party: AWS services including RDS, Redshift, S3, and MSK. Exact region is not stated.", evidence: "SOC 2 report §3.9", confidence: 88 },
  "23.0": { status: "verified", answer: "Yes. Retention and secure disposal requirements are documented.", evidence: "Data Classification Policy; SOC 2 report C1.2", confidence: 83 },
  "30.0": { status: "verified", answer: "Yes.", evidence: "SOC 2 report §3.1", confidence: 94 },
  "31.0": { status: "verified", answer: "Regodit Platform.", evidence: "SOC 2 report §3.1", confidence: 98 },
  "32.0": { status: "verified", answer: "AI-powered incident triage, diagnosis, on-call orchestration, and post-incident analytics.", evidence: "SOC 2 report · Software table", confidence: 95 },
  "34.0": { status: "verified", answer: "Yes. TLS 1.2 or higher is documented, with TLS 1.3 preferred.", evidence: "Cryptography Policy §4", confidence: 91 },
  "36.0": { status: "verified", answer: "Yes. A secure development lifecycle document is supplied.", evidence: "Secure Development Lifecycle Document 01.docx", confidence: 94 },
  "37.0": { status: "verified", answer: "Yes. Peer review, non-production testing, encrypted secrets, and controlled deployment are documented.", evidence: "SDLC document; Access Control Policy", confidence: 87 },
  "38.0": { status: "verified", answer: "No automated internal vulnerability scanner is currently operated.", evidence: "Vulnerability and Patch Management Policy §3", confidence: 96 },
  "39.0": { status: "verified", answer: "Internal automated scans: not applicable. Third-party VAPT: at least annually and after major changes.", evidence: "Vulnerability and Patch Management Policy §4", confidence: 95 },
  "40.0": { status: "verified", answer: "Critical: 7 days. High: 30 days.", evidence: "Vulnerability and Patch Management Policy §6", confidence: 99 },
  "41.0": { status: "conflict", answer: "Daily automated RDS backups with 35-day retention. Cross-region replication needs clarification.", evidence: "BCDR Policy §6; SOC 2 report A1.2", confidence: 72 },
  "42.0": { status: "verified", answer: "Available as an attachment.", evidence: "Business Continuity and Disaster Recovery Policy", confidence: 100 },
  "43.0": { status: "verified", answer: "Yes. Security events and privileged activity are logged; serious incident records are retained.", evidence: "Incident Management Policy; Access Control Policy §12", confidence: 88 },
  "45.0": { status: "verified", answer: "Yes. It covers detection, classification, containment, eradication, recovery, notification, and post-incident review.", evidence: "Incident Management Policy", confidence: 91 },
  "47.0": { status: "verified", answer: "Yes. Affected customers are notified according to contract and DPA requirements.", evidence: "Incident Management Policy §8", confidence: 90 },
  "49.0": { status: "verified", answer: "Yes, in part. AWS provides managed security capabilities and an external provider performs VAPT.", evidence: "SOC 2 report; VAPT report", confidence: 77 },
  "55.0": { status: "verified", answer: "Yes. A dated IT asset inventory is supplied.", evidence: "Asset_Inventory_Regodit.xlsx", confidence: 96 },
  "56.0": { status: "verified", answer: "Yes. AWS IAM and central identity controls are documented.", evidence: "Access Control Policy; SOC 2 report", confidence: 92 },
  "57.0": { status: "verified", answer: "Yes. Role-based access is documented.", evidence: "Access Control Policy §3 and §5", confidence: 90 },
  "58.0": { status: "conflict", answer: "Annual review is documented, but the latest record shows unresolved elevated access.", evidence: "Access Control Policy §7; Access Review Records", confidence: 46 },
  "59.0": { status: "verified", answer: "At least annually.", evidence: "Access Control Policy §7", confidence: 95 },
  "60.0": { status: "verified", answer: "Yes. MFA is required across core systems and for all production access.", evidence: "Access Control Policy §4; SOC 2 report §3.6.1", confidence: 92 },
  "62.0": { status: "verified", answer: "Yes. Access is granted on least privilege and need-to-know principles.", evidence: "Access Control Policy §1 and §3", confidence: 94 },
  "63.0": { status: "verified", answer: "Yes. At least annually and after material changes or incidents.", evidence: "Risk Management Policy", confidence: 90 },
  "64.0": { status: "verified", answer: "Assets are prioritized using data sensitivity, exposure, exploitability, and business impact.", evidence: "Vulnerability Policy §5; Data Classification Policy", confidence: 83 },
  "65.0": { status: "verified", answer: "Yes. Third-party penetration testing is commissioned at least annually.", evidence: "Vulnerability Policy §4; VAPT Report 01", confidence: 94 },
};

export const sourceGroups = [
  { name: "Policies", count: 13, note: "Access, HR, cryptography, continuity, incident, risk, vendor, and related controls" },
  { name: "Assurance", count: 2, note: "SOC 2 test report and VAPT report" },
  { name: "Operational records", count: 5, note: "Access review, asset inventory, diagrams, BCDR plan, and SDLC" },
  { name: "Contracts", count: 3, note: "Employment agreement, MSA, and W-9" },
  { name: "Questionnaire", count: 1, note: "66 security questions across 14 control areas" },
  { name: "Architecture images", count: 2, note: "Network segmentation and admin-access diagrams" },
];
