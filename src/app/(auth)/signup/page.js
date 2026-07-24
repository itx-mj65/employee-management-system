'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, User, Phone, Building2, Briefcase, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const DOMAIN = '@medbillingrcm.com';

const stepVariants = {
  enter: { x: 30, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -30, opacity: 0 },
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=details, 2=otp
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', department: '', position: '',
  });
  const [errors, setErrors] = useState({});
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!form.email.toLowerCase().trim().endsWith(DOMAIN)) e.email = `Only ${DOMAIN} emails allowed`;
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain an uppercase letter';
    else if (!/[0-9]/.test(form.password)) e.password = 'Must contain a number';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.phone.trim() && form.phone.replace(/[\s\-\(\)]/g, '').length < 10) e.phone = 'Minimum 10 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitStep1 = async () => {
    if (!validateStep1()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', {
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        phone: form.phone.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
      });
      if (data.devOtp) setDevOtp(data.devOtp);
      toast.success('Verification code sent!');
      setStep(2);
      setCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: form.email.toLowerCase().trim(),
        otp: code,
        name: form.name.trim(),
        password: form.password,
        phone: form.phone.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
      });
      toast.success('Account created!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/resend-otp', { email: form.email.toLowerCase().trim() });
      if (data.devOtp) setDevOtp(data.devOtp);
      toast.success('New code sent!');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 px-16 text-primary-foreground">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
              <span className="text-2xl font-bold">E</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Join Your Team</h1>
            <p className="text-lg opacity-80 leading-relaxed max-w-md">
              Create your account to manage tasks, track attendance, and collaborate with your team.
            </p>
            <div className="mt-8 space-y-3 text-sm opacity-70">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Track daily tasks and progress</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Manage attendance and breaks</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Get real-time notifications</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md">

          <div className="lg:hidden mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <span className="text-lg font-bold text-primary-foreground">E</span>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: Details */}
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <h2 className="text-2xl font-bold mb-1">Create Account</h2>
                <p className="text-muted-foreground text-sm mb-6">Only <span className="font-medium text-foreground">{DOMAIN}</span> emails are allowed</p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="name" value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Doe" className="pl-10 h-11" autoFocus />
                    </div>
                    {errors.name && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">Work Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder={`you${DOMAIN}`} className="pl-10 h-11" />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••" className="pl-10 pr-10 h-11" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.password}</p>}
                    </div>
                    <div>
                      <Label htmlFor="confirm">Confirm</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="confirm" type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="••••••" className="pl-10 h-11" />
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dept">Department</Label>
                      <div className="relative mt-1">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="dept" value={form.department} onChange={e => update('department', e.target.value)} placeholder="Engineering" className="pl-10 h-11" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="pos">Position</Label>
                      <div className="relative mt-1">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="pos" value={form.position} onChange={e => update('position', e.target.value)} placeholder="Developer" className="pl-10 h-11" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 8900" className="pl-10 h-11" />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.phone}</p>}
                  </div>

                  {/* Password rules */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Password requirements:</p>
                    {[
                      { test: form.password.length >= 6, label: 'At least 6 characters' },
                      { test: /[A-Z]/.test(form.password), label: 'One uppercase letter' },
                      { test: /[0-9]/.test(form.password), label: 'One number' },
                      { test: form.password && form.password === form.confirmPassword, label: 'Passwords match' },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className={`h-3 w-3 ${r.test ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
                        <span className={r.test ? 'text-foreground' : 'text-muted-foreground'}>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={submitStep1} disabled={loading} className="w-full h-11">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Verify Your Email</h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to<br />
                    <span className="font-medium text-foreground">{form.email.toLowerCase().trim()}</span>
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-2.5 mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-input bg-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Dev OTP hint */}
                {devOtp && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                    <p className="text-xs text-amber-700 dark:text-amber-400">Dev Mode — Your code: <span className="font-mono font-bold text-base">{devOtp}</span></p>
                  </div>
                )}

                <Button onClick={verifyOtp} disabled={loading || otp.join('').length !== 6} className="w-full h-11 mb-4">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & Create Account <CheckCircle2 className="ml-2 h-4 w-4" /></>}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?{' '}
                    {countdown > 0 ? (
                      <span className="text-muted-foreground">Resend in {countdown}s</span>
                    ) : (
                      <button onClick={resendOtp} disabled={loading} className="font-medium text-primary hover:underline">
                        Resend Code
                      </button>
                    )}
                  </p>
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Code expires in 10 minutes. Max 5 attempts.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
