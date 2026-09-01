# persistence-delta.zip

**Đây là gì:** Lớp persistence Postgres **thật** — thay cho toàn bộ `Map` in-memory (trước đây restart server là mất sạch dữ liệu). Đồng thời fix `docker-compose.yml` (service `worker` trỏ tới thư mục `apps/worker` không tồn tại, khiến `docker compose up` fail ngay lập tức).

**Thứ tự trong roadmap:** 4/5 (làm sau Revision loop).

**Quan trọng:** Đây là zip **chạm nhiều file nhất** và duy nhất trong 5 zip cần cài thêm dependency (`pg`) — đọc kỹ mục "Cách tích hợp" bên dưới trước khi copy đè.

---

## Danh sách file

```
apps/api/src/db/client.ts                              [MỚI]
apps/api/src/db/schema.ts                               [MỚI]
apps/api/src/db/persisted-map.ts                        [MỚI]
apps/api/src/db/persisted-map.real-db.test.ts           [MỚI]
apps/api/src/db/hydrate.ts                              [MỚI]
apps/api/src/store/project-store.ts                      [SỬA — sửa lớn]
apps/api/src/routers/projects.ts                          [SỬA]
apps/api/src/modules/literature/service.ts                 [SỬA]
apps/api/src/modules/research-design/service.ts             [SỬA]
apps/api/src/modules/evidence/service.ts                     [SỬA]
apps/api/src/modules/interpretation/repository.ts             [SỬA]
apps/api/src/env.ts                                             [SỬA]
apps/api/src/server.ts                                           [SỬA]
apps/api/package.json                                             [SỬA]
apps/api/Dockerfile                                                 [SỬA]
apps/api/.env.example                                                 [SỬA]
docker-compose.yml                                                       [SỬA]
```

## Từng file dùng để làm gì

| File | Công dụng |
|---|---|
| `db/client.ts` | Kết nối Postgres **lazy, opt-in**: `getPool()` trả `null` nếu không set `DATABASE_URL` → mọi thứ chạy thuần in-memory (đúng chế độ mọi test hiện có đang chạy, không cần Postgres để `pnpm test` pass). |
| `db/schema.ts` | 1 bảng generic `store_entities` (cột JSONB) dùng chung cho **mọi** store — vì mọi giá trị đã qua Zod validate trước khi vào store, không cần bảng riêng cho từng entity. |
| `db/persisted-map.ts` | **Trái tim của cả phần này.** Class `PersistedMap` / `PersistedNestedMap` có API **giống hệt `Map` gốc** (`.get/.set/.clear/.entries/.values/.keys/.size`) → mọi module khác (judge, spec-generation, revision, evidence, research-design, literature, interpretation, decomposition...) **không cần sửa gì** để có persistence. Đọc luôn từ cache RAM (nhanh, đồng bộ); ghi thì cache trước rồi **write-through bất đồng bộ** sang Postgres (lỗi thì log, không throw — persistence lỗi không được phép làm sập request). |
| `db/persisted-map.real-db.test.ts` | 5 test chạy với **Postgres thật** — tự động `skip` nếu không có biến môi trường `TEST_DATABASE_URL` (không bắt ai cũng phải cài Postgres mới chạy được `pnpm test`). |
| `db/hydrate.ts` | `bootstrapPersistence()` — gọi 1 lần lúc server khởi động: tạo bảng nếu chưa có → load toàn bộ dữ liệu từ Postgres vào cache RAM trước khi server nhận request. |
| `store/project-store.ts` | Mọi `new Map(...)` đổi thành `new PersistedMap({storeKey: "..."})`. Thêm `ALL_PERSISTED_STORES` (danh sách để hydrate lúc khởi động) và 2 helper mới `appendToProjectList` / `touchProjectList` — **thay thế `getOrCreate(...).push()`** (xem giải thích bên dưới). |
| `routers/projects.ts` | `ProjectRecord` (tên/ý tưởng gốc project — dữ liệu quan trọng nhất, mất là coi như mất cả project) chuyển sang `PersistedMap`. |
| `modules/literature/service.ts` | Thay 3 chỗ `getOrCreate(...).push()` + 1 vòng lặp mutate-in-place (cập nhật `source.analysis`) bằng `appendToProjectList`/`touchProjectList`. |
| `modules/research-design/service.ts` | Thay 3 chỗ `getOrCreate(...).push()` bằng `appendToProjectList`. |
| `modules/evidence/service.ts` | Thay 2 chỗ `push()` + 2 chỗ mutate-in-place (`runReview`, `runIntegrityChecks`) bằng `appendToProjectList`/`touchProjectList`. |
| `modules/interpretation/repository.ts` | `interpretationsByProject` là Map lồng Map — sửa để mỗi lần mutate Map con phải gọi lại `.set()` trên Map ngoài (nếu không, write-through chỉ chạy đúng 1 lần lúc tạo Map con rỗng ban đầu, mọi lần thêm bản ghi sau đó sẽ "vô hình" với Postgres). |
| `env.ts` | Thêm `DATABASE_URL` (optional) và `STORAGE_PATH` (default `./storage`) vào schema biến môi trường. |
| `server.ts` | Gọi `bootstrapPersistence()` trước `app.listen()`; thêm graceful shutdown (đóng pool khi nhận `SIGTERM`/`SIGINT`). |
| `package.json` | Thêm dependency `pg`, `@types/pg`. |
| `Dockerfile` | Sửa comment đầu file cho khớp thực tế. |
| `.env.example` | Sửa comment `DATABASE_URL` — không set thì in-memory, set thì tự tạo bảng và persist. |
| `docker-compose.yml` | **Bỏ hẳn service `worker`** (trước đây trỏ `./apps/worker` không tồn tại → `docker compose up` fail ngay). |

