'use client';
import { useEffect, useState } from 'react';

const MESSAGES = [
  'Calculando valor del terreno zonal...',
  'Aplicando costo de construcción...',
  'Ponderando comparables seleccionados...',
  'Determinando posicionamiento de precio...',
  'Generando informe...',
];

export default function CalculatingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-8">
      <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-gray-900 font-semibold text-lg">{MESSAGES[msgIndex]}</p>
        <p className="text-gray-400 text-sm">Calculando valoración con los datos ingresados</p>
      </div>
    </div>
  );
}
