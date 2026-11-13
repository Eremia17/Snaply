import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const lastModified = new Date();
  return [
    { url: new URL("/", siteUrl).toString(), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: new URL("/tasks", siteUrl).toString(), lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: new URL("/help", siteUrl).toString(), lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
