'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CalculadoraClientProps {
  exchangeRate: number;
  initialPrice?: number;
  initialCurrency?: string;
  propertyType?: string;
  propertyTitle?: string;
}

type LoanType = 'primera_vivienda' | 'mi_casa' | 'tradicional';

interface AmortizationRow {
  month: number;
  principalPaid: number;
  interestPaid: number;
  ivaPaid: number;
  lifeInsurancePaid: number;
  fireInsurancePaid: number;
  cuotaTotal: number;
  remainingBalance: number;
}

export default function CalculadoraClient({
  exchangeRate,
  initialPrice,
  initialCurrency = 'USD',
  propertyType,
  propertyTitle,
}: CalculadoraClientProps) {
  const [activeTab, setActiveTab] = useState<'prestamo' | 'roi' | 'preaprobacion'>('prestamo');

  // Exchange rate converter state
  const [useExchangeRate, setUseExchangeRate] = useState(exchangeRate || 7450);

  // ----------------------------------------------------
  // PREAPROBACION/CALIFICACION STATE
  // ----------------------------------------------------
  const [preCurrency, setPreCurrency] = useState<'USD' | 'PYG'>('PYG');
  const [preIncome, setPreIncome] = useState<number>(12000000);
  const [preDebts, setPreDebts] = useState<number>(1500000);
  const [prePropertyValue, setPrePropertyValue] = useState<number>(
    initialPrice 
      ? (initialCurrency === 'PYG' ? initialPrice : initialPrice * (exchangeRate || 7450))
      : 600000000
  );
  const [preDownPaymentPercent, setPreDownPaymentPercent] = useState<number>(20);
  const [preTermYears, setPreTermYears] = useState<number>(20);
  const [preInterestRate, setPreInterestRate] = useState<number>(8.9);
  const [isPreCustomRate, setIsPreCustomRate] = useState<boolean>(false);

  // Sync pre-qualification values when currency changes
  useEffect(() => {
    if (preCurrency === 'USD') {
      setPreIncome(prev => prev > 200000 ? Math.round(prev / useExchangeRate) : prev);
      setPreDebts(prev => prev > 20000 ? Math.round(prev / useExchangeRate) : prev);
      setPrePropertyValue(prev => prev > 5000000 ? Math.round(prev / useExchangeRate) : prev);
    } else {
      setPreIncome(prev => prev < 200000 ? Math.round(prev * useExchangeRate) : prev);
      setPreDebts(prev => prev < 20000 ? Math.round(prev * useExchangeRate) : prev);
      setPrePropertyValue(prev => prev < 5000000 ? Math.round(prev * useExchangeRate) : prev);
    }
  }, [preCurrency]);

  // Auto-calculate recommended interest rate for pre-qualification when inputs change
  useEffect(() => {
    if (!isPreCustomRate) {
      const PYG_SALARIO_MINIMO = 2798309;
      const propertyValuePyg = preCurrency === 'PYG' ? prePropertyValue : prePropertyValue * useExchangeRate;
      const downPaymentPyg = propertyValuePyg * (preDownPaymentPercent / 100);
      const loanAmountPyg = Math.max(0, propertyValuePyg - downPaymentPyg);
      const incomePyg = preCurrency === 'PYG' ? preIncome : preIncome * useExchangeRate;

      if (loanAmountPyg <= 452800000 && incomePyg <= (PYG_SALARIO_MINIMO * 4)) {
        setPreInterestRate(6.9);
      } else if (loanAmountPyg <= 1000000000 && incomePyg <= (PYG_SALARIO_MINIMO * 7)) {
        setPreInterestRate(8.9);
      } else if (loanAmountPyg <= 1500000000) {
        setPreInterestRate(8.9);
      } else {
        if (preCurrency === 'USD') {
          setPreInterestRate(7.5);
        } else {
          setPreInterestRate(10.5);
        }
      }
    }
  }, [prePropertyValue, preDownPaymentPercent, preIncome, preCurrency, isPreCustomRate, useExchangeRate]);

  // ----------------------------------------------------
  // MORTGAGE LOAN CALCULATOR STATE
  // ----------------------------------------------------
  const [loanCurrency, setLoanCurrency] = useState<'USD' | 'PYG'>(
    initialCurrency === 'PYG' ? 'PYG' : 'USD'
  );
  
  // Set initial property value, converting if needed
  const getInitialPropertyValue = () => {
    if (!initialPrice) return loanCurrency === 'USD' ? 120000 : 900000000;
    if (initialCurrency === loanCurrency) return initialPrice;
    if (initialCurrency === 'USD' && loanCurrency === 'PYG') {
      return initialPrice * useExchangeRate;
    }
    if (initialCurrency === 'PYG' && loanCurrency === 'USD') {
      return Math.round(initialPrice / useExchangeRate);
    }
    return initialPrice;
  };

  const [propertyValue, setPropertyValue] = useState<number>(getInitialPropertyValue());
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);
  const [loanTermYears, setLoanTermYears] = useState<number>(20);
  const [loanType, setLoanType] = useState<LoanType>('tradicional');
  const [customInterestRate, setCustomInterestRate] = useState<number>(7.5);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [constructionPercent, setConstructionPercent] = useState<number>(60);
  const [showFullAmortization, setShowFullAmortization] = useState<boolean>(false);

  // Sync property value when currency or initialPrice changes
  useEffect(() => {
    setPropertyValue(getInitialPropertyValue());
  }, [loanCurrency]);

  // Adjust defaults when loan type or currency changes
  useEffect(() => {
    if (!isCustomRate) {
      if (loanType === 'primera_vivienda') {
        // Primera Vivienda is only PYG AFD, rates depend on amount
        setLoanCurrency('PYG');
        const amount = propertyValue * (1 - downPaymentPercent / 100);
        // Bracket A: up to 450M Gs (6.9%), Bracket B: up to 1000M Gs (8.9%)
        if (amount <= 450000000) {
          setCustomInterestRate(6.9);
        } else {
          setCustomInterestRate(8.9);
        }
      } else if (loanType === 'mi_casa') {
        setLoanCurrency('PYG');
        setCustomInterestRate(8.9); // AFD Mi Casa standard
      } else {
        // Traditional bank
        if (loanCurrency === 'USD') {
          setCustomInterestRate(7.5);
        } else {
          setCustomInterestRate(10.5);
        }
      }
    }
  }, [loanType, loanCurrency, propertyValue, downPaymentPercent, isCustomRate]);

  // ----------------------------------------------------
  // ROI CALCULATOR STATE
  // ----------------------------------------------------
  const [roiCurrency, setRoiCurrency] = useState<'USD' | 'PYG'>(
    initialCurrency === 'PYG' ? 'PYG' : 'USD'
  );
  
  const getInitialRoiPrice = () => {
    if (!initialPrice) return roiCurrency === 'USD' ? 120000 : 900000000;
    if (initialCurrency === roiCurrency) return initialPrice;
    if (initialCurrency === 'USD' && roiCurrency === 'PYG') {
      return initialPrice * useExchangeRate;
    }
    if (initialCurrency === 'PYG' && roiCurrency === 'USD') {
      return Math.round(initialPrice / useExchangeRate);
    }
    return initialPrice;
  };

  const [roiPurchasePrice, setRoiPurchasePrice] = useState<number>(getInitialRoiPrice());
  const [roiMonthlyRent, setRoiMonthlyRent] = useState<number>(
    initialCurrency === 'USD'
      ? roiCurrency === 'USD' ? 650 : Math.round(650 * useExchangeRate)
      : roiCurrency === 'PYG' ? 4500000 : Math.round(4500000 / useExchangeRate)
  );
  const [roiFurnishedCost, setRoiFurnishedCost] = useState<number>(0);
  const [roiBuyerCommission, setRoiBuyerCommission] = useState<number>(0); // Customarily 0% for buyer in PY (paid by seller), but customizable
  const [roiMaintenancePercent, setRoiMaintenancePercent] = useState<number>(5); // 5% of rental income
  const [roiVacancyMonths, setRoiVacancyMonths] = useState<number>(1); // Standard 1 month/year = 8.33% vacancy
  const [roiPlusvaliaPercent, setRoiPlusvaliaPercent] = useState<number>(5.0); // 5% yearly appreciation

  // Sync ROI purchase price
  useEffect(() => {
    setRoiPurchasePrice(getInitialRoiPrice());
    // Auto-calculate rent estimate (~0.5% of value)
    const estRentVal = getInitialRoiPrice() * 0.0055;
    setRoiMonthlyRent(roiCurrency === 'USD' ? Math.round(estRentVal) : Math.round(estRentVal / 1000) * 1000);
  }, [roiCurrency]);

  // Helper formatter
  const formatVal = (val: number, cur: 'USD' | 'PYG') => {
    if (cur === 'USD') {
      return `U$D ${Math.round(val).toLocaleString('en-US')}`;
    } else {
      return `₲ ${Math.round(val).toLocaleString('es-PY')}`;
    }
  };

  // ----------------------------------------------------
  // MORTGAGE CALCULATIONS (French System)
  // ----------------------------------------------------
  const downPayment = propertyValue * (downPaymentPercent / 100);
  const loanAmount = Math.max(0, propertyValue - downPayment);
  const totalMonths = loanTermYears * 12;
  const monthlyRate = (customInterestRate / 100) / 12;

  // AFD validation warnings
  const isPrimeraViviendaLimitExceeded = loanType === 'primera_vivienda' && loanAmount > 1000000000;
  const isMiCasaLimitExceeded = loanType === 'mi_casa' && loanAmount > 1500000000;

  // Calculate PMT Pure Amortization (Cuota Pura Francesa)
  const pmtPure = monthlyRate === 0 
    ? (loanAmount / totalMonths) 
    : loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

  // Generate Amortization Schedule & Statistics
  let amortizationSchedule: AmortizationRow[] = [];
  let balance = loanAmount;
  let totalInterest = 0;
  let totalIva = 0;
  let totalLifeInsurance = 0;
  let totalFireInsurance = 0;

  const estimatedConstructionValue = propertyValue * (constructionPercent / 100);
  const monthlyFireInsurance = estimatedConstructionValue * 0.0002; // 0.02% of construction value monthly

  for (let m = 1; m <= totalMonths; m++) {
    const interest = balance * monthlyRate;
    let principal = pmtPure - interest;
    if (principal > balance) {
      principal = balance;
    }
    
    const iva = interest * 0.10; // 10% IVA on interest
    const lifeInsurance = balance * 0.0006; // 0.06% of outstanding balance
    const fireInsurance = monthlyFireInsurance;
    const cuotaTotal = principal + interest + iva + lifeInsurance + fireInsurance;
    
    totalInterest += interest;
    totalIva += iva;
    totalLifeInsurance += lifeInsurance;
    totalFireInsurance += fireInsurance;

    amortizationSchedule.push({
      month: m,
      principalPaid: principal,
      interestPaid: interest,
      ivaPaid: iva,
      lifeInsurancePaid: lifeInsurance,
      fireInsurancePaid: fireInsurance,
      cuotaTotal: cuotaTotal,
      remainingBalance: Math.max(0, balance - principal),
    });

    balance = Math.max(0, balance - principal);
  }

  const totalPaid = loanAmount + totalInterest + totalIva + totalLifeInsurance + totalFireInsurance;
  const initialCuota = amortizationSchedule[0]?.cuotaTotal || 0;
  const finalCuota = amortizationSchedule[amortizationSchedule.length - 1]?.cuotaTotal || 0;
  const averageCuota = totalPaid / totalMonths;
  const minRequiredIncome = initialCuota / 0.30; // Max 30% of income

  // ----------------------------------------------------
  // ROI CALCULATIONS
  // ----------------------------------------------------
  const roiGastosEscritura = roiPurchasePrice * 0.02; // 2% notary fees
  // Municipal transfer tax (1% on the 20% fiscal value = 0.2% commercial price)
  const roiImpuestoTransferencia = roiPurchasePrice * 0.20 * 0.01; 
  const roiComisionInmobiliaria = roiPurchasePrice * (roiBuyerCommission / 100);
  
  const roiTotalInvestment = roiPurchasePrice + roiFurnishedCost + roiGastosEscritura + roiImpuestoTransferencia + roiComisionInmobiliaria;

  const roiGrossAnnualIncome = roiMonthlyRent * 12;
  // Vacancy deduction (1 month vacant = 11 months rented = 8.33% vacancy rate)
  const roiAdjustedVacancyIncome = roiMonthlyRent * (12 - roiVacancyMonths);
  const roiMantenimientoAnual = roiGrossAnnualIncome * (roiMaintenancePercent / 100);
  
  // Annual property tax (1% on 20% fiscal value)
  const roiImpuestoInmobiliarioAnual = roiPurchasePrice * 0.20 * 0.01;

  const roiNetAnnualIncome = Math.max(0, roiAdjustedVacancyIncome - roiMantenimientoAnual - roiImpuestoInmobiliarioAnual);

  const roiBrutoPercent = (roiGrossAnnualIncome / roiPurchasePrice) * 100;
  const roiNetoPercent = (roiNetAnnualIncome / roiTotalInvestment) * 100;

  const roiPlusvaliaAnual = roiPurchasePrice * (roiPlusvaliaPercent / 100);
  const roiTotalRetornoConPlusvalia = roiNetAnnualIncome + roiPlusvaliaAnual;
  const roiTotalConPlusvaliaPercent = (roiTotalRetornoConPlusvalia / roiTotalInvestment) * 100;

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-indigo-600 font-extrabold text-[10px] uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            Simulador Real RealHub
          </span>
          <h1 className="text-3xl font-heading font-black text-slate-900 mt-2">
            Calculadora Financiera Inmobiliaria
          </h1>
          {propertyTitle && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">domain</span>
              Simulando para propiedad: <strong className="text-slate-700">{propertyTitle}</strong>
            </p>
          )}
        </div>

        {/* Currency Rate Widget */}
        <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 border border-slate-900 shadow-lg flex items-center gap-4 text-xs font-semibold self-stretch md:self-auto justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-base">currency_exchange</span>
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Tipo de Cambio</p>
              <p className="text-white font-extrabold">1 USD = ₲ {useExchangeRate.toLocaleString('es-PY')}</p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div>
            <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Ajustar T.C. manual</label>
            <input 
              type="number"
              value={useExchangeRate}
              onChange={(e) => setUseExchangeRate(Math.max(1, Number(e.target.value)))}
              className="bg-slate-900 border border-slate-800 rounded-lg py-0.5 px-2 w-20 text-center font-bold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-xl">
        <button
          type="button"
          onClick={() => setActiveTab('prestamo')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'prestamo'
              ? 'bg-white text-indigo-950 shadow-md shadow-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">payments</span>
          Crédito Hipotecario
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roi')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'roi'
              ? 'bg-white text-indigo-950 shadow-md shadow-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">trending_up</span>
          Rentabilidad (ROI)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preaprobacion')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'preaprobacion'
              ? 'bg-white text-indigo-950 shadow-md shadow-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">verified</span>
          Calificación AFD
        </button>
      </div>

      {/* ----------------------------------------------------
          MORTGAGE SIMULATOR TAB
          ---------------------------------------------------- */}
      {activeTab === 'prestamo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-indigo-650">tune</span>
              Parámetros de Simulación
            </h2>

            {/* Currency Choice */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Moneda del Préstamo</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loanType !== 'tradicional'}
                  onClick={() => setLoanCurrency('USD')}
                  className={`py-3.5 border rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                    loanCurrency === 'USD'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 disabled:opacity-50'
                  }`}
                >
                  Dólares (U$D)
                </button>
                <button
                  type="button"
                  onClick={() => setLoanCurrency('PYG')}
                  className={`py-3.5 border rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                    loanCurrency === 'PYG'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  Guaraníes (₲)
                </button>
              </div>
              {loanType !== 'tradicional' && (
                <p className="text-[10px] text-indigo-650 font-semibold mt-1">
                  💡 Los préstamos con fondos de la AFD se liquidan únicamente en Guaraníes.
                </p>
              )}
            </div>

            {/* Loan Type / Program Presets */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Programa / Tipo de Crédito</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoanType('primera_vivienda');
                    setLoanCurrency('PYG');
                  }}
                  className={`p-3 border rounded-2xl text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                    loanType === 'primera_vivienda'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-inner'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">house</span>
                  <span className="text-[10px] font-extrabold uppercase leading-none block">AFD Primera</span>
                  <span className="text-[8px] text-slate-500 leading-none">Tasa 6.9% / 8.9%</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoanType('mi_casa');
                    setLoanCurrency('PYG');
                  }}
                  className={`p-3 border rounded-2xl text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                    loanType === 'mi_casa'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-inner'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">villa</span>
                  <span className="text-[10px] font-extrabold uppercase leading-none block">AFD Mi Casa</span>
                  <span className="text-[8px] text-slate-500 leading-none">Tasa 8.9%</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoanType('tradicional')}
                  className={`p-3 border rounded-2xl text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                    loanType === 'tradicional'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-inner'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">account_balance</span>
                  <span className="text-[10px] font-extrabold uppercase leading-none block">Tradicional</span>
                  <span className="text-[8px] text-slate-500 leading-none">Tasa Bancaria</span>
                </button>
              </div>
            </div>

            {/* Property Value Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Comercial de la Propiedad</label>
                <span className="text-xs font-bold text-slate-900">{formatVal(propertyValue, loanCurrency)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {loanCurrency === 'USD' ? 'U$D' : '₲'}
                </span>
                <input
                  type="number"
                  value={propertyValue}
                  onChange={(e) => setPropertyValue(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <input
                type="range"
                min={loanCurrency === 'USD' ? 20000 : 150000000}
                max={loanCurrency === 'USD' ? 500000 : 3500000000}
                step={loanCurrency === 'USD' ? 5000 : 25000000}
                value={propertyValue}
                onChange={(e) => setPropertyValue(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-2 cursor-pointer"
              />
            </div>

            {/* Down Payment (Entrega Inicial) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entrega Inicial ({downPaymentPercent}%)</label>
                  <span className="text-xs font-extrabold text-indigo-650">{formatVal(downPayment, loanCurrency)}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={95}
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(Math.min(95, Math.max(0, Number(e.target.value))))}
                    className="w-full border border-slate-250 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monto del Préstamo a Financiar</label>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-900 select-none">
                  {formatVal(loanAmount, loanCurrency)}
                </div>
              </div>
            </div>

            {/* Term and Interest Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plazo del Crédito */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plazo del Crédito</label>
                  <span className="text-xs font-bold text-slate-900">{loanTermYears} años ({totalMonths} meses)</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={loanTermYears}
                    onChange={(e) => setLoanTermYears(Math.min(30, Math.max(5, Number(e.target.value))))}
                    className="w-full border border-slate-250 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">Años</span>
                </div>
              </div>

              {/* Tasa de Interés */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasa de Interés Anual (T.N.A)</label>
                  <button 
                    onClick={() => setIsCustomRate(!isCustomRate)}
                    className="text-[9px] font-black uppercase text-indigo-650 hover:underline"
                  >
                    {isCustomRate ? 'Restaurar preset' : 'Modificar'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    disabled={!isCustomRate}
                    value={customInterestRate}
                    onChange={(e) => setCustomInterestRate(Number(e.target.value))}
                    className="w-full border border-slate-250 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                </div>
              </div>
            </div>

            {/* ADVANCED RULES / INSURANCE OPTIONS */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-650">security</span>
                Detalle de Seguros y Construcción
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Construcción estimada ({constructionPercent}%)</label>
                    <span className="text-[10px] font-bold text-slate-700">{formatVal(estimatedConstructionValue, loanCurrency)}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={constructionPercent}
                    onChange={(e) => setConstructionPercent(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[8px] text-slate-400 leading-normal">
                    Usado para estimar el costo de la prima del seguro contra incendios en Paraguay (0.02% del valor de obra mensualmente).
                  </p>
                </div>

                <div className="space-y-1 text-slate-600 text-[10px] leading-relaxed">
                  <p className="font-extrabold text-slate-900 uppercase text-[8px] tracking-wider mb-1">Políticas del Banco en Paraguay</p>
                  <p>• <strong>IVA de Interés:</strong> Tasa del 10% sobre la porción de interés devengada cada mes.</p>
                  <p>• <strong>Seguro de Vida:</strong> 0.06% mensual sobre el saldo deudor pendiente.</p>
                  <p>• <strong>Ingreso Requerido:</strong> Ratio máximo de afectación de ingresos del 30%.</p>
                </div>
              </div>
            </div>

            {/* AFD WARNING BANNERS */}
            {isPrimeraViviendaLimitExceeded && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-800 text-xs flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-rose-500 shrink-0 mt-0.5">warning</span>
                <div>
                  <h4 className="font-bold text-rose-950 uppercase text-[10px] tracking-wider mb-0.5">Excede Límite AFD Primera Vivienda</h4>
                  <p>El préstamo máximo permitido para AFD Primera Vivienda es de <strong>₲ 1.000.000.000</strong>. Te sugerimos aumentar la entrega inicial o solicitar un crédito tradicional.</p>
                </div>
              </div>
            )}
            
            {isMiCasaLimitExceeded && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-800 text-xs flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-rose-500 shrink-0 mt-0.5">warning</span>
                <div>
                  <h4 className="font-bold text-rose-950 uppercase text-[10px] tracking-wider mb-0.5">Excede Límite AFD Mi Casa</h4>
                  <p>El préstamo máximo permitido para AFD Mi Casa es de <strong>₲ 1.500.000.000</strong>. Para montos superiores, se requiere financiación tradicional o complementos bancarios.</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Visual Amortization Stats Card */}
            <div className="bg-indigo-950 text-slate-100 rounded-3xl p-6 md:p-8 border border-indigo-900 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit">
                Resultados del Cálculo
              </span>

              <div className="mt-6 space-y-1">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cuota Inicial Promedio Estimada</p>
                <h3 className="text-3xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-300 to-pink-300">
                  {formatVal(initialCuota, loanCurrency)} <span className="text-xs font-bold text-slate-400">/ mes</span>
                </h3>
              </div>

              {/* Installment Details */}
              <div className="grid grid-cols-2 gap-4 mt-6 py-4 border-t border-b border-indigo-900 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Cuota Pura Inicial</span>
                  <strong className="text-white text-sm font-bold">{formatVal(pmtPure, loanCurrency)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Seguros + IVA Inicial</span>
                  <strong className="text-white text-sm font-bold">{formatVal(initialCuota - pmtPure, loanCurrency)}</strong>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block font-medium">Cuota Mínima Final</span>
                  <strong className="text-white text-sm font-bold">{formatVal(finalCuota, loanCurrency)}</strong>
                  <span className="text-[9px] text-indigo-400 block leading-tight">(Baja por reducción de saldo)</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-400 block font-medium">Cuota Promedio</span>
                  <strong className="text-white text-sm font-bold">{formatVal(averageCuota, loanCurrency)}</strong>
                </div>
              </div>

              {/* Required Income */}
              <div className="mt-6 p-4 bg-indigo-900/30 border border-indigo-900/50 rounded-2xl">
                <div className="flex gap-3 items-center">
                  <span className="material-symbols-outlined text-indigo-300 text-2xl">account_balance_wallet</span>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ingreso Mínimo Familiar Verificable</span>
                    <strong className="text-emerald-400 text-lg font-black">{formatVal(minRequiredIncome, loanCurrency)}</strong>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal mt-2">
                  Calculado en base al estándar del BCU/Bancos de no comprometer más del 30% de los ingresos líquidos comprobables del núcleo familiar.
                </p>
              </div>

              {/* Loan Breakdown List */}
              <div className="mt-6 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Monto Neto Recibido</span>
                  <span className="font-semibold text-white">{formatVal(loanAmount, loanCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-350">
                  <span>Total Intereses Devengados</span>
                  <span className="font-semibold text-white">{formatVal(totalInterest, loanCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-350">
                  <span>Total I.V.A sobre Interés (10%)</span>
                  <span className="font-semibold text-white">{formatVal(totalIva, loanCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-350">
                  <span>Total Seguros de Vida</span>
                  <span className="font-semibold text-white">{formatVal(totalLifeInsurance, loanCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-350">
                  <span>Total Seguros de Incendio</span>
                  <span className="font-semibold text-white">{formatVal(totalFireInsurance, loanCurrency)}</span>
                </div>
                <div className="h-[1px] bg-indigo-900/80 my-2" />
                <div className="flex justify-between items-center text-slate-300 text-sm font-extrabold">
                  <span>Total Pagado al Final</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 text-base font-black">
                    {formatVal(totalPaid, loanCurrency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-3 text-xs leading-relaxed text-slate-650">
              <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-650">info</span>
                Toma Nota en Paraguay
              </h3>
              <p>
                Los costos de <strong>Tasación e Inspección</strong> (generalmente ₲ 1.200.000 a ₲ 2.500.000) e <strong>Impuestos notariales de hipoteca</strong> (1% al 1.5% del monto prestado) no están incluidos en las cuotas del préstamo y deben abonarse al momento de la firma de la escritura.
              </p>
            </div>
          </div>

          {/* AMORTIZATION TABLE ROW - ACCORDION */}
          <div className="col-span-1 lg:col-span-12 mt-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            <button
              onClick={() => setShowFullAmortization(!showFullAmortization)}
              className="w-full flex items-center justify-between font-black text-slate-900 text-sm uppercase tracking-wider focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-650">table_chart</span>
                Cronograma de Amortización Francesa ({totalMonths} Meses)
              </span>
              <span className="material-symbols-outlined transform transition-transform duration-200">
                {showFullAmortization ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
            </button>

            {showFullAmortization && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider bg-slate-50 text-[10px]">
                      <th className="py-3 px-4">Mes</th>
                      <th className="py-3 px-4 text-right">Saldo Inicial</th>
                      <th className="py-3 px-4 text-right">Capital</th>
                      <th className="py-3 px-4 text-right">Interés</th>
                      <th className="py-3 px-4 text-right">I.V.A. (10%)</th>
                      <th className="py-3 px-4 text-right">S. Vida (0.06%)</th>
                      <th className="py-3 px-4 text-right">S. Incendio</th>
                      <th className="py-3 px-4 text-right bg-indigo-50/50 text-indigo-900 font-extrabold">Cuota Total</th>
                      <th className="py-3 px-4 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {amortizationSchedule.slice(0, 12).map((row) => {
                      const balanceIni = row.remainingBalance + row.principalPaid;
                      return (
                        <tr key={row.month} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-500">{row.month}</td>
                          <td className="py-3 px-4 text-right">{formatVal(balanceIni, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatVal(row.principalPaid, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right text-slate-650">{formatVal(row.interestPaid, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right text-slate-500">{formatVal(row.ivaPaid, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right text-slate-500">{formatVal(row.lifeInsurancePaid, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right text-slate-500">{formatVal(row.fireInsurancePaid, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right bg-indigo-50/20 text-indigo-700 font-black">{formatVal(row.cuotaTotal, loanCurrency)}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{formatVal(row.remainingBalance, loanCurrency)}</td>
                        </tr>
                      );
                    })}
                    {totalMonths > 12 && (
                      <tr className="bg-slate-50 text-center text-slate-500 font-medium italic">
                        <td colSpan={9} className="py-4">
                          Se muestran los primeros 12 meses. Hay {totalMonths - 12} meses más en el cronograma.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          INVESTMENT ROI CALCULATOR TAB
          ---------------------------------------------------- */}
      {activeTab === 'roi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Column */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-indigo-650">tune</span>
              Costos e Ingresos de Inversión
            </h2>

            {/* Currency toggle */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Moneda del Análisis</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (roiCurrency === 'PYG') {
                      setRoiCurrency('USD');
                      setRoiPurchasePrice(Math.round(roiPurchasePrice / useExchangeRate));
                      setRoiMonthlyRent(Math.round(roiMonthlyRent / useExchangeRate));
                      setRoiFurnishedCost(Math.round(roiFurnishedCost / useExchangeRate));
                    }
                  }}
                  className={`py-3.5 border rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                    roiCurrency === 'USD'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  Dólares (U$D)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (roiCurrency === 'USD') {
                      setRoiCurrency('PYG');
                      setRoiPurchasePrice(roiPurchasePrice * useExchangeRate);
                      setRoiMonthlyRent(roiMonthlyRent * useExchangeRate);
                      setRoiFurnishedCost(roiFurnishedCost * useExchangeRate);
                    }
                  }}
                  className={`py-3.5 border rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                    roiCurrency === 'PYG'
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  Guaraníes (₲)
                </button>
              </div>
            </div>

            {/* Purchase Price Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio de Compra (Inmueble)</label>
                <span className="text-xs font-bold text-slate-900">{formatVal(roiPurchasePrice, roiCurrency)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  {roiCurrency === 'USD' ? 'U$D' : '₲'}
                </span>
                <input
                  type="number"
                  value={roiPurchasePrice}
                  onChange={(e) => setRoiPurchasePrice(Math.max(0, Number(e.target.value)))}
                  className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Furnished Cost & Rent Income */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equipamiento y Amueblamiento */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Equipamiento / Muebles</label>
                  <span className="text-xs font-semibold text-slate-700">{formatVal(roiFurnishedCost, roiCurrency)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {roiCurrency === 'USD' ? 'U$D' : '₲'}
                  </span>
                  <input
                    type="number"
                    value={roiFurnishedCost}
                    onChange={(e) => setRoiFurnishedCost(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Alquiler Mensual Estimado */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alquiler Mensual Estimado</label>
                  <span className="text-xs font-bold text-slate-900">{formatVal(roiMonthlyRent, roiCurrency)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {roiCurrency === 'USD' ? 'U$D' : '₲'}
                  </span>
                  <input
                    type="number"
                    value={roiMonthlyRent}
                    onChange={(e) => setRoiMonthlyRent(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom parameters (Comision, Vacancy, Maintenance) */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-650">settings_applications</span>
                Ajustes Avanzados de Operación (Paraguay)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vacancia */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Vacancia Anual</span>
                    <span>{roiVacancyMonths} Meses ({Math.round(roiVacancyMonths / 12 * 1000) / 10}%)</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={4}
                    step={0.5}
                    value={roiVacancyMonths}
                    onChange={(e) => setRoiVacancyMonths(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[8px] text-slate-400 leading-normal">
                    Estándar paraguayo es de 1 mes por año (8.33%) para rotaciones de contrato estándar de 1 o 2 años.
                  </p>
                </div>

                {/* Gastos Mantenimiento */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Expensas/Mantenimiento Propietario</span>
                    <span>{roiMaintenancePercent}% del ingreso</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={15}
                    step={1}
                    value={roiMaintenancePercent}
                    onChange={(e) => setRoiMaintenancePercent(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[8px] text-slate-400 leading-normal">
                    Fondo para pintura, arreglos generales e impuestos inmobiliarios menores.
                  </p>
                </div>

                {/* Plusvalía proyectada */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Plusvalía Inmobiliaria Estimada</span>
                    <span>{roiPlusvaliaPercent}% anual</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={roiPlusvaliaPercent}
                    onChange={(e) => setRoiPlusvaliaPercent(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[8px] text-slate-400 leading-normal">
                    Histórico promedio de revalorización en zonas premium de Asunción (e.g. Carmelitas, Villa Morra, Ycuá Satí).
                  </p>
                </div>

                {/* Comisión comprador */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Comisión de Compra (Agente)</span>
                    <span>{roiBuyerCommission}%</span>
                  </div>
                  <input 
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={roiBuyerCommission}
                    onChange={(e) => setRoiBuyerCommission(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <p className="text-[8px] text-slate-400 leading-normal">
                    Habitualmente es 0% para el comprador en Paraguay (comisión del 5% + IVA la asume el vendedor), pero ajustable si aplica.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit">
                Análisis de Rentabilidad
              </span>

              {/* ROI NETO REAL BIG NUMBER */}
              <div className="mt-6 space-y-1">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Retorno Neto Anual Real (Cap Rate)</p>
                <h3 className="text-4xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-300 to-indigo-400">
                  {roiNetoPercent.toFixed(2)}% <span className="text-xs font-bold text-slate-400">/ año</span>
                </h3>
              </div>

              {/* Investment breakdown list */}
              <div className="bg-slate-950/50 border border-white/[0.04] rounded-2xl p-4 mt-6 space-y-2.5 text-xs text-slate-350">
                <div className="flex justify-between">
                  <span>Precio de Adquisición</span>
                  <strong className="text-white">{formatVal(roiPurchasePrice, roiCurrency)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Gastos de Escritura e Impuestos (2.2%)</span>
                  <strong className="text-white">{formatVal(roiGastosEscritura + roiImpuestoTransferencia, roiCurrency)}</strong>
                </div>
                {roiFurnishedCost > 0 && (
                  <div className="flex justify-between">
                    <span>Equipamiento / Amueblamiento</span>
                    <strong className="text-white">{formatVal(roiFurnishedCost, roiCurrency)}</strong>
                  </div>
                )}
                {roiComisionInmobiliaria > 0 && (
                  <div className="flex justify-between">
                    <span>Comisión de Compra</span>
                    <strong className="text-white">{formatVal(roiComisionInmobiliaria, roiCurrency)}</strong>
                  </div>
                )}
                <div className="h-[1px] bg-white/[0.05] my-1" />
                <div className="flex justify-between text-white font-extrabold text-sm">
                  <span>Inversión Inicial Total</span>
                  <span className="text-indigo-400">{formatVal(roiTotalInvestment, roiCurrency)}</span>
                </div>
              </div>

              {/* ROI comparison */}
              <div className="grid grid-cols-2 gap-4 mt-6 py-4 border-t border-b border-white/[0.05] text-xs">
                <div>
                  <span className="text-slate-450 block font-medium">Rentabilidad Bruta</span>
                  <strong className="text-slate-300 text-sm font-bold">{roiBrutoPercent.toFixed(2)}%</strong>
                  <span className="text-[9px] text-slate-500 block leading-tight">(Sin vacancia ni gastos)</span>
                </div>
                <div>
                  <span className="text-slate-450 block font-medium">Flujo Neto Anual</span>
                  <strong className="text-emerald-400 text-sm font-extrabold">{formatVal(roiNetAnnualIncome, roiCurrency)}</strong>
                  <span className="text-[9px] text-slate-500 block leading-tight">({formatVal(roiNetAnnualIncome / 12, roiCurrency)} / mes)</span>
                </div>
              </div>

              {/* Appreciation Projection */}
              <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Retorno con Plusvalía ({roiPlusvaliaPercent}%)</span>
                    <strong className="text-emerald-350 text-sm font-black">{formatVal(roiTotalRetornoConPlusvalia, roiCurrency)} / año</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block font-medium">Retorno Total Proyectado</span>
                    <strong className="text-emerald-350 text-base font-black">{roiTotalConPlusvaliaPercent.toFixed(2)}%</strong>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 leading-normal mt-2">
                  La plusvalía en Paraguay incrementa el valor patrimonial del inmueble en el mercado, sumándose al retorno por alquiler (ROI Neto).
                </p>
              </div>

              {/* Costs Breakdown Detail */}
              <div className="mt-6 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Alquiler Bruto Anual</span>
                  <span>{formatVal(roiGrossAnnualIncome, roiCurrency)}</span>
                </div>
                <div className="flex justify-between text-rose-400/90">
                  <span>Deducción de Vacancia ({roiVacancyMonths} mes/es)</span>
                  <span>- {formatVal(roiMonthlyRent * roiVacancyMonths, roiCurrency)}</span>
                </div>
                <div className="flex justify-between text-rose-400/90">
                  <span>Gastos de Mantenimiento ({roiMaintenancePercent}%)</span>
                  <span>- {formatVal(roiMantenimientoAnual, roiCurrency)}</span>
                </div>
                <div className="flex justify-between text-rose-400/90">
                  <span>Impuesto Inmobiliario Anual</span>
                  <span>- {formatVal(roiImpuestoInmobiliarioAnual, roiCurrency)}</span>
                </div>
              </div>
            </div>

            {/* Comparison card */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-3 text-xs leading-relaxed text-slate-650">
              <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-650">info</span>
                Gastos del Impuesto Municipal
              </h3>
              <p>
                El <strong>Impuesto Inmobiliario Anual</strong> en Paraguay corresponde al 1% de la valuación fiscal de la propiedad establecida por la Dirección General de Catastro. Para simplificar e igualar la práctica mercantil estándar, estimamos la valuación fiscal en el <strong>20% del valor de compra comercial</strong> de la propiedad.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          AFD PRE-QUALIFICATION TAB
          ---------------------------------------------------- */}
      {activeTab === 'preaprobacion' && (() => {
        // Standard minimum wage in PY
        const PYG_SALARIO_MINIMO = 2798309;
        
        // Values in PYG for limits checks
        const propertyValuePyg = preCurrency === 'PYG' ? prePropertyValue : prePropertyValue * useExchangeRate;
        const downPaymentPyg = propertyValuePyg * (preDownPaymentPercent / 100);
        const loanAmountPyg = Math.max(0, propertyValuePyg - downPaymentPyg);
        const incomePyg = preCurrency === 'PYG' ? preIncome : preIncome * useExchangeRate;
        const debtsPyg = preCurrency === 'PYG' ? preDebts : preDebts * useExchangeRate;
        
        // Determine AFD program or traditional financing
        let suggestedLoanType: 'primera_a' | 'primera_b' | 'mi_casa' | 'tradicional' = 'tradicional';
        
        if (loanAmountPyg <= 452800000 && incomePyg <= (PYG_SALARIO_MINIMO * 4)) {
          suggestedLoanType = 'primera_a';
        } else if (loanAmountPyg <= 1000000000 && incomePyg <= (PYG_SALARIO_MINIMO * 7)) {
          suggestedLoanType = 'primera_b';
        } else if (loanAmountPyg <= 1500000000) {
          suggestedLoanType = 'mi_casa';
        } else {
          suggestedLoanType = 'tradicional';
        }

        const applicableRate = isPreCustomRate ? preInterestRate : (
          suggestedLoanType === 'primera_a' ? 6.9 :
          suggestedLoanType === 'primera_b' ? 8.9 :
          suggestedLoanType === 'mi_casa' ? 8.9 :
          (preCurrency === 'USD' ? 7.5 : 10.5)
        );
        
        const preLoanAmount = prePropertyValue * (1 - preDownPaymentPercent / 100);
        const preTotalMonths = preTermYears * 12;
        const preMonthlyRate = (applicableRate / 100) / 12;
        
        // French calculation
        const prePmtPure = preMonthlyRate === 0 
          ? (preLoanAmount / preTotalMonths) 
          : preLoanAmount * (preMonthlyRate * Math.pow(1 + preMonthlyRate, preTotalMonths)) / (Math.pow(1 + preMonthlyRate, preTotalMonths) - 1);
          
        // Insurance estimations
        const firstMonthInterest = preLoanAmount * preMonthlyRate;
        const preIva = firstMonthInterest * 0.10;
        const preLifeInsurance = preLoanAmount * 0.0006;
        const preFireInsurance = prePropertyValue * 0.60 * 0.0002; // estimated construction portion (60% of value)
        const estimatedInitialCuota = prePmtPure + firstMonthInterest + preIva + preLifeInsurance + preFireInsurance;
        
        const netIncomeAvailable = Math.max(0, preIncome - preDebts);
        const dtiRatio = netIncomeAvailable > 0 ? (estimatedInitialCuota / netIncomeAvailable) * 100 : 100;
        
        let eligibilityStatus: 'califica' | 'advertencia' | 'no_califica' = 'califica';
        let eligibilityReason = '';
        
        if (dtiRatio > 35) {
          eligibilityStatus = 'no_califica';
          eligibilityReason = 'La cuota estimada supera la afectación máxima recomendada de ingresos.';
        } else if (dtiRatio > 30) {
          eligibilityStatus = 'advertencia';
          eligibilityReason = 'La cuota compromete entre el 30% y 35% de tus ingresos libres disponibles.';
        } else {
          eligibilityStatus = 'califica';
          eligibilityReason = 'La cuota se encuentra en un rango saludable respecto a tus ingresos libres.';
        }
        
        // Proposed down payment to bring DTI down to 30%
        const neededDtiReduction = dtiRatio - 30;
        const proposedDownPaymentPercent = Math.min(95, Math.ceil(preDownPaymentPercent + neededDtiReduction));

        // Program name mapping
        const PROGRAM_NAMES = {
          primera_a: 'AFD Primera Vivienda - Categoría A (Tasa 6.9%)',
          primera_b: 'AFD Primera Vivienda - Categoría B (Tasa 8.9%)',
          mi_casa: 'AFD Mi Casa (Tasa 8.9%)',
          tradicional: `Crédito Hipotecario Bancario (Tasa ${applicableRate}%)`,
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Inputs Column */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-1.5 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-indigo-650">verified_user</span>
                Pre-calificación AFD & Bancaria
              </h2>

              {/* Currency choice */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Moneda del Análisis</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreCurrency('USD')}
                    className={`py-3.5 border rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                      preCurrency === 'USD'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    Dólares (U$D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreCurrency('PYG')}
                    className={`py-3.5 border rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-200 ${
                      preCurrency === 'PYG'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    Guaraníes (₲)
                  </button>
                </div>
              </div>

              {/* Ingreso Familiar Mensual */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ingreso Familiar Líquido Mensual</label>
                  <span className="text-xs font-bold text-slate-900">{formatVal(preIncome, preCurrency)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {preCurrency === 'USD' ? 'U$D' : '₲'}
                  </span>
                  <input
                    type="number"
                    value={preIncome}
                    onChange={(e) => setPreIncome(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Suma de todos los ingresos comprobables de los codeudores solicitantes. En Paraguay, 1 salario mínimo es aprox. ₲ {PYG_SALARIO_MINIMO.toLocaleString('es-PY')}.
                </p>
              </div>

              {/* Gastos y Deudas Actuales */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gastos / Cuotas de Deudas Actuales</label>
                  <span className="text-xs font-bold text-slate-900">{formatVal(preDebts, preCurrency)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {preCurrency === 'USD' ? 'U$D' : '₲'}
                  </span>
                  <input
                    type="number"
                    value={preDebts}
                    onChange={(e) => setPreDebts(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Cuotas mensuales vigentes de tarjetas de crédito, préstamos de autos u otros créditos activos.
                </p>
              </div>

              {/* Property Value Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor de la Propiedad a Adquirir</label>
                  <span className="text-xs font-bold text-slate-900">{formatVal(prePropertyValue, preCurrency)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {preCurrency === 'USD' ? 'U$D' : '₲'}
                  </span>
                  <input
                    type="number"
                    value={prePropertyValue}
                    onChange={(e) => setPrePropertyValue(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-250 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Down Payment & Term */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entrega Inicial ({preDownPaymentPercent}%)</label>
                    <span className="text-xs font-extrabold text-indigo-650">
                      {formatVal(prePropertyValue * (preDownPaymentPercent / 100), preCurrency)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={95}
                      value={preDownPaymentPercent}
                      onChange={(e) => setPreDownPaymentPercent(Math.min(95, Math.max(0, Number(e.target.value))))}
                      className="w-full border border-slate-250 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plazo del Crédito (Años)</label>
                    <span className="text-xs font-bold text-slate-900">{preTermYears} años</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={5}
                      max={30}
                      value={preTermYears}
                      onChange={(e) => setPreTermYears(Math.min(30, Math.max(5, Number(e.target.value))))}
                      className="w-full border border-slate-250 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">Años</span>
                  </div>
                </div>
              </div>

              {/* Tasa de Interés */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasa de Interés Anual (T.N.A)</label>
                  <button 
                    type="button"
                    onClick={() => setIsPreCustomRate(!isPreCustomRate)}
                    className="text-[9px] font-black uppercase text-indigo-650 hover:underline"
                  >
                    {isPreCustomRate ? 'Usar Tasa Automática' : 'Modificar Tasa'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    disabled={!isPreCustomRate}
                    value={preInterestRate}
                    onChange={(e) => setPreInterestRate(Number(e.target.value))}
                    className="w-full border border-slate-250 rounded-2xl py-3 px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                </div>
                {isPreCustomRate && (
                  <p className="text-[9px] text-amber-600 font-semibold mt-1">
                    💡 Modificando tasa manualmente. Las deudas e ingresos se calcularán con respecto a esta tasa personalizada de {preInterestRate}%.
                  </p>
                )}
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit">
                  Resultado de Calificación
                </span>

                {/* Eligibility Status Alert */}
                <div className="mt-6 flex flex-col gap-2">
                  {eligibilityStatus === 'califica' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-start gap-3">
                      <span className="material-symbols-outlined text-2xl mt-0.5 text-emerald-400">check_circle</span>
                      <div>
                        <p className="font-extrabold text-sm uppercase tracking-wide text-white">🟢 Califica con Éxito</p>
                        <p className="text-[10px] text-slate-300 mt-1 leading-normal">{eligibilityReason}</p>
                      </div>
                    </div>
                  )}
                  {eligibilityStatus === 'advertencia' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start gap-3">
                      <span className="material-symbols-outlined text-2xl mt-0.5 text-amber-400">warning</span>
                      <div>
                        <p className="font-extrabold text-sm uppercase tracking-wide text-white"> 🟡 Califica al Límite</p>
                        <p className="text-[10px] text-slate-350 mt-1 leading-normal">{eligibilityReason}</p>
                      </div>
                    </div>
                  )}
                  {eligibilityStatus === 'no_califica' && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-start gap-3">
                      <span className="material-symbols-outlined text-2xl mt-0.5 text-rose-400">error</span>
                      <div>
                        <p className="font-extrabold text-sm uppercase tracking-wide text-white">❌ No Califica</p>
                        <p className="text-[10px] text-slate-350 mt-1 leading-normal">{eligibilityReason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Big numbers */}
                <div className="mt-6 space-y-1">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cuota Mensual Estimada</p>
                  <h3 className="text-3xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-300 to-indigo-400">
                    {formatVal(estimatedInitialCuota, preCurrency)}
                  </h3>
                </div>

                {/* DTI Gauge bar */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Afectación de Ingresos (DTI)</span>
                    <span className={dtiRatio > 35 ? 'text-rose-400 font-extrabold' : dtiRatio > 30 ? 'text-amber-400 font-extrabold' : 'text-emerald-450 font-extrabold'}>
                      {dtiRatio.toFixed(1)}% / 30% Máx
                    </span>
                  </div>
                  <div className="w-full bg-slate-850 h-3 rounded-full overflow-hidden border border-white/[0.04] p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        dtiRatio > 35 ? 'bg-rose-500' : dtiRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, dtiRatio)}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-slate-450 leading-normal">
                    Los bancos paraguayos no permiten que la cuota hipotecaria consuma más del 30% del ingreso familiar líquido una vez deducidas las deudas.
                  </p>
                </div>

                {/* Suggested Program */}
                <div className="mt-6 py-4 border-t border-b border-white/[0.05] text-xs">
                  <span className="text-slate-400 block font-medium uppercase tracking-wider text-[9px] mb-1">Programa Recomendado</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-400 text-base">domain_verification</span>
                    <strong className="text-white text-sm font-bold">{PROGRAM_NAMES[suggestedLoanType]}</strong>
                  </div>
                </div>

                {/* Recommendations Box */}
                <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-xs text-slate-350 space-y-2 leading-relaxed">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sugerencias del Sistema</span>
                  {eligibilityStatus === 'califica' ? (
                    <p className="text-emerald-450 font-medium">✓ Tu cliente tiene un perfil crediticio ideal. Podés proceder con la presentación formal al banco.</p>
                  ) : (
                    <p className="text-slate-300 font-medium leading-normal">
                      ⚠ Para calificar con éxito, sugerimos elevar la entrega inicial al <strong className="text-white">{proposedDownPaymentPercent}%</strong> ({formatVal(prePropertyValue * (proposedDownPaymentPercent / 100), preCurrency)}) para reducir la cuota o extender el plazo de amortización a <strong className="text-white">30 años</strong>.
                    </p>
                  )}
                </div>
              </div>

              {/* Paraguay Local Rules Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-3 text-xs leading-relaxed text-slate-650">
                <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-650">gavel</span>
                  Reglamento de la AFD en Paraguay
                </h3>
                <p>
                  • <strong>Primera Vivienda (Categoría A)</strong>: Límite de monto financiable de ₲ 452.800.000 (160 Salarios Mínimos). Ingreso mensual máximo de 4 salarios mínimos del grupo familiar. Tasa máxima 6.9%.
                </p>
                <p>
                  • <strong>Primera Vivienda (Categoría B)</strong>: Límite de monto financiable de ₲ 1.000.000.000 (350 Salarios Mínimos). Ingreso mensual máximo de 7 salarios mínimos del grupo familiar. Tasa máxima 8.9%.
                </p>
                <p>
                  • <strong>AFD Mi Casa</strong>: Límite de monto financiable de ₲ 1.500.000.000. Sin límite de ingresos del solicitante. Tasa aproximada de 8.9% al 9.9% según la entidad bancaria.
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
