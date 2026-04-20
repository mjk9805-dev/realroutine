# 루틴 매니저 PWA

체크형 루틴과 누적형 루틴을 함께 관리하는 설치형 PWA 앱입니다.

## 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## Netlify 배포

이 프로젝트는 `netlify.toml` 이 포함되어 있어 바로 배포할 수 있습니다.

### 방법 1: Git 연결
1. GitHub 등에 업로드
2. Netlify에서 **Add new project** 선택
3. 저장소 연결
4. 자동 감지된 설정으로 배포

### 방법 2: 수동 업로드
1. 아래 명령으로 빌드
   ```bash
   npm install
   npm run build
   ```
2. 생성된 `dist` 폴더를 Netlify에 드래그 앤 드롭

## PWA 설치

### iPhone
Safari에서 사이트 열기 → 공유 버튼 → **홈 화면에 추가**

### Android
Chrome에서 사이트 열기 → 메뉴 → **앱 설치** 또는 **홈 화면에 추가**

## 주요 기능
- 체크형 루틴
- 누적형 루틴(페이지, 분 등)
- 일/주/월 기록 확인
- 주간/월간 점검 기록
- 로컬 저장
