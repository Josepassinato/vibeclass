import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Badge } from './badge';

describe('Badge Component', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    
    expect(screen.getByText('Default Badge')).toBeInTheDocument();
    expect(screen.getByText('Default Badge')).toHaveClass('bg-primary');
  });

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary');
  });

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>);
    
    expect(screen.getByText('Error')).toHaveClass('bg-destructive');
  });

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    
    expect(screen.getByText('Outline')).toHaveClass('text-foreground');
  });

  it('accepts custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    
    expect(screen.getByText('Custom')).toHaveClass('custom-class');
  });

  it('renders children correctly', () => {
    render(
      <Badge>
        <span data-testid="child">Child Element</span>
      </Badge>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
