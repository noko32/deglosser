export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Deglosser
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Search any song. Get lyrics, BPM, key, credits, and more.
        </p>
      </div>

      <form action="/search" className="w-full max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Artist or song name..."
            required
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700"
          >
            Search
          </button>
        </div>
      </form>
    </main>
  );
}
