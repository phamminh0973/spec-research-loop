# SPECLOOP — LÝ DO QUYẾT ĐỊNH KIẾN TRÚC VÀ CÔNG NGHỆ

**Mục đích:** Giải thích ngắn gọn các quyết định kỹ thuật chính của SpecLoop để nhóm, giảng viên và Codex hiểu rõ vì sao chọn phương án hiện tại, phương án nào đã được cân nhắc và khi nào cần xem xét lại.

**Bối cảnh:** Đồ án được thực hiện bởi team 3 người, thời gian khoảng 4 tuần, ưu tiên một MVP end-to-end chạy ổn định và có thể đánh giá được. Các lựa chọn dưới đây tối ưu cho phạm vi đồ án, không khẳng định là lựa chọn tốt nhất cho mọi hệ thống production.

---

## 1. Vì sao chọn Modular Monolith thay vì Microservices?

### Quyết định

Sử dụng:

```text
Monorepo
+ Modular Monolith Backend
+ Background Worker cho job dài
```

### Lý do

- Team chỉ có 3 người và thời gian 4 tuần; microservices làm tăng đáng kể chi phí tích hợp, triển khai, giám sát và xử lý lỗi phân tán.
- Domain của SpecLoop còn đang được khám phá. Modular monolith cho phép điều chỉnh ranh giới module nhanh hơn trước khi các bounded context đủ ổn định để tách service.
- Các chức năng như project, spec node, evidence, experiment, Judge, revision và version có nhiều quan hệ dữ liệu và transaction liên quan; triển khai trong một backend giúp bảo đảm tính nhất quán dễ hơn.
- Hệ thống vẫn được chia module rõ ràng để tránh “big ball of mud” và có thể tách service sau này nếu xuất hiện nhu cầu scale hoặc deployment độc lập.
- Background worker là process riêng để chạy PDF parsing, LLM call và Judge run, nhưng không được xem là một microservice độc lập vì dùng chung domain model và database.

### Vì sao không chọn microservices ngay?

Microservices chỉ đáng cân nhắc khi có một hoặc nhiều điều kiện sau:

- Các module cần scale độc lập rõ rệt.
- Nhiều team phát triển và deploy độc lập.
- Có yêu cầu cô lập lỗi mạnh giữa các bounded context.
- Ranh giới domain đã ổn định.
- Nhóm có đủ thời gian vận hành message broker, distributed tracing, service authentication và deployment riêng.

Các điều kiện này chưa xuất hiện trong MVP 4 tuần.

---

## 2. Vì sao chọn Monorepo?

### Quyết định

Dùng một repository chứa:

```text
apps/web
apps/api
apps/worker
packages/prompts
packages/schemas
docs
tests
infrastructure
```

### Lý do

- Dễ đồng bộ thay đổi giữa frontend, API schema, prompt và worker.
- Một pull request có thể cập nhật trọn một vertical slice.
- Dễ cấu hình CI, Docker Compose và tài liệu cho team nhỏ.
- Giảm nguy cơ version lệch giữa nhiều repository.

### Khi nào nên tách repository?

Chỉ cân nhắc khi các thành phần có vòng đời phát hành, quyền truy cập hoặc team sở hữu hoàn toàn độc lập.

---

## 3. Vì sao chọn FastAPI thay vì NestJS?

### Quyết định

Backend chính dùng:

```text
FastAPI + Pydantic + SQLAlchemy + Alembic
```

### Lý do chọn FastAPI

- SpecLoop phụ thuộc mạnh vào Python cho PDF processing, xử lý dữ liệu, evaluation, structured LLM output và các thư viện AI.
- Pydantic phù hợp để kiểm tra JSON schema từ LLM, enum, ID tham chiếu và lỗi thiếu trường.
- FastAPI tự sinh OpenAPI và interactive API documentation từ type/schema, giúp team tích hợp frontend nhanh.
- API và AI worker cùng dùng Python nên giảm integration overhead và tránh phải duy trì hai hệ sinh thái backend.
- Phù hợp với kiến trúc modular monolith và vẫn hỗ trợ async cho external API/LLM calls.

### Vì sao không chọn NestJS?

NestJS là lựa chọn tốt khi:

- Team mạnh TypeScript/Node.js.
- Backend chủ yếu là nghiệp vụ web, realtime hoặc enterprise API.
- Muốn thống nhất ngôn ngữ frontend và backend.

