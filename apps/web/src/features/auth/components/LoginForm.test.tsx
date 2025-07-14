import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { render } from '@/test/utils';
import { createClient } from '@/lib/supabase/client';

// Mock the router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

describe('LoginForm', () => {
  const user = userEvent.setup();
  const mockSupabaseClient = createClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: { user: { id: '123' }, session: {} },
      error: null,
    });

    vi.mocked(mockSupabaseClient.auth.signInWithPassword).mockImplementation(mockSignIn);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on login failure', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    vi.mocked(mockSupabaseClient.auth.signInWithPassword).mockImplementation(mockSignIn);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    const mockSignIn = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));

    vi.mocked(mockSupabaseClient.auth.signInWithPassword).mockImplementation(mockSignIn);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  it('navigates to signup page when signup link is clicked', async () => {
    render(<LoginForm />);

    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });

  it('focuses email input on mount', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(document.activeElement).toBe(emailInput);
  });
});
