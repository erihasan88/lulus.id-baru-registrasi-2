import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, CheckCircle, ExternalLink } from 'lucide-react';

interface VerificationQRCodeProps {
  verificationCode: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VerificationQRCode({ verificationCode, size = 'md' }: VerificationQRCodeProps) {
  const [qrSrc, setQrSrc] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lulus.id';
  const url = `${origin}/verifikasi/${verificationCode}`;

  const dimensions = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  }[size];

  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: size === 'sm' ? 120 : size === 'md' ? 160 : 200,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff'
      }
    })
      .then(src => {
        setQrSrc(src);
      })
      .catch(err => {
        console.error('Failed to generate QR Code', err);
      });
  }, [url, size]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100/80 shadow-xs animate-fade-in">
      <div className="relative group">
        {/* QR Code Container */}
        <div className={`relative p-2.5 bg-white rounded-xl border border-slate-150 shadow-xs flex items-center justify-center ${dimensions}`}>
          {qrSrc ? (
            <img 
              src={qrSrc} 
              alt="QR Code Verifikasi" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg" />
          )}

          {/* Secure lock icon overlay in the center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-1 bg-white rounded-md border border-slate-100 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Pulse scanline animation overlay */}
        <div className="absolute inset-x-2 top-2 h-0.5 bg-emerald-500 opacity-60 animate-bounce pointer-events-none rounded" />
      </div>

      <div className="mt-2 text-center space-y-1">
        <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          <CheckCircle className="w-2.5 h-2.5" /> Terverifikasi DRF API
        </span>
        
        <p className="text-[8px] font-bold text-slate-400 select-all font-mono tracking-wider uppercase">
          {verificationCode}
        </p>
        
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-pink-600 hover:text-pink-700 hover:underline transition-all mt-0.5 max-w-[150px] truncate font-mono"
        >
          {url.replace(/^https?:\/\//, '')}
          <ExternalLink className="w-2 h-2" />
        </a>
      </div>
    </div>
  );
}
