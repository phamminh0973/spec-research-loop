# Nhật ký triển khai — 5 phần đã bổ sung cho SpecResearch Loop

Tài liệu này liệt kê **toàn bộ file đã tạo mới / chỉnh sửa** qua 5 phần làm việc, file đó dùng để làm gì, và cách chạy/kiểm tra từng phần. Viết ra để bất kỳ ai (kể cả chính bạn vài tuần sau) đọc vào là hiểu ngay code nằm ở đâu, tại sao nó tồn tại, và verify được nó chạy đúng hay không.

> Trạng thái tại thời điểm viết: mọi phần dưới đây đã qua `tsc --noEmit` sạch và **136/136 test pass** (bao gồm test chạy thật với Postgres, không mock) trong cùng một lần chạy cuối cùng.

---

## Mục lục theo phần

1. [Judge module (5 Judge độc lập)](#1-judge-module-5-judge-độc-lập)
2. [Spec generation (14 phần research spec)](#2-spec-generation-14-phần-research-spec)
3. [Revision — Version & Decision loop (Bước 10)](#3-revision--version--decision-loop-bước-10)
4. [Persistence — Postgres thật](#4-persistence--postgres-thật)
5. [PDF ingestion — trích xuất & tạo evidence từ PDF](#5-pdf-ingestion--trích-xuất--tạo-evidence-từ-pdf)
6. [Cách chạy & kiểm tra toàn bộ](#6-cách-chạy--kiểm-tra-toàn-bộ)

---

## 1. Judge module (5 Judge độc lập)

Bước 9 trong đề bài: 5 Judge (Gap, Contribution, Experiment, Evidence, Conference Readiness) đánh giá **độc lập** — Judge này không được thấy nhận xét của Judge kia — rồi tổng hợp consensus.

| File | Mới/Sửa | Công dụng |
|---|---|---|
| `packages/schemas/src/judge.ts` | Mới | Định nghĩa `JudgeName` (5 giá trị), `Finding` (severity CRITICAL/MAJOR/MINOR + issue/reason/recommendation), `JudgeReport`, `Consensus`, `JudgePanelResult`. Đây là "hợp đồng dữ liệu" mà mọi phần khác dùng chung. |
| `apps/api/src/modules/judge/prompt.ts` | Mới | 5 system prompt **hoàn toàn tách biệt**, mỗi Judge chỉ nhìn đúng phạm vi của mình (vd: Evidence Judge chỉ quan tâm `integrityStatus`, không bàn baseline). |
| `apps/api/src/modules/judge/service.ts` | Mới | Logic chính: `buildXxxJudgeContext()` (5 hàm, mỗi hàm lấy đúng dữ liệu cần cho 1 Judge từ store), `runJudge()` (gọi LLM cho 1 Judge), `runJudgePanel()` (chạy cả 5 Judge **song song** bằng `Promise.all` — về mặt code không thể có chuyện Judge A rò rỉ vào prompt Judge B), `computeConsensus()` (hàm thuần, không gọi LLM, tính severity count + section nào bị ≥2 Judge cùng flag). |
| `apps/api/src/modules/judge/service.test.ts` | Mới | 5 test cho `computeConsensus` — test logic tổng hợp mà không cần LLM. |
| `apps/api/src/modules/judge/index.ts` | Mới | Barrel export của module. |
| `apps/api/src/routers/judge.ts` | Mới | 2 tRPC procedure: `judge.runPanel` (mutation, chạy cả 5 Judge), `judge.getLatestPanel` (query, đọc kết quả gần nhất). |
| `apps/api/src/routers/index.ts` | Sửa | Thêm `judge: judgeRouter` vào router gốc. |
| `apps/api/src/store/project-store.ts` | Sửa | Thêm `judgePanelsByProject` — lưu kết quả panel gần nhất mỗi project. |

**Vì sao thiết kế thế này:** Judge độc lập là yêu cầu cứng của đề (`"Các Judge phải đánh giá riêng trước khi xem nhận xét của nhau"`). Chạy song song bằng `Promise.all` biến yêu cầu đó thành bất khả xâm phạm về mặt kiến trúc, không phải chỉ là quy ước bằng lời.

---

## 2. Spec generation (14 phần research spec)

Bước 8 trong đề: lắp ráp bản spec 14 phần (Problem statement → Decision history) từ dữ liệu đã có ở các bước trước — **không sinh nội dung mới, không gọi LLM**.

| File | Mới/Sửa | Công dụng |
|---|---|---|
| `packages/schemas/src/spec-generation.ts` | Mới | `SpecSectionId` (14 giá trị theo đúng thứ tự đề bài), `SpecSection` (có cờ `isPlaceholder` để phân biệt "chưa có dữ liệu" với nội dung thật), `ResearchSpec` (có `status: DRAFT\|FINALIZED` — trường này được bổ sung thêm ở phần 3). |
| `apps/api/src/modules/spec-generation/service.ts` | Mới (sửa thêm ở phần 3) | 14 hàm builder, mỗi hàm build đúng 1 section, **thuần túy** (test được không cần store/LLM): `buildProblemStatementSection`, `buildRelatedWorkMatrixSection` (render bảng markdown thật từ nguồn đã chọn), `buildClaimEvidenceMatrixSection` (bảng claim × evidence × integrity status), `buildComputeBudgetSection`, v.v. `assembleSections()` gộp cả 14 theo đúng thứ tự. `generateResearchSpec()` là hàm async đọc toàn bộ store rồi tạo version mới (không bao giờ ghi đè version cũ). |
| `apps/api/src/modules/spec-generation/service.test.ts` | Mới | 16 test — mỗi section builder 1-2 test, cộng 1 test tổng đảm bảo đúng 14 section theo đúng thứ tự và khi không có dữ liệu gì thì mọi section tự báo "chưa có dữ liệu" thay vì im lặng/giả. |
| `apps/api/src/modules/spec-generation/index.ts` | Mới | Barrel export. |
| `apps/api/src/routers/spec-generation.ts` | Mới | `specGeneration.generate`, `.getLatest`, `.listVersions`. |
| `apps/api/src/routers/index.ts` | Sửa | Thêm `specGeneration: specGenerationRouter`. |
| `apps/api/src/store/project-store.ts` | Sửa | Thêm `researchSpecsByProject` (mảng version, append-only). |

**Vì sao không gọi LLM:** Bước 8 trong đề mô tả là *tổng hợp* dữ liệu đã có (Problem, Gap, Contribution, Claim, Experiment plan... đều đã được tạo/duyệt ở các bước trước), không phải sinh nội dung mới. Gọi LLM ở đây sẽ tạo nguy cơ diễn giải lại/hallucinate dữ liệu vốn đã được người dùng xác nhận.

---

## 3. Revision — Version & Decision loop (Bước 10)

Bước 10 trong đề: `"Sửa spec → Hiển thị phần thay đổi → Chạy lại verifier liên quan → Judge kiểm tra lại → Người dùng xác nhận bản cuối"`.

| File | Mới/Sửa | Công dụng |
|---|---|---|
| `packages/schemas/src/revision.ts` | Mới | `FindingResolutionKind` (RESOLVED/DISMISSED/DEFERRED), `FindingResolution` (bản ghi quyết định của user trên 1 finding), input cho re-run 1 Judge / diff 2 version / finalize. |
| `packages/schemas/src/spec-generation.ts` | Sửa | Thêm `status: "DRAFT"\|"FINALIZED"` và `finalizedAt` vào `ResearchSpecSchema`. |
| `apps/api/src/modules/revision/service.ts` | Mới | 4 hàm cốt lõi: **`recordFindingResolution`** (ghi quyết định của user trên 1 finding — không tự sửa dữ liệu, user sửa qua router khác rồi log ở đây); **`rerunJudge`** (chạy lại **đúng 1 Judge** liên quan, tái dùng `runJudge`/`computeConsensus` từ module judge — không chạy lại cả 5); **`computeSpecDiff`/`diffResearchSpecVersions`** (diff từng section giữa 2 version); **`finalizeResearchSpec`** (user xác nhận bản cuối — chặn cứng nếu còn finding CRITICAL chưa xử lý). |
| `apps/api/src/modules/revision/service.test.ts` | Mới | 11 test: diff đúng/sai section, chặn resolution khi finding không tồn tại, rerunJudge chỉ đổi đúng 1 Judge và giữ nguyên 4 Judge còn lại, chặn/cho phép finalize theo đúng điều kiện CRITICAL. |
| `apps/api/src/modules/revision/index.ts` | Mới | Barrel export. |
| `apps/api/src/routers/revision.ts` | Mới | `revision.recordFindingResolution`, `.listFindingResolutions`, `.rerunJudge`, `.diffVersions`, `.finalize`. |
| `apps/api/src/routers/index.ts` | Sửa | Thêm `revision: revisionRouter`. |
| `apps/api/src/modules/spec-generation/service.ts` | Sửa | `buildDecisionHistorySection` giờ nhận thêm `findingResolutions` — section 14 tự động gồm cả quyết định Bước 10, không chỉ Bước 1. |
| `apps/api/src/store/project-store.ts` | Sửa | Thêm `findingResolutionsByProject` (append-only). |

**Nguyên tắc an toàn:** `finalizeResearchSpec` chặn cứng khi còn CRITICAL finding — nhưng **không** chặn MAJOR/MINOR, vì quyết định cuối luôn thuộc về người dùng (nguyên tắc "AI không có quyền quyết định thay user" xuyên suốt toàn bộ hệ thống).

---

## 4. Persistence — Postgres thật

Trước đây: toàn bộ state là `Map` in-memory → restart server là mất sạch dữ liệu. `docker-compose.yml` còn tham chiếu `apps/worker` không tồn tại → `docker compose up` sẽ fail ngay.

| File | Mới/Sửa | Công dụng |
|---|---|---|
| `apps/api/src/db/client.ts` | Mới | Kết nối Postgres **lazy, opt-in**: nếu không set `DATABASE_URL` thì `getPool()` trả `null`, mọi thứ chạy in-memory (đúng chế độ mọi test hiện có đang chạy). |
| `apps/api/src/db/schema.ts` | Mới | 1 bảng generic `store_entities` (JSONB) dùng chung cho mọi store — vì mọi giá trị đã qua Zod validate trước khi vào store, không cần bảng riêng cho từng entity. |
| `apps/api/src/db/persisted-map.ts` | Mới | **Trái tim của thiết kế**: class `PersistedMap`/`PersistedNestedMap` tương thích API với `Map` gốc (`.get/.set/.clear/.entries/.values/.keys/.size`) — nên **toàn bộ module khác (judge, spec-generation, revision, evidence, research-design, literature, interpretation, decomposition...) không cần sửa gì** để có persistence. Đọc luôn từ cache in-memory (đồng bộ, nhanh); ghi thì cache trước rồi write-through bất đồng bộ sang Postgres (fire-and-forget, lỗi thì log chứ không throw). |
| `apps/api/src/db/persisted-map.real-db.test.ts` | Mới | 5 test chạy với **Postgres thật** (skip nếu không có `TEST_DATABASE_URL`, không bắt buộc ai cũng phải có DB để chạy `pnpm test`): write-through, hydrate sau "restart" (instance mới), upsert không tạo dòng trùng, nested map, no-op khi tắt persistence. |
| `apps/api/src/db/hydrate.ts` | Mới | `bootstrapPersistence()` — gọi 1 lần lúc server khởi động: ensure schema → hydrate toàn bộ store từ Postgres vào cache trước khi nhận request. |
| `apps/api/src/store/project-store.ts` | Sửa lớn | Mọi `new Map(...)` đổi thành `new PersistedMap({storeKey: "..."})`. Thêm `ALL_PERSISTED_STORES` (danh sách để hydrate) và `appendToProjectList`/`touchProjectList` (2 helper mới thay cho `getOrCreate(...).push()` — vì `.push()` mutate mảng tại chỗ mà không gọi lại `.set()`, nên write-through sẽ bỏ sót thay đổi). |
| `apps/api/src/routers/projects.ts` | Sửa | `ProjectRecord` (tên/ý tưởng gốc của project — dữ liệu quan trọng nhất) cũng chuyển sang `PersistedMap`. |
| `apps/api/src/modules/literature/service.ts` | Sửa | Thay các chỗ `getOrCreate(...).push()` và 1 vòng lặp mutate-in-place (cập nhật `source.analysis`) bằng `appendToProjectList`/`touchProjectList` để không bỏ sót khi ghi Postgres. |
| `apps/api/src/modules/research-design/service.ts` | Sửa | Tương tự — 3 chỗ `push()` đổi sang `appendToProjectList`. |
| `apps/api/src/modules/evidence/service.ts` | Sửa | Tương tự — 2 chỗ `push()`, cộng 2 chỗ mutate-in-place (`runReview`, `runIntegrityChecks`) đổi sang `touchProjectList` sau khi sửa. |
| `apps/api/src/modules/interpretation/repository.ts` | Sửa | `interpretationsByProject` là Map lồng Map — sửa để mỗi lần mutate Map con phải gọi lại `.set()` trên Map ngoài, nếu không write-through sẽ chỉ chạy đúng 1 lần lúc tạo Map con rỗng ban đầu. |
| `apps/api/src/env.ts` | Sửa | Thêm `DATABASE_URL` (optional) và `STORAGE_PATH` (default `./storage`) vào schema env. |
| `apps/api/src/server.ts` | Sửa | Gọi `bootstrapPersistence()` trước khi `app.listen()`; thêm graceful shutdown đóng pool khi nhận `SIGTERM`/`SIGINT`. |
| `apps/api/package.json` | Sửa | Thêm dependency `pg`, `@types/pg`. |
| `apps/api/Dockerfile` | Sửa | Cập nhật comment đầu file cho khớp thực tế (không còn "PLANNED" mơ hồ). |
| `apps/api/.env.example` | Sửa | Sửa comment `DATABASE_URL` — không set thì chạy in-memory, set thì tự tạo bảng và persist. |
| `docker-compose.yml` | Sửa | **Bỏ hẳn service `worker`** (build context `./apps/worker` không tồn tại → trước đây `docker compose up` fail ngay lập tức). Có comment giải thích lý do. |

**Điểm quan trọng nhất cần hiểu:** `PersistedMap` chỉ hoạt động đúng nếu MỌI thay đổi dữ liệu đều đi qua `.set()`. Code cũ có nhiều chỗ lấy mảng ra rồi `.push()` hoặc sửa object ngay trên mảng đó (mutate in-place) mà không gọi lại `.set()` — với `Map` thường thì vẫn đúng (cùng reference trong RAM), nhưng với `PersistedMap` thì Postgres sẽ không bao giờ biết có thay đổi. Đây là lý do 5 file service ở trên đều bị sửa.

---

## 5. PDF ingestion — trích xuất & tạo evidence từ PDF

Trước đây: `SourceDocument` chỉ có metadata (title/abstract) từ arXiv, chưa hề có full-text PDF nào chạm vào hệ thống — mọi `EvidenceSpan` phải gõ tay `startOffset`/`endOffset`, không có gì đối chiếu.

| File | Mới/Sửa | Công dụng |
|---|---|---|
| `packages/schemas/src/pdf.ts` | Mới | `ExtractedPdfPage` (page + text, 1-based), `SourcePdfRecord` (bản ghi nội bộ đầy đủ, có toàn bộ text từng trang), `SourcePdfMeta` (bản public trả về client, KHÔNG có text để tránh payload khổng lồ), input cho upload/lấy trang/tạo span từ quote. |
| `apps/api/src/pdf/extract.ts` | Mới | Wrapper quanh `pdf-parse` v2 (`PDFParse.getText()`), trả mảng `{page, text}`. |
| `apps/api/src/pdf/storage.ts` | Mới | Lưu file PDF vào ổ đĩa, path gốc `env.STORAGE_PATH`. |
| `apps/api/src/modules/pdf-ingestion/service.ts` | Mới | `uploadSourcePdf()` (decode base64 → validate magic bytes `%PDF-` → validate dung lượng ≤20MB → trích xuất text → lưu file → lưu record); `getPageText()`; **`locateQuoteOnPage()`** (hàm thuần, tìm 1 quote chính xác trong text của 1 trang, trả về offset) và **`resolveQuoteToSpanInput()`** — đây là điểm hay nhất: user chỉ cần paste đoạn quote họ đọc được + số trang, server tự tìm và tự tính offset thay vì bắt user gõ tay số (dễ sai/dễ gian). Không tìm thấy y hệt → từ chối tạo evidence. |
| `apps/api/src/modules/pdf-ingestion/service.test.ts` | Mới | 11 test — bao gồm 1 test dùng **PDF thật tự build trong test** (đúng chuẩn PDF, không phải file mẫu tải từ mạng) chạy qua `pdf-parse` thật, không mock gì. |
| `apps/api/src/modules/pdf-ingestion/index.ts` | Mới | Barrel export. |
| `apps/api/src/routers/pdf-ingestion.ts` | Mới | `pdfIngestion.upload`, `.getMeta`, `.getPageText`, `.createSpanFromQuote` (compose với `evidence.createSpan` sẵn có — không viết trùng logic validate/integrity). |
| `apps/api/src/routers/index.ts` | Sửa | Thêm `pdfIngestion: pdfIngestionRouter`. |
| `apps/api/src/store/project-store.ts` | Sửa | Thêm `sourcePdfsByProject` (1 `PersistedMap` mỗi project chứa object `{sourceId: SourcePdfRecord}`). |
| `apps/api/src/env.ts` | Sửa | (đã thêm `STORAGE_PATH` ở phần 4, dùng ở đây). |
| `apps/api/package.json` | Sửa | Thêm dependency `pdf-parse`, `@types/pdf-parse`. |

**Vì sao dùng "quote thay vì offset thủ công":** Đây là thiết kế chủ động thay vì chỉ đơn giản parse PDF rồi bắt user tự gõ số — nó đảm bảo mọi evidence `EXACT` tạo qua flow này **chắc chắn khớp byte-for-byte với nguồn gốc**, đúng thứ mà Judge Evidence (phần 1) và `runIntegrityChecks` đang kiểm tra.

---

## 6. Cách chạy & kiểm tra toàn bộ

### 6.1. Cài đặt

```bash
# Từ thư mục gốc repo
pnpm install
```

### 6.2. Typecheck (không cần DB, không cần API key)

```bash
pnpm --filter @specloop/schemas run typecheck
pnpm --filter @specloop/api run typecheck
pnpm --filter @specloop/web run typecheck
```

### 6.3. Chạy test — chế độ mặc định (in-memory, KHÔNG cần Postgres)

```bash
pnpm --filter @specloop/api exec vitest run
```

Kết quả mong đợi: toàn bộ test pass, riêng 5 test trong `persisted-map.real-db.test.ts` sẽ hiện `skipped` (vì không có `TEST_DATABASE_URL`) — đây là hành vi đúng, không phải lỗi.

### 6.4. Chạy test — CÓ Postgres thật (verify đầy đủ 136 test, kể cả persistence)

```bash
# 1. Cài & khởi động Postgres (Ubuntu/Debian ví dụ)
sudo apt-get install -y postgresql
sudo service postgresql start

# 2. Tạo user/DB khớp .env.example
sudo -u postgres psql -c "CREATE USER spec_research WITH PASSWORD 'change-me-locally';"
sudo -u postgres psql -c "CREATE DATABASE spec_research_loop OWNER spec_research;"

# 3. Chạy test với TEST_DATABASE_URL trỏ vào DB đó
cd apps/api
TEST_DATABASE_URL="postgres://spec_research:change-me-locally@localhost:5432/spec_research_loop" \
  npx vitest run
```

### 6.5. Chạy server thật (dev mode)

```bash
# 1. Copy env mẫu và điền OPENAI_API_KEY (hoặc Gemini key — xem comment trong file)
cp apps/api/.env.example apps/api/.env

# 2. (Tùy chọn) Điền DATABASE_URL trong .env nếu muốn dữ liệu sống sót qua restart.
#    Bỏ trống/comment out DATABASE_URL → server chạy thuần in-memory.

# 3. Chạy API
pnpm dev:api          # http://localhost:4000

# 4. Chạy web (terminal khác)
pnpm dev:web          # http://localhost:3000
```

### 6.6. Danh sách route tRPC mới (gọi qua client tRPC ở `apps/web`, hoặc test trực tiếp qua router)

```
judge.runPanel               judge.getLatestPanel
specGeneration.generate      specGeneration.getLatest       specGeneration.listVersions
revision.recordFindingResolution   revision.listFindingResolutions
revision.rerunJudge          revision.diffVersions          revision.finalize
pdfIngestion.upload          pdfIngestion.getMeta           pdfIngestion.getPageText
pdfIngestion.createSpanFromQuote
```

### 6.7. Việc còn lại (chưa làm)

- **UI thật**: `apps/web` vẫn còn dùng dữ liệu fixture tĩnh cho Judge panel và bản spec cuối (`final-review-workspace.tsx`) — cần nối vào các route tRPC ở mục 6.6.
- **`docs/09-requirement-traceability-matrix.md`**: vẫn ghi mọi FR là `PLANNED`, cần cập nhật lại cho khớp với những gì đã làm ở tài liệu này.
- **`docker compose up`**: đã sửa file cấu hình nhưng chưa chạy thử end-to-end thật (môi trường làm việc không có Docker daemon).
