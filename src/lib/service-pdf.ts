import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { WORKSHOP, formatDate } from "./workshop";
import { formatTry, itemTotal, itemsTotal, itemsTotalWithVat, toNumber, vatAmount } from "./money";

export type ServiceFormData = {
  orderNo: string;
  customer: {
    name: string;
    company_name?: string;
    contact_person?: string;
    phone: string;
    email: string;
    address: string;
    forklift_brand: string;
    forklift_model: string;
    serial_no: string;
  };
  machineCode?: string;
  hourMeter?: string | number | null;
  nextServiceInfo?: string;
  technicianName: string;
  faultDescription: string;
  serviceNote: string;
  serviceItems?: { title: string; qty: string; unit: string; price?: string }[];
  signatureData: string | null;
  signerName?: string;
  createdAt: string;
  completedAt: string | null;
  /** true ise kalem fiyatları ve toplam tutar PDF'e yazılır. */
  withPrices?: boolean;
  kind?: "service" | "quote";
  quoteNote?: string;
};

function escapeHtml(s: string) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

function field(label: string, value: string) {
  return `<div style="padding:4px 0;border-bottom:1px dashed ${LINE}">
    <div style="font-size:9px;color:${MUTED};text-transform:uppercase;letter-spacing:.12em;font-weight:700">${escapeHtml(label)}</div>
    <div style="font-size:12.5px;color:${INK};margin-top:2px;font-weight:600">${escapeHtml(value || "-")}</div>
  </div>`;
}

function card(title: string, body: string, accent: string) {
  return `<div style="flex:1;border:1px solid ${LINE};border-radius:12px;padding:14px 16px;background:#fff">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="width:6px;height:6px;border-radius:2px;background:${accent}"></span>
      <span style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${INK}">${escapeHtml(title)}</span>
    </div>${body}</div>`;
}

function sectionTitle(t: string, accent: string) {
  return `<div style="margin-top:12px;display:flex;align-items:center;gap:10px">
    <span style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${INK}">${escapeHtml(t)}</span>
    <span style="flex:1;height:1px;background:linear-gradient(90deg,${accent},transparent)"></span></div>`;
}

type PdfItem = { title: string; qty: string; unit: string; price?: string };

