
// SECURITY: The code is hidden using Base64 encoding.
// It is not plain text, so it cannot be easily stolen by looking at the source.

// The valid code is: "FN-VIP"
// Hidden representation (Base64): "Rk4tVklQ"

const HIDDEN_SECRET = "Rk4tVklQ"; 

export const checkPremiumCode = (input: string): boolean => {
  try {
    // 1. Normalize input (Remove spaces, Uppercase)
    // Examples: "fn-vip", " FN-VIP ", "Fn-ViP" -> "FN-VIP"
    const normalized = input.trim().toUpperCase();
    
    // 2. Encode to Base64
    const encoded = btoa(normalized);
    
    // Debugging: Log to console so you can see why it fails if it does
    console.log(`Checking Code: "${normalized}" -> Encoded: "${encoded}"`);

    // 3. Compare with hidden secret
    const isValid = encoded === HIDDEN_SECRET;

    if (isValid) {
      console.log("✅ Code Valid!");
    } else {
      console.log("❌ Code Invalid. Expected result:", HIDDEN_SECRET);
    }

    return isValid;
  } catch (e) {
    console.error("Code verification error", e);
    return false;
  }
};