## ⚠️ Vì sao 5 file service bị sửa (đọc trước khi tích hợp)

`PersistedMap` chỉ ghi đúng vào Postgres nếu **mọi thay đổi dữ liệu đều đi qua `.set()`**. Code gốc có nhiều chỗ lấy mảng ra rồi gọi `.push()` thẳng lên đó, hoặc sửa field ngay trên object trong mảng (mutate in-place) mà không gọi lại `.set()`. Với `Map` thường thì vẫn đúng (cùng vùng nhớ), nhưng với `PersistedMap` thì Postgres sẽ **không bao giờ biết** có thay đổi — dữ liệu tưởng đã lưu nhưng thực ra chỉ nằm trong RAM. Đây là lý do `literature/service.ts`, `research-design/service.ts`, `evidence/service.ts`, `interpretation/repository.ts` đều nằm trong zip này dù chủ đề chính là "persistence".

## Cách tích hợp

1. **Yêu cầu trước:** đã tích hợp `judge-module-delta.zip`, `spec-generation-delta.zip`, `revision-loop-delta.zip`.
2. Copy 5 file **[MỚI]** vào đúng path (tạo thư mục `apps/api/src/db/` nếu chưa có).
3. Cài dependency mới:
   ```bash
   cd apps/api
   pnpm add pg
   pnpm add -D @types/pg
   ```
   (hoặc copy `package.json` trong zip đè lên rồi `pnpm install` lại từ gốc repo).
4. Các file **[SỬA]** còn lại — copy đè trực tiếp (file này là bản tích lũy mới nhất tính đến phần 4).
5. `docker-compose.yml` — copy đè, kiểm tra lại nếu bạn có thêm chỉnh sửa riêng ở service `db`/`web`.

## Cách test riêng phần này

```bash
cd apps/api
npx tsc --noEmit

# Test không cần Postgres (chế độ mặc định — 5 test real-db sẽ hiện "skipped", đúng như thiết kế)
npx vitest run

# Test CÓ Postgres thật (verify persistence hoạt động end-to-end)
sudo apt-get install -y postgresql && sudo service postgresql start
sudo -u postgres psql -c "CREATE USER spec_research WITH PASSWORD 'change-me-locally';"
sudo -u postgres psql -c "CREATE DATABASE spec_research_loop OWNER spec_research;"
TEST_DATABASE_URL="postgres://spec_research:change-me-locally@localhost:5432/spec_research_loop" \
  npx vitest run
```

Kết quả mong đợi: không có Postgres → phần lớn test pass, 5 test real-db skip. Có Postgres → toàn bộ pass, bao gồm cả 5 test real-db.

## Lưu ý

- `.clear()` trên `PersistedMap` **chỉ xóa cache RAM, không đụng Postgres** — đây là chủ đích, vì `resetProjectStore()` chỉ dùng cho test, xóa DB thật mỗi lần test chạy sẽ vừa chậm vừa sai nếu ai đó chạy test với `DATABASE_URL` thật đang trỏ vào dữ liệu thật.
- Zip sau (`pdf-ingestion-delta.zip`) sẽ sửa tiếp `store/project-store.ts` (thêm `sourcePdfsByProject`) và `env.ts` (STORAGE_PATH đã có sẵn ở đây, dùng ở đó) — lấy bản mới nhất từ zip đó nếu tích hợp tuần tự.
