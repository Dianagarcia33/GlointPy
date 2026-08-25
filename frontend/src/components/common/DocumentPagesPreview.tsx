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

// Available content height inside letterhead (1056 - 145 top - 70 bottom)
const USABLE_HEIGHT_PX = 840;

/**
 * Automatically formats and cleans raw HTML entered in Quill editor so the user
 * doesn't need to write any CSS or manual inline styles.
 */
export const normalizeDocumentHtml = (rawHtml: string): string => {
    if (!rawHtml) return '';

    // 1. Clean up empty <p><br></p> or whitespace-only paragraphs
    let cleaned = rawHtml
        .replace(/<p>\s*(?:<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, '')
        .trim();

    // 2. Parse into DOM to apply semantic legal document formatting
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${cleaned}</div>`, 'text/html');
    const container = doc.body.firstElementChild;
    if (!container) return cleaned;

    const children = Array.from(container.children);
    if (children.length === 0) return cleaned;

    // Detect Title (first bold paragraph containing CERTIFICADO, CONTRATO, PAGARE, etc.)
    let titleDetected = false;
    for (let i = 0; i < Math.min(3, children.length); i++) {
        const el = children[i];
        const text = (el.textContent || '').trim().toUpperCase();
        if (!titleDetected && (
            text.startsWith('CERTIFICADO') ||
            text.startsWith('CONTRATO') ||
            text.startsWith('PAGARÉ') ||
            text.startsWith('PAGARE') ||
            text.startsWith('ACTA DE') ||
            text.startsWith('DOCUMENTO DE')
        )) {
            el.classList.add('doc-title');
            titleDetected = true;
        }
    }

    // Detect section headers like "HACE CONSTAR:", "DECLARACIONES:", etc.
    for (const el of children) {
        const text = (el.textContent || '').trim().toUpperCase();
        if (text === 'HACE CONSTAR:' || text === 'DECLARA:' || text === 'DECLARACIONES:' || text === 'CONSIDERACIONES:') {
            el.classList.add('doc-section-header');
        }
    }

    // Detect signature lines (like ___________________________)
    for (const el of children) {
        const text = (el.textContent || '').trim();
        if (/^_{4,}$/.test(text)) {
            el.classList.add('doc-sig-line');
        }
    }

    // Detect signature image container to apply dedicated top spacing
    for (const el of children) {
        if (el.querySelector('img') || el.tagName.toLowerCase() === 'img') {
            el.classList.add('doc-signature-img');
        }
    }

    return container.innerHTML;
};

export const splitHtmlIntoPages = (fullHtml: string): string[] => {
    if (!fullHtml) return [''];

    const normalizedHtml = normalizeDocumentHtml(fullHtml);

    // If template has explicit page breaks
    if (normalizedHtml.includes('class="page-break"') || normalizedHtml.includes('page-break-after')) {
        const parts = normalizedHtml.split(/<div[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>.*?<\/div>/gi);
        if (parts.length > 1) return parts.filter(p => p.trim().length > 0);
    }

    // Temporary container to parse DOM elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${normalizedHtml}</div>`, 'text/html');
    const container = doc.body.firstElementChild;
    if (!container) return [normalizedHtml];

    const childNodes = Array.from(container.children);
    if (childNodes.length === 0) return [normalizedHtml];

    const pages: string[] = [];
    let currentPageHtml = '';
    let currentEstimatedHeight = 0;

    for (const child of childNodes) {
        const textLen = (child.textContent || '').length;
        const tagName = child.tagName.toLowerCase();
        const hasImg = child.querySelector('img') !== null || tagName === 'img' || child.classList.contains('doc-signature-img');
        const isTitle = child.classList.contains('doc-title') || tagName === 'h1' || tagName === 'h2';
        const isHeader = child.classList.contains('doc-section-header') || tagName === 'h3' || tagName === 'h4';

        // Realistic height based on font-size 10px and line-height ~14.5px
        let elementHeight = 6;
        if (isTitle) {
            elementHeight = 32;
        } else if (isHeader) {
            elementHeight = 22;
        } else if (tagName === 'p') {
            const lines = Math.max(1, Math.ceil(textLen / 95));
            elementHeight = lines * 15 + 6 + (hasImg ? 75 : 0);
        } else if (tagName === 'table') {
            const rows = child.querySelectorAll('tr').length || 3;
            elementHeight = rows * 22 + 10;
        } else if (tagName === 'div') {
            const lines = Math.max(1, Math.ceil(textLen / 95));
            elementHeight = lines * 15 + 8 + (hasImg ? 75 : 0);
        } else if (tagName === 'br') {
            elementHeight = 4;
        } else if (hasImg) {
            elementHeight = 75;
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

    return pages.length > 0 ? pages : [normalizedHtml];
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

    // Default to official letterhead if null/undefined or empty string
    const effectiveBgPath = (bgImg && bgImg.trim() !== '') ? bgImg : '/uploads/templates/gloint_membrete_oficial.png';
    let resolvedBg = effectiveBgPath ? getMediaUrl(effectiveBgPath) : '';
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
                    font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
                    color: #0f172a;
                    -webkit-font-smoothing: antialiased;
                }
                .print-page {
                    width: 215.9mm;
                    height: 279.4mm;
                    max-height: 279.4mm;
                    position: relative;
                    box-sizing: border-box;
                    overflow: hidden;
                    background-color: #ffffff;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                .print-page:not(:last-child) {
                    page-break-after: always;
                    break-after: page;
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
                    padding: ${resolvedBg ? '145px 55px 70px 75px' : '40px 50px'};
                    font-size: 10px;
                    line-height: 1.42;
                    color: #0f172a;
                    box-sizing: border-box;
                    text-align: justify;
                    text-justify: inter-word;
                }
                .page-content p {
                    margin-top: 0;
                    margin-bottom: 6px;
                    text-align: justify;
                    text-justify: inter-word;
                }
                .page-content p:last-child {
                    margin-bottom: 0;
                }
                .page-content .doc-title, .page-content h1, .page-content h2 {
                    margin-top: 0;
                    margin-bottom: 12px;
                    text-align: center !important;
                    font-size: 12.5px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    color: #0f172a;
                    text-transform: uppercase;
                }
                .page-content .doc-section-header, .page-content h3, .page-content h4 {
                    margin-top: 8px;
                    margin-bottom: 6px;
                    text-align: center !important;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: 0.5px;
                }
                .page-content .doc-sig-line {
                    letter-spacing: -1px;
                    color: #334155;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .page-content strong {
                    font-weight: 700;
                    color: #020617;
                }
                .page-content .doc-signature-img,
                .page-content p:has(img),
                .page-content img {
                    max-height: 50px;
                    object-fit: contain;
                    display: block;
                    margin-top: 18px !important;
                    margin-bottom: 2px !important;
                }
                .ql-align-center { text-align: center !important; }
                .ql-align-justify { text-align: justify !important; text-justify: inter-word !important; }
                .ql-align-right { text-align: right !important; }
                .ql-align-left { text-align: left !important; }
                .page-number {
                    position: absolute;
                    bottom: 6mm;
                    right: 15mm;
                    font-size: 8.5px;
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
    const effectiveBgPath = (bgUrl && bgUrl.trim() !== '') ? bgUrl : '/uploads/templates/gloint_membrete_oficial.png';
    const resolvedBg = effectiveBgPath ? getMediaUrl(effectiveBgPath) : '';

    useEffect(() => {
        const splitPages = splitHtmlIntoPages(html);
        setPages(splitPages);
    }, [html]);

    return (
        <div className={`flex flex-col items-center gap-8 py-4 ${className}`}>
            <style>{`
                .doc-preview-content {
                    font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
                    font-size: 10px;
                    line-height: 1.42;
                    color: #0f172a;
                    text-align: justify;
                    text-justify: inter-word;
                }
                .doc-preview-content p {
                    margin-top: 0;
                    margin-bottom: 6px;
                    text-align: justify;
                    text-justify: inter-word;
                }
                .doc-preview-content p:last-child {
                    margin-bottom: 0;
                }
                .doc-preview-content .doc-title, .doc-preview-content h1, .doc-preview-content h2 {
                    margin-top: 0;
                    margin-bottom: 12px;
                    text-align: center !important;
                    font-size: 12.5px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    color: #0f172a;
                    text-transform: uppercase;
                }
                .doc-preview-content .doc-section-header, .doc-preview-content h3, .doc-preview-content h4 {
                    margin-top: 8px;
                    margin-bottom: 6px;
                    text-align: center !important;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: 0.5px;
                }
                .doc-preview-content .doc-sig-line {
                    letter-spacing: -1px;
                    color: #334155;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .doc-preview-content strong {
                    font-weight: 700;
                    color: #020617;
                }
                .doc-preview-content .doc-signature-img,
                .doc-preview-content p:has(img),
                .doc-preview-content img {
                    max-height: 50px;
                    object-fit: contain;
                    display: block;
                    margin-top: 18px !important;
                    margin-bottom: 2px !important;
                }
                .doc-preview-content .ql-align-center { text-align: center !important; }
                .doc-preview-content .ql-align-justify { text-align: justify !important; text-justify: inter-word !important; }
                .doc-preview-content .ql-align-right { text-align: right !important; }
                .doc-preview-content .ql-align-left { text-align: left !important; }
            `}</style>
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
                            padding: resolvedBg ? '145px 55px 70px 75px' : '40px 50px',
                            boxSizing: 'border-box',
                            overflow: 'hidden'
                        }}
                    >
                        <div 
                            className="doc-preview-content"
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
