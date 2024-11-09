import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/products.route.js";
import { connectionDB } from "./lib/db.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); //allows you to parse the body of the request.
app.use(cookieParser());

// auth
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

app.listen(PORT, () => {
  console.log("server is running " + PORT);
  connectionDB();
});

// lpjtod2kIQUYooqi

// atumadavid35
