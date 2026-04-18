"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ImportDialog from "./components/import-dialog";
import { UI_TEXT } from "./lib/platform-data";
import { getTone } from "./lib/ui-tone";
import { usePlatformStore } from "./platform-store";

const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: "概", label: "概览" },
  { href: "/library",   key: "library",   icon: "库", label: "学习空间" },
  { href: "/player",    key: "player",    icon: "学", label: "播放器" },
  { href: "/practice",  key: "practice",  icon: "练", label: "今日复习" },
  { href: "/cards",     key: "cards",     icon: "卡", label: "闪卡库" },
  { href: "/progress",  key: "progress",  icon: "记", label: "学习记录" },
  { href: "/settings",  key: "settings",  icon: "设", label: "设置" },
];

export default function PlatformShell({ children }) {
  const pathname = usePathname();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const {
    state,
    currentCue,
    currentMaterial,
    dashboardStats,
    dueCards,
    toggleSidebar,
  } = usePlatformStore();

  const collapsed = state.ui.sidebarCollapsed;
  const isImportPage = pathname === "/import";
  const isFocusPage = pathname === "/player" || pathname === "/practice";
  const materialTone = getTone(currentMaterial?.status);
  const headerTone = getTone(state.status);

  const labels = UI_TEXT[state.ui.language] || UI_TEXT.zh;
  const currentNavItem = NAV_ITEMS.find((item) => item.href === pathname) || NAV_ITEMS[0];

  const headerStats = [
    { label: "今日时长", value: `${dashboardStats.studyMinutes}m` },
    { label: "待复习",   value: dueCards.length },
    { label: "素材库",   value: state.materials.length },
  ];

  return (
    <div className={`platform-shell${collapsed ? " sidebar-collapsed" : " sidebar-expanded"}`}>
      {/* ── Sidebar ── */}
      <aside className={`platform-sidebar${collapsed ? " collapsed" : " expanded"}`}>
        <div className="sidebar-top">
          <div className="brand-block">
            <div className="brand-symbol">E</div>
            <div className="brand-copy">
              <strong>EchoFlow Pro</strong>
              <p>英语口语训练工作台</p>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
            onClick={() => toggleSidebar()}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <button
          className={`ios-button primary sidebar-import-button${collapsed ? " compact" : ""}`}
          type="button"
          onClick={() => setImportDialogOpen(true)}
        >
          {collapsed ? "+" : "+ 导入素材"}
        </button>

        <nav className="side-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}${collapsed ? " compact" : ""}`}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-copy">
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <>
            <div className="sidebar-card">
              <span className="sidebar-label">当前学习焦点</span>
              <strong>{currentCue?.english || "先导入一段学习素材"}</strong>
              <p>{currentMaterial?.title || "尚未选择素材"}</p>
              {currentMaterial && (
                <div className="sidebar-pills">
                  <span className="status-badge" data-tone={materialTone}>
                    {currentMaterial.status}
                  </span>
                  <span className="status-badge" data-tone={getTone(currentMaterial.learningGoal)}>
                    {currentMaterial.learningGoal}
                  </span>
                </div>
              )}
            </div>

            <div className="sidebar-footer-card">
              <div className="sidebar-metric">
                <strong>{state.materials.length}</strong>
                <span>素材</span>
              </div>
              <div className="sidebar-metric">
                <strong>{state.cards.length}</strong>
                <span>卡片</span>
              </div>
            </div>
          </>
        )}

        {collapsed && (
          <div className="sidebar-mini-state">
            <span className={`mini-indicator${state.materials.length ? " active" : ""}`} />
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="platform-main">
        <header className="platform-header">
          <div className="header-copy">
            <div className="header-kicker">
              <span className="header-kicker-chip">
                {isImportPage ? "导入工作台" : "学习工作台"}
              </span>
              {currentMaterial && !isImportPage && (
                <span className="status-badge" data-tone={materialTone}>
                  {currentMaterial.status}
                </span>
              )}
            </div>
            <div className="header-title-row">
              <h1>{isImportPage ? "导入素材" : currentNavItem.label}</h1>
              {currentMaterial && !isImportPage && (
                <div className="header-meta">
                  <span className="meta-chip" data-tone={getTone(currentMaterial.learningGoal)}>
                    {currentMaterial.learningGoal}
                  </span>
                  <span className="meta-chip" data-tone={getTone(currentMaterial.difficulty)}>
                    {currentMaterial.difficulty}
                  </span>
                </div>
              )}
            </div>
            <p>
              {isImportPage
                ? "支持视频链接、本地文件、字幕文件和字幕文本导入。"
                : currentMaterial
                ? `当前素材：${currentMaterial.title}`
                : "导入素材后即可开始完整的学习流程。"}
            </p>
            <div className="header-summary">
              {headerStats.map((item) => (
                <div className="header-stat" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="header-actions">
            {isFocusPage && (
              <button
                className="ios-button ghost"
                type="button"
                onClick={() => toggleSidebar(true)}
              >
                专注模式
              </button>
            )}
            <span className="header-badge" data-tone={headerTone}>
              {state.status}
            </span>
          </div>
        </header>

        <main className="page-frame">{children}</main>
      </div>

      <ImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
    </div>
  );
}
