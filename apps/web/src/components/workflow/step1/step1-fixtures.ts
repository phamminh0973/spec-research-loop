import type { InterpretationRecord } from "@specloop/schemas";

import { LOCAL_PROJECT_ID } from "../shared/local-fixtures";

export const LOCAL_INTERPRETATION_PROPOSAL: InterpretationRecord = {
  interpretationId: "00000000-0000-4000-8000-000000000011",
  projectId: LOCAL_PROJECT_ID,
  output: {
    simpleInterpretation:
      "Đây là dữ liệu fixture để kiểm tra vòng review. Nó mô phỏng cách hệ thống diễn giải một ý tưởng trước khi người dùng xác nhận.",
    technicalInterpretation:
      "Fixture này mô phỏng một interpretation record có output đơn giản, output kỹ thuật, assumptions, objectives và ambiguities theo contract AIT-01.",
    assumptions: [
      "Người dùng sẽ kiểm tra nội dung trước khi chuyển sang decomposition.",
    ],
    objectives: ["Kiểm tra trạng thái đề xuất và xác nhận trong UI."],
    ambiguities: ["Chưa có dữ liệu dự án production trong local fixture."],
  },
  status: "PROPOSED",
  promptId: "PT-01",
  promptVersion: "local-fixture",
  schemaVersion: "local-fixture",
  provider: "local-fixture",
  model: "local-fixture",
  retryCount: 0,
  createdAt: "2026-08-13T00:00:00Z",
  confirmedAt: null,
};

export function cloneLocalInterpretation(
  status: InterpretationRecord["status"] = "PROPOSED"
): InterpretationRecord {
  return {
    ...LOCAL_INTERPRETATION_PROPOSAL,
    status,
    confirmedAt: status === "USER_CONFIRMED" ? "2026-08-13T00:00:00Z" : null,
  };
}
