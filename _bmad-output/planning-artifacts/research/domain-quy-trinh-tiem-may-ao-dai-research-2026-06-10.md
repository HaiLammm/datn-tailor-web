---
stepsCompleted: [1, 2, 6]
stepsSkipped: [3, 4, 5] # per user direction: focus on shop workflow, de-emphasize market/competitive/regulatory depth
lastStep: 6
workflowComplete: true
inputDocuments:
  - docs/08-luong-nghiep-vu.md
workflowType: 'research'
lastStep: 1
research_type: 'domain'
research_topic: 'Quy trình vận hành chuẩn của tiệm may đo (đặc biệt áo dài) tại Việt Nam'
research_goals: 'Đối chiếu quy trình chuẩn ngành với luồng nghiệp vụ hiện tại trong docs/08-luong-nghiep-vu.md để xác định điểm khớp và điểm thiếu'
user_name: 'Lem'
date: '2026-06-10'
web_research_enabled: true
source_verification: true
---

# Research Report: domain

**Date:** 2026-06-10
**Author:** Lem
**Research Type:** domain

---

## Research Overview

This report verifies whether the shop's modeled business workflow matches the standard operating process of Vietnamese bespoke tailor shops (with áo dài focus). Research was conducted via three parallel web-research passes — market structure, standard operating workflow, and industry trends/technology — prioritizing Vietnamese-language sources, cross-checked against international bespoke references (Savile Row / Henry Poole), with inline citations and confidence levels throughout. Per user direction, deep dives on competitive landscape, regulation, and technology trends were skipped in favor of the process comparison.

**Headline conclusion:** the system's flows in `docs/08-luong-nghiep-vu.md` match industry-standard practice in 7 of 9 workflow steps — the deposit-plus-remaining cash payment model, measurement profiles with gate, and the rental return lifecycle match or exceed shop practice. Two genuine gaps remain, both post-sewing in the bespoke flow: (1) the repeatable fitting–alteration loop (1–2 rounds is the industry norm) is not modeled, and (2) there is no post-delivery alteration warranty (hậu mãi) path. Both are additive changes. See the Research Synthesis section for the full step-by-step comparison and recommendations.

---

## Domain Research Scope Confirmation

**Research Topic:** Quy trình vận hành chuẩn của tiệm may đo (đặc biệt áo dài) tại Việt Nam
**Research Goals:** Đối chiếu quy trình chuẩn ngành với luồng nghiệp vụ hiện tại trong docs/08-luong-nghiep-vu.md để xác định điểm khớp và điểm thiếu

**Domain Research Scope:**

- Standard operating workflow of bespoke tailor shops (intake → consultation → fabric/style selection → measurement → cutting/sewing → fitting & alteration → delivery → after-sales)
- Industry Analysis - market structure, business models (bespoke + ready-made + rental), deposit/payment practices
- Regulatory Environment - household business regulations, invoicing, rental deposit/refund practices (limited to what affects workflow)
- Technology Trends - digitalization of tailor shop management, measurement profiles, appointment booking, order tracking
- Gap Analysis - step-by-step comparison of industry-standard workflow vs docs/08-luong-nghiep-vu.md

**Research Methodology:**

- All claims verified against current public sources
- Multi-source validation for critical domain claims
- Confidence level framework for uncertain information
- Shop-specific constraints respected: artisan drafting method (3-piece cut, fabric folded on symmetry axis), cash-only/COD payment scope

**Scope Confirmed:** 2026-06-10

## Industry Analysis

### Market Size and Valuation

No dedicated, authoritative market-size figure exists for Vietnam's bespoke tailoring (may đo) or áo dài segment — the sector is dominated by unregistered household businesses (hộ kinh doanh, ~6.0M nationwide as of Jul 2025, only ~1.9M registered) and is not tracked as a distinct category by GSO, Statista, Euromonitor, or Vietnamese research firms. Sizing is via proxies:

