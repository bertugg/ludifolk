import type { MetadataRoute } from "next";

// Makes Ludifolk installable ("Add to Home screen" / Install app on Android)
// and is what a Trusted Web Activity wraps for the Play Store. Colors match
// the cream app background so the splash screen and status bar blend in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ludifolk",
    short_name: "Ludifolk",
    description: "Log what happened at game night.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf5ee",
    theme_color: "#fbf5ee",
    categories: ["games", "social", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
