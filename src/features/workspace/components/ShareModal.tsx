import React, { useState, useRef } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { X, Copy, Check, Share2, Link as LinkIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { File as FileType } from '../context/FileContext';
import { toPng } from 'html-to-image';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileType | null;
}

export function ShareModal({ isOpen, onClose, file }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const shareUrl = file ? `${window.location.origin}/file/${file.id}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current || !file) return;
    try {
      setIsDownloading(true);
      // Use html-to-image which natively supports rendering SVG children properly even off-screen
      const dataUrl = await toPng(qrRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `LasunFry-Share-${file.name.replace(/\.(txt|md)$/i, '')}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to generate QR image', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && file && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/90"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 sm:right-6 sm:top-6 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-google-blue/10 text-google-blue">
                <Share2 size={32} />
              </div>
              
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Share Note</h2>
              <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                Scan this QR code to access <span className="font-bold text-slate-700 dark:text-slate-300">"{file.name.replace(/\.(txt|md)$/i, '')}"</span> on another device.
              </p>

              <div className="mt-8 relative flex items-center justify-center rounded-3xl bg-white p-2 shadow-md ring-1 ring-slate-200/50 dark:bg-white dark:ring-0">
                <QRCode
                  value={shareUrl}
                  size={180}
                  ecLevel="H"
                  qrStyle="dots"
                  eyeRadius={10}
                  quietZone={5}
                  logoImage="/logo.png"
                  logoWidth={50}
                  logoHeight={50}
                  logoPadding={0}
                  logoPaddingStyle="circle"
                  removeQrCodeBehindLogo={true}
                  bgColor="transparent"
                  fgColor="#000000"
                />
              </div>

              <div className="mt-6 w-full flex items-center justify-center">
                <button
                  onClick={handleDownloadQR}
                  disabled={isDownloading}
                  className="flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  <Download size={16} />
                  {isDownloading ? 'Generating...' : 'Download QR Card'}
                </button>
              </div>

              <div className="mt-8 w-full space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Or share via link</p>
                <div className="flex items-center w-full gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    <LinkIcon size={18} />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full min-w-0 flex-1 truncate bg-transparent px-2 text-sm font-medium text-slate-700 outline-none dark:text-slate-300 select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white transition-all ${
                      copied ? 'bg-green-500 hover:bg-green-600' : 'bg-google-blue hover:bg-blue-600'
                    }`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hidden Downloadable Branded Template */}
          <div className="absolute -left-[9999px] top-[0] pointer-events-none">
            <div 
              ref={qrRef} 
              className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-10 rounded-[40px] border border-slate-200/60 dark:border-none"
              style={{ width: '400px', height: '520px' }}
            >
              <div className="flex items-center justify-center mb-10">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-widest uppercase">LasunFry</h1>
              </div>
              
              <div className="relative flex items-center justify-center rounded-3xl bg-white p-3 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black ring-1 ring-slate-200 dark:ring-0">
                <QRCode
                  value={shareUrl}
                  size={240}
                  ecLevel="H"
                  qrStyle="dots"
                  eyeRadius={12}
                  quietZone={5}
                  logoImage="/logo.png"
                  logoWidth={64}
                  logoHeight={64}
                  logoPadding={0}
                  logoPaddingStyle="circle"
                  removeQrCodeBehindLogo={true}
                  bgColor="transparent"
                  fgColor="#000000"
                />
              </div>

              <div className="mt-10 flex flex-col items-center text-center">
                <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest text-xs uppercase mb-1">Scan to Read</p>
                <p className="text-slate-900 dark:text-white font-black text-xl truncate max-w-[320px]">
                  {file.name.replace(/\.(txt|md)$/i, '')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
