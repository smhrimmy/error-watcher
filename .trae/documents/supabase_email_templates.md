# Custom Supabase Email Templates

To configure these custom email templates, go to your Supabase Dashboard -> Authentication -> Email Templates.

## 1. Confirm Signup

**Subject:** `Verify your Command Center access`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; background-color: #292d32; color: #00cec9; padding: 40px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #00cec9; padding: 30px; background-color: rgba(0,0,0,0.5); }
    .header { font-size: 24px; font-weight: bold; border-bottom: 1px dashed #00cec9; padding-bottom: 10px; margin-bottom: 20px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #00cec9; color: #292d32; text-decoration: none; font-weight: bold; margin-top: 20px; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #8b9bb4; border-top: 1px dashed #00cec9; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      [ SYSTEM: AUTHENTICATION PROTOCOL ]
    </div>
    <p>> INITIATING NEW USER PROTOCOL...</p>
    <p>> TARGET EMAIL: {{ .Email }}</p>
    <p>> ACTION REQUIRED: Verify clearance level.</p>
    
    <a href="{{ .ConfirmationURL }}" class="btn">GRANT ACCESS</a>
    
    <div class="footer">
      This is an automated system message from the Error Watcher Neural Network.<br/>
      If you did not initiate this request, safely ignore this transmission.
    </div>
  </div>
</body>
</html>
```

## 2. Magic Link

**Subject:** `Secure Access Link - Command Center`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; background-color: #292d32; color: #00cec9; padding: 40px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #00cec9; padding: 30px; background-color: rgba(0,0,0,0.5); }
    .header { font-size: 24px; font-weight: bold; border-bottom: 1px dashed #00cec9; padding-bottom: 10px; margin-bottom: 20px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #00cec9; color: #292d32; text-decoration: none; font-weight: bold; margin-top: 20px; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #8b9bb4; border-top: 1px dashed #00cec9; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      [ SYSTEM: SECURE ENTRY ]
    </div>
    <p>> MAGIC LINK REQUEST DETECTED...</p>
    <p>> DESTINATION: {{ .Email }}</p>
    <p>> STATUS: Ready for authentication.</p>
    
    <a href="{{ .ConfirmationURL }}" class="btn">INITIALIZE CONNECTION</a>
    
    <div class="footer">
      This link will expire shortly. Do not share this transmission.
    </div>
  </div>
</body>
</html>
```

## 3. Reset Password

**Subject:** `Reset Credentials - Command Center`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; background-color: #292d32; color: #ff4d4d; padding: 40px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #ff4d4d; padding: 30px; background-color: rgba(0,0,0,0.5); }
    .header { font-size: 24px; font-weight: bold; border-bottom: 1px dashed #ff4d4d; padding-bottom: 10px; margin-bottom: 20px; color: #ff4d4d; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #ff4d4d; color: #292d32; text-decoration: none; font-weight: bold; margin-top: 20px; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #8b9bb4; border-top: 1px dashed #ff4d4d; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      [ ALERT: CREDENTIAL OVERRIDE ]
    </div>
    <p>> SECURITY CLEARANCE RESET INITIATED...</p>
    <p>> ACCOUNT: {{ .Email }}</p>
    <p>> WARNING: Proceed with caution. New credentials required.</p>
    
    <a href="{{ .ConfirmationURL }}" class="btn">OVERRIDE CREDENTIALS</a>
    
    <div class="footer">
      If you did not request a credential override, your account may be compromised. Please review system logs immediately.
    </div>
  </div>
</body>
</html>
```