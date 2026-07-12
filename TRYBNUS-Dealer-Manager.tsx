import { useState, useEffect, useRef, useMemo } from "react";

/* ============ TRYBNUS Dealer Manager ============
   Design: "window sticker" system — every unit is a
   buyer's-guide style tag. Ink navy + gold on paper.
=================================================== */

const C = {
  ink: "#16233B",
  inkSoft: "#2A3A57",
  paper: "#F5F3ED",
  card: "#FFFFFF",
  gold: "#C9A227",
  goldSoft: "#F0E4BC",
  green: "#2E7D32",
  red: "#B3402A",
  gray: "#6B7280",
  line: "#E3DFD4",
};

const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const disp = "'Arial Narrow', 'Helvetica Neue Condensed', Impact, system-ui, sans-serif";

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const fmt$ = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};
const daysBetween = (a, b) => {
  if (!a) return 0;
  const d = Math.round((new Date(b || today()) - new Date(a)) / 86400000);
  return isNaN(d) ? 0 : Math.max(d, 0);
};
const monthKey = (dateStr) => (dateStr || "").slice(0, 7);
const monthLabel = (key) => {
  if (!key) return "";
  const [y, m] = key.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
};

const reconOf = (v) =>
  (Number(v.recon) || 0) + (v.serviceLog || []).reduce((s, i) => s + (Number(i.cost) || 0), 0);

const emptyData = { vehicles: [], customers: [], expenses: [] };

/* ---------- shared UI ---------- */

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{
        display: "block", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
        color: C.gray, marginBottom: 4, fontWeight: 700,
      }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px", fontSize: 16, border: `1.5px solid ${C.line}`,
  borderRadius: 8, background: "#FDFCFA", color: C.ink, outline: "none", boxSizing: "border-box",
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function Btn({ kind = "primary", children, style, ...rest }) {
  const base = {
    padding: "12px 16px", fontSize: 14, fontWeight: 800, borderRadius: 8,
    border: "none", cursor: "pointer", letterSpacing: "0.03em",
  };
  const kinds = {
    primary: { background: C.ink, color: C.goldSoft },
    gold: { background: C.gold, color: C.ink },
    ghost: { background: "transparent", color: C.ink, border: `1.5px solid ${C.line}` },
    danger: { background: "transparent", color: C.red, border: `1.5px solid ${C.red}` },
  };
  return <button {...rest} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(22,35,59,0.55)", zIndex: 50,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.paper, width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
        borderRadius: "16px 16px 0 0", padding: "18px 18px 28px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontFamily: disp, fontSize: 22, margin: 0, color: C.ink, textTransform: "uppercase", letterSpacing: "0.02em" }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{
            border: "none", background: "transparent", fontSize: 26, color: C.gray, cursor: "pointer", lineHeight: 1,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
      padding: "12px 12px 10px", flex: "1 1 40%", minWidth: 130,
    }}>
      <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: accent || C.ink }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: C.gray, marginTop: 2, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function EmptyState({ line1, line2 }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: C.gray }}>
      <div style={{ fontFamily: disp, fontSize: 20, textTransform: "uppercase", color: C.inkSoft }}>{line1}</div>
      <div style={{ fontSize: 14, marginTop: 6 }}>{line2}</div>
    </div>
  );
}

/* ---------- vehicle sticker card ---------- */

