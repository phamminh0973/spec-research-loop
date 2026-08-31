# spec-generation-delta.zip

**Đây là gì:** Module lắp ráp bản Research Spec 14 phần (Problem statement → Decision history) từ dữ liệu đã có ở các bước trước, đúng Bước 8 trong đề bài. **Không gọi LLM** — chỉ format lại dữ liệu đã qua xác nhận/generate ở các module khác (interpretation, decomposition, literature, research-design, evidence).

**Thứ tự trong roadmap:** 2/5 (làm sau Judge module).

---

## Danh sách file

```
packages/schemas/src/spec-generation.ts                       [MỚI]
packages/schemas/src/index.ts                                  [SỬA]
apps/api/src/modules/spec-generation/service.ts                [MỚI]
apps/api/src/modules/spec-generation/service.test.ts           [MỚI]
apps/api/src/modules/spec-generation/index.ts                  [MỚI]
apps/api/src/routers/spec-generation.ts                        [MỚI]
apps/api/src/routers/index.ts                                   [SỬA]
apps/api/src/store/project-store.ts                             [SỬA]
```

## Từng file dùng để làm gì

| File | Công dụng |
|---|---|
| `spec-generation.ts` (schema) | `SpecSectionId` (14 giá trị enum theo đúng thứ tự đề bài: PROBLEM_STATEMENT → DECISION_HISTORY), `SpecSection` (1 phần — có cờ `isPlaceholder` để phân biệt rõ "chưa có dữ liệu" với nội dung thật), `ResearchSpec` (cả bản spec, có `version` tăng dần). |
| `service.ts` | 14 hàm builder, **mỗi hàm build đúng 1 section, thuần túy** (test được mà không cần store/LLM): `buildProblemStatementSection`, `buildRelatedWorkMatrixSection` (render bảng markdown từ nguồn đã chọn), `buildClaimEvidenceMatrixSection` (bảng claim × evidence × integrity status), `buildComputeBudgetSection`, v.v. `assembleSections()` gộp cả 14 theo đúng thứ tự. `generateResearchSpec()` là hàm async đọc toàn bộ store rồi tạo **version mới** (không bao giờ ghi đè version cũ — giữ lịch sử để phần diff ở Bước 10 dùng). |
| `service.test.ts` | 16 test — mỗi section builder có 1-2 test riêng, cộng 1 test tổng đảm bảo đúng 14 section theo đúng thứ tự và khi không có dữ liệu gì thì mọi section tự báo "chưa có dữ liệu" thay vì im lặng hoặc bịa. |
| `index.ts` | Barrel export. |
| `routers/spec-generation.ts` | 3 tRPC procedure: `specGeneration.generate` (mutation — tạo version mới), `.getLatest` (query), `.listVersions` (query — toàn bộ lịch sử version). |
| `routers/index.ts` | Thêm dòng `specGeneration: specGenerationRouter`. |
| `store/project-store.ts` | Thêm `researchSpecsByProject: Map<string, ResearchSpec[]>` — mảng version, append-only. |

## Cách tích hợp

1. **Yêu cầu trước:** đã tích hợp `judge-module-delta.zip` (phần `store/project-store.ts` và `routers/index.ts` ở đây được viết tiếp trên nền đó).
2. Copy 5 file **[MỚI]** vào đúng path.
3. 3 file **[SỬA]** — file này đã chứa **cả phần Judge lẫn Spec-generation**, nên nếu bạn tích hợp tuần tự, lấy 3 file này từ zip hiện tại (mới hơn) là đủ, không cần merge tay với bản từ zip Judge.
4. `pnpm install` (không cần dependency mới).

## Cách test riêng phần này

```bash
cd apps/api
npx tsc --noEmit
npx vitest run src/modules/spec-generation
```

Kết quả mong đợi: 16/16 test pass.

## Lưu ý

- `generateResearchSpec()` yêu cầu đã có decomposition graph — nếu chưa có sẽ throw lỗi rõ ràng.
- Đây là bước **thuần dữ liệu**: nếu bạn generate spec khi chưa chạy interpretation/decomposition/literature/research-design nào, kết quả vẫn hợp lệ nhưng mọi section sẽ ghi "(chưa có dữ liệu)" — đây là hành vi đúng, không phải bug.
- Zip sau (`revision-loop-delta.zip`) sẽ sửa tiếp `service.ts` của module này (thêm `status`/`finalizedAt` và tham số `findingResolutions` cho `buildDecisionHistorySection`) — nếu tích hợp tuần tự thì lấy bản mới nhất từ zip đó.
