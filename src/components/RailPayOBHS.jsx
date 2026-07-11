import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  LayoutGrid, Users, Route, ReceiptIndianRupee, Plus, Upload, Download,
  Search, X, Pencil, Trash2, Train, IndianRupee, Utensils, ArrowDownCircle,
  ChevronRight, FileSpreadsheet, TrendingUp, Wallet, CalendarDays,
  ClipboardList, AlertTriangle, UserCheck, LogOut,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Theme                                                              */
/* ------------------------------------------------------------------ */
const T = {
  ink: "#16233F",
  ink2: "#26365A",
  paper: "#F6F5EF",
  card: "#FFFFFF",
  line: "#E5E2D8",
  lineSoft: "#EFEDE5",
  slate: "#5B6472",
  slateSoft: "#8A909B",
  amber: "#DE8F2C",
  amberDk: "#A9691A",
  amberBg: "#FBEEDA",
  green: "#2C7A5B",
  greenBg: "#E7F1EC",
  red: "#BC443B",
  redBg: "#F8E8E6",
};

const money = (n) =>
  "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

const money2 = (n) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num2 = (n) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// pick minimum wage revision effective on/before a date
const minWageOn = (revs, iso, key) => {
  const applicable = (revs || [])
    .filter((r) => r.effectiveFrom && r.effectiveFrom <= iso)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
  return applicable ? Number(applicable[key]) || 0 : 0;
};

// penalty for one shortfall record
const computePenalty = (p, rates, minWages) => {
  const ehkShort = Math.max(0, (Number(p.reqEhk) || 0) - (Number(p.actEhk) || 0));
  const janShort = Math.max(0, (Number(p.reqJan) || 0) - (Number(p.actJan) || 0));
  const ehkWage = minWageOn(minWages, p.date, "ehk");
  const janRate = Number(rates.janitorRate) || 0;
  const ehkPenalty = ehkShort * 3 * ehkWage;
  const janPenalty = janShort * (Number(p.tripHours) || 0) * janRate;
  return { ehkShort, janShort, ehkWage, janRate, ehkPenalty, janPenalty, total: ehkPenalty + janPenalty };
};

const monthLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const curMonth = () => new Date().toISOString().slice(0, 7);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayLabelFromDate = (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
const isEHK = (des = "") => /ehk|supervis|charge/i.test(des);
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const scheduledOn = (t, dateObj) => {
  if (!(t.days || []).includes(dayLabelFromDate(dateObj))) return false;
  if ((t.type || "regular") === "special") {
    const iso = isoOf(dateObj);
    if (t.validFrom && iso < t.validFrom) return false;
    if (t.validTo && iso > t.validTo) return false;
  }
  return true;
};
const isCancelled = (t, dateObj) => (t.cancelledDates || []).includes(isoOf(dateObj));
const runsOn = (t, dateObj) => scheduledOn(t, dateObj) && !isCancelled(t, dateObj);

/* ------------------------------------------------------------------ */
/*  Cloud storage — API-backed (replaces localStorage)                 */
/* ------------------------------------------------------------------ */
const KEY_MAP = {
  "obhs:firm": "firm",
  "obhs:employees": "employees",
  "obhs:trips": "trips",
  "obhs:designations": "designations",
  "obhs:trains": "trains",
  "obhs:rates": "rates",
  "obhs:minwages": "minwages",
  "obhs:penalties": "penalties",
};

const store = {
  async get(key, fallback) {
    try {
      const path = KEY_MAP[key] || key.replace("obhs:", "");
      const res = await fetch(`/api/${path}`);
      if (!res.ok) return fallback;
      const data = await res.json();
      return data ?? fallback;
    } catch {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      const path = KEY_MAP[key] || key.replace("obhs:", "");
      await fetch(`/api/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
    } catch {
      /* storage unavailable — stays in-memory for the session */
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Seed data (Amritsar-based railway routes for a realistic demo)     */
/* ------------------------------------------------------------------ */
const seedEmployees = [
  { id: "e1", empId: "OBHS-101", name: "Gurpreet Singh", designation: "Supervisor", perTrip: 900, phone: "98140 11001", status: "active", remarks: "" },
  { id: "e2", empId: "OBHS-102", name: "Ravi Kumar", designation: "Housekeeper", perTrip: 650, phone: "98140 11002", status: "active", remarks: "" },
  { id: "e3", empId: "OBHS-103", name: "Sunil Verma", designation: "Housekeeper", perTrip: 650, phone: "98140 11003", status: "active", remarks: "" },
  { id: "e4", empId: "OBHS-104", name: "Manpreet Kaur", designation: "Cleaner", perTrip: 550, phone: "98140 11004", status: "active", remarks: "On leave 25th–28th" },
  { id: "e5", empId: "OBHS-105", name: "Deepak Sharma", designation: "Cleaner", perTrip: 550, phone: "98140 11005", status: "inactive", remarks: "Left — no longer on roll" },
];

const seedTrips = (() => {
  const m = curMonth();
  const d = (day) => `${m}-${String(day).padStart(2, "0")}`;
  const rows = [
    ["e1", 2, "12030", "ASR – NDLS Shatabdi", 200, 0],
    ["e1", 9, "12030", "ASR – NDLS Shatabdi", 200, 3000],
    ["e1", 16, "12030", "ASR – NDLS Shatabdi", 200, 0],
    ["e2", 3, "12460", "ASR – NDLS Sampark", 150, 0],
    ["e2", 10, "12460", "ASR – NDLS Sampark", 150, 2000],
    ["e2", 17, "12460", "ASR – NDLS Sampark", 150, 0],
    ["e2", 24, "12460", "ASR – NDLS Sampark", 150, 0],
    ["e3", 4, "12716", "ASR – Nanded Sachkhand", 250, 0],
    ["e3", 12, "12716", "ASR – Nanded Sachkhand", 250, 1500],
    ["e4", 5, "12030", "ASR – NDLS Shatabdi", 150, 0],
    ["e4", 13, "12030", "ASR – NDLS Shatabdi", 150, 0],
    ["e4", 20, "12030", "ASR – NDLS Shatabdi", 150, 1000],
  ];
  return rows.map(([empId, day, trainNo, route, food, advance]) => ({
    id: uid(), empId, date: d(day), trainNo, route, food, advance, note: "",
  }));
})();

const seedTrains = (() => {
  const now = new Date();
  const first = isoOf(new Date(now.getFullYear(), now.getMonth(), 1));
  const last = isoOf(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return [
    { id: "t1", trainNo: "12030", name: "ASR–NDLS Shatabdi", route: "Amritsar → New Delhi", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], ehk: 1, janitors: 6, tripHours: 13, type: "regular", validFrom: "", validTo: "" },
    { id: "t2", trainNo: "12460", name: "ASR–NDLS Sampark Kranti", route: "Amritsar → New Delhi", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], ehk: 1, janitors: 8, tripHours: 30, type: "regular", validFrom: "", validTo: "" },
    { id: "t3", trainNo: "12716", name: "Sachkhand Express", route: "Amritsar → Nanded", days: ["Mon", "Wed", "Fri", "Sun"], ehk: 1, janitors: 10, tripHours: 90, type: "regular", validFrom: "", validTo: "" },
    { id: "t4", trainNo: "12204", name: "Garib Rath", route: "Amritsar → Saharsa", days: ["Mon", "Thu"], ehk: 1, janitors: 10, tripHours: 63.92, type: "regular", validFrom: "", validTo: "" },
    { id: "t5", trainNo: "04650", name: "Vaishno Devi Special", route: "Amritsar → Katra", days: ["Sat", "Sun"], ehk: 1, janitors: 6, tripHours: 12, type: "special", validFrom: first, validTo: last },
  ];
})();

const seedMinWages = [
  { id: "w1", effectiveFrom: "2026-04-01", ehk: 760, janitor: 706 },
];
const seedRates = { janitorRate: 70.88, ehkRate: "" };
const seedPenalties = (() => {
  const now = new Date();
  return [
    { id: "p1", date: isoOf(new Date(now.getFullYear(), now.getMonth(), 15)), trainNo: "12204", tripHours: 63.92, reqEhk: 1, reqJan: 10, actEhk: 0, actJan: 5, note: "Manpower short on run" },
  ];
})();

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */
export default function App({ onLogout }) {
  const [ready, setReady] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [trips, setTrips] = useState([]);
  const [view, setView] = useState("dashboard");
  const [month, setMonth] = useState(curMonth());
  const [payslipFor, setPayslipFor] = useState(null);
  const [firm, setFirm] = useState(null);
  const [editFirm, setEditFirm] = useState(false);
  const [designations, setDesignations] = useState(["Supervisor", "Housekeeper", "Cleaner"]);
  const [trains, setTrains] = useState([]);
  const [rates, setRates] = useState(seedRates);
  const [minWages, setMinWages] = useState(seedMinWages);
  const [penalties, setPenalties] = useState([]);
  const firstSave = useRef(true);

  // load once
  useEffect(() => {
    (async () => {
      const savedFirm = await store.get("obhs:firm", null);
      const emp = await store.get("obhs:employees", null);
      const trp = await store.get("obhs:trips", null);
      const des = await store.get("obhs:designations", null);
      const trn = await store.get("obhs:trains", null);
      const rt = await store.get("obhs:rates", null);
      const mw = await store.get("obhs:minwages", null);
      const pen = await store.get("obhs:penalties", null);
      setFirm(savedFirm);
      setEmployees(emp && emp.length ? emp : []);
      setTrips(trp && trp.length ? trp : []);
      setTrains(trn && trn.length ? trn : []);
      if (rt) setRates(rt);
      if (mw && mw.length) setMinWages(mw);
      setPenalties(pen && pen.length ? pen : []);
      if (des && des.length) setDesignations(des);
      setReady(true);
    })();
  }, []);

  // persist
  useEffect(() => {
    if (!ready) return;
    if (firstSave.current) { firstSave.current = false; return; }
    store.set("obhs:employees", employees);
    store.set("obhs:trips", trips);
    store.set("obhs:designations", designations);
    store.set("obhs:trains", trains);
    store.set("obhs:rates", rates);
    store.set("obhs:minwages", minWages);
    store.set("obhs:penalties", penalties);
  }, [employees, trips, designations, trains, rates, minWages, penalties, ready]);

  useEffect(() => {
    if (ready && firm) store.set("obhs:firm", firm);
  }, [firm, ready]);

  const salaryRows = useMemo(() => {
    const monthTrips = trips.filter((t) => t.date && t.date.startsWith(month));
    return employees
      .map((e) => {
        const et = monthTrips.filter((t) => t.empId === e.id);
        const count = et.length;
        const gross = et.reduce((s, t) => s + (Number(t.rate) || Number(e.perTrip) || 0), 0);
        const food = et.reduce((s, t) => s + (Number(t.food) || 0), 0);
        const advance = et.reduce((s, t) => s + (Number(t.advance) || 0), 0);
        const net = gross - food - advance;
        const hasVarRate = et.length > 0 && et.some((t) => t.rate && Number(t.rate) !== Number(e.perTrip));
        const rateLabel = hasVarRate ? "Variable rate" : money(e.perTrip) + "/trip";
        return { emp: e, trips: et, count, gross, food, advance, net, rateLabel };
      });
  }, [employees, trips, month]);

  const totals = useMemo(() => {
    return salaryRows.reduce(
      (a, r) => ({
        count: a.count + r.count,
        gross: a.gross + r.gross,
        food: a.food + r.food,
        advance: a.advance + r.advance,
        net: a.net + r.net,
      }),
      { count: 0, gross: 0, food: 0, advance: 0, net: 0 }
    );
  }, [salaryRows]);

  if (!ready) {
    return (
      <div style={{ background: T.paper, color: T.slate, fontFamily: "Inter, system-ui, sans-serif" }}
        className="min-h-screen flex items-center justify-center text-sm">
        Loading workspace…
      </div>
    );
  }

  if (!firm) {
    return <Onboarding onDone={setFirm} />;
  }

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "employees", label: "Staff", icon: Users },
    { id: "trips", label: "Trip Log", icon: Route },
    { id: "planning", label: "Planning", icon: ClipboardList },
    { id: "hours", label: "Hours & Penalty", icon: AlertTriangle },
    { id: "salary", label: "Salary Sheet", icon: ReceiptIndianRupee },
  ];

  return (
    <div
      style={{ background: T.paper, color: T.ink, fontFamily: "Inter, system-ui, sans-serif" }}
      className="min-h-screen w-full"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        .num { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
        .track { letter-spacing: .14em; }
        input, select, button { font-family: inherit; }
        input:focus, select:focus { outline: 2px solid ${T.amber}; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid ${T.amber}; outline-offset: 2px; }
        .rowhover:hover { background: ${T.lineSoft}; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 8px; }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 md:px-6 py-5">
        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: T.ink }}
            >
              <Train size={20} color={T.amber} />
            </div>
            <button onClick={() => setEditFirm(true)} className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-extrabold leading-none truncate"
                  style={{ color: T.ink, maxWidth: 200 }}>
                  {firm.name}
                </span>
                <Pencil size={12} color={T.slateSoft} />
              </div>
              <div className="text-[11px] track uppercase mt-1" style={{ color: T.slateSoft }}>
                OBHS Payroll · RailPay
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: T.card, border: `1px solid ${T.line}` }}
            >
              <CalendarDays size={16} color={T.slate} />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="text-sm bg-transparent num"
                style={{ color: T.ink, border: "none" }}
              />
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                className="flex items-center justify-center h-9 w-9 rounded-lg"
                style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slate }}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Nav */}
        <nav
          className="flex gap-1 mb-5 overflow-x-auto rounded-xl p-1"
          style={{ background: T.card, border: `1px solid ${T.line}` }}
        >
          {nav.map((n) => {
            const active = view === n.id;
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => { setView(n.id); setPayslipFor(null); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: active ? T.ink : "transparent",
                  color: active ? "#fff" : T.slate,
                }}
              >
                <Icon size={16} color={active ? T.amber : T.slate} />
                {n.label}
              </button>
            );
          })}
        </nav>

        {view === "dashboard" && (
          <Dashboard rows={salaryRows} totals={totals} month={month}
            staffCount={employees.length}
            activeCount={employees.filter((e) => (e.status || "active") !== "inactive").length}
            onOpen={setView} />
        )}
        {view === "employees" && (
          <StaffView employees={employees} setEmployees={setEmployees}
            trips={trips} setTrips={setTrips}
            designations={designations} setDesignations={setDesignations} />
        )}
        {view === "trips" && (
          <TripsView employees={employees} setEmployees={setEmployees} trips={trips} setTrips={setTrips}
            trains={trains} month={month} />
        )}
        {view === "planning" && (
          <PlanningView trains={trains} setTrains={setTrains}
            employees={employees} month={month} />
        )}
        {view === "hours" && (
          <HoursPenaltyView trains={trains} employees={employees} trips={trips} month={month}
            rates={rates} setRates={setRates}
            minWages={minWages} setMinWages={setMinWages}
            penalties={penalties} setPenalties={setPenalties} />
        )}
        {view === "salary" && (
          <SalaryView rows={salaryRows} totals={totals} month={month}
            firm={firm} onPayslip={setPayslipFor} />
        )}

        {payslipFor && (
          <Payslip
            data={salaryRows.find((r) => r.emp.id === payslipFor)}
            month={month}
            firm={firm}
            onClose={() => setPayslipFor(null)}
          />
        )}

        {editFirm && (
          <FirmEditModal firm={firm} onSave={(f) => { setFirm(f); setEditFirm(false); }}
            onClose={() => setEditFirm(false)} />
        )}

        <footer className="text-center mt-8 mb-2 text-[11px]" style={{ color: T.slateSoft }}>
          RailPay OBHS · your data is saved in the cloud
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding (contractor sign-up)                                    */
/* ------------------------------------------------------------------ */
function FirmForm({ value, onChange }) {
  const field = (label, key, props = {}, req) => (
    <label className="block">
      <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
        {label}{req && <span style={{ color: T.red }}> *</span>}
      </span>
      <input value={value[key]} onChange={(e) => onChange(key, e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} {...props} />
    </label>
  );
  return (
    <div className="space-y-3">
      {field("Firm / Company name", "name", { placeholder: "e.g. Singh Railway Services" }, true)}
      <div className="grid grid-cols-2 gap-3">
        {field("Owner name", "owner", { placeholder: "Contractor name" })}
        {field("Phone", "phone", { placeholder: "98xxxxxxxx", inputMode: "tel" })}
      </div>
      {field("City / Zone", "city", { placeholder: "e.g. Amritsar, NR" })}
    </div>
  );
}

function Onboarding({ onDone }) {
  const [f, setF] = useState({ name: "", owner: "", phone: "", city: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim().length > 1;
  return (
    <div style={{ background: T.paper, fontFamily: "Inter, system-ui, sans-serif" }}
      className="min-h-screen w-full flex items-center justify-center px-4 py-8">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .track{letter-spacing:.14em}
        input:focus{outline:2px solid ${T.amber};outline-offset:1px}`}</style>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: T.ink }}>
            <Train size={22} color={T.amber} />
          </div>
          <div>
            <div className="text-lg font-extrabold" style={{ color: T.ink }}>
              RailPay <span style={{ color: T.amber }}>OBHS</span>
            </div>
            <div className="text-[11px] track uppercase" style={{ color: T.slateSoft }}>
              Trip-based staff payroll
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
          <h1 className="text-xl font-extrabold mb-1" style={{ color: T.ink }}>Set up your firm</h1>
          <p className="text-[13px] mb-5" style={{ color: T.slate }}>
            Your firm name appears on the app, salary sheets and every payslip.
          </p>
          <FirmForm value={f} onChange={set} />
          <button disabled={!valid} onClick={() => onDone({ ...f, name: f.name.trim() })}
            className="w-full mt-6 py-3 rounded-lg text-sm font-bold text-white"
            style={{ background: valid ? T.ink : T.slateSoft }}>
            Create workspace
          </button>
          <p className="text-[11px] text-center mt-3" style={{ color: T.slateSoft }}>
            Your data is stored securely in the cloud
          </p>
        </div>
      </div>
    </div>
  );
}

