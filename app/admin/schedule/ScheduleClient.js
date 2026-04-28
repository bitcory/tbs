"use client";

import { useMemo, useState, useTransition } from "react";
import * as S from "@/lib/uiStyles";
import { CLASS_TYPE_LABEL, CLASS_TYPE_COLOR, formatKRW } from "@/lib/pricing";
import {
  createSession,
  updateSession,
  deleteSession,
  addEnrollment,
  setEnrollmentStatus,
  removeEnrollment,
} from "./actions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function fmtTime(iso) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function buildMonthGrid(year, month) {
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
      isToday: dateKey(d) === dateKey(new Date()),
    });
  }
  return cells;
}

function userLabel(u) {
  if (!u) return "-";
  return u.nickname || u.name || u.email || "이름없음";
}

export default function ScheduleClient({ me, sessions, staffUsers, memberUsers, pricing }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(dateKey(today));
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

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedSessions = sessionsByDay.get(selectedKey) || [];

  function gotoMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

      <DayDetail
        dateKey={selectedKey}
        sessions={selectedSessions}
        me={me}
        onEdit={(sess) => setModal({ mode: "edit", session: sess })}
        onAdd={() => setModal({ mode: "new", date: selectedKey })}
        onDelete={(id) => {
          if (!confirm("이 회차를 삭제할까요?")) return;
          startTransition(() => deleteSession(id));
        }}
        onOpenEnroll={(sessId) => setEnrollPickerFor(sessId)}
        onSetStatus={(eid, status) => startTransition(() => setEnrollmentStatus(eid, status))}
        onRemoveEnroll={(eid) => {
          if (!confirm("참가자에서 제외할까요?")) return;
          startTransition(() => removeEnrollment(eid));
        }}
        pending={pending}
      />

      {modal && (
        <SessionModal
          mode={modal.mode}
          initialDate={modal.date}
          session={modal.session}
          staffUsers={staffUsers}
          onClose={() => setModal(null)}
          onSave={(payload) => {
            startTransition(async () => {
              if (modal.mode === "new") await createSession(payload);
              else                       await updateSession(modal.session.id, payload);
              setModal(null);
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
      background: "#fff", borderRadius: 14, padding: "12px 16px",
      border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
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
  width: 36, height: 36, borderRadius: 10, border: "1px solid #e2e8f0",
  background: "#fff", color: "#0f172a", fontSize: 18, fontWeight: 700, cursor: "pointer",
};

const addBtn = {
  padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 700,
  color: "#fff", background: "#016837", border: "none", cursor: "pointer",
};

function CalendarGrid({ grid, sessionsByDay, selectedKey, onSelect }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7,1fr)",
        background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
      }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700,
            color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#475569",
          }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {grid.map((cell, i) => {
          const items = sessionsByDay.get(cell.key) || [];
          const isSelected = cell.key === selectedKey;
          const dow = i % 7;
          return (
            <button
              key={cell.key + i}
              onClick={() => onSelect(cell.key)}
              style={{
                position: "relative",
                minHeight: 92,
                padding: 6,
                textAlign: "left",
                border: "1px solid #f1f5f9",
                background: isSelected ? "#ecfdf5" : "#fff",
                color: cell.inMonth ? "#0f172a" : "#cbd5e1",
                cursor: "pointer",
                fontFamily: "inherit",
                outline: isSelected ? "2px solid #00996D" : "none",
                outlineOffset: -2,
              }}
            >
              <div style={{
                fontSize: 13, fontWeight: cell.isToday ? 800 : 600,
                color: dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : (cell.inMonth ? "#0f172a" : "#cbd5e1"),
                marginBottom: 4,
              }}>
                {cell.date.getDate()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {items.slice(0, 3).map((s) => {
                  const c = CLASS_TYPE_COLOR[s.classType];
                  return (
                    <div key={s.id} style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                      background: c.bg, color: c.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {fmtTime(s.startAt)} {CLASS_TYPE_LABEL[s.classType].replace(" CLASS", "")}
                    </div>
                  );
                })}
                {items.length > 3 && (
                  <div style={{ fontSize: 11, color: "#64748b" }}>+{items.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDetail({ dateKey, sessions, me, onEdit, onAdd, onDelete, onOpenEnroll, onSetStatus, onRemoveEnroll, pending }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 20,
      border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 4px 14px rgba(15,23,42,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{dateKey} 회차</h2>
        <button onClick={onAdd} className="tb-press-soft" style={subAddBtn}>+ 이 날짜에 회차 추가</button>
      </div>
      {sessions.length === 0 ? (
        <div style={{ color: "#64748b", padding: "24px 0", textAlign: "center" }}>등록된 회차가 없습니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              sess={s}
              me={me}
              onEdit={() => onEdit(s)}
              onDelete={() => onDelete(s.id)}
              onOpenEnroll={() => onOpenEnroll(s.id)}
              onSetStatus={onSetStatus}
              onRemoveEnroll={onRemoveEnroll}
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
  color: "#0f172a", background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer",
};

function SessionCard({ sess, me, onEdit, onDelete, onOpenEnroll, onSetStatus, onRemoveEnroll, pending }) {
  const c = CLASS_TYPE_COLOR[sess.classType];
  return (
    <div style={{
      border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#fff",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800,
            background: c.bg, color: c.fg,
          }}>{CLASS_TYPE_LABEL[sess.classType]}</span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{fmtTime(sess.startAt)}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onEdit} className="tb-press-soft" style={miniBtn} disabled={pending}>편집</button>
          <button onClick={onDelete} className="tb-press-soft" style={{ ...miniBtn, color: "#dc2626" }} disabled={pending}>삭제</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14, fontSize: 13 }}>
        <Info label="주강사" value={userLabel(sess.mainInstructor)} />
        <Info label="보조강사" value={userLabel(sess.assistantInstructor)} />
        <Info label="신청" value={`${sess.counts.applicants}명`} />
        <Info label="참가" value={`${sess.counts.attendees}명`} highlight />
      </div>

      {sess.scope.canSeeAnything && (
        <RevenueBox revenue={sess.revenue} scope={sess.scope} />
      )}

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>참가자</h3>
          <button onClick={onOpenEnroll} className="tb-press-soft" style={miniBtn} disabled={pending}>+ 회원 추가</button>
        </div>
        {sess.enrollments.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "8px 0" }}>아직 등록된 참가자가 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {sess.enrollments.map((e) => (
              <EnrollmentRow
                key={e.id}
                e={e}
                onSetStatus={(status) => onSetStatus(e.id, status)}
                onRemove={() => onRemoveEnroll(e.id)}
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
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: highlight ? 800 : 600, color: highlight ? "#016837" : "#0f172a" }}>{value}</div>
    </div>
  );
}

function RevenueBox({ revenue, scope }) {
  const items = [
    scope.canSeeTotal     && { k: "총합계", v: revenue.total,     accent: "#0f172a" },
    scope.canSeeToolb     && { k: "툴비 (50%)",   v: revenue.toolb,     accent: "#016837" },
    scope.canSeeMain      && { k: "주강사 (35%)", v: revenue.main,      accent: "#1d4ed8" },
    scope.canSeeAssistant && { k: "보조강사 (15%)", v: revenue.assistant, accent: "#7e22ce" },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div style={{
      background: "#f8fafc", borderRadius: 10, padding: 12,
      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10,
    }}>
      {items.map((it) => (
        <div key={it.k}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{it.k}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: it.accent }}>{formatKRW(it.v)}</div>
        </div>
      ))}
    </div>
  );
}

const miniBtn = {
  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  color: "#0f172a", background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer",
};

const STATUS_STYLE = {
  APPLIED:   { label: "신청", bg: "#dbeafe", fg: "#1d4ed8" },
  ATTENDED:  { label: "참가", bg: "#dcfce7", fg: "#166534" },
  CANCELLED: { label: "취소", bg: "#fee2e2", fg: "#b91c1c" },
};

function EnrollmentRow({ e, onSetStatus, onRemove, pending }) {
  return (
    <li style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: 8, background: "#fafafa",
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
        {["APPLIED", "ATTENDED", "CANCELLED"].map((st) => (
          <button
            key={st}
            onClick={() => onSetStatus(st)}
            disabled={pending || e.status === st}
            className="tb-press-soft"
            style={{
              ...miniBtn,
              padding: "4px 8px", fontSize: 11,
              background: e.status === st ? STATUS_STYLE[st].bg : "#fff",
              color: e.status === st ? STATUS_STYLE[st].fg : "#0f172a",
              fontWeight: e.status === st ? 800 : 500,
              opacity: e.status === st ? 1 : 0.85,
            }}
          >
            {STATUS_STYLE[st].label}
          </button>
        ))}
        <button onClick={onRemove} disabled={pending} className="tb-press-soft" style={{ ...miniBtn, padding: "4px 8px", fontSize: 11, color: "#64748b" }}>
          제외
        </button>
      </div>
    </li>
  );
}

function SessionModal({ mode, initialDate, session, staffUsers, onClose, onSave, pending }) {
  const initial = session
    ? {
        date: dateKey(new Date(session.startAt)),
        startTime: fmtTime(session.startAt),
        classType: session.classType,
        mainInstructorId: session.mainInstructorId || "",
        assistantInstructorId: session.assistantInstructorId || "",
        note: session.note || "",
      }
    : {
        date: initialDate,
        startTime: "14:00",
        classType: "ZERO",
        mainInstructorId: "",
        assistantInstructorId: "",
        note: "",
      };

  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <ModalShell title={mode === "new" ? "회차 등록" : "회차 편집"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Row>
          <Field label="날짜">
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={S.input} />
          </Field>
          <Field label="시작 시각">
            <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} style={S.input} />
          </Field>
        </Row>
        <Field label="클래스">
          <select value={form.classType} onChange={(e) => set("classType", e.target.value)} style={S.input}>
            <option value="ZERO">ZERO CLASS (20,000원)</option>
            <option value="UP">UP CLASS (30,000원)</option>
            <option value="PRO">PRO CLASS (40,000원)</option>
          </select>
        </Field>
        <Row>
          <Field label="주강사">
            <InstructorSelect value={form.mainInstructorId} onChange={(v) => set("mainInstructorId", v)} staffUsers={staffUsers} />
          </Field>
          <Field label="보조강사">
            <InstructorSelect value={form.assistantInstructorId} onChange={(v) => set("assistantInstructorId", v)} staffUsers={staffUsers} />
          </Field>
        </Row>
        <Field label="메모">
          <textarea value={form.note} onChange={(e) => set("note", e.target.value)} style={{ ...S.input, minHeight: 60, fontFamily: "inherit" }} />
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} className="tb-press-soft" style={miniBtn} disabled={pending}>취소</button>
        <button
          onClick={() => onSave(form)}
          className="tb-press"
          style={{ ...miniBtn, background: "#016837", color: "#fff", border: "none", padding: "8px 18px", fontSize: 13 }}
          disabled={pending || !form.date || !form.startTime}
        >
          {pending ? "저장중..." : "저장"}
        </button>
      </div>
    </ModalShell>
  );
}

function InstructorSelect({ value, onChange, staffUsers }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={S.input}>
      <option value="">— 선택 안 함 —</option>
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
      <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            결과가 없습니다.
          </div>
        ) : filtered.map((u) => (
          <div key={u.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: "1px solid #f1f5f9",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{userLabel(u)}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
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

function ModalShell({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, padding: 24,
          maxWidth: 520, width: "100%", maxHeight: "90vh", overflow: "auto",
          boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
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
