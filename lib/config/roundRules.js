// /lib/config/roundRules.js

const ROUND_RULESET = String(process.env.ROUND_RULESET || "dev")
  .trim()
  .toLowerCase();

const RULESETS = {
  dev: {
    label: "Development",
    maxInvitedDealers: 5,
    earlyCloseQuoteCount: 3,
    roundWindowHours: 72,
  },

  production: {
    label: "Production",
    maxInvitedDealers: 10,
    earlyCloseQuoteCount: 5,
    roundWindowHours: 72,
  },
};

function cloneRules(rules) {
  return {
    label: rules.label,
    maxInvitedDealers: Number(rules.maxInvitedDealers),
    earlyCloseQuoteCount: Number(rules.earlyCloseQuoteCount),
    roundWindowHours: Number(rules.roundWindowHours),
  };
}

export function getRoundRules() {
  const selected = RULESETS[ROUND_RULESET] || RULESETS.dev;

  return {
    ruleset: RULESETS[ROUND_RULESET] ? ROUND_RULESET : "dev",
    ...cloneRules(selected),
  };
}

export function getRoundRulesetName() {
  return getRoundRules().ruleset;
}

export function isProductionRoundRules() {
  return getRoundRules().ruleset === "production";
}

export const ROUND_RULESETS = Object.freeze(
  Object.fromEntries(
    Object.entries(RULESETS).map(([key, value]) => [key, Object.freeze(value)]),
  ),
);
