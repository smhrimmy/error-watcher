# Monitoring Agent Architecture

## 1. Overview
The Monitoring Agent is a lightweight, secure background service designed to run on customer servers (Linux, Docker, Kubernetes). It collects system metrics, streams logs, and executes authorized maintenance commands.

## 2. Core Components

### 2.1 Communication Layer
- **Protocol**: gRPC or WebSocket over TLS 1.3.
- **Authentication**: 
  - Agent authenticates via `api_key_hash` (initial handshake) and rotates session tokens.
  - Mutual TLS (mTLS) optional for high-security environments.
- **Direction**: Outbound only (Agent -> Platform). No inbound ports required on the customer firewall.

### 2.2 Collector Module
- **Metrics**: Scrapes `/proc` (Linux) or uses `cgroups` (Docker) for:
  - CPU Usage (User/System/Idle)
  - Memory Usage (Used/Free/Buffers/Cached)
  - Disk I/O (Read/Write OPS)
  - Network I/O (RX/TX bytes)
  - Load Average
- **Interval**: Configurable (default 10s).

### 2.3 Executor Module
- **Function**: Executes remote commands triggered by the platform.
- **Security**:
  - **Allowlist**: Only commands explicitly defined in `allowed_commands.yaml` can be executed.
  - **Signature Verification**: Commands must be signed by the platform's private key (Ed25519).
- **Supported Actions**:
  - `restart_service`: `systemctl restart <service>`
  - `docker_restart`: `docker restart <container>`
  - `clean_disk`: `rm -rf /tmp/*` (controlled scope)

### 2.4 Log Streamer
- **Function**: Tails specified log files and pushes them to the platform.
- **Mechanism**: Uses `inotify` to detect file changes and streams new lines.

## 3. Security Architecture

### 3.1 Agent Registration
1. Admin generates an installation command in the Dashboard.
2. Command includes a one-time registration token.
3. Agent starts, sends token to `/api/infrastructure/agents/register`.
4. Platform validates token, assigns a unique `AgentID` and `SecretKey`.
5. Agent stores `SecretKey` securely (e.g., `/etc/monitor-agent/secret` with 600 permissions).

### 3.2 Command Execution Flow
1. User clicks "Restart Nginx" in Dashboard.
2. Platform signs the payload: `Sign(Action="restart_service", Target="nginx", Nonce=123)`.
3. Platform pushes command to Agent via WebSocket.
4. Agent verifies signature using Platform's Public Key.
5. Agent checks `allowed_commands.yaml`.
6. Agent executes command and streams `stdout`/`stderr` back.

## 4. Implementation Plan (Node.js Prototype)

We will build a Node.js prototype of the agent since the current stack is TypeScript-based.

### 4.1 Folder Structure
```
agent/
  ├── src/
  │   ├── collector.ts    # Metrics collection
  │   ├── communicator.ts # WebSocket client
  │   ├── executor.ts     # Command execution
  │   └── main.ts         # Entry point
  ├── config.json
  └── package.json
```

### 4.2 Data Payload Example (Metrics)
```json
{
  "type": "metrics",
  "agent_id": "uuid-123",
  "timestamp": 1678900000,
  "data": {
    "cpu": 45.2,
    "memory": 60.1,
    "disk": 80.5
  }
}
```
