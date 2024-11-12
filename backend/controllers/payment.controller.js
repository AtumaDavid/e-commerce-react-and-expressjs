import { initializePayment, verifyPayment } from "../lib/paystack.js";
import Coupon from "../model/coupon.model.js";
import Order from "../model/order.model.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }

    let totalAmount = 0;
    products.forEach((product) => {
      totalAmount += product.price * product.quantity;
    });

    // Handle coupon discount if provided
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });

      if (coupon) {
        totalAmount -= Math.round(
          (totalAmount * coupon.discountPercentage) / 100
        );
      }
    }

    // Convert amount to kobo (Paystack uses the smallest currency unit)
    const amount = Math.round(totalAmount * 100);

    // Initialize Paystack payment
    const paymentData = {
      email: req.user.email,
      amount,
      metadata: {
        userId: req.user._id,
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((p) => ({
            id: p._id,
            quantity: p.quantity,
            price: p.price,
          }))
        ),
        // items: items.map((item) => ({
        //   id: item.id,
        //   quantity: item.quantity,
        // })),
      },
      callback_url: `${process.env.CLIENT_URL}/payment/callback`,
      // Optional: Add custom fields if needed
      customfields: [
        {
          display_name: "Order Type",
          variable_name: "order_type",
          value: "product_purchase",
        },
      ],
    };

    const paystackResponse = await initializePayment(paymentData);

    // create a pending order
    const newOrder = new Order({
      user: req.user._id,
      products: products.map((product) => ({
        product: product._id,
        quantity: product.quantity,
        price: product.price,
      })),
      totalAmount,
      paymentSessionId: paystackResponse.data.reference, // Store reference as session ID
    });

    await newOrder.save();

    // If total amount qualifies, create a new coupon
    if (totalAmount >= 200) {
      await createNewCoupon(req.user._id);
    }

    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        totalAmount,
        orderId: newOrder._id,
      },
    });

    // const payment = await initializePayment(paymentData);

    // // Create pending order
    // const order = await Order.create({
    //   user: req.user._id,
    //   items: items.map((item) => ({
    //     product: item.id,
    //     quantity: item.quantity,
    //     price: item.price,
    //   })),
    //   totalAmount,
    //   paymentReference: payment.data.reference,
    //   status: "pending",
    // });

    // return res.status(200).json({
    //   success: true,
    //   data: {
    //     authorizationUrl: payment.data.authorization_url,
    //     reference: payment.data.reference,
    //     orderId: order._id,
    //   },
    // });
  } catch (error) {
    console.error("Checkout session error:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      message: error.message,
    });
  }
};

export const verifyPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.body;

    // Verify payment using your library
    const verificationResponse = await verifyPayment(reference);

    if (verificationResponse.data.status === "success") {
      // Find and update the order
      const order = await Order.findOne({ paymentSessionId: reference });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // If payment used a coupon, deactivate it
      if (verificationResponse.data.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: verificationResponse.data.metadata.couponCode,
            userId: verificationResponse.data.metadata.userId,
          },
          {
            isActive: false,
          }
        );
      }

      // Update order status or any other necessary fields
      //   order = "paid"; // Add this field to your schema if needed
      await order.save();

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
          orderId: order._id,
          amount: verificationResponse.data.amount / 100, // Convert back from kobo
          paymentDate: verificationResponse.data.paid_at,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
        status: verificationResponse.data.status,
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

async function createNewCoupon(userId) {
  await Coupon.findOneAndDelete({ userId });
  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    userId: userId,
  });
  await newCoupon.save();
  return newCoupon;
}
