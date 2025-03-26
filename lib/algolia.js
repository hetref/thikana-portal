import algoliasearch from "algoliasearch/lite";

// Replace these with your actual Algolia credentials
// Ideally, these should be in environment variables
export const ALGOLIA_APP_ID =
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "YOUR_ALGOLIA_APP_ID";
export const ALGOLIA_API_KEY =
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY ||
  "YOUR_ALGOLIA_SEARCH_API_KEY";
export const ALGOLIA_INDEX_NAME =
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "businesses";

// Initialize Algolia client
export const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);

// Initialize default index
export const businessIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);

// Helper function to perform a search
export const performSearch = async (query, options = {}) => {
  try {
    const result = await businessIndex.search(query, {
      hitsPerPage: 8,
      ...options,
    });
    return result;
  } catch (error) {
    console.error("Algolia search error:", error);
    return { hits: [] };
  }
};
