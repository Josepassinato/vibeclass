import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card Component', () => {
  it('renders Card with children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders Card with custom className', () => {
    render(<Card className="custom-class">Card</Card>);
    expect(screen.getByText('Card')).toHaveClass('custom-class');
  });

  it('renders CardHeader correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
      </Card>
    );
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders CardContent correctly', () => {
    render(
      <Card>
        <CardContent>Main Content</CardContent>
      </Card>
    );
    
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('renders CardFooter correctly', () => {
    render(
      <Card>
        <CardFooter>Footer Content</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('renders complete Card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>With all parts</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Complete Card')).toBeInTheDocument();
    expect(screen.getByText('With all parts')).toBeInTheDocument();
    expect(screen.getByText('Content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
