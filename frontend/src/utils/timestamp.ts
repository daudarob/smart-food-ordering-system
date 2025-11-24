/**
 * Formats a timestamp to DD/MM/YYYY HH:MM format
 * @param isoString - ISO 8601 timestamp string, or undefined for current time
 * @returns Formatted timestamp string
 */
export const formatTimestamp = (isoString?: string): string => {
  let date: Date;
  if (isoString) {
    date = new Date(isoString);
    if (isNaN(date.getTime())) {
      date = new Date(); // fallback to current time if invalid
    }
  } else {
    date = new Date();
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};