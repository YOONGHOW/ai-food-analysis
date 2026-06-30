import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoReference = searchParams.get('ref');
  const apiKey = process.env.GOOGLE_PLACE_API_KEY;

  if (!photoReference) {
    return new Response('Missing photo reference', { status: 400 });
  }
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new Response('Failed to fetch image from Google', { status: res.status });
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await res.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error proxying photo:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
