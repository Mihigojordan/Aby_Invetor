import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAdminAuth from '../../../context/AdminAuthContext';
import api from '../../../api/api';
import './Auth.css';

const LoginPage = () => {
  const [state, setState] = useState({ view: 'login', remember: false, loading: false });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [lockPass, setLockPass] = useState('');
  const [errors, setErrors] = useState({});

  const { login, isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = location.state?.from?.pathname || "/admin/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleGo = (view) => {
    setState(prev => ({ ...prev, view, loading: false }));
    setErrors({});
    setEmail('');
    setPassword('');
    setNewPass('');
    setConfirmPass('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!validEmail(email)) {
      newErrors.loginEmail = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.loginPass = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await login({ adminEmail: email, password });
      if (response.authenticated) {
        const from = location.state?.from?.pathname || "/admin/dashboard";
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrors({ submit: err.message || 'Login failed' });
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!validEmail(email)) {
      newErrors.forgotEmail = 'Enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      await api.post('/admin/forgot-password', { adminEmail: email });
      setState(prev => ({ ...prev, view: 'sent', loading: false }));
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to send reset link' });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (newPass.length < 6) {
      newErrors.reset = 'Password must be at least 6 characters';
    }
    if (newPass !== confirmPass) {
      newErrors.reset = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      // TODO: Call reset-password endpoint with token
      setState(prev => ({ ...prev, view: 'done', loading: false }));
    } catch (err) {
      setErrors({ reset: err.message || 'Failed to reset password' });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#8A93A6' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      {/* Brand Panel */}
      <div className="brand">
        <div className="blob1"></div>
        <div className="blob2"></div>
        <div className="dots"></div>

        <div className="logoRow">
          <svg width="62" height="70" viewBox="0 0 44 50" fill="none">
            <polygon points="22,5 9,12.5 9,27.5 22,35 35,27.5 35,12.5" stroke="#fff" strokeWidth="3.4" strokeLinejoin="round"/>
            <rect x="17" y="15.5" width="10" height="10" rx="2.6" fill="#de37a3"/>
            <path d="M11 40 Q22 49 33 40" stroke="#de37a3" strokeWidth="3.4" strokeLinecap="round" fill="none"/>
          </svg>
          <div className="wordmark" style={{fontSize:'30px',letterSpacing:'.5px'}}>ABY<span> INVENTORY</span></div>
        </div>

        <div className="pitch">
          <div className="eyebrow">SMART STOCK CONTROL</div>
          <h1>Run your warehouse with total confidence.</h1>
          <p className="lead">Track stock in real time, sync offline, and manage every category from one beautifully simple dashboard.</p>

          <div className="glass">
            <div className="glassCard">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:'12.5px',fontWeight:'600',color:'rgba(255,255,255,.8)'}}>Today's movement</span>
                <span style={{fontSize:'11px',fontWeight:'700',color:'#bdeaf5',background:'rgba(44,184,222,.18)',padding:'3px 9px',borderRadius:'20px'}}>Live</span>
              </div>
              <div className="bars">
                <i style={{height:'42%'}}></i>
                <i style={{height:'64%'}}></i>
                <i style={{height:'50%'}}></i>
                <i style={{height:'86%',background:'var(--cyan)'}}></i>
                <i style={{height:'70%'}}></i>
                <i style={{height:'100%',background:'var(--cyan)'}}></i>
              </div>
              <div style={{display:'flex',gap:'18px',marginTop:'14px'}}>
                <div>
                  <div style={{fontSize:'19px',fontWeight:'800',lineHeight:'1'}}>248</div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,.7)'}}>Stock in</div>
                </div>
                <div>
                  <div style={{fontSize:'19px',fontWeight:'800',lineHeight:'1'}}>192</div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,.7)'}}>Sold out</div>
                </div>
              </div>
            </div>
            <div className="chip">
              <div style={{width:'32px',height:'32px',borderRadius:'9px',background:'var(--greensoft)',color:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',flex:'none'}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div style={{fontSize:'12.5px',fontWeight:'700',lineHeight:'1.1'}}>All synced</div>
                <div style={{fontSize:'11px',color:'var(--muted)'}}>just now</div>
              </div>
            </div>
          </div>
        </div>

        <div className="copyright">© 2026 ABY Inventory · Umusingi Hardware</div>
      </div>

      {/* Form Panel */}
      <div className="formPanel">
        <div className="formInner">

          {/* Header */}
          <div className="view">
            <div className="loginLogoRow">
              <svg width="60" height="68" viewBox="0 0 44 50" fill="none" style={{flex:'none'}}>
                <polygon points="22,5 9,12.5 9,27.5 22,35 35,27.5 35,12.5" stroke="url(#mg2)" strokeWidth="3.4" strokeLinejoin="round"/>
                <rect x="17" y="15.5" width="10" height="10" rx="2.6" fill="#de37a3"/>
                <path d="M11 40 Q22 49 33 40" stroke="#de37a3" strokeWidth="3.4" strokeLinecap="round" fill="none"/>
                <defs>
                  <linearGradient id="mg2" x1="9" y1="5" x2="35" y2="35">
                    <stop stopColor="color-mix(in srgb, var(--accent) 100%, #fff)"/>
                    <stop offset="1" stopColor="color-mix(in srgb, var(--accent) 60%, #0a2730)"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="wordmark" style={{fontSize:'30px',letterSpacing:'.3px',color:'var(--slate)'}}>ABY<span style={{color:'var(--muted)',opacity:'1'}}> INVENTORY</span></div>
            </div>
            <h1 className="vTitle">Welcome back</h1>
            <p className="vSub">Sign in to your ABY Inventory dashboard</p>
          </div>

          {/* Login View */}
          {state.view === 'login' && (
            <div className="view" style={{marginTop:'26px'}}>
              <div style={{display:'flex',gap:'11px'}}>
                <button className="social" onClick={() => alert('Google login')}>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  Google
                </button>
                <button className="social" onClick={() => alert('Microsoft login')}>
                  <svg width="16" height="16" viewBox="0 0 23 23">
                    <path fill="#F25022" d="M1 1h10v10H1z"/>
                    <path fill="#7FBA00" d="M12 1h10v10H12z"/>
                    <path fill="#00A4EF" d="M1 12h10v10H1z"/>
                    <path fill="#FFB900" d="M12 12h10v10H12z"/>
                  </svg>
                  Microsoft
                </button>
              </div>
              <div className="divider"><div className="ln"></div><span>or sign in with email</span><div className="ln"></div></div>

              <label className="fl">Email address</label>
              <div className="field">
                <svg className="lead" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="var(--muted)" strokeWidth="1.7"/>
                  <path d="m4 7 8 6 8-6" stroke="var(--muted)" strokeWidth="1.7" strokeLinejoin="round"/>
                </svg>
                <input className={`inp email ${errors.loginEmail ? 'bad' : ''}`} placeholder="you@company.com" value={email} onChange={(e) => {setEmail(e.target.value); if(errors.loginEmail) setErrors({...errors, loginEmail: ''});}}/>
              </div>
              {errors.loginEmail && <div className="err">{errors.loginEmail}</div>}

              <div style={{marginTop:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <label className="fl">Password</label>
                <span className="link" onClick={() => handleGo('forgot')}>Forgot password?</span>
              </div>
              <div className="field">
                <svg className="lead" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="var(--muted)" strokeWidth="1.7"/>
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
                <input className={`inp pass ${errors.loginPass ? 'bad' : ''}`} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => {setPassword(e.target.value); if(errors.loginPass) setErrors({...errors, loginPass: ''});}}/>
                <button className="eyebtn" type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.7a2.6 2.6 0 0 0 3.7 3.6M9.4 5.4A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.6 4.3M6.1 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.5-.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> : <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7"/></svg>}
                </button>
              </div>
              {errors.loginPass && <div className="err">{errors.loginPass}</div>}

              <div className="remember" onClick={() => setState(prev => ({...prev, remember: !prev.remember}))}>
                <div className={`cbox ${state.remember ? 'on' : ''}`}>
                  {state.remember && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m5 12 5 5L20 7" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span>Keep me signed in</span>
              </div>

              {errors.submit && <div className="err">{errors.submit}</div>}

              <button className={`btnPrimary ${state.loading ? 'loading' : ''}`} onClick={handleLogin} disabled={state.loading}>
                {state.loading ? <><span className="spinner"></span>Signing in…</> : 'Sign in'}
              </button>
              <div className="footnote">Don't have an account? <span className="link">Contact your admin</span></div>
            </div>
          )}

          {/* Forgot View */}
          {state.view === 'forgot' && (
            <div className="view" style={{marginTop:'26px'}}>
              <label className="fl">Email address</label>
              <div className="field">
                <svg className="lead" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="var(--muted)" strokeWidth="1.7"/>
                  <path d="m4 7 8 6 8-6" stroke="var(--muted)" strokeWidth="1.7" strokeLinejoin="round"/>
                </svg>
                <input className={`inp email ${errors.forgotEmail ? 'bad' : ''}`} placeholder="you@company.com" value={email} onChange={(e) => {setEmail(e.target.value); if(errors.forgotEmail) setErrors({...errors, forgotEmail: ''});}}/>
              </div>
              {errors.forgotEmail && <div className="err">{errors.forgotEmail}</div>}
              <button className={`btnPrimary ${state.loading ? 'loading' : ''}`} onClick={handleForgot} disabled={state.loading} style={{marginTop:'18px'}}>
                {state.loading ? <><span className="spinner"></span>Sending…</> : 'Send reset link'}
              </button>
              <div className="backRow" onClick={() => handleGo('login')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to login
              </div>
            </div>
          )}

          {/* Sent View */}
          {state.view === 'sent' && (
            <div className="view" style={{marginTop:'26px'}}>
              <div className="infoBox">
                <div className="ic">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7"/>
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="tx">We've emailed a secure reset link to <b style={{wordBreak:'break-all'}}>{email}</b>. It expires in 30 minutes.</div>
              </div>
              <button className="btnPrimary" onClick={() => handleGo('reset')} style={{marginTop:'18px'}}>I've got the link — reset now</button>
              <div className="footnote">Didn't receive it? <span className="link">Resend email</span></div>
              <div className="backRow" onClick={() => handleGo('login')} style={{marginTop:'16px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to login
              </div>
            </div>
          )}

          {/* Reset View */}
          {state.view === 'reset' && (
            <div className="view" style={{marginTop:'26px'}}>
              <label className="fl">New password</label>
              <div className="field">
                <svg className="lead" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="var(--muted)" strokeWidth="1.7"/>
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
                <input className="inp pass" type="password" placeholder="Create a strong password" value={newPass} onChange={(e) => setNewPass(e.target.value)}/>
              </div>

              <label className="fl" style={{marginTop:'16px'}}>Confirm password</label>
              <div className="field">
                <svg className="lead" width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="var(--muted)" strokeWidth="1.7"/>
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round"/>
                </svg>
                <input className="inp pass" type="password" placeholder="Re-enter password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}/>
              </div>
              {errors.reset && <div className="err">{errors.reset}</div>}
              <button className={`btnPrimary ${state.loading ? 'loading' : ''}`} onClick={handleReset} disabled={state.loading} style={{marginTop:'16px'}}>
                {state.loading ? <><span className="spinner"></span>Updating…</> : 'Update password'}
              </button>
              <div className="backRow" onClick={() => handleGo('login')} style={{marginTop:'20px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to login
              </div>
            </div>
          )}

          {/* Done View */}
          {state.view === 'done' && (
            <div className="view" style={{marginTop:'26px',textAlign:'center'}}>
              <button className="btnPrimary" onClick={() => handleGo('login')}>Continue to login</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
