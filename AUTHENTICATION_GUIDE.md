# Thirora - Authentication & Account Security Guide

## 1. Overview & Architecture

Thirora provides a comprehensive, multi-device authentication and account management system designed with **zero plain-text password storage** and **dual-mode synchronization**.

---

## 2. Cryptographic Security Model

* **Client-Side Cryptography**: Passwords are never stored or logged in plain text.
* **Algorithm**: Web Crypto API (`window.crypto.subtle.digest('SHA-256')`) with a unique 16-byte random salt generated for each user.
* **Storage Schema**:
  ```json
  {
    "id": "usr_demo_student_01",
    "email": "demo@thirora.app",
    "passwordHash": "a1b2c3d4e5f6...",
    "salt": "demo_salt_7f8a9b2c...",
    "name": "Alex Morgan"
  }
  ```

---

## 3. Multi-Device Tracking & Security Notifications

### Device Fingerprinting
Every client generates a persistent unique Device Identifier combined with:
- **Operating System** (Windows, macOS, iOS, Android, Linux)
- **Browser** (Chrome, Safari, Firefox, Edge, Opera)
- **Device Category** (Desktop, Mobile, Tablet)

### New Device Detection & High-Priority Alerts
When an account signs in from a previously unseen device signature:
1. A new device record is registered in `user_devices`.
2. A high-priority **Security Notification** is immediately dispatched to the Notifications Center:
   > *"⚠️ New Device Login Detected: Chrome on Windows (Desktop). If this was not you, review your active sessions in Settings immediately."*

### Remote Session Invalidation
From **Settings -> Active Devices & Sessions**, you can click **"Log Out From All Other Devices"** to immediately revoke all other active sessions while preserving your current browser session.

---

## 4. Dual-Mode Cross-Device Strategy: `localStorage` vs. Supabase

> ### ⚠️ Fundamental Browser Limitation
> `localStorage` is isolated strictly to a single browser on a single physical machine. It **cannot** communicate across physical devices over the internet on its own.

To solve this honestly and completely, Thirora offers two modes:

### Mode A: Local Cryptographic Simulation (Default / Offline / Demo)
* Works immediately out-of-the-box with zero configuration.
* Fully simulates multi-device sessions, new device detection, password hashing, and active session revocation.

### Mode B: Turnkey Supabase Cloud Backend (Real Cross-Device Sync)
* Connect a free [Supabase](https://supabase.com) project to enable real cross-device login, realtime alerts, and cloud PostgreSQL database sync across all your phones and computers.

### How to Connect Supabase:
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run [`supabase-schema.sql`](./supabase-schema.sql).
3. In Thirora, navigate to **Settings -> Cloud Sync (Supabase)**.
4. Enter your **Project URL** and **Anon API Key** (found under *Project Settings -> API*).
5. Click **Test Connection** &rarr; **Save Cloud Settings** &rarr; **Sync Local Data to Cloud**.

---

## 5. Quick Test Credentials

* **Email**: `demo@thirora.app`
* **Password**: `Demo@12345`
* Or click the **⚡ Quick Demo Account &rarr; Auto-Fill Demo** button on the Login page.
