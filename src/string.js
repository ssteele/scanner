export const showCase = (string) => {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

export const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
