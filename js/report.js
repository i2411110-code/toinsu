// ═══════════════════════════════════════════════
// 1. 담보 정의 (35개)
// ═══════════════════════════════════════════════
const COVERAGE_DEF = [
  { cat:'실비',   key:'inpatient',        label:'입원 의료비' },
  { cat:null,     key:'outpatient',       label:'통원 의료비' },
  { cat:'배상',   key:'liability',        label:'일상생활 배상책임' },
  { cat:'수술',   key:'disease_surg',     label:'질병 수술비' },
  { cat:null,     key:'injury_surg',      label:'상해 / 재해 수술비' },
  { cat:null,     key:'brain_heart_surg', label:'뇌 / 심장 수술비' },
  { cat:null,     key:'type_surg',        label:'1 ~ 5 종수술' },
  { cat:'암',     key:'cancer_diag',      label:'일반암 진단비' },
  { cat:null,     key:'minor_cancer',     label:'유사암 진단비' },
  { cat:null,     key:'robot_surg',       label:'로봇암 수술비' },
  { cat:null,     key:'chemo_rad',        label:'항암방사선약물 치료비' },
  { cat:null,     key:'targeted',         label:'표적항암약물 치료비' },
  { cat:null,     key:'cancer_main',      label:'암 주요 치료비' },
  { cat:'뇌',     key:'cerebro',          label:'뇌혈관질환 진단비' },
  { cat:null,     key:'stroke',           label:'ㄴ뇌졸증 진단비' },
  { cat:null,     key:'cerebro_hem',      label:'ㄴ뇌출혈 진단비' },
  { cat:null,     key:'thrombo',          label:'혈전용해제' },
  { cat:'심장',   key:'ischemic',         label:'허혈성심장질환 진단비' },
  { cat:null,     key:'arrhythmia',       label:'ㄴ부정맥 진단비' },
  { cat:null,     key:'ami',              label:'ㄴ급성심근경색 진단비' },
  { cat:'입원',   key:'injury_hosp',      label:'상해 / 재해 입원일당' },
  { cat:null,     key:'disease_hosp',     label:'질병 입원일당' },
  { cat:null,     key:'general_hosp',     label:'일반 입원일당' },
  { cat:null,     key:'er_visit',         label:'응급실 내원 진료비' },
  { cat:'골절',   key:'fracture',         label:'골절 진단비' },
  { cat:null,     key:'five_fracture',    label:'5대골절 진단비' },
  { cat:null,     key:'cast',             label:'깁스 치료비' },
  { cat:'사망',   key:'death_general',    label:'일반사망' },
  { cat:null,     key:'death_disease',    label:'질병사망' },
  { cat:null,     key:'death_cancer',     label:'암 사망' },
  { cat:null,     key:'death_injury',     label:'상해사망 / 재해사망' },
  { cat:'운전자', key:'car_injury',       label:'자동차 부상치료비(1급~14급)' },
  { cat:null,     key:'car_fine',         label:'벌금(대인)' },
  { cat:null,     key:'car_lawyer',       label:'변호사 선임비용' },
  { cat:null,     key:'car_settlement',   label:'사고처리 지원금(형사합의금)' },
];

const CAT_INFO = {};
let _lastCat = null, _lastIdx = 0;
COVERAGE_DEF.forEach((cov, idx) => {
  if (cov.cat !== null) {
    if (_lastCat !== null) CAT_INFO[_lastCat] = { span: idx - _lastIdx, start: _lastIdx };
    _lastCat = cov.cat; _lastIdx = idx;
  }
});
if (_lastCat !== null) CAT_INFO[_lastCat] = { span: COVERAGE_DEF.length - _lastIdx, start: _lastIdx };

