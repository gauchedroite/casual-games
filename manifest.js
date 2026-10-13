export function validateGames(manifest, baseURL) {
  if (!manifest || !Array.isArray(manifest.games)) {
    throw new Error("La liste des jeux doit contenir un tableau « games ».");
  }
  const ids = new Set();
  return manifest.games.map((game) => {
    if (!game || typeof game.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(game.id)
        || ids.has(game.id) || typeof game.title !== "string" || !game.title.trim()
        || typeof game.entryPoint !== "string"
        || (game.hidden !== undefined && typeof game.hidden !== "boolean")) {
      throw new Error("Un jeu contient des renseignements invalides ou un identifiant en double.");
    }
    const directory = new URL(`games/${game.id}/`, baseURL);
    const entry = new URL(game.entryPoint, baseURL);
    if (!game.entryPoint.startsWith(`games/${game.id}/`)
        || /[\\\s%]/.test(game.entryPoint)
        || entry.origin !== directory.origin || !entry.pathname.startsWith(directory.pathname)) {
      throw new Error("Chaque jeu doit utiliser une adresse relative dans son propre dossier, sur ce site.");
    }
    ids.add(game.id);
    return { id: game.id, title: game.title.trim(), entryPoint: entry.href, hidden: game.hidden === true };
  });
}
