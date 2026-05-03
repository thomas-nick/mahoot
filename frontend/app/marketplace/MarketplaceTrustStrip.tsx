type Tip = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const ShieldIcon = (
  <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const TruckIcon = (
  <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h11v8H3z" />
    <path d="M14 10h4l3 3v2h-7" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);
const ChatIcon = (
  <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
  </svg>
);

const TIPS: Tip[] = [
  {
    title: "Mahoot doesn't process payments",
    body: "Money goes directly from buyer to seller. Confirm totals before paying. Use a trusted method (PayPal G&S, Venmo with note, Stripe).",
    icon: ShieldIcon,
  },
  {
    title: "Ship tracked, every time",
    body: "Use a labeled, tracked shipping service. Sellers should snap a photo of the label + receipt and share via the message thread.",
    icon: TruckIcon,
  },
  {
    title: "Talk before you pay",
    body: "Use the in-app messages to confirm condition, weight, and shipping. Listings tied to the catalog let you compare flight numbers.",
    icon: ChatIcon,
  },
];

export function MarketplaceTrustStrip() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          {ShieldIcon}
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Trust &amp; safety
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {TIPS.map((tip) => (
          <li
            key={tip.title}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              {tip.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{tip.title}</p>
              <p className="mt-0.5 text-xs text-slate-600">{tip.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