function VehicleCard({ v, onEdit, onSell, onDelete, onService, customerName }) {
  const isSold = v.status === "Sold";
  const invested = (Number(v.buyPrice) || 0) + reconOf(v);
  const profit = isSold ? (Number(v.salePrice) || 0) - invested : null;
  const days = isSold ? daysBetween(v.buyDate, v.soldDate) : daysBetween(v.buyDate, today());
  const stripe = isSold ? C.green : v.status === "In Recon" ? C.inkSoft : C.gold;
  const stripeText = isSold ? "#EAF4EA" : v.status === "In Recon" ? C.goldSoft : C.ink;

  return (
    <div style={{
      background: C.card, borderRadius: 12, overflow: "hidden",
      border: `1px solid ${C.line}`, boxShadow: "0 1px 2px rgba(22,35,59,0.06)", marginBottom: 12,
    }}>
      <div style={{
        background: stripe, color: stripeText, padding: "6px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
      }}>
        <span>{v.status}</span>
        <span style={{ fontFamily: mono, letterSpacing: 0 }}>{days} days {isSold ? "held" : "on lot"}</span>
      </div>

      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontFamily: disp, fontSize: 24, fontWeight: 700, color: C.ink, textTransform: "uppercase", lineHeight: 1.05 }}>
          {v.year} {v.make} {v.model}
        </div>
        {v.vin ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: C.gray, marginTop: 3, letterSpacing: "0.05em" }}>VIN {v.vin}</div>
        ) : null}

        <div style={{
          display: "flex", gap: 0, marginTop: 12, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden",
        }}>
          {[
            ["Bought", fmt$(v.buyPrice)],
            ["Recon", fmt$(reconOf(v))],
            isSold ? ["Sold for", fmt$(v.salePrice)] : ["Asking", fmt$(v.asking)],
          ].map(([l, val], i) => (
            <div key={l} style={{
              flex: 1, padding: "8px 6px", textAlign: "center",
              borderLeft: i ? `1px solid ${C.line}` : "none", background: "#FBFAF6",
            }}>
              <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.ink }}>{val}</div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: C.gray, fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>

        {isSold && (
          <div style={{
            marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center",
            background: profit >= 0 ? "#EEF6EE" : "#FBEDEA", borderRadius: 8, padding: "8px 12px",
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: profit >= 0 ? C.green : C.red }}>
              {profit >= 0 ? "Profit" : "Loss"}{customerName ? ` · ${customerName}` : ""}
            </span>
            <span style={{ fontFamily: mono, fontSize: 18, fontWeight: 800, color: profit >= 0 ? C.green : C.red }}>
              {fmt$(profit)}
            </span>
          </div>
        )}

        {v.notes ? <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 10 }}>{v.notes}</div> : null}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!isSold && <Btn kind="gold" style={{ flex: 1 }} onClick={() => onSell(v)}>Mark sold</Btn>}
          <Btn kind="ghost" style={{ flex: 1 }} onClick={() => onService(v)}>
            Service{(v.serviceLog || []).length ? ` (${v.serviceLog.length})` : ""}
          </Btn>
          <Btn kind="ghost" style={{ flex: 1 }} onClick={() => onEdit(v)}>Edit</Btn>
          <Btn kind="danger" onClick={() => onDelete(v)}>×</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- forms ---------- */

function VehicleForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    year: "", make: "", model: "", vin: "", buyPrice: "", recon: "", asking: "",
    buyDate: today(), status: "In Recon", notes: "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.make && f.model && f.buyPrice !== "";
  return (
    <Sheet title={initial ? "Edit unit" : "Add unit"} onClose={onClose}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Year"><TextInput inputMode="numeric" value={f.year} onChange={set("year")} placeholder="2015" /></Field></div>
        <div style={{ flex: 2 }}><Field label="Make"><TextInput value={f.make} onChange={set("make")} placeholder="Chevrolet" /></Field></div>
      </div>
      <Field label="Model"><TextInput value={f.model} onChange={set("model")} placeholder="Malibu LT" /></Field>
      <Field label="VIN (optional)"><TextInput value={f.vin} onChange={set("vin")} style={{ fontFamily: mono }} placeholder="1G1ZD5ST..." /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Buy price"><TextInput inputMode="decimal" value={f.buyPrice} onChange={set("buyPrice")} placeholder="4500" /></Field></div>
        <div style={{ flex: 1 }}><Field label="Recon (base)"><TextInput inputMode="decimal" value={f.recon} onChange={set("recon")} placeholder="0" /></Field></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Asking price"><TextInput inputMode="decimal" value={f.asking} onChange={set("asking")} placeholder="7200" /></Field></div>
        <div style={{ flex: 1 }}><Field label="Purchase date"><TextInput type="date" value={f.buyDate} onChange={set("buyDate")} /></Field></div>
      </div>
      <Field label="Status">
        <div style={{ display: "flex", gap: 8 }}>
          {["In Recon", "For Sale"].map((s) => (
            <button key={s} onClick={() => setF({ ...f, status: s })} style={{
              flex: 1, padding: "10px 8px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer",
              border: `1.5px solid ${f.status === s ? C.ink : C.line}`,
              background: f.status === s ? C.ink : "#FDFCFA",
              color: f.status === s ? C.goldSoft : C.inkSoft,
            }}>{s}</button>
          ))}
        </div>
      </Field>
      <Field label="Notes"><TextInput value={f.notes} onChange={set("notes")} placeholder="Needs tires · title in hand" /></Field>
      <Btn kind="primary" style={{ width: "100%", marginTop: 6, opacity: ok ? 1 : 0.4 }} disabled={!ok}
        onClick={() => onSave({ ...f, id: initial?.id || uid() })}>
        {initial ? "Save changes" : "Add to lot"}
      </Btn>
    </Sheet>
  );
}

