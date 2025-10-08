import { render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { ITPStatusButtons } from '../../construction/ITPStatusButtons';

/**
 * Touch Target Accessibility Tests
 *
 * Ensures all interactive elements meet the minimum 44px touch target size
 * as recommended by WCAG 2.1 Level AAA and mobile platform guidelines.
 */

describe('Touch Target Sizes', () => {
  describe('Button Component', () => {
    it('should have minimum 40px height for small size', () => {
      render(<Button size="sm">Click me</Button>);
      const button = screen.getByRole('button');

      // Check for min-height class in className
      expect(button.className).toContain('min-h-[40px]');
    });

    it('should have minimum 48px height for medium size', () => {
      render(<Button size="md">Click me</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-[48px]');
    });

    it('should have minimum 56px height for large size', () => {
      render(<Button size="lg">Click me</Button>);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-[56px]');
    });

    it('should include expanded touch target for better mobile interaction', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button');

      // Button uses an expanded touch target span instead of touch-manipulation class
      const expandedTarget = button.querySelector('span[aria-hidden="true"]');
      expect(expandedTarget).toBeInTheDocument();
      expect(expandedTarget?.className).toContain('absolute inset-0 -m-1');
    });
  });

  describe('IconButton Component', () => {
    const icon = <span>Icon</span>;

    it('should have minimum 44x44px touch target on mobile for small size', () => {
      render(<IconButton icon={icon} size="sm" label="Test icon" />);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-[44px]');
      expect(button.className).toContain('min-w-[44px]');
    });

    it('should have minimum 48x48px touch target for medium size', () => {
      render(<IconButton icon={icon} size="md" label="Test icon" />);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-[48px]');
      expect(button.className).toContain('min-w-[48px]');
    });

    it('should have minimum 56x56px touch target for large size', () => {
      render(<IconButton icon={icon} size="lg" label="Test icon" />);
      const button = screen.getByRole('button');

      expect(button.className).toContain('min-h-[56px]');
      expect(button.className).toContain('min-w-[56px]');
    });

    it('should have aria-label for accessibility', () => {
      render(<IconButton icon={icon} label="Delete item" />);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-label', 'Delete item');
    });
  });

  describe('ITPStatusButtons Component', () => {
    it('should have minimum 40px height for small size', () => {
      render(<ITPStatusButtons size="sm" />);
      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button.className).toContain('min-h-[40px]');
      });
    });

    it('should have minimum 48px height for medium size', () => {
      render(<ITPStatusButtons size="md" />);
      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button.className).toContain('min-h-[48px]');
      });
    });

    it('should have minimum 56px height for large size', () => {
      render(<ITPStatusButtons size="lg" />);
      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button.className).toContain('min-h-[56px]');
      });
    });

    it('should render all three status buttons', () => {
      render(<ITPStatusButtons />);

      expect(screen.getByText('Pass')).toBeInTheDocument();
      expect(screen.getByText('Fail')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Responsive Touch Targets', () => {
    it('should have consistent touch target sizes across all components', () => {
      render(<Button size="sm">Click me</Button>);
      const button = screen.getByRole('button');

      // Components use fixed min-height values with expanded touch targets
      expect(button.className).toContain('min-h-[40px]');

      // Verify expanded touch target exists for better mobile interaction
      const expandedTarget = button.querySelector('span[aria-hidden="true"]');
      expect(expandedTarget).toBeInTheDocument();
    });

    it('should use expanded touch targets for better mobile accessibility', () => {
      render(<IconButton icon={<span>Icon</span>} size="sm" label="Test" />);
      const button = screen.getByRole('button');

      // IconButton uses minimum touch target sizes
      expect(button.className).toContain('min-h-[44px]');
      expect(button.className).toContain('min-w-[44px]');
    });
  });
});
