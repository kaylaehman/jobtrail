import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeadlineBadge } from './DeadlineBadge';

describe('DeadlineBadge', () => {
  it('renders nothing when deadline is null', () => {
    const { container } = render(<DeadlineBadge deadline={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an amber "Due in Nd" badge when deadline is within 7 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    render(<DeadlineBadge deadline={soon.toISOString()} />);
    expect(screen.getByText(/Due in/i)).toBeInTheDocument();
  });

  it('renders an "Overdue" badge when deadline has passed', () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    render(<DeadlineBadge deadline={past.toISOString()} />);
    expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
  });

  it('renders nothing for a distant deadline (>7 days out)', () => {
    const distant = new Date();
    distant.setDate(distant.getDate() + 30);
    const { container } = render(<DeadlineBadge deadline={distant.toISOString()} />);
    expect(container.firstChild).toBeNull();
  });
});
