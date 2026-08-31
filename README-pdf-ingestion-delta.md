# pdf-ingestion-delta.zip

**Đây là gì:** Trích xuất text thật từ file PDF người dùng upload, và cho phép tạo `EvidenceSpan` bằng cách **paste 1 đoạn quote + số trang** — server tự tìm và tự tính offset, thay vì bắt user gõ tay `startOffset`/`endOffset`. Đóng lỗ hổng "trích xuất thông tin từ paper" — trước đây `SourceDocument` chỉ có metadata (title/abstract) từ arXiv, chưa hề có full-text PDF nào chạm vào hệ thống.

**Thứ tự trong roadmap:** 5/5 (làm cuối cùng).

---

## Danh sách file

```
packages/schemas/src/pdf.ts                                [MỚI]
packages/schemas/src/index.ts                                [SỬA]
apps/api/src/pdf/extract.ts                                 [MỚI]
apps/api/src/pdf/storage.ts                                  [MỚI]
apps/api/src/modules/pdf-ingestion/service.ts                [MỚI]
apps/api/src/modules/pdf-ingestion/service.test.ts            [MỚI]
apps/api/src/modules/pdf-ingestion/index.ts                    [MỚI]
apps/api/src/routers/pdf-ingestion.ts                            [MỚI]
apps/api/src/routers/index.ts                                     [SỬA]
apps/api/src/store/project-store.ts                                 [SỬA]
apps/api/src/env.ts                                                   [SỬA]
apps/api/package.json                                                   [SỬA]
```

## Từng file dùng để làm gì

| File | Công dụng |
|---|---|
| `pdf.ts` (schema) | `ExtractedPdfPage` (1 trang: số trang 1-based + text), `SourcePdfRecord` (bản ghi nội bộ đầy đủ, có toàn bộ text từng trang — **không** bao giờ trả thẳng ra client), `SourcePdfMeta` (bản public trả về client — chỉ có `pageCount`/`byteSize`/`fileName`, KHÔNG có text để tránh payload khổng lồ), input cho upload / lấy text 1 trang / tạo span từ quote. |
| `pdf/extract.ts` | Wrapper quanh thư viện `pdf-parse` v2 (`PDFParse.getText()`) — trả về mảng `{page, text}` theo đúng trang, số trang 1-based khớp thẳng với field `page` đã có sẵn trong `EvidenceSpan`. |
| `pdf/storage.ts` | Lưu file PDF gốc xuống ổ đĩa, path gốc lấy từ `env.STORAGE_PATH`. |
| `modules/pdf-ingestion/service.ts` | **`uploadSourcePdf()`** — decode base64 → kiểm tra magic bytes `%PDF-` (chặn file giả dạng PDF) → kiểm tra dung lượng ≤20MB → trích xuất text từng trang → lưu file → lưu record. **`getPageText()`** — lấy text 1 trang để user đọc trước khi quote. **`locateQuoteOnPage()`** (hàm thuần) — tìm 1 đoạn quote **chính xác byte-for-byte** trong text của 1 trang, trả offset. **`resolveQuoteToSpanInput()`** — ghép lại thành input sẵn sàng đưa cho `evidence.createSpan`; nếu không tìm thấy quote y hệt trên trang đó → từ chối, báo lỗi rõ ràng thay vì đoán mò. |
| `service.test.ts` | 11 test — bao gồm 1 test **tự build 1 file PDF thật đúng chuẩn PDF ngay trong code test** (không tải file mẫu từ mạng) rồi chạy qua `pdf-parse` thật, không mock gì cả. |
| `index.ts` | Barrel export. |
| `routers/pdf-ingestion.ts` | 4 tRPC procedure: `pdfIngestion.upload`, `.getMeta`, `.getPageText`, `.createSpanFromQuote` (gọi lại `evidence.createSpan` sẵn có để tạo span — không viết trùng logic validate/integrity check). |
| `routers/index.ts` | Thêm dòng `pdfIngestion: pdfIngestionRouter`. |
| `store/project-store.ts` | Thêm `sourcePdfsByProject` — 1 `PersistedMap` mỗi project, value là object `{ [sourceId]: SourcePdfRecord }`. |
| `env.ts` | (đã thêm `STORAGE_PATH` ở phần persistence, file này dùng lại — copy đè không mất gì). |
| `package.json` | Thêm dependency `pdf-parse`, `@types/pdf-parse`. |

## Cách tích hợp

1. **Yêu cầu trước:** đã tích hợp cả 4 zip trước (`judge`, `spec-generation`, `revision`, `persistence`) — file này là bản tích lũy đầy đủ nhất của `routers/index.ts`, `store/project-store.ts`, `env.ts`.
2. Cài dependency mới:
   ```bash
   cd apps/api
   pnpm add pdf-parse
   pnpm add -D @types/pdf-parse
   ```
   (hoặc copy `package.json` trong zip đè lên rồi `pnpm install` lại từ gốc).
3. Copy 6 file **[MỚI]** vào đúng path (tạo thư mục `apps/api/src/pdf/` nếu chưa có).
4. 4 file **[SỬA]** — copy đè trực tiếp.

## Cách test riêng phần này

```bash
cd apps/api
npx tsc --noEmit
npx vitest run src/modules/pdf-ingestion
```

Kết quả mong đợi: 11/11 test pass — **không cần** file PDF mẫu bên ngoài, test tự sinh PDF hợp lệ ngay trong lúc chạy.

## Lưu ý

- Giới hạn dung lượng PDF: **20MB** (`MAX_PDF_BYTES` trong `service.ts`) — đủ rộng cho hầu hết paper khoa học, nhưng có chặn cứng để tránh payload base64-qua-tRPC quá khổ. Muốn đổi thì sửa hằng số này.
- File scan ảnh (không có text layer) sẽ báo lỗi rõ ràng "No extractable text found" thay vì âm thầm trả về rỗng — chưa hỗ trợ OCR.
- `createSpanFromQuote` tạo span với `entryType: "EXACT"` — quote phải khớp **chính xác từng ký tự** (kể cả khoảng trắng, xuống dòng) với text đã trích xuất; nếu người dùng gõ sai chính tả hoặc PDF có ligature/font đặc biệt khiến `pdf-parse` trích ra khác một chút, sẽ bị từ chối — đây là đánh đổi có chủ đích để đảm bảo evidence luôn đúng 100%, không phải bug.
- Đây là zip **cuối cùng** trong chuỗi 5 phần — sau khi tích hợp xong cả 5, `routers/index.ts` sẽ có đủ 10 router: `health, projects, decomposition, literature, evidence, researchDesign, interpretation, judge, specGeneration, revision, pdfIngestion`.
