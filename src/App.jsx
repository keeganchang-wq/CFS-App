
import React, { useMemo, useState } from "react";
import { Calculator, Car, FileText, Mail, MessageCircle, MoreHorizontal, Percent, Save, Search, User, Wrench, X, BadgeDollarSign } from "lucide-react";
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
  try { return JSON.parse(localStorage.getItem("cavaloQuotes") || "[]"); } catch { return []; }
}

export default function App() {
  const [lenderKey, setLenderKey] = useState("VWFS");
  const [lenders, setLenders] = useState(DEFAULT_LENDERS);
  const [tab, setTab] = useState("purchase");
  const [sheet, setSheet] = useState(null);
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
    return { price, dep, tr, pay, equity, subtotal, fees, naf, months, balloonAmt, ratePA, baseMonthly, monthly, total, interest: total - naf, weekly: monthly * 12 / 52, fortnightly: monthly * 12 / 26, commission, lvr, balloonPct };
  }, [purchasePrice, deposit, trade, payout, term, balloon, rate, lender, commissionFlat, commissionPercent]);

  const ruleFlags = useMemo(() => {
    const flags = [];
    if (calc.lvr > 115) flags.push({ type: "warn", text: "High LVR — review deposit/trade structure." });
    if (calc.balloonPct > 60) flags.push({ type: "warn", text: "Balloon above 60% placeholder policy." });
    if (calc.months > 84) flags.push({ type: "warn", text: "Term above 84 months placeholder policy." });
    if (!clientName) flags.push({ type: "note", text: "Client profile incomplete." });
    if (!flags.length) flags.push({ type: "ok", text: "Placeholder rules check passed." });
    return flags;
  }, [calc, clientName]);

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

  function updateFee(field, value) {
    setLenders(prev => ({ ...prev, [lenderKey]: { ...prev[lenderKey], [field]: value } }));
  }

  function saveQuote() {
    const quote = { id: Date.now(), created: new Date().toLocaleString(), clientName, clientPhone, vehicle, stockNo, lenderKey, purchasePrice, deposit, trade, payout, rate, term, balloon, lenders, commissionFlat, commissionPercent };
    const next = [quote, ...quotes].slice(0, 30);
    setQuotes(next);
    localStorage.setItem("cavaloQuotes", JSON.stringify(next));
    setSheet("saved");
  }

  function loadQuote(q) {
    setClientName(q.clientName || ""); setClientPhone(q.clientPhone || ""); setVehicle(q.vehicle || ""); setStockNo(q.stockNo || "");
    setLenderKey(q.lenderKey || "VWFS"); setPurchasePrice(q.purchasePrice); setDeposit(q.deposit); setTrade(q.trade); setPayout(q.payout);
    setRate(q.rate); setTerm(q.term); setBalloon(q.balloon); setLenders(q.lenders || DEFAULT_LENDERS);
    setCommissionFlat(q.commissionFlat || "0"); setCommissionPercent(q.commissionPercent || "0"); setSheet(null);
  }

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
      ["Payout", money(calc.pay)], ["Origination Fee", money(num(lender.originationFee))], ["Establishment Fee", money(num(lender.establishmentFee))],
      ["PPSR", money(num(lender.ppsr))], ["Monthly Account Fee", money(num(lender.monthlyAccountFee))],
      ["Amount Financed", money(calc.naf)], ["Rate", `${calc.ratePA.toFixed(2)}%`], ["Term", `${calc.months} months`],
      ["Balloon", `${money(calc.balloonAmt)} (${calc.balloonPct.toFixed(2)}%)`], ["Monthly Repayment", money(calc.monthly)]
    ];
    let y = 82; doc.setFontSize(10);
    rows.forEach(([a,b]) => { doc.setTextColor(145,145,145); doc.text(a,22,y); doc.setTextColor(255,255,255); doc.text(String(b),188,y,{align:"right"}); doc.setDrawColor(35,35,35); doc.line(22,y+4,188,y+4); y += 9; });
    doc.setTextColor(120,120,120); doc.setFontSize(8); doc.text("Estimate only. Subject to lender approval and final contract terms.",105,282,{align:"center"});
    doc.save("cavalo-finance-quote.pdf");
  }

  function shareQuote() {
    if (navigator.share) navigator.share({ title: "Cavalo Finance Quote", text: quoteText }).catch(()=>{});
    else { navigator.clipboard.writeText(quoteText); alert("Quote copied."); }
  }

  return (
    <div className="app">
      <div className="phone">
        <header className="top"><div><h1>CAVALO</h1><p><i/>PRESTIGE<i/></p></div></header>

        <main>
          <section className="hero">
            <Car size={28}/><p>FINANCE CALCULATOR</p><h2>{money(calc.monthly)}</h2><span>estimated monthly repayment</span>
          </section>

          <section className="client-strip" onClick={() => setSheet("client")}>
            <User size={18}/><div><b>{clientName || "Client Profile"}</b><span>{vehicle || "Tap to add client + vehicle"}</span></div>
          </section>

         <section className="lender-dropdown">
  <label className="dropdown-label">LENDER</label>

  <select
    value={lenderKey}
    onChange={(e) => setLenderKey(e.target.value)}
    className="dropdown"
  >
    {Object.entries(lenders).map(([key, val]) => (
      <option key={key} value={key}>
        {val.name}
      </option>
    ))}
  </select>
</section>

          <nav className="tabs">
            <button onClick={()=>setTab("purchase")} className={tab==="purchase"?"active":""}>Purchase</button>
            <button onClick={()=>setTab("fees")} className={tab==="fees"?"active":""}>Fees</button>
            <button onClick={()=>setTab("summary")} className={tab==="summary"?"active":""}>Summary</button>
          </nav>

          {tab === "purchase" && <Card title="Purchase Details" icon={<FileText/>}>
            <div className="grid2">
              <Field label="Purchase" value={purchasePrice} setValue={setPurchasePrice} prefix="$"/>
              <Field label="Deposit" value={deposit} setValue={setDeposit} prefix="$"/>
              <Field label="Trade" value={trade} setValue={setTrade} prefix="$"/>
              <Field label="Payout" value={payout} setValue={setPayout} prefix="$"/>
            </div>
            <MiniRows rows={[["Equity", money(calc.equity)], ["Subtotal", money(calc.subtotal)], ["LVR", `${calc.lvr.toFixed(2)}%`]]}/>
          </Card>}

          {tab === "fees" && <Card title="Lender Fees" icon={<Percent/>}>
            <div className="grid2">
              <Field label="Origination" value={lender.originationFee} setValue={(v)=>updateFee("originationFee", v)} prefix="$"/>
              <Field label="Establishment" value={lender.establishmentFee} setValue={(v)=>updateFee("establishmentFee", v)} prefix="$"/>
              <Field label="PPSR" value={lender.ppsr} setValue={(v)=>updateFee("ppsr", v)} prefix="$"/>
              <Field label="Monthly Fee" value={lender.monthlyAccountFee} setValue={(v)=>updateFee("monthlyAccountFee", v)} prefix="$"/>
            </div>
            <MiniRows rows={[["Total capitalised fees", money(calc.fees)], ["Monthly fee added", money(num(lender.monthlyAccountFee))]]}/>
          </Card>}

          {tab === "summary" && <Card title="Repayment Summary" icon={<Calculator/>}>
            <div className="grid2">
              <Field label="Rate" value={rate} setValue={setRate} suffix="%"/>
              <Field label="Term" value={term} setValue={setTerm} suffix="mths"/>
              <Field label="Balloon" value={balloon} setValue={setBalloon} prefix="$"/>
              <Field label="Comm %" value={commissionPercent} setValue={setCommissionPercent} suffix="%"/>
            </div>
            <MiniRows rows={[
              ["Amount financed", money(calc.naf)], ["Balloon %", `${calc.balloonPct.toFixed(2)}%`],
              ["Weekly", money(calc.weekly)], ["Fortnightly", money(calc.fortnightly)],
              ["Total payable", money(calc.total)], ["Commission est.", money(calc.commission)]
            ]}/>
          </Card>}

          <section className="tools">
            <Tool title="Rules Engine" icon={<Wrench/>} onClick={()=>setSheet("rules")} />
            <Tool title="Deal Structuring" icon={<BadgeDollarSign/>} onClick={()=>setSheet("structure")} />
            <Tool title="Saved Quotes" icon={<Search/>} onClick={()=>setSheet("quotes")} />
          </section>

          <p className="disclaimer">Estimate only. Subject to approval, lender policy and final contract terms.</p>
        </main>

        <nav className="bottom">
          <button className="selected"><Calculator size={22}/><span>Calc</span></button>
          <button onClick={saveQuote}><Save size={22}/><span>Save</span></button>
          <button onClick={()=>setSheet("client")}><User size={22}/><span>Client</span></button>
          <button onClick={()=>setSheet("send")}><MoreHorizontal size={22}/><span>Send</span></button>
        </nav>

        {sheet && <Sheet title={sheetTitle(sheet)} onClose={()=>setSheet(null)}>
          {sheet === "send" && <>
            <button className="sheet-action" onClick={pdf}><FileText size={18}/>Download PDF Quote</button>
            <a className="sheet-action" href={`sms:${clientPhone}?&body=${encodeURIComponent(quoteText)}`}><MessageCircle size={18}/>Send via SMS</a>
            <a className="sheet-action" href={`mailto:?subject=${encodeURIComponent("Cavalo Finance Quote")}&body=${encodeURIComponent(quoteText)}`}><Mail size={18}/>Send via Email</a>
            <button className="sheet-action" onClick={shareQuote}><MoreHorizontal size={18}/>Share / Copy Quote</button>
          </>}
          {sheet === "client" && <div className="sheet-grid">
            <Field label="Client Name" value={clientName} setValue={setClientName}/>
            <Field label="Phone" value={clientPhone} setValue={setClientPhone}/>
            <Field label="Vehicle" value={vehicle} setValue={setVehicle}/>
            <Field label="Stock / Ref" value={stockNo} setValue={setStockNo}/>
          </div>}
          {sheet === "quotes" && <div className="quote-list">{quotes.length ? quotes.map(q => <button key={q.id} onClick={()=>loadQuote(q)}><b>{q.clientName || "Unnamed Client"}</b><span>{q.vehicle || q.created} · {DEFAULT_LENDERS[q.lenderKey]?.name}</span></button>) : <p className="empty">No saved quotes yet.</p>}</div>}
          {sheet === "rules" && <div className="flags">{ruleFlags.map((f,i)=><p key={i} className={f.type}>{f.text}</p>)}<p className="empty">Placeholder only — real lender approval logic can be added when you provide policy rules.</p></div>}
          {sheet === "structure" && <div className="flags"><p className="note">Placeholder deal structuring module.</p><p className="empty">Future options: reduce NAF, adjust deposit, cap balloon, compare lenders, payment target solver.</p></div>}
          {sheet === "saved" && <p className="ok-box">Quote saved to this device.</p>}
        </Sheet>}
      </div>
    </div>
  );
}

function sheetTitle(s){ return ({send:"Send Quote",client:"Client Profile",quotes:"Saved Quotes",rules:"Rules Engine",structure:"Deal Structuring",saved:"Saved"})[s] || "Menu"; }

function Card({title, icon, children}) {
  return <section className="card"><div className="card-head">{React.cloneElement(icon,{size:20})}<h3>{title}</h3></div>{children}</section>;
}
function Field({label,value,setValue,prefix,suffix}) {
  return <label className="field"><span>{label}</span><div>{prefix && <em>{prefix}</em>}<input value={value} onChange={e=>setValue(e.target.value)} />{suffix && <em>{suffix}</em>}</div></label>;
}
function MiniRows({rows}) { return <div className="minirows">{rows.map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div>; }
function Tool({title, icon, onClick}) { return <button className="tool" onClick={onClick}>{React.cloneElement(icon,{size:18})}<span>{title}</span></button>; }
function Sheet({title,onClose,children}) { return <div className="overlay"><div className="sheet"><div className="sheet-head"><h3>{title}</h3><button onClick={onClose}><X size={20}/></button></div>{children}</div></div>; }
