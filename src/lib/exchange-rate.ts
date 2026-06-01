interface RateResult {
  rate: number;
  is_cached: boolean;
  cached_at: string | null;
}

export async function runRateScript(): Promise<RateResult> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 } // Cache rate for 1 hour
    });
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const data = await res.json();
    const rate = data.rates.PYG;
    if (!rate) throw new Error('PYG rate not found in API response');
    
    return {
      rate: rate,
      is_cached: false,
      cached_at: new Date().toISOString().split('T')[0]
    };
  } catch (err) {
    console.warn('[Exchange rate API fetch failed, using fallback]', err);
    return {
      rate: 7400, // Fallback rate
      is_cached: true,
      cached_at: null
    };
  }
}

const FALLBACK_RATE = 7_400;

export async function getUsdToPygRate(): Promise<number> {
  try {
    const data = await runRateScript();
    return data.rate;
  } catch {
    return FALLBACK_RATE;
  }
}
