"use client";

import { RiArrowDownSLine, RiArrowLeftSLine, RiCheckLine, RiErrorWarningLine, RiImageAddLine, RiMapPin2Line } from "@remixicon/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { BUSINESS } from "@/business";
import Logo from "./Logo";

/*
  The link a creator gets when they DM the business: one question per screen, a sticky button
  within thumb reach, and the draft saved as they go. Phone first (most creators open it inside
  Instagram). On a laptop the page goes edge to edge: a full-width header and photo, with the questions
  and their button in one centred column.
  The screens are the Collab Concierge creator flow, with nothing filled in for them.
*/

const EASE = [0.22, 1, 0.36, 1] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RANGES = ["Under $100", "$100 to $250", "$250 to $500", "$500 to $1,000", "$1,000+"];
const { name, handle: business } = BUSINESS;

type Step = "opener" | "socials" | "collab" | "payment" | "audience" | "based" | "contact" | "extra" | "done";
const GROUPS = ["Socials", "Collab", "Audience", "Details"];
/* where a step sits in the progress bar: [group, step within it, steps in it] */
const PLACE: Partial<Record<Step, [number, number, number]>> = {
  socials: [0, 1, 1],
  collab: [1, 1, 2],
  payment: [1, 2, 2],
  audience: [2, 1, 1],
  based: [3, 1, 3],
  contact: [3, 2, 3],
  extra: [3, 3, 3],
};
const NEXT: Partial<Record<Step, Step>> = { opener: "socials", socials: "collab", collab: "payment", payment: "audience", audience: "based", based: "contact", contact: "extra", extra: "done" };
const BACK: Partial<Record<Step, Step>> = { socials: "opener", collab: "socials", payment: "collab", audience: "payment", based: "audience", contact: "based", extra: "contact" };

type Draft = {
  handle: string;
  create: string;
  want: string;
  paid: "" | "yes" | "no";
  range: string;
  based: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  extra: string;
};
const EMPTY: Draft = { handle: "", create: "", want: "", paid: "", range: "", based: "", first: "", last: "", email: "", phone: "", extra: "" };
const cleanHandle = (raw: string) => raw.trim().replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();

