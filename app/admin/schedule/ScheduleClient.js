"use client";

import { useMemo, useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";
import { CalendarDays, Wallet, StickyNote, Send, AlertTriangle } from "lucide-react";
import {
  CLASS_TYPE_LABEL, CLASS_TYPE_COLOR, formatKRW,
  PRICING_SLOTS, SESSION_STEP_OPTIONS, formatClassLabel, pricingKey, lookupPricing,
} from "@/lib/pricing";
import { sessionMaterialsStep, hasStepMaterials } from "@/lib/stepMaterials";
import {
  createSession,
  updateSession,
  deleteSession,
  addEnrollment,
  setEnrollmentStatus,
  removeEnrollment,
  sendMaterialsForEnrollment,
  sendMaterialsToInstructor,
} from "./actions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtTime(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "HH:MM" (24h) → { period: "AM"|"PM", hour12: 1..12, minute: 0..59 }
function to12h(hhmm) {
  const [hStr, mStr] = (hhmm || "00:00").split(":");
  const h24 = Math.max(0, Math.min(23, parseInt(hStr, 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  const period = h24 < 12 ? "AM" : "PM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { period, hour12, minute };
}
// inverse: dropdown values → "HH:MM"
function to24h(period, hour12, minute) {
  const h12 = Math.max(1, Math.min(12, Number(hour12) || 12));
  const m = Math.max(0, Math.min(59, Number(minute) || 0));
  const base = h12 % 12; // 12→0, 1→1 ... 11→11
  const h24 = period === "PM" ? base + 12 : base;
  return `${pad2(h24)}:${pad2(m)}`;
}
// add days to YYYY-MM-DD string, return YYYY-MM-DD
function shiftDateKey(baseKey, deltaDays) {
  const base = baseKey ? new Date(`${baseKey}T00:00:00`) : new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  return dateKey(d);
}

function buildMonthGrid(year, month, todayKey) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const start = new Date(year, month, 1 - startDay);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      date: d,
      key: dateKey(d),
      inMonth: d.getMonth() === month,
      isToday: dateKey(d) === todayKey,
    });
  }
  return cells;
}

function userLabel(u) {
  if (!u) return "-";
  return u.nickname || u.name || u.email || "이름없음";
}

function isPastSession(sess) {
  return new Date(sess.startAt).getTime() < Date.now();
}

function canEditSession(me, sess) {
  if (me.role === "SUPER_ADMIN") return true;
  if (sess.createdById === me.id) return true;
  if (sess.mainInstructorId === me.id) return true;
  return false;
}

function canDeleteSession(me, sess) {
  if (me.role === "SUPER_ADMIN") return true;
  if (sess.createdById !== me.id) return false;
  return !isPastSession(sess);
}

