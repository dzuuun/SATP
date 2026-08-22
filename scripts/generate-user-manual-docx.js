"use strict";

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const root = path.resolve(__dirname, "..");
const manualPath = process.env.SATP_MANUAL_SOURCE
  ? path.resolve(root, process.env.SATP_MANUAL_SOURCE)
  : path.join(root, "docs", "USER_MANUAL.md");
const outputPath = process.env.SATP_MANUAL_OUTPUT
  ? path.resolve(root, process.env.SATP_MANUAL_OUTPUT)
  : path.join(root, "docs", "SATP_USER_MANUAL.docx");
const isTransactionGuide =
  path.basename(manualPath).toLowerCase() === "check_student_transactions.md";
const screenshotDirectory = path.join(
  root,
  "docs",
  "screenshots",
  ...(isTransactionGuide ? ["transaction-guide"] : []),
);
const screenshots = [
  { file: "01-landing.png", caption: "Figure 1. SATP landing page", after: "## 1. About SATP" },
  { file: "02-login.png", caption: "Figure 2. SATP sign-in page", after: "## 2. Signing in and out" },
  { file: "22-student-courses-to-rate.png", caption: "Figure 3. Authenticated Courses to Rate page", after: "## 3. Student assessment" },
  { file: "03-transactions.png", caption: "Figure 4. Transactions monitoring page", after: "## 4. Transactions" },
  { file: "25-open-transaction-modal.png", caption: "Figure 5. Select a student row to open transaction details", after: "### Open a student's transaction details" },
  { file: "24-transaction-detail.png", caption: "Figure 6. Review a student's course transactions", after: "### Review the student's transactions" },
  { file: "05-ranking-reports.png", caption: "Figure 5. Ranking report builder", after: "## 5. Ranking reports" },
  { file: "04-rating-reports.png", caption: "Figure 6. Rating report builder", after: "## 6. Rating reports" },
  { file: "16-admin-maintenance.png", caption: "Figure 7. Admin maintenance page", after: "### Admin" },
  { file: "20-category-maintenance.png", caption: "Figure 8. Category maintenance page", after: "### Category" },
  { file: "23-school-maintenance.png", caption: "Figure 9. School maintenance page", after: "### School" },
  { file: "11-college-maintenance.png", caption: "Figure 10. College maintenance page", after: "### College" },
  { file: "12-department-maintenance.png", caption: "Figure 11. Department maintenance page", after: "### Department" },
  { file: "13-program-maintenance.png", caption: "Figure 12. Program maintenance page", after: "### Program" },
  { file: "21-item-maintenance.png", caption: "Figure 13. Item maintenance page", after: "### Item" },
  { file: "19-room-maintenance.png", caption: "Figure 14. Room maintenance page", after: "### Room" },
  { file: "17-school-year-maintenance.png", caption: "Figure 15. School Year maintenance page", after: "### School year" },
  { file: "18-semester-maintenance.png", caption: "Figure 16. Semester maintenance page", after: "### Semester" },
  { file: "06-student-maintenance.png", caption: "Figure 17. Student maintenance page", after: "### Student" },
  { file: "07-student-course.png", caption: "Figure 18. Student Course maintenance page", after: "### Student Course maintenance" },
  { file: "08-schedule-assignment.png", caption: "Figure 19. Schedule assignment page", after: "### Schedule assignment" },
  { file: "14-course-maintenance.png", caption: "Figure 20. Course maintenance page", after: "### Course" },
  { file: "15-teacher-maintenance.png", caption: "Figure 21. Teacher maintenance page", after: "### Teacher" },
  { file: "10-activity-log.png", caption: "Figure 22. Activity log", after: "### Activity log" },
  { file: "09-permissions.png", caption: "Figure 23. Permission roles and module access", after: "### Permissions" },
];

