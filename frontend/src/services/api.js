const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const signupCustomer = async ({ name, email, referralCode }) => {
  const response = await fetch(`${BASE_URL}/api/customers/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, referralCode }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Signup failed. Please try again.");
  }
  return data;
};

export const getPosition = async (email) => {
  const response = await fetch(
    `${BASE_URL}/api/customers/position/${encodeURIComponent(email)}`
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Could not find position.");
  }
  return data;
};
