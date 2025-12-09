export const formatCurrencyPtBr = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const parseCurrencyInputToNumber = (value: string, maxDigits = 12) => {
  const digitsOnly = (value || '').replace(/\D/g, '').slice(0, maxDigits);
  return digitsOnly ? Number(digitsOnly) / 100 : 0;
};

export const formatCurrencyInputMask = (value: string, maxDigits = 12) => {
  const numeric = parseCurrencyInputToNumber(value, maxDigits);
  return formatCurrencyPtBr(numeric);
};