function reorderSubsections(section, order) {
  const parts = section.split(/(?=^### )/m);
  const introduction = parts.shift();
  const byTitle = new Map(
    parts.map((part) => [part.match(/^### (.+)$/m)?.[1]?.trim(), part]),
  );
  const ordered = order.map((title) => byTitle.get(title)).filter(Boolean);
  const used = new Set(order);
  const remaining = parts.filter((part) => {
    const title = part.match(/^### (.+)$/m)?.[1]?.trim();
    return !used.has(title);
  });
  return [introduction, ...ordered, ...remaining].join("");
}

function orderLikeSidebar(markdown) {
  const parts = markdown.split(/(?=^## )/m);
  const preamble = parts.shift();
  const sections = new Map(
    parts.map((part) => [part.match(/^## \d+\. (.+)$/m)?.[1]?.trim(), part]),
  );
  const order = [
    "About SATP",
    "Signing in and out",
    "Student assessment",
    "Transactions",
    "Ranking reports",
    "Rating reports",
    "Maintenance",
    "Users and access",
    "Common problems",
    "Recommended operating practices",
    "Support",
  ];
  const maintenanceOrder = [
    "Admin",
    "Category",
    "School",
    "College",
    "Department",
    "Program",
    "Item",
    "Room",
    "School year",
    "Semester",
    "Student",
    "Student Course maintenance",
    "Schedule assignment",
    "Course",
    "Teacher",
    "Common maintenance controls",
    "Add a maintenance record",
    "Edit or change a record's status",
    "Import a workbook",
    "Student and admin passwords during import",
  ];
  const usersOrder = ["Activity log", "Permissions", "User management"];
  const result = order
    .map((title, index) => {
      let section = sections.get(title);
      if (!section) return "";
      if (title === "Maintenance")
        section = reorderSubsections(section, maintenanceOrder);
      if (title === "Users and access")
        section = reorderSubsections(section, usersOrder);
      return section.replace(/^## \d+\./, `## ${index + 1}.`);
    })
    .filter(Boolean);
  return [preamble, ...result].join("");
}

function xml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function run(text, options = {}) {
  const properties = [
    options.bold ? "<w:b/>" : "",
    options.italic ? "<w:i/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
    options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : "",
  ].join("");
  return `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function linkedRuns(text, options = {}) {
  const productionUrl = "https://satp.ndmu.edu.ph/";
  return String(text)
    .split(productionUrl)
    .map((part, index, parts) => {
      const content = part ? run(part, options) : "";
      if (index === parts.length - 1) return content;
      return `${content}<w:hyperlink r:id="rIdSatp" w:history="1"><w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t>${productionUrl}</w:t></w:r></w:hyperlink>`;
    })
    .join("");
}

function paragraph(text, style, options = {}) {
  const styleXml = style ? `<w:pStyle w:val="${style}"/>` : "";
  const spacing = options.after === 0 ? '<w:spacing w:after="0"/>' : "";
  return `<w:p><w:pPr>${styleXml}${spacing}</w:pPr>${linkedRuns(text, options)}</w:p>`;
}

function imageParagraph(index, caption) {
  const relation = `rId${index}`;
  const drawing = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="5943600" cy="4127500"/><wp:docPr id="${index}" name="Screenshot ${index}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${index}" name="Screenshot ${index}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relation}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5943600" cy="4127500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  return drawing + `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${run(caption, { italic: true, color: "52665C", size: 18 })}</w:p>`;
}

function markdownBody(markdown, activeScreenshots) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const body = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      body.push("<w:p/>");
      continue;
    }
    if (line.startsWith("# ")) {
      body.push(paragraph(line.slice(2), "Title"));
      continue;
    }
    if (line.startsWith("## ")) {
      body.push(paragraph(line.slice(3), "Heading1"));
      activeScreenshots.forEach((shot, index) => {
        if (shot.after === line) body.push(imageParagraph(index + 1, shot.caption));
      });
      continue;
    }
    if (line.startsWith("### ")) {
      body.push(paragraph(line.slice(4), "Heading2"));
      activeScreenshots.forEach((shot, index) => {
        if (shot.after === line) body.push(imageParagraph(index + 1, shot.caption));
      });
      continue;
    }
    const bullet = line.match(/^- (.+)$/);
    if (bullet) {
      body.push(paragraph(`• ${bullet[1].replace(/\*\*/g, "")}`, "ListParagraph"));
      continue;
    }
    const numbered = line.match(/^(\d+)\. (.+)$/);
    if (numbered) {
      body.push(paragraph(`${numbered[1]}. ${numbered[2].replace(/\*\*/g, "")}`, "ListParagraph"));
      continue;
    }
    body.push(paragraph(line.replace(/\*\*/g, "").replace(/`/g, ""), "Normal"));
  }
  return body.join("");
}

async function main() {
  const zip = new JSZip();
  const sourceMarkdown = fs.readFileSync(manualPath, "utf8");
  const markdown =
    path.basename(manualPath).toLowerCase() === "user_manual.md"
      ? orderLikeSidebar(sourceMarkdown)
      : sourceMarkdown;
  const activeScreenshots = screenshots.filter((shot) =>
    markdown.includes(shot.after),
  );
  const body = markdownBody(markdown, activeScreenshots);
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder("docProps").file("core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>SATP User Manual</dc:title><dc:subject>Student Assessment of Teacher's Performance</dc:subject><dc:creator>Notre Dame of Marbel University MIS Department</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026-08-22T00:00:00Z</dcterms:created></cp:coreProperties>`);
  zip.folder("docProps").file("app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SATP Documentation Generator</Application></Properties>`);
  zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720"/></w:sectPr></w:body></w:document>`);
  zip.folder("word").file("styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="240"/></w:pPr><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:b/><w:color w:val="075C3B"/><w:sz w:val="42"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="075C3B"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="087247"/><w:sz w:val="25"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr></w:style></w:styles>`);
  const imageRelationships = activeScreenshots.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${index + 1}.png"/>`).join("");
  zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRelationships}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSatp" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://satp.ndmu.edu.ph/" TargetMode="External"/></Relationships>`);
  activeScreenshots.forEach((shot, index) =>
    zip
      .folder("word")
      .folder("media")
      .file(
        `image${index + 1}.png`,
        fs.readFileSync(path.join(screenshotDirectory, shot.file)),
      ),
  );
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(outputPath, buffer);
  console.log(`${outputPath} (${buffer.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