// ═══════════════════════════════════════════════
// 2. 보험사/담보 매핑 및 헬퍼 함수
// ═══════════════════════════════════════════════
const COMPANY_RULES = [['흥국화재',['흥good','흥국화재','흥국생명','흥국손','the편한','흥굿']],['삼성화재',['삼성화재']],['삼성생명',['삼성생명']],['현대해상',['현대해상','굿앤굿','hi2412','hi2411','hi2410','hi2409','goodandgood']],['현대라이프',['현대라이프']],['DB손해보험',['db손','디비손','db생명','db금융']],['KB손해보험',['kb손해','kb손보','케이비손']],['KB생명',['kb생명','케이비생명','kb라이프']],['메리츠화재',['메리츠화재','메리츠손']],['메리츠생명',['메리츠생명']],['한화손해보험',['한화손해','한화손보','한화일반']],['한화생명',['한화생명','한화라이프']],['교보생명',['교보생명','교보라이프']],['교보손해보험',['교보손해','교보손보']],['신한라이프',['신한라이프','신한생명','이지로운','신한 이지로운']],['신한EZ손해보험',['신한ez','신한이지']],['NH농협손해보험',['농협손해','농협손보','nh손']],['NH농협생명',['농협생명','nh농협생명','건강플러스nh','nh통합','nh건강']],['ABL생명',['abl','에이비엘']],['AIA생명',['aia생명','aia']],['처브라이프',['chubb','처브라이프','처브생명']],['처브손해보험',['처브손','chubb손']],['KDB생명',['kdb생명','kdb','버팀목new','버팀목']],['하나생명',['하나생명','하나로누리']],['하나손해보험',['하나손해','하나손보']],['동양생명',['동양생명']],['미래에셋생명',['미래에셋생명','미래에셋금융']],['라이나생명',['라이나생명','라이나','the건강한치아','건강한치아']],['에이스손보',['에이스손보','더핏','더퍼스트','ace손','에이스생명']],['우정사업본부',['에버리치상해','에버리치','우정사업','우체국보험']],['BNP파리바카디프',['bnp파리바','카디프','bnp']],['롯데손해보험',['롯데손해','롯데손보','롯데건강']],['롯데생명',['롯데생명','롯데라이프']],['MG손해보험',['mg손해','mg손보','mg새마을','새마을금고손']],['흥국생명',['흥국생명']],['동부화재',['동부화재','동부손']],['LIG손해보험',['lig손','lig보험']],['푸본현대생명',['푸본현대','푸본']],['iM라이프',['im라이프','im생명','동양생명im']],['카카오페이손해보험',['카카오페이손','카카오손','카카오보험']],['무한생명',['무한생명']],['동화생명',['동화생명']]];

function guessCompany(product) {
  const p = product.toLowerCase().replace(/\s/g,'');
  for (const [name, keywords] of COMPANY_RULES) {
    for (const kw of keywords) {
      if (p.includes(kw.toLowerCase().replace(/\s/g,''))) return name;
    }
  }
  return null;
}

