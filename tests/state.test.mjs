import test from "node:test";
import assert from "node:assert/strict";
import {
  TOTAL_SCENES, SELECTED_PROFILE_KEY, profileKey,
  loadProfile, saveProfile, completeScene,
} from "../games/prototype/state.js";
import {
  SELECTED_PROFILE_KEY as CINEMA_SELECTED_PROFILE_KEY,
  profileKey as cinemaProfileKey,
} from "../games/cinema/state.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("a new profile has the required defaults and becomes resumable on save", () => {
  const storage = memoryStorage();
  const { profile, isNew } = loadProfile(storage, "1");
  assert.equal(isNew, true);
  assert.deepEqual(profile, {
    options: { music: true, soundEffects: true, difficulty: "normal" },
    completedScenes: 0,
  });
  saveProfile(storage, "1", profile);
  assert.deepEqual(loadProfile(storage, "1"), { isNew: false, profile });
});

test("all four scenes save their next checkpoint and restore it after reload", () => {
  const storage = memoryStorage();
  let { profile } = loadProfile(storage, "1");
  saveProfile(storage, "1", profile);
  for (let scene = 0; scene < TOTAL_SCENES; scene++) {
    assert.equal(loadProfile(storage, "1").profile.completedScenes, scene);
    const next = completeScene(profile, scene);
    assert.equal(profile.completedScenes, scene, "completion does not mutate the current state");
    assert.equal(loadProfile(storage, "1").profile.completedScenes, scene, "no partial scene is saved");
    saveProfile(storage, "1", next);
    profile = loadProfile(storage, "1").profile;
    assert.equal(profile.completedScenes, scene + 1);
  }
  assert.equal(profile.completedScenes, 4, "the restored profile is ready for Victory");
  assert.equal(completeScene(profile, 0).completedScenes, 4, "replay preserves completed progress");
});

test("both profiles keep independent options and progress", () => {
  const storage = memoryStorage();
  const first = completeScene(loadProfile(storage, "1").profile, 0);
  first.options = { music: false, soundEffects: false, difficulty: "hard" };
  saveProfile(storage, "1", first);
  const second = loadProfile(storage, "2").profile;
  saveProfile(storage, "2", second);
  storage.setItem(SELECTED_PROFILE_KEY, "2");
  assert.equal(storage.getItem(SELECTED_PROFILE_KEY), "2");
  assert.deepEqual(loadProfile(storage, "1").profile, first);
  assert.deepEqual(loadProfile(storage, "2").profile, second);
  assert.equal(second.completedScenes, 0);
  assert.deepEqual(second.options, { music: true, soundEffects: true, difficulty: "normal" });
  assert.equal(profileKey("1"), "casual-games:prototype:profile:1");
});

test("cinema saves use keys separate from the prototype", () => {
  assert.equal(CINEMA_SELECTED_PROFILE_KEY, "casual-games:cinema:selected-profile");
  assert.notEqual(CINEMA_SELECTED_PROFILE_KEY, SELECTED_PROFILE_KEY);
  assert.equal(cinemaProfileKey("1"), "casual-games:cinema:profile:1");
  assert.notEqual(cinemaProfileKey("1"), profileKey("1"));
});

test("unavailable scenes and invalid profile IDs are rejected", () => {
  const profile = loadProfile(memoryStorage(), "1").profile;
  for (const scene of [-1, 1, 4, 0.5, NaN]) assert.throws(() => completeScene(profile, scene));
  for (const id of ["3", "../other", null]) assert.throws(() => profileKey(id));
});

test("corrupt saves are reported without overwriting them", () => {
  const storage = memoryStorage();
  const valid = loadProfile(storage, "1").profile;
  const corrupt = ["{", "null", "{}", JSON.stringify({ ...valid, completedScenes: 5 }),
    JSON.stringify({ ...valid, completedScenes: -1 }),
    JSON.stringify({ ...valid, completedScenes: 0.5 }),
    JSON.stringify({ ...valid, options: { ...valid.options, music: "yes" } }),
    JSON.stringify({ ...valid, options: { ...valid.options, difficulty: "unknown" } })];
  for (const raw of corrupt) {
    storage.setItem(profileKey("1"), raw);
    assert.throws(() => loadProfile(storage, "1"));
    assert.equal(storage.getItem(profileKey("1")), raw);
  }
});

test("read and write failures propagate without advancing the stored checkpoint", () => {
  const storage = memoryStorage();
  const { profile } = loadProfile(storage, "1");
  saveProfile(storage, "1", profile);
  const blocked = { getItem: storage.getItem, setItem() { throw new Error("quota"); } };
  assert.throws(() => saveProfile(blocked, "1", completeScene(profile, 0)), /quota/);
  assert.equal(loadProfile(storage, "1").profile.completedScenes, 0);
  assert.throws(() => loadProfile({ getItem() { throw new Error("blocked"); } }, "1"), /blocked/);
});
