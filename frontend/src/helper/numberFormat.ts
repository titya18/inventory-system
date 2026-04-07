export const truncateNumber = (num: number, digits: number) => {
  const factor = Math.pow(10, digits);
  return Math.floor(num * factor) / factor;
};