import {
  CHAPTERS, SCENES_PER_CHAPTER, TOTAL_SCENES, PROFILE_IDS,
  SELECTED_PROFILE_KEY, loadProfile, saveProfile, completeScene,
} from "./state.js";

const screen = document.querySelector("#screen");
const saveError = document.querySelector("#save-error");
const summary = document.querySelector("#profile-summary");
let profileId;
let profile;
let sceneIndex = 0;
let currentScreen;

const menuButton = '<button type="button" class="secondary" data-action="menu">Retour au menu</button>';
const exitButton = '<button type="button" class="secondary" data-action="exit">Retour au lanceur</button>';

function render(name, title, content) {
  currentScreen = name;
  summary.textContent = profile ? `Profil ${profileId} · ${profile.completedScenes} / ${TOTAL_SCENES} scènes terminées` : "";
  screen.innerHTML = `<h1 id="screen-title" tabindex="-1">${title}</h1>${content}`;
  screen.querySelector("h1").focus();
}

function warn(message) {
  saveError.textContent = message;
  saveError.hidden = false;
}

function persist(nextProfile) {
  try {
    saveProfile(window.localStorage, profileId, nextProfile);
    profile = nextProfile;
    saveError.hidden = true;
    return true;
  } catch {
    warn("Impossible d’enregistrer la partie. Autorisez le stockage local et libérez de l’espace, puis réessayez. Votre dernière sauvegarde est conservée. Ne fermez pas cet écran avant de réessayer.");
    return false;
  }
}

function menu() {
  const finished = profile.completedScenes === TOTAL_SCENES;
  let chapters = "";
  for (let chapter = 1; chapter <= CHAPTERS; chapter++) {
    const locked = (chapter - 1) * SCENES_PER_CHAPTER > profile.completedScenes;
    chapters += `<button type="button" data-action="chapter" data-chapter="${chapter}" ${locked ? "disabled" : ""}>Chapitre ${chapter}${locked ? " (à débloquer)" : ""}</button>`;
  }
  render("menu", "Menu", `
    <p>Quatre scènes pour découvrir les écrans du jeu. Votre progression est enregistrée après chaque scène terminée.</p>
    <div class="actions"><button type="button" data-action="${finished ? "victory" : "continue"}">${finished ? "Voir la victoire" : "Continuer la partie"}</button></div>
    <h2>Choix du chapitre</h2>
    <p>Terminez le chapitre 1 pour débloquer le chapitre 2. Rejouer une scène conserve votre progression.</p>
    <div class="actions">${chapters}</div>
    <div class="actions">
      <button type="button" class="secondary" data-action="options">Options</button>
      <button type="button" class="secondary" data-action="profiles">Choix du profil</button>
      ${exitButton}
    </div>`);
}

function options() {
  render("options", "Options", `
    <p>Ces réglages sont enregistrés pour le profil actif. Cette maquette ne joue aucun son et ne change pas les règles.</p>
    <form id="options-form">
      <label><input type="checkbox" name="music" ${profile.options.music ? "checked" : ""}> Musique</label>
      <label><input type="checkbox" name="soundEffects" ${profile.options.soundEffects ? "checked" : ""}> Effets sonores</label>
      <label>Difficulté
        <select name="difficulty">
          <option value="easy" ${profile.options.difficulty === "easy" ? "selected" : ""}>Facile</option>
          <option value="normal" ${profile.options.difficulty === "normal" ? "selected" : ""}>Normale</option>
          <option value="hard" ${profile.options.difficulty === "hard" ? "selected" : ""}>Difficile</option>
        </select>
      </label>
    </form>
    <div class="actions">${menuButton}</div>`);
}

function profiles() {
  render("profiles", "Choix du profil", `
    <p>Chaque profil conserve ses propres options et sa progression.</p>
    <div class="cards">${PROFILE_IDS.map((id) => `<button type="button" data-action="profile" data-profile="${id}" aria-pressed="${id === profileId}">Profil ${id}${id === profileId ? " (actif)" : ""}</button>`).join("")}</div>
    <div class="actions">${menuButton}</div>`);
}

function selectProfile(id) {
  try {
    const storage = window.localStorage;
    const loaded = loadProfile(storage, id);
    if (loaded.isNew) saveProfile(storage, id, loaded.profile);
    storage.setItem(SELECTED_PROFILE_KEY, id);
    profileId = id;
    profile = loaded.profile;
    saveError.hidden = true;
    if (profile.completedScenes === TOTAL_SCENES) victory();
    else menu();
  } catch {
    warn("Impossible d’ouvrir ce profil. Vérifiez sa sauvegarde et l’accès au stockage local, puis réessayez. Le profil actif n’a pas changé.");
  }
}

