import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmployeeAuth from '../../../context/EmployeeAuthContext';
import '../admin/Auth.css';

const EmployeeUnlockScreen = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, unlockEmployee } = useEmployeeAuth();
  const navigate = useNavigate();

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Enter your password');
      return;
    }

    setLoading(true);
    try {
      await unlockEmployee(password);
      navigate('/employee/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.firstname
    ? (user.firstname.charAt(0) + (user?.lastname ? user.lastname.charAt(0) : '')).toUpperCase()
    : 'E';

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
          <div className="view" style={{marginTop:'24px'}}>
            <div className="badge">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M6 11V8a6 6 0 1 1 12 0v3m-9 0h6m-9 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="vTitle">Screen locked</h1>
            <p className="vSub">Your session was locked after a period of inactivity.</p>

            <div className="lockUser">
              <div className="av">{initials}</div>
              <div>
                <div style={{fontSize:'15px',fontWeight:'800',color:'var(--slate)',lineHeight:'1.1'}}>
                  {user ? `${user.firstname} ${user.lastname || ''}` : 'Employee'}
                </div>
                <div style={{fontSize:'12.5px',color:'var(--muted)'}}>
                  {user?.email || 'employee@example.com'}
                </div>
              </div>
              <span className="link" style={{marginLeft:'auto',fontSize:'12px'}}>Switch</span>
            </div>

            <label className="fl" style={{display:'block',marginTop:'18px'}}>Password</label>
            <div className="field">
              <svg className="lead" width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="var(--muted)" strokeWidth="1.7"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
              <input className={`inp pass ${error ? 'bad' : ''}`} type={showPassword ? 'text' : 'password'} placeholder="Enter your password to unlock" value={password} onChange={(e) => {setPassword(e.target.value); if(error) setError('');}}/>
              <button className="eyebtn" type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.7a2.6 2.6 0 0 0 3.7 3.6M9.4 5.4A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.6 4.3M6.1 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.5-.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> : <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7"/></svg>}
              </button>
            </div>
            {error && <div className="err">{error}</div>}

            <button className={`btnPrimary ${loading ? 'loading' : ''}`} onClick={handleUnlock} style={{marginTop:'16px'}} disabled={loading}>
              {loading ? <><span className="spinner"></span>Unlocking…</> : <><svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{marginRight:'2px'}}><rect x="4" y="10" width="16" height="11" rx="2.5" stroke="#fff" strokeWidth="1.9"/><path d="M8 10V7a4 4 0 0 1 8 0" stroke="#fff" strokeWidth="1.9" strokeLinecap="round"/></svg><span>Unlock</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeUnlockScreen;
