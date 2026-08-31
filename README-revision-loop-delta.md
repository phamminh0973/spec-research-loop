# revision-loop-delta.zip

**Đây là gì:** Vòng lặp Version & Decision — Bước 10 trong đề bài: `"Sửa spec → Hiển thị phần thay đổi → Chạy lại verifier liên quan → Judge kiểm tra lại → Người dùng xác nhận bản cuối"`.

**Thứ tự trong roadmap:** 3/5 (làm sau Spec generation).

---

## Danh sách file

```
packages/schemas/src/revision.ts                        [MỚI]
packages/schemas/src/spec-generation.ts                  [SỬA]
packages/schemas/src/index.ts                             [SỬA]
apps/api/src/modules/revision/service.ts                 [MỚI]
apps/api/src/modules/revision/service.test.ts            [MỚI]
apps/api/src/modules/revision/index.ts                   [MỚI]
apps/api/src/routers/revision.ts                         [MỚI]
apps/api/src/routers/index.ts                              [SỬA]
apps/api/src/store/project-store.ts                        [SỬA]
apps/api/src/modules/spec-generation/service.ts           [SỬA]
```

## Từng file dùng để làm gì

| File | Công dụng |
|---|---|
| `revision.ts` (schema) | `FindingResolutionKind` (RESOLVED / DISMISSED / DEFERRED), `FindingResolution` (bản ghi quyết định của user trên 1 finding cụ thể của Judge), input cho re-run 1 Judge, diff giữa 2 version, finalize. |
| `spec-generation.ts` (schema, sửa) | Thêm `status: "DRAFT" \| "FINALIZED"` và `finalizedAt` vào `ResearchSpecSchema`. |
| `modules/revision/service.ts` | 4 hàm cốt lõi. **`recordFindingResolution`** — ghi lại quyết định của user trên 1 finding (KHÔNG tự sửa dữ liệu claim/contribution/evidence — user sửa qua router riêng của module đó, hàm này chỉ log quyết định + note). **`rerunJudge`** — chạy lại **đúng 1 Judge** liên quan (tái dùng `runJudge`/`computeConsensus` từ `judge/service.ts`), merge report mới vào panel cũ — không chạy lại cả 5 Judge. **`computeSpecDiff` / `diffResearchSpecVersions`** — diff từng section giữa 2 version spec. **`finalizeResearchSpec`** — user xác nhận bản cuối; **chặn cứng nếu còn finding CRITICAL** chưa xử lý trong panel Judge mới nhất (nhưng không chặn MAJOR/MINOR — quyết định cuối luôn thuộc về user). |
| `service.test.ts` | 11 test: diff đúng/sai section, chặn resolution khi finding không tồn tại, `rerunJudge` chỉ thay đúng 1 Judge và giữ nguyên 4 Judge còn lại + tính lại đúng consensus, chặn finalize khi còn CRITICAL, cho phép finalize khi sạch. |
| `index.ts` | Barrel export. |
| `routers/revision.ts` | 5 tRPC procedure: `revision.recordFindingResolution`, `.listFindingResolutions`, `.rerunJudge`, `.diffVersions`, `.finalize`. |
| `routers/index.ts` | Thêm dòng `revision: revisionRouter`. |
| `store/project-store.ts` | Thêm `findingResolutionsByProject: Map<string, FindingResolution[]>` (append-only). |
| `modules/spec-generation/service.ts` (sửa) | `buildDecisionHistorySection` nhận thêm tham số `findingResolutions` — section 14 (Decision history) giờ tự động gồm cả quyết định từ Bước 10, không chỉ quyết định Bước 1. |

## Cách tích hợp

1. **Yêu cầu trước:** đã tích hợp `judge-module-delta.zip` và `spec-generation-delta.zip`.
2. Copy 4 file **[MỚI]** vào đúng path.
3. 6 file **[SỬA]** — file này chứa **bản mới nhất, kế thừa toàn bộ 2 phần trước** — lấy trực tiếp từ zip này, không cần merge tay.
4. `pnpm install` (không cần dependency mới).

## Cách test riêng phần này

```bash
cd apps/api
npx tsc --noEmit
npx vitest run src/modules/revision
```

Kết quả mong đợi: 11/11 test pass.

## Lưu ý

- `finalizeResearchSpec` **yêu cầu** đã chạy `judge.runPanel` ít nhất 1 lần — nếu chưa từng chạy panel, sẽ throw lỗi rõ ràng thay vì cho finalize "khống".
- `rerunJudge` yêu cầu đã có panel trước đó (chạy qua `judge.runPanel`) — nó **merge** vào panel cũ chứ không tự tạo panel mới từ đầu.
- Zip sau (`persistence-delta.zip`) sẽ sửa tiếp `store/project-store.ts` (đổi toàn bộ `Map` thường sang `PersistedMap`) — nếu tích hợp tuần tự thì lấy bản mới nhất từ zip đó, đừng dùng bản trong zip này nữa.
