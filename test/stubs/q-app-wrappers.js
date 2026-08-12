// Stub for '#q-app/wrappers' used by boot files when imported in unit tests.
// The real module provides defineBoot/defineStore helpers wired into Quasar's
// app lifecycle; in tests we just need pass-through wrappers. Boot files in
// this repo only use defineBoot, so that is all we expose here.

export function defineBoot(fn) {
  return fn;
}
