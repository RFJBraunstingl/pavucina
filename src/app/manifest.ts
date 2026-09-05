import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pavucina",
    short_name: "Pavucina",
    description: "Plan hierarchical tasks on a timeline.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef6f1",
    theme_color: "#0d5f40",
    icons: [
      {
        src: "/pavucina-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pavucina-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pavucina-icon-1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/pavucina-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
