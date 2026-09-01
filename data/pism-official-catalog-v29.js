(function(){
'use strict';
const Y=(year,day1,day2,legacySplit=false)=>({year,legacySplit,days:{1:{source:day1,minutes:240},2:{source:day2,minutes:240}}});
const years=[
 Y(2017,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/vestibular-pism-2017/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/vestibular-pism-2017/',true),
 Y(2018,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/vestibular-pism-2018/provas-e-gabaritos-1-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/vestibular-pism-2018/provas-e-gabaritos-2-dia/',true),
 Y(2019,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/vestibular-pism-2019/provas-e-gabaritos-dia-1/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/vestibular-pism-2019/provas-e-gabaritos-dia-2/'),
 Y(2020,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism2020/provas-e-gabaritos-1-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism2020/provas-e-gabaritos-2-dia/'),
 Y(2021,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2021/provas-e-gabaritos-1-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2021/provas-e-gabaritos-2-dia/'),
 Y(2022,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2022/provas-e-gabaritos-1-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2022/provas-e-gabaritos-2-dia/'),
 Y(2023,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2023/provas-e-gabaritos-1o-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2023/provas-e-gabaritos-2o-dia/'),
 Y(2024,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2024/2024-provas-e-gabaritos-1o-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2024/2024-provas-e-gabaritos-2o-dia/'),
 Y(2025,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2024/2025-provas-e-gabaritos-1o-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2025/provas-e-gabaritos-2o-dia/'),
 Y(2026,'https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2026/provas-e-gabaritos-1o-dia/','https://www2.ufjf.br/copese/vestibular-pism-2/vestibular-pism-edicoes-anteriores/pism-2026/provas-e-gabaritos-2o-dia/')
];
window.GABARITO_PISM_CATALOG={version:'2.9.0',provider:'UFJF/COPESE',years,modules:['I','II','III'],areas:['Economia e Administração','Exatas','Humanas','Saúde'],objectiveCount:20,totalCanonicalDays:years.length*3*2};
})();
