import React, { useEffect, useState, useRef } from 'react';
import { getMediaUrl } from '../../services/api';

interface DocumentPagesPreviewProps {
    html: string;
    bgUrl?: string | null;
    className?: string;
}

// Letter page dimensions in standard CSS px (8.5 x 11 inches at 96 DPI)
const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;

// Available content height inside letterhead (1056 - 160 top - 110 bottom)
const USABLE_HEIGHT_PX = 780;

export const splitHtmlIntoPages = (fullHtml: string): string[] => {
    if (!fullHtml) return [''];

    // If template has explicit page breaks
    if (fullHtml.includes('class="page-break"') || fullHtml.includes('page-break-after')) {
        const parts = fullHtml.split(/<div[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>.*?<\/div>/gi);
        if (parts.length > 1) return parts.filter(p => p.trim().length > 0);
    }

    // Temporary container to parse DOM elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${fullHtml}</div>`, 'text/html');
    const container = doc.body.firstElementChild;
    if (!container) return [fullHtml];

    const childNodes = Array.from(container.children);
    if (childNodes.length === 0) return [fullHtml];

    const pages: string[] = [];
    let currentPageHtml = '';
    let currentEstimatedHeight = 0;

    for (const child of childNodes) {
        const textLen = (child.textContent || '').length;
        const tagName = child.tagName.toLowerCase();

        // Estimate height based on tag type and text length (average ~80 chars per line of 22px height)
        let elementHeight = 35; // base margin/padding
        if (tagName === 'h1' || tagName === 'h2') {
            elementHeight = 65;
        } else if (tagName === 'h3' || tagName === 'h4') {
            elementHeight = 45;
        } else if (tagName === 'p') {
            const lines = Math.max(1, Math.ceil(textLen / 75));
            elementHeight = lines * 22 + 18;
        } else if (tagName === 'table') {
            const rows = child.querySelectorAll('tr').length || 3;
            elementHeight = rows * 35 + 20;
        } else if (tagName === 'div') {
            const lines = Math.max(1, Math.ceil(textLen / 75));
            elementHeight = lines * 22 + 25;
        } else if (tagName === 'br') {
            elementHeight = 20;
        }

        // Check if element has page break class
        const isPageBreak = child.classList.contains('page-break') || (child.getAttribute('style') || '').includes('page-break');

        if (isPageBreak || (currentEstimatedHeight + elementHeight > USABLE_HEIGHT_PX && currentPageHtml.trim().length > 0)) {
            pages.push(currentPageHtml);
            currentPageHtml = isPageBreak ? '' : child.outerHTML;
            currentEstimatedHeight = isPageBreak ? 0 : elementHeight;
        } else {
            currentPageHtml += child.outerHTML;
            currentEstimatedHeight += elementHeight;
        }
    }

    if (currentPageHtml.trim().length > 0) {
        pages.push(currentPageHtml);
    }

    return pages.length > 0 ? pages : [fullHtml];
};

export const printPaginatedDocument = (
    title: string,
    html: string,
    bgImg?: string | null
) => {
    // Remove any existing print iframe
    const existingIframe = document.getElementById('gloint-silent-print-frame');
    if (existingIframe) {
        existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'gloint-silent-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    let resolvedBg = bgImg ? getMediaUrl(bgImg) : '';
    if (resolvedBg && !resolvedBg.startsWith('http://') && !resolvedBg.startsWith('https://') && !resolvedBg.startsWith('data:')) {
        resolvedBg = `${window.location.origin}${resolvedBg.startsWith('/') ? resolvedBg : `/${resolvedBg}`}`;
    }

    const pages = splitHtmlIntoPages(html);

    const pagesHtml = pages.map((pageContent, idx) => `
        <div class="print-page">
            ${resolvedBg ? `<img src="${resolvedBg}" class="bg-letterhead" alt="Membrete" />` : ''}
            <div class="page-content">
                ${pageContent}
            </div>
            <div class="page-number">Página ${idx + 1} de ${pages.length}</div>
        </div>
    `).join('');

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <base href="${window.location.origin}/">
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
                @page {
                    size: letter;
                    margin: 0mm;
                }
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    background-color: #ffffff;
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                    color: #1e293b;
                }
                .print-page {
                    width: 215.9mm;
                    height: 279.4mm;
                    max-height: 279.4mm;
                    position: relative;
                    page-break-after: always;
                    break-after: page;
                    box-sizing: border-box;
                    overflow: hidden;
                    background-color: #ffffff;
                }
                .bg-letterhead {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                    object-fit: fill;
                }
                .page-content {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    height: 100%;
                    padding: ${resolvedBg ? '160px 75px 105px 105px' : '45px 50px'};
                    font-size: 11.5px;
                    line-height: 1.6;
                    color: #0f172a;
                    box-sizing: border-box;
                }
                .page-content p {
                    margin-bottom: 12px;
                }
                .page-number {
                    position: absolute;
                    bottom: 8mm;
                    right: 15mm;
                    font-size: 9px;
                    color: #64748b;
                    z-index: 2;
                    font-family: monospace;
                }
            </style>
        </head>
        <body>
            ${pagesHtml}
        </body>
        </html>
    `);
    iframeDoc.close();

    let hasPrinted = false;
    const triggerPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                iframe.remove();
            }, 2000);
        }, 300);
    };

    if (iframe.contentWindow) {
        iframe.contentWindow.onload = triggerPrint;
        setTimeout(triggerPrint, 600);
    }
};

export const DocumentPagesPreview: React.FC<DocumentPagesPreviewProps> = ({
    html,
    bgUrl,
    className = ''
}) => {
    const [pages, setPages] = useState<string[]>([]);
    const resolvedBg = bgUrl ? getMediaUrl(bgUrl) : '';

    useEffect(() => {
        const splitPages = splitHtmlIntoPages(html);
        setPages(splitPages);
    }, [html]);

    return (
        <div className={`flex flex-col items-center gap-8 py-4 ${className}`}>
            {pages.map((pageHtml, index) => (
                <div key={index} className="flex flex-col items-center">
                    <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider font-mono">
                        Página {index + 1} de {pages.length} (Carta / Letter)
                    </div>
                    <div 
                        className="bg-white shadow-2xl rounded-sm relative text-slate-800 transition-all border border-slate-200/60"
                        style={{
                            width: `${PAGE_WIDTH_PX}px`,
                            height: `${PAGE_HEIGHT_PX}px`,
                            minHeight: `${PAGE_HEIGHT_PX}px`,
                            maxHeight: `${PAGE_HEIGHT_PX}px`,
                            backgroundImage: resolvedBg ? `url('${resolvedBg}')` : undefined,
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'top center',
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: '#ffffff',
                            padding: resolvedBg ? '160px 75px 105px 105px' : '50px 60px',
                            boxSizing: 'border-box',
                            overflow: 'hidden'
                        }}
                    >
                        <div 
                            className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-800"
                            dangerouslySetInnerHTML={{ __html: pageHtml }}
                        />
                        <div className="absolute bottom-4 right-8 text-[10px] text-slate-400 font-mono">
                            Pág. {index + 1}/{pages.length}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
