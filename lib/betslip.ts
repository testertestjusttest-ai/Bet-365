export type BetPick={id:string;eventId:number;event:string;label:string;odd:number;sport:string;selectionId?:number;marketType?:string;mode:"single"|"multiple"|"builder"};
const KEY="betnow365-betslip";
export function readBetSlip():{single:BetPick[];multiple:BetPick[]}{try{return JSON.parse(localStorage.getItem(KEY)||'{"single":[],"multiple":[]}')}catch{return {single:[],multiple:[]}}}
export function writeBetSlip(value:{single:BetPick[];multiple:BetPick[]}){localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new CustomEvent("betnow365-betslip"))}
export function pickKey(pick:{eventId:number;label:string;selectionId?:number}){return String(pick.eventId)+":"+String(pick.selectionId??pick.label)}


export type DemoBetRecord={id:string;betType:"single"|"multiple";selections:BetPick[];stake:number;potentialReturn:number;status:"demo_accepted";createdAt:string};
export function recordDemoBet(record:DemoBetRecord){const key="betnow365-demo-bets";try{const current=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([record,...current].slice(0,100)));}catch{}}
