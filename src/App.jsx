import { useEffect, useRef } from 'react';
import { surveyMarkup } from './surveyMarkup';

const SCORE_LIMITS = { T: 30, E: 20, O: 19, R: 17, I: 14 };

function getNum(root, id) {
  const input = root.querySelector(`#${id}`);
  const value = input?.value?.replace(/,/g, '') ?? '0';
  const number = Number.parseFloat(value);
  return Number.isNaN(number) ? 0 : number;
}

function isChecked(root, id) {
  return Boolean(root.querySelector(`#${id}`)?.checked);
}

function calculateScore(root) {
  const K_CHUAN_1 = 200000000;
  let scoreT = 0;
  let scoreE = 0;
  let scoreO = 0;
  let scoreR = 0;
  let scoreI = 0;

  const gbd = getNum(root, 'b2_tong_giatri');
  const gsx = getNum(root, 'b3_tong_giatri');
  if (gbd > 0) {
    const depreciation = ((gbd - gsx) / gbd) * 100;
    scoreT += depreciation < 20 ? 5 : depreciation < 40 ? 4 : depreciation < 60 ? 3 : depreciation < 80 ? 2 : 1;
  }

  const gtbm1 = getNum(root, 'b4_tong_giatri');
  const gtbm2 = getNum(root, 'b5_tong_giatri');
  if (gsx > 0) {
    const renewalRate = (((2 * gtbm1 + gtbm2) / 2) / gsx) * 100;
    scoreT += renewalRate >= 75 ? 3 : renewalRate >= 50 ? 2 : renewalRate >= 25 ? 1 : 0;
  }

  const directWorkers = getNum(root, 'd1_congnhan_tt');
  let automationScore = 0;
  if (directWorkers > 0 && gsx > 0) {
    const automationValue = gsx / directWorkers;
    automationScore += automationValue >= 1.5 * K_CHUAN_1 ? 3 : automationValue >= K_CHUAN_1 ? 2 : automationValue >= 0.5 * K_CHUAN_1 ? 1 : 0;
  }
  ['d4_chk_pda', 'd4_chk_mdc', 'd4_chk_fms', 'd4_chk_cim'].forEach((id) => {
    if (isChecked(root, id)) automationScore += 1;
  });
  scoreT += Math.min(automationScore, 7);

  if (isChecked(root, 'c3_mucdo_4')) scoreE += 4;
  else if (isChecked(root, 'c3_mucdo_3')) scoreE += 3;
  else if (isChecked(root, 'c3_mucdo_2')) scoreE += 2;
  else if (isChecked(root, 'c3_mucdo_1')) scoreE += 1;

  const trainedWorkers = getNum(root, 'd1_congnhan_hln');
  const seniorWorkers = getNum(root, 'd1_congnhan_bc');
  const managers = getNum(root, 'd1_canbo_ql');
  const professionals = getNum(root, 'd1_canbo_nv');
  const indirectWorkers = getNum(root, 'd1_canbo_gt');
  if (directWorkers > 0 && indirectWorkers > 0) {
    const workforceQuality = (((trainedWorkers + seniorWorkers) / directWorkers + (managers + professionals) / indirectWorkers) / 2) * 100;
    scoreE += workforceQuality >= 25 ? 4 : workforceQuality >= 15 ? 3 : workforceQuality >= 5 ? 2 : workforceQuality >= 2.5 ? 1 : 0;
  }

  const informationSystems = ['d3_chk_mes', 'd3_chk_erp', 'd3_chk_plm', 'd3_chk_pdm', 'd3_chk_pps', 'd3_chk_scm'].filter((id) => isChecked(root, id)).length;
  scoreO += informationSystems >= 5 ? 5 : informationSystems;
  if (isChecked(root, 'd5_mt1')) scoreO += 3;
  else if (isChecked(root, 'd5_mt2')) scoreO += 2;
  else if (isChecked(root, 'd5_mt3')) scoreO += 1;

  if (isChecked(root, 'e1_infra_3')) scoreR += 3;
  else if (isChecked(root, 'e1_infra_2')) scoreR += 2;
  else if (isChecked(root, 'e1_infra_1')) scoreR += 1;
  if (isChecked(root, 'e3_rd_1')) scoreR += 2;
  else if (isChecked(root, 'e3_rd_2')) scoreR += 1;
  if (isChecked(root, 'e4_chk_quykhcn')) scoreR += 1;

  if (isChecked(root, 'q4_cb4')) scoreI += 4;
  else if (isChecked(root, 'q4_cb3')) scoreI += 3;
  else if (isChecked(root, 'q4_cb2')) scoreI += 2;
  else if (isChecked(root, 'q4_cb1')) scoreI += 1;

  const totalScore = scoreT + scoreE + scoreO + scoreR + scoreI;
  const normalized = (score, limit) => score / limit || 0.01;
  const syncCoefficient = Math.pow(normalized(scoreT, SCORE_LIMITS.T), 0.3)
    * Math.pow(normalized(scoreE, SCORE_LIMITS.E), 0.2)
    * Math.pow(normalized(scoreO, SCORE_LIMITS.O), 0.19)
    * Math.pow(normalized(scoreR, SCORE_LIMITS.R), 0.17)
    * Math.pow(normalized(scoreI, SCORE_LIMITS.I), 0.14);

  const classification = syncCoefficient >= 0.65 && totalScore >= 75
    ? 'TIÊN TIẾN'
    : syncCoefficient >= 0.5 && totalScore >= 60
      ? 'TRUNG BÌNH TIÊN TIẾN'
      : syncCoefficient >= 0.3 && totalScore >= 35
        ? 'TRUNG BÌNH'
        : 'LẠC HẬU';

  return { scoreT, scoreE, scoreO, scoreR, scoreI, totalScore, syncCoefficient, classification };
}

