"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { buildFlashcardLibraryItems, buildTodayReviewQueue } from "../lib/flashcards-review";
import { usePlatformStore } from "../platform-store";

const REVIEW_ACTIONS = [
  { id: "forgot",   label: "不会",   tone: "warning" },
  { id: "fuzzy",    label: "模糊",   tone: "idle" },
  { id: "known",    label: "会了",   tone: "learning" },
  { id: "mastered", label: "已掌握", tone: "success" },
];

export default function PracticeScreenV4() {
  const router = useRouter();
  const {
    state,
    currentCard,
    dueCards,
    setCurrentCardId,
    reviewCard,
    selectMaterial,
    selectCue,
  } = usePlatformStore();
  const [reviewedIds, setReviewedIds] = useState([]);

  const queue = useMemo(
    () => buildTodayReviewQueue(buildFlashcardLibraryItems(state.cards, state.materials), new Date().toISOString()),
    [state.cards, state.materials],
  );
  const activeCard = queue.find((card) => card.id === currentCard?.id) || queue[0] || null;
  const sessionTotal = queue.length + reviewedIds.filter((id) => !queue.some((card) => card.id === id)).length;
  const progressCount = reviewedIds.filter((id) => !queue.some((card) => card.id === id)).length;
  const progressPct = sessionTotal ? Math.min(100, Math.round((progressCount / sessionTotal) * 100)) : 0;

  useEffect(() => {
    if (!activeCard) return;
    setCurrentCardId(activeCard.id);
  }, [activeCard, setCurrentCardId]);

  function handleFeedback(feedback) {
    if (!activeCard) return;
    reviewCard(activeCard.id, feedback);
    setReviewedIds((prev) => (prev.includes(activeCard.id) ? prev : [...prev, activeCard.id]));
  }

  function jumpToSource() {
    if (!activeCard?.sourceMaterialId) return;
    selectMaterial(activeCard.sourceMaterialId);
    if (activeCard.sourceCueId) selectCue(activeCard.sourceCueId);
    router.push("/player");
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Progress header ── */}
      <section className="bg-white border border-black/[0.08] rounded-2xl px-6 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-gray-900">今日复习</h2>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              基于真实到期卡片组织复习，四档反馈会立即更新本地复习调度。
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <span className="status-badge" data-tone={queue.length ? "warning" : "success"}>
              待复习 {queue.length}
            </span>
            <span className="status-badge" data-tone="info">
              已完成 {progressCount}/{sessionTotal || queue.length}
            </span>
          </div>
        </div>
        {sessionTotal > 0 && (
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </section>

      {/* ── Main area ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Left: review card */}
        <section className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">
          {activeCard ? (
            <>
              {/* ── Card body — visual center ── */}
              <div className="flex flex-col items-center justify-center text-center px-10 pt-14 pb-10 min-h-[340px]">

                {/* Type label — tertiary, top */}
                <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-5">
                  {activeCard.type}
                </span>

                {/* Title — absolute visual center, dominant */}
                <h2 className="text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-5">
                  {activeCard.title}
                </h2>

                {/* Meaning — secondary */}
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  {activeCard.meaning || "暂无释义"}
                </p>

                {/* Example — tertiary, demoted, separated */}
                {activeCard.example && (
                  <p className="mt-8 pt-5 border-t border-gray-100 text-sm text-gray-400 italic leading-relaxed max-w-md w-full">
                    {activeCard.example}
                  </p>
                )}
              </div>

              {/* ── Meta footer — strictly demoted ── */}
              <div className="px-8 py-2.5 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-400">
                  {activeCard.sourceMaterialTitle || "未绑定来源"}
                </span>
                <span className="text-gray-300 text-[11px]">·</span>
                <span className="text-[11px] text-gray-400">
                  下次复习 {new Date(activeCard.nextReviewAt).toLocaleDateString("zh-CN")}
                </span>
              </div>

              {/* ── Feedback buttons ── */}
              <div className="px-6 py-5 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 text-center mb-3 tracking-wide">
                  你对这张卡片的掌握程度？
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {REVIEW_ACTIONS.map((item) => (
                    <button
                      key={item.id}
                      className="py-2.5 rounded-xl text-sm font-semibold border border-black/[0.08] bg-white hover:bg-gray-50 text-gray-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      type="button"
                      onClick={() => handleFeedback(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Source link — demoted */}
                <div className="mt-4 flex justify-center">
                  <button
                    className="text-xs text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    disabled={!activeCard.sourceMaterialId}
                    type="button"
                    onClick={jumpToSource}
                  >
                    回到来源句 →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[340px] px-8">
              <p className="text-sm text-gray-400 text-center leading-relaxed max-w-xs">
                当前没有到期卡片。等新卡片进入复习窗口后，这里才会出现真实任务。
              </p>
            </div>
          )}
        </section>

        {/* Right: queue */}
        <section className="bg-white border border-black/[0.08] rounded-2xl shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold tracking-tight text-gray-900">待复习队列</h2>
            <p className="text-xs text-gray-500 mt-0.5">只显示今天真正到期的卡片。</p>
          </div>

          {queue.length ? (
            <div className="flex flex-col gap-1.5">
              {queue.map((card) => (
                <button
                  key={card.id}
                  className={`w-full text-left px-3 py-3 rounded-xl border text-sm transition-all ${
                    activeCard?.id === card.id
                      ? "bg-blue-50 border-blue-200/60 text-blue-900"
                      : "bg-gray-50/80 border-transparent hover:bg-gray-100 text-gray-700"
                  }`}
                  type="button"
                  onClick={() => setCurrentCardId(card.id)}
                >
                  <span className="font-semibold block truncate leading-snug">{card.title}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    {card.type} · {card.sourceMaterialTitle || "未绑定来源"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-400 py-10">
              今天的待复习已经处理完了。
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
