'use client'

import React, { useRef } from 'react';
import { X, Download, User, QrCode, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface PatientIDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    file_number: string;
    dob: string;
    gender: string;
  };
}

export default function PatientIDCardModal({ isOpen, onClose, patient }: PatientIDCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const downloadCard = async () => {
    if (!cardRef.current) return;
    
    const canvas = await html2canvas(cardRef.current, {
      scale: 3, // High quality
      backgroundColor: null,
      logging: false,
    });
    
    const link = document.createElement('a');
    link.download = `ID_Card_${patient.file_number}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Patient ID Card</h2>
            <p className="text-sm text-slate-500 font-medium">Digital identity for hospital access.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Card Container */}
        <div className="p-10 flex flex-col items-center justify-center bg-slate-100/30">
          
          {/* THE CARD */}
          <div 
            ref={cardRef}
            className="w-full max-w-[340px] aspect-[1.58/1] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col relative"
          >
            {/* Design Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-600/5 blur-2xl rounded-full -ml-12 -mb-12" />

            {/* Card Header */}
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <ShieldCheck size={18} className="text-white" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">HMSdemo Health</p>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Hospital Identity</p>
            </div>

            {/* Card Content */}
            <div className="flex-1 p-6 flex gap-6 items-center">
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                  <h3 className="text-sm font-black text-slate-900 capitalize leading-tight">
                    {patient.first_name}<br />{patient.last_name}
                  </h3>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">File Number</p>
                    <p className="text-xs font-black text-brand-600">{patient.file_number}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{patient.gender?.[0]}</p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                <QRCodeSVG 
                  value={patient.file_number} 
                  size={80}
                  level="H"
                  includeMargin={false}
                  className="text-slate-900"
                />
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic font-serif">Verified Patient</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-[8px] font-bold text-slate-600 uppercase">Active Record</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={downloadCard}
            className="flex-[2] bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <Download size={18} />
            Download ID Card
          </button>
        </div>
      </div>
    </div>
  );
}