Tuy nhiên, với SpecLoop, nếu dùng NestJS thì phần PDF, AI evaluation, data analysis hoặc một số verifier nhiều khả năng vẫn cần Python. Điều này tạo thêm một Python service hoặc script layer, làm tăng số runtime và chi phí tích hợp trong 4 tuần.

### Kết luận

Không phải NestJS yếu hơn. FastAPI được chọn vì **phù hợp workload AI/PDF/evaluation và giảm số công nghệ phải vận hành**.

---

## 4. Vì sao chọn PostgreSQL thay vì MongoDB?

### Quyết định

Dùng PostgreSQL làm database chính.

### Đặc điểm dữ liệu của SpecLoop

SpecLoop có nhiều quan hệ cần truy vết:

```text
Project
→ Spec node
→ Spec edge
→ Claim
→ Evidence span
→ Source
→ Experiment
→ Judge finding
→ User decision
→ Version
```

### Lý do chọn PostgreSQL

- Dữ liệu có quan hệ nhiều-nhiều và cần foreign key rõ ràng.
- Cần transaction khi tạo version, lưu decision và cập nhật các node liên quan.
- Cần kiểm tra integrity giữa claim, evidence, experiment và source.
- SQL phù hợp cho báo cáo, traceability matrix và các truy vấn tổng hợp.
- JSONB vẫn cho phép lưu structured output linh hoạt của LLM mà không phải từ bỏ relational constraints.
- Có thể thêm pgvector sau này nếu thực sự cần semantic search, nhưng không bắt buộc trong MVP.

### Vì sao không chọn MongoDB?

MongoDB phù hợp khi dữ liệu chủ yếu là document độc lập, schema thay đổi nhanh và phần lớn thao tác nằm trong một document aggregate.

Trong SpecLoop, nếu nhúng toàn bộ node, evidence, finding và version vào project document thì:

- Document có thể phình lớn.
- Khó cập nhật và truy vấn từng thực thể độc lập.
- Khó áp dụng constraint quan hệ.
- Versioning và many-to-many relation trở nên phức tạp.

MongoDB vẫn làm được bằng reference và transaction, nhưng khi dữ liệu vốn mang tính relational rõ ràng thì PostgreSQL đơn giản và tự nhiên hơn.

### Kết luận

PostgreSQL được chọn vì **data integrity và quan hệ truy vết quan trọng hơn schema flexibility tuyệt đối**.

---

## 5. Vì sao chưa bắt buộc pgvector hoặc vector database?

### Quyết định

Không đưa pgvector/vector database vào P0.

### Lý do

- Academic search đã dùng external API.
- Evidence MVP chủ yếu dựa trên exact span, page và text hash.
- Dataset demo nhỏ, có thể dùng keyword/rule hoặc tính embedding trực tiếp khi cần.
- Thêm vector index sớm làm tăng migration, tuning và debug mà chưa tạo giá trị bắt buộc.

### Khi nào thêm?

- Cần semantic retrieval trên nhiều PDF.
- Cần tìm evidence candidate theo embedding.
- Cần semantic clustering finding ở quy mô lớn.

Khi đó PostgreSQL có thể được mở rộng bằng pgvector trước khi cân nhắc một vector database riêng.

---

## 6. Vì sao chọn Redis + RQ, nhưng chỉ xem là P1/conditional?

### Quyết định

- CRUD và thao tác ngắn chạy trực tiếp qua API.
- Job dài có thể dùng Redis + RQ.
- Nếu integration queue gây trễ, MVP demo nhỏ được phép chạy synchronous với timeout và trạng thái rõ ràng.

### Lý do chọn RQ

- Cùng hệ sinh thái Python với FastAPI.
- Cấu hình đơn giản hơn các nền tảng queue lớn.
- Phù hợp cho PDF parsing, literature search, spec generation và Judge runs.
- Có job status, retry giới hạn và worker process riêng.

### Vì sao không chọn Celery/BullMQ/Kafka?

- Celery mạnh hơn nhưng cấu hình và vận hành nặng hơn nhu cầu MVP.
- BullMQ phù hợp với Node/NestJS hơn; dùng nó với backend Python tạo thêm hệ sinh thái.
- Kafka phù hợp event streaming lớn, không cần thiết cho job queue của đồ án.

