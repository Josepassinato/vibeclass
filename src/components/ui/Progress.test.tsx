import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { Progress } from './progress';

describe('Progress Component', () => {
  it('renders with default value', () => {
    render(<Progress value={50} />);
    
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders with 0% progress', () => {
    render(<Progress value={0} />);
    
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders with 100% progress', () => {
    render(<Progress value={100} />);
    
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('accepts custom className', () => {
    render(<Progress value={50} className="custom-progress" />);
    
    const progressBar = document.querySelector('.custom-progress');
    expect(progressBar).toBeInTheDocument();
  });

  it('handles undefined value gracefully', () => {
    render(<Progress />);
    
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });
});
