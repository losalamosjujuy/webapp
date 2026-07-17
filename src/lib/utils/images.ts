import { propertyImages } from "@/data/property-images";

const PUBLIC_IMAGE_PREFIX = "/images/";
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const DATA_URL_PATTERN = /^data:/i;
const BLOB_URL_PATTERN = /^blob:/i;

export function resolvePublicImage(src?: string | null, fallback: string = propertyImages.hero) {
  if (!src) {
    return fallback;
  }

  if (ABSOLUTE_URL_PATTERN.test(src) || DATA_URL_PATTERN.test(src) || BLOB_URL_PATTERN.test(src)) {
    return src;
  }

  if (src.startsWith(PUBLIC_IMAGE_PREFIX)) {
    return src;
  }

  if (src.startsWith("images/")) {
    return `/${src}`;
  }

  return fallback;
}
