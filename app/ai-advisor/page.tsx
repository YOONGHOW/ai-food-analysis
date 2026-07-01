"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Heart,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Activity,
  Utensils,
  ChevronRight,
  Loader2,
  Smile,
  Flame,
  LayoutDashboard
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import FoodDetailsModal from "../components/FoodDetailsModal";

interface Recommendation {
  foodId: string;
  foodName: string;
  explanation: string;
}

export default function AIAdvisorPage() {
  const router = useRouter();
  const { isFavoriteFood, toggleFavoriteFood } = useSettings();

  // Foods catalog list for rendering the matching recommended food details card
  const [foods, setFoods] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any | null>(null);

  // Survey Wizard states
  const [step, setStep] = useState(0); // 0 = Intro, 1 = Physical, 2 = Emotional, 3 = Craving, 4 = Health, 5 = Appetite, 6 = Loading, 7 = Result
  const [dietaryPreference, setDietaryPreference] = useState<"all" | "halal" | "non-halal">("all");
  const [answers, setAnswers] = useState({
    physicalFeeling: "",
    emotionalMood: "",
    craving: "",
    healthFocus: "",
    appetiteSize: ""
  });

  // AI loading and result states
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendedFoodItem, setRecommendedFoodItem] = useState<any | null>(null);

  // Cycling messages for the loading screen
  const loadingMessages = [
    "Consulting the AI Food Therapist...",
    "Analyzing your mood & energy levels...",
    "Scanning the Malaysian food database...",
    "Evaluating nutritional benefits and ingredients...",
    "Brewing the perfect culinary prescription..."
  ];

  // Load local food catalog on mount
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const res = await fetch("/data/malaysian_foods.json");
        if (res.ok) {
          const data = await res.json();
          setFoods(data);
        }
      } catch (err) {
        console.error("Failed to load foods database:", err);
      }
    };
    fetchFoods();
  }, []);

  // Interval timer for cycling loading messages
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 6) {
      timer = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [step]);

  const handleSelectOption = (key: string, value: string) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    // Go to next step
    if (step < 5) {
      setStep(prev => prev + 1);
    }
  };

  // Submit questionnaire to Gemini API endpoint
  const handleSubmitSurvey = async (finalAnswers = answers) => {
    setStep(6);
    setApiLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...finalAnswers,
          dietaryPreference
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retrieve suggestion from AI.");
      }

      setRecommendation(data);

      // Find matching food object in local list
      const matched = foods.find(f => f.id === data.foodId);
      setRecommendedFoodItem(matched || null);

      setStep(7);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Something went wrong. Please try again.");
      setStep(0); // Reset to intro on failure
    } finally {
      setApiLoading(false);
    }
  };

  const handleRestart = () => {
    setAnswers({
      physicalFeeling: "",
      emotionalMood: "",
      craving: "",
      healthFocus: "",
      appetiteSize: ""
    });
    setRecommendation(null);
    setRecommendedFoodItem(null);
    setStep(0);
  };

  // Safe client-side markdown formatter for simple **bold** tags
  const parseMarkdown = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-extrabold text-indigo-600 dark:text-indigo-400">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-full px-6 py-8 flex flex-col flex-1 max-w-3xl mx-auto justify-center min-h-[calc(100vh-64px)]">

      {/* HEADER BREADCRUMB */}
      {step > 0 && step < 6 && (
        <button
          onClick={() => setStep(prev => prev - 1)}
          className="mr-auto mb-6 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}

      {/* STEP 0: INTRO SCREEN */}
      {step === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/85 p-8 rounded-3xl shadow-xl flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-500 dark:from-white dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              AI Food Therapist
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg">
              Stuck in a food dilemma? Our AI therapist will diagnose your physical vibe, mental state, cravings, and health goals to prescribe the perfect local Malaysian dish!
            </p>
          </div>

          {/* Dietary preference selection */}
          <div className="w-full max-w-sm p-5 bg-slate-50 dark:bg-slate-950/45 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="text-left">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-350">Dietary Filter</p>
              <p className="text-[10px] text-slate-400">Filter dishes based on Halal status</p>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              {[
                { value: "all", label: "🍽️ All" },
                { value: "halal", label: "🕌 Halal" },
                { value: "non-halal", label: "🐷 Non-Halal" }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDietaryPreference(opt.value as any)}
                  className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${dietaryPreference === opt.value
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {apiError && (
            <div className="w-full max-w-md p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-semibold">
              ⚠️ {apiError}
            </div>
          )}

          <button
            onClick={() => setStep(1)}
            className="w-full max-w-xs py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Start Consultation <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* QUESTION WIZARD STEPS */}
      {step >= 1 && step <= 5 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/85 p-8 rounded-3xl shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-300">

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Therapy Session</span>
              <span>Step {step} of 5</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: PHYSICAL FEELING */}
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">How does your body feel right now?</h2>
                <p className="text-xs text-slate-400">Select your current physical state</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: "Tired / Low Energy", label: "Tired & Low Energy", desc: "Need a quick pick-me-up or stamina boost", icon: "🥱" },
                  { value: "Cold / Shivering", label: "Cold & Shivering", desc: "Craving warm soup to heat up from the inside", icon: "🥶" },
                  { value: "Hot / Sweaty", label: "Hot & Sweaty", desc: "Need something refreshing or cooling", icon: "🥵" },
                  { value: "Active / Energetic", label: "Active & Energetic", desc: "Ready for a hearty, robust local dish", icon: "⚡" },
                  { value: "Sick / Sore Throat", label: "Sore Throat / Under the Weather", desc: "Need soothing, mild, or comforting ingredients", icon: "🤢" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption("physicalFeeling", opt.value)}
                    className="group p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50/45 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/35 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: EMOTIONAL MOOD */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">What is your emotional mood?</h2>
                <p className="text-xs text-slate-400">Select the mental vibe you want to address</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: "Stressed / Overworked", label: "Stressed & Overworked", desc: "Looking for an edible hug to ease your mind", icon: "🤯" },
                  { value: "Happy / Celebratory", label: "Happy & Celebratory", desc: "Want to indulge in a rich, rewarding feast", icon: "🎉" },
                  { value: "Bored / Restless", label: "Bored & Restless", desc: "Craving a bold, unique flavor adventure", icon: "🥱" },
                  { value: "Seeking Comfort", label: "Seeking Cozy Comfort", desc: "Nostalgic, warm, simple local favorites", icon: "🧸" },
                  { value: "Indecisive / Confused", label: "Totally Indecisive", desc: "Just want something universally delicious", icon: "🤷" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption("emotionalMood", opt.value)}
                    className="group p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50/45 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/35 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: FLAVOR CRAVING */}
          {step === 3 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">What flavor profile are you craving?</h2>
                <p className="text-xs text-slate-400">Select the dominant taste buds profile</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: "Spicy & Bold", label: "Spicy & Bold", desc: "Fiery, spicy heat to wake up the system", icon: "🌶️" },
                  { value: "Savory & Rich", label: "Savory & Rich / Umami", desc: "Thick curries, rich meats, deep garlic soy", icon: "🥩" },
                  { value: "Sweet & Fruity", label: "Sweet & Refreshing", desc: "Coconut, palm sugar, cold dessert notes", icon: "🍍" },
                  { value: "Light & Clean", label: "Light & Clean", desc: "Clear broths, minimal grease, easily digestible", icon: "🍵" },
                  { value: "Sour & Tangy", label: "Sour & Tangy / Asam", desc: "Tamarind kick, appetite-triggering sour notes", icon: "🍋" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption("craving", opt.value)}
                    className="group p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50/45 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/35 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: HEALTH FOCUS */}
          {step === 4 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Any health or dietary focus?</h2>
                <p className="text-xs text-slate-400">Select if you want to align with specific health metrics</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: "Weight Loss / Low Calorie", label: "Weight Loss / Low Calorie", desc: "Lower grease, balanced portions, vegetable-forward", icon: "🥗" },
                  { value: "High Protein / Muscle Building", label: "High Protein / Muscle Build", desc: "Packed with chicken, beef, seafood, or egg", icon: "💪" },
                  { value: "Low Carb / Keto-friendly", label: "Low Carb / Keto", desc: "Meat/tofu focused, minimizing heavy noodles/rice", icon: "🚫" },
                  { value: "Sore Throat / Immune Boost", label: "Sore Throat & Cough Relief", desc: "Ginger, garlic, warm broth, non-greasy options", icon: "🤒" },
                  { value: "Standard / Balanced Diet", label: "Standard / No Preference", desc: "Show anything—classic traditional Malaysian balance", icon: "🌟" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption("healthFocus", opt.value)}
                    className="group p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50/45 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/35 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: APPETITE SIZE */}
          {step === 5 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-200">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">What is your appetite level?</h2>
                <p className="text-xs text-slate-400">Select the size/type of food you crave</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { value: "Heavy Meal", label: "Heavy Meal", desc: "Main course rice or noodle plates to fill you up", icon: "🍽️" },
                  { value: "Light Snack", label: "Light Snack / Side", desc: "Karipap, popiah, satay, or dim sum skewers", icon: "🥟" },
                  { value: "Sweet Dessert", label: "Sweet Dessert", desc: "Shaved ice, cendol, or sweet Nyonya tea cakes", icon: "🍰" },
                  { value: "Hot/Cold Drink", label: "Hot or Cold Drink", desc: "Teh Tarik, White Coffee, or herbal brews", icon: "🥤" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      // Save answer
                      const finalAnswers = { ...answers, appetiteSize: opt.value };
                      setAnswers(finalAnswers);
                      // Trigger submission
                      handleSubmitSurvey(finalAnswers);
                    }}
                    className="group p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-indigo-50/45 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/35 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.label}</p>
                        <p className="text-[10px] text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:text-indigo-500 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* STEP 6: LOADING SCREEN */}
      {step === 6 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/85 p-12 rounded-3xl shadow-xl flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 dark:bg-indigo-500/10 animate-ping" />
            <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg relative">
              <Loader2 className="animate-spin" size={28} />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Formulating Prescription</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 h-6 transition-all duration-300 font-semibold animate-pulse text-indigo-500 dark:text-indigo-400">
              {loadingMessages[loadingMessageIndex]}
            </p>
          </div>
        </div>
      )}

      {/* STEP 7: RESULTS SCREEN */}
      {step === 7 && recommendation && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={12} /> Prescription Ready
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">AI Food Prescription</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Based on your mood, craving, and wellness checkup</p>
          </div>

          {/* AI Therapist Explanation Quote Bubble */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col gap-3">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-indigo-600 text-white text-[9px] font-bold uppercase rounded-md tracking-wider">
              Therapist Advice
            </div>
            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 p-1">
              {parseMarkdown(recommendation.explanation)}
            </div>
          </div>

          {/* Recommended Food Details Card */}
          {recommendedFoodItem && (
            <div
              onClick={() => setSelectedFood(recommendedFoodItem)}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row items-center gap-4 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg"
            >
              {/* Image banner */}
              <div className="w-full sm:w-28 sm:h-28 h-40 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 relative flex-shrink-0">
                <img
                  src={recommendedFoodItem.imageUrl}
                  alt={recommendedFoodItem.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Text details */}
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                  <span className="px-2.5 py-0.5 bg-orange-100 dark:bg-orange-950/45 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-bold uppercase">
                    {recommendedFoodItem.cuisine}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px]">
                    {recommendedFoodItem.category}
                  </span>
                  {recommendedFoodItem.halal && (
                    <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-455 rounded-full text-[10px] font-bold">
                      Halal
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
                  {recommendedFoodItem.name}
                </h3>

                <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                  {recommendedFoodItem.description}
                </p>
              </div>

              {/* Action indicator */}
              <div className="hidden sm:flex flex-col items-center justify-center p-2 text-indigo-500 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-slate-800/80 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={18} />
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Spots</span>
              </div>
            </div>
          )}

          {/* Quick actions buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleRestart}
              className="py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-sm"
            >
              <RotateCcw size={16} /> Retake Therapy
            </button>
            <Link
              href="/dashboard"
              className="py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-sm"
            >
              <LayoutDashboard size={16} /> Return to Dashboard
            </Link>
          </div>

        </div>
      )}

      {/* Detail Modal popup container */}
      {selectedFood && (
        <FoodDetailsModal
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
          autoSearch={true}
        />
      )}

    </div>
  );
}
