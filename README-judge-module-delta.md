# judge-module-delta.zip

**Đây là gì:** Module Judge — 5 Judge độc lập (Gap, Contribution, Experiment, Evidence, Conference Readiness) đánh giá research spec, đúng Bước 9 trong đề bài. Thay thế phần fixture tĩnh trước đây trong `final-review-workspace.tsx`.

**Thứ tự trong roadmap:** 1/5 (làm đầu tiên).

---

## Danh sách file

```
packages/schemas/src/judge.ts                       [MỚI]
packages/schemas/src/index.ts                        [SỬA]
apps/api/src/modules/judge/prompt.ts                 [MỚI]
apps/api/src/modules/judge/service.ts                [MỚI]
apps/api/src/modules/judge/service.test.ts           [MỚI]
apps/api/src/modules/judge/index.ts                  [MỚI]
apps/api/src/routers/judge.ts                        [MỚI]
apps/api/src/routers/index.ts                         [SỬA]
apps/api/src/store/project-store.ts                   [SỬA]
```

## Từng file dùng để làm gì

| File | Công dụng |
|---|---|
| `judge.ts` (schema) | Định nghĩa kiểu dữ liệu dùng chung: `JudgeName` (5 giá trị enum), `Finding` (1 nhận xét — có `severity`, `issue`, `reason`, `recommendation`), `JudgeReport` (nhận xét của 1 Judge), `Consensus` (tổng hợp), `JudgePanelResult` (kết quả cả 5 Judge). |
| `prompt.ts` | 5 system prompt **tách biệt hoàn toàn** — mỗi Judge chỉ được dặn dò về đúng phạm vi của mình, không biết 4 Judge kia đang làm gì. |
| `service.ts` | Logic chính. `buildXxxJudgeContext()` (5 hàm) lấy đúng dữ liệu cần cho từng Judge từ store. `runJudge()` gọi LLM cho 1 Judge. `runJudgePanel()` chạy **cả 5 Judge song song** bằng `Promise.all` (đảm bảo tính độc lập bằng kiến trúc, không chỉ bằng lời dặn). `computeConsensus()` là hàm thuần (không gọi LLM) tính severity count + phát hiện section nào bị ≥2 Judge cùng flag. |
| `service.test.ts` | 5 test cho `computeConsensus` — test logic tổng hợp mà không cần gọi LLM thật. |
| `index.ts` | Barrel export (`export * from "./service.js"` v.v.). |
| `routers/judge.ts` | 2 tRPC procedure: `judge.runPanel` (mutation — chạy panel), `judge.getLatestPanel` (query — đọc kết quả gần nhất). |
| `routers/index.ts` | Thêm dòng `judge: judgeRouter` vào router gốc. |
| `store/project-store.ts` | Thêm `judgePanelsByProject: Map<string, JudgePanelResult>` — lưu kết quả panel gần nhất mỗi project. |

## Cách tích hợp

1. Copy 6 file **[MỚI]** vào đúng path tương ứng trong repo.
2. 3 file **[SỬA]** (`schemas/index.ts`, `routers/index.ts`, `store/project-store.ts`) — nếu repo của bạn chưa bị sửa gì khác kể từ lúc bạn export zip đầu tiên, có thể ghi đè trực tiếp. Nếu đã sửa thêm, mở diff và merge thủ công (thay đổi chỉ là: thêm import, thêm export, thêm 1 dòng Map).
3. Chạy `pnpm install` (không cần cài thêm dependency mới cho riêng phần này).

## Cách test riêng phần này

```bash
cd apps/api
npx tsc --noEmit                              # typecheck
npx vitest run src/modules/judge              # chỉ chạy test của judge module
```

Kết quả mong đợi: 5/5 test pass, không cần API key hay Postgres.

## Lưu ý

- `runJudgePanel()` yêu cầu đã có decomposition graph (Bước 2) — nếu chưa có, sẽ throw lỗi rõ ràng thay vì chạy trên dữ liệu rỗng.
- Đây là bản đầu tiên trong chuỗi 5 zip — các zip sau (`spec-generation-delta.zip` trở đi) đều **kế thừa và mở rộng thêm** vào `routers/index.ts` và `store/project-store.ts`, nên nếu bạn tích hợp tuần tự cả 5 zip theo đúng thứ tự, chỉ cần lấy 2 file này từ zip **cuối cùng** (`pdf-ingestion-delta.zip`) là đủ, không cần áp từng bản một.
