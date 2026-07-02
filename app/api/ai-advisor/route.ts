import { NextResponse } from 'next/server';
import { join } from 'path';
import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

function cleanAndParseJSON(text: string) {
  let cleanText = text.trim();
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
    // Basic repair if needed
    const repaired = cleanText
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"');
    return JSON.parse(repaired);
  }
}

export async function POST(request: Request) {
  if (!genAI) {
    return NextResponse.json(
      { error: 'Gemini API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const { physicalFeeling, emotionalMood, craving, healthFocus, appetiteSize, dietaryPreference } = await request.json();

    // 1. Read the local foods catalog
    const filePath = join(process.cwd(), 'public', 'data', 'malaysian_foods.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const foods = JSON.parse(fileContents);

    // 2. Format the catalog for the LLM
    const foodListMarkdown = foods.map((f: any) => 
      `- ID: ${f.id} | Name: ${f.name} | Cuisine: ${f.cuisine} | Category: ${f.category} | Style: ${f.style} | Flavor: ${f.flavor} | Halal: ${f.halal ? 'Yes' : 'No'} | Description: ${f.description}`
    ).join('\n');

    // 3. Build the prompt
    const prompt = `
You are the "AI Food Matcher", an expert local Malaysian food critic, nutritionist, and culinary guide.
Your task is to select and prescribe the SINGLE best food item from our menu below that matches the user's physical feeling, emotional mood, craving profile, health goals, appetite, and dietary guidelines.

User Profile & State:
- How they feel physically: "${physicalFeeling}"
- Current emotional mood: "${emotionalMood}"
- Craving profile: "${craving}"
- Health / Diet focus: "${healthFocus}"
- Appetite size: "${appetiteSize}"
- Dietary Preference: ${dietaryPreference === 'halal' ? 'Halal Only' : dietaryPreference === 'non-halal' ? 'Non-Halal Only (must be non-halal in the database)' : 'Show All (both halal and non-halal)'}

Menu Database (Format: ID | Name | Cuisine | Category | Style | Flavor | Halal | Description):
${foodListMarkdown}

Instructions & Rules:
1. You MUST select EXACTLY ONE food item from the Menu Database above. You must identify it by its exact "ID" (e.g. food-014).
2. Dietary Rules:
   - If the user selected "Halal Only", you MUST ONLY select a food item that has "Halal: Yes".
   - If the user selected "Non-Halal Only", you MUST ONLY select a food item that has "Halal: No" (typically Chinese dishes containing pork or lard, such as Bak Kut Teh, Penang Char Kway Teow, KL Hokkien Mee, Wonton Mee, etc.). Do not recommend a Halal dish if they choose Non-Halal.
   - If the user selected "Show All", you can select any food item regardless of its Halal status.
3. You must write an empathetic, friendly, and detailed paragraph of 3-4 sentences in "explanation" describing:
   - Why this specific dish fits their current mood and physical feeling.
   - How it aligns with their health/diet focus (e.g., if their focus is "Sore Throat / Immune Boost", explain how the warm broth, spices, or soothing properties will help relieve discomfort; if "Weight Loss", explain how it is a lighter, calorie-conscious option; if "High Protein", highlight the protein ingredients, etc.).
   - Make it sound encouraging, welcoming, and warm. Use bold markdown keywords for emphasis.
4. You MUST respond with a JSON object containing exactly these three fields: "foodId" (the matching ID), "foodName" (the name of the dish), and "explanation" (your Markdown-formatted advice). Do not include any text, headers, or markdown formatting blocks outside of the JSON object.

Example JSON Output:
{
  "foodId": "food-014",
  "foodName": "Curry Laksa / Curry Mee",
  "explanation": "Since you are feeling **cold** and craving something **spicy**, Curry Laksa is the perfect remedy! The hot coconut curry broth will instantly warm you up, while the protein from the chicken and tofu puffs aligns with your **high-protein** goal. It's a comforting bowl that will lift your mood and keep you satisfied."
}
`;

    // 4. Request generation
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const recommendation = cleanAndParseJSON(text);

    return NextResponse.json(recommendation);
  } catch (err: any) {
    console.error('[AI Advisor Error]:', err.message || err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during AI analysis' },
      { status: 500 }
    );
  }
}
