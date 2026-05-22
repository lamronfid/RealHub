import React from 'react';
import { AMENITY_DATA } from '@/lib/types';

interface AmenitiesListProps {
  amenities: string[];
}

export default function AmenitiesList({ amenities }: AmenitiesListProps) {
  if (!amenities || amenities.length === 0) return null;

  // Filter and map amenities to their definitions
  const validAmenities = amenities
    .map((amenityStr) => AMENITY_DATA.find((a) => a.id === amenityStr || a.label === amenityStr))
    .filter((a): a is NonNullable<typeof a> => a !== undefined);

  if (validAmenities.length === 0) return null;

  return (
    <div className="mt-8 mb-6">
      <h2 className="font-heading text-lg font-bold text-slate-900 mb-3">Amenities</h2>
      <div className="flex flex-wrap gap-2">
        {validAmenities.map((amenity) => (
          <div 
            key={amenity.id}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded-md text-xs font-medium"
          >
            <span className="text-sm">{amenity.emoji}</span>
            <span>{amenity.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
