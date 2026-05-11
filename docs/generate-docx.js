const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, UnderlineType,
  PageBreak, NumberFormat, convertInchesToTwip,
  Header, Footer, PageNumber,
} = require("docx");

const md = fs.readFileSync(path.join(__dirname, "USER_MANUAL.md"), "utf8");
const lines = md.split("\n");

const BLUE = "1E3A5F";
const LIGHT_BLUE = "E8F0F7";
const AMBER = "92400E";
const GRAY = "6B7280";
const WHITE = "FFFFFF";
const BORDER_COLOR = "CBD5E1";

function makeHRule() {
  return new Paragraph({
    border: { bottom: { color: BORDER_COLOR, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 200 },
  });
}

function parseLine(line) {
  // Convert bold, inline code, and plain text to TextRuns
  const parts = [];
  const re = /(\*\*(.+?)\*\*|`(.+?)`|([^*`]+))/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m[2]) parts.push(new TextRun({ text: m[2], bold: true }));
    else if (m[3]) parts.push(new TextRun({ text: m[3], font: "Courier New", size: 18, color: "C7254E", shading: { type: ShadingType.SOLID, color: "F9F2F4" } }));
    else if (m[4]) parts.push(new TextRun({ text: m[4] }));
  }
  return parts.length ? parts : [new TextRun({ text: line })];
}

const children = [];
let i = 0;

// Cover page
children.push(
  new Paragraph({ spacing: { before: 2000 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "iZOOM", bold: true, size: 72, color: BLUE, font: "Calibri" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Inventory Management System", bold: true, size: 40, color: BLUE, font: "Calibri" })],
    spacing: { after: 400 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "USER MANUAL", bold: true, size: 36, color: GRAY, font: "Calibri" })],
    spacing: { after: 800 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Version 1.0  •  May 2026", size: 22, color: GRAY })],
    spacing: { after: 200 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Multi-Branch Inventory Management", size: 22, color: GRAY })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Parse markdown
while (i < lines.length) {
  const line = lines[i];

  // Skip cover title lines (already rendered)
  if (line === "# iZOOM Inventory Management System" || line === "## User Manual") { i++; continue; }
  if (line.startsWith("**Version:**") || line.startsWith("**Date:**") || line.startsWith("**System:**")) { i++; continue; }

  // HR
  if (line.trim() === "---") {
    children.push(makeHRule());
    i++; continue;
  }

  // Headings
  if (line.startsWith("# ")) {
    const text = line.replace(/^# /, "");
    children.push(new Paragraph({
      text,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      border: { bottom: { color: BLUE, style: BorderStyle.SINGLE, size: 8, space: 4 } },
    }));
    i++; continue;
  }
  if (line.startsWith("## ")) {
    const text = line.replace(/^## /, "");
    children.push(new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
    }));
    i++; continue;
  }
  if (line.startsWith("### ")) {
    const text = line.replace(/^### /, "");
    children.push(new Paragraph({
      text,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100 },
    }));
    i++; continue;
  }

  // Blockquote
  if (line.startsWith("> ")) {
    const text = line.replace(/^> \*?\*?Note:\*?\*? ?/, "").replace(/^> /, "");
    children.push(new Paragraph({
      children: [new TextRun({ text: "📌 " + text, italics: true, color: AMBER })],
      indent: { left: convertInchesToTwip(0.4) },
      spacing: { before: 80, after: 80 },
      border: { left: { color: AMBER, style: BorderStyle.SINGLE, size: 12, space: 8 } },
    }));
    i++; continue;
  }

  // Code block
  if (line.startsWith("```")) {
    i++;
    const codeLines = [];
    while (i < lines.length && !lines[i].startsWith("```")) {
      codeLines.push(lines[i]);
      i++;
    }
    i++;
    codeLines.forEach(cl => {
      children.push(new Paragraph({
        children: [new TextRun({ text: cl || " ", font: "Courier New", size: 18 })],
        indent: { left: convertInchesToTwip(0.4) },
        shading: { type: ShadingType.SOLID, color: "F3F4F6" },
        spacing: { before: 0, after: 0 },
      }));
    });
    children.push(new Paragraph({ spacing: { after: 100 } }));
    continue;
  }

  // Table
  if (line.startsWith("|")) {
    const tableLines = [];
    while (i < lines.length && lines[i].startsWith("|")) {
      if (!lines[i].match(/^\|[-| :]+\|$/)) tableLines.push(lines[i]);
      i++;
    }
    if (tableLines.length > 0) {
      const rows = tableLines.map((tl, rowIdx) => {
        const cells = tl.split("|").slice(1, -1).map(c => c.trim());
        return new TableRow({
          children: cells.map(cellText => new TableCell({
            children: [new Paragraph({
              children: parseLine(cellText),
              alignment: AlignmentType.LEFT,
            })],
            shading: rowIdx === 0
              ? { type: ShadingType.SOLID, color: BLUE }
              : rowIdx % 2 === 0
              ? { type: ShadingType.SOLID, color: LIGHT_BLUE }
              : { type: ShadingType.SOLID, color: WHITE },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          })),
          tableHeader: rowIdx === 0,
        });
      });
      // Fix header text color
      const headerRow = tableLines[0].split("|").slice(1, -1).map(c => c.trim());
      rows[0] = new TableRow({
        children: headerRow.map(cellText => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cellText, bold: true, color: WHITE })],
          })],
          shading: { type: ShadingType.SOLID, color: BLUE },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })),
        tableHeader: true,
      });

      children.push(new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      children.push(new Paragraph({ spacing: { after: 150 } }));
    }
    continue;
  }

  // Bullet list
  if (line.match(/^(\s*)[-*] /)) {
    const indent = (line.match(/^(\s*)/)?.[1]?.length || 0) > 0 ? 2 : 1;
    const text = line.replace(/^\s*[-*] /, "");
    children.push(new Paragraph({
      children: parseLine(text),
      bullet: { level: indent - 1 },
      spacing: { before: 40, after: 40 },
    }));
    i++; continue;
  }

  // Numbered list
  if (line.match(/^\d+\. /)) {
    const text = line.replace(/^\d+\. /, "");
    children.push(new Paragraph({
      children: parseLine(text),
      numbering: { reference: "my-numbering", level: 0 },
      spacing: { before: 40, after: 40 },
    }));
    i++; continue;
  }

  // Empty line
  if (line.trim() === "") {
    children.push(new Paragraph({ spacing: { after: 80 } }));
    i++; continue;
  }

  // Normal paragraph
  children.push(new Paragraph({
    children: parseLine(line),
    spacing: { before: 60, after: 60 },
  }));
  i++;
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "my-numbering",
      levels: [{
        level: 0,
        format: NumberFormat.DECIMAL,
        text: "%1.",
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
      }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        run: { bold: true, size: 32, color: BLUE, font: "Calibri" },
        paragraph: { spacing: { before: 400, after: 200 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        run: { bold: true, size: 26, color: BLUE, font: "Calibri" },
        paragraph: { spacing: { before: 300, after: 120 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        run: { bold: true, size: 24, color: "374151", font: "Calibri" },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.2),
          right: convertInchesToTwip(1.2),
        },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "iZOOM Inventory Management System — User Manual", color: GRAY, size: 18 }),
          ],
          border: { bottom: { color: BORDER_COLOR, style: BorderStyle.SINGLE, size: 4, space: 4 } },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "© 2026 iZOOM. All rights reserved.  |  Page ", color: GRAY, size: 18 }),
            new TextRun({ children: [PageNumber.CURRENT], color: GRAY, size: 18 }),
            new TextRun({ text: " of ", color: GRAY, size: 18 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], color: GRAY, size: 18 }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { color: BORDER_COLOR, style: BorderStyle.SINGLE, size: 4, space: 4 } },
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(__dirname, "USER_MANUAL.docx"), buf);
  console.log("Done: USER_MANUAL.docx generated successfully.");
});
