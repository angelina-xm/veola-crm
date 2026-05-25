import { translate } from "@/src/i18n/translate";

const STAGE_SLUG_KEYS: Record<string, string> = {
  new: "pipeline.stageNew",
  negotiation: "pipeline.stageNegotiation",
  proposal: "pipeline.stageProposal",
  qualified: "pipeline.stageQualified",
  discovery: "pipeline.stageDiscovery",
  won: "pipeline.stageWon",
  lost: "pipeline.stageLost",
  closed: "pipeline.stageClosed",
};

export function translateStageName(name: string | null | undefined): string {
  const raw = String(name ?? "").trim();
  if (!raw) return raw;
  const slug = raw.toLowerCase().replace(/\s+/g, "_");
  const key = STAGE_SLUG_KEYS[slug];
  if (key) return translate(key);
  for (const [k, v] of Object.entries(STAGE_SLUG_KEYS)) {
    if (slug.includes(k)) return translate(v);
  }
  return raw;
}

export function productAffinityLabel(value: string): string {
  const key = `clients.affinity.${value}`;
  const t = translate(key);
  return t === key ? value.replace(/_/g, " ") : t;
}

export function activityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    note: "pipeline.actNote",
    call: "pipeline.actCall",
    meeting: "pipeline.actMeeting",
    task: "pipeline.actTask",
  };
  const key = map[type];
  return key ? translate(key) : type;
}

export function interactionMoodLabel(mood: string): string {
  const map: Record<string, string> = {
    Positive: "clients.moodPositive",
    Neutral: "clients.moodNeutral",
    Cautious: "clients.moodCautious",
    Frustrated: "clients.moodFrustrated",
  };
  const key = map[mood];
  return key ? translate(key) : mood;
}

export function interactionCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    Pricing: "clients.catPricing",
    Interest: "clients.catInterest",
    Objection: "clients.catObjection",
    "Follow up": "clients.catFollowUpSpace",
    Other: "clients.catOther",
  };
  const key = map[category];
  return key ? translate(key) : category;
}

export function suggestedActionLabel(action: string): string {
  const map: Record<string, string> = {
    "Call client": "pipeline.actionCallClient",
    "Send proposal": "pipeline.actionSendProposal",
    "Follow up": "pipeline.actionFollowUp",
    "Review deal": "pipeline.actionReviewDeal",
  };
  return map[action] ? translate(map[action]) : action;
}
