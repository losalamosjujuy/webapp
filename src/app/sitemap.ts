import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://losalamostilcara.com",
      lastModified: new Date("2026-07-04")
    }
  ];
}
