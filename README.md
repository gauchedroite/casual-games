# Jeux de détente

A static launcher and two sample games with French (Canada) screens. Each game has two chapters with two scenes. They use placeholder screens, not finished game mechanics, art, or audio.

The project uses HTML, CSS, and JavaScript. It needs no build step, package installation, backend, or API.

## Run locally

Install Node.js if it is not available. From this project folder, start a static web server:

```sh
npx http-server . -a 127.0.0.1 -p 8000
```

Open <http://127.0.0.1:8000/>. Do not open `index.html` as a local file. The launcher needs HTTP to load the game list and JavaScript modules. No application backend is required.

To test on a tablet, use a trusted local network. Run `npx http-server . -a 0.0.0.0 -p 8000`, then open `http://<PC-LAN-IP>:8000/` on the tablet. Allow the server through the Windows firewall for private networks only. This command exposes the project folder to that network. Stop the server with Ctrl+C after testing.

Use a dedicated folder for public hosting. Publish only `index.html`, `styles.css`, `launcher.js`, `manifest.js`, `games.json`, and `games/`. Do not publish private folders or planning files. Configure the server to return a 404 response for missing files.

## Files and game integration

`index.html` and `launcher.js` own the game list, loading screen, and list errors. Selecting a game navigates directly to its entry point. The iframe route remains commented out in `launcher.js`. `styles.css` provides shared layout and control styles. Each game owns its screens, options, profiles, and progress under `games/<id>/`.

Add each game to `games.json` by hand:

```json
{
  "games": [
    {
      "id": "prototype",
      "title": "Jeu prototype",
      "entryPoint": "games/prototype/index.html"
    }
  ]
}
```

Use a unique ID that starts with a lowercase letter and contains only lowercase letters, digits, or hyphens. Use a French title. Keep the entry point and game-specific files under `games/<id>/`. Use an unencoded relative entry path without spaces or backslashes. The launcher rejects paths outside that game's folder and site. Set `hidden` to `true` to hide a game from the list. Hidden games can still open through a direct URL.

Each game can use its own web technology. Its files must work on the same origin as the launcher. An origin is the combination of protocol, hostname, and port. The games are trusted first-party files, not a security boundary for third-party code.

The launcher opens the selected entry point as a top-level page. Reloading that URL reopens the game. Each game returns to the launcher by navigating to `../../index.html`. The launcher cannot show its retry screen if a game page fails to load.

The iframe route remains commented out in `launcher.js`. If you re-enable it, each game must send these messages:

```js
window.parent.postMessage({ type: "game:ready" }, window.location.origin);
window.parent.postMessage({ type: "game:exit" }, window.location.origin);
```

In iframe mode, the launcher accepts messages only from its current game iframe and the same origin. It waits up to 10 seconds for the ready message. The game list also has a 10-second timeout. The list error screen offers retry and return actions. Returning after a list error requests the list again.

## Saved progress

The browser stores data in `localStorage`, persistent storage for one origin. The prototype uses these keys:

- `casual-games:prototype:selected-profile`: `1` or `2`.
- `casual-games:prototype:profile:1`: options and progress for Profil 1.
- `casual-games:prototype:profile:2`: options and progress for Profil 2.

The cinema game uses separate keys:

- `casual-games:cinema:selected-profile`: `1` or `2`.
- `casual-games:cinema:profile:1` and `casual-games:cinema:profile:2`: options and progress for each profile.

Each profile stores `options` with `music`, `soundEffects`, and `difficulty`, plus a `completedScenes` count from 0 to 4. Difficulty values are `easy`, `normal`, and `hard`. New profiles use music and sound effects on, normal difficulty, and no completed scenes. Profil 1 is the first selected profile.

The first launch creates the profile and shows the intro story. Later launches open the menu, or Victory when all scenes are complete. Selecting a new profile from the profile screen opens its menu. Options save when changed. Scene progress saves only when the player selects “Terminer la scène”.

Chapter 2 unlocks after both scenes in Chapter 1. Chapter buttons replay an unlocked chapter from its story. “Continuer la partie” opens the first unfinished scene, with the chapter story at the start of a chapter. Replaying completed scenes never lowers saved progress.

If a write fails, the game keeps the current scene open and reports the error. Retry “Terminer la scène” after restoring storage access or space. Failed option changes revert to their saved values. Invalid saves are not overwritten. A failed profile switch keeps the current profile active.

Saves do not sync across browsers, devices, or origins. Changing the server port or hostname uses different storage. Clearing browser data deletes progress. Use one tab per game to avoid competing saves.