_Total Market Size (proxy):_ Vietnam domestic fashion market ~USD 3.5B in 2025 (FiinGroup); VCCI HCMC states domestic textile-garment market ~USD 4.5B; other estimates span USD 5.26–7.33B depending on definition. Confidence: Medium-High.
_Source: https://baodautu.vn/thi-truong-thoi-trang-viet-nam-dat-gia-tri-35-ty-usd-d251381.html ; https://baochinhphu.vn/giam-doc-vcci-tphcm-quy-mo-thi-truong-det-may-trong-nuoc-khoang-45-ty-usd-102250409170011498.htm_

_Áo dài e-commerce slice (only measured segment):_ Shopee áo dài sales in the 6 pre-Tết weeks (Dec 2025–Jan 2026): >138 billion VND (~USD 5.4M), 444,000+ units, +49% revenue vs prior 6 weeks (Metric.vn). TikTok Shop: 2M áo dài orders in January 2026 alone; Q3-2025 +816% YoY. Offline (bespoke + ready-made) áo dài sales — the majority of the market — are unmeasured. Confidence: High for e-commerce figures; High for the offline data gap.
_Source: https://plo.vn/ao-dai-dat-doanh-thu-hang-tram-ti-tren-san-thuong-mai-dien-tu-dip-tet-2026-post895861.html ; https://nld.com.vn/con-sot-ao-dai-tet-2026-2-trieu-don-hang-tren-tiktok-shop-trong-1-thang-196260207053512133.htm_

_Price points (áo dài):_ ready-made e-commerce sweet spot 200k–350k VND; custom-tailored >1M VND incl. fabric; rental mass-market 50k–350k VND/day, designer 1–4M VND/day, bridal áo dài rental from ~1.2M VND. Confidence: High.
_Source: https://vnexpress.net/bung-no-doanh-thu-ban-ao-dai-mua-tet-4708659.html ; https://thanhnien.vn/dich-vu-cho-thue-ao-dai-dat-khach-dip-cuoi-nam-1852601141320193.htm_

### Market Dynamics and Growth

_Growth Drivers:_ Gen Z revival of traditional dress (Tết photos, social media); livestream commerce (TikTok Shop áo dài orders +816% YoY Q3-2025); wedding/ceremony demand; rental as a fast-growing low-capital parallel channel. Domestic fashion market growing 9–10%/yr (FiinGroup).
_Growth Barriers:_ Ready-made (may sẵn) competition structurally hollowing out general bespoke tailoring — provincial press documents mass shop closures (Hải Phòng case study); rising material costs; scarce young labor; price competition from cheap mass-produced áo dài.
_Cyclical Patterns:_ Heavily front-loaded into ~Nov–Feb (Tết + wedding season). Pre-Tết rental demand 3–4x normal; peak shops in HCMC handle 200–300 rentals/day. Off-season (Mar–Sep) structurally thin but can be activated by social-media trends.
_Market Maturity:_ Traditional bespoke is a declining/consolidating craft sector; áo dài specialists are more resilient than general tailors; e-commerce and rental segments are in rapid-growth phase. Confidence: High (multiple consistent Vietnamese sources).
_Source: https://baohaiphong.vn/nghe-may-do-thoi-trang-co-con-dat-song-360694.html ; https://phunuvietnam.vn/ao-dai-lap-ky-luc-tren-san-dien-so-mua-tet-binh-ngo-238260210174909825.htm ; https://nld.com.vn/thu-nhap-khung-tu-cho-thue-ao-dai-chup-anh-tet-som-tai-tphcm-196251225082905241.htm_

### Market Structure and Segmentation

