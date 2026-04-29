import React,{useState,useMemo} from "react";
const LENDERS={
VWFS:{name:"VWFS",o:1595,e:590,p:0,m:0},
PEPPER:{name:"Pepper",o:1990,e:490,p:8,m:8.90},
ANGLE_COMM:{name:"Angle Commercial",o:1595,e:599,p:6,m:20},
ANGLE_CON:{name:"Angle Consumer",o:1395,e:499,p:6,m:15},
TAURUS:{name:"Taurus",o:1490,e:490,p:6,m:11},
ALLIED:{name:"Allied",o:1495,e:595,p:9.95,m:12.95},
NFS:{name:"NFS",o:1490,e:490,p:6,m:11}
};
export default function App(){
const[lender,setLender]=useState("VWFS");
const[price,setPrice]=useState(132940);
const[rate,setRate]=useState(7.49);
const[term,setTerm]=useState(60);
const calc=useMemo(()=>{
const l=LENDERS[lender];
const fees=l.o+l.e+l.p;
const amount=price+fees;
const r=rate/100/12;
const monthly=(amount*r)/(1-Math.pow(1+r,-term))+l.m;
return{fees,amount,monthly};
},[price,rate,term,lender]);
return(<div style={{background:"#000",color:"#fff",padding:20}}>
<h2>CAVALO</h2>
<div>{Object.entries(LENDERS).map(([k,v])=>(<button key={k} onClick={()=>setLender(k)} style={{margin:4}}>{v.name}</button>))}</div>
<h4>Purchase</h4>
<input value={price} onChange={e=>setPrice(e.target.value)} />
<h4>Lender Fees</h4>
<p>{calc.fees}</p>
<h4>Repayment</h4>
<p>{calc.monthly.toFixed(2)}</p>
<p style={{opacity:.6}}>Future: Rules Engine | Deal Structuring | CRM | Commission</p>
</div>);
}