## Automated tests

With Node.js 24 or newer, run the dependency-free tests:

```sh
node --test tests/*.test.mjs
```

You can also run `npm test`. No `npm install` step is needed.

The tests cover default options, all four scene checkpoints, reloads, profile separation, replay, invalid saves, and storage failures. They also test catalog validation and unsafe entry paths. Use the manual checklist below for rendered screens, input, and loading behavior.

## Manual test checklist

Use a fresh browser profile for a clean first launch. Test with the latest Chrome, Edge, Firefox, and Safari. Repeat the input tests on Safari for iPadOS and Chrome for Android tablets.

### Full flow and reloads

- [ ] Open the launcher and select “Une soirée cinéma!”. See “Histoire d’introduction”, then open the menu.
- [ ] Open “Options”. Confirm music and effects are on and difficulty is “Normale”.
- [ ] Turn music off and select “Difficile”. Return to the menu.
- [ ] Select “Chapitre 1”. See its story, the introduction for scene 1, and the scene play screen.
- [ ] Reload before completing the scene. See the menu with zero completed scenes and the saved options.
- [ ] Continue and complete Chapter 1, Scene 1. See the introduction for Chapter 1, Scene 2.
- [ ] Reload. Continue from Chapter 1, Scene 2, not from Scene 1.
- [ ] Complete Scene 2. See the Chapter 2 story, then the introduction and play screen for its first scene.
- [ ] Complete Chapter 2, Scene 1. See the introduction for Chapter 2, Scene 2.
- [ ] Complete the last scene. See “Victoire” with four completed scenes.
- [ ] Reload. See “Victoire” again.
- [ ] Return to the menu from Victory. Replay Chapter 1, Scene 1. Confirm progress stays at four.
- [ ] Return to the menu, open Victory, and select “Retour au lanceur”. See the game list after the browser returns to the launcher page.

### Profiles and input

- [ ] From the menu, open “Choix du profil” and select Profil 2. See zero completed scenes and default options.
- [ ] Complete one scene in Profil 2. Return to the menu and switch to Profil 1. Its progress and options are unchanged.
- [ ] Switch back to Profil 2 and reload. Confirm Profil 2 remains selected with one completed scene.
- [ ] Return from both Options and profile selection without changing anything. Confirm the menu appears.
- [ ] Return to the launcher from the menu. Reopen the cinema game and confirm it resumes the selected profile.
- [ ] Use only Tab, Shift+Tab, Enter, Space, and arrow keys to visit all screens and controls. Confirm visible focus.
- [ ] Use mouse input on desktop and touch input on a tablet in both orientations.
- [ ] Test a 320-pixel-wide viewport and 200% zoom. Confirm controls stay readable, reachable, and free of horizontal scrolling.

### Load and storage errors

Restore each temporary change before the next test. Use a disposable browser profile for storage failure tests. Do not delete real saves.

- [ ] Temporarily rename `games.json`. Reload and see the list error. Restore it and select “Réessayer”.
- [ ] Repeat with invalid JSON, duplicate IDs, and an external entry point. Confirm the launcher rejects each list.
- [ ] While a list error is visible, restore the file and select “Retour au lanceur”. Confirm the list loads.
- [ ] Temporarily rename `games/cinema/index.html`. Open the game. Confirm the server shows its not-found page. Restore the file and return to the launcher with browser navigation.
- [ ] Temporarily rename `games/cinema/game.js`. Open the game and confirm its startup screen remains visible. Restore the file before continuing.
- [ ] Throttle the network in browser developer tools while loading `games.json`. Confirm the list error appears after 10 seconds and its retry and return actions work.
- [ ] Block browser storage. Open the cinema game and confirm “Sauvegarde inaccessible”, retry, and return actions appear.
- [ ] In the game page console, run `const originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Test'); }`. Try completing a scene. Confirm an error appears and the scene stays open. Restore with `Storage.prototype.setItem = originalSetItem`, then retry completion.
- [ ] Repeat the failed-write test for options and profile selection. Confirm options revert and the active profile does not change.
- [ ] In a disposable profile, replace a saved profile value with invalid JSON. Reload and confirm an error appears without replacing that value.

To restart a disposable cinema test, remove only `casual-games:cinema:selected-profile`, `casual-games:cinema:profile:1`, and `casual-games:cinema:profile:2` in browser developer tools. This deletes both test profiles and their progress. Reload to see the intro story again.