export default function ScheduleClient({ me, sessions, staffUsers, memberUsers, pricing = {}, serverNowIso }) {
  // 서버에서 받은 ISO 시각으로 today 를 고정 — SSR ↔ 클라이언트 hydration 사이
  // new Date() 로 인한 mismatch (React #418) 를 막는다.
  const today = useMemo(
    () => (serverNowIso ? new Date(serverNowIso) : new Date()),
    [serverNowIso]
  );
  const todayKey = useMemo(() => dateKey(today), [today]);

  const [viewYear,  setViewYear]  = useState(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getMonth());
  const [selectedKey, setSelectedKey] = useState(() => todayKey);
  const [tab, setTab] = useState("calendar"); // 'calendar' | 'summary'
  const [modal, setModal] = useState(null); // null | {mode:'new', date} | {mode:'edit', session}
  const [enrollPickerFor, setEnrollPickerFor] = useState(null); // sessionId
  const [pending, startTransition] = useTransition();

  const sessionsByDay = useMemo(() => {
    const m = new Map();
    for (const s of sessions) {
      const d = new Date(s.startAt);
      const k = dateKey(d);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    }
    return m;
  }, [sessions]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth, todayKey), [viewYear, viewMonth, todayKey]);
  const selectedSessions = sessionsByDay.get(selectedKey) || [];

  function gotoMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {me.role === "SUPER_ADMIN" && (
        <div style={{ display: "flex", gap: 6, padding: 4, background: "var(--tb-surface-2)", borderRadius: 12, alignSelf: "flex-start" }}>
          {[
            { key: "calendar", label: "캘린더", Icon: CalendarDays },
            { key: "summary", label: "정산 요약", Icon: Wallet },
          ].map((t) => {
            const active = tab === t.key;
            const TabIcon = t.Icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="tb-press-soft"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 18px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  background: active ? "linear-gradient(135deg, #fb923c, #f97316)" : "transparent",
                  color: active ? "#1a1206" : "var(--tb-text-muted)",
                }}
              >
                <TabIcon size={15} strokeWidth={2.4} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {me.role === "SUPER_ADMIN" && tab === "summary" ? (
        <PayoutSummary
          sessions={sessions}
          viewYear={viewYear}
          viewMonth={viewMonth}
          setViewYear={setViewYear}
          setViewMonth={setViewMonth}
        />
      ) : (
        <div className="sched-cal-layout">
          <div className="sched-cal-left">
      <CalendarHeader
        year={viewYear}
        month={viewMonth}
        onPrev={() => gotoMonth(-1)}
        onNext={() => gotoMonth(1)}
        onToday={() => {
          const t = new Date();
          setViewYear(t.getFullYear());
          setViewMonth(t.getMonth());
          setSelectedKey(dateKey(t));
        }}
        onAdd={() => setModal({ mode: "new", date: selectedKey })}
      />

      <CalendarGrid
        grid={grid}
        sessionsByDay={sessionsByDay}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
      />
          </div>
          <div className="sched-cal-right">
      <DayDetail
        dateKey={selectedKey}
        sessions={selectedSessions}
        me={me}
        onEdit={(sess) => {
          if (!canEditSession(me, sess)) {
            alert("본인이 등록한 회차만 수정할 수 있습니다.");
            return;
          }
          setModal({ mode: "edit", session: sess });
        }}
        onAdd={() => setModal({ mode: "new", date: selectedKey })}
        onDelete={(sess) => {
          if (!canDeleteSession(me, sess)) {
            if (me.role !== "SUPER_ADMIN" && sess.createdById !== me.id) {
              alert("본인이 등록한 회차만 삭제할 수 있습니다.");
            } else if (isPastSession(sess)) {
              alert("이미 지난 일정은 삭제할 수 없습니다. 슈퍼관리자에게 문의하세요.");
            } else {
              alert("이 회차를 삭제할 권한이 없습니다.");
            }
            return;
          }
          if (!confirm("이 회차를 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.")) return;
          startTransition(async () => {
            try {
              await deleteSession(sess.id);
              alert("회차가 삭제되었습니다.");
            } catch (e) {
              const msg = e?.message || "";
              if (msg.includes("forbidden_past_date")) {
                alert("이미 지난 일정은 삭제할 수 없습니다.");
              } else if (msg.includes("forbidden_not_owner")) {
                alert("본인이 등록한 회차만 삭제할 수 있습니다.");
              } else {
                alert("삭제에 실패했습니다.");
              }
            }
          });
        }}
        onOpenEnroll={(sessId) => setEnrollPickerFor(sessId)}
        onSetStatus={(eid, status) => startTransition(() => setEnrollmentStatus(eid, status))}
        onRemoveEnroll={(eid) => {
          if (!confirm("참가자에서 제외할까요?")) return;
          startTransition(() => removeEnrollment(eid));
        }}
        onSendMaterials={(eid) => {
          if (!confirm("이 수강생의 이메일로 강의자료를 발송할까요?")) return;
          startTransition(async () => {
            try {
              const r = await sendMaterialsForEnrollment(eid);
              if (r?.ok) alert("✅ " + r.message);
              else       alert("⚠ " + (r?.message || "발송에 실패했습니다."));
            } catch (e) {
              console.error(e);
              alert("⚠ 발송에 실패했습니다.");
            }
          });
        }}
        onSendMaterialsToInstructor={(sessId, role, label) => {
          if (!confirm(`${label} 이메일로 강의자료를 발송할까요?`)) return;
          startTransition(async () => {
            try {
              const r = await sendMaterialsToInstructor(sessId, role);
              if (r?.ok) alert("✅ " + r.message);
              else       alert("⚠ " + (r?.message || "발송에 실패했습니다."));
            } catch (e) {
              console.error(e);
              alert("⚠ 발송에 실패했습니다.");
            }
          });
        }}
        pending={pending}
      />
          </div>
        </div>
      )}

      <style>{`
        .sched-cal-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.75fr);
          gap: 16px;
          align-items: start;
        }
        .sched-cal-left { display: flex; flex-direction: column; gap: 16px; }
        @media (max-width: 980px) {
          .sched-cal-layout { grid-template-columns: 1fr; }
        }
      `}</style>

      {modal && (
        <SessionModal
          mode={modal.mode}
          initialDate={modal.date}
          session={modal.session}
          staffUsers={staffUsers}
          pricing={pricing}
          onClose={() => setModal(null)}
          onSave={(payload) => {
            startTransition(async () => {
              try {
                if (modal.mode === "new") await createSession(payload);
                else                       await updateSession(modal.session.id, payload);
                setModal(null);
              } catch (e) {
                const msg = e?.message || "";
                if (msg.includes("forbidden_not_owner")) {
                  alert("본인이 등록한 회차만 수정할 수 있습니다.");
                } else {
                  alert("저장에 실패했습니다.");
                }
              }
            });
          }}
          pending={pending}
        />
      )}

      {enrollPickerFor && (
        <EnrollPicker
          session={sessions.find((s) => s.id === enrollPickerFor)}
          memberUsers={memberUsers}
          onClose={() => setEnrollPickerFor(null)}
          onAdd={(userId) => startTransition(() => addEnrollment(enrollPickerFor, userId))}
          pending={pending}
        />
      )}
    </div>
  );
}

function CalendarHeader({ year, month, onPrev, onNext, onToday, onAdd }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
      background: "var(--tb-surface)", borderRadius: 14, padding: "12px 16px",
      border: "1px solid var(--tb-border)", boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onPrev} className="tb-press-soft" style={navBtn}>‹</button>
        <div style={{ minWidth: 140, textAlign: "center", fontWeight: 800, fontSize: 18 }}>
          {year}년 {month + 1}월
        </div>
        <button onClick={onNext} className="tb-press-soft" style={navBtn}>›</button>
        <button onClick={onToday} className="tb-press-soft" style={{ ...navBtn, width: "auto", padding: "6px 12px", fontSize: 13 }}>오늘</button>
      </div>
      <button onClick={onAdd} className="tb-press" style={addBtn}>+ 회차 등록</button>
    </div>
  );
}

const navBtn = {
  width: 36, height: 36, borderRadius: 10, border: "1px solid var(--tb-border)",
  background: "var(--tb-surface-2)", color: "var(--tb-text)", fontSize: 18, fontWeight: 700, cursor: "pointer",
};