_Primary Segments:_ Three-tier structure: (1) traditional neighborhood nhà may — single-artisan household shops, declining; (2) tourist-facing bespoke clusters — Hội An flagship (~200 shops in Ancient Town, 350–500+ town-wide, 24–48h turnaround); (3) branded áo dài design houses + e-commerce sellers (536 active online shops in Metric's Tết category).
_Sub-segment Analysis:_ Service mix per shop increasingly hybrid: bespoke + ready-made + rental + alterations. Hybrid bespoke+rental is the documented survival model for aging shops (Hải Phòng pivots). Rental startup capital 200–500M VND.
_Geographic Distribution:_ Hội An (tourist bespoke), Hà Nội (Old Quarter artisan shops, Trạch Xá craft village), TP.HCM (rental + upscale bespoke); e-commerce is nationwide.
_Vertical Integration:_ Fabric sourcing (lụa Nha Xá, Thái Tuấn etc.) → shop drafting/cutting/sewing in-house; some subcontracting to home sewers. Confidence: Medium-High.
_Source: https://www.vietnamairlines.com/us/en/plan-book/travel/travel-guide/hoi-an-tailoring ; https://metric.vn/ao-dai-tet-truyen-thong ; https://baohaiphong.vn/nghe-may-do-truoc-cuoc-do-bo-cua-thoi-trang-may-san-522331.html ; https://www.sapo.vn/blog/kinh-nghiem-mo-cua-hang-cho-thue-ao-dai_

### Standard Operating Workflow of Vietnamese Tailor Shops (Domain Practice Baseline)

The canonical compressed form across Vietnamese sources: **"nhận đồ – đo – may – thử – giao"** (intake – measure – sew – fit – deliver). Full step chain:

1. **Tiếp nhận & tư vấn** — assess purpose (cưới hỏi, Tết, đi làm), suggest styles for body type; reference photos or copy-garment accepted. (High)
2. **Chọn vải** — in-shop fabric stock (lụa, cotton, satin, gấm); fabric code per material/color; suitability advice. (High)
3. **Lấy số đo** — 10–15 min for áo dài; women's full set ~16 measurements (vòng cổ, dài áo, vòng ngực, ngực trên, vòng eo trên/dưới, hạ eo, hạ ngực, ngang ngực, vòng nách, bắp tay, khuỷu tay, dài tay, vai, vòng mông, dài quần) + body-shape notes (vai xuôi, lưng gù…); measured over thin clothes, wearing the heels to be worn with the garment; kept in a per-customer record reused on repeat orders. (High)
   _Source: https://www.nhaxasilk.com/cach-lay-so-do-ao-dai.html_
4. **Chốt đơn & duyệt thiết kế** — re-confirm fabric code, style, price, completion date before cutting; design-led shops add sketch approval. (High)
5. **Đặt cọc** — 30–50% deposit, receipt issued (Hội An norm: 50% after measurement). (Medium-High)
6. **Cắt & may** — draft pattern (vẽ rập), cut **with extra seam allowance reserved for later alteration**, sew. (High)
7. **Hẹn thử & chỉnh sửa** — shop proactively contacts customer when trial garment ready; **1–2 fitting rounds standard** (recommendation: at least 2 to "chỉnh form"); adjustment notes taken per fitting. International ceiling (Savile Row): 3 named fittings (basted → forward → final), paper pattern kept on file, repeat orders need fewer fittings. (High)
8. **Giao hàng & thanh toán phần còn lại** — customer inspects, pays balance (cash at shop is the norm); final pressing + care instructions. (High)
9. **Hậu mãi** — free immediate re-fit if not fitting at pickup; time-boxed free alteration windows post-delivery observed at 7 days–6 months depending on shop (no industry-wide standard); some shops offer seam warranty (bung chỉ, đứt nút, hỏng khóa). (High at pickup; Medium for formal windows)

_Lead times:_ standard áo dài 7–10 days (range: 4–5 days fast, up to 1 month complex); áo dài cưới ≥2 weeks, book ~2 months ahead; Hội An tourist speed 24–48h incl. 1–2 fittings; rush surcharge +10–30%; trial garment for formal may đo ready 10–12 days after order. Tết peak: shops stop taking orders or extend deadlines. Confidence: Medium-High.
_Source: https://sovaba.travel/blog/bai-viet-review-dich-vu-may-ao-dai-o-hoi-an ; https://tiemmaydo.vn/quy-trinh-may-do-ca-nhan-tai-tiem-may-do-nhu-the-nao-cac-buoc-khi-di-may-do-chuan-ma-ban-can-biet.-n109829.html ; https://hoanghiemvietphuc.com/quy-trinh-may-do-rieng-tai-hoa-nghiem-viet-phuc-tu-van-thiet-ke-duyet-sketch-va-hoan-thien/ ; https://henrypoole.com/bespoke-tailoring/bespoke-process/ ; https://www.dichvudamcuoi.com.vn/vn/newsdetail/nen-dat-may-ao-dai-hoi-truoc-bao-lau.html_

_Implied universal order-state chain:_ Nhận đơn → Đã cọc → Đang may → Chờ thử → Đang chỉnh sửa → Sẵn sàng giao → Đã giao (thanh toán đủ) → Bảo hành chỉnh sửa (time-boxed), with the fitting/alteration loop repeating 1–2 times.

### Industry Trends and Evolution

_Emerging Trends:_ (1) Livestream/e-commerce boom for ready-made áo dài (TikTok Shop records); (2) rental as fast-growth low-capital channel, choose-online → reserve → photograph → return; (3) remote bespoke ordering normalized — established shops accept self-measurement via Zalo/video with published measurement guides and a 3-step flow (pick design + self-measure → confirm → deposit + ship); (4) Tết 2026 design trends: muted/deep palettes, phom suông, tà kép.
_Historical Evolution:_ General bespoke declined under ready-made; survivors pivoted to alterations, uniforms, and hybrid bespoke+rental; áo dài specialists retained ceremonial/fit-critical demand.
_Technology Integration:_ **No dominant Vietnam-specific tailor-shop management software with measurement profiles exists** — local offerings are generic POS/CRM (KiotViet, Sapo) or factory ERP; closest niche tools target costume RENTAL (KiotViet rental solution, RentalShop app). International tailor SaaS (Orderry, Tailorfit, ThreadNix) has exactly the missing feature set (stored measurement profiles + order pipeline + fitting appointments) but no Vietnamese localization. CAD pattern software (Gerber, Optitex, Lectra) is factory/training-center scale; 3D body scanning is experimental. Small shops run on Facebook + Zalo — nothing structured (no measurement DB, no order pipeline); knowledge stays in the artisan's notebook/head. Confidence: High on the software gap.
_Future Outlook:_ Bifurcation continues (mass → platforms; bespoke → occasions where fit/ceremony matter); succession (truyền nghề) is the binding constraint — documented successes pair an elder artisan with a digitally-fluent successor; craft-knowledge digitization (measurement records, pattern formulas, customer history) framed as part of preserving the craft.
_Source: https://orderry.com/tailor-shop-software/ ; https://www.kiotviet.vn/phan-mem-cho-thue-ao-dai-trang-phuc-bieu-dien-mien-phi-duoc-dung-pho-bien-nhat/ ; https://phunuvietnam.vn/ao-dai-lap-ky-luc-tren-san-dien-so-mua-tet-binh-ngo-238260210174909825.htm ; https://dkaodai.vn/ ; https://nhandan.vn/bay-thap-nien-gan-bo-voi-nghe-may-ao-dai-post690536.html_

### Competitive Dynamics

_Market Concentration:_ Extremely fragmented — household businesses dominate; no national chains in bespoke; e-commerce concentration emerging (536 online shops, top brands CayLeo Design, Econice, Chaang May, CiCi Thùy).
_Competitive Intensity:_ High price pressure from mass-produced áo dài; bespoke competes on consultation quality, fit, artisan reputation, and word of mouth (truyền miệng) extended onto Facebook/Zalo.
_Barriers to Entry:_ Low capital barriers for rental (200–500M VND) and online resale; high skill barrier for true bespoke (artisan drafting); registration/legal ambiguity for online-only sellers.
_Innovation Pressure:_ Moderate — channel innovation (livestream, Zalo ordering) is mandatory for relevance; tooling innovation nearly absent at micro-shop level, which constitutes a software whitespace: a Vietnamese-language, measurement-profile-centric shop tool (số đo profiles + order pipeline + fitting appointments + Zalo-native + cash-friendly) has no direct local incumbent. Confidence: High on gap; Medium on elderly owners' willingness-to-pay (no data).
_Source: https://metric.vn/ao-dai-tet-truyen-thong ; https://subiz.com.vn/blog/cach-su-dung-zalo-oa.html ; https://congtyluatacc.vn/chi-ban-hang-online-tren-facebook-va-zalo-khong-ban-truc-tiep-thi-dang-ky-kinh-doanh-nhu-the-nao/_

## Research Synthesis — Process Comparison & Gap Analysis

> Scope note: per user direction, competitive-landscape, regulatory, and technical-trends deep-dive steps were skipped. This synthesis focuses on the core research goal: comparing the industry-standard tailor shop operating workflow against the system's business flows documented in `docs/08-luong-nghiep-vu.md`.

### Executive Summary

The system's three-flow order model (buy / rent / bespoke) **matches Vietnamese tailor-shop industry practice in 7 of 9 standard workflow steps**, and in several areas (rental return lifecycle with condition-based deposit refund, reusable measurement profiles, digitized pattern sessions) it is *ahead* of typical shop practice. Two genuine gaps exist, both in the bespoke flow:

1. **The fitting–alteration loop is not modeled.** Industry standard is 1–2 fitting rounds (thử đồ) with an alteration pass after each; the system's `in_production` sub-steps (Cutting → Sewing → Fitting → Finishing) are strictly linear, cannot represent a repeated fitting↔alteration cycle, have no fitting appointment for the customer, and no record of how many fittings occurred or what was adjusted.
2. **Post-delivery alteration warranty (hậu mãi) is absent.** Reputable shops universally offer free immediate re-fit at pickup and a time-boxed free alteration window after delivery (observed range: 7 days–6 months). The system's pipeline ends at `delivered → completed` with no alteration-request path.

The deposit + remaining payment model (30–50% cọc, balance in cash at pickup) matches industry norms exactly, validating the shop's cash-only scope.

### Step-by-Step Comparison

| # | Industry-standard step (verified) | System flow (docs/08 + epics) | Verdict |
|---|---|---|---|
| 1 | Tiếp nhận & tư vấn — purpose, style for body type | Showroom browse; design session (style pillars, Epic 2); booking appointments | ✅ Match (online equivalent; in-shop consult unmodeled by design) |
| 2 | Chọn vải — fabric stock, suitability advice | Fabric suggestion engine driven by style pillars (Story 2.3) | ✅ Match |
| 3 | Lấy số đo — ~16 measurements (women's áo dài) + body-shape notes, stored per customer, reused | Measurement profile (Story 1.7), Measurement Gate FR82, profile-driven form (11.4), extended measurements incl. collar (11.8) | ✅ Match — verify coverage of the full 16-measurement set and free-text body-shape notes (đặc điểm hình thể) |
| 4 | Chốt đơn — re-confirm fabric/style/price/**completion date** before cutting | Checkout (service-type-aware) + Owner Approve FR85/86 | ⚠️ Partial — approval exists, but no explicit promised completion/delivery date (ngày hẹn) on bespoke orders is visible in docs/08 (tailor_tasks has deadline; customer-facing date unclear) |
| 5 | Đặt cọc 30–50%, receipt | `deposit` + `remaining` transactions per service_type; cash/COD | ✅ Match — exactly the industry payment model |
| 6 | Cắt & may (vẽ rập, chừa đường may) | `in_production`: Cutting → Sewing; pattern engine (Epic 11) digitizes the artisan drafting method | ✅ Match — pattern sessions = digital equivalent of Henry Poole's kept paper pattern |
| 7 | Thử đồ 1–2 vòng + chỉnh sửa; shop proactively invites customer | Single linear `Fitting` sub-step; no fitting appointment, no loop, no per-fitting adjustment record | ❌ **Gap #1** |
| 8 | Giao + thanh toán còn lại (tiền mặt tại tiệm) | Remaining Payment FR89, ready_for_pickup notification | ✅ Match |
| 9 | Hậu mãi — free re-fit at pickup; alteration window 7d–6mo | Pipeline ends `delivered → completed`; no alteration-request state | ❌ **Gap #2** |

Rental flow comparison: the system's rent lifecycle (security_type CCCD/cash, pickup/return dates, 3-day/1-day reminders, return_condition Good/Damaged/Lost, condition-based deposit refund) **meets or exceeds** documented rental-shop practice and the feature set of dedicated rental POS (KiotViet rental solution). ✅

### Identified Gaps and Recommendations

**Gap #1 — Fitting–alteration loop (highest priority).**
- Industry evidence: 1–2 fittings standard, ≥2 recommended for áo dài (sovaba.travel, Hội An practice); Savile Row reference uses 3 named fittings; shops proactively contact the customer when the trial garment is ready (tiemmaydo.vn).
- Recommendation: model fitting as a repeatable transition (e.g. `Fitting → AlterationRequested → Altering → Fitting`) or a `fitting_rounds` event log per order, consistent with the project's "video, not snapshot" principle; add a fitting-appointment touchpoint (reuse the existing booking system) and a "Mời tới thử đồ" notification; record per-fitting adjustment notes (feeds the tailor task and the customer's body-shape history).

**Gap #2 — Post-delivery alteration warranty (hậu mãi).**
- Industry evidence: free immediate re-fit at pickup is universal at reputable shops; time-boxed windows of 7 days (TIE Men), 15 days + 6-month seam warranty (Thomas Nguyen), 30 days (Thanh Kha) observed — no single standard, shop chooses its policy.
- Recommendation: add an alteration-request path on completed bespoke orders (within a shop-configurable window), creating a lightweight tailor task without re-entering the full production pipeline.

**Minor / optional alignments:**
- Promised completion date (ngày hẹn lấy đồ) as a first-class customer-visible field on bespoke orders; industry lead-time norms: 7–10 days standard, ≥2 weeks for áo dài cưới.
- Body-shape notes (đặc điểm hình thể: vai xuôi, lưng gù…) alongside numeric measurements, if not already present.
- Measurement-session UX hints matching shop practice (measure over thin clothing, wear intended heels — affects dài áo/dài quần).
- Rush-order surcharge (+10–30%) and Tết-season order-intake caps — optional, matches peak-season behavior of shops.

### Strengths Confirmed Against Industry Practice

- **Payment model** (deposit + remaining, cash at shop) — exact match with the 30–50% cọc norm; cash-only scope is industry-standard, not a limitation.
- **Measurement Gate + reusable profiles** — mirrors the per-customer record practice of formal may đo shops and Savile Row pattern retention; repeat orders genuinely need fewer fittings when measurements/patterns are kept.
- **Digitized pattern sessions (Epic 11)** — directly addresses the sector's binding constraint (truyền nghề / artisan knowledge preservation), which press coverage frames as the key to keeping the craft alive.
- **Hybrid bespoke + rental + ready-made** service mix — the documented survival model for traditional shops.
- **Software whitespace** — no Vietnamese-language incumbent offers measurement profiles + order pipeline + fitting appointments; the system occupies a real market gap.

### Research Methodology and Source Verification

- Three parallel web-research passes (market structure; operating workflow; trends/technology), Vietnamese-language sources prioritized, cross-checked against international bespoke references (Savile Row / Henry Poole).
- All claims carry inline source URLs and confidence levels in the Industry Analysis section above. Convergent norms (deposit %, fitting count, lead times) were validated across ≥2 independent sources; single-source or snippet-only claims are marked Medium/Low confidence.
- Known limitations: no official statistics exist for the may đo sector (household-business informality); post-delivery warranty windows are shop-level conventions, not an industry standard; some primary pages were unreachable (403/404/TLS) and verified via search snippets only.

### Research Conclusion

**Đánh giá tổng thể: quy trình của tiệm ĐÃ đúng với quy trình chuẩn của các tiệm may ở phần lõi** — tư vấn, chọn vải, đo, cọc, may, giao, thanh toán — và vượt chuẩn ở mảng thuê và số hóa rập. Hai điểm chưa khớp đều nằm ở giai đoạn sau may: **vòng thử đồ–chỉnh sửa** và **bảo hành chỉnh sửa sau giao**. Both are additive changes (new transitions/states on the bespoke flow), not restructurings.

Suggested next steps: run `bmad-correct-course` (or a quick spec) for Gap #1 and Gap #2 if the shop wants to close them; the minor alignments can ride along as story-level enhancements.

**Research Completion Date:** 2026-06-10

<!-- Content will be appended sequentially through research workflow steps -->
