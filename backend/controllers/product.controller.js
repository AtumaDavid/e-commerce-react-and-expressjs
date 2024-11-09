import cloudinary from "../lib/cloudinary.js";
import Product from "../model/product.model.js";

// In-memory cache for featured products
let featuredProductsCache = null;
let cacheExpirationTime = 0; // Timestamp of when cache expires
const CACHE_DURATION = 60 * 60 * 1000; // Cache duration in milliseconds (1 hour)

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json({ products });
  } catch (error) {
    console.log("Error in getAllProducts conntroller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Featured products (uses cache)
export const getFeaturedProducts = async (req, res) => {
  try {
    // Check if cache is valid
    if (featuredProductsCache && Date.now() < cacheExpirationTime) {
      return res.json({ featuredProducts: featuredProductsCache });
    }

    // If cache is expired or empty, fetch from database
    const featuredProducts = await Product.find({ isFeatured: true }).lean(); //.lean() will return a plain javascript object instead of a mongodb document which is good for performance

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    // Update in-memory cache
    featuredProductsCache = featuredProducts;
    cacheExpirationTime = Date.now() + CACHE_DURATION;

    res.json(featuredProducts);
  } catch (error) {
    console.log("Error in getFeaturedProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    let cloudinaryResponse = null;
    if (image) {
      await cloudinary.uploader.upload(image, { folder: "products" });
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse.secure_url
        : "",
      category,
    });

    res.status(201).json(product);
  } catch (error) {
    console.log("Error in createProduct controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("image deleted from cloudinary");
      } catch (error) {
        console.log("Error deleting image from cloudinary", error.message);
      }
    }
    await Product.findByIdAndDelete(req.params.id);
  } catch (error) {
    console.log("Error in deleteProduct controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          price: 1,
          image: 1,
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    console.log("Error in getRecommendedProducts controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const products = await Product.find({ category });
    res.json(products);
  } catch (error) {
    console.log("Error in getProductsByCategory controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.isFeatured = !product.isFeatured;
      const updatedProduct = await product.save();

      // Update the featured products cache after toggling
      await updateFeaturedProductsCache();

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "product not found" });
    }
  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();

    // update in-memory cache
    featuredProductsCache = featuredProducts;
    cacheExpirationTime = Date.now() + CACHE_DURATION;
  } catch (error) {
    console.log("Error in updateFeaturedProductsCache", error.message);
  }
}
