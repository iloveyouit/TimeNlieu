"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  deleteProject,
  deleteProjectTask,
  deleteRole,
  upsertProject,
  upsertProjectTask,
  upsertRole,
} from "@/lib/admin-actions";

type Project = {
  id: string;
  name: string;
  code: string;
  clientName: string | null;
  isActive: boolean | null;
};

type ProjectTask = {
  id: string;
  projectId: string;
  name: string;
  code: string | null;
};

type Role = { id: string; name: string };

export function AdminView({
  initialProjects,
  initialTasks,
  initialRoles,
}: {
  initialProjects: Project[];
  initialTasks: ProjectTask[];
  initialRoles: Role[];
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isPending, startTransition] = useTransition();

  const handleProjectChange = (id: string, patch: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === id ? { ...project, ...patch } : project))
    );
  };

  const handleTaskChange = (id: string, patch: Partial<ProjectTask>) => {
    setTasks((prev) => (prev.map((task) => (task.id === id ? { ...task, ...patch } : task))));
  };

  const handleRoleChange = (id: string, patch: Partial<Role>) => {
    setRoles((prev) => prev.map((role) => (role.id === id ? { ...role, ...patch } : role)));
  };

  const handleAddProject = () => {
    setProjects((prev) => [
      {
        id: `new-${Date.now()}`,
        name: "",
        code: "",
        clientName: "",
        isActive: true,
      },
      ...prev,
    ]);
  };

  const handleAddTask = () => {
    if (projects.length === 0) return;
    setTasks((prev) => [
      {
        id: `new-${Date.now()}`,
        projectId: projects[0]?.id ?? "",
        name: "",
        code: "",
      },
      ...prev,
    ]);
  };

  const handleAddRole = () => {
    setRoles((prev) => [
      {
        id: `new-${Date.now()}`,
        name: "",
      },
      ...prev,
    ]);
  };

  const handleSaveProject = (project: Project) => {
    startTransition(async () => {
      const id = project.id.startsWith("new-")
        ? undefined
        : project.id;
      const nextId = await upsertProject({
        id,
        name: project.name,
        code: project.code,
        clientName: project.clientName,
        isActive: project.isActive ?? true,
      });
      if (id) return;
      setProjects((prev) =>
        prev.map((item) => (item.id === project.id ? { ...item, id: nextId } : item))
      );
    });
  };

  const handleSaveTask = (task: ProjectTask) => {
    startTransition(async () => {
      const id = task.id.startsWith("new-") ? undefined : task.id;
      const nextId = await upsertProjectTask({
        id,
        projectId: task.projectId,
        name: task.name,
        code: task.code,
      });
      if (id) return;
      setTasks((prev) =>
        prev.map((item) => (item.id === task.id ? { ...item, id: nextId } : item))
      );
    });
  };

  const handleSaveRole = (role: Role) => {
    startTransition(async () => {
      const id = role.id.startsWith("new-") ? undefined : role.id;
      const nextId = await upsertRole({ id, name: role.name });
      if (id) return;
      setRoles((prev) =>
        prev.map((item) => (item.id === role.id ? { ...item, id: nextId } : item))
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Reference Data</CardTitle>
        <CardDescription>Manage projects, tasks, and roles used in time entry.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Projects populate the weekly grid dropdowns.
              </p>
              <Button onClick={handleAddProject}>Add Project</Button>
            </div>
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.2fr_1fr_1fr_auto_auto]"
                >
                  <Input
                    placeholder="Name"
                    value={project.name}
                    onChange={(event) => handleProjectChange(project.id, { name: event.target.value })}
                  />
                  <Input
                    placeholder="Code"
                    value={project.code}
                    onChange={(event) => handleProjectChange(project.id, { code: event.target.value })}
                  />
                  <Input
                    placeholder="Client"
                    value={project.clientName ?? ""}
                    onChange={(event) =>
                      handleProjectChange(project.id, { clientName: event.target.value })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={project.isActive ?? true}
                      onChange={(event) =>
                        handleProjectChange(project.id, { isActive: event.target.checked })
                      }
                    />
                    Active
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveProject(project)} disabled={isPending}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await deleteProject(project.id);
                        setProjects((prev) => prev.filter((item) => item.id !== project.id));
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Tasks belong to a project.</p>
              <Button onClick={handleAddTask} disabled={projects.length === 0}>
                Add Task
              </Button>
            </div>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <select
                    className="h-9 w-full rounded-md border bg-background px-2"
                    value={task.projectId}
                    onChange={(event) =>
                      handleTaskChange(task.id, { projectId: event.target.value })
                    }
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} — {project.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Task name"
                    value={task.name}
                    onChange={(event) => handleTaskChange(task.id, { name: event.target.value })}
                  />
                  <Input
                    placeholder="Code"
                    value={task.code ?? ""}
                    onChange={(event) => handleTaskChange(task.id, { code: event.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveTask(task)} disabled={isPending}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await deleteProjectTask(task.id);
                        setTasks((prev) => prev.filter((item) => item.id !== task.id));
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Roles appear in the weekly grid.</p>
              <Button onClick={handleAddRole}>Add Role</Button>
            </div>
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center gap-2 rounded-lg border p-3">
                  <Input
                    placeholder="Role name"
                    value={role.name}
                    onChange={(event) => handleRoleChange(role.id, { name: event.target.value })}
                  />
                  <Button size="sm" onClick={() => handleSaveRole(role)} disabled={isPending}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await deleteRole(role.id);
                      setRoles((prev) => prev.filter((item) => item.id !== role.id));
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
