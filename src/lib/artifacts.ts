export function escapeHtml(value: string | undefined): string {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const DOCUMENT_SKILLS: Record<string, any> = {
  business_proposal: {
    label: "Proposal",
    category: "proposal",
    documentType: "business_proposal",
    artifactType: "printable_html",
    template: "proposalTemplate"
  },
  slide_deck: {
    label: "Slides",
    category: "presentation",
    documentType: "slide_deck",
    artifactType: "slides_html",
    template: "slidesTemplate"
  },
  meeting_minutes: {
    label: "Minutes",
    category: "meeting",
    documentType: "meeting_minutes",
    artifactType: "printable_html",
    template: "minutesTemplate"
  },
  formal_letter: {
    label: "Letter",
    category: "correspondence",
    documentType: "formal_letter",
    artifactType: "printable_html",
    template: "letterTemplate"
  },
  report: {
    label: "Report",
    category: "report",
    documentType: "business_report",
    artifactType: "printable_html",
    template: "reportTemplate"
  },
  invoice: {
    label: "Invoice",
    category: "finance",
    documentType: "invoice",
    artifactType: "printable_html",
    template: "invoiceTemplate"
  },
  quotation: {
    label: "Quotation",
    category: "finance",
    documentType: "quotation",
    artifactType: "printable_html",
    template: "quotationTemplate"
  },
  contract_draft: {
    label: "Contract",
    category: "legal_draft",
    documentType: "contract_draft",
    artifactType: "printable_html",
    template: "contractTemplate"
  },
  hr_form: {
    label: "HR Form",
    category: "hr",
    documentType: "hr_form",
    artifactType: "form_html",
    template: "formTemplate"
  },
  tracker_table: {
    label: "Tracker",
    category: "operations",
    documentType: "tracker_table",
    artifactType: "table_html",
    template: "tableTemplate"
  },
  certificate: {
    label: "Certificate",
    category: "certificate",
    documentType: "certificate",
    artifactType: "certificate_html",
    template: "certificateTemplate"
  },
  dashboard_artifact: {
    label: "Dashboard",
    category: "dashboard",
    documentType: "dashboard",
    artifactType: "dashboard_html",
    template: "dashboardTemplate"
  },
  interactive_artifact: {
    label: "Artifact",
    category: "web_artifact",
    documentType: "interactive_artifact",
    artifactType: "interactive_html",
    template: "interactiveTemplate"
  },
  email: {
    label: "Email",
    category: "email",
    documentType: "email",
    artifactType: "email_html",
    template: "emailTemplate"
  }
};

export const ARTIFACT_TEMPLATES: Record<string, (data: any) => string> = {
  proposalTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f4f4f5; color: #111827; }
    .page { max-width: 850px; margin: 32px auto; background: white; padding: 56px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    h1 { font-size: 34px; margin-bottom: 8px; }
    h2 { margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .meta { color: #6b7280; margin-bottom: 32px; }
    .section { margin-bottom: 24px; line-height: 1.6; }
    .signature { margin-top: 56px; display: flex; justify-content: space-between; }
    .line { border-top: 1px solid #111827; width: 220px; padding-top: 8px; text-align: center; }
    @media print { body { background: white; } .page { margin: 0; box-shadow: none; max-width: none; } }
  </style>
</head>
<body>
  <main class="page">
    <h1>Business Proposal</h1>
    <div class="meta">Generated: ${escapeHtml(data.createdAt)}</div>
    <div class="section">
      <strong>Request:</strong>
      <p>${escapeHtml(data.prompt || "Create a professional business proposal.")}</p>
    </div>
    <h2>Executive Summary</h2>
    <p>This proposal presents a professional solution tailored to the client’s business needs.</p>
    <h2>Objectives</h2>
    <ul><li>Define the client’s main goals.</li><li>Present a clear solution.</li><li>Outline timeline, pricing, and next steps.</li></ul>
    <h2>Scope of Work</h2>
    <p>The scope includes planning, implementation, communication, review, and final delivery.</p>
    <h2>Timeline</h2>
    <p>Estimated delivery timeline will be finalized after approval.</p>
    <h2>Investment</h2>
    <p>Pricing details can be added based on project requirements.</p>
    <div class="signature">
      <div class="line">Prepared By</div>
      <div class="line">Approved By</div>
    </div>
  </main>
</body>
</html>`;
  },
  slidesTemplate(data) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; background: #222; color: #fff; overflow-x: hidden; }
    .slide { height: 100vh; width: 100vw; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px; box-sizing: border-box; border-bottom: 4px solid #444; }
    .slide:nth-child(even) { background: #333; }
    h1 { font-size: 48px; margin-bottom: 20px; color: #60a5fa; }
    p { font-size: 24px; max-width: 800px; line-height: 1.5; }
    ul { font-size: 24px; text-align: left; }
    li { margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="slide">
    <h1>${escapeHtml(data.title)}</h1>
    <p>${escapeHtml(data.prompt || "Presentation Overview")}</p>
  </div>
  <div class="slide">
    <h1>Key Highlights</h1>
    <ul>
      <li>Strategic Growth</li>
      <li>Operational Excellence</li>
      <li>Market Expansion</li>
    </ul>
  </div>
  <div class="slide">
    <h1>The Future</h1>
    <p>We are building a scalable, innovative approach to the next decade of technology.</p>
  </div>
</body>
</html>`;
  },
  minutesTemplate(data) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; } h1 { border-bottom: 2px solid #ccc; padding-bottom: 10px; }</style></head><body><h1>Meeting Minutes</h1><p><strong>Date:</strong> ${escapeHtml(data.createdAt)}</p><p><strong>Topic:</strong> ${escapeHtml(data.prompt || "General Meeting")}</p><h2>Attendees</h2><ul style="list-style: none; padding: 0;"><li>[ ] Alice</li><li>[ ] Bob</li><li>[ ] Carol</li></ul><h2>Discussion Points</h2><ul><li>Project updates</li><li>Timeline adjustments</li><li>Resource allocation</li></ul><h2>Action Items</h2><ul><li><strong>Alice:</strong> Finalize budget</li><li><strong>Bob:</strong> Update client</li></ul></body></html>`;
  },
  letterTemplate(data) {
     return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: serif; max-width: 800px; margin: 40px auto; line-height: 1.8; color: #000; padding: 40px; border: 1px solid #eaeaea; box-shadow: 2px 2px 10px rgba(0,0,0,0.05); } .header { margin-bottom: 40px; } .date { margin-bottom: 20px; }</style></head><body><div class="header"><strong>Company Name</strong><br>123 Business Rd.<br>City, State, ZIP</div><div class="date">${escapeHtml(data.createdAt)}</div><p>Dear Recipient,</p><p>${escapeHtml(data.prompt || "This is a formal letter regarding our recent discussions. We look forward to proceeding with the proposed terms.")}</p><p>Please let us know if you require any further documentation.</p><br><p>Sincerely,</p><p><strong>Sender Name</strong><br>Title</p></body></html>`;
  },
  reportTemplate(data) {
     return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Arial, sans-serif; background: #fafafa; padding: 40px; color: #333; } .container { background: white; padding: 40px; max-width: 900px; margin: 0 auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05); } h1 { color: #1e40af; }</style></head><body><div class="container"><h1>Business Report</h1><p><strong>Date:</strong> ${escapeHtml(data.createdAt)}</p><p><strong>Subject:</strong> ${escapeHtml(data.prompt || "Monthly Activity Report")}</p><hr><h2>1. Summary</h2><p>This report covers the key activities and performance metrics for the ongoing period.</p><h2>2. Findings</h2><ul><li>Revenue increased by 15%</li><li>Customer retention remains steady</li><li>Operational costs decreased by 5%</li></ul><h2>3. Recommendations</h2><p>Continue to monitor these metrics and adjust the Q4 strategy accordingly.</p></div></body></html>`;
  },
  invoiceTemplate(data) {
     return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; border: 1px solid #eee; } .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; } th { background: #f9f9f9; } .total { text-align: right; font-size: 20px; font-weight: bold; margin-top: 20px; }</style></head><body><div class="header"><div><h1>INVOICE</h1><p>Invoice #: ${Math.floor(Math.random() * 10000)}<br>Date: ${escapeHtml(data.createdAt)}</p></div><div><h2>Your Company</h2><p>123 Main St<br>City, State 12345</p></div></div><p><strong>Bill To:</strong><br>${escapeHtml(data.prompt || "Client Name")}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody><tr><td>Professional Services</td><td>1</td><td>$1,000.00</td><td>$1,000.00</td></tr><tr><td>Consulting Hours</td><td>5</td><td>$150.00</td><td>$750.00</td></tr></tbody></table><div class="total">Total Due: $1,750.00</div></body></html>`;
  },
  quotationTemplate(data) {
      return this.invoiceTemplate(data).replace("INVOICE", "QUOTATION").replace("Total Due", "Estimated Total");
  },
  contractTemplate(data) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: "Times New Roman", serif; max-width: 800px; margin: 40px auto; padding: 40px; line-height: 2; text-align: justify; border: 1px solid #ccc; background: #fff; } h1 { text-align: center; text-transform: uppercase; font-size: 24px; margin-bottom: 40px; } .sig-block { margin-top: 60px; display: flex; justify-content: space-between; } .sig-line { width: 45%; border-top: 1px solid #000; margin-top: 40px; padding-top: 10px; }</style></head><body><h1>Service Agreement</h1><p>This Service Agreement ("Agreement") is entered into on ${escapeHtml(data.createdAt)} by and between the service provider and the client regarding: <strong>${escapeHtml(data.prompt || "Standard Consulting Services")}</strong>.</p><h2>1. Services</h2><p>The provider agrees to perform the services outlined within a commercially reasonable timeframe.</p><h2>2. Compensation</h2><p>The client agrees to pay the provider for the services rendered as per the attached schedule.</p><h2>3. Confidentiality</h2><p>Both parties agree not to disclose confidential information obtained during the standard course of business.</p><div class="sig-block"><div class="sig-line">Provider Signature</div><div class="sig-line">Client Signature</div></div></body></html>`;
  },
  formTemplate(data) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: sans-serif; background: #f0f2f5; padding: 40px; } .form-container { background: #fff; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); } .field { margin-bottom: 20px; } label { display: block; font-weight: bold; margin-bottom: 8px; color: #444; } input[type="text"], input[type="email"], textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; } button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; }</style></head><body><div class="form-container"><h2>${escapeHtml(data.title)}</h2><p style="color: #666; margin-bottom: 24px;">${escapeHtml(data.prompt || "Please fill out this form.")}</p><div class="field"><label>Full Name</label><input type="text" placeholder="John Doe"></div><div class="field"><label>Email Address</label><input type="email" placeholder="john@example.com"></div><div class="field"><label>Comments</label><textarea rows="4" placeholder="Enter comments here..."></textarea></div><button type="button" onclick="alert('Form submitted!')">Submit</button></div></body></html>`;
  },
  tableTemplate(data) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Arial, sans-serif; padding: 30px; background: #fff; } h2 { color: #333; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #e0e0e0; padding: 12px 15px; text-align: left; } th { background-color: #f8fafc; font-weight: bold; color: #475569; } tr:nth-child(even) { background-color: #f8fafc; }</style></head><body><h2>${escapeHtml(data.title)}</h2><p>${escapeHtml(data.prompt || "Tracker Output")}</p><table><thead><tr><th>ID</th><th>Task / Item</th><th>Status</th><th>Assignee</th><th>Due Date</th></tr></thead><tbody><tr><td>1</td><td>Initial Planning</td><td><span style="color: green">Complete</span></td><td>Alice</td><td>${escapeHtml(data.createdAt)}</td></tr><tr><td>2</td><td>Development Phase</td><td><span style="color: orange">In Progress</span></td><td>Bob</td><td>Pending</td></tr><tr><td>3</td><td>Final Review</td><td><span style="color: gray">Not Started</span></td><td>Carol</td><td>TBD</td></tr></tbody></table></body></html>`;
  },
  certificateTemplate(data) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { background: #555; padding: 50px; display: flex; justify-content: center; } .cert { background: white; padding: 60px; border: 20px solid #ceaa56; text-align: center; width: 800px; font-family: "Georgia", serif; box-shadow: 0 10px 40px rgba(0,0,0,0.5); } h1 { font-size: 50px; color: #ceaa56; text-transform: uppercase; margin-bottom: 10px; } .subtitle { font-size: 24px; color: #555; margin-bottom: 40px; } .name { font-size: 40px; font-style: italic; border-bottom: 2px solid #ccc; display: inline-block; padding: 0 40px 10px; margin-bottom: 40px; } .reason { font-size: 20px; color: #666; max-width: 600px; margin: 0 auto 50px; line-height: 1.5; } .footer { display: flex; justify-content: space-between; margin-top: 50px; font-size: 16px; } .sig { border-top: 1px solid #333; padding-top: 10px; width: 200px; }</style></head><body><div class="cert"><h1>Certificate of Achievement</h1><div class="subtitle">This certificate is proudly presented to</div><div class="name">Honorable Recipient</div><div class="reason">${escapeHtml(data.prompt || "For outstanding performance, dedication, and excellence in their field of work.")}</div><div class="footer"><div class="sig">Authorized Signature</div><div class="sig">Date: ${escapeHtml(data.createdAt).split(",")[0]}</div></div></div></body></html>`;
  },
  dashboardTemplate(data) {
     return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Inter, sans-serif; background: #0f172a; margin: 0; color: #f1f5f9; padding: 30px; } .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; } .card { background: #1e293b; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); } .value { font-size: 32px; font-weight: bold; margin: 10px 0; color: #38bdf8; } .label { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; } .chart { grid-column: span 2; height: 250px; display: flex; align-items: flex-end; gap: 10px; border-bottom: 1px solid #334155; padding-bottom: 10px; } .bar { background: #38bdf8; width: 100%; border-radius: 4px 4px 0 0; } header { margin-bottom: 30px; } h1 { margin: 0; color: #fff; } p { color: #94a3b8; }</style></head><body><header><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.prompt || "KPI Executive Dashboard")}</p></header><div class="grid"><div class="card"><div class="label">Total Users</div><div class="value">24,592</div></div><div class="card"><div class="label">Revenue</div><div class="value">$142K</div></div><div class="card"><div class="label">Conversion Rate</div><div class="value">4.2%</div></div><div class="card"><div class="label">Active Sessions</div><div class="value">1,204</div></div><div class="card chart"><div class="bar" style="height: 40%"></div><div class="bar" style="height: 60%"></div><div class="bar" style="height: 35%"></div><div class="bar" style="height: 80%"></div><div class="bar" style="height: 65%"></div><div class="bar" style="height: 90%"></div><div class="bar" style="height: 100%"></div></div><div class="card chart"><div class="bar" style="background:#f43f5e;height: 20%"></div><div class="bar" style="background:#f43f5e;height: 30%"></div><div class="bar" style="background:#f43f5e;height: 25%"></div><div class="bar" style="background:#f43f5e;height: 40%"></div><div class="bar" style="background:#f43f5e;height: 45%"></div><div class="bar" style="background:#f43f5e;height: 35%"></div><div class="bar" style="background:#f43f5e;height: 50%"></div></div></div></body></html>`;
  },
  emailTemplate(data) {
     return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Arial, sans-serif; background: #e5e7eb; padding: 40px; } .email-container { background: white; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); } .header { background: #2563eb; color: white; padding: 20px; font-size: 20px; font-weight: bold; } .body { padding: 30px; line-height: 1.6; color: #374151; } .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; } .btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin-top: 20px; font-weight: bold; }</style></head><body><div class="email-container"><div class="header">${escapeHtml(data.title)}</div><div class="body"><p>Hello,</p><p>${escapeHtml(data.prompt || "This is a generated email template. You can customize the content as needed.")}</p><a href="#" class="btn">Take Action</a></div><div class="footer">Sent on ${escapeHtml(data.createdAt)}<br>Unsubscribe | Preferences</div></div></body></html>`;
  },
  interactiveTemplate(data) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(data.title)}</title><style>body { margin: 0; overflow: hidden; background: #050510; } #label { position: fixed; top: 20px; left: 20px; color: white; font-family: Inter, Arial, sans-serif; z-index: 10; }</style></head><body><div id="label"><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.prompt || "Interactive web artifact")}</p></div><script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script><script>const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);const renderer=new THREE.WebGLRenderer();renderer.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(renderer.domElement);const geometry=new THREE.TorusKnotGeometry(1,0.3,100,16);const material=new THREE.MeshNormalMaterial();const mesh=new THREE.Mesh(geometry,material);scene.add(mesh);camera.position.z=4;function animate(){requestAnimationFrame(animate);mesh.rotation.x+=0.01;mesh.rotation.y+=0.01;renderer.render(scene,camera);}animate();</script></body></html>`;
  }
};

