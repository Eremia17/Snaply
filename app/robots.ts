import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/tasks", "/help"], disallow: ["/dashboard", "/admin", "/profile", "/wallet", "/submissions", "/auth", "/reset-password"] },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