function renderScoreResult(root, scores) {
  const result = root.querySelector('#ketQuaDiem');
  const details = root.querySelector('#chiTietDiem');
  if (!result || !details) return;

  details.innerHTML = `
    <ul>
      <li><b>Nhóm T (Hiện trạng thiết bị - Max 30):</b> ${scores.scoreT.toFixed(2)} điểm</li>
      <li><b>Nhóm E (Hiệu quả khai thác - Max 20):</b> ${scores.scoreE.toFixed(2)} điểm</li>
      <li><b>Nhóm O (Tổ chức quản lý - Max 19):</b> ${scores.scoreO.toFixed(2)} điểm</li>
      <li><b>Nhóm R (Nghiên cứu phát triển - Max 17):</b> ${scores.scoreR.toFixed(2)} điểm</li>
      <li><b>Nhóm I (Đổi mới sáng tạo - Max 14):</b> ${scores.scoreI.toFixed(2)} điểm</li>
    </ul>
    <h3 style="color: #d32f2f;">TỔNG ĐIỂM: ${scores.totalScore.toFixed(2)} / 100</h3>
    <p><b>Hệ số đồng bộ (TĐB):</b> ${scores.syncCoefficient.toFixed(3)}</p>
    <h3>KẾT LUẬN PHÂN LOẠI: <span style="color: blue;">${scores.classification}</span></h3>
    <p><i>(Lưu ý: Điểm này được mô phỏng một phần dựa trên các trường dữ liệu hiện có trong biểu mẫu. Các tiêu chí cần so sánh với chuẩn ngành hoặc yêu cầu Báo cáo tài chính 3 năm sẽ cần điều chỉnh thêm dữ liệu đầu vào).</i></p>
    <p style="color: red;"><b>Nhu cầu tìm kiếm hoặc đổi mới công nghệ của doanh nghiệp trong thời gian tới:</b></p>
    <textarea id="c3_dexuat_txt" style="width:100%;height:80px;"></textarea>
  `;
  result.style.display = 'block';
}

function syncCloneValues(source, clone) {
  const sourceControls = source.querySelectorAll('input, textarea');
  const cloneControls = clone.querySelectorAll('input, textarea');
  cloneControls.forEach((control, index) => {
    const sourceControl = sourceControls[index];
    if (!sourceControl) return;
    if (control.type === 'checkbox' || control.type === 'radio') {
      control.toggleAttribute('checked', sourceControl.checked);
    } else if (control.tagName.toLowerCase() === 'textarea') {
      control.innerHTML = sourceControl.value;
    } else {
      control.setAttribute('value', sourceControl.value);
    }
  });
}