const RAW_COV_MAP = {'질병입원':'inpatient','상해입원':'inpatient','상해+질병 입원의료비':'inpatient','입원의료비':'inpatient','상해+질병입원의료비':'inpatient','질병입원의료비':'inpatient','상해입원의료비':'inpatient','실손의료비(입원)':'inpatient','질병통원':'outpatient','상해통원':'outpatient','질병 외래의료비':'outpatient','질병 처방조제료':'outpatient','상해 외래의료비':'outpatient','상해 처방조제료':'outpatient','재해통원급부금':'outpatient','통원의료비':'outpatient','실손의료비(통원)':'outpatient','질병외래의료비':'outpatient','상해외래의료비':'outpatient','일상생활 배상책임':'liability','일상생활배상책임':'liability','가족생활 배상책임':'liability','가족생활배상책임':'liability','배상책임':'liability','일상생활배상책임(가족전체)':'liability','국내일상생활배상책임':'liability','질병수술비':'disease_surg','질병수술급여금':'disease_surg','질병 수술비':'disease_surg','질병 수술급여금':'disease_surg','질병수술보장':'disease_surg','상해수술비':'injury_surg','재해수술급부금':'injury_surg','상해재해수술비':'injury_surg','상해 수술비':'injury_surg','재해 수술비':'injury_surg','재해수술비':'injury_surg','상해수술급여금':'injury_surg','일반상해수술비':'injury_surg','뇌혈관수술비':'brain_heart_surg','허혈심장질환수술비':'brain_heart_surg','뇌출혈및급성심근경색수술비':'brain_heart_surg','뇌혈관질환 수술':'brain_heart_surg','허혈성심장질환 수술':'brain_heart_surg','뇌·심장수술비':'brain_heart_surg','뇌혈관 수술비':'brain_heart_surg','심혈관수술비':'brain_heart_surg','질병종수술':'type_surg','상해종수술':'type_surg','상해1~5종수술비':'type_surg','상해1~5종수술비ⅱ':'type_surg','상해1~5종수술비ii':'type_surg','종수술비':'type_surg','1~5종수술비':'type_surg','질병1~5종수술비':'type_surg','일반암진단비':'cancer_diag','일반암 진단비':'cancer_diag','암진단금':'cancer_diag','암진단비':'cancer_diag','암 진단비':'cancer_diag','암진단ⅱ(유사암제외)(갱신형)담보':'cancer_diag','일반암진단(소액암 제외)':'cancer_diag','일반암진단iii(특정소액암 및 대장점막내암 제외)':'cancer_diag','일반암진단Ⅲ(특정소액암및대장점막내암제외)':'cancer_diag','암진단(유사암제외)':'cancer_diag','고액암진단비':'cancer_diag','유사암진단비':'minor_cancer','유사암 진단비':'minor_cancer','유사암진단ⅱ(양성뇌종양포함)(갱신형)담보':'minor_cancer','갑상샘암진단':'minor_cancer','갑상선암진단비':'minor_cancer','경계성종양진단':'minor_cancer','기타피부암진단':'minor_cancer','제자리암(상피내암)진단':'minor_cancer','소액암진단':'minor_cancer','소액암진단비':'minor_cancer','유사암진단(양성뇌종양포함)':'minor_cancer','로봇암수술':'robot_surg','다빈치로봇암수술':'robot_surg','다빈치레보아이로봇 암수술(수술1회당)_암(특정암제외)':'robot_surg','일반암수술':'robot_surg','암 관혈수술':'robot_surg','암내시경수술보장':'robot_surg','암수술(복강경하, 흉강경하)보장':'robot_surg','암수술(갱신형)담보':'robot_surg','로봇수술비(암)':'robot_surg','암수술비':'robot_surg','다빈치수술비':'robot_surg','항암방사선약물치료비':'chemo_rad','항암방사선치료':'chemo_rad','항암방사선':'chemo_rad','항암세기조절방사선치료':'chemo_rad','항암양성자방사선치료':'chemo_rad','항암중입자방사선치료':'chemo_rad','항암중입자치료비':'chemo_rad','중입자방사선치료비':'chemo_rad','항암방사선(세기조절)치료(갱신형)담보':'chemo_rad','항암방사선(양성자)치료(갱신형)담보':'chemo_rad','항암화학치료비':'chemo_rad','항암치료비':'chemo_rad','방사선치료비':'chemo_rad','표적항암약물치료비':'targeted','고액항암 치료비(표적)':'targeted','고액항암치료비(표적)':'targeted','표적항암약물허가치료(갱신형)담보':'targeted','카티(car-t)항암약물허가치료(연간1회한)(갱신형)담보':'targeted','표적항암치료비':'targeted','고액항암치료비':'targeted','면역항암치료비':'targeted','암 주요치료비':'cancer_main','암주요치료비':'cancer_main','암 주요 치료비':'cancer_main','뇌혈관질환 진단비':'cerebro','뇌혈관진단비':'cerebro','뇌혈관 진단비':'cerebro','뇌혈관질환(ⅰ)진단(갱신형)담보':'cerebro','뇌혈관질환 진단':'cerebro','뇌혈관질환진단비':'cerebro','뇌혈관질환(i)진단(갱신형)담보':'cerebro','뇌혈관 질환 진단비':'cerebro','뇌졸중진단비':'stroke','뇌졸중 진단비':'stroke','뇌혈관질환(ⅱ)진단(갱신형)담보':'stroke','뇌졸중(뇌경색포함)진단비':'stroke','뇌졸중진단':'stroke','뇌출혈진단비':'cerebro_hem','뇌출혈 진단비':'cerebro_hem','뇌출혈진단':'cerebro_hem','뇌출혈진단(최초1회한)':'cerebro_hem','혈전용해제':'thrombo','혈전용해치료비':'thrombo','혈전용해치료비ⅲ(최초1회한)(특정순환계질환ⅰ)(갱신형)담보':'thrombo','2대질환 주요치료비':'thrombo','혈전용해치료':'thrombo','허혈성심장질환 진단비':'ischemic','허혈성심장질환진단비':'ischemic','허혈성심장질환 진단':'ischemic','허혈성심장질환진단':'ischemic','심혈관질환(특정ⅰ,i49제외)진단(갱신형)담보':'ischemic','허혈성심장질환진단비(최초1회한)':'ischemic','심혈관질환진단비':'ischemic','심장질환 진단비':'ischemic','허혈심장질환 진단비':'ischemic','부정맥진단비':'arrhythmia','부정맥 진단비':'arrhythmia','심혈관질환(i49)진단(갱신형)담보':'arrhythmia','급성심근경색증진단비':'ami','급성심근경색증 진단비':'ami','급성심근경색진단비':'ami','급성심근경색증진단':'ami','심혈관질환(특정2대)진단(갱신형)담보':'ami','심혈관질환(특정ⅱ)진단(갱신형)담보':'ami','급성심근경색 진단비':'ami','급성심근경색(최초1회한)':'ami','상해일당':'injury_hosp','상해재해입원일당':'injury_hosp','[갱신형]상해입원일당(1일이상)':'injury_hosp','재해입원':'injury_hosp','상해입원일당':'injury_hosp','재해입원일당':'injury_hosp','일반상해입원일당':'injury_hosp','상해 입원일당':'injury_hosp','질병일당':'disease_hosp','[갱신형]질병입원일당(1일이상)':'disease_hosp','질병입원일당(4-180)':'disease_hosp','질병입원일당':'disease_hosp','질병 입원일당':'disease_hosp','질병입원일당(1일이상)':'disease_hosp','1인실 입원일당':'general_hosp','1인실입원일당':'general_hosp','[통합간편]상급종합병원 1인실 입원일당(1일이상, 30일한도)':'general_hosp','[통합간편]종합병원 1인실 입원일당(1일이상, 30일한도)':'general_hosp','상급종합병원입원일당':'general_hosp','1인실입원급여금':'general_hosp','골절 진단비':'fracture','골절진단비':'fracture','골절치료자금':'fracture','골절진단비(치아파절제외)':'fracture','골절진단':'fracture','골절 치료비':'fracture','5대골절 진단비':'five_fracture','5대골절진단비':'five_fracture','5대골절진단':'five_fracture','5대골절 진단':'five_fracture','깁스치료비':'cast','깁스 치료비':'cast','석고붕대치료비':'cast','일반사망':'death_general','일반사망보험_신정원':'death_general','사망보험금':'death_general','일반사망보험금':'death_general','질병사망':'death_disease','유병자질병사망':'death_disease','질병사망보험금':'death_disease','질병사망(간편)':'death_disease','암사망':'death_cancer','암 사망':'death_cancer','암사망보험금':'death_cancer','상해사망':'death_injury','재해사망':'death_injury','상해재해사망':'death_injury','재해사망보험금_신정원':'death_injury','유병자상해사망':'death_injury','평일일반재해사망보험금':'death_injury','[통합간편]상해 사망':'death_injury','기본계약(상해사망후유장해(갱신형))담보':'death_injury','일반상해사망':'death_injury','상해사망후유장해':'death_injury','재해사망보험금':'death_injury','상해사망보험금':'death_injury','재해장해급부금':'death_injury','일반상해후유장해(3~100%)':'death_injury','자동차 부상치료비':'car_injury','자동차사고 부상치료비':'car_injury','자동차사고부상치료비':'car_injury','자동차사고부상치료비ⅸ(운전자)':'car_injury','[갱신형]자동차사고부상치료지원금(운전자용)':'car_injury','자동차부상치료비':'car_injury','자동차사고부상치료지원금':'car_injury','벌금':'car_fine','벌금(대인)':'car_fine','교통사고벌금':'car_fine','변호사 선임비용':'car_lawyer','변호사선임비용':'car_lawyer','자동차사고변호사선임비용':'car_lawyer','교통사고 변호사선임비용(추가보장)':'car_lawyer','변호사비용':'car_lawyer','자동차변호사선임비용':'car_lawyer','교통사고처리 지원금':'car_settlement','교통사고처리지원금':'car_settlement','사고처리지원금':'car_settlement','교통사고 처리지원금':'car_settlement','교통사고 처리지원금':'car_settlement','형사합의금지원':'car_settlement'};

