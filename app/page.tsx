import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Stop arguing about <br />
          <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
            what to eat.
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          The ultimate Penang food decider. Whether you are eating alone or trying to agree with friends, let us pick the perfect spot for you.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            href="/roulette" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold text-lg hover:scale-105 transition-transform shadow-lg shadow-orange-500/30"
          >
            Spin the Wheel
          </Link>
          <Link 
            href="/group-vote" 
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 font-semibold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Group Vote
          </Link>
        </div>
      </div>
    </div>
  );
}
