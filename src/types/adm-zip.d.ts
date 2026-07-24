/**
 * adm-zip 최소 타입 선언 (ambient).
 * adm-zip 은 자체 타입을 제공하지 않아, @types/adm-zip 를 따로 설치하지 않고도
 * 관리자 업로드 라우트가 타입체크되도록 여기서 any 로 선언한다.
 * 런타임에는 반드시 `npm install adm-zip` 로 실제 패키지가 설치돼 있어야 한다.
 */
declare module "adm-zip";
