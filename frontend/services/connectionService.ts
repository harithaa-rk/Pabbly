import { api, extractErrorMessage } from '../lib/api';

export interface SmtpConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  passwordMasked: string; // '********'
  senderEmail: string;
  senderName?: string;
  status: 'CONNECTED' | 'FAILED' | 'UNTESTED';
  statusMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmtpFormData {
  id?: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  senderEmail: string;
  senderName?: string;
}

export interface GmailConnection {
  id: string;
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  scopes: string[];
  status: 'CONNECTED' | 'ERROR' | 'EXPIRED';
  statusMessage?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

class ConnectionService {
  async getSmtpConnections(): Promise<SmtpConnection[]> {
    try {
      const response = await api.get('/connections/smtp');
      return response.data?.data?.connections || [];
    } catch {
      // Local fallback for offline/development mode
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('kaira_smtp_connections');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return [];
          }
        }
      }
      return [];
    }
  }

  async saveSmtpConnection(data: SmtpFormData): Promise<{ success: boolean; connection?: SmtpConnection; error?: string }> {
    try {
      const response = await api.post('/connections/smtp', data);
      const connection = response.data?.data?.connection;

      if (typeof window !== 'undefined' && connection) {
        const existing = await this.getSmtpConnections();
        const updated = existing.filter((c) => c.id !== connection.id);
        updated.push(connection);
        localStorage.setItem('kaira_smtp_connections', JSON.stringify(updated));
      }

      return { success: true, connection };
    } catch (err) {
      // Offline fallback
      if (typeof window !== 'undefined') {
        const connection: SmtpConnection = {
          id: data.id || `smtp_${Date.now()}`,
          name: data.name,
          host: data.host,
          port: Number(data.port),
          secure: Boolean(data.secure),
          username: data.username,
          passwordMasked: '********',
          senderEmail: data.senderEmail,
          senderName: data.senderName || 'KAIRA Connect',
          status: 'UNTESTED',
          statusMessage: 'Saved locally in browser storage.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existing = await this.getSmtpConnections();
        const updated = existing.filter((c) => c.id !== connection.id);
        updated.push(connection);
        localStorage.setItem('kaira_smtp_connections', JSON.stringify(updated));

        return { success: true, connection };
      }

      return { success: false, error: extractErrorMessage(err) };
    }
  }

  async testSmtpCredentials(data: SmtpFormData): Promise<TestResult> {
    try {
      const response = await api.post('/connections/smtp/test', data);
      const res = response.data?.data?.result;
      return {
        success: Boolean(res?.success),
        message: res?.message || 'Connection test completed',
        timestamp: res?.timestamp || new Date().toISOString(),
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || extractErrorMessage(err);
      return {
        success: false,
        message: msg || 'SMTP Connection Test Failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteSmtpConnection(id: string): Promise<boolean> {
    try {
      await api.delete(`/connections/smtp/${id}`);
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      const existing = await this.getSmtpConnections();
      const updated = existing.filter((c) => c.id !== id);
      localStorage.setItem('kaira_smtp_connections', JSON.stringify(updated));
    }

    return true;
  }

  // ==========================================
  // Gmail Connection Operations
  // ==========================================
  async getGmailConnections(): Promise<GmailConnection[]> {
    try {
      const response = await api.get('/connections/gmail');
      return response.data?.data?.connections || [];
    } catch {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('kaira_gmail_connections');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return [];
          }
        }
      }
      return [];
    }
  }

  async getGmailAuthUrl(): Promise<string> {
    try {
      const response = await api.get('/connections/gmail/connect?format=json');
      return response.data?.data?.url || '/api/connections/gmail/connect';
    } catch {
      return 'http://localhost:5000/api/connections/gmail/connect';
    }
  }

  async testGmailConnection(connectionId: string): Promise<TestResult> {
    try {
      const response = await api.post(`/connections/gmail/${connectionId}/test`);
      return {
        success: true,
        message: response.data?.message || 'Gmail connection verified successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || extractErrorMessage(err);
      return {
        success: false,
        message: msg || 'Gmail connection check failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteGmailConnection(id: string): Promise<boolean> {
    try {
      await api.delete(`/connections/gmail/${id}`);
    } catch {}

    if (typeof window !== 'undefined') {
      const existing = await this.getGmailConnections();
      const updated = existing.filter((c) => c.id !== id);
      localStorage.setItem('kaira_gmail_connections', JSON.stringify(updated));
    }

    return true;
  }
}

export const connectionService = new ConnectionService();