### Khi nào nâng cấp?

Chuyển sang Celery hoặc nền tảng khác khi cần workflow phức tạp, scheduling mạnh, routing nhiều queue hoặc scale nhiều worker.

---

## 7. Vì sao chọn Local File Storage thay vì MinIO/S3?

### Quyết định

MVP lưu PDF trong local mounted volume; metadata và đường dẫn lưu trong PostgreSQL.

### Lý do

- Demo chạy trên một máy hoặc một deployment nhỏ.
- Dễ cấu hình, backup và debug.
- Không cần vận hành thêm object-storage service trong 4 tuần.
- Vẫn giữ abstraction `FileStorage` để có thể thay local bằng S3/MinIO sau này.

### Khi nào chuyển sang MinIO/S3?

- Deploy nhiều instance.
- Cần file replication, signed URL hoặc lifecycle policy.
- Dung lượng file tăng lớn.
- Cần tách storage khỏi application host.

---

## 8. Vì sao chọn PyMuPDF thay vì GROBID hoặc OCR ngay từ đầu?

### Quyết định

P0 dùng PyMuPDF để:

- Đọc PDF.
- Trích text theo page.
- Lưu page number, offsets, exact span và hash.

### Lý do

- Nhẹ và tích hợp trực tiếp trong Python worker.
- Đủ cho mục tiêu P0 là tạo provenance ở cấp trang và exact text.
- Dễ kiểm tra, sửa thủ công và xây demo.

### Vì sao chưa chọn GROBID?

GROBID cung cấp cấu trúc paper tốt hơn như section, reference và TEI XML, nhưng:

- Cần thêm service và tài nguyên.
- Tăng integration/debug risk.
- Không cần thiết để chứng minh workflow claim–evidence cơ bản.

### Vì sao OCR không phải P0?

OCR cần cho scanned PDF nhưng tốn tài nguyên và có thêm lỗi nhận dạng. MVP ưu tiên PDF có text layer; trường hợp parse lỗi dùng manual evidence fallback.

---

## 9. Vì sao chọn Next.js thay vì React/Vite thuần?

### Quyết định

Frontend dùng Next.js + TypeScript.

### Lý do

- Có cấu trúc routing, layout, error handling và conventions rõ ràng.
- Phù hợp dashboard nhiều màn hình của SpecLoop.
- TypeScript giúp đồng bộ API contract và giảm lỗi dữ liệu.
- Có thể dùng client-side interaction cho card workspace, evidence selection và Judge center.
- Hệ sinh thái React lớn, dễ dùng Tailwind và TanStack Query.

### Vì sao không chọn React/Vite thuần?

React/Vite nhẹ và phù hợp SPA nhỏ. Tuy nhiên nhóm sẽ phải tự quyết định thêm routing, conventions và một số cấu hình. Next.js được chọn để có cấu trúc thống nhất cho team 3 người.

### Lưu ý

SpecLoop không cần tận dụng toàn bộ tính năng full-stack của Next.js; business API vẫn nằm ở FastAPI để tránh hai backend nguồn sự thật.

---

## 10. Vì sao chọn REST thay vì GraphQL?

### Quyết định

Dùng REST API, OpenAPI và JSON schema.

### Lý do

- Workflow và resource của SpecLoop ánh xạ tốt sang endpoint REST.
- FastAPI tự tạo OpenAPI documentation.
- Dễ test, debug và tích hợp trong thời gian ngắn.
- Job dài có thể trả `job_id` rồi polling trạng thái; SSE là nâng cấp nếu cần.

### Vì sao không chọn GraphQL?

GraphQL hữu ích khi client cần truy vấn linh hoạt trên graph dữ liệu lớn và nhiều loại client. Với MVP, nó thêm schema resolver, authorization và caching complexity mà lợi ích chưa đủ lớn.

---

## 11. Vì sao chọn Docker Compose thay vì Kubernetes?

### Quyết định

Dùng Docker Compose để chạy:

```text
web
api
worker (nếu bật queue)
postgres
redis (nếu bật queue)
```

### Lý do

- Một file cấu hình có thể khởi động toàn bộ môi trường demo.
- Phù hợp local development và server đơn.
- Dễ tái lập môi trường giữa ba thành viên.
- Đủ cho quy mô đồ án.

### Vì sao không chọn Kubernetes?

