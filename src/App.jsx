import React, { useMemo, useState } from "react";
import { Car, Calculator, FileText, Mail, MessageCircle, MoreHorizontal, Percent, X } from "lucide-react";
import { jsPDF } from "jspdf";

const LENDERS = {
  VWFS: {
    name: "VWFS",
    originationFee: 1595,
    establishmentFee: 590,
    ppsr: 0,
    monthlyAccountFee: 0,
  },
  PEPPER: {
    name: "Pepper Commercial",
    originationFee: 1990,
    establishmentFee: 490,
    ppsr: 8,
    monthlyAccountFee: 8.95,
  },
};

const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 2,
});

function money(value) {
  return Number.isFinite(value) ? aud.format(value) : "$0.00";
}

function cleanNumber(value) {
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function repayment({ amountFinanced, annualRate, months, balloon }) {
  const rate = annualRate / 100 / 12;
  if (!months) return 0;
  if (!rate) return (amountFinanced - balloon) / months;
  const balloonPv = balloon / Math.pow(1 + rate, months);
  const adjustedPrincipal = amountFinanced - balloonPv;
  return (adjustedPrincipal * rate) / (1 - Math.pow(1 + rate, -months));
}

export default function App() {
  const [lenderKey, setLenderKey] = useState("VWFS");
  const [purchasePrice, setPurchasePrice] = useState("132940");
  const [cashDeposit, setCashDeposit] = useState("0");
  const [tradeAllowance, setTradeAllowance] = useState("15000");
  const [existingPayout, setExistingPayout] = useState("0");
  const [interestRate, setInterestRate] = useState("7.49");
  const [loanTerm, setLoanTerm] = useState("60");
  const [balloonAmount, setBalloonAmount] = useState("65000");
  const [editMode, setEditMode] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const lender = LENDERS[lenderKey];

  const calc = useMemo(() => {
    const price = cleanNumber(purchasePrice);
    const deposit = cleanNumber(cashDeposit);
    const trade = cleanNumber(tradeAllowance);
    const payout = cleanNumber(existingPayout);
    const rate = cleanNumber(interestRate);
    const months = cleanNumber(loanTerm);
    const balloon = cleanNumber(balloonAmount);

    const lenderFees = lender.originationFee + lender.establishmentFee + lender.ppsr;
    const totalEquity = deposit + trade - payout;
    const subtotal = Math.max(price - totalEquity, 0);
    const amountFinanced = subtotal + lenderFees;
    const baseMonthly = repayment({ amountFinanced, annualRate: rate, months, balloon });
    const monthly = baseMonthly + lender.monthlyAccountFee;
    const totalPayable = monthly * months + balloon;

    return {
      price, deposit, trade, payout, totalEquity, subtotal,
      originationFee: lender.originationFee,
      establishmentFee: lender.establishmentFee,
      ppsr: lender.ppsr,
      monthlyAccountFee: lender.monthlyAccountFee,
      lenderFees, amountFinanced, rate, months, balloon,
      balloonPercent: price ? (balloon / price) * 100 : 0,
      baseMonthly, monthly,
      weekly: (monthly * 12) / 52,
      fortnightly: (monthly * 12) / 26,
      totalPayable,
      interest: totalPayable - amountFinanced,
    };
  }, [purchasePrice, cashDeposit, tradeAllowance, existingPayout, interestRate, loanTerm, balloonAmount, lender]);

  const quoteText = `Cavalo Prestige Finance Estimate
Lender: ${lender.name}
Purchase Price: ${money(calc.price)}
Amount Financed: ${money(calc.amountFinanced)}
Interest Rate: ${calc.rate.toFixed(2)}%
Term: ${calc.months} months
Balloon: ${money(calc.balloon)} (${calc.balloonPercent.toFixed(2)}%)
Estimated Monthly Repayment: ${money(calc.monthly)}
Weekly Equivalent: ${money(calc.weekly)}
Fortnightly Equivalent: ${money(calc.fortnightly)}

Estimate only. Subject to lender approval.`;

  function createPdf() {
    const doc = new jsPDF();
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 297, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("CAVALO", 105, 22, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("PRESTIGE", 105, 30, { align: "center" });

    doc.setDrawColor(65, 191, 40);
    doc.line(20, 38, 190, 38);

    doc.setFontSize(12);
    doc.setTextColor(180, 180, 180);
    doc.text("FINANCE CALCULATOR", 105, 52, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(30);
    doc.text(money(calc.monthly), 105, 68, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(170, 170, 170);
    doc.text("estimated monthly repayment", 105, 76, { align: "center" });

    const rows = [
      ["Lender", lender.name],
      ["Purchase Price", money(calc.price)],
      ["Cash Deposit", money(calc.deposit)],
      ["Trade Allowance", money(calc.trade)],
      ["Existing Payout", money(calc.payout)],
      ["Origination Fee", money(calc.originationFee)],
      ["Establishment Fee", money(calc.establishmentFee)],
      ["PPSR", money(calc.ppsr)],
      ["Monthly Account Fee", money(calc.monthlyAccountFee)],
      ["Amount Financed", money(calc.amountFinanced)],
      ["Interest Rate", `${calc.rate.toFixed(2)}% p.a.`],
      ["Loan Term", `${calc.months} months`],
      ["Balloon", `${money(calc.balloon)} (${calc.balloonPercent.toFixed(2)}%)`],
      ["Weekly Equivalent", money(calc.weekly)],
      ["Fortnightly Equivalent", money(calc.fortnightly)],
      ["Total Payable", money(calc.totalPayable)],
    ];

    let y = 94;
    doc.setFontSize(10);
    rows.forEach(([label, value]) => {
      doc.setTextColor(150, 150, 150);
      doc.text(label, 22, y);
      doc.setTextColor(255, 255, 255);
      doc.text(value, 188, y, { align: "right" });
      doc.setDrawColor(40, 40, 40);
      doc.line(22, y + 4, 188, y + 4);
      y += 10;
    });

    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Estimate only. Subject to lender approval. Fees and repayments may vary.", 105, 280, { align: "center" });
    doc.save("cavalo-finance-quote.pdf");
  }

  function shareQuote() {
    if (navigator.share) {
      navigator.share({ title: "Cavalo Finance Quote", text: quoteText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(quoteText);
      alert("Quote copied to clipboard.");
    }
  }

  return (
    <div className="app-shell">
      <div className="phone">
        <TopBar />

        <main className="content">
          <Hero monthly={calc.monthly} />

          <section className="lender-panel">
            <p className="eyebrow">LENDER</p>
            <div className="lender-buttons">
              <button className={lenderKey === "VWFS" ? "active" : ""} onClick={() => setLenderKey("VWFS")}>VWFS</button>
              <button className={lenderKey === "PEPPER" ? "active" : ""} onClick={() => setLenderKey("PEPPER")}>Pepper Commercial</button>
            </div>
          </section>

          <InfoCard
            icon={<FileText />}
            title="Purchase Details"
            action={<button className="edit-link" onClick={() => setEditMode(!editMode)}>{editMode ? "Done" : "Edit"}</button>}
          >
            {editMode ? (
              <div className="edit-stack">
                <EditField label="Purchase Price" value={purchasePrice} setValue={setPurchasePrice} prefix="$" />
                <EditField label="Less Cash Deposit" value={cashDeposit} setValue={setCashDeposit} prefix="$" />
                <EditField label="Less Trade Allowance" value={tradeAllowance} setValue={setTradeAllowance} prefix="$" />
                <EditField label="Add Payout of Existing Finance" value={existingPayout} setValue={setExistingPayout} prefix="$" />
              </div>
            ) : (
              <>
                <Row label="Purchase Price" value={money(calc.price)} />
                <Row label="Less Cash Deposit" value={money(calc.deposit)} />
                <Row label="Less Trade Allowance" value={money(calc.trade)} />
                <Row label="Add Payout of Existing Finance" value={money(calc.payout)} />
                <Row label="Total Equity" value={money(calc.totalEquity)} />
                <Row label="Sub Total" value={money(calc.subtotal)} />
              </>
            )}
          </InfoCard>

          <InfoCard icon={<Percent />} title="Lender Fees">
            <Row label="Origination Fee" value={money(calc.originationFee)} />
            <Row label="Establishment Fee" value={money(calc.establishmentFee)} />
            <Row label="PPSR" value={money(calc.ppsr)} />
            <Row label="Monthly Account Keeping Fee" value={money(calc.monthlyAccountFee)} />
            <Row label="Total Fees Included" value={money(calc.lenderFees)} strong />
          </InfoCard>

          <InfoCard icon={<Calculator />} title="Repayment Summary">
            {editMode ? (
              <div className="edit-stack">
                <EditField label="Interest Rate" value={interestRate} setValue={setInterestRate} suffix="%" />
                <EditField label="Loan Term" value={loanTerm} setValue={setLoanTerm} suffix="months" />
                <EditField label="Balloon Amount" value={balloonAmount} setValue={setBalloonAmount} prefix="$" />
              </div>
            ) : (
              <>
                <Row label="Amount Financed" value={money(calc.amountFinanced)} strong />
                <Row label="Interest Rate (p.a.)" value={`${calc.rate.toFixed(2)}%`} />
                <Row label="Loan Term" value={`${calc.months} months`} />
                <Row label="Balloon (% of Purchase Price)" value={`${calc.balloonPercent.toFixed(2)}%`} />
                <Row label="Balloon Amount" value={money(calc.balloon)} />
                <Row label="Repayment Frequency" value="Monthly (Arrears)" />
              </>
            )}

            <div className="inner-box">
              <Row label="Monthly Repayment" value={money(calc.monthly)} strong />
              <Row label="Weekly Equivalent" value={money(calc.weekly)} />
              <Row label="Fortnightly Equivalent" value={money(calc.fortnightly)} />
              <Row label="Total Repayable" value={money(calc.totalPayable)} />
              <Row label="Interest Component" value={money(calc.interest)} />
            </div>
          </InfoCard>

          <p className="disclaimer">Estimate only. Subject to approval, lender policy and final contract terms.</p>
        </main>

        <BottomNav onMore={() => setActionsOpen(true)} />

        {actionsOpen && (
          <div className="action-sheet">
            <div className="sheet-card">
              <div className="sheet-top">
                <h3>Client Quote</h3>
                <button onClick={() => setActionsOpen(false)}><X size={20} /></button>
              </div>
              <button onClick={createPdf}><FileText size={18} /> Download PDF Quote</button>
              <a href={`sms:?&body=${encodeURIComponent(quoteText)}`}><MessageCircle size={18} /> Send to Client via SMS</a>
              <a href={`mailto:?subject=${encodeURIComponent("Cavalo Finance Quote")}&body=${encodeURIComponent(quoteText)}`}><Mail size={18} /> Send to Client via Email</a>
              <button onClick={shareQuote}><MoreHorizontal size={18} /> Share / Copy Quote</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <div>
        <div className="logo">CAVALO</div>
        <div className="sub-logo"><span />PRESTIGE<span /></div>
      </div>
    </header>
  );
}

function Hero({ monthly }) {
  return (
    <section className="hero">
      <Car size={28} />
      <p>FINANCE CALCULATOR</p>
      <h1>{money(monthly)}</h1>
      <span>estimated monthly repayment</span>
    </section>
  );
}

function InfoCard({ icon, title, action, children }) {
  return (
    <section className="card">
      <div className="card-head">
        <div className="card-title">{React.cloneElement(icon, { size: 21 })}<h2>{title}</h2></div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className="row">
      <span>{label}</span>
      <b className={strong ? "strong" : ""}>{value}</b>
    </div>
  );
}

function EditField({ label, value, setValue, prefix, suffix }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        {prefix && <em>{prefix}</em>}
        <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        {suffix && <em>{suffix}</em>}
      </div>
    </label>
  );
}

function BottomNav({ onMore }) {
  return (
    <nav className="bottom-nav">
      <button className="selected"><Calculator size={23} /><span>Calculator</span></button>
      <button><Car size={23} /><span>Vehicles</span></button>
      <button><FileText size={23} /><span>Quotes</span></button>
      <button onClick={onMore}><MoreHorizontal size={23} /><span>Send</span></button>
      <i />
    </nav>
  );
}
