/**
 * Creates a Razorpay order using the business ID and amount
 *
 * @param {string} businessId - The ID of the business to create the order for
 * @param {number} amount - The order amount
 * @returns {Promise<Object>} The order details including orderId and keyId
 */
export const createRazorpayOrder = async (businessId, amount) => {
  console.log(
    `Creating Razorpay order for business ${businessId} with amount ${amount}`
  );

  try {
    // Use relative URL to ensure it works correctly with Next.js routing
    const apiUrl = "/api/create-product-order";
    console.log("Calling API endpoint:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: businessId, amount }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error ${response.status}: ${response.statusText}`,
        errorText
      );
      throw new Error(
        `Failed to create order: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Order created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in createRazorpayOrder:", error);
    throw error;
  }
};
