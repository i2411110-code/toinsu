// name-input-modal.js
// -----------------------------------------------------------------------
// 카카오 로그인(닉네임만 제공) 이후, Firestore에 실명(name)이 없는 사용자에게
// 이름 입력을 강제하는 모달 컴포넌트 + 연동 함수.
// 순수 HTML/Vanilla JS + Firebase(Firestore) 환경 기준, 별도 프레임워크 불필요.
//
// 사용법 (기존 카카오 로그인 성공 콜백 안에서):
//
//   import { getFirestore } from 'firebase/firestore';
//   import { checkAndPromptUserName } from './name-input-modal.js';
//
//   const db = getFirestore();
//   const { token, uid, displayName } = await res.json(); // kakao-auth API 응답
//   await signInWithCustomToken(auth, token);
//   await checkAndPromptUserName(db, uid, displayName);
//
// -----------------------------------------------------------------------

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

// ── 스타일 주입 (최초 1회만) ─────────────────────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    .nim-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.2s ease;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .nim-overlay.nim-show {
      opacity: 1;
    }
    .nim-modal {
      background: #ffffff;
      border-radius: 20px;
      width: 90%;
      max-width: 360px;
      padding: 28px 24px 24px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
      transform: translateY(12px);
      transition: transform 0.2s ease;
    }
    .nim-overlay.nim-show .nim-modal {
      transform: translateY(0);
    }
    .nim-title {
      font-size: 19px;
      font-weight: 700;
      color: #191F28;
      margin: 0 0 8px;
    }
    .nim-desc {
      font-size: 14px;
      color: #8B95A1;
      line-height: 1.5;
      margin: 0 0 20px;
    }
    .nim-input {
      width: 100%;
      box-sizing: border-box;
      font-size: 16px;
      padding: 14px 16px;
      border: 1.5px solid #E5E8EB;
      border-radius: 12px;
      outline: none;
      transition: border-color 0.15s ease;
      color: #191F28;
    }
    .nim-input:focus {
      border-color: #3182F6;
    }
    .nim-error {
      font-size: 13px;
      color: #F04452;
      margin: 8px 0 0;
      min-height: 16px;
    }
    .nim-submit {
      width: 100%;
      margin-top: 16px;
      padding: 14px 0;
      background: #3182F6;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    .nim-submit:disabled {
      background: #B0C4DE;
      cursor: not-allowed;
    }
    .nim-submit:not(:disabled):hover {
      background: #1B64DA;
    }
  `;
  document.head.appendChild(style);
}

// ── 모달 표시 ────────────────────────────────────────────────────────────
/**
 * 이름 입력 모달을 띄운다. 실명 확인이 필요한 서비스 특성상
 * 배경 클릭/ESC로 닫히지 않으며, 유효한 이름을 입력해야 닫힌다.
 *
 * @param {Object} options
 * @param {string} [options.defaultValue] - 입력창 기본값 (카카오 닉네임 등)
 * @param {(name: string) => Promise<void>} options.onSubmit - 제출 시 호출, 실패 시 throw
 */
function showNameInputModal({ defaultValue = '', onSubmit }) {
  injectStyles();

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'nim-overlay';
    overlay.innerHTML = `
      <div class="nim-modal">
        <p class="nim-title">이름을 입력해 주세요</p>
        <p class="nim-desc">보험 업무 처리를 위해 실명 확인이 필요합니다.<br>정확한 이름을 입력해 주세요.</p>
        <input class="nim-input" type="text" placeholder="홍길동" maxlength="20" />
        <p class="nim-error"></p>
        <button class="nim-submit" disabled>확인</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('nim-show'));

    const input = overlay.querySelector('.nim-input');
    const errorEl = overlay.querySelector('.nim-error');
    const submitBtn = overlay.querySelector('.nim-submit');

    input.value = defaultValue;
    input.focus();

    // 한글/영문 2자 이상 (숫자/특수문자/공백만 있는 값 방지)
    const isValidName = (v) => /^[가-힣a-zA-Z\s]{2,20}$/.test(v.trim());

    function updateButtonState() {
      submitBtn.disabled = !isValidName(input.value);
    }
    input.addEventListener('input', () => {
      errorEl.textContent = '';
      updateButtonState();
    });
    updateButtonState();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled) submit();
    });
    submitBtn.addEventListener('click', submit);

    async function submit() {
      const name = input.value.trim();
      if (!isValidName(name)) {
        errorEl.textContent = '이름은 한글 또는 영문 2자 이상으로 입력해 주세요.';
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '저장 중...';
      try {
        await onSubmit(name);
        overlay.classList.remove('nim-show');
        setTimeout(() => {
          overlay.remove();
          resolve(name);
        }, 200);
      } catch (err) {
        console.error('이름 저장 실패:', err);
        errorEl.textContent = '저장 중 오류가 발생했습니다. 다시 시도해 주세요.';
        submitBtn.disabled = false;
        submitBtn.textContent = '확인';
      }
    }
  });
}

// ── Firestore 연동 함수 ─────────────────────────────────────────────────
/**
 * users/{uid} 문서에 name 필드가 없으면 모달을 띄워 입력받고 저장한다.
 * 이미 이름이 있으면 아무 동작도 하지 않고 바로 반환한다.
 *
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} uid - Firebase Auth uid (예: kakao-auth API가 반환한 uid)
 * @param {string} [kakaoDisplayName] - 카카오 닉네임, 입력창 기본값으로 사용
 * @returns {Promise<string|null>} 최종 이름 (이미 있었거나 새로 입력한 값), 실패 시 null
 */
export async function checkAndPromptUserName(db, uid, kakaoDisplayName) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const existingName = snap.exists() ? snap.data().name : null;

  if (existingName) {
    return existingName; // 이미 이름이 있으면 모달 없이 통과
  }

  const name = await showNameInputModal({
    defaultValue: kakaoDisplayName || '',
    onSubmit: async (inputName) => {
      await setDoc(
        userRef,
        {
          name: inputName,
          nickname: kakaoDisplayName || null,
          updatedAt: serverTimestamp(),
          ...(snap.exists() ? {} : { createdAt: serverTimestamp() })
        },
        { merge: true }
      );
    }
  });

  return name;
}

export { showNameInputModal };