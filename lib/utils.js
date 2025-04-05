import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Enhanced generateId function to match the behavior of the AI-SDK
export function generateId(length = 8) {
  // Create a random string using crypto if available, falling back to Math.random
  let id = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    id = Array.from(array)
      .map((byte) => characters[byte % characters.length])
      .join("");
  } else {
    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  }

  return id;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