const addBtn = {
  padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 700,
  color: "#fff", background: "#f97316", border: "none", cursor: "pointer",
};

function CalendarGrid({ grid, sessionsByDay, selectedKey, onSelect }) {
  return (
    <div className="tb-cal" style={{
      background: "var(--tb-surface)", borderRadius: 14,
      border: "1px solid var(--tb-border)", boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        background: "var(--tb-surface-2)", borderBottom: "1px solid var(--tb-border)",
      }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700,
            color: i === 0 ? "#f87171" : i === 6 ? "#93c5fd" : "var(--tb-text-muted)",
          }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {grid.map((cell, i) => {
          const items = sessionsByDay.get(cell.key) || [];
          const isSelected = cell.key === selectedKey;
          const dow = i % 7;
          return (
            <button
              key={cell.key + i}
              onClick={() => onSelect(cell.key)}
              className="tb-cal-cell"
              style={{
                position: "relative",
                minHeight: 92,
                minWidth: 0,
                overflow: "hidden",
                padding: 6,
                textAlign: "left",
                border: "1px solid var(--tb-border)",
                background: isSelected ? "rgba(249,115,22,0.12)" : "var(--tb-surface)",
                color: cell.inMonth ? "var(--tb-text)" : "var(--tb-text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                outline: isSelected ? "2px solid #f97316" : "none",
                outlineOffset: -2,
              }}
            >
              <div className="tb-cal-date" style={{
                fontSize: 13, fontWeight: cell.isToday ? 800 : 600,
                color: dow === 0 ? "#f87171" : dow === 6 ? "#93c5fd" : (cell.inMonth ? "var(--tb-text)" : "var(--tb-text-muted)"),
                marginBottom: 4,
              }}>
                {cell.date.getDate()}
              </div>
              <div className="tb-cal-chips" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.slice(0, 3).map((s) => {
                  const c = CLASS_TYPE_COLOR[s.classType];
                  return (
                    <div key={s.id} className="tb-cal-chip" style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                      background: c.bg, color: c.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {fmtTime(s.startAt)} {formatClassLabel(s.classType, s.stepLevel)}
                    </div>
                  );
                })}
                {items.length > 3 && (
                  <div className="tb-cal-more" style={{ fontSize: 11, color: "var(--tb-text-muted)" }}>+{items.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: 좁은 칸에 텍스트가 깨지는 걸 방지하려고
          chip 텍스트는 숨기고 컬러 바만 노출. 셀 높이도 압축. */}
      <style jsx>{`
        @media (max-width: 640px) {
          .tb-cal :global(.tb-cal-cell) {
            min-height: 64px !important;
            padding: 4px !important;
          }
          .tb-cal :global(.tb-cal-date) {
            font-size: 12px !important;
            margin-bottom: 2px !important;
          }
          .tb-cal :global(.tb-cal-chip) {
            padding: 0 !important;
            height: 4px !important;
            font-size: 0 !important;
            line-height: 0 !important;
            border-radius: 2px !important;
          }
          .tb-cal :global(.tb-cal-more) {
            font-size: 9px !important;
            margin-top: 2px;
          }
        }
      `}</style>
    </div>
  );
}

function DayDetail({ dateKey, sessions, me, onEdit, onAdd, onDelete, onOpenEnroll, onSetStatus, onRemoveEnroll, onSendMaterials, onSendMaterialsToInstructor, pending }) {
  return (
    <div style={{
      background: "var(--tb-surface)", borderRadius: 14, padding: 20,
      border: "1px solid var(--tb-border)", boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{dateKey} 회차</h2>
        <button onClick={onAdd} className="tb-press-soft" style={subAddBtn}>+ 이 날짜에 회차 추가</button>
      </div>
      {sessions.length === 0 ? (
        <div style={{ color: "var(--tb-text-muted)", padding: "24px 0", textAlign: "center" }}>등록된 회차가 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              sess={s}
              me={me}
              onEdit={() => onEdit(s)}
              onDelete={() => onDelete(s)}
              onOpenEnroll={() => onOpenEnroll(s.id)}
              onSetStatus={onSetStatus}
              onRemoveEnroll={onRemoveEnroll}
              onSendMaterials={onSendMaterials}
              onSendMaterialsToInstructor={onSendMaterialsToInstructor}
              pending={pending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const subAddBtn = {
  padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
  color: "var(--tb-text)", background: "var(--tb-surface-2)", border: "1px solid var(--tb-border)", cursor: "pointer",
};

function SessionCard({ sess, me, onEdit, onDelete, onOpenEnroll, onSetStatus, onRemoveEnroll, onSendMaterials, onSendMaterialsToInstructor, pending }) {
  const c = CLASS_TYPE_COLOR[sess.classType];
  const showEdit = canEditSession(me, sess);
  const showDelete = canDeleteSession(me, sess);
  const matStep = sessionMaterialsStep(sess.classType, sess.stepLevel);
  const materialsReady = !!matStep && hasStepMaterials(matStep);
  return (
    <div style={{
      border: "1px solid var(--tb-border)", borderRadius: 12, padding: 16, background: "var(--tb-surface)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800,
            background: c.bg, color: c.fg,
          }}>{formatClassLabel(sess.classType, sess.stepLevel)}</span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{fmtTime(sess.startAt)}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {showEdit && (
            <button onClick={onEdit} className="tb-press-soft" style={miniBtn} disabled={pending}>편집</button>
          )}
          {showDelete && (
            <button onClick={onDelete} className="tb-press-soft" style={{ ...miniBtn, color: "#f87171" }} disabled={pending}>삭제</button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14, fontSize: 13 }}>
        <InstructorInfo
          label="주강사"
          instructor={sess.mainInstructor}
          materialsReady={materialsReady}
          onSend={() =>
            onSendMaterialsToInstructor(
              sess.id,
              "main",
              userLabel(sess.mainInstructor) + " 주강사"
            )
          }
          pending={pending}
        />
        <InstructorInfo
          label="보조강사"
          instructor={sess.assistantInstructor}
          fallback={sess.assistantToReserve ? "충당금" : "—"}
          materialsReady={materialsReady}
          onSend={() =>
            onSendMaterialsToInstructor(
              sess.id,
              "assistant",
              userLabel(sess.assistantInstructor) + " 보조강사"
            )
          }
          pending={pending}
        />
        <Info label="신청" value={`${sess.counts.applicants}명`} />
        <Info label="참가" value={`${sess.counts.attendees}명`} highlight />
      </div>

      {sess.note && sess.note.trim() && (
        <div style={{
          background: "color-mix(in srgb, #fbbf24 12%, #1f1d26)",
          border: "1px solid rgba(251,191,36,0.35)",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 10,
          fontSize: 13,
          lineHeight: 1.6,
          color: "#fde68a",
          whiteSpace: "pre-line",
          wordBreak: "break-word",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, color: "#fbbf24", marginBottom: 4, letterSpacing: "0.04em" }}><StickyNote size={12} strokeWidth={2.4} /> 메모</div>
          {sess.note}
        </div>
      )}

      {sess.scope.canSeeAnything && (
        <RevenueBox revenue={sess.revenue} scope={sess.scope} />
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>참가자</h3>
          <button onClick={onOpenEnroll} className="tb-press-soft" style={miniBtn} disabled={pending}>+ 회원 추가</button>
        </div>
        {sess.enrollments.length === 0 ? (
          <div style={{ color: "var(--tb-text-muted)", fontSize: 13, padding: "8px 0" }}>아직 등록된 참가자가 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {sess.enrollments.map((e) => (
              <EnrollmentRow
                key={e.id}
                e={e}
                session={sess}
                onSetStatus={(status) => onSetStatus(e.id, status)}
                onRemove={() => onRemoveEnroll(e.id)}
                onSendMaterials={() => onSendMaterials(e.id)}
                pending={pending}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tb-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: highlight ? 800 : 600, color: highlight ? "#fb923c" : "var(--tb-text)" }}>{value}</div>
    </div>
  );
}

function InstructorInfo({ label, instructor, fallback = "—", materialsReady, onSend, pending }) {
  const hasInstructor = !!instructor;
  const canSend = hasInstructor && materialsReady && !!instructor.email;
  const sendTitle = !hasInstructor
    ? "강사가 지정되지 않았습니다"
    : !instructor.email
    ? "강사의 이메일이 등록되어 있지 않습니다"
    : !materialsReady
    ? "이 단계의 자료는 아직 준비중입니다"
    : "강사 이메일로 강의자료 발송";

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tb-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--tb-text)" }}>
          {hasInstructor ? userLabel(instructor) : fallback}
        </span>
        {hasInstructor && (
          <button
            type="button"
            onClick={onSend}
            disabled={pending || !canSend}
            className="tb-press-soft"
            title={sendTitle}
            style={{
              ...miniBtn,
              padding: "3px 9px",
              fontSize: 11,
              color: canSend ? "#93c5fd" : "var(--tb-text-muted)",
              background: canSend ? "rgba(59,130,246,0.15)" : "var(--tb-surface-2)",
              borderColor: canSend ? "rgba(59,130,246,0.35)" : "var(--tb-border)",
              fontWeight: canSend ? 700 : 500,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Send size={11} strokeWidth={2.4} /> {!materialsReady ? "준비중" : "자료발송"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function RevenueBox({ revenue, scope }) {
  const items = [
    scope.canSeeTotal     && { k: "총합계",   v: revenue.total,     accent: "var(--tb-text)" },
    scope.canSeeToolb     && { k: "툴비",     v: revenue.toolb,     accent: "#fb923c" },
    scope.canSeeMain      && { k: "주강사",   v: revenue.main,      accent: "#93c5fd" },
    scope.canSeeAssistant && { k: "보조강사", v: revenue.assistant, accent: "#fb7185" },
    scope.canSeeReserve   && { k: "충당금",   v: revenue.reserve,   accent: "#fbbf24" },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div style={{
      background: "var(--tb-surface-2)", borderRadius: 10, padding: 12,
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10,
    }}>
      {items.map((it) => (
        <div key={it.k}>
          <div style={{ fontSize: 11, color: "var(--tb-text-muted)", fontWeight: 600 }}>{it.k}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: it.accent }}>{formatKRW(it.v)}</div>
        </div>
      ))}
    </div>
  );
}

const miniBtn = {
  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  color: "var(--tb-text)", background: "var(--tb-surface-2)", border: "1px solid var(--tb-border)", cursor: "pointer",
};

const STATUS_STYLE = {
  APPLIED:   { label: "신청", bg: "rgba(59,130,246,0.15)", fg: "#93c5fd" },
  ATTENDED:  { label: "참가", bg: "rgba(249,115,22,0.18)", fg: "#fb923c" },
  CANCELLED: { label: "취소", bg: "rgba(239,68,68,0.15)", fg: "#f87171" },
};

function EnrollmentRow({ e, session, onSetStatus, onRemove, onSendMaterials, pending }) {
  const matStep = session ? sessionMaterialsStep(session.classType, session.stepLevel) : null;
  const materialsReady = !!matStep && hasStepMaterials(matStep);
  const isAttended = e.status === "ATTENDED";
  const canSendMaterials = materialsReady && isAttended;
  const sendTitle = !materialsReady
    ? "이 단계의 자료는 아직 준비중입니다"
    : !isAttended
    ? "참가 확정된 수강생에게만 발송할 수 있습니다"
    : "수강생 이메일로 강의자료 발송";

  return (
    <li style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", border: "1px solid var(--tb-border)", borderRadius: 8, background: "var(--tb-surface-2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{userLabel(e.user)}</span>
        <span style={{
          padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
          background: STATUS_STYLE[e.status].bg, color: STATUS_STYLE[e.status].fg,
        }}>
          {STATUS_STYLE[e.status].label}
        </span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button
          onClick={onSendMaterials}
          disabled={pending || !canSendMaterials}
          className="tb-press-soft"
          title={sendTitle}
          style={{
            ...miniBtn,
            padding: "4px 10px", fontSize: 11,
            color: canSendMaterials ? "#93c5fd" : "var(--tb-text-muted)",
            background: canSendMaterials ? "rgba(59,130,246,0.15)" : "var(--tb-surface-2)",
            borderColor: canSendMaterials ? "rgba(59,130,246,0.35)" : "var(--tb-border)",
            fontWeight: canSendMaterials ? 700 : 500,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Send size={11} strokeWidth={2.4} /> {!materialsReady ? "준비중" : "자료발송"}</span>
        </button>
        {["APPLIED", "ATTENDED", "CANCELLED"].map((st) => (
          <button
            key={st}
            onClick={() => onSetStatus(st)}
            disabled={pending || e.status === st}
            className="tb-press-soft"
            style={{
              ...miniBtn,
              padding: "4px 8px", fontSize: 11,
              background: e.status === st ? STATUS_STYLE[st].bg : "var(--tb-surface-2)",
              color: e.status === st ? STATUS_STYLE[st].fg : "var(--tb-text)",
              fontWeight: e.status === st ? 800 : 500,
              opacity: e.status === st ? 1 : 0.85,
            }}
          >
            {STATUS_STYLE[st].label}
          </button>
        ))}
        <button onClick={onRemove} disabled={pending} className="tb-press-soft" style={{ ...miniBtn, padding: "4px 8px", fontSize: 11, color: "var(--tb-text-muted)" }}>
          제외
        </button>
      </div>
    </li>
  );
}

function SessionModal({ mode, initialDate, session, staffUsers, pricing, onClose, onSave, pending }) {
  const initial = session
    ? {
        date: dateKey(new Date(session.startAt)),
        startTime: fmtTime(session.startAt),
        slotKey: pricingKey(session.classType, session.stepLevel ?? 0),
        mainInstructorId: session.mainInstructorId || "",
        assistantInstructorId: session.assistantInstructorId || "",
        assistantToReserve: !!session.assistantToReserve,
        note: session.note || "",
      }
    : {
        date: initialDate,
        startTime: "14:00",
        slotKey: pricingKey("ZERO", 0),
        mainInstructorId: "",
        assistantInstructorId: "",
        assistantToReserve: false,
        note: "",
      };

  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Sentinel for the assistant select — chosen instead of an instructor user id.
  const RESERVE_SENTINEL = "__reserve__";
  const assistantValue = form.assistantInstructorId
    ? form.assistantInstructorId
    : form.assistantToReserve
      ? RESERVE_SENTINEL
      : "";
  const onAssistantChange = (v) => {
    if (v === RESERVE_SENTINEL) {
      setForm((f) => ({ ...f, assistantInstructorId: "", assistantToReserve: true }));
    } else {
      setForm((f) => ({ ...f, assistantInstructorId: v, assistantToReserve: false }));
    }
  };

  function buildPayload() {
    const [classType, stepStr] = form.slotKey.split("_");
    return {
      date: form.date,
      startTime: form.startTime,
      classType,
      stepLevel: Number(stepStr),
      mainInstructorId: form.mainInstructorId,
      assistantInstructorId: form.assistantInstructorId,
      assistantToReserve: form.assistantToReserve,
      note: form.note,
    };
  }

  return (
    <ModalShell title={mode === "new" ? "회차 등록" : "회차 편집"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="날짜">
          <DatePicker value={form.date} onChange={(v) => set("date", v)} />
        </Field>
        <Field label="시작 시각">
          <TimePicker value={form.startTime} onChange={(v) => set("startTime", v)} />
        </Field>
        <Field label="클래스 / 단계">
          <select value={form.slotKey} onChange={(e) => set("slotKey", e.target.value)} style={S.input}>
            {(() => {
              const known = new Set(
                SESSION_STEP_OPTIONS.map((o) => pricingKey(o.classType, o.stepLevel))
              );
              // 기존(legacy) slot — 예: stepLevel=1 (UP 1단계 parent) — 이 dropdown 에
              // 없으면 편집 시 visible state 와 form state 가 어긋난다. 동적으로 추가.
              const opts = known.has(form.slotKey)
                ? SESSION_STEP_OPTIONS
                : (() => {
                    const [ct, lv] = form.slotKey.split("_");
                    return [{ classType: ct, stepLevel: Number(lv) }, ...SESSION_STEP_OPTIONS];
                  })();
              return opts.map((slot) => {
                const key = pricingKey(slot.classType, slot.stepLevel);
                const row = lookupPricing(pricing, slot.classType, slot.stepLevel);
                const label = formatClassLabel(slot.classType, slot.stepLevel);
                const priceTxt = row ? ` (${row.pricePerPerson.toLocaleString("ko-KR")}원)` : "";
                return <option key={key} value={key}>{label}{priceTxt}</option>;
              });
            })()}
          </select>
        </Field>
        <Row>
          <Field label="주강사">
            <InstructorSelect value={form.mainInstructorId} onChange={(v) => set("mainInstructorId", v)} staffUsers={staffUsers} />
          </Field>
          <Field label="보조강사">
            <InstructorSelect
              value={assistantValue}
              onChange={onAssistantChange}
              staffUsers={staffUsers}
              extraOption={{ value: RESERVE_SENTINEL, label: "충당금" }}
            />
          </Field>
        </Row>
        <Field label="메모">
          <textarea value={form.note} onChange={(e) => set("note", e.target.value)} style={{ ...S.input, minHeight: 60, fontFamily: "inherit" }} />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} className="tb-press-soft" style={miniBtn} disabled={pending}>취소</button>
        <button
          onClick={() => onSave(buildPayload())}
          className="tb-press"
          style={{ ...miniBtn, background: "#f97316", color: "#fff", border: "none", padding: "8px 18px", fontSize: 13 }}
          disabled={pending || !form.date || !form.startTime}
        >
          {pending ? "저장중..." : "저장"}
        </button>
      </div>
    </ModalShell>
  );
}

function InstructorSelect({ value, onChange, staffUsers, extraOption }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={S.input}>
      <option value="">— 선택 안 함 —</option>
      {extraOption && (
        <option value={extraOption.value}>{extraOption.label}</option>
      )}
      {staffUsers.map((u) => (
        <option key={u.id} value={u.id}>
          {userLabel(u)} {u.role === "SUPER_ADMIN" ? "(슈퍼)" : "(운영진)"}
        </option>
      ))}
    </select>
  );
}

function Row({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const DATE_CHIPS = [
  { label: "오늘",   delta: 0 },
  { label: "내일",   delta: 1 },
  { label: "모레",   delta: 2 },
  { label: "+7일",   delta: 7 },
  { label: "+14일",  delta: 14 },
  { label: "+21일",  delta: 21 },
  { label: "+30일",  delta: 30 },
];

function daysInMonth(year, month1) {
  // month1: 1..12
  return new Date(year, month1, 0).getDate();
}

function parseDateKey(key) {
  // "YYYY-MM-DD" → { year, month1, day }
  const [y, m, d] = (key || "").split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) {
    const t = new Date();
    return { year: t.getFullYear(), month1: t.getMonth() + 1, day: t.getDate() };
  }
  return { year: y, month1: m, day: d };
}

function buildDateKey(year, month1, day) {
  const max = daysInMonth(year, month1);
  const safeDay = Math.min(Math.max(1, day), max);
  return `${year}-${pad2(month1)}-${pad2(safeDay)}`;
}

function DatePicker({ value, onChange }) {
  const today = new Date();
  const todayKey = dateKey(today);
  const { year, month1, day } = parseDateKey(value);

  const yearOptions = [];
  for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 2; y++) {
    yearOptions.push(y);
  }
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const dayOptions = Array.from({ length: daysInMonth(year, month1) }, (_, i) => i + 1);

  function update(next) {
    const merged = { year, month1, day, ...next };
    onChange(buildDateKey(merged.year, merged.month1, merged.day));
  }

  const cellStyle = { ...S.input, padding: "10px 12px", textAlign: "center", fontWeight: 600 };

  // chip preview: weekday + M/D (e.g., 목 5/1)
  function chipDetail(delta) {
    const target = shiftDateKey(todayKey, delta);
    const { month1: tm, day: td } = parseDateKey(target);
    const dow = WEEKDAYS[new Date(`${target}T00:00:00`).getDay()];
    return { target, dow, label: `${tm}/${td}` };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8 }}>
        <select
          value={year}
          onChange={(e) => update({ year: Number(e.target.value) })}
          style={cellStyle}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select
          value={month1}
          onChange={(e) => update({ month1: Number(e.target.value) })}
          style={cellStyle}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => update({ day: Number(e.target.value) })}
          style={cellStyle}
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>{d}일</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {DATE_CHIPS.map((c) => {
          const { target, dow, label } = chipDetail(c.delta);
          const active = value === target;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => onChange(target)}
              className="tb-press-soft"
              style={{
                padding: "5px 11px",
                borderRadius: 999,
                border: `1px solid ${active ? "#f97316" : "var(--tb-border)"}`,
                background: active ? "rgba(249,115,22,0.18)" : "var(--tb-surface-2)",
                color: active ? "#fb923c" : "var(--tb-text-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{c.label}</span>
              <span style={{ opacity: 0.7, fontWeight: 500 }}>· {dow} {label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTE_OPTIONS = [0, 15, 30, 45];

function TimePicker({ value, onChange }) {
  const { period, hour12, minute } = to12h(value);
  // snap minute to nearest preset for the dropdown display
  const snappedMinute = MINUTE_OPTIONS.includes(minute)
    ? minute
    : MINUTE_OPTIONS.reduce((a, b) => (Math.abs(b - minute) < Math.abs(a - minute) ? b : a));

  function update(next) {
    const merged = { period, hour12, minute: snappedMinute, ...next };
    onChange(to24h(merged.period, merged.hour12, merged.minute));
  }

  const cellStyle = { ...S.input, padding: "10px 12px", textAlign: "center", fontWeight: 600 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <select
        value={period}
        onChange={(e) => update({ period: e.target.value })}
        style={cellStyle}
      >
        <option value="AM">오전</option>
        <option value="PM">오후</option>
      </select>
      <select
        value={hour12}
        onChange={(e) => update({ hour12: Number(e.target.value) })}
        style={cellStyle}
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>{h}시</option>
        ))}
      </select>
      <select
        value={snappedMinute}
        onChange={(e) => update({ minute: Number(e.target.value) })}
        style={cellStyle}
      >
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>{pad2(m)}분</option>
        ))}
      </select>
    </div>
  );
}

function EnrollPicker({ session, memberUsers, onClose, onAdd, pending }) {
  const [q, setQ] = useState("");
  const enrolledIds = new Set(session?.enrollments.map((e) => e.user?.id));
  const filtered = memberUsers.filter((u) => {
    if (enrolledIds.has(u.id)) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [u.name, u.nickname, u.email, u.phone].filter(Boolean).some((s) => String(s).toLowerCase().includes(needle));
  });

  return (
    <ModalShell title="회원 추가" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름·닉네임·이메일·전화번호 검색"
        style={{ ...S.input, marginBottom: 12 }}
      />
      <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid var(--tb-border)", borderRadius: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--tb-text-muted)", fontSize: 13 }}>
            결과가 없습니다.
          </div>
        ) : filtered.map((u) => (
          <div key={u.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: "1px solid var(--tb-border)",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{userLabel(u)}</div>
              <div style={{ fontSize: 12, color: "var(--tb-text-muted)" }}>
                {u.email || u.phone || ""}
              </div>
            </div>
            <button
              onClick={() => onAdd(u.id)}
              disabled={pending}
              className="tb-press-soft"
              style={{ ...miniBtn, fontSize: 12, padding: "6px 12px" }}
            >
              + 추가
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={onClose} className="tb-press-soft" style={miniBtn}>닫기</button>
      </div>
    </ModalShell>
  );
}

function PayoutSummary({ sessions, viewYear, viewMonth, setViewYear, setViewMonth }) {
  const [period, setPeriod] = useState("month"); // "month" | "all"
  const now = new Date();
  const yyyymm = `${viewYear}-${pad2(viewMonth + 1)}`;

  function gotoMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function gotoCurrentMonth() {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const { totalToolb, totalReserve, totalRevenue, instructors, mainTotal, assistantTotal } = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (period === "all") return true;
      const d = new Date(s.startAt);
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` === yyyymm;
    });

    let totalToolb = 0;
    let totalReserve = 0;
    let totalRevenue = 0;
    const byInstructor = new Map();

    const get = (user) => {
      const cur = byInstructor.get(user.id) || {
        user,
        mainTotal: 0,
        mainSessions: 0,
        assistantTotal: 0,
        assistantSessions: 0,
      };
      byInstructor.set(user.id, cur);
      return cur;
    };

    for (const s of filtered) {
      totalToolb += s.revenue.toolb || 0;
      totalReserve += s.revenue.reserve || 0;
      totalRevenue += s.revenue.total || 0;

      if (s.mainInstructor && (s.revenue.main || 0) > 0) {
        const cur = get(s.mainInstructor);
        cur.mainTotal += s.revenue.main;
        cur.mainSessions += 1;
      }
      if (s.assistantInstructor && (s.revenue.assistant || 0) > 0) {
        const cur = get(s.assistantInstructor);
        cur.assistantTotal += s.revenue.assistant;
        cur.assistantSessions += 1;
      }
    }

    const instructors = Array.from(byInstructor.values())
      .map((r) => ({ ...r, total: r.mainTotal + r.assistantTotal }))
      .sort((a, b) => b.total - a.total);

    const mainTotal = instructors.reduce((acc, r) => acc + r.mainTotal, 0);
    const assistantTotal = instructors.reduce((acc, r) => acc + r.assistantTotal, 0);

    return { totalToolb, totalReserve, totalRevenue, instructors, mainTotal, assistantTotal };
  }, [sessions, period, yyyymm]);

  return (
    <div style={{
      background: "var(--tb-surface)", borderRadius: 14, padding: 20,
      border: "1px solid var(--tb-border)", boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 18, fontWeight: 800 }}><Wallet size={18} strokeWidth={2.4} /> 정산 요약</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {period === "month" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: 4, background: "var(--tb-surface-2)", borderRadius: 999,
            }}>
              <button
                type="button"
                onClick={() => gotoMonth(-1)}
                className="tb-press-soft"
                aria-label="이전 달"
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  border: "none", cursor: "pointer", background: "var(--tb-surface)",
                  color: "var(--tb-text-muted)", fontSize: 14, fontWeight: 800,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={gotoCurrentMonth}
                title="이번 달로"
                className="tb-press-soft"
                style={{
                  padding: "6px 12px", borderRadius: 999, border: "none",
                  cursor: "pointer", fontSize: 13, fontWeight: 800,
                  background: "transparent",
                  color: isCurrentMonth ? "#fb923c" : "var(--tb-text)",
                  minWidth: 110, textAlign: "center",
                }}
              >
                {viewYear}년 {viewMonth + 1}월{isCurrentMonth ? " · 이번 달" : ""}
              </button>
              <button
                type="button"
                onClick={() => gotoMonth(+1)}
                className="tb-press-soft"
                aria-label="다음 달"
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  border: "none", cursor: "pointer", background: "var(--tb-surface)",
                  color: "var(--tb-text-muted)", fontSize: 14, fontWeight: 800,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                ›
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--tb-surface-2)", borderRadius: 999 }}>
            {[{ k: "month", label: "월별" }, { k: "all", label: "전체" }].map((opt) => (
              <button
                key={opt.k}
                onClick={() => setPeriod(opt.k)}
                className="tb-press-soft"
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  background: period === opt.k ? "var(--tb-surface)" : "transparent",
                  color:      period === opt.k ? "#fb923c" : "var(--tb-text-muted)",
                  boxShadow:  period === opt.k ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12, marginBottom: 18,
      }}>
        <SummaryStat label="총매출" value={totalRevenue} accent="var(--tb-text)" />
        <SummaryStat label="툴비 합계 (40%)" value={totalToolb} accent="#fb923c" highlight />
        <SummaryStat label="충당금 합계 (20%)" value={totalReserve} accent="#fbbf24" />
      </div>

      <InstructorPayoutTable
        rows={instructors}
        mainTotal={mainTotal}
        assistantTotal={assistantTotal}
      />
    </div>
  );
}

function InstructorPayoutTable({ rows, mainTotal, assistantTotal }) {
  const grandTotal = mainTotal + assistantTotal;

  if (rows.length === 0) {
    return (
      <div style={{ marginTop: 14, color: "var(--tb-text-muted)", fontSize: 13, padding: "10px 0" }}>
        해당 기간에 강사 정산 내역이 없습니다.
      </div>
    );
  }

  const cellHead = {
    padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--tb-text-muted)",
    textAlign: "left", borderBottom: "1px solid var(--tb-border)", whiteSpace: "nowrap",
  };
  const cellHeadRight = { ...cellHead, textAlign: "right" };
  const cell = {
    padding: "12px", fontSize: 13, color: "var(--tb-text)", borderBottom: "1px solid var(--tb-border)",
    verticalAlign: "top",
  };
  const cellRight = { ...cell, textAlign: "right", whiteSpace: "nowrap", fontWeight: 700 };

  return (
    <div style={{ marginTop: 14, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr style={{ background: "var(--tb-surface-2)" }}>
            <th style={cellHead}>강사</th>
            <th style={cellHeadRight}>주강사 (28%)</th>
            <th style={cellHeadRight}>보조강사 (12%)</th>
            <th style={{ ...cellHeadRight, color: "var(--tb-text)" }}>합계</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <InstructorPayoutRow key={r.user.id} row={r} />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--tb-surface-2)" }}>
            <td style={{ ...cell, fontWeight: 800, color: "var(--tb-text)" }}>
              총합계 <span style={{ color: "var(--tb-text-muted)", fontWeight: 500, fontSize: 12 }}>· {rows.length}명</span>
            </td>
            <td style={{ ...cellRight, color: "#93c5fd", fontSize: 14 }}>{formatKRW(mainTotal)}</td>
            <td style={{ ...cellRight, color: "#fb7185", fontSize: 14 }}>{formatKRW(assistantTotal)}</td>
            <td style={{ ...cellRight, color: "var(--tb-text)", fontSize: 15, fontWeight: 900 }}>{formatKRW(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function InstructorPayoutRow({ row }) {
  const { user, mainTotal, mainSessions, assistantTotal, assistantSessions, total } = row;
  const hasBank = user.bankName || user.bankAccount;
  const cell = {
    padding: "12px", fontSize: 13, color: "var(--tb-text)", borderBottom: "1px solid var(--tb-border)",
    verticalAlign: "top",
  };
  const cellRight = { ...cell, textAlign: "right", whiteSpace: "nowrap", fontWeight: 700 };

  return (
    <tr>
      <td style={cell}>
        <div style={{ fontWeight: 700, color: "var(--tb-text)" }}>{userLabel(user)}</div>
        <div style={{ fontSize: 12, color: "var(--tb-text-muted)", marginTop: 2 }}>
          {hasBank ? (
            <>
              {user.bankName || "은행 미입력"} {user.bankAccount || "계좌 미입력"}
              {user.accountHolder ? ` · 예금주 ${user.accountHolder}` : ""}
            </>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#f87171" }}><AlertTriangle size={13} strokeWidth={2.4} /> 계좌정보 미등록</span>
          )}
        </div>
      </td>
      <td style={{ ...cellRight, color: mainTotal > 0 ? "#93c5fd" : "var(--tb-text-muted)" }}>
        {mainTotal > 0 ? (
          <>
            {formatKRW(mainTotal)}
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--tb-text-muted)", marginTop: 2 }}>{mainSessions}회</div>
          </>
        ) : "—"}
      </td>
      <td style={{ ...cellRight, color: assistantTotal > 0 ? "#fb7185" : "var(--tb-text-muted)" }}>
        {assistantTotal > 0 ? (
          <>
            {formatKRW(assistantTotal)}
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--tb-text-muted)", marginTop: 2 }}>{assistantSessions}회</div>
          </>
        ) : "—"}
      </td>
      <td style={{ ...cellRight, color: "var(--tb-text)", fontSize: 14, fontWeight: 900 }}>
        {formatKRW(total)}
      </td>
    </tr>
  );
}

function SummaryStat({ label, value, accent, highlight }) {
  return (
    <div style={{
      background: highlight ? "rgba(249,115,22,0.12)" : "var(--tb-surface-2)",
      borderRadius: 10, padding: 12,
      border: highlight ? "1px solid rgba(249,115,22,0.35)" : "1px solid var(--tb-border)",
    }}>
      <div style={{ fontSize: 11, color: "var(--tb-text-muted)", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent }}>{formatKRW(value)}</div>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--tb-surface)", borderRadius: 16, padding: 24,
          maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} className="tb-press-soft" style={{ ...miniBtn, padding: "4px 10px", fontSize: 16 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
