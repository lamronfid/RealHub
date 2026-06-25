import { getUsdToPygRate } from '@/lib/exchange-rate';
import CalculadoraClient from '@/components/CalculadoraClient';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalculadoraPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rate = await getUsdToPygRate();

  const initialPrice = params.price ? Number(params.price) : undefined;
  const initialCurrency = typeof params.currency === 'string' ? params.currency : 'USD';
  const propertyType = typeof params.type === 'string' ? params.type : undefined;
  const propertyTitle = typeof params.title === 'string' ? params.title : undefined;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <CalculadoraClient
        exchangeRate={rate}
        initialPrice={initialPrice}
        initialCurrency={initialCurrency}
        propertyType={propertyType}
        propertyTitle={propertyTitle}
      />
    </div>
  );
}
