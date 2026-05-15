'use client';

export default function PropertyMap({ neighborhood, city, address }: { neighborhood?: string, city?: string, address?: string }) {
  // Build query
  const queryParts = [];
  if (address && address.trim() !== '') queryParts.push(address);
  if (neighborhood && neighborhood.trim() !== '') queryParts.push(neighborhood);
  if (city && city.trim() !== '') queryParts.push(city);
  
  // Default to Paraguay if nothing provided
  if (queryParts.length === 0) queryParts.push('Asuncion, Paraguay');
  
  const query = encodeURIComponent(queryParts.join(', '));
  const iframeSrc = `https://maps.google.com/maps?q=${query}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full h-64 md:h-80 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
      <iframe 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        scrolling="no" 
        marginHeight={0} 
        marginWidth={0} 
        src={iframeSrc}
        title="Ubicación de la propiedad"
        className="grayscale-[0.2] contrast-[1.1]"
      ></iframe>
    </div>
  );
}
