// Placeholder home page. Search, results, and product details replace this
// in the next build phase (see docs/build-plan.md, section 2).
export default function Home() {
  return (
    <main
      className={[
        'flex flex-1 flex-col items-center justify-center gap-2',
        'bg-zinc-50 px-6 text-center dark:bg-black',
      ].join(' ')}
    >
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Open Food
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Packaged-food search is coming here next.
      </p>
    </main>
  );
}
