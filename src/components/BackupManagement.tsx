import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Clock, Settings, Save, Loader2, Calendar, FileText, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface BackupLog {
  id: string;
  backup_id: string;
  backup_type: 'manual' | 'scheduled';
  document_count: number;
  file_size_bytes?: number;
  status: 'completed' | 'failed' | 'in_progress';
  error_message?: string;
  created_at: string;
}

interface BackupConfig {
  id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  include_metadata: boolean;
  email_notifications: string[];
  last_backup_at?: string;
  next_backup_at?: string;
}

interface BackupManagementProps {
  onClose: () => void;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({ onClose }) => {
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    fetchBackupData();
  }, []);

  const fetchBackupData = async () => {
    try {
      // Fetch backup logs
      const { data: logs, error: logsError } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setBackupLogs((logs || []) as BackupLog[]);

      // Fetch backup configuration
      const { data: config, error: configError } = await supabase
        .from('backup_configs')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (configError) throw configError;
      setBackupConfig(config as BackupConfig);
    } catch (error) {
      console.error('Error fetching backup data:', error);
      toast.error('Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const saveBackupConfig = async () => {
    if (!backupConfig) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('backup_configs')
        .upsert(backupConfig);

      if (error) throw error;

      toast.success('Backup configuration saved successfully');
    } catch (error) {
      console.error('Error saving backup config:', error);
      toast.error('Failed to save backup configuration');
    } finally {
      setSaving(false);
    }
  };

  const addEmailNotification = () => {
    if (!newEmail || !backupConfig) return;
    
    if (!newEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (backupConfig.email_notifications.includes(newEmail)) {
      toast.error('Email already added');
      return;
    }

    setBackupConfig({
      ...backupConfig,
      email_notifications: [...backupConfig.email_notifications, newEmail]
    });
    setNewEmail("");
  };

  const removeEmailNotification = (emailToRemove: string) => {
    if (!backupConfig) return;
    
    setBackupConfig({
      ...backupConfig,
      email_notifications: backupConfig.email_notifications.filter(email => email !== emailToRemove)
    });
  };

  const triggerManualBackup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-documents', {
        body: { trigger_type: 'manual' }
      });

      if (error) throw error;
      
      toast.success('Manual backup triggered successfully');
      fetchBackupData(); // Refresh the logs
    } catch (error) {
      console.error('Error triggering backup:', error);
      toast.error('Failed to trigger backup');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">Backup Management</h2>
      </div>

      {/* Backup Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Backup Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {backupConfig && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="backup-enabled">Enable Scheduled Backups</Label>
                <Switch
                  id="backup-enabled"
                  checked={backupConfig.enabled}
                  onCheckedChange={(enabled) => 
                    setBackupConfig({ ...backupConfig, enabled })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Backup Frequency</Label>
                <Select
                  value={backupConfig.frequency}
                  onValueChange={(frequency: 'daily' | 'weekly' | 'monthly') =>
                    setBackupConfig({ ...backupConfig, frequency })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-metadata">Include Metadata in Backups</Label>
                <Switch
                  id="include-metadata"
                  checked={backupConfig.include_metadata}
                  onCheckedChange={(include_metadata) => 
                    setBackupConfig({ ...backupConfig, include_metadata })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Email Notifications</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="admin@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmailNotification()}
                  />
                  <Button onClick={addEmailNotification} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {backupConfig.email_notifications.map((email) => (
                    <Badge key={email} variant="secondary" className="cursor-pointer" 
                           onClick={() => removeEmailNotification(email)}>
                      {email} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveBackupConfig} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={triggerManualBackup}>
                  <FileText className="h-4 w-4 mr-2" />
                  Test Backup
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Backup History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.backup_type === 'manual' ? 'outline' : 'secondary'}>
                      {log.backup_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.document_count}</TableCell>
                  <TableCell>{formatFileSize(log.file_size_bytes)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin" />}
                      <span className="capitalize">{log.status}</span>
                    </div>
                    {log.error_message && (
                      <div className="text-xs text-destructive mt-1">
                        {log.error_message}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {backupLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No backup history found. Create your first backup to see logs here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};