const NORM_MAP = {};
for (const [k,v] of Object.entries(RAW_COV_MAP)) { NORM_MAP[k.toLowerCase().replace(/[\s\(\)\[\]·,\/ⅰⅱⅲⅳⅴⅸ\.\-]/g,'').replace(/[①②③④⑤]/g,'')] = v; }

function findCovKey(label) {
  const n = label.toLowerCase().replace(/[\s\(\)\[\]·,\/ⅰⅱⅲⅳⅴⅸ\.\-]/g,'').replace(/[①②③④⑤]/g,'');
  if (NORM_MAP[n]) return NORM_MAP[n];
  const keys = Object.keys(NORM_MAP).sort((a,b)=>b.length-a.length);
  for (const k of keys) { if (n.length >= 4 && (n.startsWith(k) || k.startsWith(n) || n.includes(k))) return NORM_MAP[k]; }
  return null;
}

function parseManwon(str) {
  if (!str) return 0;
  str = str.replace(/[,\s]/g,'').trim();
  let total = 0;
  const eok = str.match(/(\d+(?:\.\d+)?)억/);
  const man = str.match(/(\d+(?:\.\d+)?)만/);
  if (eok) total += Math.round(parseFloat(eok[1]) * 10000);
  if (man) total += Math.round(parseFloat(man[1]));
  if (!eok && !man) { const plain = str.match(/^(\d+)$/); if (plain) total = parseInt(plain[1]); }
  return total;
}

