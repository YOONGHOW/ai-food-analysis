import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default async function Icon() {
  let base64Logo = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoBuffer = fs.readFileSync(logoPath);
    base64Logo = logoBuffer.toString("base64");
  } catch (e) {
    console.error("Failed to read logo.png for favicon generation:", e);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        {base64Logo ? (
          <img
            src={`data:image/png;base64,${base64Logo}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            alt="Logo"
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(to right, #f97316, #f43f5e)",
              borderRadius: "50%",
            }}
          />
        )}
      </div>
    ),
    {
      ...size,
    }
  );
}
