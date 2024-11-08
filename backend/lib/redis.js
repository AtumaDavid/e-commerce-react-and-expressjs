import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

export const redis = new Redis({
  url: "https://picked-whale-25158.upstash.io",
  token: process.env.UPSTASH_RDIS_TOKEN,
});

// const data = await redis.set("foo", "bar");
