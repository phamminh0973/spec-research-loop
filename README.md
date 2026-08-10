# SpecResearch Loop

SpecLoop là website giúp biến một research idea còn mơ hồ thành research specification có cấu trúc, provenance, experiment plan và vòng lặp review–revision.

**Trạng thái hiện tại:** `SCAFFOLDED` — monorepo, shared schemas, web và API đã có source code và đã qua local install/typecheck/build/smoke verification; workflow sản phẩm, automated tests và Docker deployment vẫn `PLANNED`.

## Phạm vi MVP

- Interpretation và user confirmation.
- Typed nodes/relations cho problem, gap, contribution, claim, evidence và experiment.
- Literature search/import, PDF/manual evidence và Claim–Evidence Integrity Loop.
- Research specification 14 phần.
- Ba Judge độc lập: Evidence, Research và Experiment.
- User revision, version/diff cơ bản và Markdown export.

P1/P2 như Redis/BullMQ, second academic API, graph visualization, five Judges, multi-model, GROBID, MinIO/S3 và PDF/DOCX export không thuộc MVP.

## Kiến trúc định hướng

Monorepo + modular monolith + background job processing:

```text
apps/web       Next.js + TypeScript (App Router)
apps/api       Node.js + tRPC + Fastify modular monolith
apps/worker    worker cùng application/domain (Node.js)
packages/schemas  shared Zod schemas + inferred TypeScript types
PostgreSQL     shared database
Local volume   PDF/source storage cho MVP
Docker Compose local delivery
```

End-to-end type safety: `apps/web` imports `AppRouter` từ `apps/api`; mọi
input/output đều là Zod schema ở `packages/schemas`. Backend stack được chốt
trong [ADR-001](docs/architecture/adrs/ADR-001-trpc-backend.md) (Node + tRPC
thay cho FastAPI).

Worker không phải business microservice độc lập. Redis/BullMQ chỉ được thêm
khi có quyết định P1 và evidence về nhu cầu job dài.

## Team Members

| No. | Full Name            | Student ID |
| --: | -------------------- | ---------- |
|   1 | Nguyễn Long          | 22127242   |
|   2 | Phạm Văn Minh        | 22127272   |
|   3 | Nguyễn Trần Minh Thư | 22127403   |

## Ownership

| Role                                          | Trách nhiệm chính                                                              | Hỗ trợ                              |
| --------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| Member 1 — Product Workflow and Frontend Lead | User journey, web UI, interpretation, spec, revision/version, E2E UX           | API contract, evaluation UI         |
| Member 2 — Backend, Data and Platform Lead    | Node.js, tRPC/Fastify, PostgreSQL, jobs, storage, Docker, reliability          | Integration và security tests       |
| Member 3 — AI, Evidence and Evaluation Lead   | Prompts/schemas, literature/evidence, generator, Judges, baselines, evaluation | Contract tests và provenance review |

Không gán tên cá nhân trong tài liệu khi chưa có quyết định nhóm.

## Tài liệu chính

- [Project proposal](docs/01-project-proposal.md)
- [Product requirements](docs/02-product-requirements.md)
- [Architecture and technical design](docs/03-architecture-and-technical-design.md)
- [AI system design](docs/04-ai-system-design.md)
- [Product backlog](docs/05-product-backlog.md)
- [Four-week delivery plan](docs/06-delivery-plan.md)
- [Test and evaluation plan](docs/07-test-and-evaluation-plan.md)
- [Risk, security and cost](docs/08-risk-security-and-cost.md)
- [Requirement traceability matrix](docs/09-requirement-traceability-matrix.md)
- [Final report outline](docs/10-final-report-outline.md)
- [Agent planning và tiến độ implementation](.agents/agent-docs/README.md)

Nguồn authority: [assignment](docs/source/01-assignment.md) và [approved proposal](docs/source/02-approved-proposal.md). Không sửa các file trong `docs/source/`.

## Cấu hình local

```powershell
Copy-Item .env.example .env
```

`.env` chỉ dành cho local và đã được ignore. Không đặt API key hoặc secret thật vào repository; điền provider/model/budget theo quyết định nhóm khi implementation bắt đầu.

## Docker Compose scaffold

`docker-compose.yml` mô tả các service dự kiến (`web`, `api`, `worker`, `db`). Các application Dockerfile chưa tồn tại, nên chưa có lệnh chạy ứng dụng được xác nhận. Khi source code và Dockerfile được tạo, kiểm tra cấu hình bằng:

```powershell
docker compose config
```

## Scope guard

Team gồm 3 người và có khoảng 4 tuần. Mọi tính năng phải trace về requirements/backlog; không thêm microservices, Kafka, Kubernetes, event sourcing hoặc công nghệ ngoài scope khi chưa có ADR/quyết định nhóm.
