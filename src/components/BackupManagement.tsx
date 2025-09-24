import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Calendar, Mail, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackupConfig {
  id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  include_metadata: boolean;
  email_notifications: string[];
  last_backup_at?: string;
  next_backup_at?: string;
}

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

interface BackupManagementProps {
  onClose: () => void;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({ onClose }) => {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    fetchBackupConfig();
    fetchBackupLogs();
  }, []);

  const fetchBackupConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_configs')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig({
          ...data,
          frequency: data.frequency as 'daily' | 'weekly' | 'monthly'
        });
      } else {
        // Create default config if none exists
        const { data: newConfig, error: insertError } = await supabase
          .from('backup_configs')
          .insert({
            enabled: false,
            frequency: 'weekly',
            include_metadata: true,
            email_notifications: []
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig({
          ...newConfig,
          frequency: newConfig.frequency as 'daily' | 'weekly' | 'monthly'
        });
      }
    } catch (error) {
      console.error('Error fetching backup config:', error);
      toast.error('Failed to load backup configuration');
    }
  };

  const fetchBackupLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs((data || []).map(log => ({
        ...log,
        backup_type: log.backup_type as 'manual' | 'scheduled',
        status: log.status as 'completed' | 'failed' | 'in_progress'
      })));
    } catch (error) {
      console.error('Error fetching backup logs:', error);
      toast.error('Failed to load backup history');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('backup_configs')
        .update({
          enabled: config.enabled,
          frequency: config.frequency,
          include_metadata: config.include_metadata,
          email_notifications: config.email_notifications
        })
        .eq('id', config.id);

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
    if (!emailInput.trim() || !config) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (config.email_notifications.includes(emailInput)) {
      toast.error('Email already added');
      return;
    }

    setConfig({
      ...config,
      email_notifications: [...config.email_notifications, emailInput]
    });
    setEmailInput("");
  };

  const removeEmailNotification = (email: string) => {
    if (!config) return;
    
    setConfig({
      ...config,
      email_notifications: config.email_notifications.filter(e => e !== email)
    });
  };

  const triggerManualBackup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-documents', {
        body: { type: 'manual' }
      });

      if (error) throw error;
      
      toast.success('Manual backup triggered successfully');
      await fetchBackupLogs(); // Refresh logs
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

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Backup Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {config && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable Scheduled Backups</Label>
                  <p className="text-sm text-muted-foreground">Automatically backup documents on schedule</p>
                </div>
                <Switch
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Backup Frequency</Label>
                  <Select 
                    value={config.frequency} 
                    onValueChange={(frequency: 'daily' | 'weekly' | 'monthly') => 
                      setConfig({ ...config, frequency })
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

                <div className="flex items-center space-x-2">
                  <Switch
                    id="metadata"
                    checked={config.include_metadata}
                    onCheckedChange={(include_metadata) => 
                      setConfig({ ...config, include_metadata })
                    }
                  />
                  <Label htmlFor="metadata">Include Metadata</Label>
                </div>
              </div>

              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Email addresses to notify when backups complete
                </p>
                
                <div className="flex gap-2 mb-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmailNotification()}
                  />
                  <Button onClick={addEmailNotification} variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.email_notifications.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button
                        onClick={() => removeEmailNotification(email)}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
                <Button onClick={triggerManualBackup} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Trigger Manual Backup
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
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.backup_type === 'manual' ? 'default' : 'secondary'}>
                      {log.backup_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.document_count}</TableCell>
                  <TableCell>{formatFileSize(log.file_size_bytes)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {log.status === 'failed' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {log.status === 'in_progress' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="capitalize">{log.status}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No backup history available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};