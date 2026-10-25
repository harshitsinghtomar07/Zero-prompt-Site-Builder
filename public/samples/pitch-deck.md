# Malgadi Logistics Cloud — Seed Deck

Freight visibility and working capital for India's mid-market road transport sector.
Confidential. Prepared by Vikram Sushilkar for a Kalaari Capital partnership meeting, 14 August 2026. Operating metrics as of 31 July 2026.

## Problem
Nine out of ten Indian fleet owners with between 20 and 250 trucks still run their business on WhatsApp screenshots and a paper ledger. Three things break every single week. First, dispatch cannot tell a shipper where a consignment actually is, because the GPS boxes fitted in 2016 report to closed operator portals, not to the fleet. Second, freight rates are agreed per lane and per season, so invoice disputes routinely delay payment by 40 to 55 days. Third, and this is the one that hurts most, a fleet owner who has ₹18 lakh of receivables on the road cannot borrow against them. Banks want property papers. NBFCs want to own the relationship outright and price credit at 26 to 34 percent. Working capital, not fuel, is what kills margins in road freight.

## Solution
Malgadi is one API and one dashboard that answers both questions at once: where is my load, and where is my money. We ingest telematics from 41 device OEMs and 6 telecom ELD providers into a normalised event stream, then layer a credit decision engine on top of the same data. Because we see the trip, the proof of delivery, and the payment history, we can underwrite a receivable in about nine minutes instead of nine days. Shippers get an ETA they can send to their own customer. Fleet owners get cash against that invoice at 17 to 21 percent. Nobody has to change the tracker already bolted to their chassis.

## How it works
Device or operator API feeds raw location and ignition events. Our ingestion tier de-duplicates, backfills gaps, and reconstructs trips. Trip data powers four surfaces: live tracking link, geofence and temperature alerts, ePOD capture with the driver's photo, and the freight reconciliation report that flags a detour before it becomes a deduction. When a fleet owner requests finance, the risk engine pulls two years of reconstructed trips and the shipper's payment behaviour, scores it, and posts a limit. Malgadi disburses through a partner NBFC; we take the servicing fee and the data licence fee, never the balance sheet risk.

## Market size
Indian road freight moved ₹11.4 lakh crore of cargo in 2026 ($137 billion), growing at 9.1 percent CAGR. Freight-tech software plus embedded finance addresses roughly ₹62,000 crore ($7.4 billion) of that, of which our realistic five-year serviceable market is ₹1,450 crore. The addressable fleet base — owners of 20 to 250 trucks who bill above ₹1.2 crore annually — is about 84,000 operators, and 3,100 mid-market shippers use a transport management system today.

## Traction
ARR is ₹2.14 crore ($257k), up 140 percent year on year from ₹89 lakh. Thirty-eight paying customers, 12,400 trucks transmitting, 1.9 million trips reconstructed in the last twelve months. Net revenue retention 118 percent. Monthly logo churn 1.4 percent. Gross margin 74 percent. CAC ₹1.9 lakh with an 11-month payback. Credit book: ₹41 crore facilitated through partner NBFCs with 0.6 percent overdue beyond 90 days. Named references: Satkar Steel Carriers, Bhoomi Cold Chain, Vendra Agri Exports.

## Business model
SaaS at ₹499 per truck per month, banded down to ₹299 above 150 trucks. Data-licence fee from shippers, ₹2.4 lakh per lane per year. Finance servicing fee of 2.1 percent on every rupee facilitated. Blended revenue per truck per month is ₹1,240 today and ₹2,100 in the finance-heavy cohort. Nothing in the model depends on advertising, and nothing requires us to fund the loans ourselves.

## Competition
Big telematics players — Zoan, Omnicomm, Trakexec — sell hardware and a closed portal; they have no credit product and treat the fleet owner as the end customer, not the data source. Lending-first firms such as Via and Invi handle only the financing and depend on the borrower's own device data, which is exactly what is unreliable. Freight marketplaces (Rivigo's legacy arm, BlackBuck's board) compete for loads, not for visibility, and their economics collapse when diesel moves. Our wedge is that we are device-agnostic and we monetise the same event stream twice — once for software, once for underwriting.

## Roadmap
Q4 2026: self-serve onboarding and device compatibility checker. Q1 2027: container and multimodal trip model for the JNPT corridor. Q2 2027: shipper-side reconciliation API with Tally and Zoho Books connectors. Q4 2027: cold-chain SLA reporting priced per reefer. Q2 2028: two additional lending partners to compress pricing by 300 basis points.

## Team
- **Vikram Sushilkar** — Co-founder & CEO. Six years at Delhivery, last two leading the linehaul product team through 14 state rollouts. Wrote the first Indian ELD parser that ran on a ₹400 handset.
- **Farhan Qureshi** — Co-founder & CTO. Built the trading risk pipeline at Zerodha; before that, infra at Bosch Research Bangalore. Owns the ingestion and event-reconstruction layer.
- **Devika Ramanathan** — Head of Credit Risk. Eleven years across Bajaj Finance and Flipkart Credit; took a vehicle-loan book from ₹0 to ₹640 crore. IIM-Calcutta.
- **Sneha Bhosale** — Head of Sales. Opened Maharashtra and Karnataka for Locus; carries 22 named accounts today.

## The Ask
Raising ₹6.5 crore ($780k) on a CCPS at $9 million pre-money, with ₹41 lakh already committed by two angel operators. Use of funds: engineering and data team ₹2.6 crore (hire to 14), credit-partner underwriting stack and co-invest cushion ₹1.7 crore, go-to-market in Gujarat and Tamil Nadu ₹1.25 crore, compliance, statutory and DPDP readiness ₹60 lakh, operating reserve ₹35 lakh. That is 20 months of runway. Milestones we underwrite to: ₹7.8 crore ARR, 120 paying fleets, and two signed national shippers by Q2 2028.

Contact: vikram@malgadi.io · +91 98853 41207 · malgadi.io · Hyderabad, Telangana
