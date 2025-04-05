// Date utilities for analytics

// Get current year
export const currentYear = new Date().getFullYear();

// Month names
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Short month names
export const shortMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Format a date as YYYY-MM (useful for monthly analytics)
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string (YYYY-MM)
 */
export const formatYearMonth = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Convert a Firebase timestamp to a JavaScript Date
 * @param {Object} timestamp - Firebase timestamp
 * @returns {Date} JavaScript Date object
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

/**
 * Get the current month and year as a formatted string
 * @returns {string} Current month and year (YYYY-MM)
 */
export const getCurrentMonthYear = () => {
  return formatYearMonth(new Date());
};

/**
 * Get an array of the last N months as YYYY-MM strings
 * @param {number} count - Number of months to include
 * @returns {Array} Array of month strings
 */
export const getLastNMonths = (count = 6) => {
  const result = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(formatYearMonth(date));
  }

  return result;
};

/**
 * Format a date for display
 * @param {Date|Object} date - Date to format (can be Date or Firebase timestamp)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const jsDate = date?.toDate ? date.toDate() : new Date(date);

  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return jsDate.toLocaleDateString("en-US", mergedOptions);
};
