# QuantumRegTech Documentation Index

## Product and feature design

- [Spec Kit guide and document map](SPECKIT_GUIDE.md)
- [Constitution](../.specify/memory/constitution.md)
- [Investor Due Diligence Demo specification](../specs/001-investor-due-diligence-demo/spec.md)
- [Luồng người dùng để duyệt](USER_FLOWS.md)
- [Hướng dẫn sử dụng và diễn giải danh mục](USER_GUIDE.md)
- [Runbook demo 5–7 phút](DEMO_RUNBOOK.md)
- [Architecture and implementation plan](../specs/001-investor-due-diligence-demo/plan.md)
- [Implementation backlog](../specs/001-investor-due-diligence-demo/tasks.md)
- [Agent Platform specification](../specs/002-agent-platform/spec.md)
- [Agent Platform architecture and deployment plan](../specs/002-agent-platform/plan.md)
- [Agent Platform backlog](../specs/002-agent-platform/tasks.md)
- [Neo4j Aura and MCP setup](NEO4J_MCP.md)
- [Deploy tách frontend (Vercel) và backend (FastAPI)](DEPLOY.md)
- [Domain data model](../specs/001-investor-due-diligence-demo/data-model.md)
- [Draft API contract](../specs/001-investor-due-diligence-demo/contracts/openapi.yaml)

## Domain and current product

- [Financial engine formulas and assumptions](FINANCIAL_ENGINE.md)
- [External services and tool selection](EXTERNAL_SERVICES.md)
- [Research dataset schema and quality gates](RESEARCH_DATASET.md)
- [Workbook data dictionary and known decisions](DATA.md)
- [UI design reference](UI_DESIGN.md)
- [Current tech stack inventory](TECH_STACK.md)
- [Demo status and known limitations](DEMO_STATUS.md)
- [Bản nháp thay đổi từ Vòng 1 sang bản demo hiện tại](ROUND2_CHANGES.md)
- [Lộ trình triển khai theo phase](IMPLEMENTATION_ROADMAP.md)
- [Original build packet (lưu trữ – không còn là nguồn sự thật)](archive/QuantumRegTech_Coding_Agent_Packet.md)

## Source-of-truth order

1. Approved methodology decisions and current workbook for demo facts.
2. Feature acceptance criteria for intended user behavior.
3. Implementation plan/contracts for target architecture.
4. Current code and `DEMO_STATUS.md` for what is actually implemented.

When these disagree, record the disagreement and resolve it; do not silently overwrite source data or imply a planned feature already ships.
