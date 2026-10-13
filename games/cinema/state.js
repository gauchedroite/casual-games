export const CHAPTERS = 2;
export const SCENES_PER_CHAPTER = 2;
export const TOTAL_SCENES = CHAPTERS * SCENES_PER_CHAPTER;
export const PROFILE_IDS = ["1", "2"];
export const SELECTED_PROFILE_KEY = "casual-games:cinema:selected-profile";

export function profileKey(id) {
  if (!PROFILE_IDS.includes(id)) throw new Error("Le profil enregistré est invalide.");
  return `casual-games:cinema:profile:${id}`;
}

function validateProfile(profile) {
  if (!profile || !Number.isInteger(profile.completedScenes)
      || profile.completedScenes < 0 || profile.completedScenes > TOTAL_SCENES
      || typeof profile.options?.music !== "boolean"
      || typeof profile.options?.soundEffects !== "boolean"
      || !["easy", "normal", "hard"].includes(profile.options?.difficulty)) {
    throw new Error("La sauvegarde de ce profil est invalide. Elle n’a pas été remplacée.");
  }
  return profile;
}

export function loadProfile(storage, id) {
  const raw = storage.getItem(profileKey(id));
  if (raw === null) {
    return {
      isNew: true,
      profile: { options: { music: true, soundEffects: true, difficulty: "normal" }, completedScenes: 0 },
    };
  }
  let profile;
  try {
    profile = JSON.parse(raw);
  } catch {
    throw new Error("La sauvegarde de ce profil est illisible. Elle n’a pas été remplacée.");
  }
  return { isNew: false, profile: validateProfile(profile) };
}

export function saveProfile(storage, id, profile) {
  storage.setItem(profileKey(id), JSON.stringify(validateProfile(profile)));
}

export function completeScene(profile, sceneIndex) {
  if (!Number.isInteger(sceneIndex) || sceneIndex < 0 || sceneIndex >= TOTAL_SCENES
      || sceneIndex > profile.completedScenes) {
    throw new Error("Cette scène n’est pas encore accessible.");
  }
  return { ...profile, completedScenes: Math.max(profile.completedScenes, sceneIndex + 1) };
}
