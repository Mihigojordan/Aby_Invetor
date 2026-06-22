import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Shield, Lock, Bell } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import useAdminAuth from '../../context/AdminAuthContext';
import PushNotificationPage from './PushNotificationPage';

const COLORS = {
  bg: '#F3F5F9',
  panel: '#ffffff',
  panel2: '#F5F7FB',
  ink: '#1B2536',
  muted: '#6A788D',
  line: '#E7EBF1',
  primary: '#3FABC6',
  primaryd: '#2B8EA6',
  primarysoft: '#E4F4F8',
  cyan: '#2CB8DE',
  green: '#15A24A',
  red: '#E04848',
  shadow: '0 1px 2px rgba(16,30,54,.04),0 6px 18px rgba(16,30,54,.06)',
};

const AdminProfile = () => {
  const { user } = useAdminAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'notifications') {
      setActiveTab('notifications');
    }
  }, [searchParams]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, minHeight: '100vh', padding: 'clamp(12px, 4vw, 24px)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 800, letterSpacing: '-0.5px', color: COLORS.ink }}>
            Admin Profile
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: COLORS.muted }}>
            Manage your account information and notification preferences
          </p>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            backgroundColor: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: '12px',
            boxShadow: COLORS.shadow,
            overflow: 'hidden',
            marginBottom: 'clamp(20px, 4vw, 32px)',
          }}
        >
          <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.line}` }}>
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(4px, 2vw, 8px)',
                padding: 'clamp(12px, 3vw, 16px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                fontWeight: 700,
                color: activeTab === 'profile' ? COLORS.primary : COLORS.muted,
                borderBottom: activeTab === 'profile' ? `2.5px solid ${COLORS.primary}` : 'transparent',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'profile') {
                  e.target.style.color = COLORS.ink;
                  e.target.style.backgroundColor = COLORS.panel2;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'profile') {
                  e.target.style.color = COLORS.muted;
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <User size={20} />
              <span>Profile Details</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(4px, 2vw, 8px)',
                padding: 'clamp(12px, 3vw, 16px)',
                fontSize: 'clamp(12px, 2vw, 14px)',
                fontWeight: 700,
                color: activeTab === 'notifications' ? COLORS.primary : COLORS.muted,
                borderBottom: activeTab === 'notifications' ? `2.5px solid ${COLORS.primary}` : 'transparent',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'notifications') {
                  e.target.style.color = COLORS.ink;
                  e.target.style.backgroundColor = COLORS.panel2;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'notifications') {
                  e.target.style.color = COLORS.muted;
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Bell size={20} />
              <span>Notifications</span>
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '18px 24px' }}>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 4vw, 32px)' }}>
                {/* Hero Section */}
                <div
                  style={{
                    borderRadius: '14px',
                    padding: 'clamp(18px, 5vw, 28px) clamp(20px, 5vw, 30px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(14px, 4vw, 22px)',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(120deg, ${COLORS.primaryd}, ${COLORS.primary} 70%, ${COLORS.cyan})`,
                    boxShadow: COLORS.shadow,
                    flexDirection: 'row',
                    '@media (max-width: 640px)': {
                      flexDirection: 'column',
                      textAlign: 'center',
                    },
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      width: '260px',
                      height: '260px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(255,255,255,.18), transparent 70%)',
                      top: '-120px',
                      right: '40px',
                    }}
                  ></div>

                  <div
                    style={{
                      width: 'clamp(72px, 12vw, 92px)',
                      height: 'clamp(72px, 12vw, 92px)',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,.18)',
                      border: '1px solid rgba(255,255,255,.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      fontSize: 'clamp(22px, 5vw, 30px)',
                      fontWeight: 800,
                      zIndex: 10,
                    }}
                  >
                    {user?.adminName?.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 26px)', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 'clamp(4px, 2vw, 8px)' }}>
                      {user?.adminName || 'Admin User'}
                    </div>
                    <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', opacity: 0.9, marginBottom: 'clamp(6px, 2vw, 10px)' }}>
                      {user?.adminEmail || 'admin@example.com'}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        background: 'rgba(255,255,255,.16)',
                        border: '1px solid rgba(255,255,255,.28)',
                        padding: '6px 13px',
                        borderRadius: '30px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        marginTop: '10px',
                      }}
                    >
                      <Shield size={14} />
                      {user?.isLocked ? 'Account Locked' : 'Account Active'}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'clamp(12px, 3vw, 18px)',
                  }}
                >
                  {/* Personal Information */}
                  <div
                    style={{
                      backgroundColor: COLORS.panel,
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: '12px',
                      boxShadow: COLORS.shadow,
                      padding: 'clamp(14px, 3vw, 22px) clamp(16px, 4vw, 24px)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'clamp(13px, 2vw, 15px)',
                        fontWeight: 800,
                        letterSpacing: '-0.2px',
                        marginBottom: 'clamp(10px, 2vw, 14px)',
                        paddingBottom: '4px',
                        borderBottom: `1px solid ${COLORS.line}`,
                      }}
                    >
                      Personal Information
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(10px, 2vw, 14px)',
                        padding: 'clamp(10px, 2vw, 14px) 0',
                      }}
                    >
                      <div
                        style={{
                          width: 'clamp(36px, 8vw, 42px)',
                          height: 'clamp(36px, 8vw, 42px)',
                          borderRadius: '10px',
                          backgroundColor: COLORS.primarysoft,
                          color: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: COLORS.muted, fontWeight: 600, letterSpacing: '0.2px' }}>
                          FULL NAME
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 700, marginTop: '2px', color: COLORS.ink }}>
                          {user?.adminName || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: COLORS.line, margin: 'clamp(10px, 2vw, 14px) 0' }}></div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(10px, 2vw, 14px)',
                        padding: 'clamp(10px, 2vw, 14px) 0',
                      }}
                    >
                      <div
                        style={{
                          width: 'clamp(36px, 8vw, 42px)',
                          height: 'clamp(36px, 8vw, 42px)',
                          borderRadius: '10px',
                          backgroundColor: COLORS.primarysoft,
                          color: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Mail size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: COLORS.muted, fontWeight: 600, letterSpacing: '0.2px' }}>
                          EMAIL ADDRESS
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 700, marginTop: '2px', color: COLORS.ink, wordBreak: 'break-word' }}>
                          {user?.adminEmail || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div
                    style={{
                      backgroundColor: COLORS.panel,
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: '12px',
                      boxShadow: COLORS.shadow,
                      padding: 'clamp(14px, 3vw, 22px) clamp(16px, 4vw, 24px)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'clamp(13px, 2vw, 15px)',
                        fontWeight: 800,
                        letterSpacing: '-0.2px',
                        marginBottom: 'clamp(10px, 2vw, 14px)',
                        paddingBottom: '4px',
                        borderBottom: `1px solid ${COLORS.line}`,
                      }}
                    >
                      Account Details
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(10px, 2vw, 14px)',
                        padding: 'clamp(10px, 2vw, 14px) 0',
                      }}
                    >
                      <div
                        style={{
                          width: 'clamp(36px, 8vw, 42px)',
                          height: 'clamp(36px, 8vw, 42px)',
                          borderRadius: '10px',
                          backgroundColor: COLORS.primarysoft,
                          color: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Shield size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: COLORS.muted, fontWeight: 600, letterSpacing: '0.2px' }}>
                          ACCOUNT STATUS
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 700, marginTop: '2px', color: COLORS.ink, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: user?.isLocked ? COLORS.red : COLORS.green,
                            }}
                          />
                          {user?.isLocked ? 'Locked' : 'Active'}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', backgroundColor: COLORS.line, margin: 'clamp(10px, 2vw, 14px) 0' }}></div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(10px, 2vw, 14px)',
                        padding: 'clamp(10px, 2vw, 14px) 0',
                      }}
                    >
                      <div
                        style={{
                          width: 'clamp(36px, 8vw, 42px)',
                          height: 'clamp(36px, 8vw, 42px)',
                          borderRadius: '10px',
                          backgroundColor: COLORS.primarysoft,
                          color: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: COLORS.muted, fontWeight: 600, letterSpacing: '0.2px' }}>
                          CREATED AT
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 2vw, 15px)', fontWeight: 700, marginTop: '2px', color: COLORS.ink }}>
                          {formatDate(user?.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Read-only Footer */}
                <div
                  style={{
                    backgroundColor: COLORS.primarysoft,
                    border: `1px solid color-mix(in srgb, ${COLORS.primary} 22%, transparent)`,
                    borderRadius: '12px',
                    padding: 'clamp(12px, 2vw, 15px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(6px, 2vw, 9px)',
                    fontSize: 'clamp(11px, 2vw, 13.5px)',
                    color: COLORS.primaryd,
                    fontWeight: 600,
                    flexWrap: 'wrap',
                  }}
                >
                  <Shield size={18} />
                  <p style={{ margin: 0 }}>
                    This is a read-only view. Contact the system administrator for any changes.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Tab - Shows drawer backdrop */}
            {activeTab === 'notifications' && (
              <>
                {/* Backdrop */}
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(12, 20, 33, 0.45)',
                    zIndex: 60,
                    animation: 'fadein 0.25s ease-in-out',
                  }}
                  onClick={() => setActiveTab('profile')}
                />

                {/* Drawer */}
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    height: '100vh',
                    width: 'clamp(280px, 30vw, 400px)',
                    backgroundColor: COLORS.bg,
                    zIndex: 61,
                    boxShadow: '-10px 0 40px rgba(16, 30, 54, 0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideinright 0.26s cubic-bezier(.32,.72,.3,1)',
                  }}
                >
                  {/* Drawer Header */}
                  <div
                    style={{
                      padding: 'clamp(12px, 3vw, 20px) clamp(14px, 4vw, 22px)',
                      borderBottom: `1px solid ${COLORS.line}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'clamp(10px, 3vw, 14px)',
                      backgroundColor: COLORS.panel,
                    }}
                  >
                    <div
                      style={{
                        width: 'clamp(36px, 8vw, 42px)',
                        height: 'clamp(36px, 8vw, 42px)',
                        borderRadius: '11px',
                        backgroundColor: COLORS.primarysoft,
                        color: COLORS.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Bell size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 800, color: COLORS.ink }}>
                        Notification Settings
                      </div>
                      <div style={{ fontSize: 'clamp(11px, 2vw, 12.5px)', color: COLORS.muted }}>
                        Manage how you receive updates
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('profile')}
                      style={{
                        width: 'clamp(30px, 6vw, 34px)',
                        height: 'clamp(30px, 6vw, 34px)',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: COLORS.muted,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = COLORS.panel2;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                      title="Close"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="m6 6 12 12M18 6 6 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Drawer Body */}
                  <div
                    style={{
                      padding: 'clamp(12px, 3vw, 20px)',
                      overflowY: 'auto',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'clamp(12px, 2vw, 16px)',
                    }}
                  >
                    {/* Push Notifications Card */}
                    <div
                      style={{
                        backgroundColor: COLORS.panel,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: '11px',
                        padding: 'clamp(12px, 2vw, 18px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'clamp(10px, 2vw, 14px)',
                      }}
                    >
                      <div
                        style={{
                          width: 'clamp(36px, 8vw, 46px)',
                          height: 'clamp(36px, 8vw, 46px)',
                          borderRadius: '50%',
                          backgroundColor: COLORS.primarysoft,
                          color: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Bell size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 800, color: COLORS.ink }}>
                          Push Notifications
                        </div>
                        <div style={{ fontSize: 'clamp(11px, 2vw, 12.5px)', color: COLORS.muted, marginTop: '2px' }}>
                          Manage settings for <strong>{user?.adminName || 'admin'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* This Device Card */}
                    <div
                      style={{
                        backgroundColor: COLORS.panel,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: '11px',
                        padding: 'clamp(12px, 2vw, 18px)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'clamp(8px, 2vw, 10px)',
                          marginBottom: 'clamp(6px, 1vw, 8px)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: 800, color: COLORS.ink }}>
                          This Device
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: 'clamp(4px, 1vw, 5px) clamp(8px, 2vw, 12px)',
                            borderRadius: '30px',
                            fontSize: 'clamp(10px, 2vw, 12px)',
                            fontWeight: 700,
                            backgroundColor: '#E6F6EC',
                            color: COLORS.green,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                            <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                          </svg>
                          Active
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 'clamp(11px, 2vw, 13px)',
                          color: COLORS.muted,
                          marginBottom: 'clamp(10px, 2vw, 16px)',
                        }}
                      >
                        This device is receiving important updates and alerts.
                      </div>
                      <button
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: 'clamp(36px, 8vw, 42px)',
                          padding: '0 clamp(12px, 3vw, 18px)',
                          border: 'none',
                          borderRadius: '10px',
                          backgroundColor: COLORS.red,
                          color: '#fff',
                          fontSize: 'clamp(11px, 2vw, 13.5px)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
                        onMouseLeave={(e) => (e.target.style.opacity = '1')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M6 9a6 6 0 0 1 9-5M18 9c0 6 2 7 2 7H8M4 4l16 16"
                            stroke="#fff"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Disable on This Device
                      </button>
                    </div>

                    {/* All Subscribed Devices Card */}
                    <div
                      style={{
                        backgroundColor: COLORS.panel,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: '11px',
                        padding: 'clamp(12px, 2vw, 18px)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'clamp(8px, 2vw, 10px)',
                          flexWrap: 'wrap',
                          marginBottom: 'clamp(10px, 2vw, 14px)',
                        }}
                      >
                        <div style={{ fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: 800, color: COLORS.ink }}>
                          All Subscribed Devices (1)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1vw, 8px)', flexWrap: 'wrap' }}>
                          <button
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: 'clamp(30px, 6vw, 34px)',
                              padding: '0 clamp(8px, 2vw, 12px)',
                              border: `1px solid ${COLORS.line}`,
                              backgroundColor: COLORS.panel,
                              borderRadius: '8px',
                              fontSize: 'clamp(10px, 2vw, 12.5px)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              color: COLORS.muted,
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = COLORS.panel2)}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.panel)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span style={{ display: 'inline-block' }}>Refresh</span>
                          </button>
                          <button
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: 'clamp(30px, 6vw, 34px)',
                              padding: '0 clamp(8px, 2vw, 12px)',
                              border: `1px solid #FDECEC`,
                              backgroundColor: COLORS.panel,
                              borderRadius: '8px',
                              fontSize: 'clamp(10px, 2vw, 12.5px)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              color: COLORS.red,
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => (e.target.style.backgroundColor = '#FDECEC')}
                            onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.panel)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Unsubscribe All
                          </button>
                        </div>
                      </div>

                      {/* Device Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'clamp(8px, 2vw, 13px)',
                          padding: 'clamp(10px, 2vw, 13px)',
                          border: `1px solid ${COLORS.line}`,
                          borderRadius: '11px',
                          backgroundColor: COLORS.panel,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div
                          style={{
                            width: 'clamp(32px, 6vw, 40px)',
                            height: 'clamp(32px, 6vw, 40px)',
                            borderRadius: '10px',
                            backgroundColor: COLORS.panel2,
                            color: COLORS.muted,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
                            <path d="M11 18h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 'clamp(12px, 2vw, 13.5px)',
                              fontWeight: 700,
                              color: COLORS.ink,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            Chrome on Windows Desktop
                          </div>
                          <div style={{ fontSize: 'clamp(10px, 2vw, 11.5px)', color: COLORS.muted, marginTop: '2px' }}>
                            Added: Jun 22, 2026, 04:23 PM
                          </div>
                        </div>
                        <button
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            height: 'clamp(30px, 6vw, 34px)',
                            padding: '0 clamp(8px, 2vw, 12px)',
                            border: `1px solid #FDECEC`,
                            backgroundColor: COLORS.panel,
                            borderRadius: '8px',
                            fontSize: 'clamp(10px, 2vw, 12.5px)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: COLORS.red,
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => (e.target.style.backgroundColor = '#FDECEC')}
                          onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.panel)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animations */}
                <style>{`
                  @keyframes slideinright {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                  }
                  @keyframes fadein {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                `}</style>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;