import Product from "../model/product.model.js";

export const getCartProducts = async (req, res) => {
  try {
    // Fetch products from the database where the product IDs are in the user's cartItems
    const products = await Product.find({ _id: { $in: req.user.cartItems } });

    // Map through the fetched products to create an array of cart items with their quantities
    const cartItems = products.map((product) => {
      // Find the corresponding cart item for the current product
      const item = req.user.cartItems.find(
        (cartItem) => cartItem.id === product.id // Match the product ID with the cart item ID
      );
      return {
        ...product.toJSON(),
        quantity: item.quantity, // get quantity from cart item
      };
    });

    res.json(cartItems);
  } catch (error) {
    console.log("error in the getCarProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    // console.log(req.user);
    // console.log("This is a test log");
    // res.send("Test route reached!");
    const existingItem = user.cartItems.find((item) => item.id === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push(productId);
    }
    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    // Access the currently authenticated user from the request object
    const user = req.user;
    if (!productId) {
      // If no productId is given, clear the entire cart by setting cartItems to an empty array
      user.cartItems = [];
    } else {
      // If a productId is provided, filter the cartItems to remove the specified item
      user.cartItems = user.cartItems.filter((item) => item.id !== productId);
    }
    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.log("Error in removeAllFromCart controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

export const updateQunatity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;
    // Find the existing item in the user's cart that matches the product ID
    const existingItem = user.cartItems.find((item) => item.id === productId);

    // Check if the item exists in the cart
    if (existingItem) {
      // If the quantity is set to 0, remove the item from the cart
      if (quantity === 0) {
        user.cartItems = user.cartItems.filter((item) => item.id !== productId);
        await user.save();
        return res.json(user.cartItems);
      }

      // If quantity is not 0, update the existing item's quantity
      existingItem.quantity = quantity;
      await user.save();
      res.json(user.cartItems);
    } else {
      // If the item is not found in the cart, return a 404 error
      res.status(404).json({ message: "product not found" });
    }
  } catch (error) {
    console.log("Error in updateQuantity controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};
