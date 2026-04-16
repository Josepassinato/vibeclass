import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const enabled = process.env.SCHOOL_FACTORY_E2E_ENABLED === 'true';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.SCHOOL_FACTORY_ADMIN_PASSWORD;

const describeIfEnabled = enabled && supabaseUrl && serviceRoleKey && adminPassword ? describe : describe.skip;

describeIfEnabled('School Factory Integration Flow', () => {
  it('create_project -> generate_master_plan -> enqueue_pipeline -> run_next_task', async () => {
    const supabase = createClient(supabaseUrl as string, serviceRoleKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const projectName = `E2E Factory ${Date.now()}`;

    const { data: createData, error: createError } = await supabase.functions.invoke('school-factory', {
      body: {
        action: 'create_project',
        password: adminPassword,
        project: {
          name: projectName,
          mode: 'create_zero',
          niche: 'teste integração',
          target_audience: 'time QA',
          objective: 'validar pipeline',
          initial_capital: 2000,
          budget_limit_usd: 200,
          qa_min_score: 70,
          documents: [
            {
              source_type: 'text',
              title: 'Base de teste',
              content: 'Curso de teste com foco em automação.',
            },
          ],
        },
      },
    });

    expect(createError).toBeNull();
    expect(createData?.project?.id).toBeTruthy();
    const projectId = createData.project.id as string;

    const { data: planData, error: planError } = await supabase.functions.invoke('school-factory', {
      body: {
        action: 'generate_master_plan',
        password: adminPassword,
        project_id: projectId,
      },
    });

    expect(planError).toBeNull();
    expect(planData?.master_plan).toBeTruthy();

    const { data: pipelineData, error: pipelineError } = await supabase.functions.invoke('school-factory', {
      body: {
        action: 'enqueue_pipeline',
        password: adminPassword,
        project_id: projectId,
      },
    });

    expect(pipelineError).toBeNull();
    expect(Number(pipelineData?.tasks_created || 0)).toBeGreaterThan(0);

    const { data: runData, error: runError } = await supabase.functions.invoke('school-factory', {
      body: {
        action: 'run_next_task',
        password: adminPassword,
        project_id: projectId,
      },
    });

    expect(runError).toBeNull();
    expect(runData?.task).toBeTruthy();
    expect(['completed', 'blocked', 'failed', 'running']).toContain(runData.task.status);
  }, 180_000);
});