function SellForm({ vehicle, customers, onSave, onClose }) {
  const [f, setF] = useState({ salePrice: vehicle.asking || "", soldDate: today(), customerId: "", newCustomer: "" });
  const ok = f.salePrice !== "";
  return (
    <Sheet title={`Sell ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Sale price"><TextInput inputMode="decimal" value={f.salePrice} onChange={(e) => setF({ ...f, salePrice: e.target.value })} /></Field></div>
        <div style={{ flex: 1 }}><Field label="Sale date"><TextInput type="date" value={f.soldDate} onChange={(e) => setF({ ...f, soldDate: e.target.value })} /></Field></div>
      </div>
      <Field label="Buyer (existing customer)">
        <select value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value, newCustomer: "" })} style={inputStyle}>
          <option value="">— none —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Or add new buyer name">
        <TextInput value={f.newCustomer} onChange={(e) => setF({ ...f, newCustomer: e.target.value, customerId: "" })} placeholder="Buyer name" />
      </Field>
      <Btn kind="gold" style={{ width: "100%", marginTop: 6, opacity: ok ? 1 : 0.4 }} disabled={!ok} onClick={() => onSave(f)}>
        Record sale
      </Btn>
    </Sheet>
  );
}

function ServiceSheet({ vehicle, onAdd, onRemove, onClose }) {
  const [f, setF] = useState({ date: today(), desc: "", cost: "" });
  const log = (vehicle.serviceLog || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const total = reconOf(vehicle);
  const ok = f.desc.trim() && f.cost !== "";
  return (
    <Sheet title={`Service log — ${vehicle.year} ${vehicle.make} ${vehicle.model}`} onClose={onClose}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: C.ink, borderRadius: 10, padding: "10px 14px", marginBottom: 14,
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B9C4D8" }}>
          Total recon
        </span>
        <span style={{ fontFamily: mono, fontWeight: 800, fontSize: 18, color: C.goldSoft }}>{fmt$(total)}</span>
      </div>

      {Number(vehicle.recon) > 0 && (
        <div style={{ fontSize: 12, color: C.gray, marginBottom: 10 }}>
          Includes {fmt$(vehicle.recon)} base recon from the unit form.
        </div>
      )}

      {log.map((item) => (
        <div key={item.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{item.desc}</div>
            <div style={{ fontSize: 12, color: C.gray, fontFamily: mono }}>{item.date}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: mono, fontWeight: 800, color: C.ink }}>{fmt$(item.cost)}</span>
            <button onClick={() => onRemove(item)} aria-label="Delete service item" style={{
              border: "none", background: "transparent", color: C.gray, fontSize: 18, cursor: "pointer",
            }}>×</button>
          </div>
        </div>
      ))}
      {log.length === 0 && (
        <div style={{ textAlign: "center", color: C.gray, fontSize: 13, padding: "12px 0 16px" }}>
          No repairs logged yet. Every part and fix you add rolls into recon automatically.
        </div>
      )}

      <div style={{ borderTop: `1.5px solid ${C.line}`, marginTop: 6, paddingTop: 14 }}>
        <Field label="Repair / part"><TextInput value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="Front brake pads and rotors" /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Cost"><TextInput inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} placeholder="180" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Date"><TextInput type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
        </div>
        <Btn kind="gold" style={{ width: "100%", opacity: ok ? 1 : 0.4 }} disabled={!ok}
          onClick={() => { onAdd({ ...f, id: uid() }); setF({ date: today(), desc: "", cost: "" }); }}>
          Add to log
        </Btn>
      </div>
    </Sheet>
  );
}

function CustomerForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || { name: "", phone: "", email: "", followUp: "", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim().length > 0;
  return (
    <Sheet title={initial ? "Edit customer" : "Add customer"} onClose={onClose}>
      <Field label="Name"><TextInput value={f.name} onChange={set("name")} placeholder="Full name" /></Field>
      <Field label="Phone"><TextInput inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="314-555-0123" /></Field>
      <Field label="Email"><TextInput inputMode="email" value={f.email} onChange={set("email")} placeholder="name@email.com" /></Field>
      <Field label="Follow-up date"><TextInput type="date" value={f.followUp} onChange={set("followUp")} /></Field>
      <Field label="Notes"><TextInput value={f.notes} onChange={set("notes")} placeholder="Looking for a truck under $8k" /></Field>
      <Btn kind="primary" style={{ width: "100%", marginTop: 6, opacity: ok ? 1 : 0.4 }} disabled={!ok}
        onClick={() => onSave({ ...f, id: initial?.id || uid() })}>
        {initial ? "Save changes" : "Add customer"}
      </Btn>
    </Sheet>
  );
}

function ExpenseForm({ onSave, onClose }) {
  const [f, setF] = useState({ date: today(), category: "Lot & property", amount: "", note: "" });
  const cats = ["Lot & property", "Insurance", "Auction fees", "Parts & recon", "Fuel & transport", "Marketing", "Licenses & bonds", "Other"];
  const ok = f.amount !== "";
  return (
    <Sheet title="Add expense" onClose={onClose}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Amount"><TextInput inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="150" /></Field></div>
        <div style={{ flex: 1 }}><Field label="Date"><TextInput type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
      </div>
      <Field label="Category">
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} style={inputStyle}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Note"><TextInput value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Gate lock and chain" /></Field>
      <Btn kind="primary" style={{ width: "100%", marginTop: 6, opacity: ok ? 1 : 0.4 }} disabled={!ok}
        onClick={() => onSave({ ...f, id: uid() })}>
        Add expense
      </Btn>
    </Sheet>
  );
}

/* ---------- main app ---------- */

export default function App() {
  const [data, setData] = useState(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("lot");
  const [modal, setModal] = useState(null); // {type, payload}
  const [lotFilter, setLotFilter] = useState("active");
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("trybnus-dealer-data");
        if (r && r.value) setData({ ...emptyData, ...JSON.parse(r.value) });
      } catch (e) { /* first run — no data yet */ }
      setLoaded(true);
    })();
  }, []);

  const persist = (next) => {
    setData(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await window.storage.set("trybnus-dealer-data", JSON.stringify(next)); }
      catch (e) { console.error("Save failed", e); }
    }, 400);
  };

  const custName = (id) => data.customers.find((c) => c.id === id)?.name || "";

  /* derived */
  const active = data.vehicles.filter((v) => v.status !== "Sold");
  const sold = data.vehicles.filter((v) => v.status === "Sold")
    .sort((a, b) => (b.soldDate || "").localeCompare(a.soldDate || ""));
  const stats = useMemo(() => {
    const inv = active.reduce((s, v) => s + (Number(v.buyPrice) || 0) + reconOf(v), 0);
    const revenue = sold.reduce((s, v) => s + (Number(v.salePrice) || 0), 0);
    const cogs = sold.reduce((s, v) => s + (Number(v.buyPrice) || 0) + reconOf(v), 0);
    const gross = revenue - cogs;
    const expenses = data.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const avgDays = sold.length ? Math.round(sold.reduce((s, v) => s + daysBetween(v.buyDate, v.soldDate), 0) / sold.length) : 0;
    const mk = monthKey(today());
    const moGross = sold.filter((v) => monthKey(v.soldDate) === mk)
      .reduce((s, v) => s + (Number(v.salePrice) || 0) - (Number(v.buyPrice) || 0) - reconOf(v), 0);
    const moExp = data.expenses.filter((e) => monthKey(e.date) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return { inv, revenue, cogs, gross, expenses, avgDays, net: gross - expenses, moGross, moExp };
  }, [data]);

  const overdue = data.customers.filter((c) => c.followUp && c.followUp <= today());

  /* actions */
  const saveVehicle = (v) => {
    const exists = data.vehicles.some((x) => x.id === v.id);
    persist({ ...data, vehicles: exists ? data.vehicles.map((x) => (x.id === v.id ? { ...x, ...v } : x)) : [v, ...data.vehicles] });
    setModal(null);
  };
  const recordSale = (v, f) => {
    let customers = data.customers;
    let customerId = f.customerId;
    if (!customerId && f.newCustomer.trim()) {
      customerId = uid();
      customers = [{ id: customerId, name: f.newCustomer.trim(), phone: "", email: "", followUp: "", notes: "Buyer" }, ...customers];
    }
    const vehicles = data.vehicles.map((x) => x.id === v.id
      ? { ...x, status: "Sold", salePrice: f.salePrice, soldDate: f.soldDate, buyerId: customerId }
      : x);
    persist({ ...data, vehicles, customers });
    setModal(null);
  };
  const deleteVehicle = (v) => {
    if (!window.confirm(`Remove ${v.year} ${v.make} ${v.model}? This can't be undone.`)) return;
    persist({ ...data, vehicles: data.vehicles.filter((x) => x.id !== v.id) });
  };
  const saveCustomer = (c) => {
    const exists = data.customers.some((x) => x.id === c.id);
    persist({ ...data, customers: exists ? data.customers.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : [c, ...data.customers] });
    setModal(null);
  };
  const deleteCustomer = (c) => {
    if (!window.confirm(`Remove ${c.name}?`)) return;
    persist({ ...data, customers: data.customers.filter((x) => x.id !== c.id) });
  };
  const addServiceItem = (vehicleId, item) => {
    persist({
      ...data,
      vehicles: data.vehicles.map((x) => x.id === vehicleId
        ? { ...x, serviceLog: [...(x.serviceLog || []), item] } : x),
    });
  };
  const removeServiceItem = (vehicleId, item) => {
    persist({
      ...data,
      vehicles: data.vehicles.map((x) => x.id === vehicleId
        ? { ...x, serviceLog: (x.serviceLog || []).filter((i) => i.id !== item.id) } : x),
    });
  };
  const saveExpense = (e) => { persist({ ...data, expenses: [e, ...data.expenses] }); setModal(null); };
  const deleteExpense = (e) => persist({ ...data, expenses: data.expenses.filter((x) => x.id !== e.id) });

  const tabs = [
    ["lot", "Lot"],
    ["sales", "Sales"],
    ["people", "People"],
    ["money", "Money"],
  ];

  if (!loaded) {
    return <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: disp, fontSize: 20, color: C.ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>Loading the lot…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "system-ui, -apple-system, sans-serif", paddingBottom: 92 }}>
      {/* header */}
      <header style={{ background: C.ink, padding: "16px 16px 14px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontFamily: disp, fontSize: 26, fontWeight: 700, color: C.goldSoft, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
              TRYBNUS <span style={{ color: C.gold }}>AUTO</span>
            </div>
            <div style={{ fontSize: 10, color: "#8FA0BF", letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 3 }}>Dealer records · Page Blvd</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 800, color: stats.net >= 0 ? "#8FD694" : "#F0A090" }}>{fmt$(stats.net)}</div>
            <div style={{ fontSize: 9, color: "#8FA0BF", letterSpacing: "0.18em", textTransform: "uppercase" }}>Net all-time</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px" }}>

        {/* ============ LOT ============ */}
        {tab === "lot" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[["active", `On lot (${active.length})`], ["sold", `Sold (${sold.length})`]].map(([k, l]) => (
                <button key={k} onClick={() => setLotFilter(k)} style={{
                  flex: 1, padding: "9px 8px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer",
                  border: `1.5px solid ${lotFilter === k ? C.ink : C.line}`,
                  background: lotFilter === k ? C.ink : "transparent",
                  color: lotFilter === k ? C.goldSoft : C.inkSoft,
                }}>{l}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <StatTile label="Cash in inventory" value={fmt$(stats.inv)} />
              <StatTile label="Avg days to sell" value={stats.avgDays || "—"} />
            </div>

            {(lotFilter === "active" ? active : sold).map((v) => (
              <VehicleCard key={v.id} v={v} customerName={custName(v.buyerId)}
                onEdit={(x) => setModal({ type: "vehicle", payload: x })}
                onSell={(x) => setModal({ type: "sell", payload: x })}
                onService={(x) => setModal({ type: "service", payload: x.id })}
                onDelete={deleteVehicle} />
            ))}
            {(lotFilter === "active" ? active : sold).length === 0 && (
              <EmptyState line1={lotFilter === "active" ? "Lot is empty" : "No sales yet"}
                line2={lotFilter === "active" ? "Tap + Add unit to log your first vehicle." : "Mark a unit sold and it lands here."} />
            )}
            <Btn kind="gold" style={{ width: "100%", marginTop: 4 }} onClick={() => setModal({ type: "vehicle" })}>+ Add unit</Btn>
          </>
        )}

        {/* ============ SALES ============ */}
        {tab === "sales" && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <StatTile label="Units sold" value={sold.length} />
              <StatTile label="Revenue" value={fmt$(stats.revenue)} />
              <StatTile label="Gross profit" value={fmt$(stats.gross)} accent={stats.gross >= 0 ? C.green : C.red} />
              <StatTile label="Avg profit / unit" value={sold.length ? fmt$(stats.gross / sold.length) : "—"} />
            </div>

            {sold.length > 0 && (
              <>
                <h3 style={{ fontFamily: disp, textTransform: "uppercase", fontSize: 16, color: C.inkSoft, letterSpacing: "0.06em", margin: "18px 0 8px" }}>By month</h3>
                {Object.entries(sold.reduce((acc, v) => {
                  const k = monthKey(v.soldDate) || "unknown";
                  const p = (Number(v.salePrice) || 0) - (Number(v.buyPrice) || 0) - reconOf(v);
                  acc[k] = acc[k] || { units: 0, profit: 0 };
                  acc[k].units += 1; acc[k].profit += p;
                  return acc;
                }, {})).sort((a, b) => b[0].localeCompare(a[0])).map(([k, m]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8,
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, color: C.ink, fontSize: 14 }}>{monthLabel(k)}</div>
                      <div style={{ fontSize: 12, color: C.gray }}>{m.units} unit{m.units !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 17, color: m.profit >= 0 ? C.green : C.red }}>{fmt$(m.profit)}</div>
                  </div>
                ))}

                <h3 style={{ fontFamily: disp, textTransform: "uppercase", fontSize: 16, color: C.inkSoft, letterSpacing: "0.06em", margin: "18px 0 8px" }}>Every deal</h3>
                {sold.map((v) => {
                  const p = (Number(v.salePrice) || 0) - (Number(v.buyPrice) || 0) - reconOf(v);
                  return (
                    <div key={v.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: C.ink, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {v.year} {v.make} {v.model}
                        </div>
                        <div style={{ fontSize: 12, color: C.gray }}>
                          {v.soldDate} · {daysBetween(v.buyDate, v.soldDate)} days{v.buyerId ? ` · ${custName(v.buyerId)}` : ""}
                        </div>
                      </div>
                      <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 16, color: p >= 0 ? C.green : C.red, marginLeft: 10 }}>{fmt$(p)}</div>
                    </div>
                  );
                })}
              </>
            )}
            {sold.length === 0 && <EmptyState line1="No sales yet" line2="Your first flip will show up here with profit and days held." />}
          </>
        )}

        {/* ============ PEOPLE ============ */}
        {tab === "people" && (
          <>
            {overdue.length > 0 && (
              <div style={{
                background: C.goldSoft, border: `1.5px solid ${C.gold}`, borderRadius: 10,
                padding: "10px 14px", marginBottom: 14, fontSize: 13, fontWeight: 700, color: C.ink,
              }}>
                {overdue.length} follow-up{overdue.length !== 1 ? "s" : ""} due — call them today.
              </div>
            )}
            {data.customers.map((c) => {
              const due = c.followUp && c.followUp <= today();
              return (
                <div key={c.id} style={{
                  background: C.card, border: `1.5px solid ${due ? C.gold : C.line}`, borderRadius: 10,
                  padding: "12px 14px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>{c.name}</div>
                    {c.followUp && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: due ? C.red : C.gray, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {due ? "Follow up now" : `Follow up ${c.followUp}`}
                      </span>
                    )}
                  </div>
                  {(c.phone || c.email) && (
                    <div style={{ fontFamily: mono, fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
                      {c.phone}{c.phone && c.email ? " · " : ""}{c.email}
                    </div>
                  )}
                  {c.notes && <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6 }}>{c.notes}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {c.phone && <a href={`tel:${c.phone}`} style={{ flex: 1, textDecoration: "none" }}>
                      <Btn kind="gold" style={{ width: "100%" }}>Call</Btn>
                    </a>}
                    <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setModal({ type: "customer", payload: c })}>Edit</Btn>
                    <Btn kind="danger" onClick={() => deleteCustomer(c)}>Remove</Btn>
                  </div>
                </div>
              );
            })}
            {data.customers.length === 0 && <EmptyState line1="No customers yet" line2="Add leads, buyers, and storage customers here so no follow-up slips." />}
            <Btn kind="gold" style={{ width: "100%", marginTop: 4 }} onClick={() => setModal({ type: "customer" })}>+ Add customer</Btn>
          </>
        )}

        {/* ============ MONEY ============ */}
        {tab === "money" && (
          <>
            <div style={{
              background: C.ink, borderRadius: 12, padding: "16px 16px 14px", marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: "#8FA0BF", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Profit & loss — all time</div>
              {[
                ["Vehicle revenue", fmt$(stats.revenue), C.goldSoft],
                ["Cost of vehicles + recon", `−${fmt$(stats.cogs).replace("-", "")}`, "#8FA0BF"],
                ["Gross profit", fmt$(stats.gross), stats.gross >= 0 ? "#8FD694" : "#F0A090"],
                ["Operating expenses", `−${fmt$(stats.expenses).replace("-", "")}`, "#8FA0BF"],
              ].map(([l, v, col]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 14 }}>
                  <span style={{ color: "#B9C4D8" }}>{l}</span>
                  <span style={{ fontFamily: mono, fontWeight: 700, color: col }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.inkSoft}`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.goldSoft, fontWeight: 800, textTransform: "uppercase", fontSize: 13, letterSpacing: "0.08em" }}>Net</span>
                <span style={{ fontFamily: mono, fontWeight: 800, fontSize: 20, color: stats.net >= 0 ? "#8FD694" : "#F0A090" }}>{fmt$(stats.net)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <StatTile label="This month gross" value={fmt$(stats.moGross)} accent={stats.moGross >= 0 ? C.green : C.red} />
              <StatTile label="This month expenses" value={fmt$(stats.moExp)} accent={C.red} />
            </div>

            <h3 style={{ fontFamily: disp, textTransform: "uppercase", fontSize: 16, color: C.inkSoft, letterSpacing: "0.06em", margin: "6px 0 8px" }}>Expenses</h3>
            {data.expenses.map((e) => (
              <div key={e.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{e.category}{e.note ? ` — ${e.note}` : ""}</div>
                  <div style={{ fontSize: 12, color: C.gray, fontFamily: mono }}>{e.date}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: mono, fontWeight: 800, color: C.red }}>−{fmt$(e.amount).replace("-", "")}</span>
                  <button onClick={() => deleteExpense(e)} aria-label="Delete expense" style={{ border: "none", background: "transparent", color: C.gray, fontSize: 18, cursor: "pointer" }}>×</button>
                </div>
              </div>
            ))}
            {data.expenses.length === 0 && <EmptyState line1="No expenses logged" line2="Track insurance, auction fees, lot costs — clean books build your loan file." />}
            <Btn kind="gold" style={{ width: "100%", marginTop: 4 }} onClick={() => setModal({ type: "expense" })}>+ Add expense</Btn>
          </>
        )}
      </main>

      {/* bottom tab bar */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: C.ink,
        borderTop: `2px solid ${C.gold}`, display: "flex", zIndex: 40,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "14px 4px 12px", border: "none", cursor: "pointer",
            background: "transparent",
            color: tab === k ? C.gold : "#8FA0BF",
            fontFamily: disp, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
            borderTop: tab === k ? `3px solid ${C.gold}` : "3px solid transparent", marginTop: -2,
          }}>
            {l}
            {k === "people" && overdue.length > 0 && (
              <span style={{
                marginLeft: 5, background: C.gold, color: C.ink, borderRadius: 9, fontSize: 10,
                padding: "1px 6px", fontFamily: "system-ui", fontWeight: 800,
              }}>{overdue.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* modals */}
      {modal?.type === "vehicle" && <VehicleForm initial={modal.payload} onSave={saveVehicle} onClose={() => setModal(null)} />}
      {modal?.type === "sell" && <SellForm vehicle={modal.payload} customers={data.customers} onSave={(f) => recordSale(modal.payload, f)} onClose={() => setModal(null)} />}
      {modal?.type === "service" && (() => {
        const veh = data.vehicles.find((x) => x.id === modal.payload);
        return veh ? (
          <ServiceSheet vehicle={veh}
            onAdd={(item) => addServiceItem(veh.id, item)}
            onRemove={(item) => removeServiceItem(veh.id, item)}
            onClose={() => setModal(null)} />
        ) : null;
      })()}
      {modal?.type === "customer" && <CustomerForm initial={modal.payload} onSave={saveCustomer} onClose={() => setModal(null)} />}
      {modal?.type === "expense" && <ExpenseForm onSave={saveExpense} onClose={() => setModal(null)} />}
    </div>
  );
}
