import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "nodejs";

// Image metadata
export const contentType = "image/png";

// Generate dynamic icon sizes for Browser Favicon and PWA
export default function Icon({
  searchParams = {},
}: {
  searchParams?: { size?: string };
}) {
  const size = searchParams?.size ? parseInt(searchParams.size, 10) : 32;
  const iconSize = Math.round(size * 0.6);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#dc2626", // brand red-600
        borderRadius: size > 48 ? "24%" : "20%",
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    </div>,
    {
      width: size,
      height: size,
    },
  );
}
