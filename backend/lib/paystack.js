// import PaystackPop from "@paystack/inline-js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// export const paystack = new PaystackPop(process.env.PAYSTACK_SECRET_KEY);

const paystackAPI = axios.create({
  baseURL: process.env.PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export const initializePayment = async (data) => {
  try {
    const response = await paystackAPI.post("/transaction/initialize", data);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Payment initialization failed"
    );
  }
};

export const verifyPayment = async (reference) => {
  try {
    const response = await paystackAPI.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Payment verification failed"
    );
  }
};
