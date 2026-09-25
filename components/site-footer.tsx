"use client";
import {ChevronDown} from "lucide-react";

const groups=[
  {title:"Settings",items:["Language","Cookie preferences","Information & transmission delays"]},
  {title:"Promotions",items:["Open Account Offer","Current Rewards"]},
  {title:"Sports & Stats",items:["Football Stats","Sports Stats","Live Scores","Results"]},
  {title:"Help",items:["Deposits","Withdrawals","Contact Us","BETNOW365 FAQ","Terms & Conditions","Responsible Gambling","Technical Issues","Privacy Policy","Cookie Policy","Complaints Procedure","Rules","Company Information","Self-Exclusion"]},
  {title:"Sites",items:["Careers","Partners","Sports & Betting News"]}
];

export default function SiteFooter(){
 return <footer className="site-footer">
  <div className="footer-grid">
   {groups.map(g=><section key={g.title}><h3>{g.title}</h3><div className="footer-links">{g.items.map(i=><a href="#" key={i}>{i}</a>)}</div></section>)}
  </div>
  <div className="footer-trust">
   <div className="partner-lockup"><strong>BETNOW<span>365</span></strong><small>SPORTS • CASINO • LIVE</small></div>
   <div className="trust-badges"><span>18+</span><span>RESPONSIBLE PLAY</span><span>SECURE</span></div>
  </div>
  <div className="footer-bottom">
   <strong>BETNOW365</strong>
   <p>Use of this site is subject to our terms, privacy policy and applicable gambling regulations. Real-money features remain subject to account verification, jurisdiction and responsible-gambling controls.</p>
   <small>© 2026 BETNOW365. All rights reserved.</small>
  </div>
 </footer>;
}
