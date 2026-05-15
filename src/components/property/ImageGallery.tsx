'use client';

import { useState } from 'react';

export default function ImageGallery({ photos, title }: { photos: string[], title: string }) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-[40vh] md:h-[50vh] bg-slate-100 flex flex-col items-center justify-center text-slate-300 rounded-3xl mt-4">
        <span className="material-symbols-outlined text-6xl font-light mb-2">landscape</span>
        <span className="uppercase tracking-widest font-bold text-sm">Sin Fotos</span>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <>
      {/* Grid view (Airbnb Style) */}
      <div className="relative w-full h-[40vh] md:h-[50vh] mt-6 mb-8 rounded-3xl overflow-hidden flex gap-2">
        <div className="w-full md:w-1/2 h-full relative cursor-pointer group" onClick={() => openLightbox(0)}>
          <img src={photos[0]} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        
        {photos.length > 1 && (
          <div className="hidden md:flex w-1/2 h-full gap-2">
            <div className="flex flex-col gap-2 w-1/2 h-full">
              <div className="h-1/2 relative cursor-pointer group" onClick={() => openLightbox(1)}>
                <img src={photos[1]} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              {photos[2] && (
                <div className="h-1/2 relative cursor-pointer group" onClick={() => openLightbox(2)}>
                  <img src={photos[2]} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              )}
            </div>
            {photos[3] && (
              <div className="flex flex-col gap-2 w-1/2 h-full">
                <div className="h-1/2 relative cursor-pointer group" onClick={() => openLightbox(3)}>
                  <img src={photos[3]} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                {photos[4] && (
                  <div className="h-1/2 relative cursor-pointer group" onClick={() => openLightbox(4)}>
                    <img src={photos[4]} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* View All Photos Button */}
        <button 
          onClick={() => openLightbox(0)}
          className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md text-slate-900 px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-white transition flex items-center gap-2 border border-slate-200"
        >
          <span className="material-symbols-outlined text-[18px]">grid_view</span>
          Mostrar todas las fotos
        </button>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button onClick={closeLightbox} className="absolute top-6 right-6 text-white/50 hover:text-white transition bg-black/50 p-2 rounded-full backdrop-blur-md">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          
          <div className="absolute top-6 left-6 text-white/70 font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-md text-sm">
            {currentIndex + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <>
              <button onClick={prevPhoto} className="absolute left-6 text-white/50 hover:text-white transition bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md">
                <span className="material-symbols-outlined text-3xl">chevron_left</span>
              </button>
              <button onClick={nextPhoto} className="absolute right-6 text-white/50 hover:text-white transition bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md">
                <span className="material-symbols-outlined text-3xl">chevron_right</span>
              </button>
            </>
          )}

          <img 
            src={photos[currentIndex]} 
            alt={`${title} - foto ${currentIndex + 1}`} 
            className="max-h-[90vh] max-w-[90vw] object-contain select-none animate-in fade-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </>
  );
}
