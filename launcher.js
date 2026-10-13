import { validateGames } from "./manifest.js";

const launcher = document.querySelector("#launcher");
const player = document.querySelector("#player");
const list = document.querySelector("#game-list");
const panels = ["selection", "loading", "load-error"];
const LOAD_TIMEOUT = 10000;
let games = null;
let frame = null;
let timer;
let listRequest = null;
let retry = loadGames;

function show(panel) {
  launcher.hidden = panel === "player";
  player.hidden = panel !== "player";
  document.body.classList.toggle("playing", panel === "player");
  for (const id of panels) document.getElementById(id).hidden = id !== panel;
  if (panel !== "player") document.querySelector(`#${panel} h2`).focus();
}

function stopLoading() {
  clearTimeout(timer);
  listRequest?.abort();
  listRequest = null;
  frame?.remove();
  frame = null;
}

function showError(message, retryAction) {
  stopLoading();
  document.querySelector("#error-message").textContent = message;
  retry = retryAction;
  show("load-error");
}

function showSelection() {
  stopLoading();
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (games === null) {
    loadGames();
    return;
  }
  list.replaceChildren();
  for (const game of games) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = game.title;
    button.addEventListener("click", () => openGame(game));
    list.append(button);
  }
  if (games.length === 0) list.textContent = "Aucun jeu n’est disponible pour le moment.";
  show("selection");
}

async function loadGames() {
  stopLoading();
  document.querySelector("#loading-message").textContent = "Chargement de la liste des jeux…";
  show("loading");
  const request = new AbortController();
  listRequest = request;
  timer = setTimeout(() => request.abort(), LOAD_TIMEOUT);
  try {
    const response = await fetch(new URL("games.json", window.location.href), {
      signal: request.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (listRequest !== request) return;
    games = validateGames(manifest, window.location.href);
    const selected = games.find((game) => `#${game.id}` === window.location.hash);
    if (selected) openGame(selected);
    else showSelection();
  } catch {
    if (listRequest !== request) return;
    showError("Impossible de charger la liste des jeux (games.json). Vérifiez le fichier et le serveur, puis réessayez.", loadGames);
  }
}

function openGame(game) {
  stopLoading();
  window.history.replaceState(null, "", `#${game.id}`);
  document.querySelector("#loading-message").textContent = `Chargement de « ${game.title} »…`;
  show("loading");
  const nextFrame = document.createElement("iframe");
  frame = nextFrame;
  nextFrame.title = game.title;
  nextFrame.src = game.entryPoint;
  const fail = () => {
    if (frame !== nextFrame) return;
    showError(`Impossible de charger « ${game.title} ». Le jeu n’a pas répondu. Vérifiez ses fichiers, puis réessayez.`, () => openGame(game));
  };
  nextFrame.addEventListener("error", fail);
  // An iframe load event also fires for HTTP error pages. Wait for the game's ready message instead.
  timer = setTimeout(fail, LOAD_TIMEOUT);
  player.append(nextFrame);
}

window.addEventListener("message", (event) => {
  if (!frame || event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === "game:ready") {
    clearTimeout(timer);
    show("player");
    frame.focus();
  } else if (event.data?.type === "game:exit") {
    showSelection();
  }
});

document.querySelector("#retry").addEventListener("click", () => retry());
document.querySelector("#return-to-launcher").addEventListener("click", showSelection);
document.querySelector("#cancel-loading").addEventListener("click", showSelection);
loadGames();