function convertCloneControls(clone) {
  clone.querySelectorAll('input').forEach((input) => {
    const span = document.createElement('span');
    span.style.fontFamily = 'Arial, sans-serif';
    if (input.type === 'checkbox') {
      span.innerHTML = input.hasAttribute('checked') ? '&#9745; ' : '&#9744; ';
    } else if (input.type === 'radio') {
      span.innerHTML = input.hasAttribute('checked') ? '&#9673; ' : '&#9711; ';
    } else {
      span.innerText = input.getAttribute('value') || '.........................';
      span.style.fontWeight = 'bold';
    }
    input.parentNode.replaceChild(span, input);
  });

  clone.querySelectorAll('textarea').forEach((textarea) => {
    const div = document.createElement('div');
    div.innerText = textarea.innerHTML || '.........................';
    div.style.fontWeight = 'bold';
    textarea.parentNode.replaceChild(div, textarea);
  });
}

function downloadWord(root) {
  const form = root.querySelector('.container');
  const result = root.querySelector('#ketQuaDiem');
  if (!form) return;

  const formClone = form.cloneNode(true);
  const resultClone = result?.cloneNode(true);
  formClone.querySelector('#ketQuaDiem')?.remove();
  syncCloneValues(form, formClone);
  convertCloneControls(formClone);
  if (resultClone) {
    syncCloneValues(result, resultClone);
    convertCloneControls(resultClone);
  }

  const logo = formClone.querySelector('img[src="logo.png"]');
  logo?.closest('div')?.remove();
  const content = `
    <h2 style="text-align: center;">BÁO CÁO KHẢO SÁT VÀ KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC CÔNG NGHỆ</h2>
    <hr>
    <h3>I. THÔNG TIN KHẢO SÁT DOANH NGHIỆP</h3>
    ${formClone.innerHTML}
    <br><br><hr><br>
    <h3>II. KẾT QUẢ ĐÁNH GIÁ TRÌNH ĐỘ VÀ NĂNG LỰC CÔNG NGHỆ</h3>
    ${resultClone?.innerHTML ?? ''}
  `;
  const source = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Export HTML to Word</title><style>body{font-family:'Times New Roman',Times,serif;font-size:14pt;line-height:1.5}table{width:100%;border-collapse:collapse;margin-bottom:10px}table,th,td{border:1px solid #000;padding:8px}</style></head><body>${content}</body></html>`;
  const blob = new Blob(['﻿', source], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'KetQua_DanhGia_NangLuc_CongNghe.doc';
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const toggleOtherField = () => {
      const selected = root.querySelector('#linhvucKhac')?.checked;
      const box = root.querySelector('#khacBox');
      const input = root.querySelector('#linhvucKhacText');
      if (box) box.style.display = selected ? 'block' : 'none';
      if (input) {
        input.required = Boolean(selected);
        if (!selected) input.value = '';
      }
    };

    const toggleRepairDetails = () => {
      const checked = root.querySelector('#repairDept')?.checked;
      const detail = root.querySelector('#repairDeptDetail');
      if (detail) detail.style.display = checked ? 'block' : 'none';
    };

    const onClick = (event) => {
      const section = event.target.closest('.section');
      if (section && root.contains(section)) {
        const content = section.nextElementSibling;
        if (content) content.style.display = content.style.display === 'none' || !content.style.display ? 'block' : 'none';
        return;
      }
      if (event.target.closest('#calculateButton')) {
        renderScoreResult(root, calculateScore(root));
      }
      if (event.target.closest('#exportButton')) {
        renderScoreResult(root, calculateScore(root));
        downloadWord(root);
      }
    };

    const onChange = (event) => {
      if (event.target.name === 'linhvuc') toggleOtherField();
      if (event.target.id === 'repairDept') toggleRepairDetails();
    };

    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    toggleOtherField();
    toggleRepairDetails();

    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
    };
  }, []);

  return (
    <main ref={rootRef} className="survey-app" dangerouslySetInnerHTML={{ __html: surveyMarkup }} />
  );
}