function chapterStory() {
  const chapter = Math.floor(sceneIndex / SCENES_PER_CHAPTER) + 1;
  render("chapter-story", `Histoire du chapitre ${chapter}`, `
    <div class="placeholder">L’histoire du chapitre ${chapter} sera présentée ici.</div>
    <div class="actions"><button type="button" data-action="scene-intro">Découvrir la scène 1</button>${menuButton}</div>`);
}

function sceneIntro() {
  const chapter = Math.floor(sceneIndex / SCENES_PER_CHAPTER) + 1;
  const scene = sceneIndex % SCENES_PER_CHAPTER + 1;
  render("scene-intro", `Introduction de la scène ${scene} · Chapitre ${chapter}`, `
    <div class="placeholder">Les consignes du chapitre ${chapter}, scène ${scene}, seront présentées ici.</div>
    <div class="actions"><button type="button" data-action="play">Commencer la scène</button>${menuButton}</div>`);
}

function play() {
  const chapter = Math.floor(sceneIndex / SCENES_PER_CHAPTER) + 1;
  const scene = sceneIndex % SCENES_PER_CHAPTER + 1;
  render("play", `Scène de jeu ${scene} · Chapitre ${chapter}`, `
    <div class="placeholder">Le jeu du chapitre ${chapter}, scène ${scene}, sera présenté ici. Pour cette maquette, le bouton termine la scène.</div>
    <div class="actions"><button type="button" data-action="complete">Terminer la scène</button>${menuButton}</div>`);
}

function advance() {
  if (currentScreen !== "play" || !persist(completeScene(profile, sceneIndex))) return;
  sceneIndex++;
  if (sceneIndex === TOTAL_SCENES) victory();
  else if (sceneIndex % SCENES_PER_CHAPTER === 0) chapterStory();
  else sceneIntro();
}

function victory() {
  render("victory", "Victoire", `
    <div class="placeholder">Bravo! Vous avez terminé les deux chapitres et les quatre scènes.</div>
    <div class="actions">${menuButton}${exitButton}</div>`);
}

function exit() {
  if (window.parent === window) window.location.href = "../../index.html";
  else window.parent.postMessage({ type: "game:exit" }, window.location.origin);
}

function start() {
  profile = null;
  saveError.hidden = true;
  try {
    const storage = window.localStorage;
    profileId = storage.getItem(SELECTED_PROFILE_KEY) ?? "1";
    const loaded = loadProfile(storage, profileId);
    if (loaded.isNew) saveProfile(storage, profileId, loaded.profile);
    storage.setItem(SELECTED_PROFILE_KEY, profileId);
    profile = loaded.profile;
    if (profile.completedScenes === TOTAL_SCENES) victory();
    else if (loaded.isNew) {
      render("intro", "Histoire d’introduction", `
        <div class="placeholder">Bienvenue! Cette aventure miniature vous présente chaque écran d’un jeu de détente.</div>
        <div class="actions"><button type="button" data-action="menu">Ouvrir le menu</button></div>`);
    } else menu();
  } catch {
    render("storage-error", "Sauvegarde inaccessible", `
      <p>Impossible de lire ou de préparer votre sauvegarde. Autorisez le stockage local et vérifiez les données du profil. Les données existantes n’ont pas été remplacées.</p>
      <div class="actions"><button type="button" data-action="retry">Réessayer</button>${exitButton}</div>`);
  }
}

screen.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case "menu": menu(); break;
    case "options": options(); break;
    case "profiles": profiles(); break;
    case "profile": selectProfile(button.dataset.profile); break;
    case "chapter":
      sceneIndex = (Number(button.dataset.chapter) - 1) * SCENES_PER_CHAPTER;
      chapterStory();
      break;
    case "continue":
      sceneIndex = profile.completedScenes;
      if (sceneIndex % SCENES_PER_CHAPTER === 0) chapterStory();
      else sceneIntro();
      break;
    case "scene-intro": sceneIntro(); break;
    case "play": play(); break;
    case "complete": advance(); break;
    case "victory": victory(); break;
    case "exit": exit(); break;
    case "retry": start(); break;
  }
});

screen.addEventListener("change", (event) => {
  if (event.target.form?.id !== "options-form") return;
  const form = event.target.form;
  const saved = persist({ ...profile, options: {
    music: form.elements.music.checked,
    soundEffects: form.elements.soundEffects.checked,
    difficulty: form.elements.difficulty.value,
  } });
  if (!saved) {
    form.elements.music.checked = profile.options.music;
    form.elements.soundEffects.checked = profile.options.soundEffects;
    form.elements.difficulty.value = profile.options.difficulty;
  }
});

start();
window.parent.postMessage({ type: "game:ready" }, window.location.origin);
