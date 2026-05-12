export default function EmailSignup() {
  return (
    <section className="mt-10 border-t border-slate-200 pt-6">
      <h2 className="text-2xl font-semibold mb-2">Get updates</h2>

      <p className="text-slate-700 mb-4">
        New tools, improvements, and useful DM resources. Sent sparingly.
      </p>

      <form
        action="https://buttondown.email/api/emails/embed-subscribe/SiteofManyThings"
        method="post"
        target="_blank"
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />

        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 transition"
        >
          Subscribe
        </button>
      </form>

      <p className="text-white mt-3 text-sm">
        No spam. Unsubscribe anytime.
      </p>
    </section>
  );
}