function FirmEditModal({ firm, onSave, onClose }) {
  const [f, setF] = useState({ name: firm.name || "", owner: firm.owner || "", phone: firm.phone || "", city: firm.city || "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim().length > 1;
  return (
    <Modal onClose={onClose} title="Firm details">
      <FirmForm value={f} onChange={set} />
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>Cancel</button>
        <button disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim() })}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: valid ? T.ink : T.slateSoft }}>Save</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
function Dashboard({ rows, totals, month, staffCount, activeCount, onOpen }) {
  const maxNet = Math.max(1, ...rows.map((r) => r.net));
  const active = rows.filter((r) => r.count > 0).length;

  const cards = [
    { label: "Staff on roll", value: staffCount, sub: `${activeCount} active · ${staffCount - activeCount} inactive`, icon: Users, tint: T.ink },
    { label: "Trips this month", value: totals.count, icon: Route, tint: T.ink },
    { label: "Net payable", value: money(totals.net), icon: Wallet, tint: T.green },
    { label: "Advance to recover", value: money(totals.advance), icon: ArrowDownCircle, tint: T.red },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl p-4"
              style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
                  {c.label}
                </span>
                <Icon size={16} color={c.tint} />
              </div>
              <div className="text-2xl font-extrabold num" style={{ color: c.tint }}>
                {c.value}
              </div>
              {c.sub && (
                <div className="text-[11px] mt-0.5" style={{ color: T.slateSoft }}>{c.sub}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold" style={{ color: T.ink }}>Net payable by staff</div>
            <div className="text-[12px]" style={{ color: T.slateSoft }}>{monthLabel(month)} • {active} active</div>
          </div>
          <button onClick={() => onOpen("salary")}
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: T.amberDk }}>
            Salary sheet <ChevronRight size={15} />
          </button>
        </div>
        <div className="space-y-3">
          {rows.filter((r) => r.count > 0).length === 0 && (
            <div className="text-sm py-6 text-center" style={{ color: T.slateSoft }}>
              No trips logged for {monthLabel(month)} yet. Add trips in the Trip Log.
            </div>
          )}
          {rows.filter((r) => r.count > 0).map((r) => (
            <div key={r.emp.id} className="flex items-center gap-3">
              <div className="w-32 shrink-0 truncate text-[13px] font-medium" style={{ color: T.ink }}>
                {r.emp.name}
              </div>
              <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: T.lineSoft }}>
                <div className="h-full rounded-md flex items-center justify-end pr-2"
                  style={{ width: `${(r.net / maxNet) * 100}%`, background: T.ink, minWidth: 44 }}>
                  <span className="text-[11px] num font-semibold" style={{ color: T.amber }}>
                    {money(r.net)}
                  </span>
                </div>
              </div>
              <div className="w-10 text-right num text-[12px]" style={{ color: T.slateSoft }}>
                {r.count}t
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Employee Trip History Modal  (single or multi-employee)           */
/* ------------------------------------------------------------------ */
function EmpTripsModal({ emps, trips, onClose }) {
  const multiEmp = emps.length > 1;
  const [filterType, setFilterType] = useState("month");
  const [month, setMonth] = useState(curMonth());
  const [from, setFrom] = useState(curMonth() + "-01");
  const [to, setTo] = useState(todayISO());

  const empMap = Object.fromEntries(emps.map((e) => [e.id, e]));
  const empIdSet = new Set(emps.map((e) => e.id));

  const filtered = trips.filter((t) => {
    if (!t.date) return false;
    if (!empIdSet.has(t.empId)) return false;
    if (filterType === "month") return t.date.startsWith(month);
    return t.date >= from && t.date <= to;
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalFood = filtered.reduce((s, t) => s + (Number(t.food) || 0), 0);
  const totalAdv = filtered.reduce((s, t) => s + (Number(t.advance) || 0), 0);
  const gross = filtered.reduce((s, t) => s + (Number(t.rate) || Number(empMap[t.empId]?.perTrip) || 0), 0);
  const net = gross - totalFood - totalAdv;

  function exportXLSX() {
    const rows = filtered.map((t) => {
      const emp = empMap[t.empId];
      const row = {};
      if (multiEmp) { row["Emp ID"] = emp?.empId || ""; row["Name"] = emp?.name || ""; }
      row["Date"] = t.date;
      row["Train No"] = t.trainNo || "";
      row["Route"] = t.route || "";
      const tripRate = Number(t.rate) || Number(emp?.perTrip) || 0;
      row["Rate (₹)"] = tripRate;
      row["Food Deduction (₹)"] = Number(t.food) || 0;
      row["Advance Deduction (₹)"] = Number(t.advance) || 0;
      row["Net Trip Earning (₹)"] = tripRate - (Number(t.food) || 0) - (Number(t.advance) || 0);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trips");
    XLSX.writeFile(wb, multiEmp ? "trips_export.xlsx" : `trips_${emps[0].empId}.xlsx`);
  }

  const title = multiEmp ? `${emps.length} Employees Selected` : emps[0].name;
  const subtitle = multiEmp
    ? (() => { const ids = emps.map((e) => e.empId || e.name); return ids.length > 4 ? ids.slice(0, 4).join(", ") + ` +${ids.length - 4} more` : ids.join(", "); })()
    : `${emps[0].empId} · ${emps[0].designation} · ${money(emps[0].perTrip)}/trip`;

  const cols = multiEmp
    ? ["Employee", "Date", "Train", "Route", "Rate", "Food (−)", "Advance (−)"]
    : ["Date", "Train", "Route", "Rate", "Food (−)", "Advance (−)"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(22,35,63,0.5)" }}>
      <div className={`w-full ${multiEmp ? "max-w-3xl" : "max-w-2xl"} rounded-2xl flex flex-col`}
        style={{ background: T.card, border: `1px solid ${T.line}`, maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div>
            <div className="font-extrabold text-base" style={{ color: T.ink }}>{title}</div>
            <div className="text-[12px] num mt-0.5" style={{ color: T.slateSoft }}>{subtitle}</div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button onClick={exportXLSX}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: T.ink, color: "#fff" }}>
              <FileSpreadsheet size={13} /> Export Excel
            </button>
            <button onClick={onClose} className="p-1" style={{ color: T.slateSoft }}><X size={18} /></button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 flex flex-wrap gap-2 items-center" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
            {["month", "range"].map((type) => (
              <button key={type} onClick={() => setFilterType(type)}
                className="px-3 py-1.5 text-[12px] font-semibold"
                style={{ background: filterType === type ? T.ink : T.card, color: filterType === type ? T.amber : T.slate }}>
                {type === "month" ? "Month" : "Date Range"}
              </button>
            ))}
          </div>
          {filterType === "month" ? (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
              <span className="text-[12px]" style={{ color: T.slateSoft }}>to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            </div>
          )}
          <span className="text-[12px]" style={{ color: T.slateSoft }}>{filtered.length} trips</span>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: T.lineSoft }}>
                {cols.map((h, i) => (
                  <th key={i}
                    className={`px-4 py-2.5 text-[11px] track uppercase font-semibold ${h === "Food" || h === "Advance" ? "text-right" : "text-left"}`}
                    style={{ color: T.slateSoft }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const emp = empMap[t.empId];
                return (
                  <tr key={t.id} className="rowhover" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                    {multiEmp && (
                      <td className="px-4 py-2.5 text-[13px]">
                        <div className="font-semibold" style={{ color: T.ink }}>{emp?.name || "—"}</div>
                        <div className="text-[11px]" style={{ color: T.slateSoft }}>{emp?.empId || ""}</div>
                      </td>
                    )}
                    <td className="px-4 py-2.5 num text-[13px]" style={{ color: T.slate }}>
                      {t.date.slice(8)}/{t.date.slice(5, 7)}/{t.date.slice(0, 4)}
                    </td>
                    <td className="px-4 py-2.5 num text-[13px]" style={{ color: T.slate }}>{t.trainNo || "—"}</td>
                    <td className="px-4 py-2.5 text-[13px]" style={{ color: T.slate }}>{t.route || "—"}</td>
                    <td className="px-4 py-2.5 num text-right font-semibold" style={{ color: T.ink }}>{money(Number(t.rate) || Number(emp?.perTrip) || 0)}</td>
                    <td className="px-4 py-2.5 num text-right" style={{ color: t.food ? T.red : T.slateSoft }}>{t.food ? "−" + money(t.food) : "—"}</td>
                    <td className="px-4 py-2.5 num text-right" style={{ color: t.advance ? T.red : T.slateSoft }}>{t.advance ? "−" + money(t.advance) : "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm" style={{ color: T.slateSoft }}>
                  No trips in this period.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 flex flex-wrap gap-4 items-center" style={{ borderTop: `1px solid ${T.line}`, background: T.lineSoft }}>
            <div className="text-[12px]" style={{ color: T.slateSoft }}>
              <span className="font-semibold num" style={{ color: T.ink }}>{filtered.length}</span> trips · Gross{" "}
              <span className="font-bold num" style={{ color: T.ink }}>{money(gross)}</span>
            </div>
            {totalFood > 0 && (
              <div className="text-[12px]" style={{ color: T.red }}>−Food {money(totalFood)}</div>
            )}
            {totalAdv > 0 && (
              <div className="text-[12px]" style={{ color: T.red }}>−Adv {money(totalAdv)}</div>
            )}
            <div className="ml-auto font-extrabold num text-sm" style={{ color: T.ink }}>
              Net {money(net)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Staff                                                              */
/* ------------------------------------------------------------------ */
function StaffView({ employees, setEmployees, trips, setTrips, designations, setDesignations }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null); // employee object or {} for new
  const [viewTripsEmps, setViewTripsEmps] = useState(null); // array of employees to show trips for
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef(null);

  const statusOf = (e) => e.status || "active";
  const activeN = employees.filter((e) => statusOf(e) !== "inactive").length;
  const inactiveN = employees.length - activeN;

  const filtered = employees.filter((e) => {
    const s = (e.name + " " + e.empId + " " + e.designation).toLowerCase();
    const matchQ = s.includes(q.toLowerCase());
    const matchS = statusFilter === "all" || statusOf(e) === statusFilter;
    return matchQ && matchS;
  });

  const save = (emp) => {
    if (emp.id) {
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
    } else {
      setEmployees((prev) => [...prev, { ...emp, id: uid() }]);
    }
    setEditing(null);
  };

  const remove = (id) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setTrips((prev) => prev.filter((t) => t.empId !== id));
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const pick = (row, keys) => {
        for (const k of Object.keys(row)) {
          const nk = k.toLowerCase().replace(/[^a-z]/g, "");
          if (keys.some((t) => nk.includes(t))) return row[k];
        }
        return "";
      };
      const imported = json
        .map((row) => ({
          id: uid(),
          empId: String(pick(row, ["empid", "employeeid", "staffid", "code", "id"]) || ""),
          name: String(pick(row, ["name", "employee", "staff"]) || "").trim(),
          designation: String(pick(row, ["designation", "post", "role", "category"]) || ""),
          perTrip: Number(String(pick(row, ["pertrip", "rate", "tripsalary", "salary", "amount"])).replace(/[^\d.]/g, "")) || 0,
          phone: String(pick(row, ["phone", "mobile", "contact"]) || ""),
          status: "active",
          remarks: String(pick(row, ["remark", "note"]) || ""),
        }))
        .filter((r) => r.name);
      if (imported.length === 0) {
        setImportMsg("No rows found. Expected columns: Emp ID, Name, Designation, Per Trip, Phone.");
      } else {
        setEmployees((prev) => [...prev, ...imported]);
        setImportMsg(`Imported ${imported.length} staff from ${file.name}.`);
      }
    } catch {
      setImportMsg("Could not read that file. Use an .xlsx or .csv export.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Emp ID": "OBHS-201", "Name": "Amit Singh", "Designation": "Housekeeper", "Per Trip": 650, "Phone": "98xxxxxxxx" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, "obhs-staff-template.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 max-w-sm"
          style={{ background: T.card, border: `1px solid ${T.line}` }}>
          <Search size={16} color={T.slateSoft} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search staff…" className="bg-transparent text-sm w-full"
            style={{ color: T.ink, border: "none" }} />
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slate }}>
            <Upload size={15} /> Import Excel
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => {
                const sel = employees.filter((e) => selectedIds.has(e.id));
                setViewTripsEmps(sel);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold"
              style={{ background: T.amber, color: "#fff" }}>
              <FileSpreadsheet size={15} /> View Trips ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setEditing({})}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: T.ink }}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[["all", `All ${employees.length}`], ["active", `Active ${activeN}`], ["inactive", `Inactive ${inactiveN}`]].map(([val, label]) => {
          const on = statusFilter === val;
          return (
            <button key={val} onClick={() => setStatusFilter(val)}
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold"
              style={{ background: on ? T.ink : T.card, color: on ? "#fff" : T.slate, border: `1px solid ${on ? T.ink : T.line}` }}>
              {label}
            </button>
          );
        })}
      </div>

      {importMsg && (
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px]"
          style={{ background: T.amberBg, color: T.amberDk }}>
          <span>{importMsg}</span>
          <button onClick={downloadTemplate} className="flex items-center gap-1 font-semibold underline">
            <FileSpreadsheet size={13} /> Template
          </button>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ background: T.lineSoft }}>
                <th className="pl-4 pr-1 py-2.5 w-8">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id))}
                    onChange={(ev) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (ev.target.checked) filtered.forEach((e) => next.add(e.id));
                        else filtered.forEach((e) => next.delete(e.id));
                        return next;
                      });
                    }}
                    style={{ accentColor: T.amber }} />
                </th>
                {["Emp ID", "Name", "Designation", "Status", "Per Trip", "Phone", ""].map((h, i) => (
                  <th key={h + i} className="text-left px-4 py-2.5 text-[11px] track uppercase font-semibold"
                    style={{ color: T.slateSoft }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const inactive = (e.status || "active") === "inactive";
                return (
                <tr key={e.id} className="rowhover" style={{ borderTop: `1px solid ${T.lineSoft}`, opacity: inactive ? 0.7 : 1 }}>
                  <td className="pl-4 pr-1 py-3">
                    <input type="checkbox"
                      checked={selectedIds.has(e.id)}
                      onChange={(ev) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          ev.target.checked ? next.add(e.id) : next.delete(e.id);
                          return next;
                        });
                      }}
                      style={{ accentColor: T.amber }} />
                  </td>
                  <td className="px-4 py-3 num text-[13px]">
                    <button onClick={() => setViewTripsEmps([e])}
                      className="underline underline-offset-2 font-semibold hover:opacity-70 transition-opacity"
                      style={{ color: T.amber, textDecorationColor: T.amberBg }}>
                      {e.empId || "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: T.ink }}>{e.name}</div>
                    {e.remarks ? (
                      <div className="text-[11px] truncate" style={{ color: T.slateSoft, maxWidth: 190 }}>{e.remarks}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3" style={{ color: T.slate }}>{e.designation}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: inactive ? T.lineSoft : T.greenBg, color: inactive ? T.slate : T.green }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: inactive ? T.slateSoft : T.green }} />
                      {inactive ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 num font-semibold" style={{ color: T.ink }}>{money(e.perTrip)}</td>
                  <td className="px-4 py-3 num text-[13px]" style={{ color: T.slate }}>{e.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setEditing(e)} className="p-1.5 rounded-md"
                        style={{ color: T.slate }}><Pencil size={15} /></button>
                      <button onClick={() => remove(e.id)} className="p-1.5 rounded-md"
                        style={{ color: T.red }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: T.slateSoft }}>
                  No staff found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <StaffModal emp={editing} designations={designations}
        setDesignations={setDesignations} onSave={save} onClose={() => setEditing(null)} />}
      {viewTripsEmps && <EmpTripsModal emps={viewTripsEmps} trips={trips} onClose={() => setViewTripsEmps(null)} />}
    </div>
  );
}

function StaffModal({ emp, designations, setDesignations, onSave, onClose }) {
  const [f, setF] = useState({
    id: emp.id, empId: emp.empId || "", name: emp.name || "",
    designation: emp.designation || designations[0] || "Housekeeper", perTrip: emp.perTrip || "",
    phone: emp.phone || "", status: emp.status || "active", remarks: emp.remarks || "",
  });
  const [addingDes, setAddingDes] = useState(false);
  const [newDes, setNewDes] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim() && Number(f.perTrip) > 0;

  const desOptions = f.designation && !designations.includes(f.designation)
    ? [f.designation, ...designations] : designations;

  const addDesignation = () => {
    const v = newDes.trim();
    if (!v) return;
    if (!designations.some((d) => d.toLowerCase() === v.toLowerCase())) {
      setDesignations((prev) => [...prev, v]);
    }
    set("designation", v);
    setNewDes("");
    setAddingDes(false);
  };

  const removeDesignation = (d) => {
    setDesignations((prev) => prev.filter((x) => x !== d));
  };

  const field = (label, key, props = {}) => (
    <label className="block">
      <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>{label}</span>
      <input value={f[key]} onChange={(e) => set(key, e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} {...props} />
    </label>
  );

  return (
    <Modal onClose={onClose} title={emp.id ? "Edit staff" : "Add staff"}>
      <div className="grid grid-cols-2 gap-3">
        {field("Emp ID", "empId", { placeholder: "OBHS-106" })}
        <div className="block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Designation</span>
            <button type="button" onClick={() => setAddingDes((v) => !v)}
              className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: T.amberDk }}>
              <Plus size={11} /> {addingDes ? "Done" : "Manage"}
            </button>
          </div>
          {!addingDes ? (
            <select value={f.designation} onChange={(e) => set("designation", e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}>
              {desOptions.map((d) => <option key={d}>{d}</option>)}
            </select>
          ) : (
            <div className="mt-1 space-y-2">
              <div className="flex gap-1.5">
                <input autoFocus value={newDes} onChange={(e) => setNewDes(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDesignation()}
                  placeholder="e.g. Coach Attendant"
                  className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm"
                  style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
                <button type="button" onClick={addDesignation}
                  className="px-3 rounded-lg text-sm font-semibold text-white shrink-0"
                  style={{ background: T.ink }}>Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {designations.map((d) => (
                  <span key={d} className="flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-[12px]"
                    style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>
                    {d}
                    <button type="button" onClick={() => removeDesignation(d)}
                      className="p-0.5 rounded-full" style={{ color: T.red }} title="Remove">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {designations.length === 0 && (
                  <span className="text-[12px]" style={{ color: T.slateSoft }}>No designations yet — add one above.</span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="col-span-2">{field("Full name", "name", { placeholder: "Employee name" })}</div>
        {field("Per trip salary (₹)", "perTrip", { type: "number", inputMode: "numeric", placeholder: "650" })}
        {field("Phone", "phone", { placeholder: "98xxxxxxxx" })}
        <div className="col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Status</span>
          <div className="mt-1 flex gap-1.5">
            {[["active", "Active", T.green], ["inactive", "Inactive", T.slate]].map(([val, label, c]) => {
              const on = f.status === val;
              return (
                <button key={val} type="button" onClick={() => set("status", val)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: on ? c : T.paper, color: on ? "#fff" : T.slate, border: `1px solid ${on ? c : T.line}` }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Remarks</span>
          <textarea value={f.remarks} onChange={(e) => set("remarks", e.target.value)} rows={2}
            placeholder="e.g. On leave till 20th, or left in June 2026"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink, resize: "none" }} />
        </label>
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>Cancel</button>
        <button disabled={!valid} onClick={() => onSave({ ...f, perTrip: Number(f.perTrip) })}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: valid ? T.ink : T.slateSoft }}>Save staff</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Trips                                                              */
/* ------------------------------------------------------------------ */
function TripsView({ employees, setEmployees, trips, setTrips, trains, month }) {
  const [adding, setAdding] = useState(false);
  const [filterEmp, setFilterEmp] = useState("all");

  const empName = (id) => employees.find((e) => e.id === id)?.name || "—";

  const monthTrips = trips
    .filter((t) => t.date && t.date.startsWith(month))
    .filter((t) => filterEmp === "all" || t.empId === filterEmp)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const add = (trip) => { setTrips((prev) => [...prev, { ...trip, id: uid() }]); setAdding(false); };
  const remove = (id) => setTrips((prev) => prev.filter((t) => t.id !== id));

  const tripRows = monthTrips.map((t) => {
    const emp = employees.find((e) => e.id === t.empId);
    const rate = Number(t.rate) || Number(emp?.perTrip) || 0;
    return { t, emp, rate };
  });

  const tripHeaders = ["Date", "Staff", "Train", "Route", "Rate", "Food (-)", "Advance (-)", ""];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <div className="text-sm font-bold" style={{ color: T.ink }}>{"Trip log — "}{monthLabel(month)}</div>
          <div className="text-[12px]" style={{ color: T.slateSoft }}>{monthTrips.length} trips</div>
        </div>
        <div className="flex gap-2">
          <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: T.card, border: `1px solid ${T.line}`, color: T.ink }}>
            <option value="all">All staff</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: T.ink }}>
            <Plus size={15} /> Log trip
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr style={{ background: T.lineSoft }}>
                {tripHeaders.map((h, i) => (
                  <th key={h + i} className={"px-4 py-2.5 text-[11px] track uppercase font-semibold " + (i >= 4 ? "text-right" : "text-left")}
                    style={{ color: T.slateSoft }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tripRows.map(({ t, rate }) => (
                <tr key={t.id} className="rowhover" style={{ borderTop: "1px solid " + T.lineSoft }}>
                  <td className="px-4 py-3 num text-[13px]" style={{ color: T.slate }}>{t.date.slice(8)}/{t.date.slice(5, 7)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: T.ink }}>{empName(t.empId)}</td>
                  <td className="px-4 py-3 num text-[13px]" style={{ color: T.slate }}>{t.trainNo}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ color: T.slate }}>{t.route}</td>
                  <td className="px-4 py-3 num text-right font-semibold" style={{ color: T.ink }}>{money(rate)}</td>
                  <td className="px-4 py-3 num text-right" style={{ color: t.food ? T.red : T.slateSoft }}>{t.food ? "-" + money(t.food) : "-"}</td>
                  <td className="px-4 py-3 num text-right" style={{ color: t.advance ? T.red : T.slateSoft }}>{t.advance ? "-" + money(t.advance) : "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(t.id)} className="p-1.5" style={{ color: T.red }}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
              {tripRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: T.slateSoft }}>
                    No trips logged. Tap Log trip to add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {adding && <TripModal employees={employees} setEmployees={setEmployees} trains={trains} month={month} onSave={add} onClose={() => setAdding(false)} />}
    </div>
  );
}

function StaffPicker({ employees, setEmployees, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [editRateId, setEditRateId] = useState(null); // emp.id being rate-edited
  const [rateVal, setRateVal] = useState("");
  const selected = employees.find((e) => e.id === value);
  const list = employees.filter((e) =>
    (e.status || "active") !== "inactive" &&
    (e.name + " " + e.empId + " " + e.designation).toLowerCase().includes(q.toLowerCase())
  );

  const startEditRate = (e, ev) => {
    ev.stopPropagation();
    setEditRateId(e.id);
    setRateVal(String(e.perTrip || ""));
  };

  const saveRate = (empId, ev) => {
    ev?.stopPropagation();
    const newRate = Number(rateVal);
    if (newRate > 0 && setEmployees) {
      setEmployees((prev) => prev.map((e) => e.id === empId ? { ...e, perTrip: newRate } : e));
    }
    setEditRateId(null);
  };

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: selected ? T.ink : T.slateSoft }}>
        <span className="truncate">
          {selected ? `${selected.name} · ${money(selected.perTrip)}/trip` : "Select staff"}
        </span>
        <ChevronRight size={15} color={T.slate}
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
      </button>
      {open && (
        <div className="mt-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.line}`, background: T.card }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
            <Search size={15} color={T.slateSoft} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID…"
              className="w-full bg-transparent text-sm" style={{ color: T.ink, border: "none" }} />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {list.map((e) => (
              <div key={e.id} className="rowhover"
                style={{ background: e.id === value ? T.amberBg : "transparent", borderTop: `1px solid ${T.lineSoft}` }}>
                {editRateId === e.id ? (
                  /* ── inline rate editor ── */
                  <div className="flex items-center gap-2 px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                    <span className="text-sm font-semibold flex-1 truncate" style={{ color: T.ink }}>{e.name}</span>
                    <span className="text-[11px]" style={{ color: T.slateSoft }}>₹</span>
                    <input
                      autoFocus
                      type="number"
                      value={rateVal}
                      onChange={(ev) => setRateVal(ev.target.value)}
                      onKeyDown={(ev) => { if (ev.key === "Enter") saveRate(e.id); if (ev.key === "Escape") setEditRateId(null); }}
                      className="w-20 rounded px-2 py-0.5 text-sm num text-right"
                      style={{ background: T.paper, border: `1px solid ${T.amber}`, color: T.ink }} />
                    <button type="button" onClick={(ev) => saveRate(e.id, ev)}
                      className="p-1 rounded font-bold text-[12px]"
                      style={{ background: T.ink, color: "#fff" }}>✓</button>
                    <button type="button" onClick={(ev) => { ev.stopPropagation(); setEditRateId(null); }}
                      className="p-1 rounded text-[12px]"
                      style={{ color: T.slateSoft }}>✕</button>
                  </div>
                ) : (
                  /* ── normal row ── */
                  <div className="flex items-center px-3 py-2.5">
                    <button type="button" className="flex-1 text-left flex items-center gap-0 min-w-0"
                      onClick={() => { onChange(e.id); setOpen(false); setQ(""); setEditRateId(null); }}>
                      <span className="text-sm font-semibold truncate" style={{ color: T.ink }}>{e.name}</span>
                      <span className="text-[11px] num ml-2 shrink-0" style={{ color: T.slateSoft }}>{e.empId}</span>
                    </button>
                    <span className="num text-[12px] shrink-0 ml-2" style={{ color: T.slate }}>{money(e.perTrip)}</span>
                    {setEmployees && (
                      <button type="button" onClick={(ev) => startEditRate(e, ev)}
                        className="ml-2 p-1 rounded shrink-0 hover:opacity-70"
                        title="Edit rate"
                        style={{ color: T.slateSoft }}>
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <div className="px-3 py-4 text-center text-sm" style={{ color: T.slateSoft }}>No staff found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TripModal({ employees, setEmployees, trains, month, onSave, onClose }) {
  const [f, setF] = useState({
    empId: employees[0]?.id || "", date: `${month}-${String(new Date().getDate()).padStart(2, "0")}`,
    trainNo: "", route: "", food: "", advance: "",
    rate: String(employees[0]?.perTrip || ""),
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.empId && f.date;

  const onPickEmp = (id) => {
    const emp = employees.find((e) => e.id === id);
    setF((p) => ({ ...p, empId: id, rate: String(emp?.perTrip || p.rate) }));
  };

  const onPickTrain = (id) => {
    const t = (trains || []).find((x) => x.id === id);
    if (t) setF((p) => ({ ...p, trainNo: t.trainNo, route: t.route || t.name }));
  };

  return (
    <Modal onClose={onClose} title="Log a trip">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Staff</span>
          <StaffPicker employees={employees} setEmployees={setEmployees} value={f.empId} onChange={onPickEmp} />
        </div>
        {trains && trains.length > 0 && (
          <label className="block col-span-2">
            <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
              Pick from train master
            </span>
            <select onChange={(e) => onPickTrain(e.target.value)} defaultValue=""
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}>
              <option value="" disabled>Select a train…</option>
              {trains.map((t) => <option key={t.id} value={t.id}>{t.trainNo} · {t.name}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Date</span>
          <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Train no.</span>
          <input value={f.trainNo} onChange={(e) => set("trainNo", e.target.value)} placeholder="12030"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Route</span>
          <input value={f.route} onChange={(e) => set("route", e.target.value)} placeholder="ASR – NDLS"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>
            Per Trip Rate (₹)
          </span>
          <input type="number" inputMode="numeric" value={f.rate} onChange={(e) => set("rate", e.target.value)} placeholder="650"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
            style={{ background: T.paper, border: `1px solid ${T.amber}`, color: T.ink }} />
        </label>
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold flex items-center gap-1" style={{ color: T.red }}>
            <Utensils size={12} /> Food money (₹)
          </span>
          <input type="number" inputMode="numeric" value={f.food} onChange={(e) => set("food", e.target.value)} placeholder="150"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold flex items-center gap-1" style={{ color: T.red }}>
            <ArrowDownCircle size={12} /> Advance (₹)
          </span>
          <input type="number" inputMode="numeric" value={f.advance} onChange={(e) => set("advance", e.target.value)} placeholder="0"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
      </div>
      <p className="text-[11px] mt-3" style={{ color: T.slateSoft }}>
        Net Payable = Gross − Food Money − Advance
      </p>
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>Cancel</button>
        <button disabled={!valid}
          onClick={() => onSave({ ...f, food: Number(f.food) || 0, advance: Number(f.advance) || 0, rate: Number(f.rate) || 0 })}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: valid ? T.ink : T.slateSoft }}>Save trip</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Train master                                                       */
/* ------------------------------------------------------------------ */
function TrainsView({ trains, setTrains }) {
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  const filtered = trains.filter((t) =>
    (t.trainNo + " " + t.name + " " + t.route).toLowerCase().includes(q.toLowerCase())
  );

  const save = (t) => {
    if (t.id) setTrains((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    else setTrains((prev) => [...prev, { ...t, id: uid() }]);
    setEditing(null);
  };
  const remove = (id) => setTrains((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 max-w-sm"
          style={{ background: T.card, border: `1px solid ${T.line}` }}>
          <Search size={16} color={T.slateSoft} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search train no or name…" className="bg-transparent text-sm w-full"
            style={{ color: T.ink, border: "none" }} />
        </div>
        <button onClick={() => setEditing({})}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white self-start"
          style={{ background: T.ink }}>
          <Plus size={15} /> Add train
        </button>
      </div>

      <div className="space-y-2.5">
        {filtered.map((t) => (
          <div key={t.id} className="rounded-xl p-4 flex items-start justify-between gap-3"
            style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="num font-bold" style={{ color: T.ink }}>{t.trainNo}</span>
                <span className="font-semibold" style={{ color: T.ink }}>{t.name}</span>
                {(t.type || "regular") === "special" && (
                  <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: T.amberBg, color: T.amberDk }}>
                    SPECIAL
                  </span>
                )}
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: T.slate }}>{t.route}</div>
              {(t.type || "regular") === "special" && (t.validFrom || t.validTo) && (
                <div className="text-[11px] num mt-0.5" style={{ color: T.amberDk }}>
                  Runs {t.validFrom || "…"} → {t.validTo || "…"}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {DAYS.map((d) => {
                  const on = (t.days || []).includes(d);
                  return (
                    <span key={d} className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                      style={{ background: on ? T.ink : T.lineSoft, color: on ? "#fff" : T.slateSoft }}>
                      {d[0]}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2.5 text-[12px]">
                <span className="num font-semibold rounded px-2 py-0.5" style={{ background: T.amberBg, color: T.amberDk }}>
                  {t.ehk} EHK
                </span>
                <span className="num font-semibold rounded px-2 py-0.5" style={{ background: T.greenBg, color: T.green }}>
                  {t.janitors} Janitors
                </span>
                <span className="num" style={{ color: T.slateSoft }}>= {t.ehk + t.janitors} per run</span>
                {t.tripHours ? (
                  <span className="num rounded px-2 py-0.5" style={{ background: T.lineSoft, color: T.slate }}>{num2(t.tripHours)} hrs</span>
                ) : null}
              </div>
              {(t.cancelledDates || []).length > 0 && (
                <div className="text-[11px] num mt-1.5" style={{ color: T.red }}>
                  {t.cancelledDates.length} cancelled: {[...t.cancelledDates].sort().map((iso) => iso.slice(8) + "/" + iso.slice(5, 7)).join(", ")}
                </div>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditing(t)} className="p-1.5 rounded-md" style={{ color: T.slate }}><Pencil size={15} /></button>
              <button onClick={() => remove(t.id)} className="p-1.5 rounded-md" style={{ color: T.red }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl p-8 text-center text-sm" style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slateSoft }}>
            No trains yet. Add your first train to plan manpower.
          </div>
        )}
      </div>

      {editing && <TrainModal train={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TrainModal({ train, onSave, onClose }) {
  const [f, setF] = useState({
    id: train.id, trainNo: train.trainNo || "", name: train.name || "", route: train.route || "",
    days: train.days || [...DAYS], ehk: train.ehk ?? 1, janitors: train.janitors ?? 8,
    tripHours: train.tripHours ?? "", type: train.type || "regular", validFrom: train.validFrom || "", validTo: train.validTo || "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleDay = (d) =>
    setF((p) => ({ ...p, days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d] }));
  const valid = f.trainNo.trim() && f.name.trim() && f.days.length > 0 &&
    (f.type !== "special" || (f.validFrom && f.validTo && f.validFrom <= f.validTo));

  const numField = (label, key, color) => (
    <label className="block">
      <span className="text-[11px] track uppercase font-semibold" style={{ color }}>{label}</span>
      <input type="number" inputMode="numeric" min={0} value={f[key]}
        onChange={(e) => set(key, Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
    </label>
  );

  return (
    <Modal onClose={onClose} title={train.id ? "Edit train" : "Add train"}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Train no.</span>
          <input value={f.trainNo} onChange={(e) => set("trainNo", e.target.value)} placeholder="12204"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Train name</span>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Garib Rath"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
        <label className="block col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Route</span>
          <input value={f.route} onChange={(e) => set("route", e.target.value)} placeholder="Amritsar → Saharsa"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>

        <div className="col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Schedule type</span>
          <div className="mt-1 flex gap-1.5">
            {[["regular", "Regular"], ["special", "Special / seasonal"]].map(([val, label]) => {
              const on = f.type === val;
              return (
                <button key={val} type="button" onClick={() => set("type", val)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: on ? T.ink : T.paper, color: on ? "#fff" : T.slate, border: `1px solid ${on ? T.ink : T.line}` }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {f.type === "special" && (
          <>
            <label className="block">
              <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Valid from</span>
              <input type="date" value={f.validFrom} onChange={(e) => set("validFrom", e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            </label>
            <label className="block">
              <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Valid to</span>
              <input type="date" value={f.validTo} onChange={(e) => set("validTo", e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
                style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
            </label>
          </>
        )}

        <div className="col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Running days</span>
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {DAYS.map((d) => {
              const on = f.days.includes(d);
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className="w-10 py-2 rounded-lg text-[12px] font-semibold"
                  style={{ background: on ? T.ink : T.paper, color: on ? "#fff" : T.slate, border: `1px solid ${on ? T.ink : T.line}` }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        {numField("EHK (supervisor)", "ehk", T.amberDk)}
        {numField("Janitors", "janitors", T.green)}
        <label className="block col-span-2">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Round-trip hours (per contract)</span>
          <input type="number" inputMode="decimal" step="0.01" min={0} value={f.tripHours}
            onChange={(e) => set("tripHours", e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))}
            placeholder="63.92"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
        </label>
      </div>
      <p className="text-[11px] mt-3" style={{ color: T.slateSoft }}>
        {f.type === "special"
          ? `Runs only ${f.validFrom || "…"} to ${f.validTo || "…"} on selected days.`
          : "Runs every week on the selected days."} Manpower per run: {f.ehk} EHK + {f.janitors} Janitors.
      </p>
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>Cancel</button>
        <button disabled={!valid} onClick={() => onSave(f)}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: valid ? T.ink : T.slateSoft }}>Save train</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Planning                                                           */
/* ------------------------------------------------------------------ */
function PlanningView({ trains, setTrains, employees, month }) {
  const [sub, setSub] = useState("plan");
  const activeEHK = employees.filter((e) => (e.status || "active") !== "inactive" && isEHK(e.designation)).length;
  const activeJan = employees.filter((e) => (e.status || "active") !== "inactive" && !isEHK(e.designation)).length;

  // current week (Mon–Sun containing today), with real dates so validity applies
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const monday = new Date(today); monday.setDate(today.getDate() - dow);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i);
    const scheduled = trains.filter((t) => scheduledOn(t, date));
    const runs = scheduled.filter((t) => !isCancelled(t, date));
    const cancelled = scheduled.filter((t) => isCancelled(t, date));
    const ehk = runs.reduce((s, t) => s + (t.ehk || 0), 0);
    const jan = runs.reduce((s, t) => s + (t.janitors || 0), 0);
    return { date, label: DAYS[i], isToday: isoOf(date) === isoOf(today), runs, cancelled, ehk, jan };
  });

  const weekTotals = week.reduce(
    (a, d) => ({ ehk: a.ehk + d.ehk, jan: a.jan + d.jan, runs: a.runs + d.runs.length }),
    { ehk: 0, jan: 0, runs: 0 }
  );
  const peak = week.reduce((a, d) => (d.ehk + d.jan > a.ehk + a.jan ? d : a), week[0] || { label: "—", ehk: 0, jan: 0 });

  // monthly projection for selected month (respects validity)
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let monthEhk = 0, monthJan = 0, monthRuns = 0;
  for (let dd = 1; dd <= daysInMonth; dd++) {
    const date = new Date(y, m - 1, dd);
    const runs = trains.filter((t) => runsOn(t, date));
    monthRuns += runs.length;
    monthEhk += runs.reduce((s, t) => s + (t.ehk || 0), 0);
    monthJan += runs.reduce((s, t) => s + (t.janitors || 0), 0);
  }

  const gapChip = (need, have) => {
    const gap = need - have;
    if (gap <= 0) return { label: "OK", bg: T.greenBg, fg: T.green };
    return { label: `short ${gap}`, bg: T.redBg, fg: T.red };
  };

  const toggleCancel = (trainId, date) => {
    const iso = isoOf(date);
    setTrains((prev) => prev.map((t) => {
      if (t.id !== trainId) return t;
      const list = t.cancelledDates || [];
      return { ...t, cancelledDates: list.includes(iso) ? list.filter((x) => x !== iso) : [...list, iso] };
    }));
  };

  const subTabs = (
    <div className="flex gap-1 rounded-xl p-1" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      {[["plan", "Plan"], ["trains", `Trains (${trains.length})`]].map(([val, label]) => {
        const on = sub === val;
        return (
          <button key={val} onClick={() => setSub(val)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ background: on ? T.ink : "transparent", color: on ? "#fff" : T.slate }}>
            {label}
          </button>
        );
      })}
    </div>
  );

  if (sub === "trains") {
    return (
      <div className="space-y-4">
        {subTabs}
        <TrainsView trains={trains} setTrains={setTrains} />
      </div>
    );
  }

  if (trains.length === 0) {
    return (
      <div className="space-y-4">
        {subTabs}
        <div className="rounded-xl p-8 text-center" style={{ background: T.card, border: `1px solid ${T.line}` }}>
          <ClipboardList size={28} color={T.slateSoft} className="mx-auto mb-3" />
          <div className="text-sm font-semibold" style={{ color: T.ink }}>No trains to plan yet</div>
          <div className="text-[13px] mt-1 mb-4" style={{ color: T.slateSoft }}>Add trains with running days and manpower to build the plan.</div>
          <button onClick={() => setSub("trains")} className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: T.ink }}>Add trains</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {subTabs}
      {/* Availability */}
      <div className="rounded-xl p-4" style={{ background: T.ink }}>
        <div className="flex items-center gap-2 mb-3">
          <UserCheck size={16} color={T.amber} />
          <span className="text-[11px] track uppercase font-semibold" style={{ color: "#C7CEDC" }}>Active staff available</span>
        </div>
        <div className="flex gap-6">
          <div>
            <div className="text-2xl font-extrabold num" style={{ color: "#fff" }}>{activeEHK}</div>
            <div className="text-[11px]" style={{ color: "#C7CEDC" }}>EHK / Supervisors</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold num" style={{ color: "#fff" }}>{activeJan}</div>
            <div className="text-[11px]" style={{ color: "#C7CEDC" }}>Janitors</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold num" style={{ color: T.amber }}>{activeEHK + activeJan}</div>
            <div className="text-[11px]" style={{ color: "#C7CEDC" }}>Total</div>
          </div>
        </div>
      </div>

      {/* Weekly plan */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-bold" style={{ color: T.ink }}>This week's plan</div>
            <div className="text-[11px] num" style={{ color: T.slateSoft }}>
              {week[0].date.getDate()}/{week[0].date.getMonth() + 1} – {week[6].date.getDate()}/{week[6].date.getMonth() + 1}
            </div>
          </div>
          <div className="text-[12px] text-right" style={{ color: T.slateSoft }}>
            Busiest: {peak.label} ({peak.ehk + peak.jan})
          </div>
        </div>
        <div className="space-y-2">
          {week.map((d) => {
            const eg = gapChip(d.ehk, activeEHK);
            const jg = gapChip(d.jan, activeJan);
            const hasRuns = d.runs.length > 0;
            const idle = d.runs.length === 0 && d.cancelled.length === 0;
            return (
              <div key={d.label} className="rounded-xl p-3.5"
                style={{ background: T.card, border: `1px solid ${d.isToday ? T.amber : T.line}`, opacity: idle ? 0.6 : 1 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold" style={{ color: T.ink }}>{d.label}</span>
                    <span className="num text-[11px]" style={{ color: d.isToday ? T.amberDk : T.slateSoft }}>
                      {d.date.getDate()}/{d.date.getMonth() + 1}{d.isToday ? " · today" : ""}
                    </span>
                    <span className="text-[12px]" style={{ color: T.slateSoft }}>
                      {idle ? "No trains" : `${d.runs.length} running${d.cancelled.length ? ` · ${d.cancelled.length} cancelled` : ""}`}
                    </span>
                  </div>
                  {hasRuns && (
                    <div className="flex items-center gap-1.5">
                      <span className="num text-[11px] font-semibold rounded px-2 py-0.5" style={{ background: eg.bg, color: eg.fg }}>
                        {d.ehk} EHK · {eg.label}
                      </span>
                      <span className="num text-[11px] font-semibold rounded px-2 py-0.5" style={{ background: jg.bg, color: jg.fg }}>
                        {d.jan} Jan · {jg.label}
                      </span>
                    </div>
                  )}
                </div>
                {!idle && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.runs.map((t) => {
                      const special = (t.type || "regular") === "special";
                      return (
                        <button key={t.id} onClick={() => toggleCancel(t.id, d.date)}
                          title="Tap to mark cancelled"
                          className="num text-[11px] font-semibold rounded px-1.5 py-0.5"
                          style={{ background: special ? T.amberBg : T.greenBg, color: special ? T.amberDk : T.green }}>
                          {t.trainNo}
                        </button>
                      );
                    })}
                    {d.cancelled.map((t) => (
                      <button key={t.id} onClick={() => toggleCancel(t.id, d.date)}
                        title="Cancelled — tap to restore"
                        className="num text-[11px] font-semibold rounded px-1.5 py-0.5"
                        style={{ background: T.redBg, color: T.red, textDecoration: "line-through" }}>
                        {t.trainNo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px]" style={{ color: T.slateSoft }}>
          <AlertTriangle size={12} color={T.red} />
          "short" = us din ki requirement se kam active staff. Train chip pe tap karke us din cancel/restore karo — count apne aap update hoga. Green = regular, orange = special, struck red = cancelled.
        </div>
      </div>

      {/* Monthly projection */}
      <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="text-sm font-bold mb-3" style={{ color: T.ink }}>{monthLabel(month)} — total load</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Departures", monthRuns, T.ink],
            ["EHK-trips", monthEhk, T.amberDk],
            ["Janitor-trips", monthJan, T.green],
          ].map(([label, val, c]) => (
            <div key={label}>
              <div className="text-xl font-extrabold num" style={{ color: c }}>{val}</div>
              <div className="text-[11px]" style={{ color: T.slateSoft }}>{label}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-3" style={{ color: T.slateSoft }}>
          Total man-trips this month: {monthEhk + monthJan}. Ye planning target hai — actual salary Trip Log se banegi.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hours & Penalty                                                    */
/* ------------------------------------------------------------------ */
function HoursPenaltyView({ trains, employees, trips, month, rates, setRates, minWages, setMinWages, penalties, setPenalties }) {
  const [sub, setSub] = useState("hours");
  const [adding, setAdding] = useState(false);

  // hours from actual logged trips: staff role (EHK/Janitor) × the train's round-trip hours
  const hoursOfTrain = (trainNo) => Number((trains.find((t) => t.trainNo === trainNo) || {}).tripHours) || 0;
  const monthTrips = trips.filter((t) => t.date && t.date.startsWith(month));
  let ehkHours = 0, janHours = 0, ehkTrips = 0, janTrips = 0, noHourTrips = 0;
  const perStaff = {};
  monthTrips.forEach((tr) => {
    const emp = employees.find((e) => e.id === tr.empId);
    if (!emp) return;
    const hrs = hoursOfTrain(tr.trainNo);
    if (hrs === 0) noHourTrips++;
    const ehk = isEHK(emp.designation);
    if (ehk) { ehkHours += hrs; ehkTrips++; } else { janHours += hrs; janTrips++; }
    if (!perStaff[tr.empId]) perStaff[tr.empId] = { name: emp.name, empId: emp.empId, role: ehk ? "EHK" : "Janitor", trips: 0, hours: 0 };
    perStaff[tr.empId].trips++; perStaff[tr.empId].hours += hrs;
  });
  const staffRows = Object.values(perStaff).sort((a, b) => (b.role === a.role ? b.hours - a.hours : a.role === "EHK" ? -1 : 1));

  const monthPenalties = penalties
    .filter((p) => p.date && p.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((p) => ({ ...p, calc: computePenalty(p, rates, minWages) }));
  const penTotal = monthPenalties.reduce((s, p) => s + p.calc.total, 0);

  const subTabs = (
    <div className="flex gap-1 rounded-xl p-1" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      {[["hours", "Hours"], ["penalty", `Penalty (${monthPenalties.length})`], ["rates", "Rates"]].map(([val, label]) => {
        const on = sub === val;
        return (
          <button key={val} onClick={() => setSub(val)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ background: on ? T.ink : "transparent", color: on ? "#fff" : T.slate }}>
            {label}
          </button>
        );
      })}
    </div>
  );

  const addPenalty = (p) => { setPenalties((prev) => [...prev, { ...p, id: uid() }]); setAdding(false); };
  const removePenalty = (id) => setPenalties((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-4">
      {subTabs}

      {sub === "hours" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="text-[11px] track uppercase font-semibold" style={{ color: T.amberDk }}>EHK hours</div>
              <div className="text-2xl font-extrabold num mt-1" style={{ color: T.amberDk }}>{num2(ehkHours)}</div>
              <div className="text-[12px] num mt-0.5" style={{ color: T.slateSoft }}>{ehkTrips} trips</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="text-[11px] track uppercase font-semibold" style={{ color: T.green }}>Janitor hours</div>
              <div className="text-2xl font-extrabold num mt-1" style={{ color: T.green }}>{num2(janHours)}</div>
              <div className="text-[12px] num mt-0.5" style={{ color: T.slateSoft }}>{janTrips} trips</div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              <div className="text-sm font-bold" style={{ color: T.ink }}>Per staff — {monthLabel(month)}</div>
              <div className="text-[12px]" style={{ color: T.slateSoft }}>From logged trips × each train's round-trip hours</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 420 }}>
                <thead>
                  <tr style={{ background: T.lineSoft }}>
                    {[["Staff", "left"], ["Role", "left"], ["Trips", "right"], ["Hours", "right"]].map(([h, a]) => (
                      <th key={h} className={`px-4 py-2.5 text-[11px] track uppercase font-semibold text-${a}`}
                        style={{ color: T.slateSoft }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((r) => (
                    <tr key={r.name} className="rowhover" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: T.ink }}>{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold rounded px-2 py-0.5"
                          style={{ background: r.role === "EHK" ? T.amberBg : T.greenBg, color: r.role === "EHK" ? T.amberDk : T.green }}>
                          {r.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right num" style={{ color: T.slate }}>{r.trips}</td>
                      <td className="px-4 py-3 text-right num font-bold" style={{ color: T.ink }}>{num2(r.hours)}</td>
                    </tr>
                  ))}
                  {staffRows.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: T.slateSoft }}>
                      No trips logged for {monthLabel(month)}.
                    </td></tr>
                  )}
                </tbody>
                {staffRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: T.lineSoft, borderTop: `1px solid ${T.line}` }}>
                      <td className="px-4 py-3 font-bold" style={{ color: T.ink }}>Total</td>
                      <td></td>
                      <td className="px-4 py-3 text-right num font-bold" style={{ color: T.ink }}>{ehkTrips + janTrips}</td>
                      <td className="px-4 py-3 text-right num font-extrabold" style={{ color: T.ink }}>{num2(ehkHours + janHours)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {noHourTrips > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px]"
              style={{ background: T.amberBg, color: T.amberDk }}>
              <AlertTriangle size={13} />
              {noHourTrips} trip{noHourTrips > 1 ? "s" : ""} ka round-trip hours nahi mila — us train ko Train Master mein hours ke saath add karo.
            </div>
          )}
        </div>
      )}

      {sub === "penalty" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold" style={{ color: T.ink }}>Shortfall penalties</div>
              <div className="text-[12px]" style={{ color: T.slateSoft }}>{monthLabel(month)}</div>
            </div>
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: T.ink }}>
              <Plus size={15} /> Log shortfall
            </button>
          </div>

          {monthPenalties.map((p) => (
            <div key={p.id} className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="num font-bold" style={{ color: T.ink }}>{p.trainNo}</span>
                    <span className="num text-[12px]" style={{ color: T.slateSoft }}>{p.date.slice(8)}/{p.date.slice(5, 7)} · {num2(p.tripHours)} hrs</span>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: T.slate }}>
                    Required {p.reqEhk}+{p.reqJan} · Deployed {p.actEhk}+{p.actJan}
                  </div>
                </div>
                <button onClick={() => removePenalty(p.id)} className="p-1.5" style={{ color: T.red }}><Trash2 size={15} /></button>
              </div>
              <div className="mt-3 space-y-1.5 text-[13px]">
                {p.calc.ehkShort > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.slate }}>EHK short {p.calc.ehkShort} × 3 × {money2(p.calc.ehkWage)} (min wage)</span>
                    <span className="num font-semibold" style={{ color: T.red }}>{money2(p.calc.ehkPenalty)}</span>
                  </div>
                )}
                {p.calc.janShort > 0 && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.slate }}>Janitor short {p.calc.janShort} × {num2(p.tripHours)} × {money2(p.calc.janRate)}</span>
                    <span className="num font-semibold" style={{ color: T.red }}>{money2(p.calc.janPenalty)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                  <span className="font-semibold" style={{ color: T.ink }}>Penalty</span>
                  <span className="num font-extrabold" style={{ color: T.red }}>{money2(p.calc.total)}</span>
                </div>
              </div>
            </div>
          ))}

          {monthPenalties.length === 0 && (
            <div className="rounded-xl p-8 text-center text-sm" style={{ background: T.card, border: `1px solid ${T.line}`, color: T.slateSoft }}>
              No shortfall penalties this month.
            </div>
          )}

          {monthPenalties.length > 0 && (
            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: T.redBg, border: `1px solid ${T.red}` }}>
              <span className="font-bold" style={{ color: T.red }}>Total penalty — {monthLabel(month)}</span>
              <span className="num text-lg font-extrabold" style={{ color: T.red }}>{money2(penTotal)}</span>
            </div>
          )}
        </div>
      )}

      {sub === "rates" && (
        <RatesPanel rates={rates} setRates={setRates} minWages={minWages} setMinWages={setMinWages} />
      )}

      {adding && (
        <PenaltyModal trains={trains} month={month} rates={rates} minWages={minWages}
          onSave={addPenalty} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function RatesPanel({ rates, setRates, minWages, setMinWages }) {
  const [nw, setNw] = useState({ effectiveFrom: "", ehk: "", janitor: "" });
  const setRate = (k, v) => setRates((p) => ({ ...p, [k]: v === "" ? "" : Number(v) }));
  const addWage = () => {
    if (!nw.effectiveFrom) return;
    setMinWages((prev) => [...prev, { id: uid(), effectiveFrom: nw.effectiveFrom, ehk: Number(nw.ehk) || 0, janitor: Number(nw.janitor) || 0 }]);
    setNw({ effectiveFrom: "", ehk: "", janitor: "" });
  };
  const removeWage = (id) => setMinWages((prev) => prev.filter((w) => w.id !== id));
  const sorted = [...minWages].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));

  const rateField = (label, key, hint) => (
    <label className="block">
      <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>{label}</span>
      <input type="number" inputMode="decimal" step="0.01" value={rates[key] ?? ""}
        onChange={(e) => setRate(key, e.target.value)} placeholder={hint}
        className="mt-1 w-full rounded-lg px-3 py-2 text-sm num"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="text-sm font-bold mb-3" style={{ color: T.ink }}>Contract rate (without GST)</div>
        <div className="grid grid-cols-1 gap-3">
          {rateField("Janitor rate / hour", "janitorRate", "70.88")}
        </div>
        <p className="text-[11px] mt-3" style={{ color: T.slateSoft }}>
          Used for janitor shortfall penalty (short × trip hours × rate).
        </p>
      </div>

      <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="text-sm font-bold" style={{ color: T.ink }}>Minimum wages</div>
        <p className="text-[11px] mt-0.5 mb-3" style={{ color: T.slateSoft }}>
          Revised 1 Apr & 1 Oct. EHK penalty uses the EHK minimum wage effective on the shortfall date.
        </p>
        <div className="space-y-2">
          {sorted.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: T.paper, border: `1px solid ${T.line}` }}>
              <div className="num text-[13px]" style={{ color: T.ink }}>
                <span className="font-semibold">{w.effectiveFrom}</span>
                <span className="ml-3" style={{ color: T.amberDk }}>EHK {money(w.ehk)}</span>
                <span className="ml-2" style={{ color: T.green }}>Jan {money(w.janitor)}</span>
              </div>
              <button onClick={() => removeWage(w.id)} style={{ color: T.red }}><X size={15} /></button>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-[13px] text-center py-3" style={{ color: T.slateSoft }}>No revisions added yet.</div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <label className="block">
            <span className="text-[10px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Effective from</span>
            <input type="date" value={nw.effectiveFrom} onChange={(e) => setNw((p) => ({ ...p, effectiveFrom: e.target.value }))}
              className="mt-1 w-full rounded-lg px-2 py-2 text-[13px] num"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          </label>
          <label className="block">
            <span className="text-[10px] track uppercase font-semibold" style={{ color: T.slateSoft }}>EHK wage</span>
            <input type="number" inputMode="numeric" value={nw.ehk} onChange={(e) => setNw((p) => ({ ...p, ehk: e.target.value }))} placeholder="760"
              className="mt-1 w-full rounded-lg px-2 py-2 text-[13px] num"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          </label>
          <label className="block">
            <span className="text-[10px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Janitor wage</span>
            <input type="number" inputMode="numeric" value={nw.janitor} onChange={(e) => setNw((p) => ({ ...p, janitor: e.target.value }))} placeholder="706"
              className="mt-1 w-full rounded-lg px-2 py-2 text-[13px] num"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          </label>
        </div>
        <button onClick={addWage} disabled={!nw.effectiveFrom}
          className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: nw.effectiveFrom ? T.ink : T.slateSoft }}>Add revision</button>
      </div>
    </div>
  );
}

function PenaltyModal({ trains, month, rates, minWages, onSave, onClose }) {
  const [f, setF] = useState({
    trainId: "", trainNo: "", tripHours: "", reqEhk: 1, reqJan: 10, actEhk: 0, actJan: 0,
    date: `${month}-${String(new Date().getDate()).padStart(2, "0")}`,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const pickTrain = (id) => {
    const t = trains.find((x) => x.id === id);
    if (t) setF((p) => ({ ...p, trainId: id, trainNo: t.trainNo, tripHours: t.tripHours || "", reqEhk: t.ehk || 0, reqJan: t.janitors || 0 }));
  };
  const calc = computePenalty(f, rates, minWages);
  const valid = f.trainNo && f.date && (calc.ehkShort > 0 || calc.janShort > 0);

  const numIn = (label, key) => (
    <label className="block">
      <span className="text-[10px] track uppercase font-semibold" style={{ color: T.slateSoft }}>{label}</span>
      <input type="number" inputMode="numeric" min={0} value={f[key]}
        onChange={(e) => set(key, Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-lg px-2 py-2 text-sm num"
        style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
    </label>
  );

  return (
    <Modal onClose={onClose} title="Log shortfall" wide>
      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Train</span>
          <select value={f.trainId} onChange={(e) => pickTrain(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }}>
            <option value="" disabled>Select train…</option>
            {trains.map((t) => <option key={t.id} value={t.id}>{t.trainNo} · {t.name}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Date</span>
            <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)}
              className="mt-1 w-full rounded-lg px-2 py-2 text-sm num"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          </label>
          <label className="block">
            <span className="text-[10px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Round-trip hours</span>
            <input type="number" inputMode="decimal" step="0.01" value={f.tripHours}
              onChange={(e) => set("tripHours", e.target.value === "" ? "" : Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg px-2 py-2 text-sm num"
              style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.ink }} />
          </label>
        </div>

        <div>
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Required</span>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {numIn("EHK", "reqEhk")}
            {numIn("Janitors", "reqJan")}
          </div>
        </div>
        <div>
          <span className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Actually deployed</span>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {numIn("EHK", "actEhk")}
            {numIn("Janitors", "actJan")}
          </div>
        </div>

        <div className="rounded-lg p-3" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
          <div className="flex items-center justify-between text-[13px]">
            <span style={{ color: T.slate }}>EHK short {calc.ehkShort} × 3 × {money2(calc.ehkWage)}</span>
            <span className="num font-semibold" style={{ color: T.red }}>{money2(calc.ehkPenalty)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] mt-1">
            <span style={{ color: T.slate }}>Janitor short {calc.janShort} × {num2(f.tripHours)} × {money2(calc.janRate)}</span>
            <span className="num font-semibold" style={{ color: T.red }}>{money2(calc.janPenalty)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: `1px solid ${T.line}` }}>
            <span className="font-bold" style={{ color: T.ink }}>Total penalty</span>
            <span className="num font-extrabold" style={{ color: T.red }}>{money2(calc.total)}</span>
          </div>
          {calc.ehkWage === 0 && calc.ehkShort > 0 && (
            <div className="text-[11px] mt-2" style={{ color: T.amberDk }}>No min wage set for this date — add one in Rates.</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: T.paper, border: `1px solid ${T.line}`, color: T.slate }}>Cancel</button>
        <button disabled={!valid} onClick={() => onSave(f)}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: valid ? T.ink : T.slateSoft }}>Save penalty</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Salary sheet                                                       */
/* ------------------------------------------------------------------ */
function SalaryView({ rows, totals, month, firm, onPayslip }) {
  const visible = rows.filter((r) => (r.emp.status || "active") !== "inactive" || r.count > 0);
  const exportXlsx = () => {
    const data = visible.map((r) => ({
      "Emp ID": r.emp.empId,
      "Name": r.emp.name,
      "Designation": r.emp.designation,
      "Trips": r.count,
      "Gross Salary (₹)": r.gross,
      "Food Deduction (₹)": r.food,
      "Advance Deduction (₹)": r.advance,
      "Net Payable (₹)": r.net,
    }));
    data.push({
      "Emp ID": "", "Name": "TOTAL", "Designation": "", "Trips": totals.count,
      "Gross Salary (₹)": totals.gross, "Food Deduction (₹)": totals.food,
      "Advance Deduction (₹)": totals.advance, "Net Payable (₹)": totals.net,
    });
    const ws = XLSX.utils.aoa_to_sheet([
      [firm?.name || "OBHS Contractor"],
      ["OBHS Salary Sheet — " + monthLabel(month)],
      [],
    ]);
    XLSX.utils.sheet_add_json(ws, data, { origin: "A4" });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel(month).replace(" ", "-"));
    const slug = (firm?.name || "obhs").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    XLSX.writeFile(wb, `${slug}-salary-${month}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold" style={{ color: T.ink }}>{firm?.name} — Salary sheet</div>
          <div className="text-[12px]" style={{ color: T.slateSoft }}>{monthLabel(month)}</div>
        </div>        <button onClick={exportXlsx}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: T.green }}>
          <Download size={15} /> Export Excel
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr style={{ background: T.ink }}>
                {[["Staff", "left"], ["Trips", "right"], ["Gross", "right"], ["Food", "right"], ["Advance", "right"], ["Net Payable", "right"], ["", "right"]].map(([h, a], i) => (
                  <th key={i} className={`px-4 py-3 text-[11px] track uppercase font-semibold text-${a}`}
                    style={{ color: "#C7CEDC" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.emp.id} className="rowhover" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: T.ink }}>{r.emp.name}</div>
                    <div className="text-[11px] num" style={{ color: T.slateSoft }}>
                      {r.emp.empId} · {r.rateLabel}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right num" style={{ color: T.slate }}>{r.count}</td>
                  <td className="px-4 py-3 text-right num" style={{ color: T.ink }}>{money(r.gross)}</td>
                  <td className="px-4 py-3 text-right num" style={{ color: r.food ? T.red : T.slateSoft }}>{r.food ? "−" + money(r.food) : "—"}</td>
                  <td className="px-4 py-3 text-right num" style={{ color: r.advance ? T.red : T.slateSoft }}>{r.advance ? "−" + money(r.advance) : "—"}</td>
                  <td className="px-4 py-3 text-right num font-extrabold" style={{ color: T.ink }}>{money(r.net)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onPayslip(r.emp.id)}
                      className="text-[12px] font-semibold" style={{ color: T.amberDk }}>Slip</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: T.amberBg, borderTop: `2px solid ${T.amber}` }}>
                <td className="px-4 py-3 font-extrabold" style={{ color: T.ink }}>TOTAL</td>
                <td className="px-4 py-3 text-right num font-bold" style={{ color: T.ink }}>{totals.count}</td>
                <td className="px-4 py-3 text-right num font-bold" style={{ color: T.ink }}>{money(totals.gross)}</td>
                <td className="px-4 py-3 text-right num font-bold" style={{ color: T.red }}>−{money(totals.food)}</td>
                <td className="px-4 py-3 text-right num font-bold" style={{ color: T.red }}>−{money(totals.advance)}</td>
                <td className="px-4 py-3 text-right num font-extrabold" style={{ color: T.amberDk }}>{money(totals.net)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p className="text-[12px]" style={{ color: T.slateSoft }}>
        Net Payable = Gross Salary − Food Money − Advance
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Payslip                                                            */
/* ------------------------------------------------------------------ */
function Payslip({ data, month, firm, onClose }) {
  if (!data) return null;
  const { emp, trips, count, gross, food, advance, net } = data;
  const line = (label, value, color, strong) => (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
      <span className="text-[13px]" style={{ color: T.slate }}>{label}</span>
      <span className={`num text-[14px] ${strong ? "font-bold" : "font-medium"}`} style={{ color: color || T.ink }}>{value}</span>
    </div>
  );

  return (
    <Modal onClose={onClose} title="Payslip" wide>
      {firm && (
        <div className="mb-4 pb-3" style={{ borderBottom: `2px solid ${T.ink}` }}>
          <div className="text-base font-extrabold" style={{ color: T.ink }}>{firm.name}</div>
          <div className="text-[11px] num" style={{ color: T.slateSoft }}>
            {[firm.city, firm.phone].filter(Boolean).join(" · ")}
          </div>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-lg font-extrabold" style={{ color: T.ink }}>{emp.name}</div>
          <div className="text-[12px] num" style={{ color: T.slateSoft }}>
            {emp.empId} · {emp.designation}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] track uppercase font-semibold" style={{ color: T.slateSoft }}>Period</div>
          <div className="text-[13px] font-semibold" style={{ color: T.ink }}>{monthLabel(month)}</div>
        </div>
      </div>

      <div className="rounded-lg mb-4" style={{ background: T.paper, border: `1px solid ${T.line}` }}>
        <div className="px-4">
          {line(`Trips completed`, `${count} trips`, T.ink)}
          {line("Gross trip salary", money(gross), T.ink, true)}
          {line("Food money", "− " + money(food), T.red)}
          {line("Advance recovered", "− " + money(advance), T.red)}
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 rounded-b-lg" style={{ background: T.ink }}>
          <span className="text-[12px] track uppercase font-semibold" style={{ color: "#C7CEDC" }}>Net payable</span>
          <span className="num text-xl font-extrabold" style={{ color: T.amber }}>{money(net)}</span>
        </div>
      </div>

      <div className="text-[11px] track uppercase font-semibold mb-2" style={{ color: T.slateSoft }}>
        Trip breakdown
      </div>
      <div className="overflow-y-auto rounded-lg" style={{ border: `1px solid ${T.line}`, maxHeight: 208 }}>
        <table className="w-full text-[13px]">
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                <td className="px-3 py-2 num" style={{ color: T.slate }}>{t.date.slice(8)}/{t.date.slice(5, 7)}</td>
                <td className="px-3 py-2 num" style={{ color: T.slate }}>{t.trainNo}</td>
                <td className="px-3 py-2" style={{ color: T.slate }}>{t.route}</td>
                <td className="px-3 py-2 num text-right font-semibold" style={{ color: T.ink }}>{money(t.rate || emp.perTrip)}</td>
                <td className="px-3 py-2 num text-right" style={{ color: T.red }}>{t.food ? "−" + money(t.food) : ""}</td>
                <td className="px-3 py-2 num text-right" style={{ color: T.red }}>{t.advance ? "−" + money(t.advance) : ""}</td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-5 text-center" style={{ color: T.slateSoft }}>No trips this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <button onClick={onClose} className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold text-white"
        style={{ background: T.ink }}>Close</button>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal shell                                                        */
/* ------------------------------------------------------------------ */
function Modal({ children, onClose, title, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(22,35,63,.45)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "sm:max-w-lg" : "sm:max-w-md"} rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto`}
        style={{ background: T.card }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold" style={{ color: T.ink }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: T.slate }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
