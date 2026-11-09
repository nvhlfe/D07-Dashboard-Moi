// ─────────────────────────────────────────────────────────────
// gaHistory.js — So lieu GA CO DINH theo thang do Lan gui 09/11/2026
// (bang FYP / REC / ACT cua GA; dashboard chi lay FYP + ACT, bo REC).
// Don vi FYP: TRIEU dong. ACT: so TVV Active trong thang.
// CHI nap thang 1-10/2026 — tu thang 11/2026 tro di, Hanh trinh nam lay
// theo Daily Sales (snapshot moi nhat cua thang) theo chi dao cua Lan,
// KHONG dung so bang nay cho thang >= 11 du bang goc co cot thang 11.
// Dung boi buildYearJourney trong journey.js.
// ─────────────────────────────────────────────────────────────

export const GA_HISTORY = {
  2026: {
    1: { fyp: 2596, act: 41 },
    2: { fyp: 1372.6, act: 33 },
    3: { fyp: 3147.7, act: 48 },
    4: { fyp: 3244.8, act: 47 },
    5: { fyp: 4046.9, act: 48 },
    6: { fyp: 4898.6, act: 47 },
    7: { fyp: 3117.8, act: 40 },
    8: { fyp: 3307.9, act: 45 },
    9: { fyp: 3676.5, act: 52 },
    10: { fyp: 3364.7, act: 42 },
  },
}
