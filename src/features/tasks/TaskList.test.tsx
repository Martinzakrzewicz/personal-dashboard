import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../app/store';
import type { Task } from '../../db/types';
import { TaskList } from './TaskList';

function makeTask(overrides: Partial<Task> & { title: string }): Task {
  const base: Omit<Task, 'title'> = {
    id: overrides.title,
    spaceId: 'space-1',
    importance: 'medium',
    status: 'pending',
    dueDate: null,
    notes: '',
    orderIndex: 0,
    completedAt: null,
    milestoneId: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

const tasks: Task[] = [
  makeTask({ title: 'Medium task', importance: 'medium', orderIndex: 0 }),
  makeTask({ title: 'Critical task', importance: 'critical', orderIndex: 1 }),
  makeTask({ title: 'High task', importance: 'high', orderIndex: 2 }),
  makeTask({ title: 'Low task', importance: 'low', orderIndex: 3 }),
  makeTask({
    title: 'Done task',
    status: 'done',
    completedAt: '2026-01-02T00:00:00.000Z',
    orderIndex: 4,
  }),
];

describe('TaskList zones', () => {
  it('renders critical/high above medium and collapses low and completed sections', () => {
    useAppStore.setState({ tasks, activeSpaceId: 'space-1', milestones: [], blocks: [] });
    render(<TaskList />);

    const top = screen.getByTestId('task-zone-top');
    const middle = screen.getByTestId('task-zone-middle');
    expect(top.compareDocumentPosition(middle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(top).getByText('Critical task')).toBeInTheDocument();
    expect(within(top).getByText('High task')).toBeInTheDocument();
    expect(within(middle).getByText('Medium task')).toBeInTheDocument();

    const topPosition = top.compareDocumentPosition(screen.getByTestId('task-zone-low'));
    expect(topPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.queryByText('Low task')).not.toBeInTheDocument();
    expect(screen.queryByText('Done task')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /low priority/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: /completed/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('expands low and completed zones on demand', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ tasks, activeSpaceId: 'space-1', milestones: [], blocks: [] });
    render(<TaskList />);

    await user.click(screen.getByRole('button', { name: /low priority/i }));
    expect(screen.getByText('Low task')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /completed/i }));
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  it('opens the edit sheet from the keyboard', async () => {
    const user = userEvent.setup();
    useAppStore.setState({ tasks, activeSpaceId: 'space-1', milestones: [], blocks: [] });
    render(<TaskList />);

    const row = screen.getByRole('button', { name: 'Critical task — Open task' });
    row.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
  });
});
