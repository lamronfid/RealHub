'use client';
import { useEffect, useState } from 'react';

const SOURCES = [
  'Infocasas.com.py',
  'Remax Paraguay',
  'Century21 Paraguay',
  'Asuncion.estate',
  'Brokers.com.py',
  'View.com.py',
  'Mersan.com.py',
  'Marketplace interno',
];

const TAIL_MESSAGES = [
  'Calculando comparables...',
  'Aplicando score de similitud...',
];

const ALL_MESSAGES = [...SOURCES.map((s) => `Buscando en ${s}...`), ...TAIL_MESSAGES];

export default function LoadingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % ALL_MESSAGES.length);
    }, 2800);
    const progressTimer = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 1 : p));
    }, 400);
    return () => {
      clearInterval(msgTimer);
      clearInterval(progressTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-8">
      <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-gray-900 font-semibold text-lg">{ALL_MESSAGES[msgIndex]}</p>
        <p className="text-gray-400 text-sm">Buscando en {SOURCES.length} sitios inmobiliarios simultáneamente</p>
      </div>
      <div className="w-72 space-y-1.5">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Progreso</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