Kubernetes giải quyết orchestration ở quy mô lớn, rolling deployment, autoscaling và self-healing. Các lợi ích đó không bù được chi phí cấu hình, học và debug cho MVP 4 tuần.

---

## 12. Vì sao chọn 3 Judge thay vì 5 Judge hoặc multi-model ensemble?

### Quyết định

MVP dùng ba Judge role độc lập:

1. Evidence Judge.
2. Research Judge.
3. Experiment Judge.

### Lý do

- Bao phủ ba nhóm lỗi cốt lõi của đề bài.
- Đáp ứng yêu cầu có nhiều Judge độc lập.
- Giảm token cost, latency và số prompt phải kiểm thử.
- Dễ tạo rubric và dataset đánh giá riêng cho từng Judge.

### Vì sao chưa dùng 5 Judge/multi-model?

- Tăng số model call và chi phí.
- Tăng độ phức tạp của aggregation.
- Không chắc tạo thêm giá trị tương xứng trên dataset nhỏ.

Conference Readiness và Contribution Judge riêng có thể được thêm ở P2 sau khi ba Judge P0 ổn định.

---

## 13. Vì sao chọn Markdown export trước PDF/DOCX?

### Quyết định

P0 xuất Markdown.

### Lý do

- Dễ sinh, kiểm tra, version-control và diff.
- Giữ được bảng, heading, citation và code block.
- Không cần xử lý template, font và pagination.
- Có thể chuyển sang PDF/DOCX bằng công cụ khác sau này.

PDF/DOCX export chỉ là presentation feature, không phải contribution cốt lõi.

---

## 14. Tóm tắt quyết định

| Hạng mục | Phương án chọn | Không chọn trong MVP | Lý do chính |
|---|---|---|---|
| Kiến trúc | Modular monolith | Microservices | Giảm distributed complexity |
| Repository | Monorepo | Nhiều repo | Đồng bộ vertical slice |
| Backend | FastAPI/Python | NestJS | Gần AI, PDF và evaluation stack |
| Database | PostgreSQL | MongoDB | Quan hệ, transaction và integrity |
| Vector search | Chưa bắt buộc | Vector DB riêng | Dataset nhỏ, exact evidence là trọng tâm |
| Job queue | Redis + RQ khi cần | Celery/BullMQ/Kafka | Đơn giản, cùng Python stack |
| File storage | Local volume | MinIO/S3 | Phù hợp single-host demo |
| PDF parser | PyMuPDF | GROBID/OCR bắt buộc | Đủ cho page-level evidence |
| Frontend | Next.js/TypeScript | React/Vite thuần | Conventions và routing thống nhất |
| API | REST/OpenAPI | GraphQL | Dễ tích hợp và kiểm thử |
| Deployment | Docker Compose | Kubernetes | Đủ cho đồ án và dễ tái lập |
| Review | 3 Judge | 5 Judge/multi-model | Bao phủ lỗi lõi với chi phí thấp |
| Export | Markdown | PDF/DOCX | Dễ tạo, diff và version-control |

---

## 15. Nguyên tắc xem xét lại quyết định

Các quyết định này không bất biến. Chỉ thay đổi khi:

1. Có requirement mới được xác nhận.
2. Technical spike chứng minh phương án hiện tại không đáp ứng.
3. Có metric hoặc lỗi thực tế cho thấy cần nâng cấp.
4. Thay đổi không làm nguy hiểm P0 và timeline.
5. Quyết định mới được ghi bằng ADR.

Nguyên tắc chung:

> Chọn công nghệ đơn giản nhất có thể đáp ứng đúng requirement và giúp team hoàn thành, kiểm thử, đánh giá được workflow cốt lõi trong phạm vi đồ án.

---

## Tài liệu tham khảo chính thức

- FastAPI documentation: https://fastapi.tiangolo.com/
- NestJS documentation: https://docs.nestjs.com/introduction
- PostgreSQL documentation: https://www.postgresql.org/docs/
- MongoDB data modeling and transactions: https://www.mongodb.com/docs/manual/data-modeling/ and https://www.mongodb.com/docs/manual/core/transactions/
- RQ documentation: https://python-rq.org/docs/
- PyMuPDF documentation: https://pymupdf.readthedocs.io/
- Next.js documentation: https://nextjs.org/docs
- Docker Compose documentation: https://docs.docker.com/compose/
