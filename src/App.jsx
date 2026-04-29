
import React, { useMemo, useState } from "react";
import { Calculator, FileText, Percent, User, Save, Mail, MessageCircle, Download, Wrench, BadgeDollarSign } from "lucide-react";
import { jsPDF } from "jspdf";

const DEFAULT_LENDERS = {
  VWFS: { name: "VWFS", originationFee: 1595, establishmentFee: 590, ppsr: 0, monthlyAccountFee: 0 },
  PEPPER: { name: "Pepper", originationFee: 1990, establishmentFee: 490, ppsr: 8, monthlyAccountFee: 8.90 },
  ANGLE_COMM: { name: "Angle Commercial", originationFee: 1595, establishmentFee: 599, ppsr: 6, monthlyAccountFee: 20 },
  ANGLE_CON: { name: "Angle Consumer", originationFee: 1395, establishmentFee: 499, ppsr: 6, monthlyAccountFee: 15 },
  TAURUS: { name: "Taurus", originationFee: 1490, establishmentFee: 490, ppsr: 6, monthlyAccountFee: 11 },
  ALLIED: { name: "Allied", originationFee: 1495, establishmentFee: 595, ppsr: 9.95, monthlyAccountFee: 12.95 },
  NFS: { name: "NFS", originationFee: 1490, establishmentFee: 490, ppsr: 6, monthlyAccountFee: 11 },
};

const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });
const money = (v) => Number.isFinite(v) ? aud.format(v) : "$0.00";
const num = (v) => Number(String(v).replace(/[^0-9.-]/g, "")) || 0;

function pmt({ amount, ratePA, months, balloon }) {
  const r = ratePA / 100 / 12;
  if (!months) return 0;
  if (!r) return (amount - balloon) / months;
  const balloonPV = balloon / Math.pow(1 + r, months);
  return ((amount - balloonPV) * r) / (1 - Math.pow(1 + r, -months));
}

function loadSaved() {
  try { return JSON.parse(localStorage.getItem("cavaloDesktopQuotes") || "[]"); } catch { return []; }
}

