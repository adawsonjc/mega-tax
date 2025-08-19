import React, { useMemo, useState } from "react";

// TAX YOURSELF, MEGA‑RICH — Ethical Wealth Calculator (Simple & Transparent)
// Per request (this rev):
// • Keep Suggested Annual Contribution at the top (hero right).
// • Move the full "How we worked this out" explainer to the LOWER Suggested Annual Contribution card only.
// • Remove the explainer from everywhere else.
// • Move Policy note to the bottom of the page.
// • Keep prior structure: sliders BEFORE calculator; LVT adjustable (default 1.6%);
//   donation section separate; simple clean style.

// ------------------ utils ------------------
function currency(n) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });
}

function pct(n, dp = 1) {
  const x = Number.isFinite(n) ? n : 0;
  return `${(x * 100).toFixed(dp)}%`;
}

// Simple hover info chip
function Info({ text }) {
  return (
    <span
      className="inline-flex items-center align-top ml-1 text-xs select-none"
      title={text}
      aria-label={text}
    >
      <span className="h-4 w-4 grid place-items-center rounded-full border border-neutral-300 text-neutral-600">
        i
      </span>
    </span>
  );
}

// Reusable card wrapper for neat, consistent styling
function SectionCard({ children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-neutral-200 bg-white shadow-sm p-6 ${className}`}>
      {children}
    </section>
  );
}

// ------------------ component ------------------
export default function App() {
  // Core inputs — broken into familiar categories (we auto-sum to net wealth)
  const [propertyValue, setPropertyValue] = useState(4_000_000);
  const [savingsCash, setSavingsCash] = useState(2_000_000);
  const [investmentsPensions, setInvestmentsPensions] = useState(6_000_000);
  const [businessEquity, setBusinessEquity] = useState(3_000_000);
  const [otherValuables, setOtherValuables] = useState(0);
  const [debts, setDebts] = useState(0);

  // Annual income is optional; allow blank input
  const [annualIncomeStr, setAnnualIncomeStr] = useState("");

  // Wealth tithe threshold (only wealth above this is considered in the tithe)
  const [ethicalThreshold, setEthicalThreshold] = useState(10_000_000);

  // Land share (site value proxy)
  const [landShare, setLandShare] = useState(0.5); // 50% of property treated as land by default
  const [landPreset, setLandPreset] = useState("balanced");

  // LVT rate — adjustable (default 1.6%)
  const [lvtRate, setLvtRate] = useState(0.016);

  // Gift Aid + giving preferences
  const [useGiftAid, setUseGiftAid] = useState(true);
  const [taxBand, setTaxBand] = useState(0.45); // 0.20, 0.40, 0.45

  // Donation split between Government and Charity
  const [donationSplit, setDonationSplit] = useState(60); // % to Government by default

  // Donate modal state
  const [showDonate, setShowDonate] = useState(false);
  const [donateChoice, setDonateChoice] = useState("givewell");

  // Calibration factor k (kept for tests and future tuning). Default 1.0.
  const [k] = useState(1.0);

  // Wealth tithe schedule — FIXED BANDS (1% to £50m; 1.5% to £250m; 2% above)
  function titheSchedule(above) {
    if (above <= 0) return 0;
    const bands = [
      { upto: 50_000_000, rate: 0.010 },
      { upto: 250_000_000, rate: 0.015 },
      { upto: Infinity, rate: 0.020 },
    ];
    let taxed = 0,
      last = 0;
    for (const b of bands) {
      const span = Math.max(0, Math.min(b.upto, above) - last);
      taxed += span * b.rate;
      last = b.upto;
      if (b.upto === Infinity) break;
    }
    return taxed * k;
  }

  // --- lightweight runtime assertions (acts like tiny tests) ---
  if (typeof window !== "undefined" && !window.__ETC_TESTED__) {
    window.__ETC_TESTED__ = true;
    // Existing tests (unchanged)
    console.assert(titheSchedule(0) === 0, "titheSchedule(0) should be 0");
    console.assert(
      Math.abs(titheSchedule(40_000_000) - 0.01 * 40_000_000 * k) < 1e-6,
      "titheSchedule basic band incorrect"
    );
    const test60m = 0.01 * 50_000_000 + 0.015 * 10_000_000;
    console.assert(
      Math.abs(titheSchedule(60_000_000) - test60m * k) < 1e-6,
      "titheSchedule two-band calc incorrect"
    );
    const test50m = 0.01 * 50_000_000; // exact boundary
    console.assert(
      Math.abs(titheSchedule(50_000_000) - test50m * k) < 1e-6,
      "titheSchedule boundary @50m incorrect"
    );
    const test250m = 0.01 * 50_000_000 + 0.015 * 200_000_000; // next boundary
    console.assert(
      Math.abs(titheSchedule(250_000_000) - test250m * k) < 1e-6,
      "titheSchedule boundary @250m incorrect"
    );
    const test300m =
      0.01 * 50_000_000 + 0.015 * 200_000_000 + 0.02 * 50_000_000;
    console.assert(
      Math.abs(titheSchedule(300_000_000) - test300m * k) < 1e-6,
      "titheSchedule three-band calc incorrect"
    );
    console.assert(
      titheSchedule(-1) === 0,
      "titheSchedule negative input should be clamped to 0"
    );
  }

  // Parse income allowing blank string
  const annualIncome = Number.isFinite(parseFloat(annualIncomeStr))
    ? parseFloat(annualIncomeStr)
    : 0;

  // Compute net wealth from categories
  const netWealth = Math.max(
    0,
    propertyValue +
      savingsCash +
      investmentsPensions +
      businessEquity +
      otherValuables -
      debts
  );

  const calc = useMemo(() => {
    const above = Math.max(0, netWealth - ethicalThreshold);

    // Fixed‑band breakdown for clarity
    const b1 = 50_000_000;
    const b2 = 250_000_000;
    const r1 = 0.010, r2 = 0.015, r3 = 0.020;
    const spans = [
      { label: `first £${(b1/1_000_000).toFixed(0)}m`, span: Math.max(0, Math.min(b1, above) - 0), rate: r1 },
      { label: `next £${((b2-b1)/1_000_000).toFixed(0)}m`, span: Math.max(0, Math.min(b2, above) - b1), rate: r2 },
      { label: `above £${(b2/1_000_000).toFixed(0)}m`, span: Math.max(0, above - b2), rate: r3 },
    ];
    const bracketAmounts = spans.map(x => ({ ...x, amount: x.span * x.rate * k }));
    const baseWealthTithe = bracketAmounts.reduce((s, x) => s + x.amount, 0);

    // LVT: property × landShare − £1m allowance, × LVT rate
    const siteValue = Math.max(0, propertyValue * landShare - 1_000_000);
    const lvtProxy = siteValue * lvtRate * k;

    const total = Math.max(0, baseWealthTithe) + Math.max(0, lvtProxy);
    const monthly = total / 12;
    const effVsIncome = annualIncome > 0 ? total / annualIncome : 0;

    // Donation split
    const govPortion = (donationSplit / 100) * total;
    const charityPortion = total - govPortion;

    // Gift Aid applies only to the charity portion
    const charityReceives = useGiftAid ? charityPortion * 1.25 : charityPortion;
    const donorRelief = useGiftAid
      ? Math.max(0, taxBand - 0.2) * charityPortion
      : 0; // extra relief beyond basic rate
    const donorNetCost = Math.max(0, govPortion + charityPortion - donorRelief);

    const shareOfWealth = netWealth > 0 ? total / netWealth : 0;

    return {
      above,
      bracketAmounts,
      baseWealthTithe,
      lvtProxy,
      total,
      monthly,
      effVsIncome,
      charityReceives,
      donorRelief,
      donorNetCost,
      siteValue,
      shareOfWealth,
      govPortion,
      charityPortion,
    };
  }, [
    netWealth,
    ethicalThreshold,
    propertyValue,
    k,
    landShare,
    lvtRate,
    useGiftAid,
    taxBand,
    annualIncome,
    donationSplit,
  ]);

  function handleDonate() {
    const links = {
      givewell: "https://www.givewell.org/donate",
      amf: "https://www.againstmalaria.com/donate.aspx",
      trussell: "https://www.trusselltrust.org/make-a-donation/",
      govGuide: "https://www.gov.uk/",
    };
    const url = links[donateChoice] || links.govGuide;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // Keep land share UI and state in sync with preset selector
  function onChangeLandPreset(preset) {
    setLandPreset(preset);
    if (preset === "prime") setLandShare(0.7);
    else if (preset === "balanced") setLandShare(0.5);
    else if (preset === "rural") setLandShare(0.3);
    // "custom" leaves landShare as-is; user can tweak with slider below
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header / Brand */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-2xl bg-neutral-900 text-white grid place-items-center text-sm font-semibold"
              aria-hidden
            >
              TM
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Tax Yourself, Mega‑Rich</h1>
              <p className="text-xs text-neutral-500">
                A voluntary, wealth‑first calculator for ethical contributions
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <button
              onClick={() => setShowDonate(true)}
              aria-label="Open donate options"
              className="ml-2 px-3 py-2 rounded-xl text-sm !bg-black !text-white !border !border-black hover:!bg-black focus:!ring-2 focus:!ring-black"
            >
              Donate now
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero with top total card (no explainer here now) */}
        <SectionCard className="p-8">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
                Prevent the inequality endgame. Keep prosperity stable.
              </h2>
              <p className="mt-3 text-neutral-600">
                This tool suggests a voluntary, beyond‑tax contribution from very
                high wealth. It aligns incentives: <span className="font-medium">a modest annual gift now helps preserve the system that preserves your wealth</span>.
                Extreme inequality breeds instability — markets, democracy, and
                social peace all suffer, and fortunes are ultimately destroyed.
              </p>
              <ul className="mt-4 text-sm text-neutral-600 list-disc pl-5 space-y-1">
                <li>
                  <span className="font-medium">Illiquid assets count</span>
                  <Info text="Yes — net wealth includes illiquid holdings (e.g., property, private equity). You can stage contributions over time; this is voluntary guidance, not a cash-call." />
                  — we’re measuring overall command over resources.
                </li>
                <li>
                  <span className="font-medium">Simple schedule</span>
                  <Info text="1% on wealth above £10m; 1.5% above £50m; 2% above £250m (k=1 by default)." />
                  : small wealth tithe + land/location value.
                </li>
                <li>
                  <span className="font-medium">Transparent</span>
                  <Info text="Open the 'How we calculate' box to see exact numbers and formulas with your inputs." />
                  : see the math.
                </li>
              </ul>
              <div className="mt-4 flex gap-2">
                <a
                  href="#controls"
                  className="px-4 py-2 rounded-xl text-sm border bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300"
                >
                  Set sliders
                </a>
                <a
                  href="#calc"
                  className="px-4 py-2 rounded-xl text-sm border bg-neutral-900 text-white border-neutral-900 hover:opacity-90"
                >
                  Jump to calculator
                </a>
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Voluntary guidance, not legal or tax advice.
              </p>
            </div>

            {/* Right column: Suggested total only */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-neutral-600">Suggested Annual Contribution</div>
              <div className="mt-1 text-4xl font-black tabular-nums">{currency(calc.total)}</div>
              <div className="text-neutral-600">≈ {currency(calc.monthly)} / month</div>
              <div className="mt-3 text-xs text-neutral-500">
                This is only {pct(calc.shareOfWealth)} of your total wealth annually
              </div>
              <div className="mt-4 text-sm text-neutral-600">
                <div className="font-semibold mb-1">Breakdown</div>
                <ul className="list-disc pl-5">
                  <li>
                    Base wealth tithe: <span className="font-medium">{currency(calc.baseWealthTithe)}</span>{" "}
                    <Info text="A small % only on wealth above your chosen threshold." />
                  </li>
                  <li>
                    Land value (proxy): <span className="font-medium">{currency(calc.lvtProxy)}</span>{" "}
                    <Info text={`We estimate site value as (property × land‑share − £1m) × LVT rate. LVT is currently ${pct(lvtRate)} and adjustable below.`} />
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Controls BEFORE calculator */}
        <SectionCard id="controls">
          <h3 className="text-lg font-bold">Contribution settings</h3>
          <div className="mt-4 grid md:grid-cols-2 gap-6">
            <label className="block">
              <div className="text-sm text-neutral-700 font-medium">
                Ethical threshold — start contributing at
                <Info text="Only wealth above this line is included in the wealth tithe calculation." />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min={1_000_000}
                  max={50_000_000}
                  step={500_000}
                  value={ethicalThreshold}
                  onChange={(e) => setEthicalThreshold(Number(e.target.value))}
                  className="w-full accent-neutral-900"
                />
                <div className="text-sm font-semibold tabular-nums min-w-[8ch] text-right">
                  {currency(ethicalThreshold)}
                </div>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                We suggest £10,000,000 as a simple ultra‑wealth threshold.
              </p>
            </label>

            <label className="block">
              <div className="text-sm text-neutral-700 font-medium">
                Land Value Tax (LVT) rate
                <Info text="Percentage applied to estimated site value (after £1m allowance)." />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="range"
                  min={0}
                  max={0.03}
                  step={0.001}
                  value={lvtRate}
                  onChange={(e) => setLvtRate(Number(e.target.value))}
                  className="w-full accent-neutral-900"
                />
                <div className="text-sm font-semibold tabular-nums min-w-[6ch] text-right">
                  {pct(lvtRate, 1)}
                </div>
              </div>
              <p className="mt-1 text-xs text-neutral-600">
                Default is <span className="font-medium">1.6%</span>. LVT replaces Stamp Duty and Council Tax in this model.
              </p>
            </label>
          </div>
        </SectionCard>

        {/* Calculator */}
        <div id="calc" className="grid lg:grid-cols-3 gap-8">
          <SectionCard className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold">Tell us what you own (roughly)</h3>
            <div className="grid sm:grid-cols-2 gap-5">
              <NumberField
                label={<span>Property / land value<Info text="Market value of your homes/land. We'll estimate how much is the site (land) vs buildings." /></span>}
                value={propertyValue}
                setValue={setPropertyValue}
                step={100_000}
              />
              <NumberField
                label={<span>Savings & cash<Info text="Bank balances, premium bonds, cash-like funds." /></span>}
                value={savingsCash}
                setValue={setSavingsCash}
                step={50_000}
              />
              <NumberField
                label={<span>Investments & pensions<Info text="Listed shares, funds, ISAs, SIPPs, pensions." /></span>}
                value={investmentsPensions}
                setValue={setInvestmentsPensions}
                step={100_000}
              />
              <NumberField
                label={<span>Business equity<Info text="Value of your stake in private or public companies." /></span>}
                value={businessEquity}
                setValue={setBusinessEquity}
                step={100_000}
              />
              <NumberField
                label={<span>Other valuables<Info text="Art, vehicles, jewellery, collectibles." /></span>}
                value={otherValuables}
                setValue={setOtherValuables}
                step={50_000}
              />
              <NumberField
                label={<span>Debts (enter as positive<Info text="Mortgages, loans, credit balances. We'll subtract this." />)</span>}
                value={debts}
                setValue={setDebts}
                step={10_000}
              />
            </div>

            {/* Neutral net wealth box */}
            <div className="mt-2 p-4 rounded-2xl border border-neutral-200 bg-neutral-50 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Your total net wealth</div>
                <div className="font-bold tabular-nums">{currency(netWealth)}</div>
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                We sum assets and subtract debts. Property is already included here — we also ask it separately to estimate the land (site) portion for the Georgist component.
              </p>
            </div>

            {/* Land share control */}
            <label className="block">
              <div className="text-sm text-neutral-700 font-medium">How much of your property value is the land (site) itself?<Info text="We use a simple proxy: a share of property value treated as site (location) value to approximate a Georgist component." /></div>
              <div className="mt-2 grid grid-cols-2 gap-3 items-center">
                <select
                  className="col-span-1 border border-neutral-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
                  value={landPreset}
                  onChange={(e) => onChangeLandPreset(e.target.value)}
                >
                  <option value="prime">Urban prime (~70%)</option>
                  <option value="balanced">Urban average (~50%)</option>
                  <option value="rural">Rural (~30%)</option>
                  <option value="custom">Custom…</option>
                </select>
                <div className="col-span-1 text-sm tabular-nums">Using <span className="font-medium">{pct(landShare)}</span></div>
              </div>
              {landPreset === "custom" && (
                <div className="mt-3">
                  <input type="range" min={0} max={1} step={0.05} value={landShare} onChange={(e) => setLandShare(Number(e.target.value))} className="w-full accent-neutral-900" />
                  <div className="mt-1 text-xs text-neutral-500">Drag to set the proportion of your property value that is site (land) value.</div>
                </div>
              )}
            </label>
          </SectionCard>

          {/* Right column: calculation summary + full explainer (moved here) */}
          <SectionCard className="space-y-4">
            <div className="text-sm text-neutral-600">Suggested Annual Contribution</div>
            <div className="text-3xl font-black tabular-nums">{currency(calc.total)}</div>
            <div className="text-neutral-600">≈ {currency(calc.monthly)} / month</div>
            <div className="text-sm text-neutral-600">This is only <span className="font-medium">{pct(calc.shareOfWealth)}</span> of your total wealth annually.</div>

            {/* Full explanation placed here per spec */}
            <div className="pt-3 border-t border-neutral-200 text-sm">
              <div className="font-semibold mb-1">How we worked this out</div>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Net wealth: <span className="font-medium">{currency(netWealth)}</span></li>
                <li>Above threshold ({currency(ethicalThreshold)}): <span className="font-medium">{currency(calc.above)}</span></li>
                <li>Wealth tithe on the amount above threshold:
                  <ul className="mt-1 ml-4 list-disc space-y-0.5">
                    {calc.bracketAmounts.map((b, i) => b.span > 0 ? (
                      <li key={i}>{b.label} at {pct(b.rate)} → {currency(b.amount)}</li>
                    ) : null)}
                  </ul>
                </li>
                <li>Estimate site value for LVT: <span className="font-medium">{currency(propertyValue)} × {pct(landShare)} − £1m</span> = <span className="font-medium">{currency(calc.siteValue)}</span></li>
                <li>LVT on site value at {pct(lvtRate,1)}: <span className="font-medium">{currency(calc.lvtProxy)}</span></li>
                <li>Suggested annual contribution = wealth tithe + LVT</li>
              </ol>
            </div>
          </SectionCard>
        </div>

        {/* Donation preferences — separate section */}
        <SectionCard>
          <h3 className="text-lg font-bold">Donation preferences</h3>
          <p className="text-sm text-neutral-600 mt-1">This section helps you route the suggested contribution. It does not change the suggested total above.</p>

          <div className="grid sm:grid-cols-2 gap-6 mt-4">
            <label className="block">
              <div className="text-sm text-neutral-700 font-medium">Split between Government & Charity<Info text="Choose a split to support public goods (government) and targeted impact (charity)." /></div>
              <div className="flex items-center gap-4 mt-2">
                <input type="range" min={0} max={100} step={5} value={donationSplit} onChange={(e) => setDonationSplit(Number(e.target.value))} className="w-full accent-neutral-900" />
                <div className="text-sm tabular-nums min-w-[16ch] text-right">{donationSplit}% Gov / {100 - donationSplit}% Charity</div>
              </div>
            </label>

            <label className="block">
              <div className="text-sm text-neutral-700 font-medium">Gift Aid & your tax band<Info text="If you donate to a UK charity and tick Gift Aid, they receive +25%. Higher/additional-rate taxpayers can also claim back extra relief." /></div>
              <div className="mt-2 flex items-center gap-3">
                <input id="gift-aid" type="checkbox" checked={useGiftAid} onChange={(e) => setUseGiftAid(e.target.checked)} />
                <label htmlFor="gift-aid" className="text-sm">Apply Gift Aid (UK)</label>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="radio" name="band" checked={taxBand === 0.2} onChange={() => setTaxBand(0.2)} />20%</label>
                <label className="inline-flex items-center gap-2"><input type="radio" name="band" checked={taxBand === 0.4} onChange={() => setTaxBand(0.4)} />40%</label>
                <label className="inline-flex items-center gap-2"><input type="radio" name="band" checked={taxBand === 0.45} onChange={() => setTaxBand(0.45)} />45%</label>
              </div>
            </label>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50">
              <div className="text-neutral-600">Government portion</div>
              <div className="text-xl font-bold tabular-nums mt-1">{currency(calc.govPortion)}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50">
              <div className="text-neutral-600">Charity portion</div>
              <div className="text-xl font-bold tabular-nums mt-1">{currency(calc.charityPortion)}</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50">
              <div className="text-neutral-600">Charity receives (with Gift Aid)</div>
              <div className="text-xl font-bold tabular-nums mt-1">{currency(calc.charityReceives)}</div>
              <div className="text-xs text-neutral-500 mt-1">Your net cost after higher‑rate relief ≈ {currency(calc.donorNetCost)}</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowDonate(true)} className="px-4 py-2 rounded-xl text-sm border bg-black text-white border-neutral-900">Donate now</button>
          </div>
        </SectionCard>

        {/* Policy note moved to bottom */}
        <SectionCard className="bg-neutral-50">
          <div className="text-sm font-semibold text-neutral-800">Policy note</div>
          <p className="text-sm text-neutral-700 mt-2">
            Under this framework, <span className="font-medium">Land Value Tax (LVT)</span> replaces
            <span className="font-medium"> Stamp Duty</span> and <span className="font-medium">Council Tax</span>.
            The contribution shown is voluntary and separate from current statutory taxes.
          </p>
        </SectionCard>
      </main>

      {/* Donate modal */}
      {showDonate && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold">Choose where to give</h4>
              <button className="text-sm text-neutral-500 hover:text-neutral-800" onClick={() => setShowDonate(false)}>Close</button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-3"><input type="radio" name="dest" checked={donateChoice === "givewell"} onChange={() => setDonateChoice("givewell")} />GiveWell (top charities)</label>
              <label className="flex items-center gap-3"><input type="radio" name="dest" checked={donateChoice === "amf"} onChange={() => setDonateChoice("amf")} />Against Malaria Foundation</label>
              <label className="flex items-center gap-3"><input type="radio" name="dest" checked={donateChoice === "trussell"} onChange={() => setDonateChoice("trussell")} />Trussell Trust (UK food banks)</label>
              <label className="flex items-center gap-3"><input type="radio" name="dest" checked={donateChoice === "govGuide"} onChange={() => setDonateChoice("govGuide")} />Government services (guidance)</label>
            </div>
            <div className="mt-5 flex gap-2">
              <button className="px-4 py-2 rounded-xl text-sm border bg-neutral-900 text-white border-neutral-900" onClick={handleDonate}>Continue</button>
              <button className="px-4 py-2 rounded-xl text-sm border bg-white border-neutral-200" onClick={() => setShowDonate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------ small controls ------------------
function NumberField({ label, value, setValue, step = 1000 }) {
  return (
    <label className="block">
      <div className="text-sm text-neutral-700 font-medium">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className="h-11 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          onClick={() => setValue(Math.max(0, (Number(value) || 0) - step))}
          aria-label="decrement"
        >
          −
        </button>
        <input
          inputMode="numeric"
          pattern="[0-9,\.]*"
          value={String(value)}
          onChange={(e) =>
            setValue(
              Number((e.target.value || "0").replace(/[^0-9.]/g, "")) || 0
            )
          }
          className="flex-1 h-11 px-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
        />
        <button
          type="button"
          className="h-11 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          onClick={() => setValue((Number(value) || 0) + step)}
          aria-label="increment"
        >
          +
        </button>
      </div>
    </label>
  );
}
