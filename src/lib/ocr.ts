export type OcrWeekRow = {
  projectId: string | null;
  taskId: string | null;
  roleId: string | null;
  entryType: "Work" | "Admin";
  hours: number[];
};

export type OcrResult = {
  weekStartDate: number;
  rows: OcrWeekRow[];
};

export type OcrProvider = "stub";

export function getOcrProvider(): OcrProvider {
  return "stub";
}

export async function runOcrStub(): Promise<OcrResult> {
  const weekStartDate = (() => {
    const now = new Date();
    const day = now.getUTCDay();
    return Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - day
    );
  })();

  return {
    weekStartDate,
    rows: [
      {
        projectId: null,
        taskId: null,
        roleId: null,
        entryType: "Work",
        hours: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  };
}
