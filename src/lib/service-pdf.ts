import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { WORKSHOP, formatDate } from "./workshop";

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
  technicianName: string;
  faultDescription: string;
  serviceNote: string;
  serviceItems?: { title: string; qty: string; unit: string }[];
  signatureData: string | null;
  createdAt: string;
  completedAt: string | null;
};

function row(label: string, value: string) {
  return `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #eceff3">
      <div style="width:150px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(label)}</div>
      <div style="flex:1;color:#111827;font-size:13px">${escapeHtml(value || "-")}</div>
    </div>`;
}

function escapeHtml(s: string) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function buildHtml(d: ServiceFormData) {
  return `
  <div style="width:794px;padding:44px;background:#ffffff;font-family:Manrope,Arial,Helvetica,sans-serif;color:#111827;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #f0a13c;padding-bottom:16px">
      <div>
        <div style="font-size:26px;font-weight:800;letter-spacing:-.5px">${WORKSHOP.name}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">${WORKSHOP.tagline}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${WORKSHOP.address} · ${WORKSHOP.phone}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:15px;font-weight:700">TEKNİK SERVİS FORMU</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Form No: ${escapeHtml(d.orderNo)}</div>
        <div style="font-size:12px;color:#6b7280">Tarih: ${escapeHtml(formatDate(d.completedAt ?? d.createdAt))}</div>
      </div>
    </div>

    <div style="margin-top:22px;font-size:13px;font-weight:700;color:#f0a13c;text-transform:uppercase;letter-spacing:.06em">Müşteri Bilgileri</div>
    ${row("Firma Ünvanı", d.customer.company_name || d.customer.name)}
    ${row("Yetkili Kişi", d.customer.contact_person || d.customer.name)}
    ${row("Telefon", d.customer.phone)}
    ${row("E-posta", d.customer.email)}
    ${row("Adres", d.customer.address)}

    <div style="margin-top:22px;font-size:13px;font-weight:700;color:#f0a13c;text-transform:uppercase;letter-spacing:.06em">Forklift Bilgileri</div>
    ${row("Marka", d.customer.forklift_brand)}
    ${row("Model", d.customer.forklift_model)}
    ${row("Seri No", d.customer.serial_no)}

    <div style="margin-top:22px;font-size:13px;font-weight:700;color:#f0a13c;text-transform:uppercase;letter-spacing:.06em">Servis Detayı</div>
    ${row("Teknisyen", d.technicianName)}
    ${row("İş Emri Tarihi", formatDate(d.createdAt))}
    <div style="margin-top:12px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Arıza Tanımı</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.55;white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:8px;padding:12px;min-height:52px">${escapeHtml(d.faultDescription)}</div>
    ${itemsTable(d.serviceItems ?? [])}
    <div style="margin-top:14px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Teknisyen Görüşü / Servis Notu</div>
    <div style="margin-top:6px;font-size:13px;line-height:1.55;white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:8px;padding:12px;min-height:60px">${escapeHtml(d.serviceNote)}</div>

    <div style="margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end">
      <div style="font-size:11px;color:#6b7280;max-width:360px;line-height:1.5">
        Yukarıda belirtilen işlemlerin tarafımıza eksiksiz yapıldığını ve cihazın çalışır durumda teslim alındığını beyan ederim.
      </div>
      <div style="text-align:center">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Müşteri İmzası</div>
        <div style="width:240px;height:110px;border:1px solid #e5e7eb;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff">
          ${d.signatureData ? `<img src="${d.signatureData}" style="max-width:100%;max-height:100%" />` : ""}
        </div>
        <div style="font-size:12px;margin-top:6px">${escapeHtml(d.customer.name)}</div>
      </div>
    </div>

    <div style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:10px;color:#9ca3af;text-align:center">
      ${WORKSHOP.name} · ${WORKSHOP.address} · ${WORKSHOP.phone}
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
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(img, "JPEG", 0, 0, pageWidth, Math.min(imgHeight, 297));
    return pdf;
  } finally {
    host.remove();
  }
}

export function pdfFileName(d: ServiceFormData) {
  const safe = d.customer.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40);
  return `servis-formu-${safe}-${d.orderNo}.pdf`;
}

export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("90") ? digits : digits.replace(/^0/, "90");
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
