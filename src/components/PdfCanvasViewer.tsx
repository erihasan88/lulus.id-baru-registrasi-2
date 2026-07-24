import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2, FileText, ExternalLink, Download, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

// Configure pdfjs worker locally via Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

interface PdfCanvasViewerProps {
  key?: string;
  url: string;
  zoomScale?: number;
  title?: string;
  onDownload?: () => void;
}

export default function PdfCanvasViewer({
  url,
  zoomScale = 1,
  title = 'Dokumen PDF',
  onDownload
}: PdfCanvasViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadingTask = pdfjsLib.getDocument({
      url: fullUrl,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('PDF.js loading task error:', err);
        if (!isMounted) return;
        setError('Gagal membaca struktur PDF. Anda dapat mengunduh atau membukanya di tab baru.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fullUrl]);

  // Render Page onto Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;
    let isCancelled = false;

    pdfDoc.getPage(currentPage).then((page) => {
      if (isCancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: 1.5 * zoomScale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTask = page.render(renderContext);
      renderTask.promise.catch((err: any) => {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      });
    });

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomScale]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white relative overflow-hidden">
      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Memuat berkas PDF...</p>
        </div>
      )}

      {/* Error / Fallback State */}
      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Pratinjau PDF Terbatas</h4>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Tab Baru
            </a>
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh PDF
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Canvas View */}
      {!loading && !error && pdfDoc && (
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-start space-y-4">
          <div className="shadow-2xl rounded bg-white overflow-hidden my-auto max-w-full">
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>

          {/* Page Selector Bar */}
          {numPages > 1 && (
            <div className="sticky bottom-3 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-lg z-10 text-xs font-bold">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded-full transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-slate-300">
                Halaman {currentPage} dari {numPages}
              </span>
              <button
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded-full transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