const DRAFT_KEY = `cc:apply:${business}`;
function loadDraft(): Draft {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/* Insights screenshots are scaled down to this many pixels on the long side before they're sent */
const SHOT_MAX = 1400;
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, SHOT_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function CreatorFlow() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("opener");
  const [dir, setDir] = useState<1 | -1>(1);
  // the opener shows none of the draft, so reading storage up front can't change the first paint
  const [d, setD] = useState<Draft>(loadDraft);
  const [shots, setShots] = useState<(string | null)[]>([null, null, null]);
  const [shotError, setShotError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  /* save the draft as they type; a quiet "Saved" says it worked */
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    const next = { ...d, [k]: v };
    setD(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      setSaved(true);
    } catch {}
  };
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1400);
    return () => clearTimeout(t);
  }, [saved, d]);

  const addShot = async (i: number, file?: File) => {
    if (!file) return;
    try {
      const url = await shrink(file);
      setShotError(false);
      setShots((prev) => prev.map((s, j) => (j === i ? url : s)));
    } catch {
      setShotError(true);
    }
  };

  const go = (to: Step, direction: 1 | -1 = 1) => {
    setDir(direction);
    setStep(to);
    setSendError(false);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const valid: Record<Step, boolean> = {
    opener: true,
    socials: cleanHandle(d.handle).length > 0,
    collab: !!d.create.trim() && !!d.want.trim(),
    payment: d.paid === "no" || (d.paid === "yes" && !!d.range),
    audience: shots.every(Boolean),
    based: !!d.based.trim(),
    contact: !!d.first.trim() && !!d.last.trim() && EMAIL.test(d.email.trim()) && d.phone.replace(/\D/g, "").length >= 7,
    extra: true,
    done: true,
  };

  const send = async () => {
    setSending(true);
    setSendError(false);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...d, handle: cleanHandle(d.handle), range: d.paid === "yes" ? d.range : "", screenshots: shots }),
      });
      if (!res.ok) throw new Error(String(res.status));
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      go("done");
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid[step] || sending) return;
    if (step === "extra") return void send();
    go(NEXT[step]!);
  };

  return (
    <div className="relative min-h-svh bg-white">
      <main className="relative flex min-h-svh w-full flex-col">
        {step === "opener" ? (
          <Opener onStart={() => go("socials")} />
        ) : step === "done" ? (
          <Done />
        ) : (
          <>
            <TopBar step={PLACE[step]!} onBack={() => go(BACK[step]!, -1)} saved={saved} />
            <form id="flow" onSubmit={submit} noValidate className={`${COLUMN} flex-1 px-6 pb-6 pt-7 sm:flex-none sm:pb-10 sm:pt-12`}>
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={{
                    enter: (s: number) => ({ x: reduce ? 0 : s * 28, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (s: number) => ({ x: reduce ? 0 : s * -28, opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: EASE }}
                >
                  {step === "socials" && <Socials d={d} set={set} />}
                  {step === "collab" && <Collab d={d} set={set} />}
                  {step === "payment" && <Payment d={d} set={set} />}
                  {step === "audience" && <Audience shots={shots} onAdd={addShot} error={shotError} />}
                  {step === "based" && <Based d={d} set={set} />}
                  {step === "contact" && <Contact d={d} set={set} />}
                  {step === "extra" && <Extra d={d} set={set} />}
                </motion.div>
              </AnimatePresence>
            </form>

            <Footer>
              <AnimatePresence initial={false}>
                {sendError && (
                  <motion.p
                    role="alert"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="overflow-hidden text-center text-[14px] text-[#c23a56]"
                  >
                    <span className="flex items-center justify-center gap-1.5 pb-3">
                      <RiErrorWarningLine size={16} aria-hidden="true" />
                      That didn&apos;t send. Check your connection and try again.
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
              <Primary type="submit" form="flow" disabled={!valid[step]} busy={sending}>
                {step === "extra" ? (sending ? "Sending…" : "Send my request") : "Next"}
              </Primary>
            </Footer>
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- screens ---------- */

/* the first screen: the Benable cover fading to white, their avatar and name, the title, their welcome DM, and Let's go */
function Opener({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <Cover height={415} top={0.5} />
      <PoweredBy />

      <Enter i={1} className={`${COLUMN} relative mt-[229.75px] flex flex-col items-center gap-6 px-[21.38px] sm:mt-[250px]`}>
        <Business />
        <Headline>Request a collab</Headline>
      </Enter>

      {BUSINESS.welcome.trim() && (
        <Enter i={2} className={`${COLUMN} relative mt-[60.75px] sm:mt-12`}>
          <Bubble>{BUSINESS.welcome}</Bubble>
        </Enter>
      )}

      <div className={`${COLUMN} ${DOCK} pb-[max(30.5px,env(safe-area-inset-bottom))]`}>
        <button type="button" onClick={onStart} className={CTA}>
          Let&apos;s go
        </button>
        <p className="mt-4 text-center text-[14px] leading-4 text-[#aaa]">About 2 minutes</p>
      </div>
    </div>
  );
}

/* the thank-you screen: what happens next, the business's thank-you DM, and one button to follow them */
function Done() {
  return (
    <div className="relative flex flex-1 flex-col">
      <Cover height={257} top={1} />
      <PoweredBy />
      <Confetti />

      <Enter i={1} className={`${COLUMN} relative mt-[69.75px] flex flex-col items-center gap-6 px-[21.38px] sm:mt-[150px]`}>
        <Business />
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <Headline>Amazing!</Headline>
          <p className="text-[16px] leading-[normal] text-[#717171]">Your collab request is being reviewed by {name}. We&apos;ll text you the second they answer.</p>
        </div>
      </Enter>

      {BUSINESS.thanks.trim() && (
        <Enter i={2} className={`${COLUMN} relative mt-[37.5px] sm:mt-10`}>
          <Bubble>{BUSINESS.thanks}</Bubble>
        </Enter>
      )}

      <div className={`${COLUMN} ${DOCK} pb-[max(21px,env(safe-area-inset-bottom))]`}>
        <a href={`https://www.instagram.com/${encodeURIComponent(business)}`} target="_blank" rel="noopener" className={CTA}>
          Follow @{business} on Instagram
        </a>
        <p className="mx-auto mt-[14px] w-[295px] max-w-full text-center text-[13px] leading-[17px] text-[#4a4a4a]">
          <span className="font-semibold">Benable</span> is an app that connects over 1 million creators with local businesses and brands.
        </p>
      </div>
    </div>
  );
}

function Socials({ d, set }: Bind) {
  const id = useId();
  return (
    <>
      <Title sub="Add your primary Instagram.">Your socials</Title>
      <div className="relative mt-7">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
          <IgGlyph />
        </span>
        <select aria-label="Platform" defaultValue="instagram" className={`${field} appearance-none pl-12 pr-11 font-medium`}>
          <option value="instagram">Instagram</option>
          <option value="tiktok" disabled>
            TikTok (coming soon)
          </option>
        </select>
        <RiArrowDownSLine size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
      <label htmlFor={id} className="sr-only">
        Your handle
      </label>
      <div className={`${field} mt-3 flex items-center gap-1 focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_#5035e3]`}>
        <span className="text-muted">@</span>
        <input id={id} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} value={d.handle} onChange={(e) => set("handle", e.target.value)} placeholder="Your handle" className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
      </div>
    </>
  );
}

function Collab({ d, set }: Bind) {
  return (
    <>
      <Title>What did you have in mind for the collab?</Title>
      <Area label="What would you create or do for us?" hint="Share any specifics you have in mind, and say if you're open to other kinds of collabs too." value={d.create} onChange={(v) => set("create", v)} autoFocus className="mt-7" />
      <Area label="What would you like from us?" hint="Any complimentary services or products, and whether you're expecting payment." value={d.want} onChange={(v) => set("want", v)} className="mt-6" />
    </>
  );
}

function Payment({ d, set }: Bind) {
  return (
    <>
      <Title>Please confirm</Title>
      <div className="mt-7 text-[16px] font-semibold text-ink">Would you require a payment for this collab?</div>
      <div role="radiogroup" aria-label="Payment" className="mt-3 grid grid-cols-2 gap-2">
        {(["yes", "no"] as const).map((v) => (
          <Choice key={v} on={d.paid === v} onClick={() => set("paid", v)} className="h-[52px] text-[17px]">
            {v === "yes" ? "Yes" : "No"}
          </Choice>
        ))}
      </div>
      {/* the range only matters if they're charging, so it waits for a yes */}
      <AnimatePresence initial={false}>
        {d.paid === "yes" && (
          <motion.div key="yes" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="pt-7 text-[16px] font-semibold text-ink">Please indicate a range</div>
            <div role="radiogroup" aria-label="Payment range" className="mt-3 flex flex-wrap gap-2">
              {RANGES.map((r) => (
                <Choice key={r} on={d.range === r} onClick={() => set("range", r)} className="h-11 px-4 text-[15px]">
                  {r}
                </Choice>
              ))}
            </div>
          </motion.div>
        )}
        {/* a no gets said back to them in full, so it's clear what they're agreeing to */}
        {d.paid === "no" && (
          <motion.div
            key="no"
            className="mt-3 flex items-center gap-3 rounded-[22px] border border-line bg-white py-4 pl-5 pr-4 shadow-[0_24px_50px_-22px_rgba(40,30,110,0.45)]"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-ink">No, I&apos;m not looking to receive payment for this collab</span>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint/15 text-[#178a60]">
              <RiCheckLine size={16} aria-hidden="true" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* three Insights screenshots, picked from the camera roll and shown back as thumbnails */
function Audience({ shots, onAdd, error }: { shots: (string | null)[]; onAdd: (i: number, f?: File) => void; error: boolean }) {
  const slots = [
    { title: "Overview", hint: "Insights → Overview. Accounts reached and followers." },
    { title: "Audience", hint: "Insights → Total followers. Top cities, age, gender." },
    { title: "Engagement", hint: "Insights → Accounts engaged. Likes, comments, shares." },
  ];
  return (
    <>
      <Title sub={`Add three screenshots from Instagram Insights. ${name} sees these and nothing else.`}>Your audience and content</Title>
      <ul className="mt-7 space-y-2.5">
        {slots.map((s, i) => {
          const src = shots[i];
          return (
            <li key={s.title} className={`flex items-center gap-3.5 rounded-[20px] border p-3 transition-colors duration-300 ${src ? "border-mint/30 bg-mint/[0.05]" : "border-line bg-white"}`}>
              <span className="relative grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-lilac text-[15px] font-bold text-violet">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={`${s.title} screenshot`} className="h-full w-full object-cover" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15.5px] font-semibold text-ink">
                  {s.title}
                  {src && <RiCheckLine size={16} className="text-mint" aria-hidden="true" />}
                </div>
                <div className="mt-0.5 text-[13px] leading-snug text-muted">{s.hint}</div>
              </div>
              <label className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#5035e3] ${src ? "text-ink-2 hover:bg-[#f4f3f8]" : "bg-ink text-white hover:bg-black"}`}>
                {!src && <RiImageAddLine size={16} aria-hidden="true" />}
                {src ? "Change" : "Add"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onAdd(i, e.target.files?.[0])} />
              </label>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-3 px-1 text-[13.5px] text-[#c23a56]">
          We couldn&apos;t open that image. Try a screenshot saved as a photo (PNG or JPG).
        </p>
      )}
    </>
  );
}

function Based({ d, set }: Bind) {
  const id = useId();
  return (
    <>
      <Title sub="It helps to know for this collab.">Where are you based?</Title>
      <label htmlFor={id} className="sr-only">
        Where you&apos;re based
      </label>
      <div className={`${field} mt-7 flex items-center gap-2.5 focus-within:bg-white focus-within:shadow-[inset_0_0_0_2px_#5035e3]`}>
        <RiMapPin2Line size={19} className="shrink-0 text-muted" aria-hidden="true" />
        <input id={id} autoFocus value={d.based} onChange={(e) => set("based", e.target.value)} placeholder="City, state or country" autoComplete="address-level2" className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
      </div>
    </>
  );
}

function Contact({ d, set }: Bind) {
  const [touched, setTouched] = useState(false);
  const badEmail = touched && !!d.email.trim() && !EMAIL.test(d.email.trim());
  return (
    <>
      <Title sub="So they know who they're saying yes to. We'll notify you as soon as they answer!">Your name and contact info</Title>
      <div className="mt-7 grid grid-cols-2 gap-2.5">
        <Input label="First name" value={d.first} onChange={(v) => set("first", v)} autoComplete="given-name" autoFocus />
        <Input label="Last name" value={d.last} onChange={(v) => set("last", v)} autoComplete="family-name" />
      </div>
      <Input label="Email" type="email" inputMode="email" value={d.email} onChange={(v) => set("email", v)} onBlur={() => setTouched(true)} autoComplete="email" invalid={badEmail} className="mt-2.5" />
      <AnimatePresence initial={false}>
        {badEmail && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden px-1 text-[13.5px] text-[#c23a56]">
            <span className="block pt-2">That doesn&apos;t look like an email. Check it and try again.</span>
          </motion.p>
        )}
      </AnimatePresence>
      <Input label="Phone" type="tel" inputMode="tel" value={d.phone} onChange={(v) => set("phone", v)} autoComplete="tel" className="mt-2.5" />
    </>
  );
}

function Extra({ d, set }: Bind) {
  return (
    <>
      <Title sub="Timing preferences, restrictions, limitations, anything else.">Anything else you&apos;d like to add?</Title>
      <Area label="" value={d.extra} onChange={(v) => set("extra", v)} placeholder="Optional" autoFocus className="mt-7" />
      <p className="mt-3 px-1 text-[13.5px] text-muted">Optional, but the more you share, the better.</p>
    </>
  );
}

/* ---------- the opener and thank-you screens share these ---------- */

/* the same Benable cover for every business (their own photo sits on top as the avatar): the soft brand
   gradient with faint violet doodles, fading to white. Matches the demo's creator page. */
function Cover({ height, top }: { height: number; top: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 overflow-hidden" style={{ top, height }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/cover/gradient.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* the doodles: the phone's portrait pattern, and a wide version (Higgsfield outpaint of it) for laptops */}
      <div className="absolute inset-0 bg-[url(/img/cover/pattern-lines.png)] bg-cover bg-top opacity-40 sm:bg-[url(/img/cover/pattern-lines-wide.jpg)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#fff,rgba(255,255,255,0))]" />
    </div>
  );
}

/* the dark strip at the top: "Powered by" and the Benable logo */
function PoweredBy() {
  return (
    <div className="sticky top-0 z-10 flex h-[67px] items-start justify-center bg-[linear-gradient(to_top,rgba(0,0,0,0)_4.753%,rgba(0,0,0,0.3)_74.958%)] px-5 pb-5 pt-3 text-white sm:h-[76px] sm:pt-5">
      <div className="flex items-center gap-2">
        <span className="text-[16px] leading-[normal]">Powered by</span>
        <Logo height={25.115} />
      </div>
    </div>
  );
}

/* their avatar tucked into a white name pill with the brand gradient as its stroke */
function Business() {
  return (
    <div className="flex flex-col items-center">
      <span className="relative mb-[-18px] size-20 shrink-0 rounded-full shadow-[0_1px_14px_rgba(0,0,0,0.25)] outline outline-[1.5px] outline-white/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BUSINESS.avatar} alt="" className="size-full rounded-full object-cover" />
      </span>
      <span className="relative max-w-full rounded-full border border-transparent px-4 py-1 [background:linear-gradient(#fff,#fff)_padding-box,var(--brand-grad)_border-box]">
        <span className="block truncate font-display text-[20px] font-medium leading-[normal] text-[#1c1c1c]">{name}</span>
      </span>
    </div>
  );
}

function Headline({ children }: { children: ReactNode }) {
  return <h1 className="w-full text-center font-display text-[30px] !font-extrabold uppercase !leading-[26px] !tracking-[-0.5px] text-[#474747]">{children}</h1>;
}

/* a DM from the business: their avatar and a grey bubble with a tucked bottom-left corner */
function Bubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2.5 px-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BUSINESS.avatar} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" />
      <p className="min-w-0 flex-1 rounded-[16px] rounded-bl-[4px] bg-[#eef2f5] py-2.5 pl-2.5 pr-[11px] font-[-apple-system,'SF_Pro','SF_Pro_Text','Helvetica_Neue',Inter,sans-serif] text-[14px] leading-[16.7px] tracking-[-0.3px] text-[#0f1316]">
        {children}
      </p>
    </div>
  );
}

/*
  One burst of confetti from behind the business's photo as the thank-you screen opens.
  Seeded, so every visit throws the same burst.
*/
const CONFETTI_COLORS = ["#6b4ef0", "#9b87ff", "#22b07d", "#ffc94d", "#ff7aa8", "#4cc3ff"];
const CONFETTI = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 90 }, (_, i) => {
    const angle = (-165 + rnd() * 150) * (Math.PI / 180);
    const speed = 110 + rnd() * 190;
    const x = Math.cos(angle) * speed;
    return {
      x,
      up: Math.sin(angle) * speed,
      drift: x * 0.35 + (rnd() - 0.5) * 90,
      fall: 520 + rnd() * 260,
      spin: (rnd() - 0.5) * 720,
      flip: 360 * (2 + Math.round(rnd() * 3)),
      w: 5 + rnd() * 4,
      h: 8 + rnd() * 6,
      round: rnd() < 0.3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 2.6 + rnd() * 1.4,
      delay: 0.25 + rnd() * 0.2,
    };
  });
})();

function Confetti() {
  if (useReducedMotion()) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {CONFETTI.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[190px]"
          style={{ width: p.w, height: p.round ? p.w : p.h, marginLeft: -p.w / 2, background: p.color, borderRadius: p.round ? "50%" : 1.5 }}
          initial={{ x: 0, y: 0, rotate: 0, rotateY: 0, opacity: 0 }}
          animate={{ x: [0, p.x, p.x + p.drift], y: [0, p.up, p.fall], rotate: p.spin, rotateY: p.flip, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            x: { duration: p.duration, delay: p.delay, times: [0, 0.22, 1], ease: ["easeOut", "linear"] },
            y: { duration: p.duration, delay: p.delay, times: [0, 0.22, 1], ease: ["easeOut", "easeIn"] },
            opacity: { duration: p.duration, delay: p.delay, times: [0, 0.04, 0.75, 1] },
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/* ---------- pieces ---------- */

type Bind = { d: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void };

// iOS-style filled fields: soft grey at rest, white with a violet ring while typing; 17px so Safari never zooms
const field = "h-[52px] w-full rounded-[14px] bg-[#f2f2f7] px-4 text-[17px] text-ink outline-none transition-[background-color,box-shadow] duration-200 focus:bg-white focus:shadow-[inset_0_0_0_2px_#5035e3]";

/* the one column everything sits in: the phone's width on a phone, a little wider and centred on a laptop */
const COLUMN = "mx-auto w-full max-w-[440px] sm:max-w-[560px]";
/* where the opener's and thank-you's button lives: pinned within thumb reach on a phone, right under the content on a laptop */
const DOCK = "sticky bottom-0 z-20 mt-auto px-5 pt-6 sm:static sm:mt-12 sm:px-6 sm:pb-16";

/* every full-width call to action, sized and coloured like the opener's "Let's go" */
const CTA = "relative flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#7a5cfa] px-4 text-center text-[16px] font-medium leading-[normal] text-white transition-[background-color,transform] duration-200 hover:bg-[#6c4ef0] active:scale-[0.985] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#b9a8ff]";

function Enter({ i, children, className = "" }: { i: number; children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.08 }}>
      {children}
    </motion.div>
  );
}

function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <>
      <h1 className="flow-title">{children}</h1>
      {sub && <p className="mt-2.5 text-[16px] leading-relaxed text-ink-2">{sub}</p>}
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  invalid = false,
  className = "",
  ...rest
}: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className">) {
  const id = useId();
  // the label sits in the field like a placeholder, then floats up once there's text or focus
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={`${field} peer h-[58px] pb-1.5 pt-5 ${invalid ? "!shadow-[inset_0_0_0_2px_#e5536f]" : ""}`}
        {...rest}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-muted transition-all duration-200 peer-focus:top-[17px] peer-focus:text-[12.5px] peer-[:not(:placeholder-shown)]:top-[17px] peer-[:not(:placeholder-shown)]:text-[12.5px]"
      >
        {label}
      </label>
    </div>
  );
}

function Area({ label, hint, value, onChange, placeholder, autoFocus, className = "" }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-[16px] font-semibold text-ink">
          {label}
        </label>
      )}
      {hint && <p className="mt-1 text-[14px] leading-snug text-muted">{hint}</p>}
      <textarea
        id={id}
        aria-label={label || placeholder}
        autoFocus={autoFocus}
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${field} ${label ? "mt-3" : ""} h-auto min-h-[128px] resize-none py-3.5 leading-snug placeholder:text-muted`}
      />
    </div>
  );
}

function Choice({ on, onClick, children, className = "" }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-[background-color,box-shadow,color] duration-200 ${
        on ? "bg-[#5035e3]/[0.08] text-[#4429d6] shadow-[inset_0_0_0_2px_#5035e3]" : "bg-[#f2f2f7] text-ink active:bg-[#e9e9f0]"
      } ${className}`}
    >
      {on && <RiCheckLine size={17} aria-hidden="true" />}
      {children}
    </button>
  );
}

function TopBar({ step, onBack, saved }: { step: [number, number, number]; onBack: () => void; saved: boolean }) {
  const [group, at, of] = step;
  // a native-feeling nav bar: back on the left, where they are in the middle, the business on the right
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl sm:border-b sm:border-line">
      <div className="relative mx-auto flex h-[52px] w-full max-w-[960px] items-center px-1.5 sm:h-16 sm:px-6">
        <button type="button" onClick={onBack} aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink transition-colors active:bg-[#f2f2f7]">
          <RiArrowLeftSLine size={30} aria-hidden="true" />
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center leading-tight" aria-label={`Step ${group + 1} of ${GROUPS.length}: ${GROUPS[group]}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={group} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: EASE }}>
              <div className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{GROUPS[group]}</div>
              <div className="text-[12px] font-medium text-muted">
                Step {group + 1} of {GROUPS.length}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="ml-auto flex items-center gap-1.5 pr-2.5">
          <span aria-live="polite" className={`text-[12.5px] font-medium text-muted transition-opacity duration-300 ${saved ? "opacity-100" : "opacity-0"}`}>
            {saved ? "Saved" : ""}
          </span>
          <span className="brand-grad grid size-[30px] shrink-0 place-items-center rounded-full p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BUSINESS.avatar} alt="" className="h-full w-full rounded-full border-2 border-white object-cover" />
          </span>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-[960px] gap-1 px-4 pb-2.5 sm:px-8 sm:pb-4" aria-hidden="true">
        {GROUPS.map((g, i) => (
          <span key={g} className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#ececf2]">
            <motion.span className="block h-full rounded-full bg-[#5035e3]" initial={false} animate={{ width: i < group ? "100%" : i === group ? `${(at / of) * 100}%` : "0%" }} transition={{ duration: 0.5, ease: EASE }} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* the steps' button: right under the questions, and held at the bottom of the window when they run long */
function Footer({ children }: { children: ReactNode }) {
  return <div className={`${COLUMN} sticky bottom-0 z-20 mt-auto bg-gradient-to-t from-white from-70% to-white/0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-6 sm:mt-0 sm:px-6 sm:pb-10 sm:pt-4`}>{children}</div>;
}

function Primary({ children, busy = false, className = "", ...rest }: { children: ReactNode; busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} aria-busy={busy || undefined} className={`${CTA} disabled:cursor-not-allowed disabled:bg-[#7a5cfa]/25 disabled:active:scale-100 ${busy ? "cursor-wait" : ""} ${className}`}>
      {busy && <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* the official Instagram app icon */
function IgGlyph() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/instagram.svg" alt="" width={28} height={28} className="block" />;
}
