"use client";

import { useEffect, useState } from "react";
import { X, Printer, Copy, CheckCircle2 } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";

interface QrModalProps {
  schoolName: string;
  onClose: () => void;
}

export default function QrModal({ schoolName, onClose }: QrModalProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate URL dynamically based on current origin
    const currentOrigin = window.location.origin;
    // We assume the URL structure is http://[subdomain].domain.com/admission or similar
    // For localhost testing, we use the actual current path replacing /admin/admissions with /admission
    const currentPath = window.location.pathname;
    const admissionPath = currentPath.replace("/admin/admissions", "/admission");
    
    setUrl(`${currentOrigin}${admissionPath}`);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    // Create a temporary iframe to print just the QR code
    const printWindow = window.open('', '', 'width=600,height=800');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Admission QR - ${schoolName}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            h1 { color: #1e293b; font-size: 24px; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; margin-bottom: 32px; }
            .qr-container { padding: 24px; border: 2px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px; }
            .footer { margin-top: auto; padding-bottom: 32px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div style="margin-top: auto;">
            <h1>${schoolName}</h1>
            <p>Scan to apply for admission</p>
            
            <div class="qr-container" id="qr-target">
              <!-- QR will be injected here -->
            </div>
            
            <p style="font-size: 16px; font-weight: bold; color: #4f46e5;">Powered by ERP Vyapar</p>
          </div>
          <div class="footer">Scan using any mobile camera</div>
        </body>
      </html>
    `);
    
    // Get the SVG from the current DOM and inject it
    setTimeout(() => {
      const svgElement = document.querySelector('.qr-wrapper svg');
      if (svgElement && printWindow.document.getElementById('qr-target')) {
        printWindow.document.getElementById('qr-target')!.innerHTML = svgElement.outerHTML;
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admission QR Code</h2>
            <p className="text-xs text-slate-500 mt-0.5">Print or display at reception</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Display */}
        <div className="p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 qr-wrapper">
            {url ? (
              <QRCode
                value={url}
                size={200}
                level="H"
                className="w-full h-full max-w-[200px]"
              />
            ) : (
              <div className="w-[200px] h-[200px] bg-slate-100 animate-pulse rounded-lg" />
            )}
          </div>
          
          <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white text-center">
            {schoolName}
          </h3>
          <p className="text-sm text-slate-500 text-center mt-1">
            Scan to fill admission form
          </p>
        </div>

        {/* Link Copy */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap flex items-center border border-slate-200 dark:border-slate-700">
            {url}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Printer className="w-4 h-4" />
            Print QR
          </Button>
        </div>
      </div>
    </div>
  );
}