export function generateDocumentArtifact(skillId: string, userPrompt: string = "") {
  const skill = DOCUMENT_SKILLS[skillId];

  if (!skill) {
    throw new Error("Unknown document skill.");
  }

  const templateFn = ARTIFACT_TEMPLATES[skill.template];

  if (!templateFn) {
    throw new Error(`Missing template: ${skill.template}`);
  }

  const id = `artifact_${Date.now()}`;

  const html = templateFn({
    id,
    title: skill.label,
    documentType: skill.documentType,
    prompt: userPrompt,
    createdAt: new Date().toLocaleString()
  });

  return {
    id,
    title: skill.label,
    documentType: skill.documentType,
    category: skill.category,
    artifactType: skill.artifactType,
    summary: `Generated ${skill.label} as a web artifact.`,
    html,
    createdAt: new Date().toISOString(),
    actions: ["open", "print", "download"]
  };
}

export function detectDocumentSkillFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("presentation") || lower.includes("slides") || lower.includes("powerpoint")) return "slide_deck";
  if (lower.includes("proposal")) return "business_proposal";
  if (lower.includes("meeting minutes") || lower.includes("minutes")) return "meeting_minutes";
  if (lower.includes("letter")) return "formal_letter";
  if (lower.includes("report")) return "report";
  if (lower.includes("invoice")) return "invoice";
  if (lower.includes("quotation") || lower.includes("quote")) return "quotation";
  if (lower.includes("contract") || lower.includes("agreement") || lower.includes("nda")) return "contract_draft";
  if (lower.includes("certificate")) return "certificate";
  if (lower.includes("dashboard")) return "dashboard_artifact";
  if (lower.includes("tracker") || lower.includes("table")) return "tracker_table";
  if (lower.includes("form")) return "hr_form";
  if (lower.includes("interactive") || lower.includes("three.js")) return "interactive_artifact";
  return null;
}
