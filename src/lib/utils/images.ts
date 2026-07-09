import { propertyImages } from "@/data/property-images";

const PUBLIC_IMAGE_PREFIX = "/images/";

export function resolvePublicImage(src?: string | null, fallback: string = propertyImages.hero) {
  if (!src) {
    return fallback;
  }

  if (src.startsWith(PUBLIC_IMAGE_PREFIX)) {
    return src;
  }

  if (src.startsWith("images/")) {
    return `/${src}`;
  }

  return fallback;
}
