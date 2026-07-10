/**
 * 학과 마스터 + 학과별 주제/저널/교과목 풀 (v1.2 — 국민대 현행 규정 반영).
 * v1.1 대비: 6계열(의학 포함) → 신형 계열그룹 5종(G_HSSP/G_ENA/G_ENB/G_ENC/G_ART),
 * 의학 계열 삭제(국민대 의대 없음), 학과 매핑 교체. λ·저자수 세분화를 위해 field 축 병기.
 * 드릴다운 정합: 논문/과제/특허 제목은 이 풀에서 조합(시드 고정).
 */

// 신형 계열그룹 (별표1-1-6/7/7-1) — quality gate·criteria·benchmark의 기준 축
export type Group = "G_HSSP" | "G_ENA" | "G_ENB" | "G_ENC" | "G_ART";
// 세분 field — 분포(λ·저자수) 라우팅용
export type Field = "인문" | "사회" | "경상" | "체육" | "예능" | "ENA" | "ENB" | "ENC";

export interface DeptDef {
  code: string;
  name: string;
  group: Group;
  field: Field;
  college: string;
  topics: string[];
  enTopics: string[];
  courses: string[];
}

// prettier-ignore
export const DEPARTMENTS: DeptDef[] = [
  // ── G_HSSP 인문 (8) ──
  { code:"KOR", name:"국어국문학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["현대 한국소설","훈민정음 표기","방언 음운론","한국 현대시","고전문학 서사","국어 통사구조","한국어 담화 분석","근대 계몽기 문학"],
    enTopics:["Korean Modern Poetry","Korean Syntax","Dialect Phonology"],
    courses:["국어학개론","현대문학사","고전소설론","한국어문법론","문학비평론"] },
  { code:"ENG", name:"영어영문학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["셰익스피어 비극","영미 모더니즘 소설","영어 통사론","제2언어 습득","포스트콜로니얼 문학","영시의 운율","담화 화용론","영미 드라마"],
    enTopics:["Shakespearean Tragedy","Second Language Acquisition","Postcolonial Literature","English Syntax","Discourse Pragmatics"],
    courses:["영문학개론","영어음성학","영미소설","영어통사론","셰익스피어"] },
  { code:"CHN", name:"중국학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["중국 고전시","현대 중국어 문법","한중 번역","중국 근현대사","중국어 성조","당송 산문"],
    enTopics:["Classical Chinese Poetry","Modern Chinese Grammar"],
    courses:["중국어회화","중국문학사","한중번역","중국어작문"] },
  { code:"HIS", name:"한국역사학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["조선후기 사회사","고려 정치제도","근대 개항기","한국 독립운동","조선 성리학","삼국시대 대외관계"],
    enTopics:["Late Joseon Society","Korean Independence Movement"],
    courses:["한국고대사","조선시대사","한국근현대사","사료강독"] },
  { code:"PHI", name:"철학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["칸트 윤리학","현상학적 지향성","동양 형이상학","분석철학 언어","니체 계보학","정치철학 정의론"],
    enTopics:["Kantian Ethics","Phenomenological Intentionality","Philosophy of Language"],
    courses:["서양철학사","윤리학","동양철학","논리학"] },
  { code:"JPN", name:"일본학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["일본 근대문학","일본어 경어법","일본 대중문화","한일 비교문화","일본어 조사"],
    enTopics:["Japanese Modern Literature","Japanese Honorifics"],
    courses:["일본어회화","일본문학사","일본어문법","일본문화론"] },
  { code:"EDU", name:"교육학과", group:"G_HSSP", field:"인문", college:"사범대학",
    topics:["교육과정 재구성","학습동기 이론","교사 전문성","디지털 리터러시 교육","형성평가 설계","협력학습 모형"],
    enTopics:["Curriculum Design","Learning Motivation","Formative Assessment"],
    courses:["교육학개론","교육심리","교육평가","교육과정론"] },
  { code:"LIS", name:"문헌정보학과", group:"G_HSSP", field:"인문", college:"글로벌인문지역대학",
    topics:["도서관 정보서비스","메타데이터 설계","디지털 아카이브","이용자 정보행태","서지 분류체계"],
    enTopics:["Metadata Design","Digital Archives","Information Behavior"],
    courses:["정보조직론","정보검색","기록관리학","도서관경영"] },

  // ── G_HSSP 사회 (6) ──
  { code:"PAD", name:"행정학과", group:"G_HSSP", field:"사회", college:"사회과학대학",
    topics:["지방분권 거버넌스","정책집행 분석","공공서비스 성과","전자정부","규제개혁","예산과정 정치"],
    enTopics:["Local Governance","Policy Implementation","E-Government","Public Service Performance"],
    courses:["행정학원론","정책학","조직론","지방자치론"] },
  { code:"POL", name:"정치외교학과", group:"G_HSSP", field:"사회", college:"사회과학대학",
    topics:["선거제도 개혁","동북아 안보","국제 협상","비교 정당체계","정치 양극화","외교정책 결정"],
    enTopics:["Electoral Reform","Northeast Asian Security","International Negotiation"],
    courses:["정치학개론","국제정치","비교정치","외교사"] },
  { code:"SOC", name:"사회학과", group:"G_HSSP", field:"사회", college:"사회과학대학",
    topics:["사회 불평등","노동시장 이중구조","가족구조 변화","사회연결망","이민과 다문화","세대 갈등"],
    enTopics:["Social Inequality","Labor Market Segmentation","Social Networks"],
    courses:["사회학개론","사회통계","사회조사방법","현대사회론"] },
  { code:"MED2", name:"미디어광고학과", group:"G_HSSP", field:"사회", college:"사회과학대학",
    topics:["소셜미디어 참여","광고 설득효과","뉴스 프레이밍","브랜디드 콘텐츠","미디어 이용행태"],
    enTopics:["Social Media Engagement","Advertising Persuasion","News Framing"],
    courses:["광고론","미디어효과론","커뮤니케이션이론","콘텐츠기획"] },
  { code:"LAW", name:"법학과", group:"G_HSSP", field:"사회", college:"법과대학",
    topics:["헌법상 기본권","계약법 해석","형법 책임론","행정소송","지식재산권","노동법 판례"],
    enTopics:["Constitutional Rights","Contract Interpretation","Intellectual Property Law"],
    courses:["헌법","민법총칙","형법각론","행정법"] },
  { code:"PSY", name:"심리학과", group:"G_HSSP", field:"사회", college:"사회과학대학",
    topics:["작업기억 용량","정서 조절","사회적 인지","의사결정 편향","발달 애착","임상 우울"],
    enTopics:["Working Memory","Emotion Regulation","Social Cognition","Decision Bias"],
    courses:["심리학개론","인지심리","발달심리","심리통계"] },

  // ── G_HSSP 경상 (4) ──
  { code:"ECO", name:"경제학과", group:"G_HSSP", field:"경상", college:"경상대학",
    topics:["통화정책 파급효과","노동수요 탄력성","행동경제학 편향","무역 자유화","소득분배","거시 경기변동"],
    enTopics:["Monetary Policy Transmission","Behavioral Economics","Income Distribution","Trade Liberalization"],
    courses:["미시경제학","거시경제학","계량경제학","화폐금융론"] },
  { code:"BIZ", name:"경영학과", group:"G_HSSP", field:"경상", college:"경영대학",
    topics:["기업 지배구조","브랜드 자산","공급사슬 관리","조직 몰입","재무 성과","마케팅 전략"],
    enTopics:["Corporate Governance","Brand Equity","Supply Chain Management","Organizational Commitment"],
    courses:["경영학원론","마케팅관리","재무관리","조직행동론"] },
  { code:"ITR", name:"국제통상학과", group:"G_HSSP", field:"경상", college:"경상대학",
    topics:["FTA 효과 분석","글로벌 가치사슬","환율과 수출","통상 분쟁","해외직접투자"],
    enTopics:["FTA Effects","Global Value Chains","Foreign Direct Investment"],
    courses:["국제무역론","국제금융","통상정책","무역실무"] },
  { code:"BDM", name:"빅데이터경영통계학과", group:"G_HSSP", field:"경상", college:"경영대학",
    topics:["비즈니스 애널리틱스","수요 예측","고객 세분화","마케팅 계량 모델","리스크 스코어링"],
    enTopics:["Business Analytics","Demand Forecasting","Customer Segmentation"],
    courses:["경영통계","데이터마이닝","예측분석","비즈니스인텔리전스"] },

  // ── G_HSSP 체육 (2) ──
  { code:"PHE", name:"체육학과", group:"G_HSSP", field:"체육", college:"예술체육대학",
    topics:["운동 생리 반응","스포츠 심리","운동학습 제어","트레이닝 프로그램","생활체육 참여"],
    enTopics:["Exercise Physiology","Sport Psychology","Motor Learning and Control"],
    courses:["운동생리학","스포츠심리학","운동역학","트레이닝방법론"] },
  { code:"SPT", name:"스포츠건강재활학과", group:"G_HSSP", field:"체육", college:"예술체육대학",
    topics:["운동 재활 중재","근골격 손상 예방","만성질환 운동처방","노인 신체활동","재활 트레이닝"],
    enTopics:["Exercise Rehabilitation","Musculoskeletal Injury","Physical Activity in Aging"],
    courses:["운동재활학","운동처방","건강운동관리","재활트레이닝"] },

  // ── G_ENA 공학·자연 A (8) ──
  { code:"PHY", name:"물리학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["응집물질 상전이","양자 얽힘","광자 결정","반도체 밴드구조","비선형 동역학","초전도 특성"],
    enTopics:["Condensed Matter Phase Transition","Quantum Entanglement","Semiconductor Band Structure","Superconductivity"],
    courses:["일반물리학","양자역학","전자기학","고체물리"] },
  { code:"CHE", name:"화학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["유기 촉매 반응","전이금속 착물","분광학적 분석","고분자 합성","전기화학 셀","분자 동역학"],
    enTopics:["Organocatalysis","Transition Metal Complexes","Polymer Synthesis","Electrochemical Cells"],
    courses:["일반화학","유기화학","물리화학","분석화학"] },
  { code:"BIO", name:"생명과학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["세포 신호전달","유전자 발현 조절","단백질 구조","미생물 대사","면역세포 분화","암 유전체"],
    enTopics:["Cell Signaling","Gene Expression Regulation","Protein Structure","Microbial Metabolism"],
    courses:["일반생물학","분자생물학","세포생물학","유전학"] },
  { code:"FDN", name:"식품영양학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["기능성 식품 성분","영양소 대사","식이와 만성질환","식품 안전성","장내 미생물"],
    enTopics:["Functional Food Components","Nutrient Metabolism","Gut Microbiome"],
    courses:["영양학","식품화학","조리과학","임상영양"] },
  { code:"NEP", name:"나노전자물리학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["2차원 나노소재","양자점 발광","스핀트로닉스","나노박막 성장","전자소자 계면"],
    enTopics:["2D Nanomaterials","Quantum Dot Emission","Spintronics","Nanoscale Thin Films"],
    courses:["나노물리","반도체소자","박막공학","전자재료"] },
  { code:"BFC", name:"바이오발효융합학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["발효 미생물 공정","효소 생촉매","대사공학","천연물 생합성","바이오 소재"],
    enTopics:["Fermentation Bioprocess","Enzyme Biocatalysis","Metabolic Engineering"],
    courses:["미생물학","발효공학","생화학","대사공학"] },
  { code:"MSE", name:"신소재공학과", group:"G_ENA", field:"ENA", college:"창의공과대학",
    topics:["고엔트로피 합금","세라믹 소결","박막 증착","리튬전지 전극","복합재료 계면","금속 상변태"],
    enTopics:["High-Entropy Alloys","Ceramic Sintering","Thin Film Deposition","Lithium Battery Electrodes","Composite Interfaces"],
    courses:["재료과학","금속재료","세라믹공학","재료물성"] },
  { code:"BPH", name:"바이오의약공학과", group:"G_ENA", field:"ENA", college:"과학기술대학",
    topics:["바이오의약품 정제","항체 생산 공정","백신 플랫폼","세포치료제","약물 스크리닝"],
    enTopics:["Biopharmaceutical Purification","Antibody Process Development","Vaccine Platform"],
    courses:["생물공학","의약품제조","단백질공학","세포배양공학"] },

  // ── G_ENB 공학·자연 B (9) ──
  { code:"MAT", name:"수학과", group:"G_ENB", field:"ENB", college:"과학기술대학",
    topics:["편미분방정식 해","대수적 위상","확률 수렴","최적화 알고리즘","정수론적 함수","그래프 스펙트럼"],
    enTopics:["Partial Differential Equations","Algebraic Topology","Stochastic Convergence","Graph Spectra"],
    courses:["미적분학","선형대수","해석학","위상수학"] },
  { code:"STA", name:"통계학과", group:"G_ENB", field:"ENB", college:"과학기술대학",
    topics:["베이지안 추론","고차원 회귀","시계열 예측","생존분석","인과추론","혼합모형"],
    enTopics:["Bayesian Inference","High-Dimensional Regression","Time Series Forecasting","Causal Inference"],
    courses:["수리통계","회귀분석","시계열분석","데이터마이닝"] },
  { code:"EAR", name:"지구환경과학과", group:"G_ENB", field:"ENB", college:"과학기술대학",
    topics:["대기 미세먼지","지하수 오염","기후변화 모델","지진 파형","해양 순환","토양 지구화학"],
    enTopics:["Atmospheric Particulate Matter","Groundwater Contamination","Climate Modeling","Seismic Waveform"],
    courses:["일반지구과학","대기과학","환경지질","기후학"] },
  { code:"MEC", name:"기계공학과", group:"G_ENB", field:"ENB", college:"창의공과대학",
    topics:["유동 난류 해석","구조 피로 파괴","열전달 최적화","로봇 매니퓰레이터","진동 제어","적층제조 공정"],
    enTopics:["Turbulent Flow Analysis","Structural Fatigue","Heat Transfer Optimization","Robotic Manipulators","Additive Manufacturing"],
    courses:["열역학","유체역학","고체역학","기계설계","동역학"] },
  { code:"EEE", name:"전자공학과", group:"G_ENB", field:"ENB", college:"창의공과대학",
    topics:["아날로그 IC 설계","무선통신 채널","전력전자 컨버터","임베디드 신호처리","안테나 방사","저전력 회로"],
    enTopics:["Analog IC Design","Wireless Channel Estimation","Power Electronic Converters","Embedded Signal Processing"],
    courses:["회로이론","전자회로","디지털논리","통신공학","신호및시스템"] },
  { code:"AUT", name:"자동차공학과", group:"G_ENB", field:"ENB", college:"자동차융합대학",
    topics:["전기차 파워트레인","자율주행 인지","차량 동역학 제어","배터리 열관리","경량 차체","ADAS 센서융합"],
    enTopics:["EV Powertrain","Autonomous Perception","Vehicle Dynamics Control","Battery Thermal Management","Sensor Fusion for ADAS"],
    courses:["자동차공학개론","내연기관","차량동역학","자율주행시스템"] },
  { code:"CHEG", name:"화학공학과", group:"G_ENB", field:"ENB", college:"창의공과대학",
    topics:["촉매 반응공학","분리막 공정","공정 최적화","연료전지 촉매","고분자 반응","이산화탄소 포집"],
    enTopics:["Catalytic Reaction Engineering","Membrane Separation","Fuel Cell Catalysis","CO2 Capture"],
    courses:["화공열역학","반응공학","분리공정","공정제어"] },
  { code:"FORS", name:"임산생명공학과", group:"G_ENB", field:"ENB", college:"과학기술대학",
    topics:["목재 물성","산림 탄소저장","펄프·제지 공정","목질 바이오매스","산림 생태계"],
    enTopics:["Wood Physical Properties","Forest Carbon Storage","Lignocellulosic Biomass"],
    courses:["임산공학","목재물리","산림생태학","제지공학"] },
  { code:"MOB", name:"미래모빌리티학과", group:"G_ENB", field:"ENB", college:"자동차융합대학",
    topics:["전기추진 시스템","자율주행 제어","모빌리티 플랫폼","배터리 관리 시스템","차량 네트워크"],
    enTopics:["Electric Propulsion","Autonomous Control","Battery Management System"],
    courses:["모빌리티공학","전기추진","자율주행제어","차량시스템"] },

  // ── G_ENC 공학·자연 C (4) ──
  { code:"CSE", name:"컴퓨터공학과", group:"G_ENC", field:"ENC", college:"소프트웨어융합대학",
    topics:["분산 시스템 합의","그래프 신경망","데이터베이스 질의 최적화","네트워크 보안","운영체제 스케줄링","엣지 컴퓨팅"],
    enTopics:["Distributed Consensus","Graph Neural Networks","Query Optimization","Network Security","Edge Computing"],
    courses:["자료구조","알고리즘","운영체제","컴퓨터네트워크","데이터베이스"] },
  { code:"SWE", name:"소프트웨어학과", group:"G_ENC", field:"ENC", college:"소프트웨어융합대학",
    topics:["마이크로서비스 아키텍처","자동화 테스트","프로그램 정적분석","대규모 언어모델 응용","소프트웨어 결함 예측","클라우드 오케스트레이션"],
    enTopics:["Microservice Architecture","Automated Testing","Static Program Analysis","Large Language Model Applications","Software Defect Prediction"],
    courses:["프로그래밍기초","소프트웨어공학","웹프로그래밍","오픈소스개발","머신러닝"] },
  { code:"CIV", name:"건설시스템공학과", group:"G_ENC", field:"ENC", college:"창의공과대학",
    topics:["교량 구조해석","지반 침하","하천 수리","콘크리트 내구성","상수도 처리","교통 흐름 모델"],
    enTopics:["Bridge Structural Analysis","Ground Settlement","River Hydraulics","Concrete Durability","Water Treatment"],
    courses:["구조역학","토질역학","수리학","환경공학","측량학"] },
  { code:"AII", name:"인공지능학과", group:"G_ENC", field:"ENC", college:"소프트웨어융합대학",
    topics:["심층 강화학습","트랜스포머 사전학습","연합학습 프라이버시","멀티모달 표현학습","설명가능 AI","확산 생성모델"],
    enTopics:["Deep Reinforcement Learning","Transformer Pretraining","Federated Learning Privacy","Multimodal Representation Learning","Diffusion Generative Models"],
    courses:["기계학습","딥러닝","자연어처리","컴퓨터비전","강화학습"] },

  // ── G_ART 예능 (9) ──
  { code:"VCD", name:"시각디자인학과", group:"G_ART", field:"예능", college:"조형대학",
    topics:["타이포그래피 시스템","브랜드 아이덴티티","정보 시각화","모션 그래픽","편집디자인"],
    enTopics:["Typographic Systems","Brand Identity","Information Visualization"],
    courses:["시각디자인기초","타이포그래피","브랜드디자인","편집디자인"] },
  { code:"IDE", name:"산업디자인학과", group:"G_ART", field:"예능", college:"조형대학",
    topics:["사용자 경험 설계","제품 인터랙션","서비스 디자인","지속가능 제품","인간공학 인터페이스"],
    enTopics:["User Experience Design","Product Interaction","Sustainable Product Design"],
    courses:["제품디자인","인터랙션디자인","디자인방법론","사용자연구"] },
  { code:"MET", name:"금속공예학과", group:"G_ART", field:"예능", college:"조형대학",
    topics:["장신구 조형","금속 표면기법","현대 공예 담론","주얼리 디자인"],
    enTopics:["Metal Jewelry Form","Surface Techniques in Metalcraft"],
    courses:["금속공예기초","주얼리디자인","금속조형","공예사"] },
  { code:"CER", name:"도자공예학과", group:"G_ART", field:"예능", college:"조형대학",
    topics:["청자 유약 재현","현대 도예 조형","도자 표면장식","생활도자 개발"],
    enTopics:["Celadon Glaze Reproduction","Contemporary Ceramic Form"],
    courses:["도자공예기초","유약연구","물레성형","도예사"] },
  { code:"FAS", name:"의상디자인학과", group:"G_ART", field:"예능", college:"조형대학",
    topics:["지속가능 패션","텍스타일 패턴","한복 현대화","패션 컬렉션 기획"],
    enTopics:["Sustainable Fashion","Textile Pattern Design"],
    courses:["패션디자인","의복구성","텍스타일디자인","패션마케팅"] },
  { code:"PFA", name:"공연예술학과", group:"G_ART", field:"예능", college:"예술대학",
    topics:["현대무용 안무","연극 연출방법","무대 공간연출","신체 표현훈련"],
    enTopics:["Contemporary Dance Choreography","Theatre Directing Methods"],
    courses:["연기실습","무용실기","연출론","무대예술"] },
  { code:"MUS", name:"음악학과", group:"G_ART", field:"예능", college:"예술대학",
    topics:["작곡 화성기법","음악 분석","연주 해석","전자음악 작곡","국악 창작"],
    enTopics:["Compositional Harmony","Music Analysis","Electronic Music Composition"],
    courses:["화성학","음악사","연주실기","작곡법"] },
  { code:"ARC", name:"건축학과", group:"G_ART", field:"예능", college:"건축대학",
    topics:["친환경 건축설계","도시 공공공간","BIM 기반 설계","건축 공간 프로그래밍","도시 재생 설계"],
    enTopics:["Sustainable Building Design","Urban Public Space","BIM-Based Design"],
    courses:["건축설계","건축구조","건축환경","도시계획"] },
  { code:"CRA", name:"공업디자인학과", group:"G_ART", field:"예능", college:"조형대학",
    topics:["가전 제품 조형","모빌리티 디자인","친환경 소재 적용","리빙 제품 개발"],
    enTopics:["Product Form Design","Mobility Design","Sustainable Materials in Design"],
    courses:["공업디자인","모형제작","디자인렌더링","제품기획"] },
];

export const GROUP_LIST: Group[] = ["G_HSSP", "G_ENA", "G_ENB", "G_ENC", "G_ART"];
export const FIELD_LIST: Field[] = ["인문", "사회", "경상", "체육", "예능", "ENA", "ENB", "ENC"];

/** 이공계(공학·자연 A/B/C) 여부 — 게재관행·저자수 분기 */
export function isSciGroup(g: Group): boolean {
  return g === "G_ENA" || g === "G_ENB" || g === "G_ENC";
}
export function isArtGroup(g: Group): boolean {
  return g === "G_ART";
}