function itemsTable(items: PdfItem[], withPrices: boolean, accent: string) {
  const cell = `padding:5px 10px;border-bottom:1px solid ${LINE};font-size:12px;color:${INK}`;
  const th = `padding:8px 10px;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#fff;font-weight:700`;
  const rows = items.length
    ? items
        .map(
          (i, idx) => `<tr style="background:${idx % 2 ? "#f8fafc" : "#fff"}">
            <td style="${cell};color:${MUTED};width:28px;font-weight:700">${String(idx + 1).padStart(2, "0")}</td>
            <td style="${cell};font-weight:600">${escapeHtml(i.title)}</td>
            <td style="${cell};text-align:right;white-space:nowrap">${escapeHtml([i.qty, i.unit].filter(Boolean).join(" "))}</td>
            ${
              withPrices
                ? `<td style="${cell};text-align:right;white-space:nowrap">${toNumber(i.price) ? escapeHtml(formatTry(toNumber(i.price))) : "-"}</td>
                   <td style="${cell};text-align:right;white-space:nowrap;font-weight:800">${itemTotal(i) ? escapeHtml(formatTry(itemTotal(i))) : "-"}</td>`
                : ""
            }
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="${withPrices ? 5 : 3}" style="padding:12px 10px;font-size:12px;color:#94a3b8">Madde girilmedi.</td></tr>`;
  const total =
    withPrices && items.length
      ? `<div style="display:flex;justify-content:flex-end;margin-top:10px">
          <div style="width:300px;background:${INK};color:#fff;border-radius:10px;padding:9px 14px">
            <div style="display:flex;justify-content:space-between;gap:16px;font-size:10px;font-weight:700;opacity:.75"><span>ARA TOPLAM</span><span>${escapeHtml(formatTry(itemsTotal(items)))}</span></div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;font-weight:700;opacity:.75"><span>KDV %20</span><span>${escapeHtml(formatTry(vatAmount(items)))}</span></div>
            <div style="height:1px;background:#ffffff33;margin:7px 0"></div>
            <div style="display:flex;justify-content:space-between;gap:16px;align-items:center"><span style="font-size:10px;letter-spacing:.12em;font-weight:800">KDV DAHİL TOPLAM</span><span style="font-size:17px;font-weight:800;color:${accent}">${escapeHtml(formatTry(itemsTotalWithVat(items)))}</span></div>
          </div></div>`
      : "";
  return `<table style="width:100%;border-collapse:separate;border-spacing:0;margin-top:8px;border:1px solid ${LINE};border-radius:12px;overflow:hidden">
      <thead><tr style="background:${INK}">
        <th style="${th};text-align:left">#</th>
        <th style="${th};text-align:left">İşlem / Parça</th>
        <th style="${th};text-align:right">Miktar</th>
        ${withPrices ? `<th style="${th};text-align:right">Birim Fiyat</th><th style="${th};text-align:right">Tutar</th>` : ""}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>${total}`;
}

function textBox(text: string, accent: string) {
  return `<div style="margin-top:8px;font-size:12.5px;line-height:1.6;white-space:pre-wrap;color:${INK};background:#f8fafc;border-left:3px solid ${accent};border-radius:8px;padding:12px 14px;min-height:40px">${escapeHtml(text || "-")}</div>`;
}

function buildHtml(d: ServiceFormData) {
  const W = WORKSHOP;
  const accent = W.accentColor || "#f0a13c";
  const isQuote = d.kind === "quote";
  const withPrices = isQuote || !!d.withPrices;
  const company = d.customer.company_name || d.customer.name;
  const contacts = [W.phone, W.email, W.website].filter(Boolean).map(escapeHtml).join(" &nbsp;·&nbsp; ");
  const tax = [W.taxOffice && `V.D. ${W.taxOffice}`, W.taxNo && `V.N. ${W.taxNo}`].filter(Boolean).join(" · ");
  const quoteTerms = [
    "Müşteri, bu teklifin kabul edildiğini yazılı bir şekilde belirttikten sonra işlemler başlatılacaktır.",
    "Ödeme, hizmet ve malların tesliminden sonra havale ile yapılacaktır.",
    "Birim fiyatlarımızda %20 KDV hariçtir.",
    "Fiyatlarımız fatura tarihinde TCMB Efektif satış kuru alınarak TL'ye çevirilip fatura kesilecektir.",
  ];
  return `
  <div style="width:794px;background:#fff;font-family:Manrope,Arial,Helvetica,sans-serif;color:${INK};box-sizing:border-box">
    <div style="background:${INK};color:#fff;padding:20px 40px 18px;position:relative;overflow:hidden">
      <div style="position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;border:28px solid ${accent};opacity:.18"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;position:relative">
        <div style="display:flex;align-items:center;gap:14px">
          ${W.logoUrl ? `<img src="${escapeHtml(W.logoUrl)}" crossorigin="anonymous" style="height:54px;max-width:140px;object-fit:contain;background:#fff;border-radius:8px;padding:4px" />` : `<div style="width:52px;height:52px;border-radius:12px;background:${accent};color:${INK};display:flex;align-items:center;justify-content:center;font-family:Archivo,Arial;font-weight:800;font-size:22px">${escapeHtml(W.name.slice(0, 1))}</div>`}
          <div>
            <div style="font-family:Archivo,Arial;font-size:24px;font-weight:800;letter-spacing:-.3px">${escapeHtml(W.name)}</div>
            <div style="font-size:11px;opacity:.7;margin-top:2px">${escapeHtml(W.tagline)}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="display:inline-block;background:${accent};color:${INK};font-size:10px;font-weight:800;letter-spacing:.16em;padding:5px 10px;border-radius:999px">${escapeHtml(isQuote ? "FİYAT TEKLİFİ" : withPrices ? W.pricedFormTitle : W.formTitle)}</div>
          <div style="font-family:Archivo,Arial;font-size:20px;font-weight:800;margin-top:8px">${isQuote ? "Teklif No T-" : "No "}${escapeHtml(d.orderNo)}</div>
          <div style="font-size:11px;opacity:.7">${escapeHtml(formatDate(isQuote ? new Date().toISOString() : (d.completedAt ?? d.createdAt)))}</div>
        </div>
      </div>
    </div>
    <div style="height:5px;background:linear-gradient(90deg,${accent},${accent}55)"></div>

    <div style="padding:16px 40px 18px">
      <div style="display:flex;gap:14px">
        ${card("Müşteri", field("Firma Ünvanı", company) + field("Yetkili", d.customer.contact_person || d.customer.name) + field("Telefon", d.customer.phone) + field("Adres", d.customer.address), accent)}
        ${card("Makine", (d.machineCode ? field("Kimlik No", d.machineCode) : "") + field("Marka / Model", [d.customer.forklift_brand, d.customer.forklift_model].filter(Boolean).join(" ")) + field("Seri No", d.customer.serial_no) + (d.hourMeter ? field("Çalışma Saati", `${d.hourMeter} saat`) : ""), accent)}
      </div>

      <div style="display:flex;gap:10px;margin-top:14px">
        ${[["Teknisyen", d.technicianName], ["İş Emri", formatDate(d.createdAt)], ["Tamamlanma", formatDate(d.completedAt)], ...(d.nextServiceInfo ? [["Sonraki Bakım", d.nextServiceInfo]] : [])]
          .map(([l, v]) => `<div style="flex:1;border:1px solid ${LINE};border-radius:10px;padding:9px 12px"><div style="font-size:9px;color:${MUTED};letter-spacing:.12em;text-transform:uppercase;font-weight:700">${escapeHtml(l ?? "")}</div><div style="font-size:12px;font-weight:700;margin-top:2px">${escapeHtml(v ?? "")}</div></div>`)
          .join("")}
      </div>

      ${sectionTitle("Arıza Tanımı", accent)}
      ${textBox(d.faultDescription, accent)}
      ${sectionTitle("Yapılan İşlemler / Değişen Parçalar", accent)}
      ${itemsTable(d.serviceItems ?? [], withPrices, accent)}
      ${isQuote ? (d.quoteNote ? sectionTitle("Teklif Notu", accent) + textBox(d.quoteNote, accent) : "") : sectionTitle("Teknisyen Görüşü", accent) + textBox(d.serviceNote, accent)}

      <div style="margin-top:14px;display:flex;gap:16px;align-items:stretch">
        <div style="flex:1;border:1px solid ${LINE};border-radius:12px;padding:14px 16px;font-size:11px;color:${MUTED};line-height:1.6">
          <div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${INK};margin-bottom:6px">${isQuote ? "Teklif Koşulları" : "Beyan"}</div>
          ${isQuote ? `<ol style="margin:0;padding-left:18px">${quoteTerms.map((term) => `<li style="margin-bottom:3px">${escapeHtml(term)}</li>`).join("")}</ol>` : escapeHtml(W.declaration)}
        </div>
        <div style="width:260px;border:1px solid ${LINE};border-radius:12px;padding:12px;text-align:center">
          <div style="font-size:9px;color:${MUTED};letter-spacing:.12em;text-transform:uppercase;font-weight:700">${isQuote ? "Teklifi Onaylayan" : "Müşteri Onayı"}</div>
          <div style="height:80px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-bottom:1px solid ${LINE}">
            ${!isQuote && d.signatureData ? `<img src="${d.signatureData}" style="max-width:100%;max-height:100%" />` : ""}
          </div>
          <div style="font-size:12px;margin-top:6px;font-weight:800">${isQuote ? "Ad Soyad / İmza / Kaşe" : escapeHtml(d.signerName || d.customer.contact_person || d.customer.name)}</div>
          <div style="font-size:10px;color:${MUTED}">${escapeHtml(company)}</div>
        </div>
      </div>
    </div>

    <div style="background:#f8fafc;border-top:1px solid ${LINE};padding:14px 44px;display:flex;justify-content:space-between;gap:16px;font-size:10px;color:${MUTED}">
      <div><b style="color:${INK}">${escapeHtml(W.name)}</b> · ${escapeHtml(W.address)}${tax ? ` · ${escapeHtml(tax)}` : ""}<br/>${contacts}</div>
      <div style="text-align:right;max-width:240px;font-style:italic">${escapeHtml(W.footerNote)}</div>
    </div>
  </div>`;
}

export async function generateServicePdf(d: ServiceFormData): Promise<jsPDF> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.background = "#ffffff";
  host.innerHTML = buildHtml(d);
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const fullHeight = (canvas.height * pageWidth) / canvas.width;
    // Her şey tek sayfaya sığsın: uzun formlar orantılı küçültülüp ortalanır.
    const scale = fullHeight > pageHeight ? pageHeight / fullHeight : 1;
    const w = pageWidth * scale;
    const h = fullHeight * scale;
    pdf.addImage(img, "JPEG", (pageWidth - w) / 2, 0, w, h);
    return pdf;
  } finally {
    host.remove();
  }
}

export function pdfFileName(d: ServiceFormData) {
  const safe = (d.customer.company_name || d.customer.name).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  return `${d.kind === "quote" ? "teklif" : d.withPrices ? "servis-formu-fiyatli" : "servis-formu"}-${safe}-${d.orderNo}.pdf`;
}

export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("90") ? digits : digits.replace(/^0/, "90");
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
