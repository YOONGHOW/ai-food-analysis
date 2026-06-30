import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI client if key is configured
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Helper function to search the web for free using DuckDuckGo HTML version
async function searchWeb(query: string): Promise<string[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();

    const snippets: string[] = [];
    const regex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const cleanSnippet = match[1]
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      snippets.push(cleanSnippet);
    }
    return snippets;
  } catch (err) {
    console.error("[Web Search Error] DuckDuckGo search failed:", err);
    return [];
  }
}

// Helper to safely clean and parse JSON response from Gemini, handling trailing commas and formatting quirks
function cleanAndParseJSON(text: string) {
  let cleanText = text.trim();
  // Strip markdown code blocks if the LLM returned them
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.substring(3);
  }
  if (cleanText.endsWith("```")) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  cleanText = cleanText.trim();

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.warn("[JSON Parse Warning] Strict parsing failed, attempting cleanup on:", cleanText);
    // Remove trailing commas before array/object closing brackets
    let repaired = cleanText.replace(/,\s*([\]}])/g, '$1');
    // Ensure all keys are double-quoted
    repaired = repaired.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":');
    // Convert single quoted values to double quoted values safely
    // (A very basic replacement for common single quotes issues)
    repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');

    return JSON.parse(repaired);
  }
}

// Helper function to call Gemini and generate structured menu
async function generateMenu(placeId: string, name: string, vicinity: string, reviews: any[]) {
  if (!genAI) return null;
  try {
    // 1. Search the web for menu items first
    console.log(`[Web Search] Querying DuckDuckGo for "${name} ${vicinity} menu popular dishes"...`);
    const searchResults = await searchWeb(`"${name}" ${vicinity} menu popular dishes`);
    console.log(`[Web Search] Found ${searchResults.length} snippets.`);

    console.log(`[Gemini Research] Generating menu for "${name}"...`);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are a professional Malaysian food critic and researcher.
      Task: Generate a list of 5 popular menu items (dishes) for the following restaurant.
      
      Restaurant Name: ${name}
      Location/Vicinity Info: ${vicinity}
      
      ${searchResults.length > 0 ? `Web Search Results:
      ${searchResults.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}` : ''}
      
      Customer Reviews:
      ${reviews.slice(0, 3).map(r => `- ${r.text.substring(0, 250)}`).join('\n')}
      
      Instructions:
      1. Extract actual dishes mentioned by customers in the web search results and reviews, and estimate their price in RM (Malaysian Ringgit).
      2. If neither web search nor reviews mention enough dishes, use your general knowledge of this specific restaurant or its cuisine type to create highly realistic, signature Malaysian dishes.
      3. Ensure the prices are realistic for the location and style (e.g. cheaper for hawkers/kopitiams, moderate for cafes, expensive for fine dining).
      4. You MUST return a JSON array containing objects with these exact keys: "name" (dish name), "desc" (short description), and "price" (format: "RM XX.XX").
      
      Example JSON Output:
      [
        { "name": "Nasi Lemak Ayam Goreng Berempah", "desc": "Fragrant coconut rice with crispy spiced fried chicken", "price": "RM 12.50" }
      ]
    `;

    const geminiResult = await model.generateContent(prompt);
    const text = geminiResult.response.text();
    const menuHighlights = cleanAndParseJSON(text);

    // Log token usage to database asynchronously
    const usage = geminiResult.response.usageMetadata;
    if (usage && supabase) {
      supabase
        .from('token_usage')
        .insert({
          place_id: placeId,
          restaurant_name: name,
          prompt_tokens: usage.promptTokenCount,
          completion_tokens: usage.candidatesTokenCount,
          total_tokens: usage.totalTokenCount
        })
        .then(({ error: tokenError }) => {
          if (tokenError) {
            console.error("[Supabase Token Log Error] Failed to log token usage:", tokenError.message);
          } else {
            console.log(`[Token Log] Logged ${usage.totalTokenCount} tokens for "${name}" in Supabase.`);
          }
        });
    }

    return menuHighlights;
  } catch (err: any) {
    console.error("[Gemini Research Error] Failed to generate menu highlights:", err.message || err);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('placeId');
  const apiKey = process.env.GOOGLE_PLACE_API_KEY;

  if (!placeId) {
    return NextResponse.json({ error: 'Missing placeId parameter' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key is not configured' }, { status: 500 });
  }

  // 1. Check DB Cache First (if Supabase is configured)
  if (supabase) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    try {
      const { data: cachedDetails, error: cacheError } = await supabase
        .from('details_cache')
        .select('*')
        .eq('id', placeId)
        .gt('created_at', fourteenDaysAgo.toISOString())
        .single();

      if (!cacheError && cachedDetails) {
        console.log(`[Cache HIT] Found details for place ID "${placeId}" in Supabase.`);

        let menuHighlights = cachedDetails.menu_highlights;

        // Self-Healing Cache: If details exist but menu highlights are missing (because they were cached before Gemini was set up),
        // we generate the menu highlights now and update the database cache!
        if ((!menuHighlights || menuHighlights.length === 0) && genAI) {
          console.log(`[Cache Self-Heal] Menu highlights missing in DB for "${cachedDetails.name}". Generating now...`);
          menuHighlights = await generateMenu(placeId, cachedDetails.name, cachedDetails.vicinity, cachedDetails.reviews || []);
          if (menuHighlights) {
            await supabase
              .from('details_cache')
              .update({ menu_highlights: menuHighlights })
              .eq('id', placeId);
            console.log(`[Cache Self-Heal] Successfully updated menu highlights for "${cachedDetails.name}" in Supabase.`);
          }
        }

        return NextResponse.json({
          details: {
            id: cachedDetails.id,
            name: cachedDetails.name,
            rating: cachedDetails.rating,
            userRatingsTotal: cachedDetails.user_ratings_total,
            vicinity: cachedDetails.vicinity,
            mapsUrl: cachedDetails.maps_url,
            website: cachedDetails.website,
            phoneNumber: cachedDetails.phone_number,
            weekdayText: cachedDetails.weekday_text || [],
            photos: cachedDetails.photos || [],
            reviews: cachedDetails.reviews || [],
            menuHighlights // Return the self-healed menu highlights
          }
        });
      }
    } catch (err) {
      console.error("Supabase error during details cache check:", err);
    }
  }

  // 2. Cache Miss: Query Google Places Details API
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews,photos,url,website,formatted_phone_number,opening_hours,vicinity&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places Details API Error:', data);
      return NextResponse.json({ error: data.error_message || data.status || 'Failed to fetch details' }, { status: 500 });
    }

    const result = data.result;

    const details = {
      id: placeId,
      name: result.name,
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      vicinity: result.vicinity,
      mapsUrl: result.url,
      website: result.website,
      phoneNumber: result.formatted_phone_number,
      openNow: result.opening_hours?.open_now,
      weekdayText: result.opening_hours?.weekday_text || [],
      photos: (result.photos || []).slice(0, 5).map((p: any) => p.photo_reference),
      reviews: (result.reviews || []).map((r: any) => ({
        author: r.author_name,
        profilePhoto: r.profile_photo_url,
        rating: r.rating,
        relativeTime: r.relative_time_description,
        text: r.text,
      })),
    };

    // 3. Generate Menu Highlights using Gemini AI (if configured)
    const menuHighlights = await generateMenu(placeId, details.name, details.vicinity, details.reviews);

    // 4. Save to DB Cache asynchronously (if Supabase is configured)
    if (supabase) {
      const dbRow: any = {
        id: details.id,
        name: details.name,
        rating: details.rating,
        user_ratings_total: details.userRatingsTotal,
        vicinity: details.vicinity,
        maps_url: details.mapsUrl,
        website: details.website,
        phone_number: details.phoneNumber,
        weekday_text: details.weekdayText,
        photos: details.photos,
        reviews: details.reviews,
        menu_highlights: menuHighlights
      };

      supabase
        .from('details_cache')
        .upsert(dbRow, { onConflict: 'id' })
        .then(({ error: insertError }) => {
          if (insertError) {
            console.error("[Supabase Details Cache Write Error] Failed to write cache:", insertError.message);
          } else {
            console.log(`[Cache WRITE] Cached details with menu highlights for place ID "${placeId}" in Supabase.`);
          }
        });
    }

    return NextResponse.json({
      details: {
        ...details,
        menuHighlights
      }
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
