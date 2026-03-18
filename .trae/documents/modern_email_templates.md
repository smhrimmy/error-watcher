# Modern Supabase Email Templates

The previous templates used terms like "protocol", "clearance", "override", "compromised", and "system" which often trigger spam filters or get blocked by default SMTP providers.

These new templates use a clean, modern, minimalist SaaS aesthetic (Shadow UI / Neumorphism inspired) with safe, standard wording.

To use these, go to Supabase Dashboard -> Authentication -> Email Templates.

---

## 1. Confirm Sign Up
*Ask users to confirm their email address after signing up*

**Subject:** `Verify your email for Error Watcher`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 40px 20px; }
    .wrapper { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #6d5dfc, #00cec9); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #1a1a1a; }
    p { font-size: 16px; line-height: 1.5; color: #555555; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: #6d5dfc; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 12px rgba(109, 93, 252, 0.3); transition: transform 0.2s; }
    .footer { margin-top: 40px; font-size: 13px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    </div>
    <h1>Welcome to Error Watcher</h1>
    <p>Hi there,<br><br>Thanks for creating an account. Please click the button below to verify your email address and get started.</p>
    <a href="{{ .ConfirmationURL }}" class="btn">Verify Email Address</a>
    <div class="footer">
      If you didn't create an account with us, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
```

---

## 2. Invite User
*Invite users who don't yet have an account to sign up*

**Subject:** `You've been invited to join Error Watcher`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 40px 20px; }
    .wrapper { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #6d5dfc, #00cec9); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #1a1a1a; }
    p { font-size: 16px; line-height: 1.5; color: #555555; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: #6d5dfc; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 12px rgba(109, 93, 252, 0.3); }
    .footer { margin-top: 40px; font-size: 13px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    </div>
    <h1>Join your team on Error Watcher</h1>
    <p>Hi there,<br><br>You've been invited to join Error Watcher to help monitor and manage infrastructure. Click below to accept your invitation and set up your account.</p>
    <a href="{{ .ConfirmationURL }}" class="btn">Accept Invitation</a>
    <div class="footer">
      If you don't know who invited you, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
```

---

## 3. Magic Link
*Allow users to sign in via a one-time link sent to their email*

**Subject:** `Your magic link for Error Watcher`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 40px 20px; }
    .wrapper { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #6d5dfc, #00cec9); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #1a1a1a; }
    p { font-size: 16px; line-height: 1.5; color: #555555; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: #00cec9; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 206, 201, 0.3); }
    .footer { margin-top: 40px; font-size: 13px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    </div>
    <h1>Sign in to Error Watcher</h1>
    <p>Hi there,<br><br>We received a request to sign in to your account using a magic link. Click the button below to sign in instantly.</p>
    <a href="{{ .ConfirmationURL }}" class="btn">Sign In Now</a>
    <div class="footer">
      This link is only valid for a short time. If you didn't request this link, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
```

---

## 4. Change Email Address
*Ask users to verify their new email address after changing it*

**Subject:** `Verify your new email address`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 40px 20px; }
    .wrapper { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #6d5dfc, #00cec9); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #1a1a1a; }
    p { font-size: 16px; line-height: 1.5; color: #555555; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: #6d5dfc; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 12px rgba(109, 93, 252, 0.3); }
    .footer { margin-top: 40px; font-size: 13px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    </div>
    <h1>Confirm your email update</h1>
    <p>Hi there,<br><br>We received a request to update the email address associated with your Error Watcher account. Please click below to confirm this change.</p>
    <a href="{{ .ConfirmationURL }}" class="btn">Confirm Email Change</a>
    <div class="footer">
      If you didn't request this change, please contact support immediately.
    </div>
  </div>
</body>
</html>
```

---

## 5. Reset Password
*Allow users to reset their password if they forget it*

**Subject:** `Reset your Error Watcher password`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 40px 20px; }
    .wrapper { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #6d5dfc, #00cec9); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #1a1a1a; }
    p { font-size: 16px; line-height: 1.5; color: #555555; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: #ff4d4d; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 77, 77, 0.3); }
    .footer { margin-top: 40px; font-size: 13px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    </div>
    <h1>Password Reset Request</h1>
    <p>Hi there,<br><br>We received a request to reset your password for your Error Watcher account. Click the button below to choose a new password.</p>
    <a href="{{ .ConfirmationURL }}" class="btn">Reset Password</a>
    <div class="footer">
      If you didn't request a password reset, you can safely ignore this email. Your password will not change.
    </div>
  </div>
</body>
</html>
```

---

## 6. Reauthentication
*Ask users to re-authenticate before performing a sensitive action*

**Subject:** `Verify it's you - Error Watcher`

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; color: #333333; margin: 0; padding: 40px 20px; }
    .wrapper { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #f1c40f, #ff9f43); border-radius: 12px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #1a1a1a; }
    p { font-size: 16px; line-height: 1.5; color: #555555; margin: 0 0 32px; }
    .btn { display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 28px; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); }
    .footer { margin-top: 40px; font-size: 13px; color: #999999; border-top: 1px solid #eeeeee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    </div>
    <h1>Security Verification</h1>
    <p>Hi there,<br><br>To protect your account, we need to verify it's you before completing a sensitive action. Please click the button below to confirm your identity.</p>
    <a href="{{ .ConfirmationURL }}" class="btn">Verify Identity</a>
    <div class="footer">
      If you didn't initiate an action requiring verification, please secure your account immediately.
    </div>
  </div>
</body>
</html>
```