function fmtMan(v) {
  if (!v) return '';
  if (v >= 10000) { const decimal = v / 10000; return Number.isInteger(decimal) ? decimal + '억' : parseFloat(decimal.toFixed(1)) + '억'; }
  return v.toLocaleString() + '만';
}

function fmtWon(v) { return v ? v.toLocaleString() + '원' : ''; }

// ═══════════════════════════════════════════════
// 3. 주요 로직
// ═══════════════════════════════════════════════
let state = { companies: [], customerName: '' };

function parseText(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const STATUS_WORDS = new Set(['충분','부족','미가입','양호','과다','부족금액']);
  const compMap = {};
  let currentCovKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (STATUS_WORDS.has(line) || /^(부족금액|권장금액|가입금액)\s*[:：]/.test(line)) continue;
    
    const key = findCovKey(line);
    if (key) { currentCovKey = key; continue; }

    const isAmountLine = (s) => /(\d[\d,]*\s*(만원|억원|원|만|억))$/.test(s) || /^\d[\d,]*원$/.test(s);
    if (currentCovKey && isAmountLine(line)) {
      const productFull = lines[i-1] || '기타상품';
      const manwon = parseManwon(line);
      const companyName = guessCompany(productFull) || '기타';
      const mapKey = companyName + '|||' + productFull;
      if (!compMap[mapKey]) compMap[mapKey] = { name: companyName, product: productFull, premium: 0, coverages: {} };
      compMap[mapKey].coverages[currentCovKey] = (compMap[mapKey].coverages[currentCovKey] || 0) + manwon;
    }
  }
  return Object.values(compMap);
}

function startAnalysis() {
  const raw = document.getElementById('paste-text').value.trim();
  if (!raw) return;
  state.companies = parseText(raw);
  state.customerName = document.getElementById('customer-name').value.trim() || '고객';
  renderPreview();
  document.getElementById('result-card').style.display = 'block';
}

function renderPreview() {
  const co = state.companies;
  let html = '<table><tr><th>보험사</th><th>상품명</th><th>보험료</th>';
  COVERAGE_DEF.forEach(c => html += `<th>${c.label}</th>`);
  html += '</tr>';
  co.forEach(c => {
    html += `<tr><td>${c.name}</td><td>${c.product}</td><td>${fmtWon(c.premium)}</td>`;
    COVERAGE_DEF.forEach(cov => html += `<td>${fmtMan(c.coverages[cov.key])}</td>`);
    html += '</tr>';
  });
  html += '</table>';
  document.getElementById('preview-table').innerHTML = html;
}

window.startAnalysis = startAnalysis;
window.renderPreview = renderPreview;