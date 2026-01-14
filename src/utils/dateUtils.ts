export const getMonthName = (month: number): string => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[month - 1] || 'Inconnu';
};

export const formatInvoicePeriod = (month: number, year: number): string => {
  return `${getMonthName(month)} ${year}`;
};

export const getMonthOptions = () => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  return months.map((name, index) => ({
    value: index + 1,
    label: name
  }));
};

export const getYearOptions = (yearsRange: number = 3) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let i = -1; i <= yearsRange - 2; i++) {
    years.push(currentYear + i);
  }
  
  return years.map(year => ({
    value: year,
    label: year.toString()
  }));
};