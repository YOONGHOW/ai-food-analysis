import { NextResponse } from 'next/server';

const STATE_NORMALIZATION: { [key: string]: string } = {
  "Melaka": "Malacca",
  "Pulau Pinang": "Penang",
  "Wilayah Persekutuan Kuala Lumpur": "Kuala Lumpur",
  "Kuala Lumpur": "Kuala Lumpur",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat or lng parameter' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key is not configured' }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Google Reverse Geocoding API Error:', data);
      return NextResponse.json({ error: data.error_message || data.status || 'Failed to geocode location' }, { status: 500 });
    }

    let state = "";
    let place = "";

    // Loop through results to find state and locality/sublocality
    for (const result of data.results) {
      const components = result.address_components;
      
      const stateComp = components.find((c: any) => c.types.includes("administrative_area_level_1"));
      const localityComp = components.find((c: any) => c.types.includes("locality"));
      const sublocalityComp = components.find((c: any) => c.types.includes("sublocality_level_1"));
      const admin2Comp = components.find((c: any) => c.types.includes("administrative_area_level_2"));

      if (stateComp && !state) {
        state = stateComp.long_name;
      }
      
      if (!place) {
        if (sublocalityComp) {
          place = sublocalityComp.long_name;
        } else if (localityComp) {
          place = localityComp.long_name;
        } else if (admin2Comp) {
          place = admin2Comp.long_name;
        }
      }

      if (state && place) break;
    }

    // Apply normalization map for Malaysian states
    if (state && STATE_NORMALIZATION[state]) {
      state = STATE_NORMALIZATION[state];
    }

    // If place is still not found, fallback to capital or generic
    if (!place && state) {
      place = "George Town"; // safe fallback
    }

    return NextResponse.json({ state, place });
  } catch (error) {
    console.error('Error in reverse geocoding endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
