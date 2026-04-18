"use client";

import Link from "next/link";
import { getTone } from "../lib/ui-tone";
import { usePlatformStore } from "../platform-store";

export default function DashboardScreen() {
  const { dashboardStats, state, currentMaterial, dueCards, formatDateTime } = usePlatformStore();

  return (
    <div className="page-grid dashboard-grid">
      {/* ── Hero stats ── */}
      <section className="ios-card section-card hero-card dash-hero">
        <div className="section-top">
          <div>
            <h2>今日学习</h2>
            <p>保持素材学习、跟读和卡片复习的完整闭环。</p>
          </div>
          <Link className="ios-button primary button-link" href="/player">
            继续学习
          </Link>
        </div>
        <div className="stats-grid">
          <div className="metric-card">
            <strong>{dashboardStats.studyMinutes}</strong>
            <span>今日学习时长（分钟）</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.materialsStudied}</strong>
            <span>学习素材数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.cardsAdded}</strong>
            <span>新增卡片数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.cardsReviewed}</strong>
            <span>已复习卡片数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.recordings}</strong>
            <span>跟读次数</span>
          </div>
          <div className="metric-card">
            <strong>{dashboardStats.aiRuns}</strong>
            <span>AI 分析次数</span>
          </div>
        </div>
      </section>

      {/* ── Current material ── */}
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>当前学习流</h2>
            <p>当前素材和下一步动作。</p>
          </div>
        </div>
        <div className="journey-card">
          <strong>{currentMaterial?.title || "未选择素材"}</strong>
          <p>{currentMaterial?.description || "先去学习空间导入一段视频或字幕。"}</p>
          {currentMaterial && (
            <div className="stat-pills">
              <span className="status-badge" data-tone={getTone(currentMaterial.status)}>
                {currentMaterial.status}
              </span>
              <span className="status-badge" data-tone={getTone(currentMaterial.difficulty)}>
                {currentMaterial.difficulty}
              </span>
              <span className="status-badge" data-tone={getTone(currentMaterial.learningGoal)}>
                {currentMaterial.learningGoal}
              </span>
            </div>
          )}
          <div className="button-row">
            <Link className="ios-button secondary button-link" href="/library">
              学习空间
            </Link>
            <Link className="ios-button ghost button-link" href="/cards">
              闪卡库
            </Link>
          </div>
        </div>
      </section>

      {/* ── Due cards ── */}
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>今日待复习</h2>
            <p>基于本地 SRS 调度，优先复习到期卡片。</p>
          </div>
          <span className="status-badge" data-tone={dueCards.length ? "warning" : "success"}>
            {dueCards.length} 张
          </span>
        </div>
        <div className="list-stack">
          {dueCards.length ? (
            dueCards.slice(0, 6).map((card) => (
              <div className="list-row" key={card.id}>
                <div>
                  <strong>{card.title}</strong>
                  <p>{card.type} · {card.difficultyTag}</p>
                </div>
                <span className="status-badge" data-tone={getTone(card.status)}>
                  {card.status}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-note">当前没有待复习卡片。</div>
          )}
        </div>
        {dueCards.length > 0 && (
          <div className="button-row" style={{ marginTop: "var(--s4)" }}>
            <Link className="ios-button primary button-link" href="/practice">
              开始复习
            </Link>
          </div>
        )}
      </section>

      {/* ── Recent logs ── */}
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>最近轨迹</h2>
            <p>快速回到上一段学习上下文。</p>
          </div>
        </div>
        <div className="list-stack">
          {state.logs.length ? (
            state.logs.slice(0, 8).map((log) => (
              <div className="list-row" key={log.id}>
                <div>
                  <strong>{log.type}</strong>
                  <p>{log.message}</p>
                </div>
                <span className="row-meta-text">{formatDateTime(log.createdAt)}</span>
              </div>
            ))
          ) : (
            <div className="empty-note">导入素材并开始学习后，这里才会出现真实轨迹。</div>
          )}
        </div>
      </section>
    </div>
  );
}
