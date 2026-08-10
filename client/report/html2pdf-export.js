"use strict";

async function renderReportPdf({
  element = document.getElementById("reportSheet"),
  filename,
  pagebreakAvoid = [],
  save = true,
}) {
  if (typeof html2pdf === "undefined") {
    throw new Error("html2pdf could not be loaded.");
  }
  if (!element) throw new Error("The report content could not be found.");

  const clone = element.cloneNode(true);
  clone.removeAttribute("id");
  clone.classList.add("html2pdf-report");
  Object.assign(clone.style, {
    display: "block",
    position: "relative",
    width: "740px",
    minWidth: "740px",
    maxWidth: "740px",
    height: "auto",
    minHeight: "0",
    margin: "0",
    padding: "0 12px",
    border: "0",
    borderRadius: "0",
    boxShadow: "none",
    overflow: "visible",
    boxSizing: "border-box",
    background: "#fff",
    transform: "none",
    overflowWrap: "anywhere",
    wordBreak: "normal",
  });

  const exportStyles = document.createElement("style");
  exportStyles.textContent = `
    .html2pdf-report,
    .html2pdf-report * { box-sizing: border-box !important; }
    .html2pdf-report > *,
    .html2pdf-report .document-header > *,
    .html2pdf-report .report-details > * { min-width: 0 !important; }
    .html2pdf-report .document-header {
      width: 100% !important;
      max-width: 100% !important;
      display: grid !important;
      grid-template-columns: 90px minmax(0, 1fr) 105px !important;
      gap: 16px !important;
    }
    .html2pdf-report .document-header img {
      width: 100% !important;
      max-width: 100% !important;
      object-fit: contain !important;
    }
    .html2pdf-report .report-details,
    .html2pdf-report .report-table-wrap,
    .html2pdf-report table {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
    .html2pdf-report table {
      table-layout: fixed !important;
      border-collapse: collapse !important;
    }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th,
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td {
      min-width: 0 !important;
      white-space: normal !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
      hyphens: auto !important;
    }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th:nth-child(1),
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td:nth-child(1) { width: 7% !important; }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th:nth-child(2),
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td:nth-child(2) { width: 22% !important; }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th:nth-child(3),
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td:nth-child(3) { width: 19% !important; }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th:nth-child(4),
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td:nth-child(4) { width: 24% !important; }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th:nth-child(5),
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td:nth-child(5) { width: 11% !important; }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] th:nth-child(6),
    .html2pdf-report table[aria-label="Overall college teacher ranking"] td:nth-child(6) { width: 17% !important; }
    .html2pdf-report table[aria-label="Overall college teacher ranking"] .qualitative-badge {
      width: auto !important;
      max-width: 100% !important;
      white-space: normal !important;
      overflow-wrap: break-word !important;
      text-align: center !important;
    }
    .html2pdf-report .comments-section,
    .html2pdf-report .comments-section > div,
    .html2pdf-report .comment-entry {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
    }
  `;
  clone.prepend(exportStyles);

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: "-1",
    width: "740px",
    height: "auto",
    overflow: "visible",
    background: "#fff",
    pointerEvents: "none",
  });
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    await Promise.all(
      [...clone.querySelectorAll("img")].map(
        (image) =>
          image.complete ||
          new Promise((resolve) => {
            image.onload = resolve;
            image.onerror = resolve;
          }),
      ),
    );
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );

    const worker = html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "letter", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [
            ".document-header",
            ".document-title",
            ".report-details",
            ".summary-grid",
            ".category-row",
            ".average-row",
            ".comment-entry",
            ".document-footer",
            ...pagebreakAvoid,
          ],
        },
      })
      .from(clone);

    if (save) {
      await worker.save();
      return null;
    }
    return await worker.outputPdf("blob");
  } finally {
    container.remove();
  }
}

window.renderReportPdf = renderReportPdf;
