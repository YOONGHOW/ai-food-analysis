import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CAPITALS: { [key: string]: string } = {
  "Johor": "1.4927,103.7414", // Johor Bahru
  "Kedah": "6.1210,100.3601", // Alor Setar
  "Kelantan": "6.1254,102.2386", // Kota Bharu
  "Malacca": "2.1896,102.2501", // Malacca City
  "Negeri Sembilan": "2.7258,101.9424", // Seremban
  "Pahang": "3.8077,103.3260", // Kuantan
  "Penang": "5.4141,100.3288", // George Town
  "Perak": "4.5975,101.0901", // Ipoh
  "Perlis": "6.4414,100.1986", // Kangar
  "Sabah": "5.9804,116.0753", // Kota Kinabalu
  "Sarawak": "1.5533,110.3592", // Kuching
  "Selangor": "3.0738,101.5183", // Shah Alam
  "Terengganu": "5.3302,103.1408", // Kuala Terengganu
  "Kuala Lumpur": "3.1390,101.6869" // KL
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'Penang';
  const place = searchParams.get('place') || 'George Town';
  const radius = searchParams.get('radius') || '10000'; // 10km radius
  const keyword = searchParams.get('keyword') || 'food';
  const refresh = searchParams.get('refresh') === 'true';

  if (!state || !place) {
    return NextResponse.json({ error: 'Missing state or place parameter' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key is not configured' }, { status: 500 });
  }

  // 1. Check DB Cache First (if Supabase is configured and not forced refresh)
  if (supabase && !refresh) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    try {
      const { data: cachedPlaces, error: cacheError } = await supabase
        .from('places_cache')
        .select('*')
        .eq('state', state)
        .eq('place_name', place)
        .eq('radius', Number(radius))
        .gt('created_at', sevenDaysAgo.toISOString());

      if (!cacheError && cachedPlaces && cachedPlaces.length > 0) {
        console.log(`[Cache HIT] Found ${cachedPlaces.length} places for "${place}, ${state}" in Supabase.`);
        const formattedPlaces = cachedPlaces.map(p => ({
          id: p.id,
          name: p.name,
          rating: p.rating,
          userRatingsTotal: p.user_ratings_total,
          priceLevel: p.price_level,
          vicinity: p.vicinity,
          location: { lat: p.latitude, lng: p.longitude },
          openNow: p.open_now,
          photoReference: p.photo_reference,
        }));
        return NextResponse.json({ places: formattedPlaces });
      }
      
      if (cacheError) {
        console.warn("Supabase cache query error:", cacheError.message);
      }
    } catch (err) {
      console.error("Supabase error during cache retrieval:", err);
    }
  }

  // 2. Cache Miss: Run Geocoding and call Google Places API
  let location = CAPITALS[state] || '5.4141,100.3288'; // Default Penang fallback

  try {
    const address = `${place}, ${state}, Malaysia`;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (geocodeData.status === 'OK' && geocodeData.results?.[0]?.geometry?.location) {
      const { lat, lng } = geocodeData.results[0].geometry.location;
      location = `${lat},${lng}`;
      console.log(`[Google Geocoding] Geocoded "${address}" to ${location}`);
    } else {
      console.warn(`[Google Geocoding] Failed for "${address}". Status: ${geocodeData.status}. Using fallback: ${location}`);
    }
  } catch (err) {
    console.error("Geocoding API call error, using fallback capital:", err);
  }

  let apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=restaurant&keyword=${keyword}&key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API Error:', data);
      return NextResponse.json({ error: data.error_message || data.status || 'Failed to fetch places' }, { status: 500 });
    }

    const places = data.results.map((place: any) => ({
      id: place.place_id,
      name: place.name,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      vicinity: place.vicinity,
      location: place.geometry.location,
      openNow: place.opening_hours?.open_now,
      photoReference: place.photos?.[0]?.photo_reference,
    }));

    // 3. Save to DB Cache asynchronously (if Supabase is configured and we have places)
    if (supabase && places.length > 0) {
      const dbRows = places.map((p: any) => ({
        id: p.id,
        name: p.name,
        rating: p.rating,
        user_ratings_total: p.userRatingsTotal,
        price_level: p.priceLevel,
        vicinity: p.vicinity,
        latitude: p.location.lat,
        longitude: p.location.lng,
        open_now: p.openNow,
        photo_reference: p.photoReference,
        state: state,
        place_name: place,
        radius: Number(radius),
      }));

      supabase
        .from('places_cache')
        .upsert(dbRows, { onConflict: 'id' })
        .then(({ error: insertError }) => {
          if (insertError) {
            console.error("[Supabase Cache Write Error] Failed to write cache:", insertError.message);
          } else {
            console.log(`[Cache WRITE] Cached ${places.length} places for "${place}, ${state}" in Supabase.`);
          }
        });
    }

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Error fetching places:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