export default function App() {
  const [lenderKey, setLenderKey] = useState("VWFS");
  const [lenders, setLenders] = useState(DEFAULT_LENDERS);
  const [quotes, setQuotes] = useState(loadSaved());

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [stockNo, setStockNo] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("132940");
  const [deposit, setDeposit] = useState("0");
  const [trade, setTrade] = useState("15000");
  const [payout, setPayout] = useState("0");

  const [rate, setRate] = useState("7.49");
  const [term, setTerm] = useState("60");
  const [balloon, setBalloon] = useState("65000");

  const [commissionFlat, setCommissionFlat] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("0");

  const lender = lenders[lenderKey];

  const calc = useMemo(() => {
    const price = num(purchasePrice), dep = num(deposit), tr = num(trade), pay = num(payout);
    const months = num(term), balloonAmt = num(balloon), ratePA = num(rate);
    const fees = num(lender.originationFee) + num(lender.establishmentFee) + num(lender.ppsr);
    const equity = dep + tr - pay;
    const subtotal = Math.max(price - equity, 0);
    const naf = subtotal + fees;
    const baseMonthly = pmt({ amount: naf, ratePA, months, balloon: balloonAmt });
    const monthly = baseMonthly + num(lender.monthlyAccountFee);
    const total = monthly * months + balloonAmt;
    const commission = num(commissionFlat) + (naf * num(commissionPercent) / 100);
    const lvr = price ? (naf / price) * 100 : 0;
    const balloonPct = price ? (balloonAmt / price) * 100 : 0;
    return { price, dep, tr, pay, equity, subtotal, fees, naf, months, balloonAmt, ratePA, monthly, total, interest: total - naf, weekly: monthly * 12 / 52, fortnightly: monthly * 12 / 26, commission, lvr, balloonPct };
  }, [purchasePrice, deposit, trade, payout, term, balloon, rate, lender, commissionFlat, commissionPercent]);

  function updateFee(field, value) {
    setLenders(prev => ({ ...prev, [lenderKey]: { ...prev[lenderKey], [field]: value } }));
  }

  function saveQuote() {
    const quote = { id: Date.now(), created: new Date().toLocaleString(), clientName, clientPhone, vehicle, stockNo, lenderKey, purchasePrice, deposit, trade, payout, rate, term, balloon, lenders, commissionFlat, commissionPercent };
    const next = [quote, ...quotes].slice(0, 50);
    setQuotes(next);
    localStorage.setItem("cavaloDesktopQuotes", JSON.stringify(next));
  }

  function loadQuote(q) {
    setClientName(q.clientName || ""); setClientPhone(q.clientPhone || ""); setVehicle(q.vehicle || ""); setStockNo(q.stockNo || "");
    setLenderKey(q.lenderKey || "VWFS"); setPurchasePrice(q.purchasePrice); setDeposit(q.deposit); setTrade(q.trade); setPayout(q.payout);
    setRate(q.rate); setTerm(q.term); setBalloon(q.balloon); setLenders(q.lenders || DEFAULT_LENDERS);
    setCommissionFlat(q.commissionFlat || "0"); setCommissionPercent(q.commissionPercent || "0");
  }

  const quoteText = `Cavalo Prestige Finance Estimate
Client: ${clientName || "Client"}
Vehicle: ${vehicle || "Vehicle"}
Lender: ${lender.name}
Purchase Price: ${money(calc.price)}
Amount Financed: ${money(calc.naf)}
Rate: ${calc.ratePA.toFixed(2)}%
Term: ${calc.months} months
Balloon: ${money(calc.balloonAmt)} (${calc.balloonPct.toFixed(2)}%)
Estimated Monthly: ${money(calc.monthly)}
Weekly: ${money(calc.weekly)}
Fortnightly: ${money(calc.fortnightly)}
Estimate only. Subject to approval.`;

  function pdf() {
    const doc = new jsPDF();
    doc.setFillColor(0,0,0); doc.rect(0,0,210,297,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(25); doc.text("CAVALO",105,22,{align:"center"});
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.text("PRESTIGE",105,30,{align:"center"});
    doc.setDrawColor(65,191,40); doc.line(20,38,190,38);
    doc.setFontSize(28); doc.text(money(calc.monthly),105,58,{align:"center"});
    doc.setFontSize(10); doc.setTextColor(170,170,170); doc.text("estimated monthly repayment",105,66,{align:"center"});
    const rows = [
      ["Client", clientName || "-"], ["Phone", clientPhone || "-"], ["Vehicle", vehicle || "-"], ["Stock", stockNo || "-"],
      ["Lender", lender.name], ["Purchase Price", money(calc.price)], ["Deposit", money(calc.dep)], ["Trade", money(calc.tr)],
      ["Payout", money(calc.pay)], ["Amount Financed", money(calc.naf)], ["Rate", `${calc.ratePA.toFixed(2)}%`],
      ["Term", `${calc.months} months`], ["Balloon", `${money(calc.balloonAmt)} (${calc.balloonPct.toFixed(2)}%)`],
      ["Monthly Repayment", money(calc.monthly)]
    ];
    let y = 82; doc.setFontSize(10);
    rows.forEach(([a,b]) => { doc.setTextColor(145,145,145); doc.text(a,22,y); doc.setTextColor(255,255,255); doc.text(String(b),188,y,{align:"right"}); doc.setDrawColor(35,35,35); doc.line(22,y+4,188,y+4); y += 9; });
    doc.save("cavalo-finance-quote.pdf");
  }

  const ruleFlags = [];
  if (calc.lvr > 115) ruleFlags.push("High LVR — review deposit/trade structure.");
  if (calc.balloonPct > 60) ruleFlags.push("Balloon above 60% placeholder policy.");
  if (calc.months > 84) ruleFlags.push("Term above 84 months placeholder policy.");
  if (!ruleFlags.length) ruleFlags.push("Placeholder rules check passed.");

  return (
    <div className="desktop">
      <header className="top">
        <div>
          <h1>CAVALO</h1>
          <p><span />PRESTIGE<span /></p>
        </div>
        <div className="top-actions">
          <button onClick={saveQuote}><Save size={17}/>Save Quote</button>
          <button onClick={pdf}><Download size={17}/>PDF</button>
          <a href={`sms:${clientPhone}?&body=${encodeURIComponent(quoteText)}`}><MessageCircle size={17}/>SMS</a>
          <a href={`mailto:?subject=${encodeURIComponent("Cavalo Finance Quote")}&body=${encodeURIComponent(quoteText)}`}><Mail size={17}/>Email</a>
        </div>
      </header>

      <main className="layout">
        <section className="left">
          <div className="hero">
            <Calculator size={32}/>
            <p>FINANCE CALCULATOR</p>
            <h2>{money(calc.monthly)}</h2>
            <span>estimated monthly repayment</span>
          </div>

          <div className="summary-grid">
            <Metric label="Weekly" value={money(calc.weekly)} />
            <Metric label="Fortnightly" value={money(calc.fortnightly)} />
            <Metric label="Amount Financed" value={money(calc.naf)} />
            <Metric label="Commission Est." value={money(calc.commission)} />
          </div>

          <Panel title="Saved Quotes" icon={<Save />}>
            <div className="saved-list">
              {quotes.length ? quotes.map(q => (
                <button key={q.id} onClick={() => loadQuote(q)}>
                  <b>{q.clientName || "Unnamed Client"}</b>
                  <span>{q.vehicle || q.created} · {DEFAULT_LENDERS[q.lenderKey]?.name}</span>
                </button>
              )) : <p className="muted">No saved quotes yet.</p>}
            </div>
          </Panel>
        </section>

        <section className="right">
          <Panel title="Client Profile" icon={<User />}>
            <div className="grid4">
              <Field label="Client Name" value={clientName} setValue={setClientName}/>
              <Field label="Phone" value={clientPhone} setValue={setClientPhone}/>
              <Field label="Vehicle" value={vehicle} setValue={setVehicle}/>
              <Field label="Stock / Ref" value={stockNo} setValue={setStockNo}/>
            </div>
          </Panel>

          <Panel title="Lender Selection" icon={<FileText />}>
            <div className="lender-row">
              <label>
                <span>Lender</span>
                <select value={lenderKey} onChange={(e)=>setLenderKey(e.target.value)}>
                  {Object.entries(lenders).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
                </select>
              </label>
              <Metric label="Total Capitalised Fees" value={money(calc.fees)} />
              <Metric label="Monthly Account Fee" value={money(num(lender.monthlyAccountFee))} />
            </div>
          </Panel>

          <div className="two-col">
            <Panel title="Purchase Details" icon={<FileText />}>
              <div className="grid2">
                <Field label="Purchase Price" value={purchasePrice} setValue={setPurchasePrice} prefix="$"/>
                <Field label="Cash Deposit" value={deposit} setValue={setDeposit} prefix="$"/>
                <Field label="Trade Allowance" value={trade} setValue={setTrade} prefix="$"/>
                <Field label="Existing Payout" value={payout} setValue={setPayout} prefix="$"/>
              </div>
              <Rows rows={[["Total Equity", money(calc.equity)], ["Subtotal", money(calc.subtotal)], ["LVR", `${calc.lvr.toFixed(2)}%`]]}/>
            </Panel>

            <Panel title="Lender Fees" icon={<Percent />}>
              <div className="grid2">
                <Field label="Origination" value={lender.originationFee} setValue={(v)=>updateFee("originationFee", v)} prefix="$"/>
                <Field label="Establishment" value={lender.establishmentFee} setValue={(v)=>updateFee("establishmentFee", v)} prefix="$"/>
                <Field label="PPSR" value={lender.ppsr} setValue={(v)=>updateFee("ppsr", v)} prefix="$"/>
                <Field label="Monthly Fee" value={lender.monthlyAccountFee} setValue={(v)=>updateFee("monthlyAccountFee", v)} prefix="$"/>
              </div>
            </Panel>
          </div>

          <div className="two-col">
            <Panel title="Repayment Summary" icon={<Calculator />}>
              <div className="grid2">
                <Field label="Rate" value={rate} setValue={setRate} suffix="%"/>
                <Field label="Term" value={term} setValue={setTerm} suffix="months"/>
                <Field label="Balloon" value={balloon} setValue={setBalloon} prefix="$"/>
                <Field label="Commission %" value={commissionPercent} setValue={setCommissionPercent} suffix="%"/>
              </div>
              <Rows rows={[
                ["Balloon %", `${calc.balloonPct.toFixed(2)}%`],
                ["Total Payable", money(calc.total)],
                ["Interest Component", money(calc.interest)]
              ]}/>
            </Panel>

            <Panel title="Rules / Deal Structuring" icon={<Wrench />}>
              <div className="rules">
                {ruleFlags.map((r, i) => <p key={i}>{r}</p>)}
                <p><BadgeDollarSign size={16}/> Deal structuring placeholder: future target payment solver, lender policy caps and approval rules.</p>
              </div>
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return <section className="panel"><div className="panel-head">{React.cloneElement(icon,{size:19})}<h3>{title}</h3></div>{children}</section>;
}
function Field({ label, value, setValue, prefix, suffix }) {
  return <label className="field"><span>{label}</span><div>{prefix && <em>{prefix}</em>}<input value={value} onChange={(e)=>setValue(e.target.value)} />{suffix && <em>{suffix}</em>}</div></label>;
}
function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><b>{value}</b></div>;
}
function Rows({ rows }) {
  return <div className="rows">{rows.map(([a,b]) => <div key={a}><span>{a}</span><b>{b}</b></div>)}</div>;
}
