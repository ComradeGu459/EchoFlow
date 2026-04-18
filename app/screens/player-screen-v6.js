"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import MediaPlayerSurface from "../components/media-player-surface";
import {
  buildCueCardDraft,
  clampSubtitleFontSize,
  formatCueEnglishForDisplay,
  shouldScrollCueIntoView,
} from "../lib/player-workspace";
import { formatTime } from "../lib/platform-model";
import { usePlatformStore } from "../platform-store";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];
const FONT_SIZES = [
  { value: 16, label: "小" },
  { value: 18, label: "中" },
  { value: 21, label: "大" },
];
const TOOL_TABS = [
  { id: "word",         label: "词汇" },
  { id: "analysis",    label: "AI 讲解" },
  { id: "pronunciation", label: "发音" },
];

export default function PlayerScreenV6() {
  const {
    currentMaterial,
    currentCue,
    currentCues,
    resolvedAiRoutes,
    selectedWordInsight,
    state,
    selectCue,
    selectWord,
    syncCueWithPlaybackTime,
    rememberPlayerProgress,
    toggleCueFavorite,
    addCard,
    setPlayerPreferences,
    runAiAnalysis,
    runSpeechSynthesis,
    runSpeechTranscription,
    toggleRecording,
  } = usePlatformStore();

  const playerRef = useRef(null);
  const subtitleListRef = useRef(null);
  const cueRefs = useRef(new Map());
  const cueChangeSourceRef = useRef("manual");
  const saveProgressRef = useRef({ seconds: 0 });
  const restoredMaterialIdRef = useRef("");
  const loopGuardRef = useRef(0);

  const [toolTab, setToolTab] = useState("word");
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const playerUi = state.ui.player;
  const playbackRate = playerUi.playbackRate;
  const subtitleFontSize = clampSubtitleFontSize(playerUi.subtitleFontSize);
  const loopCurrentCue = playerUi.loopCurrentCue;
  const showTranslation = playerUi.showTranslation;

  const currentRecording = state.practice.recordings.find(
    (r) => r.materialId === currentMaterial?.id,
  );
  const currentCueIndex = currentCue
    ? Math.max(0, currentCues.findIndex((c) => c.id === currentCue.id))
    : 0;
  const progressPercent = currentMaterial?.durationMinutes
    ? Math.min(100, Math.round((currentTime / (currentMaterial.durationMinutes * 60)) * 100))
    : 0;
  const learningProgressLabel = `${currentCueIndex + 1}/${Math.max(currentCues.length, 1)} 句`;

  useEffect(() => {
    restoredMaterialIdRef.current = "";
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    cueChangeSourceRef.current = "manual";
  }, [currentMaterial?.id]);

  useEffect(() => {
    if (!currentCue?.id) return;
    const container = subtitleListRef.current;
    const target = cueRefs.current.get(currentCue.id);
    if (!container || !target) return;
    const shouldScroll = shouldScrollCueIntoView(
      container.getBoundingClientRect(),
      target.getBoundingClientRect(),
    );
    if (!shouldScroll) return;
    target.scrollIntoView({
      block: cueChangeSourceRef.current === "manual" ? "center" : "nearest",
      behavior: cueChangeSourceRef.current === "manual" ? "smooth" : "auto",
    });
  }, [currentCue?.id]);

  useEffect(() => () => {
    if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
  }, [ttsAudioUrl]);

  function handlePlayerReady() {
    setIsReady(true);
    if (
      currentMaterial?.lastPositionSeconds > 0 &&
      restoredMaterialIdRef.current !== currentMaterial.id
    ) {
      restoredMaterialIdRef.current = currentMaterial.id;
      playerRef.current?.seekTo(currentMaterial.lastPositionSeconds);
      setCurrentTime(currentMaterial.lastPositionSeconds);
      cueChangeSourceRef.current = "playback";
      syncCueWithPlaybackTime(currentMaterial.lastPositionSeconds);
    }
  }

  function handleTimeChange(seconds) {
    setCurrentTime(seconds);
    cueChangeSourceRef.current = "playback";
    syncCueWithPlaybackTime(seconds);

    if (
      currentCue &&
      loopCurrentCue &&
      seconds >= currentCue.end + (currentMaterial?.subtitleOffset || 0)
    ) {
      const now = Date.now();
      if (now - loopGuardRef.current > 250) {
        loopGuardRef.current = now;
        playerRef.current?.seekTo(currentCue.start + (currentMaterial?.subtitleOffset || 0));
        if (isPlaying) playerRef.current?.play();
        return;
      }
    }

    if (Math.abs(seconds - saveProgressRef.current.seconds) >= 1) {
      saveProgressRef.current.seconds = seconds;
      rememberPlayerProgress(seconds);
    }
  }

  function seekToCue(cueId, source = "manual") {
    const cue = currentCues.find((c) => c.id === cueId);
    if (!cue) return;
    cueChangeSourceRef.current = source;
    selectCue(cueId);
    const t = cue.start + (currentMaterial?.subtitleOffset || 0);
    playerRef.current?.seekTo(t);
    setCurrentTime(t);
  }

  function goRelative(delta) {
    if (!currentCue) return;
    const next = currentCues[Math.min(currentCues.length - 1, Math.max(0, currentCueIndex + delta))];
    if (next) seekToCue(next.id, "manual");
  }

  async function handleAiSpeech() {
    if (!currentCue?.english) return;
    setIsSynthesizing(true);
    const result = await runSpeechSynthesis(currentCue.english);
    if (result.ok && result.audioUrl) {
      if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
      setTtsAudioUrl(result.audioUrl);
    }
    setIsSynthesizing(false);
  }

  async function handleAiTranscription() {
    if (!currentRecording) return;
    setIsTranscribing(true);
    await runSpeechTranscription(currentRecording);
    setIsTranscribing(false);
  }

  const progressLabel = useMemo(() => {
    if (!currentMaterial) return "00:00:00";
    return `${formatTime(currentTime)} / ${formatTime((currentMaterial.durationMinutes || 0) * 60)}`;
  }, [currentMaterial, currentTime]);

  if (!currentMaterial) {
    return (
      <section className="ios-card section-card player-empty-state">
        <h2>还没有可学习的素材</h2>
        <p>先去导入页导入视频和字幕，播放器不会展示假视频或假字幕。</p>
        <div className="button-row">
          <Link className="ios-button primary button-link" href="/import">去导入素材</Link>
          <Link className="ios-button ghost button-link" href="/library">返回学习空间</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="player-reference-shell">
      {/* ── Topbar ── */}
      <section className="player-reference-topbar">
        <div className="player-reference-breadcrumb">
          <Link className="player-back-link" href="/library">← 返回</Link>
          <div>
            <h2>{currentMaterial.title}</h2>
            <p>
              {currentMaterial.sourceMediaKind === "youtube" ? "YouTube" : "本地"} ·{" "}
              {currentMaterial.topic || "未分类"} · {currentMaterial.difficulty} · {progressLabel}
            </p>
          </div>
        </div>
        <div className="player-reference-progress">
          <span>学习进度 {progressPercent}%</span>
          <p>第 {learningProgressLabel}</p>
          <div className="player-reference-progressbar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </section>

      {/* ── 3-column stage ── */}
      <div className="player-reference-stage">

        {/* Col 1 — Video + controls */}
        <section className="player-reference-main">
          <div className="player-reference-video-card">
            <MediaPlayerSurface
              material={currentMaterial}
              onPlayingChange={setIsPlaying}
              onReady={handlePlayerReady}
              onTimeChange={handleTimeChange}
              playbackRate={playbackRate}
              ref={playerRef}
            />
          </div>

          <div className="player-reference-modebar">
            <button className="mode-chip" type="button">原音模式</button>
            <button className="mode-chip active" type="button">跟读模式</button>
            <button className="mode-chip" type="button">回音模式</button>
            <div className="mode-chip-spacer" />
            <button
              className={`mode-chip${loopCurrentCue ? " active" : ""}`}
              type="button"
              onClick={() => setPlayerPreferences({ loopCurrentCue: !loopCurrentCue })}
            >
              单句循环{loopCurrentCue ? "开" : "关"}
            </button>
            <span className="mode-chip plain">第 {learningProgressLabel}</span>
          </div>
        </section>

        {/* Col 2 — Subtitle list */}
        <aside className="player-reference-sidebar">
          <div className="player-reference-tabs">
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--c-text2)" }}>字幕</span>
            <div className="reference-font-controls">
              {FONT_SIZES.map((item) => (
                <button
                  key={item.value}
                  className={`font-chip${subtitleFontSize === item.value ? " active" : ""}`}
                  type="button"
                  onClick={() => setPlayerPreferences({ subtitleFontSize: item.value })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="reference-subtitle-list" ref={subtitleListRef}>
            {currentCues.map((cue) => (
              <button
                key={cue.id}
                className={`reference-subtitle-row${cue.id === currentCue?.id ? " active" : ""}`}
                ref={(node) => { if (node) cueRefs.current.set(cue.id, node); }}
                type="button"
                onClick={() => seekToCue(cue.id, "manual")}
              >
                <span className="reference-subtitle-time">
                  {formatTime(cue.start + (currentMaterial.subtitleOffset || 0))}
                </span>
                <div className="reference-subtitle-copy">
                  <strong style={{ fontSize: `${subtitleFontSize}px` }}>
                    {formatCueEnglishForDisplay(cue.english).split(" ").map((word, i) => {
                      const clean = word.toLowerCase().replace(/[^a-z']/gi, "");
                      return (
                        <span
                          key={`${cue.id}-${i}`}
                          className={`reference-word${state.selectedWord === clean ? " active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); selectWord(clean); }}
                        >
                          {word}{" "}
                        </span>
                      );
                    })}
                  </strong>
                  {showTranslation && cue.chinese ? <p>{cue.chinese}</p> : null}
                </div>
              </button>
            ))}
          </div>

          <div className="reference-side-actions">
            <button
              className="reference-action-button"
              type="button"
              onClick={() => currentCue && toggleCueFavorite(currentCue.id)}
            >
              收藏本句
            </button>
            <button
              className="reference-action-button"
              type="button"
              onClick={() =>
                currentCue &&
                addCard(buildCueCardDraft({ cue: currentCue, material: currentMaterial, type: "表达卡" }))
              }
            >
              加入闪卡
            </button>
          </div>
        </aside>

        {/* Col 3 — Tools */}
        <aside className="player-reference-sidebar">
          <div className="player-reference-tabs">
            {TOOL_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`reference-tab${toolTab === tab.id ? " active" : ""}`}
                type="button"
                onClick={() => setToolTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Word tab */}
          {toolTab === "word" && (
            <div style={{ padding: "var(--s3) var(--s4)", flex: 1, overflow: "auto" }}>
              {selectedWordInsight ? (
                <>
                  <div style={{ marginBottom: "var(--s3)" }}>
                    <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.03em" }}>
                      {selectedWordInsight.word}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--c-text3)", marginTop: "2px" }}>
                      在当前素材中出现 {selectedWordInsight.count} 次
                    </div>
                  </div>
                  <div className="mini-list">
                    {selectedWordInsight.examples.map((ex) => (
                      <div className="mini-row" key={`${selectedWordInsight.word}-${ex.id}`}>
                        <span>{formatTime(ex.start)}</span>
                        <p>{ex.english}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-note">在字幕中点击一个英文单词查看用法。</div>
              )}
            </div>
          )}

          {/* AI analysis tab */}
          {toolTab === "analysis" && (
            <div style={{ padding: "var(--s3) var(--s4)", flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
              <button
                className="ios-button secondary"
                disabled={!resolvedAiRoutes.study_analysis}
                type="button"
                style={{ width: "100%" }}
                onClick={() => runAiAnalysis("current")}
              >
                {resolvedAiRoutes.study_analysis ? "分析当前句" : "未配置 AI"}
              </button>
              {state.analytics.lastAiResult ? (
                <pre className="assistant-output">{state.analytics.lastAiResult}</pre>
              ) : (
                <div className="empty-note">点击上方按钮生成当前句的 AI 深度讲解。</div>
              )}
            </div>
          )}

          {/* Pronunciation tab */}
          {toolTab === "pronunciation" && (
            <div style={{ padding: "var(--s3) var(--s4)", flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
              <div className="button-row">
                <button
                  className="ios-button secondary"
                  type="button"
                  style={{ flex: 1 }}
                  onClick={toggleRecording}
                >
                  {state.practice.recordingState === "recording" ? "结束录音" : "开始录音"}
                </button>
                <button
                  className="ios-button ghost"
                  disabled={!resolvedAiRoutes.speech_in || !currentRecording || isTranscribing}
                  type="button"
                  onClick={handleAiTranscription}
                >
                  {isTranscribing ? "转写中…" : "AI 转写"}
                </button>
              </div>
              {currentRecording ? (
                <audio controls src={currentRecording.url} style={{ width: "100%" }} />
              ) : null}
              {state.practice.aiTranscription ? (
                <pre className="assistant-output">{state.practice.aiTranscription}</pre>
              ) : (
                <div className="empty-note">先录一段跟读音频，这里才会出现诊断结果。</div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Bottom controls ── */}
      <section className="player-reference-bottombar">
        <div className="player-bottom-left">
          <button className="player-round-button" type="button" onClick={() => goRelative(-1)}>‹</button>
          <button
            className="player-round-button primary"
            disabled={!isReady}
            type="button"
            onClick={() => playerRef.current?.togglePlay()}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button className="player-round-button" type="button" onClick={() => goRelative(1)}>›</button>
        </div>

        <div className="player-bottom-center">
          <div className="segmented">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                className={playbackRate === rate ? "active" : ""}
                type="button"
                onClick={() => setPlayerPreferences({ playbackRate: rate })}
              >
                {rate}x
              </button>
            ))}
          </div>
          <button
            className="ios-button ghost"
            disabled={!resolvedAiRoutes.speech_out || !currentCue?.english || isSynthesizing}
            type="button"
            onClick={handleAiSpeech}
          >
            {isSynthesizing ? "生成中…" : "AI 朗读"}
          </button>
          <button
            className="ios-button ghost"
            type="button"
            onClick={() => setPlayerPreferences({ showTranslation: !showTranslation })}
          >
            {showTranslation ? "隐藏中文" : "显示中文"}
          </button>
        </div>

        <div className="player-bottom-right">
          {ttsAudioUrl ? <audio controls src={ttsAudioUrl} style={{ height: "36px" }} /> : null}
          <button className="ios-button primary" type="button" onClick={toggleRecording}>
            {state.practice.recordingState === "recording" ? "结束跟读" : "开始跟读"}
          </button>
        </div>
      </section>
    </div>
  );
}
