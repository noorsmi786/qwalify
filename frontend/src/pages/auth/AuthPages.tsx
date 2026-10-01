import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setAuthError(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in failed. Please try again.');
    }
  };

  return (
    <div className="glass rounded-2xl p-8 border border-violet-500/10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-2xl font-bold gradient-brand-text">Qwalify</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Sign in to your workspace</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <div>
          <Input
            label="Password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            icon={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            {...register('password')}
          />
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Forgot password?
          </Link>
        </div>

        {authError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{authError}</p>
          </div>
        )}

        <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
          Sign in <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Start for free
        </Link>
      </p>
    </div>
  );
}

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().min(2, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'At least 8 characters'),
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupForm) => {
    setAuthError(null);
    setSuccessMsg(null);
    try {
      await signup(data.email, data.password, data.companyName, data.fullName);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Account creation failed. Please try again.';
      // If the message indicates success but needs sign-in, show as info not error
      if (msg.includes('created') || msg.includes('sign in')) {
        setSuccessMsg(msg);
      } else {
        setAuthError(msg);
      }
    }
  };

  return (
    <div className="glass rounded-2xl p-8 border border-violet-500/10">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-2xl font-bold gradient-brand-text">Qwalify</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Create your workspace</h1>
        <p className="text-sm text-slate-500 mt-1">Start qualifying leads with AI — free</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Your name"
          placeholder="John Smith"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Company name"
          placeholder="Acme Corp"
          error={errors.companyName?.message}
          {...register('companyName')}
        />
        <Input
          label="Work email"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        {authError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{authError}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
            <p className="text-sm text-teal-400">{successMsg}</p>
          </div>
        )}

        <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
          Create workspace <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordPage() {
  return (
    <div className="glass rounded-2xl p-8 border border-violet-500/10">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-2xl font-bold gradient-brand-text">Qwalify</span>
      </div>
      <h1 className="text-xl font-semibold text-slate-100 mb-2">Reset password</h1>
      <p className="text-sm text-slate-500 mb-6">We'll send a reset link to your email.</p>
      <div className="space-y-4">
        <Input label="Email" type="email" placeholder="you@company.com" />
        <Button className="w-full">Send reset link</Button>
      </div>
      <p className="text-center text-sm text-slate-500 mt-6">
        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
