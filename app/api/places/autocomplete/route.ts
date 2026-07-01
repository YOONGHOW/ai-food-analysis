import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");
  const apiKey = process.env.GOOGLE_PLACE_API_KEY;

  if (!input) {
    return NextResponse.json({ error: "Missing input parameter" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key is not configured" }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&components=country:my&types=geocode&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ error: data.error_message || `API error: ${data.status}` }, { status: 500 });
    }

    const predictions = (data.predictions || []).map((p: any) => ({
      description: p.description,
      mainText: p.structured_formatting?.main_text || "",
    }));

    return NextResponse.json({ predictions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
