import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "nodejs";

// Image metadata
export const contentType = "image/png";

// Generate dynamic icon sizes for PWA based on query params
export default function Icon({
  searchParams = {},
}: {
  searchParams?: { size?: string };
}) {
  const size = searchParams?.size ? parseInt(searchParams.size, 10) : 192;

  return new ImageResponse(
    <div
      style={{
        fontSize: size * 0.5,
        background: "#e11d48", // rose-600
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        borderRadius: "20%",
      }}
    >
      R
    </div>,
    {
      width: size,
      height: size,
    },
  );
}
