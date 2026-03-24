import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/guide/dashboard",
          "/guide/onboarding",
          "/dashboard",
          "/messages",
          "/waiver/",
          "/review/",
          "/itinerary/",
        ],
      },
    ],
    sitemap: "https://romlife.co/sitemap.xml",
  };
}
