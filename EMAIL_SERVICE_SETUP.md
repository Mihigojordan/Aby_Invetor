# Email Service Setup Guide

## Quick Integration - SendGrid (Recommended)

### Step 1: Install SendGrid
```bash
cd backend
npm install @sendgrid/mail
```

### Step 2: Add Environment Variable
```bash
# .env
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@abyinventory.com
```

### Step 3: Create Email Service
Create `backend/src/modules/email/email.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendPasswordResetEmail(email: string, token: string, userType: 'admin' | 'employee') {
    const resetLink = `${process.env.FRONTEND_URL}/auth/${userType}/reset?token=${token}`;
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Reset Your ABY Inventory Password',
      html: `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3fabc6, #07202b); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Reset Your Password</h1>
          </div>
          
          <div style="padding: 30px; background: #f5f5f5; border-radius: 0 0 12px 12px;">
            <p style="color: #38435C; margin-top: 0;">Hi ${userType === 'admin' ? 'Admin' : 'Team Member'},</p>
            
            <p style="color: #38435C; line-height: 1.6;">
              We received a request to reset your password for your ABY Inventory account. 
              Click the button below to create a new password. This link expires in 30 minutes.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #3fabc6, #2CB8DE); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 700;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #8A93A6; font-size: 12px; line-height: 1.6;">
              Or copy and paste this link in your browser:<br>
              <code style="background: white; padding: 10px; display: inline-block; margin-top: 10px; border-radius: 4px;">
                ${resetLink}
              </code>
            </p>
            
            <hr style="border: none; border-top: 1px solid #E6E9F0; margin: 30px 0;">
            
            <p style="color: #8A93A6; font-size: 12px; margin-bottom: 0;">
              If you didn't request a password reset, please ignore this email.<br>
              © 2026 ABY Inventory · Umusingi Hardware
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
  }
}
```

### Step 4: Create Email Module
Create `backend/src/modules/email/email.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

### Step 5: Update Admin Service
In `backend/src/modules/admin/admin.service.ts`:

```typescript
import { EmailService } from '../email/email.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtServices: JwtService,
    private readonly activityService: ActivityManagementService,
    private readonly emailService: EmailService,  // Add this
  ) {}

  async forgotPassword(adminEmail: string) {
    try {
      // ... existing validation code ...

      const token = this.jwtServices.sign(
        { adminId: admin.id, type: 'password-reset' },
        { expiresIn: '30m' },
      );

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.prisma.adminPasswordReset.create({
        data: {
          adminId: admin.id,
          token,
          expiresAt,
        },
      });

      // Send email with reset link
      await this.emailService.sendPasswordResetEmail(adminEmail, token, 'admin');

      return {
        message: 'Password reset link sent to your email',
      };
    } catch (error) {
      console.error('error in forgot password:', error);
      throw new Error(error.message || 'Failed to process password reset');
    }
  }
}
```

### Step 6: Update Employee Service
In `backend/src/modules/employee-managment/auth/auth.service.ts`:

```typescript
import { EmailService } from '../../email/email.service';

@Injectable()
export class EmployeeAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtServices: JwtService,
    private readonly activityService: ActivityManagementService,
    private readonly emailService: EmailService,  // Add this
  ) {}

  async forgotPassword(email: string) {
    try {
      // ... existing validation code ...

      const token = this.jwtServices.sign(
        { employeeId: employee.id, type: 'password-reset' },
        { expiresIn: '30m' },
      );

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.prisma.employeePasswordReset.create({
        data: {
          employeeId: employee.id,
          token,
          expiresAt,
        },
      });

      // Send email with reset link
      await this.emailService.sendPasswordResetEmail(email, token, 'employee');

      return {
        message: 'Password reset link sent to your email',
      };
    } catch (error) {
      console.error('error in forgot password:', error);
      throw new Error(error.message || 'Failed to process password reset');
    }
  }
}
```

### Step 7: Update App Module
In `backend/src/app.module.ts`, add EmailModule to imports:

```typescript
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    // ... other modules ...
    EmailModule,
  ],
})
export class AppModule {}
```

### Step 8: Create Reset Link Page
Create `frontend/src/page/auth/admin/ResetPasswordPage.jsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import api from '../../../api/api';
import './Auth.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
    }
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/admin/reset-password', {
        token,
        password: newPassword,
      });

      setIsDone(true);
      setTimeout(() => navigate('/auth/admin/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Brand Panel - same as login */}
      <div className="brand-panel">
        {/* ... brand panel code ... */}
      </div>

      <div className="form-panel">
        <div className="form-inner">
          {isDone ? (
            <div className="view" style={{ textAlign: 'center', marginTop: '26px' }}>
              <div className="badge badge-green" style={{ margin: '0 auto 18px' }}>
                <Check size={24} strokeWidth={2} />
              </div>
              <h1 className="v-title">Password updated 🎉</h1>
              <p className="v-sub">Redirecting to login...</p>
            </div>
          ) : (
            <div className="view">
              <div className="badge">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zM8 9V6a4 4 0 0 1 8 0v3" stroke="#3fabc6" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="v-title">Create new password</h1>
              <p className="v-sub">Choose a strong password you'll remember.</p>

              <form onSubmit={handleReset} style={{ marginTop: '26px' }}>
                <label className="form-label">New password</label>
                <div className="field">
                  <svg className="field-icon" width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="#8A93A6" strokeWidth="1.7" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#8A93A6" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field ${error ? 'input-error' : ''}`}
                    placeholder="Create a strong password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError('');
                    }}
                  />
                  <button
                    type="button"
                    className="eye-button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <label className="form-label" style={{ marginTop: '16px' }}>Confirm password</label>
                <div className="field">
                  <svg className="field-icon" width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="#8A93A6" strokeWidth="1.7" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#8A93A6" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`input-field ${error ? 'input-error' : ''}`}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>

                {error && <div className="error-text">{error}</div>}

                <button
                  type="submit"
                  className={`button-primary ${isLoading ? 'loading' : ''}`}
                  style={{ marginTop: '16px' }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
```

### Step 9: Add Route
In `frontend/src/routes/index.jsx`:

```typescript
{
  path: 'admin/reset',
  element: <ResetPasswordPage />
}
```

### Step 10: Update Environment Variables
```bash
# frontend .env
VITE_API_URL=http://localhost:3000

# backend .env
FRONTEND_URL=http://localhost:5173
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=noreply@abyinventory.com
```

## Testing Email Service

```bash
# Test with curl
curl -X POST http://localhost:3000/admin/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"adminEmail":"admin@example.com"}'
```

## Troubleshooting

### Email not sending?
- Check `SENDGRID_API_KEY` is valid
- Check `SENDGRID_FROM_EMAIL` is verified in SendGrid
- Check email isn't in spam folder
- Check backend logs for errors

### Reset link not working?
- Verify token in database isn't expired
- Check `usedAt` isn't set (means already used)
- Verify `FRONTEND_URL` is correct
- Check token matches in database

### CORS errors?
- Update `api.ts` baseURL to match backend
- Verify CORS is enabled in NestJS main.ts
- Check credentials flag is set

## Done! 🎉

Your password reset system is now fully functional with email support!
