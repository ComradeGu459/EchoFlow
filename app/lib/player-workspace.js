export function findActiveCueIdAtTime(cues, time) {
  if (!Array.isArray(cues) || !cues.length) return "";

  for (let index = cues.length - 1; index >= 0; index -= 1) {
    if (time >= cues[index].start) {
      return cues[index].id;
    }
  }

  return cues[0].id;
}

export function getAdjacentCueId(cues, currentCueId, delta) {
  if (!Array.isArray(cues) || !cues.length) return "";
  const currentIndex = Math.max(0, cues.findIndex((cue) => cue.id === currentCueId));
  const targetIndex = Math.min(cues.length - 1, Math.max(0, currentIndex + delta));
  return cues[targetIndex]?.id || cues[0].id;
}

export function clampSplitRatio(value) {
  return Math.min(0.74, Math.max(0.42, Number(value) || 0.6));
}

export function clampSubtitleFontSize(value) {
  return Math.min(24, Math.max(14, Math.round(Number(value) || 18)));
}

export function buildCueCardDraft({ cue, material, type = "表达卡" }) {
  return {
    title: cue.english,
    type,
    meaning: cue.chinese || "",
    example: cue.english,
    note: `${material.title} · 来自学习播放页`,
    sourceType: "手动创建",
    difficultyTag: cue.difficultyTag || "四级",
  };
}
