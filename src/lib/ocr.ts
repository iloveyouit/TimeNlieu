
export type OcrResult = {
  text: string;
  data: Array<{
    projectId: string | null;
    taskId: string | null;
    roleId: string | null;
    entryType: string;
    description: string;
    hours: number[]; // 7 days (Sun-Sat)
  }>;
};

export async function processImage(file: File): Promise<OcrResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock response - simulates reading a timesheet with some known projects
  // In a real implementation, this would call AWS Textract or Google Cloud Vision
  return {
    text: "Simulated OCR Text Result",
    data: [
      {
        projectId: "project-u-ops", // Matches seed data
        taskId: "task-u-ops-maint", // Matches seed data
        roleId: "role-server",      // Matches seed data
        entryType: "Work",
        description: "Routine maintenance tasks from OCR",
        hours: [0, 8, 8, 8, 8, 8, 0], // M-F 8 hours
      },
      {
        projectId: "project-lvc-igs-inf",
        taskId: "task-lvc-ops",
        roleId: "role-team-member",
        entryType: "Work",
        description: "Operations support from OCR",
        hours: [0, 4, 4, 4, 4, 4, 0], // M-F 4 hours
      },
      {
        projectId: null, // Unrecognized project
        taskId: null,
        roleId: null,
        entryType: "Work",
        description: "Unknown Project Row",
        hours: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  };
}
