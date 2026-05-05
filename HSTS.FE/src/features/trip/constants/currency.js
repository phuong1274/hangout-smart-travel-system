export const CURRENCY_OPTIONS = [
  { value: 'VND', label: 'VND - Vietnamese Dong', flag: '🇻🇳' },
  { value: 'USD', label: 'USD - US Dollar', flag: '🇺🇸' },
  { value: 'EUR', label: 'EUR - Euro', flag: '🇪🇺' },
  { value: 'JPY', label: 'JPY - Japanese Yen', flag: '🇯🇵' },
  { value: 'KRW', label: 'KRW - Korean Won', flag: '🇰🇷' },
  { value: 'THB', label: 'THB - Thai Baht', flag: '🇹🇭' },
  { value: 'GBP', label: 'GBP - British Pound', flag: '🇬🇧' },
  { value: 'AUD', label: 'AUD - Australian Dollar', flag: '🇦🇺' },
  { value: 'CAD', label: 'CAD - Canadian Dollar', flag: '🇨🇦' },
  { value: 'SGD', label: 'SGD - Singapore Dollar', flag: '🇸🇬' },
  { value: 'CNY', label: 'CNY - Chinese Yuan', flag: '🇨🇳' },
  { value: 'HKD', label: 'HKD - Hong Kong Dollar', flag: '🇭🇰' },
  { value: 'INR', label: 'INR - Indian Rupee', flag: '🇮🇳' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit', flag: '🇲🇾' },
  { value: 'IDR', label: 'IDR - Indonesian Rupiah', flag: '🇮🇩' },
  { value: 'PHP', label: 'PHP - Philippine Peso', flag: '🇵🇭' },
];

export const NO_FRACTION_CURRENCIES = Object.freeze(['VND', 'JPY', 'KRW', 'IDR']);

export const VND_EXCHANGE_RATES = Object.freeze({
  VND: 1,
  USD: 26000,
  EUR: 28500,
  JPY: 175,
  KRW: 19,
  THB: 720,
  GBP: 33200,
  AUD: 17100,
  CAD: 18900,
  SGD: 19300,
  CNY: 3600,
  HKD: 3320,
  INR: 310,
  MYR: 5500,
  IDR: 1.6,
  PHP: 460,
});

let backendVndExchangeRates = null;

const normalizeRatesPayload = (payload) => {
  const rawRates = Array.isArray(payload?.rates)
    ? payload.rates
    : (Array.isArray(payload?.Rates) ? payload.Rates : []);

  const rates = rawRates.reduce((acc, item) => {
    const code = String(item?.currencyCode || item?.CurrencyCode || item?.code || item?.Code || '').trim().toUpperCase();
    const rate = Number(item?.vndRate ?? item?.VndRate ?? item?.rate ?? item?.Rate);
    if (code.length === 3 && Number.isFinite(rate) && rate > 0) {
      acc[code] = rate;
    }
    return acc;
  }, {});

  return rates.VND === 1 ? rates : { VND: 1, ...rates };
};

export const setBackendCurrencyRates = (payload) => {
  const rates = normalizeRatesPayload(payload);
  backendVndExchangeRates = Object.keys(rates).length > 1 ? Object.freeze(rates) : null;
  return backendVndExchangeRates;
};

export const getResolvedCurrencyRates = () => backendVndExchangeRates || VND_EXCHANGE_RATES;

export const loadBackendCurrencyRates = async () => {
  const { default: apiClient } = await import('@/lib/axios');
  const response = await apiClient.get('/api/common/currencies/rates');
  return setBackendCurrencyRates(response.data);
};

export const convertCurrencyAmount = (
  amount,
  fromCurrencyCode = 'VND',
  toCurrencyCode = 'VND',
  rates = getResolvedCurrencyRates(),
) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return 0;
  }

  const fromCurrency = String(fromCurrencyCode || 'VND').toUpperCase();
  const toCurrency = String(toCurrencyCode || 'VND').toUpperCase();
  const fromRate = rates[fromCurrency] ?? VND_EXCHANGE_RATES[fromCurrency] ?? VND_EXCHANGE_RATES.VND;
  const toRate = rates[toCurrency] ?? VND_EXCHANGE_RATES[toCurrency] ?? VND_EXCHANGE_RATES.VND;

  const amountInVnd = numericAmount * fromRate;
  return amountInVnd / toRate;
};

export const convertBudgetToVnd = (
  amount,
  currencyCode = 'VND',
  rates = getResolvedCurrencyRates(),
) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 0;
  }

  const normalizedCurrency = String(currencyCode || 'VND').toUpperCase();
  const rate = rates[normalizedCurrency] ?? VND_EXCHANGE_RATES[normalizedCurrency] ?? VND_EXCHANGE_RATES.VND;

  return Math.round(numericAmount * rate);
};

export const isSupportedCurrencyCode = (currencyCode) => {
  const normalizedCurrency = String(currencyCode || '').trim().toUpperCase();
  return CURRENCY_OPTIONS.some((option) => option.value === normalizedCurrency);
};

export const normalizeCurrencyCode = (currencyCode, fallback = 'VND') => {
  const normalizedCurrency = String(currencyCode || '').trim().toUpperCase();
  return isSupportedCurrencyCode(normalizedCurrency) ? normalizedCurrency : fallback;
};

export const formatMoneyAmount = (amount, currencyCode = 'VND') => {
  const currency = normalizeCurrencyCode(currencyCode);
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? Math.max(0, numericAmount) : 0;
  const maximumFractionDigits = NO_FRACTION_CURRENCIES.includes(currency) ? 0 : 2;

  return `${safeAmount.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })} ${currency}`;
};

export const formatVndAmount = (amount, targetCurrencyCode = 'VND') => {
  const currency = normalizeCurrencyCode(targetCurrencyCode);
  return formatMoneyAmount(convertCurrencyAmount(amount, 'VND', currency), currency);
};

export const formatUsdAmount = (amount, targetCurrencyCode = 'VND') => {
  const currency = normalizeCurrencyCode(targetCurrencyCode);
  return formatMoneyAmount(convertCurrencyAmount(amount, 'USD', currency), currency);
};

export const formatLocationPriceRange = ({
  priceMinUsd,
  priceMaxUsd,
  ticketPrice,
  currencyCode = 'VND',
  fallback = null,
}) => {
  const hasUsdRange = priceMinUsd != null || priceMaxUsd != null;
  if (hasUsdRange) {
    const minText = formatUsdAmount(priceMinUsd ?? 0, currencyCode);
    const maxText = priceMaxUsd == null ? 'Any' : formatUsdAmount(priceMaxUsd, currencyCode);
    return `${minText} - ${maxText}`;
  }

  if (ticketPrice != null) {
    return formatVndAmount(ticketPrice, currencyCode);
  }

  return fallback;
};
