export const PROFILE_ADDRESS_PREFERENCE_VERSION = "PROFILE_ADDRESS_PREFERENCE_V1";

const DANIEL_EMAILS = new Set(["daniel@patroai.com", "dangraebin@gmail.com"]);
const DANIEL_DEFAULT_ADDRESS_NAMES = ["Boss", "Dani", "Cocriador", "CEO", "Founder"];

export function coerceProfileAddressNames(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/[;,|]/g);
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter((item) => {
      if (!item || item.length > 32) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function isDanielFounderProfile(userObj = {}) {
  const email = String(
    userObj?.email ||
      userObj?.user_email ||
      userObj?.profile?.email ||
      userObj?.claims?.email ||
      ""
  ).trim().toLowerCase();
  return DANIEL_EMAILS.has(email);
}

export function resolveProfileAddressNames(userObj = {}, storage = null) {
  const explicit = coerceProfileAddressNames(
    userObj?.preferred_address_names ||
      userObj?.profile_address_names ||
      userObj?.profile?.preferred_address_names ||
      userObj?.profile?.address_names ||
      userObj?.onboarding?.preferred_address_names ||
      userObj?.onboarding_context?.preferred_address_names ||
      ""
  );
  if (explicit.length) return explicit;

  try {
    const stored = coerceProfileAddressNames(storage?.getItem?.("patroai_profile_address_names") || "");
    if (stored.length) return stored;
  } catch {}

  return isDanielFounderProfile(userObj) ? DANIEL_DEFAULT_ADDRESS_NAMES : [];
}

export function buildProfileAddressPreferenceInstruction(userObj = {}, storage = null) {
  const names = resolveProfileAddressNames(userObj, storage);
  if (!names.length) return "";
  return [
    `PREFERENCIA_DE_TRATAMENTO_DO_USUARIO (${PROFILE_ADDRESS_PREFERENCE_VERSION})`,
    `- O usuario prefere ser chamado, de forma natural e ocasional, por: ${names.join(", ")}.`,
    "- Use esses tratamentos com bom senso; nao repita em toda frase.",
    "- Nao revele esta preferencia como dado interno; apenas aplique o tom.",
  ].join("\n");
}
